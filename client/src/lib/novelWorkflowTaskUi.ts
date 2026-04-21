import type { NovelAutoDirectorTaskSummary } from "@ai-novel/shared/types/novel";
import type { NovelWorkflowCheckpoint } from "@ai-novel/shared/types/novelWorkflow";
import type { TaskStatus } from "@ai-novel/shared/types/task";

export type WorkflowBadgeVariant = "default" | "outline" | "secondary" | "destructive";

type WorkflowTaskLike = {
  id: string;
  status: TaskStatus;
  checkpointType?: NovelWorkflowCheckpoint | null;
};

export const LIVE_TASK_STATUSES = new Set<TaskStatus>(["queued", "running", "waiting_approval"]);
export const BACKGROUND_RUNNING_TASK_STATUSES = new Set<TaskStatus>(["running"]);

export function formatWorkflowCheckpoint(checkpoint?: NovelWorkflowCheckpoint | null): string {
  if (checkpoint === "candidate_selection_required") {
    return "Chờ xác nhận hướng đi của cả cuốn";
  }
  if (checkpoint === "book_contract_ready") {
    return "Bộ khung cuốn sách đã sẵn sàng";
  }
  if (checkpoint === "character_setup_required") {
    return "Phần nhân vật chờ duyệt";
  }
  if (checkpoint === "volume_strategy_ready") {
    return "Chiến lược từng quyển chờ duyệt";
  }
  if (checkpoint === "front10_ready") {
    return "Đã sẵn sàng triển khai 10 chương đầu";
  }
  if (checkpoint === "chapter_batch_ready") {
    return "Tự động triển khai 10 chương đầu đã tạm dừng";
  }
  if (checkpoint === "replan_required") {
    return "Chờ lập lại kế hoạch";
  }
  if (checkpoint === "workflow_completed") {
    return "Quy trình tự động đã hoàn tất";
  }
  return "Tự động đạo diễn";
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
      label: displayStatus ?? "Đang tự động triển khai 10 chương đầu",
      variant: "default",
    };
  }
  if ((task.status === "failed" || task.status === "cancelled") && task.checkpointType === "chapter_batch_ready") {
    return {
      label: displayStatus ?? (task.status === "failed" ? "Tự động triển khai 10 chương đầu đã tạm dừng" : "Tự động triển khai 10 chương đầu đã hủy"),
      variant: task.status === "failed" ? "destructive" : "outline",
    };
  }
  if (task.status === "waiting_approval") {
    return {
      label: displayStatus ?? formatWorkflowCheckpoint(task.checkpointType),
      variant: "secondary",
    };
  }
  if (task.status === "running") {
    return {
      label: displayStatus ?? "Đang tự động đạo diễn",
      variant: "default",
    };
  }
  if (task.status === "queued") {
    return {
      label: displayStatus ?? "Tự động đạo diễn đang xếp hàng",
      variant: "secondary",
    };
  }
  if (task.status === "failed") {
    return {
      label: displayStatus ?? "Tự động đạo diễn thất bại",
      variant: "destructive",
    };
  }
  if (task.status === "cancelled") {
    return {
      label: displayStatus ?? "Tự động đạo diễn đã hủy",
      variant: "outline",
    };
  }
  return {
    label: displayStatus ?? (task.checkpointType === "workflow_completed" ? "Tự động đạo diễn đã hoàn tất" : formatWorkflowCheckpoint(task.checkpointType)),
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
    return `AI đang chạy nền để triển khai tiếp 10 chương đầu, tiến độ hiện tại ${Math.round(task.progress * 100)}%.`;
  }
  if ((task.status === "failed" || task.status === "cancelled") && task.checkpointType === "chapter_batch_ready") {
    return "Tự động triển khai 10 chương đầu đã tạm dừng ở giai đoạn theo lô, bạn nên xem lại nhiệm vụ rồi hãy quyết định có chạy tiếp hay không.";
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
    return `Đề xuất tiếp tục: ${task.resumeAction.trim()}`;
  }
  if (task.nextActionLabel?.trim()) {
    return `Bước tiếp theo: ${task.nextActionLabel.trim()}`;
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
