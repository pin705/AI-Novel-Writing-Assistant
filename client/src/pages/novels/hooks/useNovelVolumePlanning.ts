import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import { buildVolumeCountGuidance } from "@ai-novel/shared/types/volumePlanning";
import type {
  VolumeBeatSheet,
  VolumeCountGuidance,
  VolumeCritiqueReport,
  VolumeGenerationScopeInput,
  VolumePlan,
  VolumePlanDocument,
  VolumeRebalanceDecision,
  VolumeStrategyPlan,
} from "@ai-novel/shared/types/novel";
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import { generateNovelVolumes, updateNovelVolumes, type NovelDetailResponse } from "@/api/novel";
import { queryKeys } from "@/api/queryKeys";
import {
  buildVolumePlanningReadiness,
  createEmptyChapter,
  createEmptyVolume,
  findBeatSheet,
  normalizeVolumeDraft,
} from "../volumePlan.utils";
import {
  detailModeLabel,
  hasChapterDetailDraft,
  type ChapterDetailBundleRequest,
  type ChapterDetailMode,
} from "../chapterDetailPlanning.shared";
import {
  buildChapterDetailBatchConfirmationMessage,
  resolveChapterDetailBatch,
  runChapterDetailBatchGeneration,
} from "./useNovelVolumePlanning.chapterDetail";
import { syncNovelWorkflowStageSilently } from "../novelWorkflow.client";

interface LlmSettings {
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
}

interface UseNovelVolumePlanningArgs {
  novelId: string;
  hasCharacters: boolean;
  llm: LlmSettings;
  estimatedChapterCount?: number | null;
  volumeDraft: VolumePlan[];
  strategyPlan: VolumeStrategyPlan | null;
  critiqueReport: VolumeCritiqueReport | null;
  beatSheets: VolumeBeatSheet[];
  rebalanceDecisions: VolumeRebalanceDecision[];
  savedWorkspace?: VolumePlanDocument | null;
  setVolumeDraft: Dispatch<SetStateAction<VolumePlan[]>>;
  setStrategyPlan: Dispatch<SetStateAction<VolumeStrategyPlan | null>>;
  setCritiqueReport: Dispatch<SetStateAction<VolumeCritiqueReport | null>>;
  setBeatSheets: Dispatch<SetStateAction<VolumeBeatSheet[]>>;
  setRebalanceDecisions: Dispatch<SetStateAction<VolumeRebalanceDecision[]>>;
  setVolumeGenerationMessage: (value: string) => void;
  setStructuredMessage: (value: string) => void;
}

interface VolumeGenerationPayload {
  scope: VolumeGenerationScopeInput;
  targetVolumeId?: string;
  targetChapterId?: string;
  detailMode?: ChapterDetailMode;
  draftVolumesOverride?: VolumePlan[];
  suppressSuccessMessage?: boolean;
}

interface GeneratedVolumeMutationResult {
  generatedResponse: Awaited<ReturnType<typeof generateNovelVolumes>>;
  persistedResponse: Awaited<ReturnType<typeof updateNovelVolumes>>;
  nextDocument: VolumePlanDocument;
}

class VolumeGenerationAutoSaveError extends Error {
  nextDocument: VolumePlanDocument;

  constructor(message: string, nextDocument: VolumePlanDocument) {
    super(message);
    this.name = "VolumeGenerationAutoSaveError";
    this.nextDocument = nextDocument;
  }
}

function serializeVolumeDraft(volumes: VolumePlan[]): string {
  return JSON.stringify(normalizeVolumeDraft(volumes).map((volume) => ({
    sortOrder: volume.sortOrder,
    title: volume.title,
    summary: volume.summary ?? "",
    openingHook: volume.openingHook ?? "",
    mainPromise: volume.mainPromise ?? "",
    primaryPressureSource: volume.primaryPressureSource ?? "",
    coreSellingPoint: volume.coreSellingPoint ?? "",
    escalationMode: volume.escalationMode ?? "",
    protagonistChange: volume.protagonistChange ?? "",
    midVolumeRisk: volume.midVolumeRisk ?? "",
    climax: volume.climax ?? "",
    payoffType: volume.payoffType ?? "",
    nextVolumeHook: volume.nextVolumeHook ?? "",
    resetPoint: volume.resetPoint ?? "",
    openPayoffs: volume.openPayoffs,
    chapters: volume.chapters.map((chapter) => ({
      chapterOrder: chapter.chapterOrder,
      title: chapter.title,
      summary: chapter.summary,
      purpose: chapter.purpose ?? "",
      conflictLevel: chapter.conflictLevel ?? null,
      revealLevel: chapter.revealLevel ?? null,
      targetWordCount: chapter.targetWordCount ?? null,
      mustAvoid: chapter.mustAvoid ?? "",
      taskSheet: chapter.taskSheet ?? "",
      payoffRefs: chapter.payoffRefs,
    })),
  })));
}

function mergeSavedVolumeDocumentIntoNovelDetail(
  previous: ApiResponse<NovelDetailResponse> | undefined,
  document: VolumePlanDocument,
): ApiResponse<NovelDetailResponse> | undefined {
  if (!previous?.data) {
    return previous;
  }
  return {
    ...previous,
    data: {
      ...previous.data,
      outline: document.derivedOutline,
      structuredOutline: document.derivedStructuredOutline,
      volumes: document.volumes,
      volumeSource: document.source,
      activeVolumeVersionId: document.activeVersionId,
    },
  };
}

export function useNovelVolumePlanning({
  novelId,
  hasCharacters,
  llm,
  estimatedChapterCount,
  volumeDraft,
  strategyPlan,
  critiqueReport,
  beatSheets,
  rebalanceDecisions,
  savedWorkspace,
  setVolumeDraft,
  setStrategyPlan,
  setCritiqueReport,
  setBeatSheets,
  setRebalanceDecisions,
  setVolumeGenerationMessage,
  setStructuredMessage,
}: UseNovelVolumePlanningArgs) {
  const queryClient = useQueryClient();
  const normalizedVolumeDraft = useMemo(() => normalizeVolumeDraft(volumeDraft), [volumeDraft]);
  const normalizedSavedVolumes = useMemo(
    () => normalizeVolumeDraft(savedWorkspace?.volumes ?? []),
    [savedWorkspace?.volumes],
  );
  const hasUnsavedVolumeDraft = useMemo(
    () => serializeVolumeDraft(normalizedVolumeDraft) !== serializeVolumeDraft(normalizedSavedVolumes),
    [normalizedSavedVolumes, normalizedVolumeDraft],
  );
  const readiness = useMemo(
    () => buildVolumePlanningReadiness({ volumes: normalizedVolumeDraft, strategyPlan, beatSheets }),
    [beatSheets, normalizedVolumeDraft, strategyPlan],
  );
  const currentChapterCount = useMemo(
    () => normalizedVolumeDraft.reduce((sum, volume) => sum + volume.chapters.length, 0),
    [normalizedVolumeDraft],
  );
  const [customVolumeCountEnabled, setCustomVolumeCountEnabled] = useState(false);
  const [customVolumeCountInput, setCustomVolumeCountInput] = useState("");
  const [userPreferredVolumeCount, setUserPreferredVolumeCount] = useState<number | null>(null);
  const [forceSystemRecommendedVolumeCount, setForceSystemRecommendedVolumeCount] = useState(false);
  const volumeCountGuidance = useMemo<VolumeCountGuidance>(
    () => buildVolumeCountGuidance({
      chapterBudget: Math.max(estimatedChapterCount ?? 0, currentChapterCount, 12),
      existingVolumeCount: normalizedVolumeDraft.length,
      respectExistingVolumeCount: !forceSystemRecommendedVolumeCount && normalizedVolumeDraft.length > 0,
      userPreferredVolumeCount,
    }),
    [currentChapterCount, estimatedChapterCount, forceSystemRecommendedVolumeCount, normalizedVolumeDraft.length, userPreferredVolumeCount],
  );

  useEffect(() => {
    if (userPreferredVolumeCount != null) {
      setCustomVolumeCountInput(String(userPreferredVolumeCount));
      return;
    }
    if (!customVolumeCountEnabled) {
      setCustomVolumeCountInput(String(volumeCountGuidance.recommendedVolumeCount));
    }
  }, [
    customVolumeCountEnabled,
    userPreferredVolumeCount,
    volumeCountGuidance.recommendedVolumeCount,
  ]);

  const updateVolumeDraft = (
    updater: (prev: VolumePlan[]) => VolumePlan[],
    options: {
      clearBeatSheets?: boolean;
      clearRebalanceDecisions?: boolean;
    } = {},
  ) => {
    setVolumeDraft((prev) => normalizeVolumeDraft(updater(prev)));
    if (options.clearBeatSheets) {
      setBeatSheets([]);
    }
    if (options.clearRebalanceDecisions) {
      setRebalanceDecisions([]);
    }
  };

  const applyWorkspaceDocument = (document: VolumePlanDocument) => {
    setVolumeDraft(document.volumes);
    setStrategyPlan(document.strategyPlan);
    setCritiqueReport(document.critiqueReport);
    setBeatSheets(document.beatSheets);
    setRebalanceDecisions(document.rebalanceDecisions);
  };

  const syncSavedVolumeDocumentToCache = (document: VolumePlanDocument) => {
    queryClient.setQueryData<ApiResponse<NovelDetailResponse> | undefined>(
      queryKeys.novels.detail(novelId),
      (previous) => mergeSavedVolumeDocumentIntoNovelDetail(previous, document),
    );
    queryClient.setQueryData<ApiResponse<VolumePlanDocument>>(
      queryKeys.novels.volumeWorkspace(novelId),
      () => ({
        success: true,
        message: "Volume workspace updated.",
        data: document,
      }),
    );
  };

  const [isGeneratingChapterDetailBundle, setIsGeneratingChapterDetailBundle] = useState(false);
  const [bundleGeneratingChapterId, setBundleGeneratingChapterId] = useState("");
  const [bundleGeneratingMode, setBundleGeneratingMode] = useState<ChapterDetailMode | "">("");

  const generateMutation = useMutation({
    mutationFn: async (payload: VolumeGenerationPayload): Promise<GeneratedVolumeMutationResult> => {
      const requestDraft = normalizeVolumeDraft(payload.draftVolumesOverride ?? normalizedVolumeDraft);
      const generatedResponse = await generateNovelVolumes(novelId, {
        provider: llm.provider,
        model: llm.model,
        temperature: llm.temperature,
        scope: payload.scope,
        targetVolumeId: payload.targetVolumeId,
        targetChapterId: payload.targetChapterId,
        detailMode: payload.detailMode,
        draftVolumes: requestDraft.length > 0 ? requestDraft : undefined,
        draftWorkspace: {
          novelId,
          workspaceVersion: "v2",
          volumes: requestDraft,
          strategyPlan,
          critiqueReport,
          beatSheets,
          rebalanceDecisions,
          readiness,
          derivedOutline: "",
          derivedStructuredOutline: "",
          source: savedWorkspace?.source ?? "volume",
          activeVersionId: savedWorkspace?.activeVersionId ?? null,
        },
        estimatedChapterCount: typeof estimatedChapterCount === "number" && estimatedChapterCount > 0
          ? estimatedChapterCount
          : undefined,
        userPreferredVolumeCount: userPreferredVolumeCount ?? undefined,
        respectExistingVolumeCount: !forceSystemRecommendedVolumeCount && requestDraft.length > 0,
      });
      const nextDocument = generatedResponse.data;
      if (!nextDocument) {
        throw new Error("AI không trả về kết quả cho không gian làm việc tập.");
      }

      try {
        const persistedResponse = await updateNovelVolumes(novelId, nextDocument);
        return {
          generatedResponse,
          persistedResponse,
          nextDocument: persistedResponse.data ?? nextDocument,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "AI đã sinh xong nhưng lưu tự động thất bại.";
        throw new VolumeGenerationAutoSaveError(message, nextDocument);
      }
    },
    onSuccess: (result, payload) => {
      applyWorkspaceDocument(result.nextDocument);
      if (result.persistedResponse.data) {
        syncSavedVolumeDocumentToCache(result.persistedResponse.data);
      }

      void syncNovelWorkflowStageSilently({
        novelId,
        stage: payload.scope === "strategy" || payload.scope === "strategy_critique" || payload.scope === "skeleton" || payload.scope === "book"
          ? "volume_strategy"
          : "structured_outline",
        itemLabel: payload.scope === "strategy"
          ? "Đã cập nhật gợi ý chiến lược tập"
          : payload.scope === "strategy_critique"
            ? "Đã cập nhật bản duyệt chiến lược tập"
            : payload.scope === "skeleton" || payload.scope === "book"
              ? "Đã cập nhật khung tập"
              : payload.scope === "beat_sheet"
                ? "Đã cập nhật bảng nhịp của tập hiện tại"
                : payload.scope === "chapter_list" || payload.scope === "volume"
                  ? "Đã sinh danh sách chương của tập hiện tại"
                  : payload.scope === "rebalance"
                    ? "Đã cập nhật gợi ý cân bằng giữa các tập"
                    : "Đã cập nhật phần tinh chỉnh chương",
        checkpointType: payload.scope === "skeleton" || payload.scope === "book"
          ? "volume_strategy_ready"
          : payload.scope === "chapter_list" || payload.scope === "volume"
            ? "chapter_batch_ready"
            : null,
        checkpointSummary: payload.scope === "skeleton" || payload.scope === "book"
          ? "Chiến lược tập và khung tập đã được làm mới, có thể tiếp tục sang bước tách nhịp và chương."
          : payload.scope === "chapter_list" || payload.scope === "volume"
            ? "Danh sách chương của tập hiện tại đã sẵn sàng, có thể tiếp tục tinh chỉnh và đồng bộ sang triển khai chương."
            : undefined,
        volumeId: payload.targetVolumeId,
        chapterId: payload.targetChapterId,
        status: "waiting_approval",
      });

      if (payload.suppressSuccessMessage) {
        return;
      }

      if (payload.scope === "strategy") {
        const message = "Đã sinh và tự động lưu gợi ý chiến lược tập. Bước tiếp theo hãy duyệt trước rồi mới xác nhận khung tập.";
        setVolumeGenerationMessage(message);
        setStructuredMessage(message);
        return;
      }
      if (payload.scope === "strategy_critique") {
        const message = "Đã hoàn tất duyệt chiến lược tập, vấn đề và đề xuất đã được ghi vào khu duyệt bên phải.";
        setVolumeGenerationMessage(message);
        return;
      }
      if (payload.scope === "skeleton" || payload.scope === "book") {
        const message = "Đã sinh và tự động lưu khung tập. Hệ thống đã xóa bảng nhịp cũ, bước tiếp theo hãy sinh bảng nhịp cho tập hiện tại.";
        setVolumeGenerationMessage(message);
        setStructuredMessage(message);
        return;
      }
      if (payload.scope === "beat_sheet") {
        setStructuredMessage("Bảng nhịp của tập hiện tại đã được cập nhật và tự động lưu. Bây giờ có thể tiếp tục tách danh sách chương.");
        return;
      }
      if (payload.scope === "chapter_list" || payload.scope === "volume") {
        const updatedVolume = payload.targetVolumeId
          ? result.nextDocument.volumes.find((volume) => volume.id === payload.targetVolumeId)
          : undefined;
        const updatedChapterCount = updatedVolume?.chapters.length ?? 0;
        setStructuredMessage(
          updatedChapterCount > 0
            ? `Danh sách chương của tập hiện tại đã được sinh và tự động lưu, hiện đã cập nhật thành ${updatedChapterCount} chương, gợi ý cân bằng giữa các tập cũng đã được đồng bộ.`
            : "Danh sách chương của tập hiện tại đã được sinh và tự động lưu, gợi ý cân bằng giữa các tập cũng đã được đồng bộ.",
        );
        return;
      }
      if (payload.scope === "rebalance") {
        setStructuredMessage("Đã cập nhật gợi ý cân bằng giữa các tập liền kề.");
        return;
      }

      const label = detailModeLabel(payload.detailMode ?? "purpose");
      setStructuredMessage(`${label} đã được AI hiệu chỉnh và tự động lưu.`);
    },
    onError: (error, payload) => {
      if (error instanceof VolumeGenerationAutoSaveError) {
        applyWorkspaceDocument(error.nextDocument);
      }
      const message = error instanceof VolumeGenerationAutoSaveError
        ? `AI đã sinh xong nhưng lưu tự động thất bại: ${error.message}`
        : error instanceof Error
          ? error.message
          : "Sinh phương án cấp tập thất bại.";
      if (payload.scope === "strategy" || payload.scope === "strategy_critique" || payload.scope === "skeleton" || payload.scope === "book") {
        setVolumeGenerationMessage(message);
      }
      setStructuredMessage(message);
    },
  });

  const ensureCharacterGuard = () => {
    if (hasCharacters) {
      return true;
    }
    return window.confirm("Tiểu thuyết hiện chưa có nhân vật. Tiếp tục sinh sẽ làm giảm độ nhất quán về sau, bạn có muốn tiếp tục không?");
  };

  const startStrategyGeneration = () => {
    if (!ensureCharacterGuard()) {
      return;
    }
    const confirmed = window.confirm([
      "Sẽ sinh gợi ý chiến lược tập để giúp quyết định số tập khuyến nghị, số tập quy hoạch cứng và vai trò của từng tập.",
      "Bước này sẽ không sinh thẳng khung tập và cũng chưa tách chương.",
      userPreferredVolumeCount != null
        ? `Lần này sẽ cố định sinh chiến lược chia tập với ${userPreferredVolumeCount} tập.`
        : forceSystemRecommendedVolumeCount
          ? `Lần này sẽ sinh theo số tập hệ thống khuyến nghị (hiện khuyến nghị ${volumeCountGuidance.systemRecommendedVolumeCount} tập), không dùng số tập của bản nháp hiện có.`
          : volumeCountGuidance.respectedExistingVolumeCount != null
            ? `Lần này sẽ ưu tiên dùng cấu trúc ${volumeCountGuidance.respectedExistingVolumeCount} tập của bản nháp hiện tại, đồng thời vẫn giữ trong khoảng cho phép ${volumeCountGuidance.allowedVolumeCountRange.min}-${volumeCountGuidance.allowedVolumeCountRange.max}.`
            : `Hiện hệ thống khuyến nghị ${volumeCountGuidance.systemRecommendedVolumeCount} tập, khoảng cho phép là ${volumeCountGuidance.allowedVolumeCountRange.min}-${volumeCountGuidance.allowedVolumeCountRange.max} tập.`,
      hasUnsavedVolumeDraft ? "Lần này sẽ dùng trực tiếp bản nháp chưa lưu của trang hiện tại làm tham chiếu." : "Lần này sẽ sinh gợi ý dựa trên trạng thái không gian làm việc hiện tại.",
    ].join("\n\n"));
    if (!confirmed) {
      return;
    }
    generateMutation.mutate({ scope: "strategy" });
  };

  const startStrategyCritique = () => {
    if (!strategyPlan) {
      setVolumeGenerationMessage("Hãy sinh gợi ý chiến lược tập trước.");
      return;
    }
    generateMutation.mutate({ scope: "strategy_critique" });
  };

  const startSkeletonGeneration = () => {
    if (!ensureCharacterGuard()) {
      return;
    }
    const confirmed = window.confirm([
      "Sẽ dựa trên gợi ý chiến lược tập hiện tại để sinh hoặc sinh lại khung tập của toàn bộ sách.",
      "Bước này sẽ xóa bảng nhịp hiện có và gợi ý cân bằng giữa các tập, nhưng không xóa trực tiếp nội dung chương.",
      hasUnsavedVolumeDraft ? "Lần này sẽ dùng trực tiếp bản nháp hiện tại của trang làm ngữ cảnh khung tập." : "Lần này sẽ tiếp tục dựa trên không gian làm việc của tập hiện tại để đi tiếp.",
    ].join("\n\n"));
    if (!confirmed) {
      return;
    }
    generateMutation.mutate({ scope: "skeleton" });
  };

  const startBeatSheetGeneration = (volumeId: string) => {
    const targetVolume = normalizedVolumeDraft.find((volume) => volume.id === volumeId);
    if (!targetVolume) {
      setStructuredMessage("Không có tập hiện tại nên không thể sinh bảng nhịp.");
      return;
    }
    if (!strategyPlan) {
      setStructuredMessage("Hãy sinh gợi ý chiến lược tập trước rồi mới sinh bảng nhịp của tập hiện tại.");
      return;
    }
    if (!ensureCharacterGuard()) {
      return;
    }
    const existingBeatSheet = findBeatSheet(beatSheets, volumeId);
    if (existingBeatSheet) {
      const confirmed = window.confirm([
        `Sẽ sinh lại bảng nhịp cho “${targetVolume.title?.trim() || `Tập ${targetVolume.sortOrder}`}”.`,
        "Bước này sẽ ghi đè các đoạn nhịp và hạng mục giao nộp hiện có của tập.",
        "Danh sách chương và tài nguyên tinh chỉnh chương sẽ không bị xóa trực tiếp, nhưng nếu nhịp mới thay đổi thì nên kiểm tra lại xem danh sách chương còn khớp không.",
      ].join("\n\n"));
      if (!confirmed) {
        return;
      }
    }
    generateMutation.mutate({
      scope: "beat_sheet",
      targetVolumeId: volumeId,
    });
  };

  const startChapterListGeneration = (volumeId: string) => {
    const targetVolume = normalizedVolumeDraft.find((volume) => volume.id === volumeId);
    if (!targetVolume) {
      setStructuredMessage("Không có tập hiện tại nên không thể sinh danh sách chương.");
      return;
    }
    if (!findBeatSheet(beatSheets, volumeId)) {
      setStructuredMessage("Tập hiện tại chưa có bảng nhịp, nên mặc định chưa thể tách danh sách chương.");
      return;
    }
    if (!ensureCharacterGuard()) {
      return;
    }
    generateMutation.mutate({
      scope: "chapter_list",
      targetVolumeId: volumeId,
    });
  };

  const startChapterDetailGeneration = (
    volumeId: string,
    chapterId: string,
    detailMode: ChapterDetailMode,
  ) => {
    const targetVolume = normalizedVolumeDraft.find((volume) => volume.id === volumeId);
    const targetChapter = targetVolume?.chapters.find((chapter) => chapter.id === chapterId);
    if (!targetVolume || !targetChapter) {
      setStructuredMessage("Không có chương hiện tại nên không thể sinh thông tin tinh chỉnh.");
      return;
    }
    if (!findBeatSheet(beatSheets, volumeId)) {
      setStructuredMessage("Hãy sinh bảng nhịp của tập hiện tại trước rồi mới tinh chỉnh chương.");
      return;
    }
    if (!ensureCharacterGuard()) {
      return;
    }
    const confirmed = window.confirm([
      `Sẽ dựa trên nội dung hiện tại để AI chỉnh sửa ${detailModeLabel(detailMode)} cho Chương ${targetChapter.chapterOrder} “${targetChapter.title}”.`,
      hasChapterDetailDraft(targetChapter, detailMode)
        ? "Sẽ ưu tiên dùng lại kết quả đã nhập hiện tại, chỉ sửa phần thiếu, mơ hồ và chưa đủ khả thi."
        : "Phần này hiện vẫn trống, AI sẽ sinh bản đầu tiên rồi thu lại theo tiêu đề và tóm tắt sẵn có.",
      "Sẽ không thay đổi tiêu đề và tóm tắt chương này, cũng không ảnh hưởng đến các chương khác.",
    ].join("\n\n"));
    if (!confirmed) {
      return;
    }
    generateMutation.mutate({
      scope: "chapter_detail",
      targetVolumeId: volumeId,
      targetChapterId: chapterId,
      detailMode,
    });
  };

  const startChapterDetailBundleGeneration = (
    volumeId: string,
    request: ChapterDetailBundleRequest,
  ) => {
    const targetVolume = normalizedVolumeDraft.find((volume) => volume.id === volumeId);
    const batch = resolveChapterDetailBatch(targetVolume, request);
    if (!targetVolume) {
      setStructuredMessage("Không có tập hiện tại nên không thể sinh tinh chỉnh chương.");
      return;
    }
    if (batch.targets.length === 0) {
      setStructuredMessage(typeof request === "string" ? "Không có chương hiện tại nên không thể sinh trọn bộ tinh chỉnh chương." : "Trong phạm vi hiện tại không có chương nào có thể tinh chỉnh.");
      return;
    }
    if (!findBeatSheet(beatSheets, volumeId)) {
      setStructuredMessage(batch.targets.length > 1 ? "Hãy sinh bảng nhịp của tập hiện tại trước rồi mới tinh chỉnh hàng loạt chương." : "Hãy sinh bảng nhịp của tập hiện tại trước rồi mới tinh chỉnh trọn bộ một chương.");
      return;
    }
    if (!ensureCharacterGuard()) {
      return;
    }
    const confirmed = window.confirm(buildChapterDetailBatchConfirmationMessage(batch));
    if (!confirmed) {
      return;
    }

    void runChapterDetailBatchGeneration({
      initialDraft: normalizedVolumeDraft,
      label: batch.label,
      targetVolumeId: volumeId,
      targets: batch.targets,
      setIsGenerating: setIsGeneratingChapterDetailBundle,
      setCurrentChapterId: setBundleGeneratingChapterId,
      setCurrentMode: setBundleGeneratingMode,
      setStructuredMessage,
      generateChapterDetail: (payload) => generateMutation.mutateAsync({
        scope: "chapter_detail",
        targetVolumeId: payload.targetVolumeId,
        targetChapterId: payload.targetChapterId,
        detailMode: payload.detailMode,
        draftVolumesOverride: payload.draftVolumesOverride,
        suppressSuccessMessage: payload.suppressSuccessMessage,
      }),
    });
  };

  const handleVolumeFieldChange = (
    volumeId: string,
    field: keyof Pick<VolumePlan, "title" | "summary" | "openingHook" | "mainPromise" | "primaryPressureSource" | "coreSellingPoint" | "escalationMode" | "protagonistChange" | "midVolumeRisk" | "climax" | "payoffType" | "nextVolumeHook" | "resetPoint">,
    value: string,
  ) => {
    updateVolumeDraft((prev) => prev.map((volume) => (
      volume.id === volumeId ? { ...volume, [field]: value } : volume
    )), {
      clearBeatSheets: true,
      clearRebalanceDecisions: true,
    });
  };

  const handleOpenPayoffsChange = (volumeId: string, value: string) => {
    const nextPayoffs = value
      .split(/[\n,，;；、]/)
      .map((item) => item.trim())
      .filter(Boolean);
    updateVolumeDraft((prev) => prev.map((volume) => (
      volume.id === volumeId ? { ...volume, openPayoffs: nextPayoffs } : volume
    )), {
      clearBeatSheets: true,
      clearRebalanceDecisions: true,
    });
  };

  const handleAddVolume = () => {
    updateVolumeDraft((prev) => [...prev, createEmptyVolume(prev.length + 1)], {
      clearBeatSheets: true,
      clearRebalanceDecisions: true,
    });
  };

  const handleRemoveVolume = (volumeId: string) => {
    updateVolumeDraft((prev) => prev.filter((volume) => volume.id !== volumeId), {
      clearBeatSheets: true,
      clearRebalanceDecisions: true,
    });
  };

  const handleMoveVolume = (volumeId: string, direction: -1 | 1) => {
    updateVolumeDraft((prev) => {
      const list = prev.slice();
      const index = list.findIndex((volume) => volume.id === volumeId);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= list.length) {
        return prev;
      }
      const [item] = list.splice(index, 1);
      list.splice(targetIndex, 0, item);
      return list;
    }, {
      clearBeatSheets: true,
      clearRebalanceDecisions: true,
    });
  };

  const handleChapterFieldChange = (
    volumeId: string,
    chapterId: string,
    field: keyof Pick<VolumePlan["chapters"][number], "title" | "summary" | "purpose" | "mustAvoid" | "taskSheet">,
    value: string,
  ) => {
    updateVolumeDraft((prev) => prev.map((volume) => (
      volume.id !== volumeId
        ? volume
        : {
          ...volume,
          chapters: volume.chapters.map((chapter) => (
            chapter.id === chapterId ? { ...chapter, [field]: value } : chapter
          )),
        }
    )), {
      clearRebalanceDecisions: field === "title" || field === "summary",
    });
  };

  const handleChapterNumberChange = (
    volumeId: string,
    chapterId: string,
    field: keyof Pick<VolumePlan["chapters"][number], "conflictLevel" | "revealLevel" | "targetWordCount">,
    value: number | null,
  ) => {
    updateVolumeDraft((prev) => prev.map((volume) => (
      volume.id !== volumeId
        ? volume
        : {
          ...volume,
          chapters: volume.chapters.map((chapter) => (
            chapter.id === chapterId ? { ...chapter, [field]: value } : chapter
          )),
        }
    )), {
      clearRebalanceDecisions: true,
    });
  };

  const handleChapterPayoffRefsChange = (volumeId: string, chapterId: string, value: string) => {
    const nextRefs = value
      .split(/[\n,，;；、]/)
      .map((item) => item.trim())
      .filter(Boolean);
    updateVolumeDraft((prev) => prev.map((volume) => (
      volume.id !== volumeId
        ? volume
        : {
          ...volume,
          chapters: volume.chapters.map((chapter) => (
            chapter.id === chapterId ? { ...chapter, payoffRefs: nextRefs } : chapter
          )),
        }
    )));
  };

  const handleAddChapter = (volumeId: string) => {
    updateVolumeDraft((prev) => prev.map((volume) => (
      volume.id !== volumeId
        ? volume
        : {
          ...volume,
          chapters: [...volume.chapters, createEmptyChapter(prev.flatMap((item) => item.chapters).length + 1)],
        }
    )), {
      clearRebalanceDecisions: true,
    });
  };

  const handleRemoveChapter = (volumeId: string, chapterId: string) => {
    updateVolumeDraft((prev) => prev.map((volume) => (
      volume.id !== volumeId
        ? volume
        : {
          ...volume,
          chapters: volume.chapters.filter((chapter) => chapter.id !== chapterId),
        }
    )), {
      clearRebalanceDecisions: true,
    });
  };

  const handleMoveChapter = (volumeId: string, chapterId: string, direction: -1 | 1) => {
    updateVolumeDraft((prev) => prev.map((volume) => {
      if (volume.id !== volumeId) {
        return volume;
      }
      const chaptersInVolume = volume.chapters.slice();
      const index = chaptersInVolume.findIndex((chapter) => chapter.id === chapterId);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= chaptersInVolume.length) {
        return volume;
      }
      const [item] = chaptersInVolume.splice(index, 1);
      chaptersInVolume.splice(targetIndex, 0, item);
      return { ...volume, chapters: chaptersInVolume };
    }), {
      clearRebalanceDecisions: true,
    });
  };

  const applyCustomVolumeCount = () => {
    const parsed = Number.parseInt(customVolumeCountInput.trim(), 10);
    if (!Number.isFinite(parsed)) {
      setVolumeGenerationMessage("Hãy nhập một số tập cố định hợp lệ.");
      return;
    }
    if (
      parsed < volumeCountGuidance.allowedVolumeCountRange.min
      || parsed > volumeCountGuidance.allowedVolumeCountRange.max
    ) {
      setVolumeGenerationMessage(
        `Số tập cố định phải nằm trong khoảng ${volumeCountGuidance.allowedVolumeCountRange.min}-${volumeCountGuidance.allowedVolumeCountRange.max} tập.`,
      );
      return;
    }
    setUserPreferredVolumeCount(parsed);
    setForceSystemRecommendedVolumeCount(false);
    setVolumeGenerationMessage(`Hiện đã cố định là ${parsed} tập. Lần sau sinh chiến lược tập sẽ dùng đúng số này.`);
  };

  const restoreSystemRecommendedVolumeCount = () => {
    setUserPreferredVolumeCount(null);
    setCustomVolumeCountEnabled(false);
    setCustomVolumeCountInput(String(volumeCountGuidance.systemRecommendedVolumeCount));
    setForceSystemRecommendedVolumeCount(true);
    setVolumeGenerationMessage(
      `Đã khôi phục số tập hệ thống khuyến nghị. Lần sau sinh chiến lược tập sẽ ưu tiên dùng ${volumeCountGuidance.systemRecommendedVolumeCount} tập.`,
    );
  };

  const generationNotice = strategyPlan
    ? "Không gian làm việc hiện đã vào luồng giai đoạn 2: duyệt chiến lược tập trước, xác nhận khung tập, rồi sinh bảng nhịp và danh sách chương theo tập."
    : "Hãy sinh gợi ý chiến lược tập trước để hệ thống giúp quyết định số tập và quy hoạch cứng/mềm, rồi mới vào khung tập.";
  const generatingChapterDetailMode: ChapterDetailMode | "" = isGeneratingChapterDetailBundle
    ? bundleGeneratingMode
    : generateMutation.variables?.scope === "chapter_detail"
      ? generateMutation.variables.detailMode ?? ""
      : "";
  const generatingChapterDetailChapterId = isGeneratingChapterDetailBundle
    ? bundleGeneratingChapterId
    : generateMutation.variables?.scope === "chapter_detail"
      ? generateMutation.variables.targetChapterId ?? ""
      : "";
  const isGeneratingChapterDetail = isGeneratingChapterDetailBundle
    || (generateMutation.isPending && generateMutation.variables?.scope === "chapter_detail");

  return {
    normalizedVolumeDraft,
    hasUnsavedVolumeDraft,
    generationNotice,
    readiness,
    volumeCountGuidance,
    customVolumeCountEnabled,
    customVolumeCountInput,
    onCustomVolumeCountEnabledChange: (enabled: boolean) => {
      setCustomVolumeCountEnabled(enabled);
      if (enabled) {
        setCustomVolumeCountInput((current) => current || String(volumeCountGuidance.recommendedVolumeCount));
        return;
      }
      setUserPreferredVolumeCount(null);
    },
    onCustomVolumeCountInputChange: setCustomVolumeCountInput,
    onApplyCustomVolumeCount: applyCustomVolumeCount,
    onRestoreSystemRecommendedVolumeCount: restoreSystemRecommendedVolumeCount,
    isGeneratingStrategy: generateMutation.isPending && generateMutation.variables?.scope === "strategy",
    isCritiquingStrategy: generateMutation.isPending && generateMutation.variables?.scope === "strategy_critique",
    isGeneratingSkeleton: generateMutation.isPending && (generateMutation.variables?.scope === "skeleton" || generateMutation.variables?.scope === "book"),
    isGeneratingBeatSheet: generateMutation.isPending && generateMutation.variables?.scope === "beat_sheet",
    isGeneratingChapterList: generateMutation.isPending && (generateMutation.variables?.scope === "chapter_list" || generateMutation.variables?.scope === "volume"),
    isGeneratingChapterDetail,
    isGeneratingChapterDetailBundle,
    generatingChapterDetailMode,
    generatingChapterDetailChapterId,
    startStrategyGeneration,
    startStrategyCritique,
    startSkeletonGeneration,
    startBeatSheetGeneration,
    startChapterListGeneration,
    startChapterDetailGeneration,
    startChapterDetailBundleGeneration,
    handleVolumeFieldChange,
    handleOpenPayoffsChange,
    handleAddVolume,
    handleRemoveVolume,
    handleMoveVolume,
    handleChapterFieldChange,
    handleChapterNumberChange,
    handleChapterPayoffRefsChange,
    handleAddChapter,
    handleRemoveChapter,
    handleMoveChapter,
  };
}
