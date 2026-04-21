import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, type QueryClient } from "@tanstack/react-query";
import type {
  VolumeBeatSheet,
  VolumeCritiqueReport,
  VolumeImpactResult,
  VolumePlan,
  VolumePlanDocument,
  VolumePlanDiff,
  VolumePlanVersion,
  VolumeRebalanceDecision,
  VolumeStrategyPlan,
} from "@ai-novel/shared/types/novel";
import {
  activateVolumeVersion,
  analyzeVolumeImpact,
  createVolumeDraft,
  freezeVolumeVersion,
  getVolumeDiff,
  listVolumeVersions,
} from "@/api/novel";
import { queryKeys } from "@/api/queryKeys";

interface UseVolumeVersionControlArgs {
  novelId: string;
  draftDocument: VolumePlanDocument;
  setDraftVolumes: (value: VolumePlan[]) => void;
  setStrategyPlan: (value: VolumeStrategyPlan | null) => void;
  setCritiqueReport: (value: VolumeCritiqueReport | null) => void;
  setBeatSheets: (value: VolumeBeatSheet[]) => void;
  setRebalanceDecisions: (value: VolumeRebalanceDecision[]) => void;
  queryClient: QueryClient;
  invalidateNovelDetail: () => Promise<void>;
}

export function useVolumeVersionControl({
  novelId,
  draftDocument,
  setDraftVolumes,
  setStrategyPlan,
  setCritiqueReport,
  setBeatSheets,
  setRebalanceDecisions,
  queryClient,
  invalidateNovelDetail,
}: UseVolumeVersionControlArgs) {
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [message, setMessage] = useState("");
  const [diffResult, setDiffResult] = useState<VolumePlanDiff | null>(null);
  const [impactResult, setImpactResult] = useState<VolumeImpactResult | null>(null);

  const volumeVersionsQuery = useQuery({
    queryKey: queryKeys.novels.volumeVersions(novelId),
    queryFn: () => listVolumeVersions(novelId),
    enabled: Boolean(novelId),
  });

  const versions = volumeVersionsQuery.data?.data ?? [];
  const selectedVersion = useMemo(
    () => versions.find((item) => item.id === selectedVersionId),
    [selectedVersionId, versions],
  );

  useEffect(() => {
    if (!selectedVersionId && versions.length > 0) {
      setSelectedVersionId(versions[0].id);
    }
  }, [selectedVersionId, versions]);

  const invalidateVersionList = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.novels.volumeVersions(novelId) });
  };

  const createDraftVersionMutation = useMutation({
    mutationFn: () => createVolumeDraft(novelId, {
      ...draftDocument,
      baseVersion: selectedVersion?.version,
    }),
    onSuccess: async (response) => {
      const nextVersionId = response.data?.id;
      if (nextVersionId) {
        setSelectedVersionId(nextVersionId);
      }
      setMessage(response.message ?? "Đã tạo phiên bản bản nháp cấp tập.");
      await invalidateVersionList();
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "Tạo phiên bản bản nháp cấp tập thất bại.");
    },
  });

  const activateVersionMutation = useMutation({
    mutationFn: () => {
      if (!selectedVersionId) {
        throw new Error("Hãy chọn một phiên bản cấp tập trước.");
      }
      return activateVolumeVersion(novelId, selectedVersionId);
    },
    onSuccess: async (response) => {
      setMessage(response.message ?? "Đã đặt làm phiên bản cấp tập đang dùng.");
      await invalidateVersionList();
      await invalidateNovelDetail();
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "Đặt phiên bản đang dùng thất bại.");
    },
  });

  const freezeVersionMutation = useMutation({
    mutationFn: () => {
      if (!selectedVersionId) {
        throw new Error("Hãy chọn một phiên bản cấp tập trước.");
      }
      return freezeVolumeVersion(novelId, selectedVersionId);
    },
    onSuccess: async (response) => {
      setMessage(response.message ?? "Phiên bản cấp tập đã được khóa.");
      await invalidateVersionList();
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "Khóa phiên bản cấp tập thất bại.");
    },
  });

  const diffMutation = useMutation({
    mutationFn: () => {
      if (!selectedVersionId) {
        throw new Error("Hãy chọn một phiên bản cấp tập trước.");
      }
      return getVolumeDiff(novelId, selectedVersionId);
    },
    onSuccess: (response) => {
      setDiffResult(response.data ?? null);
      setMessage(response.message ?? "Đã cập nhật phần khác biệt của phiên bản cấp tập.");
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "Tải phần khác biệt của phiên bản cấp tập thất bại.");
    },
  });

  const analyzeDraftImpactMutation = useMutation({
    mutationFn: () => analyzeVolumeImpact(novelId, { volumes: draftDocument.volumes }),
    onSuccess: (response) => {
      setImpactResult(response.data ?? null);
      setMessage(response.message ?? "Đã phân tích ảnh hưởng của bản nháp cấp tập.");
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "Phân tích ảnh hưởng bản nháp cấp tập thất bại.");
    },
  });

  const analyzeVersionImpactMutation = useMutation({
    mutationFn: () => {
      if (!selectedVersionId) {
        throw new Error("Hãy chọn một phiên bản cấp tập trước.");
      }
      return analyzeVolumeImpact(novelId, { versionId: selectedVersionId });
    },
    onSuccess: (response) => {
      setImpactResult(response.data ?? null);
      setMessage(response.message ?? "Đã phân tích ảnh hưởng của phiên bản cấp tập.");
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "Phân tích ảnh hưởng phiên bản cấp tập thất bại.");
    },
  });

  const loadSelectedVersionToDraft = () => {
    if (!selectedVersion) {
      return;
    }
    try {
      const parsed = JSON.parse(selectedVersion.contentJson) as Partial<VolumePlanDocument>;
      setDraftVolumes(parsed.volumes ?? []);
      setStrategyPlan(parsed.strategyPlan ?? null);
      setCritiqueReport(parsed.critiqueReport ?? null);
      setBeatSheets(parsed.beatSheets ?? []);
      setRebalanceDecisions(parsed.rebalanceDecisions ?? []);
      setMessage(`Đã nạp V${selectedVersion.version} vào bản nháp cấp tập hiện tại.`);
    } catch {
      setMessage("Đọc nội dung phiên bản cấp tập thất bại.");
    }
  };

  return {
    volumeMessage: message,
    volumeVersions: versions,
    selectedVersionId,
    setSelectedVersionId,
    selectedVersion: selectedVersion as VolumePlanVersion | undefined,
    diffResult,
    impactResult,
    isLoadingVersions: volumeVersionsQuery.isLoading,
    createDraftVersionMutation,
    activateVersionMutation,
    freezeVersionMutation,
    diffMutation,
    analyzeDraftImpactMutation,
    analyzeVersionImpactMutation,
    loadSelectedVersionToDraft,
  };
}
