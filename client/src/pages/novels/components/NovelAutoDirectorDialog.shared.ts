import type { LLMProvider } from "@ai-novel/shared/types/llm";
import { normalizeCommercialTags } from "@ai-novel/shared/types/novelFraming";
import type { DirectorRunMode } from "@ai-novel/shared/types/novelDirector";
import type { NovelBasicFormState } from "../novelBasicInfo.shared";

export const RUN_MODE_OPTIONS: Array<{
  value: DirectorRunMode;
  label: string;
  description: string;
}> = [
  {
    value: "auto_to_ready",
    label: "Tự chạy đến khi có thể mở viết",
    description: "AI sẽ tiếp tục đẩy tiến độ cho tới khi tài nguyên triển khai chương sẵn sàng rồi mới bàn giao cho bạn.",
  },
  {
    value: "auto_to_execution",
    label: "Tiếp tục tự động triển khai theo lô chương",
    description: "Mặc định sẽ chạy 10 chương đầu, nhưng bạn cũng có thể đổi sang phạm vi chương chỉ định hoặc chạy theo tập.",
  },
];

export const DEFAULT_VISIBLE_RUN_MODE: DirectorRunMode = "auto_to_ready";

export interface AutoDirectorRequestLlmOptions {
  provider: LLMProvider;
  model: string;
  temperature?: number;
}

export function buildInitialIdea(basicForm: NovelBasicFormState): string {
  const lines = [
    basicForm.description.trim(),
    basicForm.title.trim() ? `Tôi muốn viết một cuốn tạm đặt tên là “${basicForm.title.trim()}”.` : "",
    basicForm.styleTone.trim() ? `Tôi muốn văn phong nghiêng về ${basicForm.styleTone.trim()}.` : "",
  ].filter(Boolean);
  return lines.join("\n");
}

export function buildAutoDirectorRequestPayload(
  basicForm: NovelBasicFormState,
  idea: string,
  llm: AutoDirectorRequestLlmOptions,
  runMode: DirectorRunMode,
  workflowTaskId?: string,
) {
  const commercialTags = normalizeCommercialTags(basicForm.commercialTagsText);
  return {
    idea: idea.trim(),
    workflowTaskId: workflowTaskId || undefined,
    title: basicForm.title.trim() || undefined,
    description: basicForm.description.trim() || undefined,
    targetAudience: basicForm.targetAudience.trim() || undefined,
    bookSellingPoint: basicForm.bookSellingPoint.trim() || undefined,
    competingFeel: basicForm.competingFeel.trim() || undefined,
    first30ChapterPromise: basicForm.first30ChapterPromise.trim() || undefined,
    commercialTags: commercialTags.length > 0 ? commercialTags : undefined,
    genreId: basicForm.genreId || undefined,
    primaryStoryModeId: basicForm.primaryStoryModeId || undefined,
    secondaryStoryModeId: basicForm.secondaryStoryModeId || undefined,
    worldId: basicForm.worldId || undefined,
    writingMode: basicForm.writingMode,
    projectMode: basicForm.projectMode,
    narrativePov: basicForm.narrativePov,
    pacePreference: basicForm.pacePreference,
    styleTone: basicForm.styleTone.trim() || undefined,
    emotionIntensity: basicForm.emotionIntensity,
    aiFreedom: basicForm.aiFreedom,
    defaultChapterLength: basicForm.defaultChapterLength,
    estimatedChapterCount: basicForm.estimatedChapterCount,
    projectStatus: basicForm.projectStatus,
    storylineStatus: basicForm.storylineStatus,
    outlineStatus: basicForm.outlineStatus,
    resourceReadyScore: basicForm.resourceReadyScore,
    sourceNovelId: basicForm.sourceNovelId || undefined,
    sourceKnowledgeDocumentId: basicForm.sourceKnowledgeDocumentId || undefined,
    continuationBookAnalysisId: basicForm.continuationBookAnalysisId || undefined,
    continuationBookAnalysisSections: basicForm.continuationBookAnalysisSections.length > 0
      ? basicForm.continuationBookAnalysisSections
      : undefined,
    provider: llm.provider,
    model: llm.model,
    temperature: llm.temperature,
    runMode,
  };
}
