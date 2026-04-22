import type { LLMProvider } from "@ai-novel/shared/types/llm";
import type {
  ChapterGenerationState,
  PipelineJobStatus,
  PipelineRunMode,
} from "@ai-novel/shared/types/novel";
import type {
  DirectorAutoExecutionPlan,
  DirectorAutoExecutionState,
} from "@ai-novel/shared/types/novelDirector";
import { getBackendMessage } from "../../../i18n";
import {
  buildPipelineBackgroundActivityLabels,
  parsePipelinePayload,
} from "../pipelineJobState";
import { buildPipelineExecutionControlPolicy } from "../production/ChapterExecutionStageRunner";
import {
  buildSkippableAutoExecutionReviewCheckpointSummary,
  isSkippableAutoExecutionReviewFailure,
} from "./novelDirectorAutoExecutionFailure";
export interface DirectorAutoExecutionRange {
  startOrder: number;
  endOrder: number;
  totalChapterCount: number;
  firstChapterId: string | null;
}

export interface DirectorAutoExecutionChapterRef {
  id: string;
  order: number;
  generationState?: ChapterGenerationState | null;
  chapterStatus?: "unplanned" | "pending_generation" | "generating" | "pending_review" | "needs_repair" | "completed" | null;
}

export function normalizeDirectorAutoExecutionPlan(
  plan: DirectorAutoExecutionPlan | null | undefined,
): DirectorAutoExecutionPlan {
  const autoReview = plan?.autoReview ?? true;
  const autoRepair = autoReview ? (plan?.autoRepair ?? true) : false;
  if (plan?.mode === "chapter_range") {
    const startOrder = Math.max(1, Math.round(plan.startOrder ?? 1));
    const endOrder = Math.max(startOrder, Math.round(plan.endOrder ?? startOrder));
    return {
      mode: "chapter_range",
      startOrder,
      endOrder,
      autoReview,
      autoRepair,
    };
  }
  if (plan?.mode === "volume") {
    return {
      mode: "volume",
      volumeOrder: Math.max(1, Math.round(plan.volumeOrder ?? 1)),
      autoReview,
      autoRepair,
    };
  }
  return {
    mode: "front10",
    autoReview,
    autoRepair,
  };
}

export function buildDirectorAutoExecutionScopeLabel(
  plan: DirectorAutoExecutionPlan | null | undefined,
  fallbackTotalChapterCount?: number | null,
  fallbackVolumeTitle?: string | null,
): string {
  const normalized = normalizeDirectorAutoExecutionPlan(plan);
  if (normalized.mode === "chapter_range") {
    if ((normalized.startOrder ?? 1) === (normalized.endOrder ?? 1)) {
      return getBackendMessage("director.scope.chapter_single", {
        chapterOrder: normalized.startOrder,
      });
    }
    return getBackendMessage("director.scope.chapter_range", {
      startOrder: normalized.startOrder,
      endOrder: normalized.endOrder,
    });
  }
  if (normalized.mode === "volume") {
    const volumeLabel = fallbackVolumeTitle?.trim() ? ` · ${fallbackVolumeTitle.trim()}` : "";
    return getBackendMessage("director.scope.volume", {
      volumeOrder: normalized.volumeOrder,
      volumeLabel,
    });
  }
  const chapterCount = Math.max(1, fallbackTotalChapterCount ?? 10);
  if (chapterCount === 10) {
    return getBackendMessage("workflow.scope.front10");
  }
  return getBackendMessage("director.scope.front_chapters", {
    chapterCount,
  });
}

export function buildDirectorAutoExecutionScopeLabelFromState(
  state: DirectorAutoExecutionState | null | undefined,
  fallbackTotalChapterCount?: number | null,
): string {
  if (state?.scopeLabel?.trim()) {
    return state.scopeLabel.trim();
  }
  return buildDirectorAutoExecutionScopeLabel(state, fallbackTotalChapterCount ?? state?.totalChapterCount ?? null, state?.volumeTitle);
}

export function resolveDirectorAutoExecutionRange(
  chapters: DirectorAutoExecutionChapterRef[],
  preferredChapterCount = 10,
): DirectorAutoExecutionRange | null {
  const selected = chapters
    .slice()
    .sort((left, right) => left.order - right.order)
    .slice(0, preferredChapterCount);
  if (selected.length === 0) {
    return null;
  }
  return {
    startOrder: selected[0].order,
    endOrder: selected[selected.length - 1].order,
    totalChapterCount: selected.length,
    firstChapterId: selected[0].id,
  };
}

export function resolveDirectorAutoExecutionRangeFromState(
  state: DirectorAutoExecutionState | null | undefined,
): DirectorAutoExecutionRange | null {
  if (
    !state?.enabled
    || typeof state.startOrder !== "number"
    || typeof state.endOrder !== "number"
  ) {
    return null;
  }
  return {
    startOrder: state.startOrder,
    endOrder: state.endOrder,
    totalChapterCount: Math.max(1, state.totalChapterCount ?? (state.endOrder - state.startOrder + 1)),
    firstChapterId: state.firstChapterId ?? null,
  };
}

function isDirectorAutoExecutionChapterCompleted(chapter: DirectorAutoExecutionChapterRef): boolean {
  return chapter.generationState === "approved"
    || chapter.generationState === "published"
    || chapter.chapterStatus === "completed";
}

function isDirectorAutoExecutionChapterProcessed(chapter: DirectorAutoExecutionChapterRef): boolean {
  if (isDirectorAutoExecutionChapterCompleted(chapter)) {
    return true;
  }
  if (chapter.chapterStatus === "needs_repair") {
    return false;
  }
  if (chapter.chapterStatus === "pending_review") {
    return true;
  }
  return chapter.generationState === "reviewed" || chapter.generationState === "repaired";
}

export function buildDirectorAutoExecutionState(input: {
  range: DirectorAutoExecutionRange;
  chapters: DirectorAutoExecutionChapterRef[];
  plan?: DirectorAutoExecutionPlan | null;
  scopeLabel?: string | null;
  volumeTitle?: string | null;
  preparedVolumeIds?: string[];
  pipelineJobId?: string | null;
  pipelineStatus?: PipelineJobStatus | null;
}): DirectorAutoExecutionState {
  const plan = normalizeDirectorAutoExecutionPlan(input.plan);
  const skippedChapterIds = new Set((input.plan as DirectorAutoExecutionState | null | undefined)?.skippedChapterIds ?? []);
  const skippedChapterOrders = new Set((input.plan as DirectorAutoExecutionState | null | undefined)?.skippedChapterOrders ?? []);
  const selected = input.chapters
    .filter((chapter) => chapter.order >= input.range.startOrder && chapter.order <= input.range.endOrder)
    .sort((left, right) => left.order - right.order);
  const skipped = selected.filter((chapter) => skippedChapterIds.has(chapter.id) || skippedChapterOrders.has(chapter.order));
  const actionable = selected.filter((chapter) => !skippedChapterIds.has(chapter.id) && !skippedChapterOrders.has(chapter.order));
  const completed = actionable.filter((chapter) => isDirectorAutoExecutionChapterProcessed(chapter));
  const remaining = actionable.filter((chapter) => !isDirectorAutoExecutionChapterProcessed(chapter));
  const totalChapterCount = selected.length > 0 ? selected.length : input.range.totalChapterCount;
  return {
    enabled: true,
    mode: plan.mode,
    autoReview: plan.autoReview ?? true,
    autoRepair: plan.autoReview === false ? false : (plan.autoRepair ?? true),
    scopeLabel: input.scopeLabel?.trim() || buildDirectorAutoExecutionScopeLabel(plan, totalChapterCount, input.volumeTitle),
    volumeOrder: plan.mode === "volume" ? plan.volumeOrder : undefined,
    volumeTitle: input.volumeTitle ?? null,
    preparedVolumeIds: input.preparedVolumeIds ?? [],
    skippedChapterIds: skipped.map((chapter) => chapter.id),
    skippedChapterOrders: skipped.map((chapter) => chapter.order),
    firstChapterId: selected[0]?.id ?? input.range.firstChapterId,
    startOrder: input.range.startOrder,
    endOrder: input.range.endOrder,
    totalChapterCount,
    completedChapterCount: completed.length + skipped.length,
    remainingChapterCount: remaining.length,
    remainingChapterIds: remaining.map((chapter) => chapter.id),
    remainingChapterOrders: remaining.map((chapter) => chapter.order),
    nextChapterId: remaining[0]?.id ?? null,
    nextChapterOrder: remaining[0]?.order ?? null,
    pipelineJobId: input.pipelineJobId ?? null,
    pipelineStatus: input.pipelineStatus ?? null,
  };
}

export function buildDirectorAutoExecutionPausedLabel(state: DirectorAutoExecutionState): string {
  return getBackendMessage("workflow.status.paused", {
    scopeLabel: buildDirectorAutoExecutionScopeLabelFromState(state),
  });
}

export function buildDirectorAutoExecutionPausedSummary(input: {
  scopeLabel: string;
  remainingChapterCount: number;
  nextChapterOrder?: number | null;
  failureMessage: string;
}): string {
  if (isSkippableAutoExecutionReviewFailure(input.failureMessage)) {
    return buildSkippableAutoExecutionReviewCheckpointSummary({
      scopeLabel: input.scopeLabel,
      autoExecution: {
        remainingChapterCount: input.remainingChapterCount,
        nextChapterOrder: input.nextChapterOrder ?? null,
      },
    });
  }
  const remainingSummary = input.remainingChapterCount > 0
    ? getBackendMessage("director.auto_execution.remaining_count", {
      remainingChapterCount: input.remainingChapterCount,
    })
    : getBackendMessage("director.auto_execution.remaining_none");
  const nextSummary = typeof input.nextChapterOrder === "number"
    ? getBackendMessage("director.auto_execution.next_chapter", {
      nextChapterOrder: input.nextChapterOrder,
    })
    : "";
  return getBackendMessage("director.auto_execution.paused_summary", {
    scopeLabel: input.scopeLabel,
    failureMessage: input.failureMessage,
    remainingSummary,
    nextSummary,
  });
}

export function buildDirectorAutoExecutionCompletedLabel(scopeLabel: string): string {
  return getBackendMessage("director.auto_execution.completed", { scopeLabel });
}

export function buildDirectorAutoExecutionCompletedSummary(input: {
  title: string;
  scopeLabel: string;
  autoReview?: boolean;
  autoRepair?: boolean;
}): string {
  const completedScope = input.scopeLabel;
  const title = input.title.trim() || getBackendMessage("director.default.current_project");
  if (input.autoReview === false) {
    return getBackendMessage("director.auto_execution.completed_summary.no_review", {
      title,
      scopeLabel: completedScope,
    });
  }
  if (input.autoRepair === false) {
    return getBackendMessage("director.auto_execution.completed_summary.review_only", {
      title,
      scopeLabel: completedScope,
    });
  }
  return getBackendMessage("director.auto_execution.completed_summary.review_and_repair", {
    title,
    scopeLabel: completedScope,
  });
}

export function buildDirectorAutoExecutionPipelineOptions(input: {
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
  workflowTaskId?: string;
  startOrder: number;
  endOrder: number;
  runMode?: PipelineRunMode;
  autoReview?: boolean;
  autoRepair?: boolean;
}) {
  const autoReview = input.autoReview ?? true;
  return {
    startOrder: input.startOrder,
    endOrder: input.endOrder,
    controlPolicy: buildPipelineExecutionControlPolicy("director_start"),
    maxRetries: 1,
    runMode: input.runMode ?? "fast",
    autoReview,
    autoRepair: autoReview ? (input.autoRepair ?? true) : false,
    skipCompleted: true,
    qualityThreshold: 75,
    repairMode: "light_repair" as const,
    provider: input.provider,
    model: input.model,
    temperature: input.temperature,
    workflowTaskId: input.workflowTaskId,
  };
}

export function resolveDirectorAutoExecutionWorkflowState(
  job: {
    progress: number;
    currentStage?: string | null;
    currentItemLabel?: string | null;
    payload?: string | null;
  },
  range: DirectorAutoExecutionRange,
  state?: DirectorAutoExecutionState | null,
): {
  stage: "chapter_execution" | "quality_repair";
  itemKey: "chapter_execution" | "quality_repair";
  itemLabel: string;
  progress: number;
} {
  const chapterLabel = job.currentItemLabel?.trim()
    ? ` · ${job.currentItemLabel.trim()}`
    : "";
  const backgroundLabels = buildPipelineBackgroundActivityLabels(parsePipelinePayload(job.payload).backgroundSync);
  const activityLabel = backgroundLabels.length > 0
    ? ` · ${backgroundLabels.join(" / ")}`
    : "";
  const scopeLabel = buildDirectorAutoExecutionScopeLabelFromState(state, range.totalChapterCount);
  if (job.currentStage === "reviewing") {
    return {
      stage: "quality_repair",
      itemKey: "quality_repair",
      itemLabel: getBackendMessage("director.auto_execution.item.reviewing", {
        scopeLabel,
        chapterLabel,
        activityLabel,
      }),
      progress: Number((0.965 + ((job.progress ?? 0) * 0.02)).toFixed(4)),
    };
  }
  if (job.currentStage === "repairing") {
    return {
      stage: "quality_repair",
      itemKey: "quality_repair",
      itemLabel: getBackendMessage("director.auto_execution.item.repairing", {
        scopeLabel,
        chapterLabel,
        activityLabel,
      }),
      progress: Number((0.975 + ((job.progress ?? 0) * 0.015)).toFixed(4)),
    };
  }
  return {
    stage: "chapter_execution",
    itemKey: "chapter_execution",
    itemLabel: getBackendMessage("director.auto_execution.item.executing", {
      scopeLabel,
      chapterLabel,
      activityLabel,
    }),
    progress: Number((0.93 + ((job.progress ?? 0) * 0.035)).toFixed(4)),
  };
}
