import type {
  AutoDirectorAction,
} from "@ai-novel/shared/types/autoDirectorFollowUp";
import type { TaskKind, TaskStatus } from "@ai-novel/shared/types/task";
import type {
  NovelWorkflowMilestoneType,
  NovelWorkflowResumeTarget,
} from "@ai-novel/shared/types/novelWorkflow";

type Translator = (key: string, values?: Record<string, string | number | undefined | null>) => string;

export const ACTIVE_STATUSES = new Set<TaskStatus>(["queued", "running", "waiting_approval"]);
export const ANOMALY_STATUSES = new Set<TaskStatus>(["failed", "cancelled"]);
export const ARCHIVABLE_STATUSES = new Set<TaskStatus>(["succeeded", "failed", "cancelled"]);

export type TaskSortMode = "default" | "updated_desc" | "updated_asc" | "heartbeat_desc" | "heartbeat_asc";

export function getTaskListPriority(status: TaskStatus): number {
  return status === "failed" ? 0 : 1;
}

export function getTimestamp(value: string | null | undefined): number {
  if (!value) {
    return Number.NaN;
  }
  return new Date(value).getTime();
}

export function formatDate(t: Translator, value: string | null | undefined): string {
  if (!value) {
    return t("tasks.common.none");
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return t("tasks.common.none");
  }
  return date.toLocaleString();
}

export function formatTokenCount(value: number | null | undefined): string {
  return new Intl.NumberFormat("zh-CN").format(Math.max(0, Math.round(value ?? 0)));
}

export function formatKind(t: Translator, kind: TaskKind): string {
  if (kind === "book_analysis") {
    return t("tasks.kind.bookAnalysis");
  }
  if (kind === "novel_workflow") {
    return t("tasks.kind.novelWorkflow");
  }
  if (kind === "novel_pipeline") {
    return t("tasks.kind.novelPipeline");
  }
  if (kind === "knowledge_document") {
    return t("tasks.kind.knowledgeDocument");
  }
  if (kind === "style_extraction") {
    return t("tasks.kind.styleExtraction");
  }
  if (kind === "agent_run") {
    return t("tasks.kind.agentRun");
  }
  return t("tasks.kind.imageGeneration");
}

export function formatCheckpoint(
  t: Translator,
  checkpoint: NovelWorkflowMilestoneType | null | undefined,
  scopeLabel?: string | null,
): string {
  const resolvedScopeLabel = scopeLabel?.trim() || t("tasks.checkpoint.fallbackScope");
  if (checkpoint === "rewrite_snapshot_created") {
    return t("tasks.checkpoint.rewriteSnapshotCreated");
  }
  if (checkpoint === "candidate_selection_required") {
    return t("tasks.checkpoint.candidateSelectionRequired");
  }
  if (checkpoint === "book_contract_ready") {
    return t("tasks.checkpoint.bookContractReady");
  }
  if (checkpoint === "character_setup_required") {
    return t("tasks.checkpoint.characterSetupRequired");
  }
  if (checkpoint === "volume_strategy_ready") {
    return t("tasks.checkpoint.volumeStrategyReady");
  }
  if (checkpoint === "chapter_batch_ready") {
    return t("tasks.checkpoint.chapterBatchReady", { scope: resolvedScopeLabel });
  }
  if (checkpoint === "replan_required") {
    return t("tasks.checkpoint.replanRequired");
  }
  if (checkpoint === "workflow_completed") {
    return t("tasks.checkpoint.workflowCompleted");
  }
  return t("tasks.common.none");
}

export function formatResumeTarget(t: Translator, target: NovelWorkflowResumeTarget | null | undefined): string {
  if (!target) {
    return t("tasks.common.none");
  }
  if (target.route === "/novels/create") {
    return target.mode === "director" ? t("tasks.resumeTarget.createDirector") : t("tasks.resumeTarget.create");
  }
  if (target.stage === "story_macro") {
    return t("tasks.resumeTarget.storyMacro");
  }
  if (target.stage === "character") {
    return t("tasks.resumeTarget.character");
  }
  if (target.stage === "outline") {
    return t("tasks.resumeTarget.outline");
  }
  if (target.stage === "structured") {
    return t("tasks.resumeTarget.structured");
  }
  if (target.stage === "chapter") {
    return t("tasks.resumeTarget.chapter");
  }
  if (target.stage === "pipeline") {
    return t("tasks.resumeTarget.pipeline");
  }
  return t("tasks.resumeTarget.default");
}

export function formatStatus(t: Translator, status: TaskStatus): string {
  if (status === "queued") {
    return t("tasks.status.queued");
  }
  if (status === "running") {
    return t("tasks.status.running");
  }
  if (status === "waiting_approval") {
    return t("tasks.status.waitingApproval");
  }
  if (status === "succeeded") {
    return t("tasks.status.succeeded");
  }
  if (status === "failed") {
    return t("tasks.status.failed");
  }
  return t("tasks.status.cancelled");
}

export function toStatusVariant(status: TaskStatus): "default" | "outline" | "secondary" | "destructive" {
  if (status === "running") {
    return "default";
  }
  if (status === "waiting_approval") {
    return "secondary";
  }
  if (status === "queued") {
    return "secondary";
  }
  if (status === "failed") {
    return "destructive";
  }
  return "outline";
}

export function serializeListParams(input: {
  kind: TaskKind | "";
  status: TaskStatus | "";
  keyword: string;
}): string {
  return JSON.stringify({
    kind: input.kind || null,
    status: input.status || null,
    keyword: input.keyword.trim() || null,
  });
}

export function createIdempotencyKey(taskId: string, actionCode: string): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `${taskId}:${actionCode}:${globalThis.crypto.randomUUID()}`;
  }
  return `${taskId}:${actionCode}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

export function formatFollowUpPriority(t: Translator, priority: "P0" | "P1" | "P2"): string {
  if (priority === "P0") {
    return t("tasks.followUpPriority.p0");
  }
  if (priority === "P1") {
    return t("tasks.followUpPriority.p1");
  }
  return t("tasks.followUpPriority.p2");
}

export function followUpActionVariant(action: AutoDirectorAction): "default" | "outline" {
  return action.kind === "navigation" || action.riskLevel !== "low" ? "outline" : "default";
}
