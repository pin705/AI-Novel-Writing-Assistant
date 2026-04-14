import type { BookAnalysisSectionKey } from "@ai-novel/shared/types/bookAnalysis";
import { formatCommercialTagsInput, normalizeCommercialTags } from "@ai-novel/shared/types/novelFraming";
import type { TranslateFn } from "@/i18n";

export interface NovelBasicFormState {
  title: string;
  description: string;
  targetAudience: string;
  bookSellingPoint: string;
  competingFeel: string;
  first30ChapterPromise: string;
  commercialTagsText: string;
  genreId: string;
  primaryStoryModeId: string;
  secondaryStoryModeId: string;
  worldId: string;
  status: "draft" | "published";
  writingMode: "original" | "continuation";
  projectMode: "ai_led" | "co_pilot" | "draft_mode" | "auto_pipeline";
  narrativePov: "first_person" | "third_person" | "mixed";
  pacePreference: "slow" | "balanced" | "fast";
  styleTone: string;
  emotionIntensity: "low" | "medium" | "high";
  aiFreedom: "low" | "medium" | "high";
  defaultChapterLength: number;
  estimatedChapterCount: number;
  projectStatus: "not_started" | "in_progress" | "completed" | "rework" | "blocked";
  storylineStatus: "not_started" | "in_progress" | "completed" | "rework" | "blocked";
  outlineStatus: "not_started" | "in_progress" | "completed" | "rework" | "blocked";
  resourceReadyScore: number;
  continuationSourceType: "novel" | "knowledge_document";
  sourceNovelId: string;
  sourceKnowledgeDocumentId: string;
  continuationBookAnalysisId: string;
  continuationBookAnalysisSections: BookAnalysisSectionKey[];
}

export interface BasicInfoOption<T extends string> {
  value: T;
  label: string;
  summary: string;
  recommended?: boolean;
}

export const DEFAULT_ESTIMATED_CHAPTER_COUNT = 80;

type TranslationKey = Parameters<TranslateFn>[0];
type BasicInfoFieldHintKey = keyof typeof BASIC_INFO_FIELD_HINT_KEYS;
type OptionDefinition<T extends string> = {
  value: T;
  labelKey: TranslationKey;
  summaryKey: TranslationKey;
  recommended?: boolean;
};

interface NovelBasicInfoI18nConfig {
  writingModeOptions: BasicInfoOption<NovelBasicFormState["writingMode"]>[];
  projectModeOptions: BasicInfoOption<NovelBasicFormState["projectMode"]>[];
  povOptions: BasicInfoOption<NovelBasicFormState["narrativePov"]>[];
  paceOptions: BasicInfoOption<NovelBasicFormState["pacePreference"]>[];
  emotionOptions: BasicInfoOption<NovelBasicFormState["emotionIntensity"]>[];
  aiFreedomOptions: BasicInfoOption<NovelBasicFormState["aiFreedom"]>[];
  publicationStatusOptions: BasicInfoOption<NovelBasicFormState["status"]>[];
  projectStatusOptions: Array<{ value: NovelBasicFormState["projectStatus"]; label: string }>;
  fieldHints: Record<BasicInfoFieldHintKey, string>;
}

const WRITING_MODE_OPTION_DEFINITIONS: OptionDefinition<NovelBasicFormState["writingMode"]>[] = [
  {
    value: "original",
    labelKey: "common.original",
    summaryKey: "novelCreate.option.writingMode.original.summary",
    recommended: true,
  },
  {
    value: "continuation",
    labelKey: "common.continuation",
    summaryKey: "novelCreate.option.writingMode.continuation.summary",
  },
];

const PROJECT_MODE_OPTION_DEFINITIONS: OptionDefinition<NovelBasicFormState["projectMode"]>[] = [
  {
    value: "co_pilot",
    labelKey: "novelCreate.option.projectMode.coPilot.label",
    summaryKey: "novelCreate.option.projectMode.coPilot.summary",
    recommended: true,
  },
  {
    value: "ai_led",
    labelKey: "novelCreate.option.projectMode.aiLed.label",
    summaryKey: "novelCreate.option.projectMode.aiLed.summary",
  },
  {
    value: "draft_mode",
    labelKey: "novelCreate.option.projectMode.draftMode.label",
    summaryKey: "novelCreate.option.projectMode.draftMode.summary",
  },
  {
    value: "auto_pipeline",
    labelKey: "novelCreate.option.projectMode.autoPipeline.label",
    summaryKey: "novelCreate.option.projectMode.autoPipeline.summary",
  },
];

const POV_OPTION_DEFINITIONS: OptionDefinition<NovelBasicFormState["narrativePov"]>[] = [
  {
    value: "third_person",
    labelKey: "novelCreate.option.pov.thirdPerson.label",
    summaryKey: "novelCreate.option.pov.thirdPerson.summary",
    recommended: true,
  },
  {
    value: "first_person",
    labelKey: "novelCreate.option.pov.firstPerson.label",
    summaryKey: "novelCreate.option.pov.firstPerson.summary",
  },
  {
    value: "mixed",
    labelKey: "novelCreate.option.pov.mixed.label",
    summaryKey: "novelCreate.option.pov.mixed.summary",
  },
];

const PACE_OPTION_DEFINITIONS: OptionDefinition<NovelBasicFormState["pacePreference"]>[] = [
  {
    value: "balanced",
    labelKey: "novelCreate.option.pace.balanced.label",
    summaryKey: "novelCreate.option.pace.balanced.summary",
    recommended: true,
  },
  {
    value: "slow",
    labelKey: "novelCreate.option.pace.slow.label",
    summaryKey: "novelCreate.option.pace.slow.summary",
  },
  {
    value: "fast",
    labelKey: "novelCreate.option.pace.fast.label",
    summaryKey: "novelCreate.option.pace.fast.summary",
  },
];

const EMOTION_OPTION_DEFINITIONS: OptionDefinition<NovelBasicFormState["emotionIntensity"]>[] = [
  {
    value: "medium",
    labelKey: "novelCreate.option.emotion.medium.label",
    summaryKey: "novelCreate.option.emotion.medium.summary",
    recommended: true,
  },
  {
    value: "low",
    labelKey: "novelCreate.option.emotion.low.label",
    summaryKey: "novelCreate.option.emotion.low.summary",
  },
  {
    value: "high",
    labelKey: "novelCreate.option.emotion.high.label",
    summaryKey: "novelCreate.option.emotion.high.summary",
  },
];

const AI_FREEDOM_OPTION_DEFINITIONS: OptionDefinition<NovelBasicFormState["aiFreedom"]>[] = [
  {
    value: "medium",
    labelKey: "novelCreate.option.aiFreedom.medium.label",
    summaryKey: "novelCreate.option.aiFreedom.medium.summary",
    recommended: true,
  },
  {
    value: "low",
    labelKey: "novelCreate.option.aiFreedom.low.label",
    summaryKey: "novelCreate.option.aiFreedom.low.summary",
  },
  {
    value: "high",
    labelKey: "novelCreate.option.aiFreedom.high.label",
    summaryKey: "novelCreate.option.aiFreedom.high.summary",
  },
];

const PUBLICATION_STATUS_OPTION_DEFINITIONS: OptionDefinition<NovelBasicFormState["status"]>[] = [
  {
    value: "draft",
    labelKey: "common.draft",
    summaryKey: "novelCreate.option.publicationStatus.draft.summary",
    recommended: true,
  },
  {
    value: "published",
    labelKey: "common.published",
    summaryKey: "novelCreate.option.publicationStatus.published.summary",
  },
];

const PROJECT_STATUS_OPTION_DEFINITIONS: Array<{
  value: NovelBasicFormState["projectStatus"];
  labelKey: TranslationKey;
}> = [
  { value: "not_started", labelKey: "common.progressStatus.notStarted" },
  { value: "in_progress", labelKey: "common.progressStatus.inProgress" },
  { value: "completed", labelKey: "common.progressStatus.completed" },
  { value: "rework", labelKey: "common.progressStatus.rework" },
  { value: "blocked", labelKey: "common.progressStatus.blocked" },
];

const BASIC_INFO_FIELD_HINT_KEYS = {
  writingMode: "novelCreate.fieldHint.writingMode",
  targetAudience: "novelCreate.fieldHint.targetAudience",
  bookSellingPoint: "novelCreate.fieldHint.bookSellingPoint",
  competingFeel: "novelCreate.fieldHint.competingFeel",
  first30ChapterPromise: "novelCreate.fieldHint.first30ChapterPromise",
  commercialTagsText: "novelCreate.fieldHint.commercialTagsText",
  projectMode: "novelCreate.fieldHint.projectMode",
  narrativePov: "novelCreate.fieldHint.narrativePov",
  pacePreference: "novelCreate.fieldHint.pacePreference",
  emotionIntensity: "novelCreate.fieldHint.emotionIntensity",
  aiFreedom: "novelCreate.fieldHint.aiFreedom",
  defaultChapterLength: "novelCreate.fieldHint.defaultChapterLength",
  estimatedChapterCount: "novelCreate.fieldHint.estimatedChapterCount",
  resourceReadyScore: "novelCreate.fieldHint.resourceReadyScore",
  styleTone: "novelCreate.fieldHint.styleTone",
  genreId: "novelCreate.fieldHint.genreId",
  primaryStoryModeId: "novelCreate.fieldHint.primaryStoryModeId",
  secondaryStoryModeId: "novelCreate.fieldHint.secondaryStoryModeId",
  worldId: "novelCreate.fieldHint.worldId",
  status: "novelCreate.fieldHint.status",
  continuationSourceType: "novelCreate.fieldHint.continuationSourceType",
  continuationBookAnalysis: "novelCreate.fieldHint.continuationBookAnalysis",
} as const satisfies Record<string, TranslationKey>;

function buildOptions<T extends string>(
  definitions: ReadonlyArray<OptionDefinition<T>>,
  t: TranslateFn,
): BasicInfoOption<T>[] {
  return definitions.map((definition) => ({
    value: definition.value,
    label: t(definition.labelKey),
    summary: t(definition.summaryKey),
    recommended: definition.recommended,
  }));
}

export function buildNovelBasicInfoI18n(t: TranslateFn): NovelBasicInfoI18nConfig {
  return {
    writingModeOptions: buildOptions(WRITING_MODE_OPTION_DEFINITIONS, t),
    projectModeOptions: buildOptions(PROJECT_MODE_OPTION_DEFINITIONS, t),
    povOptions: buildOptions(POV_OPTION_DEFINITIONS, t),
    paceOptions: buildOptions(PACE_OPTION_DEFINITIONS, t),
    emotionOptions: buildOptions(EMOTION_OPTION_DEFINITIONS, t),
    aiFreedomOptions: buildOptions(AI_FREEDOM_OPTION_DEFINITIONS, t),
    publicationStatusOptions: buildOptions(PUBLICATION_STATUS_OPTION_DEFINITIONS, t),
    projectStatusOptions: PROJECT_STATUS_OPTION_DEFINITIONS.map((definition) => ({
      value: definition.value,
      label: t(definition.labelKey),
    })),
    fieldHints: Object.fromEntries(
      Object.entries(BASIC_INFO_FIELD_HINT_KEYS).map(([key, value]) => [key, t(value)]),
    ) as Record<BasicInfoFieldHintKey, string>,
  };
}

export function createDefaultNovelBasicFormState(): NovelBasicFormState {
  return {
    title: "",
    description: "",
    targetAudience: "",
    bookSellingPoint: "",
    competingFeel: "",
    first30ChapterPromise: "",
    commercialTagsText: "",
    genreId: "",
    primaryStoryModeId: "",
    secondaryStoryModeId: "",
    worldId: "",
    status: "draft",
    writingMode: "original",
    projectMode: "co_pilot",
    narrativePov: "third_person",
    pacePreference: "balanced",
    styleTone: "",
    emotionIntensity: "medium",
    aiFreedom: "medium",
    defaultChapterLength: 2800,
    estimatedChapterCount: DEFAULT_ESTIMATED_CHAPTER_COUNT,
    projectStatus: "not_started",
    storylineStatus: "not_started",
    outlineStatus: "not_started",
    resourceReadyScore: 0,
    continuationSourceType: "novel",
    sourceNovelId: "",
    sourceKnowledgeDocumentId: "",
    continuationBookAnalysisId: "",
    continuationBookAnalysisSections: [],
  };
}

export function patchNovelBasicForm(
  previous: NovelBasicFormState,
  patch: Partial<NovelBasicFormState>,
): NovelBasicFormState {
  const next = { ...previous, ...patch };
  if (
    next.primaryStoryModeId
    && next.secondaryStoryModeId
    && next.primaryStoryModeId === next.secondaryStoryModeId
  ) {
    next.secondaryStoryModeId = "";
  }
  if (next.writingMode === "original") {
    next.sourceNovelId = "";
    next.sourceKnowledgeDocumentId = "";
    next.continuationBookAnalysisId = "";
    next.continuationBookAnalysisSections = [];
  } else if (next.continuationSourceType === "novel") {
    next.sourceKnowledgeDocumentId = "";
  } else if (next.continuationSourceType === "knowledge_document") {
    next.sourceNovelId = "";
  }
  if (
    patch.continuationSourceType !== undefined
    && patch.continuationSourceType !== previous.continuationSourceType
  ) {
    next.continuationBookAnalysisId = "";
    next.continuationBookAnalysisSections = [];
  }
  if (
    next.continuationSourceType === "novel"
    && patch.sourceNovelId !== undefined
    && patch.sourceNovelId !== previous.sourceNovelId
  ) {
    next.continuationBookAnalysisId = "";
    next.continuationBookAnalysisSections = [];
  }
  if (
    next.continuationSourceType === "knowledge_document"
    && patch.sourceKnowledgeDocumentId !== undefined
    && patch.sourceKnowledgeDocumentId !== previous.sourceKnowledgeDocumentId
  ) {
    next.continuationBookAnalysisId = "";
    next.continuationBookAnalysisSections = [];
  }
  if (patch.continuationBookAnalysisId !== undefined && !patch.continuationBookAnalysisId) {
    next.continuationBookAnalysisSections = [];
  }
  return next;
}

export function buildNovelCreatePayload(basicForm: NovelBasicFormState) {
  const commercialTags = normalizeCommercialTags(basicForm.commercialTagsText);
  return {
    title: basicForm.title.trim(),
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
    sourceNovelId: basicForm.writingMode === "continuation" && basicForm.continuationSourceType === "novel"
      ? (basicForm.sourceNovelId || undefined)
      : undefined,
    sourceKnowledgeDocumentId: basicForm.writingMode === "continuation" && basicForm.continuationSourceType === "knowledge_document"
      ? (basicForm.sourceKnowledgeDocumentId || undefined)
      : undefined,
    continuationBookAnalysisId: basicForm.writingMode === "continuation"
      && (
        (basicForm.continuationSourceType === "novel" && Boolean(basicForm.sourceNovelId))
        || (basicForm.continuationSourceType === "knowledge_document" && Boolean(basicForm.sourceKnowledgeDocumentId))
      )
      ? (basicForm.continuationBookAnalysisId || undefined)
      : undefined,
    continuationBookAnalysisSections:
      basicForm.writingMode === "continuation"
        && (
          (basicForm.continuationSourceType === "novel" && Boolean(basicForm.sourceNovelId))
          || (basicForm.continuationSourceType === "knowledge_document" && Boolean(basicForm.sourceKnowledgeDocumentId))
        )
        && basicForm.continuationBookAnalysisId
        ? (basicForm.continuationBookAnalysisSections.length > 0 ? basicForm.continuationBookAnalysisSections : undefined)
        : undefined,
  };
}

export function buildNovelUpdatePayload(basicForm: NovelBasicFormState) {
  const commercialTags = normalizeCommercialTags(basicForm.commercialTagsText);
  return {
    title: basicForm.title,
    description: basicForm.description,
    targetAudience: basicForm.targetAudience.trim() || null,
    bookSellingPoint: basicForm.bookSellingPoint.trim() || null,
    competingFeel: basicForm.competingFeel.trim() || null,
    first30ChapterPromise: basicForm.first30ChapterPromise.trim() || null,
    commercialTags: commercialTags.length > 0 ? commercialTags : null,
    genreId: basicForm.genreId || null,
    primaryStoryModeId: basicForm.primaryStoryModeId || null,
    secondaryStoryModeId: basicForm.secondaryStoryModeId || null,
    worldId: basicForm.worldId || null,
    status: basicForm.status,
    writingMode: basicForm.writingMode,
    projectMode: basicForm.projectMode,
    narrativePov: basicForm.narrativePov,
    pacePreference: basicForm.pacePreference,
    styleTone: basicForm.styleTone || null,
    emotionIntensity: basicForm.emotionIntensity,
    aiFreedom: basicForm.aiFreedom,
    defaultChapterLength: basicForm.defaultChapterLength,
    estimatedChapterCount: basicForm.estimatedChapterCount,
    projectStatus: basicForm.projectStatus,
    storylineStatus: basicForm.storylineStatus,
    outlineStatus: basicForm.outlineStatus,
    resourceReadyScore: basicForm.resourceReadyScore,
    sourceNovelId: basicForm.writingMode === "continuation" && basicForm.continuationSourceType === "novel"
      ? (basicForm.sourceNovelId || null)
      : null,
    sourceKnowledgeDocumentId: basicForm.writingMode === "continuation" && basicForm.continuationSourceType === "knowledge_document"
      ? (basicForm.sourceKnowledgeDocumentId || null)
      : null,
    continuationBookAnalysisId: basicForm.writingMode === "continuation"
      && (
        (basicForm.continuationSourceType === "novel" && Boolean(basicForm.sourceNovelId))
        || (basicForm.continuationSourceType === "knowledge_document" && Boolean(basicForm.sourceKnowledgeDocumentId))
      )
      ? (basicForm.continuationBookAnalysisId || null)
      : null,
    continuationBookAnalysisSections:
      basicForm.writingMode === "continuation"
        && (
          (basicForm.continuationSourceType === "novel" && Boolean(basicForm.sourceNovelId))
          || (basicForm.continuationSourceType === "knowledge_document" && Boolean(basicForm.sourceKnowledgeDocumentId))
        )
        && basicForm.continuationBookAnalysisId
        ? (basicForm.continuationBookAnalysisSections.length > 0 ? basicForm.continuationBookAnalysisSections : null)
        : null,
  };
}

export { formatCommercialTagsInput };
