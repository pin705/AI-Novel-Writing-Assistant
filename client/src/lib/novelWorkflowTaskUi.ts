import type { NovelAutoDirectorTaskSummary } from "@ai-novel/shared/types/novel";
import type { NovelWorkflowCheckpoint } from "@ai-novel/shared/types/novelWorkflow";
import type { TaskStatus } from "@ai-novel/shared/types/task";
import { t } from "@/i18n";


export type WorkflowBadgeVariant = "default" | "outline" | "secondary" | "destructive";

type WorkflowTaskLike = {
  id: string;
  status: TaskStatus;
  checkpointType?: NovelWorkflowCheckpoint | null;
  executionScopeLabel?: string | null;
};

export const LIVE_TASK_STATUSES = new Set<TaskStatus>(["queued", "running", "waiting_approval"]);
export const BACKGROUND_RUNNING_TASK_STATUSES = new Set<TaskStatus>(["running"]);

function getExecutionScopeLabel(scopeLabel?: string | null, fallback = t("前 10 章")): string {
  return scopeLabel?.trim() || fallback;
}

function buildAutoExecutionRunningLabel(scopeLabel?: string | null): string {
  return t("{{scopeLabel}}自动执行中", { scopeLabel: getExecutionScopeLabel(scopeLabel) });
}

function buildAutoExecutionPausedLabel(scopeLabel?: string | null): string {
  return t("{{scopeLabel}}自动执行已暂停", { scopeLabel: getExecutionScopeLabel(scopeLabel) });
}

function buildAutoExecutionCancelledLabel(scopeLabel?: string | null): string {
  return t("{{scopeLabel}}自动执行已取消", { scopeLabel: getExecutionScopeLabel(scopeLabel) });
}

export function formatWorkflowCheckpoint(checkpoint?: NovelWorkflowCheckpoint | null, scopeLabel?: string | null): string {
  if (checkpoint === "candidate_selection_required") {
    return t("等待确认书级方向");
  }
  if (checkpoint === "book_contract_ready") {
    return t("Book Contract 已就绪");
  }
  if (checkpoint === "character_setup_required") {
    return t("角色准备待审核");
  }
  if (checkpoint === "volume_strategy_ready") {
    return t("卷战略待审核");
  }
  if (checkpoint === "front10_ready") {
    return t("{{scopeLabel}}可开写", { scopeLabel: getExecutionScopeLabel(scopeLabel) });
  }
  if (checkpoint === "chapter_batch_ready") {
    return buildAutoExecutionPausedLabel(scopeLabel);
  }
  if (checkpoint === "replan_required") {
    return t("等待重规划");
  }
  if (checkpoint === "workflow_completed") {
    return t("自动导演已完成");
  }
  return t("自动导演");
}

export function getWorkflowBadge(task?: NovelAutoDirectorTaskSummary | null): {
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
      label: displayStatus ?? buildAutoExecutionRunningLabel(task.executionScopeLabel),
      variant: "default",
    };
  }
  if ((task.status === "failed" || task.status === "cancelled") && task.checkpointType === "chapter_batch_ready") {
    return {
      label: displayStatus ?? (task.status === "failed"
        ? buildAutoExecutionPausedLabel(task.executionScopeLabel)
        : buildAutoExecutionCancelledLabel(task.executionScopeLabel)),
      variant: task.status === "failed" ? "destructive" : "outline",
    };
  }
  if (task.status === "waiting_approval") {
    return {
      label: displayStatus ?? formatWorkflowCheckpoint(task.checkpointType, task.executionScopeLabel),
      variant: "secondary",
    };
  }
  if (task.status === "running") {
    return {
      label: displayStatus ?? t("自动导演进行中"),
      variant: "default",
    };
  }
  if (task.status === "queued") {
    return {
      label: displayStatus ?? t("自动导演排队中"),
      variant: "secondary",
    };
  }
  if (task.status === "failed") {
    return {
      label: displayStatus ?? t("自动导演失败"),
      variant: "destructive",
    };
  }
  if (task.status === "cancelled") {
    return {
      label: displayStatus ?? t("自动导演已取消"),
      variant: "outline",
    };
  }
  return {
    label: displayStatus ?? (task.checkpointType === "workflow_completed"
      ? t("自动导演已完成")
      : formatWorkflowCheckpoint(task.checkpointType, task.executionScopeLabel)),
    variant: "outline",
  };
}

export function getWorkflowDescription(task?: NovelAutoDirectorTaskSummary | null): string | null {
  if (!task) {
    return null;
  }
  if (
    (task.status === "queued" || task.status === "running")
    && (task.checkpointType === "front10_ready" || task.checkpointType === "chapter_batch_ready")
  ) {
    return t("AI 正在后台继续执行{{executionScopeLabel}}，当前进度 {{value}}%。", { executionScopeLabel: getExecutionScopeLabel(task.executionScopeLabel), value: Math.round(task.progress * 100) });
  }
  if ((task.status === "failed" || task.status === "cancelled") && task.checkpointType === "chapter_batch_ready") {
    return t("{{executionScopeLabel}}自动执行在批量阶段暂停了，建议先查看任务，再决定是否继续自动执行。", { executionScopeLabel: getExecutionScopeLabel(task.executionScopeLabel) });
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
    return t("推荐继续：{{trim}}", { trim: task.resumeAction.trim() });
  }
  if (task.nextActionLabel?.trim()) {
    return t("下一步：{{trim}}", { trim: task.nextActionLabel.trim() });
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
