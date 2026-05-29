import type { NovelAutoDirectorTaskSummary } from "@ai-novel/shared/types/novel";
import type { NovelWorkflowCheckpoint } from "@ai-novel/shared/types/novelWorkflow";
import type { TaskStatus } from "@ai-novel/shared/types/task";
import type { TranslateValues } from "@/i18n";

type Translator = (key: string, values?: TranslateValues) => string;

export type WorkflowBadgeVariant = "default" | "outline" | "secondary" | "destructive";

type WorkflowTaskLike = {
  id: string;
  status: TaskStatus;
  checkpointType?: NovelWorkflowCheckpoint | null;
  executionScopeLabel?: string | null;
  pendingManualRecovery?: boolean | null;
};

export const LIVE_TASK_STATUSES = new Set<TaskStatus>(["queued", "running", "waiting_approval"]);
export const BACKGROUND_RUNNING_TASK_STATUSES = new Set<TaskStatus>(["running"]);

function getExecutionScopeLabel(scopeLabel: string | null | undefined, t: Translator): string {
  return scopeLabel?.trim() || t("lib.novelWorkflowTaskUi.defaultScopeLabel");
}

function buildAutoExecutionRunningLabel(scopeLabel: string | null | undefined, t: Translator): string {
  return t("lib.novelWorkflowTaskUi.autoExecutionRunning", {
    scope: getExecutionScopeLabel(scopeLabel, t),
  });
}

function buildAutoExecutionPausedLabel(scopeLabel: string | null | undefined, t: Translator): string {
  return t("lib.novelWorkflowTaskUi.autoExecutionPaused", {
    scope: getExecutionScopeLabel(scopeLabel, t),
  });
}

function buildAutoExecutionCancelledLabel(scopeLabel: string | null | undefined, t: Translator): string {
  return t("lib.novelWorkflowTaskUi.autoExecutionCancelled", {
    scope: getExecutionScopeLabel(scopeLabel, t),
  });
}

export function formatWorkflowCheckpoint(
  checkpoint: NovelWorkflowCheckpoint | null | undefined,
  scopeLabel: string | null | undefined,
  t: Translator,
): string {
  if (checkpoint === "candidate_selection_required") {
    return t("lib.novelWorkflowTaskUi.checkpoints.candidateSelectionRequired");
  }
  if (checkpoint === "book_contract_ready") {
    return t("lib.novelWorkflowTaskUi.checkpoints.bookContractReady");
  }
  if (checkpoint === "character_setup_required") {
    return t("lib.novelWorkflowTaskUi.checkpoints.characterSetupRequired");
  }
  if (checkpoint === "volume_strategy_ready") {
    return t("lib.novelWorkflowTaskUi.checkpoints.volumeStrategyReady");
  }
  if (checkpoint === "chapter_batch_ready") {
    return buildAutoExecutionPausedLabel(scopeLabel, t);
  }
  if (checkpoint === "replan_required") {
    return t("lib.novelWorkflowTaskUi.checkpoints.replanRequired");
  }
  if (checkpoint === "workflow_completed") {
    return t("lib.novelWorkflowTaskUi.checkpoints.workflowCompleted");
  }
  return t("lib.novelWorkflowTaskUi.checkpoints.fallback");
}

export function getWorkflowBadge(
  task: NovelAutoDirectorTaskSummary | null | undefined,
  t: Translator,
): {
  label: string;
  variant: WorkflowBadgeVariant;
} | null {
  if (!task) {
    return null;
  }
  const displayStatus = task.displayStatus?.trim() || null;
  if (
    (task.status === "queued" || task.status === "running")
    && task.checkpointType === "chapter_batch_ready"
  ) {
    return {
      label: displayStatus ?? buildAutoExecutionRunningLabel(task.executionScopeLabel, t),
      variant: "default",
    };
  }
  if ((task.status === "failed" || task.status === "cancelled") && task.checkpointType === "chapter_batch_ready") {
    return {
      label: displayStatus ?? (task.status === "failed"
        ? buildAutoExecutionPausedLabel(task.executionScopeLabel, t)
        : buildAutoExecutionCancelledLabel(task.executionScopeLabel, t)),
      variant: task.status === "failed" ? "destructive" : "outline",
    };
  }
  if (task.status === "waiting_approval") {
    return {
      label: displayStatus ?? formatWorkflowCheckpoint(task.checkpointType, task.executionScopeLabel, t),
      variant: "secondary",
    };
  }
  if (task.status === "running") {
    return {
      label: displayStatus ?? t("lib.novelWorkflowTaskUi.statuses.running"),
      variant: "default",
    };
  }
  if (task.status === "queued") {
    return {
      label: displayStatus ?? t("lib.novelWorkflowTaskUi.statuses.queued"),
      variant: "secondary",
    };
  }
  if (task.status === "failed") {
    return {
      label: displayStatus ?? t("lib.novelWorkflowTaskUi.statuses.failed"),
      variant: "destructive",
    };
  }
  if (task.status === "cancelled") {
    return {
      label: displayStatus ?? t("lib.novelWorkflowTaskUi.statuses.cancelled"),
      variant: "outline",
    };
  }
  return {
    label: displayStatus ?? (task.checkpointType === "workflow_completed"
      ? t("lib.novelWorkflowTaskUi.checkpoints.workflowCompleted")
      : formatWorkflowCheckpoint(task.checkpointType, task.executionScopeLabel, t)),
    variant: "outline",
  };
}

export function getWorkflowDescription(
  task: NovelAutoDirectorTaskSummary | null | undefined,
  t: Translator,
): string | null {
  if (!task) {
    return null;
  }
  if (
    (task.status === "queued" || task.status === "running")
    && task.checkpointType === "chapter_batch_ready"
  ) {
    return t("lib.novelWorkflowTaskUi.description.autoRunning", {
      scope: getExecutionScopeLabel(task.executionScopeLabel, t),
      percent: Math.round(task.progress * 100),
    });
  }
  if ((task.status === "failed" || task.status === "cancelled") && task.checkpointType === "chapter_batch_ready") {
    return t("lib.novelWorkflowTaskUi.description.autoPaused", {
      scope: getExecutionScopeLabel(task.executionScopeLabel, t),
    });
  }
  if (task.blockingReason?.trim()) {
    return task.blockingReason.trim();
  }
  if (task.checkpointSummary?.trim()) {
    return task.checkpointSummary.trim();
  }
  if (task.currentItemLabel?.trim()) {
    return task.currentItemLabel.trim();
  }
  if (task.resumeAction?.trim()) {
    return t("lib.novelWorkflowTaskUi.description.resumeSuggestion", { label: task.resumeAction.trim() });
  }
  if (task.nextActionLabel?.trim()) {
    return t("lib.novelWorkflowTaskUi.description.nextAction", { label: task.nextActionLabel.trim() });
  }
  return null;
}

export function canContinueDirector(task?: NovelAutoDirectorTaskSummary | null): boolean {
  return Boolean(
    task
      && task.status === "waiting_approval"
      && task.checkpointType !== "candidate_selection_required"
      && task.checkpointType !== "chapter_batch_ready",
  );
}

export function canCancelDirectorTask(
  task?: Pick<WorkflowTaskLike, "status" | "pendingManualRecovery"> | null,
): boolean {
  if (!task) {
    return false;
  }
  if (task.pendingManualRecovery) {
    return true;
  }
  return task.status === "queued"
    || task.status === "running"
    || task.status === "waiting_approval"
    || task.status === "failed";
}

export function requiresCandidateSelection(task?: Pick<WorkflowTaskLike, "status" | "checkpointType"> | null): boolean {
  return Boolean(task && task.status === "waiting_approval" && task.checkpointType === "candidate_selection_required");
}

export function canContinueChapterBatchAutoExecution(task?: NovelAutoDirectorTaskSummary | null): boolean {
  if (!task) {
    return false;
  }
  return (task.status === "failed" || task.status === "cancelled") && task.checkpointType === "chapter_batch_ready";
}

export function canEnterChapterExecution(task?: NovelAutoDirectorTaskSummary | null): boolean {
  return Boolean(
    task
      && (task.checkpointType === "chapter_batch_ready"
        || task.checkpointType === "workflow_completed"),
  );
}

export function isLiveWorkflowTask(task?: NovelAutoDirectorTaskSummary | null): boolean {
  return Boolean(task && LIVE_TASK_STATUSES.has(task.status));
}

export function isWorkflowRunningInBackground(task?: NovelAutoDirectorTaskSummary | null): boolean {
  return Boolean(task && BACKGROUND_RUNNING_TASK_STATUSES.has(task.status));
}

export function isWorkflowActionRequired(task?: NovelAutoDirectorTaskSummary | null): boolean {
  return Boolean(
    task
      && (task.status === "waiting_approval"
        || task.status === "failed"
        || task.status === "cancelled"),
  );
}

export function getTaskCenterLink(taskId: string): string {
  return `/tasks?kind=novel_workflow&id=${taskId}`;
}

export function getCandidateSelectionLink(taskId: string): string {
  const searchParams = new URLSearchParams();
  searchParams.set("workflowTaskId", taskId);
  searchParams.set("mode", "director");
  return `/novels/create?${searchParams.toString()}`;
}
