import type { NovelAutoDirectorTaskSummary } from "@ai-novel/shared/types/novel";
import type { NovelWorkflowCheckpoint } from "@ai-novel/shared/types/novelWorkflow";
import type { TaskStatus } from "@ai-novel/shared/types/task";
import type { TranslateFn } from "@/i18n";

export type WorkflowBadgeVariant = "default" | "outline" | "secondary" | "destructive";

type WorkflowTaskLike = {
  id: string;
  status: TaskStatus;
  checkpointType?: NovelWorkflowCheckpoint | null;
};

export const LIVE_TASK_STATUSES = new Set<TaskStatus>(["queued", "running", "waiting_approval"]);
export const BACKGROUND_RUNNING_TASK_STATUSES = new Set<TaskStatus>(["running"]);

export function formatWorkflowCheckpoint(t: TranslateFn, checkpoint?: NovelWorkflowCheckpoint | null): string {
  if (checkpoint === "candidate_selection_required") {
    return t("workflow.checkpoint.candidate_selection_required");
  }
  if (checkpoint === "book_contract_ready") {
    return t("workflow.checkpoint.book_contract_ready");
  }
  if (checkpoint === "character_setup_required") {
    return t("workflow.checkpoint.character_setup_required");
  }
  if (checkpoint === "volume_strategy_ready") {
    return t("workflow.checkpoint.volume_strategy_ready");
  }
  if (checkpoint === "front10_ready") {
    return t("workflow.checkpoint.front10_ready");
  }
  if (checkpoint === "chapter_batch_ready") {
    return t("workflow.checkpoint.chapter_batch_ready");
  }
  if (checkpoint === "replan_required") {
    return t("workflow.checkpoint.replan_required");
  }
  if (checkpoint === "workflow_completed") {
    return t("workflow.checkpoint.workflow_completed");
  }
  return t("workflow.checkpoint.default");
}

export function getWorkflowBadge(t: TranslateFn, task?: NovelAutoDirectorTaskSummary | null): {
  label: string;
  variant: WorkflowBadgeVariant;
} | null {
  if (!task) {
    return null;
  }
  const displayStatus = task.displayStatus?.trim() || null;
  if (
    (task.status === "queued" || task.status === "running")
    && (task.checkpointType === "front10_ready" || task.checkpointType === "chapter_batch_ready")
  ) {
    return {
      label: displayStatus ?? t("workflow.badge.front10Running"),
      variant: "default",
    };
  }
  if ((task.status === "failed" || task.status === "cancelled") && task.checkpointType === "chapter_batch_ready") {
    return {
      label: displayStatus ?? (task.status === "failed"
        ? t("workflow.badge.front10Paused")
        : t("workflow.badge.front10Cancelled")),
      variant: task.status === "failed" ? "destructive" : "outline",
    };
  }
  if (task.status === "waiting_approval") {
    return {
      label: displayStatus ?? formatWorkflowCheckpoint(t, task.checkpointType),
      variant: "secondary",
    };
  }
  if (task.status === "running") {
    return {
      label: displayStatus ?? t("workflow.badge.running"),
      variant: "default",
    };
  }
  if (task.status === "queued") {
    return {
      label: displayStatus ?? t("workflow.badge.queued"),
      variant: "secondary",
    };
  }
  if (task.status === "failed") {
    return {
      label: displayStatus ?? t("workflow.badge.failed"),
      variant: "destructive",
    };
  }
  if (task.status === "cancelled") {
    return {
      label: displayStatus ?? t("workflow.badge.cancelled"),
      variant: "outline",
    };
  }
  return {
    label: displayStatus ?? (task.checkpointType === "workflow_completed"
      ? t("workflow.badge.completed")
      : formatWorkflowCheckpoint(t, task.checkpointType)),
    variant: "outline",
  };
}

export function getWorkflowDescription(t: TranslateFn, task?: NovelAutoDirectorTaskSummary | null): string | null {
  if (!task) {
    return null;
  }
  if (
    (task.status === "queued" || task.status === "running")
    && (task.checkpointType === "front10_ready" || task.checkpointType === "chapter_batch_ready")
  ) {
    return t("workflow.description.front10Running", { value: Math.round(task.progress * 100) });
  }
  if ((task.status === "failed" || task.status === "cancelled") && task.checkpointType === "chapter_batch_ready") {
    return t("workflow.description.front10Paused");
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
    return t("workflow.description.resume", { value: task.resumeAction.trim() });
  }
  if (task.nextActionLabel?.trim()) {
    return t("workflow.description.nextAction", { value: task.nextActionLabel.trim() });
  }
  return null;
}

export function canContinueDirector(task?: NovelAutoDirectorTaskSummary | null): boolean {
  return Boolean(
    task
      && task.status === "waiting_approval"
      && task.checkpointType !== "candidate_selection_required"
      && task.checkpointType !== "front10_ready"
      && task.checkpointType !== "chapter_batch_ready",
  );
}

export function requiresCandidateSelection(task?: Pick<WorkflowTaskLike, "status" | "checkpointType"> | null): boolean {
  return Boolean(task && task.status === "waiting_approval" && task.checkpointType === "candidate_selection_required");
}

export function canContinueFront10AutoExecution(task?: NovelAutoDirectorTaskSummary | null): boolean {
  if (!task) {
    return false;
  }
  if (task.status === "waiting_approval" && task.checkpointType === "front10_ready") {
    return true;
  }
  if (task.status === "waiting_approval" && task.checkpointType === "chapter_batch_ready") {
    return true;
  }
  return (task.status === "failed" || task.status === "cancelled") && task.checkpointType === "chapter_batch_ready";
}

export function canEnterChapterExecution(task?: NovelAutoDirectorTaskSummary | null): boolean {
  return Boolean(
    task
      && (task.checkpointType === "front10_ready"
        || task.checkpointType === "chapter_batch_ready"
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
