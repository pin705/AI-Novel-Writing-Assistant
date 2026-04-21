import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, type QueryClient } from "@tanstack/react-query";
import type { StorylineDiff, StorylineVersion } from "@ai-novel/shared/types/novel";
import {
  activateStorylineVersion,
  analyzeStorylineImpact,
  createStorylineDraft,
  freezeStorylineVersion,
  getStorylineDiff,
  listStorylineVersions,
} from "@/api/novel";
import { queryKeys } from "@/api/queryKeys";

interface StorylineImpactResult {
  novelId: string;
  sourceVersion: number | null;
  affectedCharacters: number;
  affectedChapters: number;
  changedLines: number;
  requiresOutlineRebuild: boolean;
  recommendations: {
    shouldSyncOutline: boolean;
    shouldRecheckCharacters: boolean;
    suggestedStrategy: "rebuild_outline" | "incremental_sync";
  };
}

interface UseStorylineVersionControlArgs {
  novelId: string;
  draftText: string;
  setDraftText: (value: string) => void;
  queryClient: QueryClient;
  invalidateNovelDetail: () => Promise<void>;
}

export function useStorylineVersionControl({
  novelId,
  draftText,
  setDraftText,
  queryClient,
  invalidateNovelDetail,
}: UseStorylineVersionControlArgs) {
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [storylineMessage, setStorylineMessage] = useState("");
  const [diffResult, setDiffResult] = useState<StorylineDiff | null>(null);
  const [impactResult, setImpactResult] = useState<StorylineImpactResult | null>(null);

  const storylineVersionsQuery = useQuery({
    queryKey: queryKeys.novels.storylineVersions(novelId),
    queryFn: () => listStorylineVersions(novelId),
    enabled: Boolean(novelId),
  });

  const storylineVersions = storylineVersionsQuery.data?.data ?? [];
  const selectedVersion = useMemo(
    () => storylineVersions.find((item) => item.id === selectedVersionId),
    [selectedVersionId, storylineVersions],
  );

  useEffect(() => {
    if (!selectedVersionId && storylineVersions.length > 0) {
      setSelectedVersionId(storylineVersions[0].id);
    }
  }, [selectedVersionId, storylineVersions]);

  const invalidateVersionList = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.novels.storylineVersions(novelId) });
  };

  const createDraftVersionMutation = useMutation({
    mutationFn: () => createStorylineDraft(novelId, {
      content: draftText,
      baseVersion: selectedVersion?.version,
    }),
    onSuccess: async (response) => {
      const nextVersionId = response.data?.id;
      if (nextVersionId) {
        setSelectedVersionId(nextVersionId);
      }
      setStorylineMessage(response.message ?? "Đã tạo phiên bản bản nháp tuyến chính.");
      await invalidateVersionList();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Tạo phiên bản bản nháp tuyến chính thất bại.";
      setStorylineMessage(message);
    },
  });

  const activateVersionMutation = useMutation({
    mutationFn: () => {
      if (!selectedVersionId) {
        throw new Error("Hãy chọn một phiên bản tuyến chính trước.");
      }
      return activateStorylineVersion(novelId, selectedVersionId);
    },
    onSuccess: async (response) => {
      setStorylineMessage(response.message ?? "Đã đặt làm tuyến chính đang dùng.");
      await invalidateVersionList();
      await invalidateNovelDetail();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Đặt phiên bản đang dùng thất bại.";
      setStorylineMessage(message);
    },
  });

  const freezeVersionMutation = useMutation({
    mutationFn: () => {
      if (!selectedVersionId) {
        throw new Error("Hãy chọn một phiên bản tuyến chính trước.");
      }
      return freezeStorylineVersion(novelId, selectedVersionId);
    },
    onSuccess: async (response) => {
      setStorylineMessage(response.message ?? "Phiên bản tuyến chính đã được khóa.");
      await invalidateVersionList();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Khóa phiên bản tuyến chính thất bại.";
      setStorylineMessage(message);
    },
  });

  const diffMutation = useMutation({
    mutationFn: () => {
      if (!selectedVersionId) {
        throw new Error("Hãy chọn một phiên bản tuyến chính trước.");
      }
      return getStorylineDiff(novelId, selectedVersionId);
    },
    onSuccess: (response) => {
      setDiffResult(response.data ?? null);
      setStorylineMessage(response.message ?? "Đã cập nhật phần khác biệt của phiên bản tuyến chính.");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Tải phần khác biệt của phiên bản thất bại.";
      setStorylineMessage(message);
    },
  });

  const analyzeDraftImpactMutation = useMutation({
    mutationFn: () => analyzeStorylineImpact(novelId, { content: draftText }),
    onSuccess: (response) => {
      setImpactResult(response.data ?? null);
      setStorylineMessage(response.message ?? "Đã phân tích ảnh hưởng của bản nháp.");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Phân tích ảnh hưởng bản nháp thất bại.";
      setStorylineMessage(message);
    },
  });

  const analyzeVersionImpactMutation = useMutation({
    mutationFn: () => {
      if (!selectedVersionId) {
        throw new Error("Hãy chọn một phiên bản tuyến chính trước.");
      }
      return analyzeStorylineImpact(novelId, { versionId: selectedVersionId });
    },
    onSuccess: (response) => {
      setImpactResult(response.data ?? null);
      setStorylineMessage(response.message ?? "Đã phân tích ảnh hưởng của phiên bản.");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Phân tích ảnh hưởng phiên bản thất bại.";
      setStorylineMessage(message);
    },
  });

  const loadSelectedVersionToDraft = () => {
    if (!selectedVersion) {
      return;
    }
    setDraftText(selectedVersion.content);
    setStorylineMessage(`Đã nạp V${selectedVersion.version} vào bản nháp hiện tại.`);
  };

  return {
    storylineMessage,
    storylineVersions,
    selectedVersionId,
    setSelectedVersionId,
    selectedVersion,
    diffResult,
    impactResult,
    isLoadingVersions: storylineVersionsQuery.isLoading,
    createDraftVersionMutation,
    activateVersionMutation,
    freezeVersionMutation,
    diffMutation,
    analyzeDraftImpactMutation,
    analyzeVersionImpactMutation,
    loadSelectedVersionToDraft,
  };
}
