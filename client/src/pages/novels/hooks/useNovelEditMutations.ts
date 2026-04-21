import { useMutation, type QueryClient } from "@tanstack/react-query";
import type { PipelineRepairMode, PipelineRunMode, VolumePlanDocument } from "@ai-novel/shared/types/novel";
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import {
  createNovelChapter,
  generateChapterHook,
  optimizeNovelOutlinePreview,
  optimizeNovelStructuredOutlinePreview,
  reviewNovelChapter,
  runNovelPipeline,
  updateNovel,
  syncNovelVolumeChapters,
  updateNovelVolumes,
} from "@/api/novel";
import { queryKeys } from "@/api/queryKeys";
import { buildNovelUpdatePayload, type NovelBasicFormState } from "../novelBasicInfo.shared";
import type { ChapterReviewResult } from "../chapterPlanning.shared";
import type { StructuredSyncOptions } from "../novelEdit.utils";
import { syncNovelWorkflowStageSilently } from "../novelWorkflow.client";

interface LlmSettings {
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
}

interface PipelineFormState {
  startOrder: number;
  endOrder: number;
  maxRetries: number;
  runMode: PipelineRunMode;
  autoReview: boolean;
  autoRepair: boolean;
  skipCompleted: boolean;
  qualityThreshold: number;
  repairMode: PipelineRepairMode;
}

interface UseNovelEditMutationsArgs {
  id: string;
  basicForm: NovelBasicFormState;
  hasCharacters: boolean;
  outlineText: string;
  outlineOptimizeInstruction: string;
  setOutlineOptimizePreview: (value: string) => void;
  setOutlineOptimizeMode: (value: "full" | "selection") => void;
  setOutlineOptimizeSourceText: (value: string) => void;
  structuredDraftText: string;
  structuredOptimizeInstruction: string;
  setStructuredOptimizePreview: (value: string) => void;
  setStructuredOptimizeMode: (value: "full" | "selection") => void;
  setStructuredOptimizeSourceText: (value: string) => void;
  volumeDocument: VolumePlanDocument;
  llm: LlmSettings;
  pipelineForm: PipelineFormState;
  selectedChapterId: string;
  chapterCount: number;
  setActiveTab: (value: string) => void;
  setSelectedChapterId: (value: string) => void;
  setCurrentJobId: (value: string) => void;
  setPipelineMessage: (value: string) => void;
  setStructuredMessage: (value: string) => void;
  setReviewResult: (value: ChapterReviewResult | null) => void;
  queryClient: QueryClient;
  invalidateNovelDetail: () => Promise<void>;
}

export function useNovelEditMutations({
  id,
  basicForm,
  hasCharacters,
  outlineText,
  outlineOptimizeInstruction,
  setOutlineOptimizePreview,
  setOutlineOptimizeMode,
  setOutlineOptimizeSourceText,
  structuredDraftText,
  structuredOptimizeInstruction,
  setStructuredOptimizePreview,
  setStructuredOptimizeMode,
  setStructuredOptimizeSourceText,
  volumeDocument,
  llm,
  pipelineForm,
  selectedChapterId,
  chapterCount,
  setActiveTab,
  setSelectedChapterId,
  setCurrentJobId,
  setPipelineMessage,
  setStructuredMessage,
  setReviewResult,
  queryClient,
  invalidateNovelDetail,
}: UseNovelEditMutationsArgs) {
  const saveBasicMutation = useMutation({
    mutationFn: () => updateNovel(id, buildNovelUpdatePayload(basicForm)),
    onSuccess: async () => {
      await syncNovelWorkflowStageSilently({
        novelId: id,
        stage: "project_setup",
        itemLabel: "Đã lưu thiết lập dự án",
        status: "waiting_approval",
      });
      await invalidateNovelDetail();
      if (!hasCharacters) {
        setActiveTab("character");
      }
    },
  });

  const saveOutlineMutation = useMutation({
    mutationFn: () => updateNovelVolumes(id, volumeDocument),
    onSuccess: async () => {
      await syncNovelWorkflowStageSilently({
        novelId: id,
        stage: "volume_strategy",
        itemLabel: "Đã lưu chiến lược tập / khung tập",
        checkpointType: "volume_strategy_ready",
        checkpointSummary: "Chiến lược tập và khung tập hiện tại đã được lưu vào không gian làm việc.",
        status: "waiting_approval",
      });
      await invalidateNovelDetail();
    },
  });

  const saveStructuredMutation = useMutation({
    mutationFn: () => updateNovelVolumes(id, volumeDocument),
    onSuccess: async () => {
      await syncNovelWorkflowStageSilently({
        novelId: id,
        stage: "structured_outline",
        itemLabel: "Đã lưu nhịp truyện / tách chương",
        status: "waiting_approval",
      });
      await invalidateNovelDetail();
    },
  });

  const optimizeOutlineMutation = useMutation({
    mutationFn: (payload: { mode: "full" | "selection"; selectedText?: string }) =>
      optimizeNovelOutlinePreview(id, {
        currentDraft: outlineText,
        instruction: outlineOptimizeInstruction,
        mode: payload.mode,
        selectedText: payload.selectedText,
        provider: llm.provider,
        model: llm.model,
        temperature: llm.temperature,
      }),
    onSuccess: (response) => {
      setOutlineOptimizePreview(response.data?.optimizedDraft ?? "");
      setOutlineOptimizeMode(response.data?.mode ?? "full");
      setOutlineOptimizeSourceText(response.data?.selectedText ?? "");
    },
  });

  const optimizeStructuredMutation = useMutation({
    mutationFn: (payload: { mode: "full" | "selection"; selectedText?: string }) =>
      optimizeNovelStructuredOutlinePreview(id, {
        currentDraft: structuredDraftText,
        instruction: structuredOptimizeInstruction,
        mode: payload.mode,
        selectedText: payload.selectedText,
        provider: llm.provider,
        model: llm.model,
        temperature: llm.temperature,
      }),
    onSuccess: (response) => {
      setStructuredOptimizePreview(response.data?.optimizedDraft ?? "");
      setStructuredOptimizeMode(response.data?.mode ?? "full");
      setStructuredOptimizeSourceText(response.data?.selectedText ?? "");
    },
  });

  const syncStructuredChaptersMutation = useMutation({
    mutationFn: (options: StructuredSyncOptions) => syncNovelVolumeChapters(id, {
      volumes: volumeDocument.volumes,
      preserveContent: options.preserveContent,
      applyDeletes: options.applyDeletes,
    }),
    onSuccess: async (response) => {
      const preview = response.data;
      setStructuredMessage(
        `Đồng bộ xong: thêm ${preview?.createCount ?? 0}, cập nhật ${preview?.updateCount ?? 0}, xóa ${preview?.deleteCount ?? 0}.`,
      );
      await syncNovelWorkflowStageSilently({
        novelId: id,
        stage: "structured_outline",
        itemLabel: "Đã đồng bộ tách chương theo tập sang khu vực thực thi chương",
        checkpointType: "chapter_batch_ready",
        checkpointSummary: "Danh sách chương, bảng việc và lối vào thực thi đã được đồng bộ, có thể tiếp tục sang phần thực thi chương.",
        status: "waiting_approval",
      });
      await invalidateNovelDetail();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Đồng bộ chương thất bại.";
      setStructuredMessage(message);
    },
  });

  const createChapterMutation = useMutation({
    mutationFn: () =>
      createNovelChapter(id, {
        title: `Chương mới ${chapterCount + 1}`,
        order: chapterCount + 1,
        content: "",
      }),
    onSuccess: async (response) => {
      if (response.data?.id) {
        setSelectedChapterId(response.data.id);
      }
      await syncNovelWorkflowStageSilently({
        novelId: id,
        stage: "chapter_execution",
        itemLabel: "Đã tạo mục thực thi chương mới",
        chapterId: response.data?.id,
        status: "waiting_approval",
      });
      await invalidateNovelDetail();
    },
  });

  const runPipelineMutation = useMutation({
    mutationFn: (override?: Partial<PipelineFormState>) =>
      runNovelPipeline(id, {
        startOrder: override?.startOrder ?? pipelineForm.startOrder,
        endOrder: override?.endOrder ?? pipelineForm.endOrder,
        maxRetries: override?.maxRetries ?? pipelineForm.maxRetries,
        runMode: override?.runMode ?? pipelineForm.runMode,
        autoReview: override?.autoReview ?? pipelineForm.autoReview,
        autoRepair: override?.autoRepair ?? pipelineForm.autoRepair,
        skipCompleted: override?.skipCompleted ?? pipelineForm.skipCompleted,
        qualityThreshold: override?.qualityThreshold ?? pipelineForm.qualityThreshold,
        repairMode: override?.repairMode ?? pipelineForm.repairMode,
        provider: llm.provider,
        model: llm.model,
        temperature: llm.temperature,
      }),
    onSuccess: async (response) => {
      if (response.data?.id) {
        setCurrentJobId(response.data.id);
      }
      setPipelineMessage(response.message ?? "Đã khởi chạy dây chuyền xử lý.");
      await syncNovelWorkflowStageSilently({
        novelId: id,
        stage: "quality_repair",
        itemLabel: "Đang chạy dây chuyền xử lý chương",
        status: "running",
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.novels.pipelineJob(id, response.data?.id ?? "none") });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: () =>
      reviewNovelChapter(id, selectedChapterId, {
        provider: llm.provider,
        model: llm.model,
        temperature: 0.1,
      }),
    onSuccess: async (response) => {
      setReviewResult(response.data ?? null);
      setPipelineMessage("Đã rà soát chương.");
      await syncNovelWorkflowStageSilently({
        novelId: id,
        stage: "quality_repair",
        itemLabel: "Đã hoàn tất rà soát chương",
        status: "waiting_approval",
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.novels.qualityReport(id) });
    },
  });

  const hookMutation = useMutation({
    mutationFn: () =>
      generateChapterHook(id, {
        chapterId: selectedChapterId || undefined,
        provider: llm.provider,
        model: llm.model,
        temperature: llm.temperature,
      }),
    onSuccess: async () => {
      setPipelineMessage("Đã tạo móc nối chương.");
      await syncNovelWorkflowStageSilently({
        novelId: id,
        stage: "chapter_execution",
        itemLabel: "Đã tạo móc nối chương",
        chapterId: selectedChapterId || undefined,
        status: "waiting_approval",
      });
      await invalidateNovelDetail();
    },
  });

  return {
    saveBasicMutation,
    saveOutlineMutation,
    saveStructuredMutation,
    optimizeOutlineMutation,
    optimizeStructuredMutation,
    syncStructuredChaptersMutation,
    createChapterMutation,
    runPipelineMutation,
    reviewMutation,
    hookMutation,
  };
}
