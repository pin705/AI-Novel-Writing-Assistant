import type {
  NovelWorkflowCheckpoint,
  NovelWorkflowStage,
} from "@ai-novel/shared/types/novelWorkflow";
import type { TaskStatus } from "@ai-novel/shared/types/task";
import { getBackendMessage, type BackendMessageKey } from "../../i18n";
import { isAutoDirectorRecoveryInProgress } from "../novel/workflow/novelWorkflowRecoveryHeuristics";
import {
  getNovelWorkflowStageLabel,
  normalizeNovelWorkflowStage,
} from "../novel/workflow/novelWorkflow.shared";
import { normalizeFailureSummary } from "./taskSupport";

interface WorkflowExplainabilityInput {
  status: TaskStatus;
  currentStage?: string | null;
  currentItemKey?: string | null;
  checkpointType?: NovelWorkflowCheckpoint | null;
  lastError?: string | null;
  executionScopeLabel?: string | null;
}

export interface WorkflowExplainabilitySummary {
  displayStatus: string | null;
  blockingReason: string | null;
  resumeAction: string | null;
  lastHealthyStage: string | null;
}

const WORKFLOW_ITEM_STAGE_MAP: Partial<Record<string, NovelWorkflowStage>> = {
  project_setup: "project_setup",
  auto_director: "auto_director",
  candidate_seed_alignment: "auto_director",
  candidate_project_framing: "auto_director",
  candidate_direction_batch: "auto_director",
  candidate_title_pack: "auto_director",
  novel_create: "project_setup",
  book_contract: "story_macro",
  story_macro: "story_macro",
  constraint_engine: "story_macro",
  character_setup: "character_setup",
  character_cast_apply: "character_setup",
  volume_strategy: "volume_strategy",
  volume_skeleton: "volume_strategy",
  beat_sheet: "structured_outline",
  chapter_list: "structured_outline",
  chapter_sync: "structured_outline",
  chapter_detail_bundle: "structured_outline",
  structured_outline: "structured_outline",
  chapter_execution: "chapter_execution",
  quality_repair: "quality_repair",
};

const CHECKPOINT_DISPLAY_STATUS_KEYS: Record<NovelWorkflowCheckpoint, BackendMessageKey> = {
  candidate_selection_required: "workflow.display.candidate_selection_required",
  book_contract_ready: "workflow.display.book_contract_ready",
  character_setup_required: "workflow.display.character_setup_required",
  volume_strategy_ready: "workflow.display.volume_strategy_ready",
  front10_ready: "workflow.display.front10_ready",
  chapter_batch_ready: "workflow.display.chapter_batch_ready",
  replan_required: "workflow.display.replan_required",
  workflow_completed: "workflow.display.workflow_completed",
};

const CHECKPOINT_BLOCKING_REASON_KEYS: Record<NovelWorkflowCheckpoint, BackendMessageKey> = {
  candidate_selection_required: "workflow.reason.candidate_selection_required",
  book_contract_ready: "workflow.reason.book_contract_ready",
  character_setup_required: "workflow.reason.character_setup_required",
  volume_strategy_ready: "workflow.reason.volume_strategy_ready",
  front10_ready: "workflow.reason.front10_ready",
  chapter_batch_ready: "workflow.reason.chapter_batch_ready",
  replan_required: "workflow.reason.replan_required",
  workflow_completed: "workflow.reason.workflow_completed",
};

const CHECKPOINT_LAST_HEALTHY_STAGE: Record<NovelWorkflowCheckpoint, NovelWorkflowStage> = {
  candidate_selection_required: "auto_director",
  book_contract_ready: "story_macro",
  character_setup_required: "character_setup",
  volume_strategy_ready: "volume_strategy",
  front10_ready: "structured_outline",
  chapter_batch_ready: "chapter_execution",
  replan_required: "quality_repair",
  workflow_completed: "quality_repair",
};

function getExecutionScopeLabel(input: WorkflowExplainabilityInput): string {
  return input.executionScopeLabel?.trim() || getBackendMessage("workflow.scope.front10");
}

function buildAutoExecutionPreparedStatus(input: WorkflowExplainabilityInput): string {
  return getBackendMessage("workflow.status.prepared", { scopeLabel: getExecutionScopeLabel(input) });
}

function buildAutoExecutionRunningStatus(input: WorkflowExplainabilityInput): string {
  return getBackendMessage("workflow.status.running", { scopeLabel: getExecutionScopeLabel(input) });
}

function buildAutoExecutionPausedStatus(input: WorkflowExplainabilityInput): string {
  return getBackendMessage("workflow.status.paused", { scopeLabel: getExecutionScopeLabel(input) });
}

function buildAutoExecutionCancelledStatus(input: WorkflowExplainabilityInput): string {
  return getBackendMessage("workflow.status.cancelled", { scopeLabel: getExecutionScopeLabel(input) });
}

function buildAutoExecutionResumeAction(input: WorkflowExplainabilityInput): string {
  return getBackendMessage("workflow.action.resume_auto_execution", { scopeLabel: getExecutionScopeLabel(input) });
}

function buildAutoExecutionPreparedReason(input: WorkflowExplainabilityInput): string {
  const scopeLabel = getExecutionScopeLabel(input);
  return getBackendMessage("workflow.reason.prepared_scope", { scopeLabel });
}

function buildAutoExecutionPausedReason(input: WorkflowExplainabilityInput): string {
  return getBackendMessage("workflow.reason.paused_scope", { scopeLabel: getExecutionScopeLabel(input) });
}

function getStageLabel(stage: NovelWorkflowStage | null | undefined): string | null {
  return stage ? getNovelWorkflowStageLabel(stage) : null;
}

function getLastHealthyStage(input: WorkflowExplainabilityInput): string | null {
  if (input.checkpointType) {
    return getStageLabel(CHECKPOINT_LAST_HEALTHY_STAGE[input.checkpointType]);
  }
  const mappedStage = input.currentItemKey ? WORKFLOW_ITEM_STAGE_MAP[input.currentItemKey] : null;
  if (mappedStage) {
    return getStageLabel(mappedStage);
  }
  const normalizedCurrentStage = normalizeNovelWorkflowStage(input.currentStage);
  return normalizedCurrentStage
    ? getStageLabel(normalizedCurrentStage)
    : input.currentStage?.trim() || null;
}

function getCurrentStageLabel(input: WorkflowExplainabilityInput): string | null {
  const mappedStage = input.currentItemKey ? WORKFLOW_ITEM_STAGE_MAP[input.currentItemKey] : null;
  if (mappedStage) {
    return getStageLabel(mappedStage);
  }
  const normalizedCurrentStage = normalizeNovelWorkflowStage(input.currentStage);
  if (normalizedCurrentStage) {
    return getStageLabel(normalizedCurrentStage);
  }
  return input.currentStage?.trim() || null;
}

export function buildWorkflowResumeAction(
  status: TaskStatus,
  checkpointType: NovelWorkflowCheckpoint | null,
  executionScopeLabel?: string | null,
): string | null {
  const explainabilityInput = { status, checkpointType, executionScopeLabel } satisfies WorkflowExplainabilityInput;
  if (status === "waiting_approval") {
    if (checkpointType === "candidate_selection_required") {
      return getBackendMessage("workflow.action.candidate_selection_required");
    }
    if (checkpointType === "book_contract_ready") {
      return getBackendMessage("workflow.action.book_contract_ready");
    }
    if (checkpointType === "character_setup_required") {
      return getBackendMessage("workflow.action.character_setup_required");
    }
    if (checkpointType === "volume_strategy_ready") {
      return getBackendMessage("workflow.action.volume_strategy_ready");
    }
    if (checkpointType === "front10_ready") {
      return buildAutoExecutionResumeAction(explainabilityInput);
    }
    if (checkpointType === "chapter_batch_ready") {
      return buildAutoExecutionResumeAction(explainabilityInput);
    }
    if (checkpointType === "replan_required") {
      return getBackendMessage("workflow.action.replan_required");
    }
    if (checkpointType === "workflow_completed") {
      return getBackendMessage("workflow.action.enter_chapter_execution");
    }
    return getBackendMessage("workflow.action.continue_main_flow");
  }
  if (status === "failed" || status === "cancelled") {
    if (checkpointType === "front10_ready") {
      return buildAutoExecutionResumeAction(explainabilityInput);
    }
    if (checkpointType === "chapter_batch_ready") {
      return buildAutoExecutionResumeAction(explainabilityInput);
    }
    if (checkpointType === "workflow_completed") {
      return getBackendMessage("workflow.action.enter_chapter_execution");
    }
    return getBackendMessage("workflow.action.recover_from_checkpoint");
  }
  if (status === "running" || status === "queued") {
    return getBackendMessage("workflow.action.view_progress");
  }
  if (status === "succeeded" && checkpointType === "workflow_completed") {
    return getBackendMessage("workflow.action.enter_chapter_execution");
  }
  return null;
}

function buildDisplayStatus(input: WorkflowExplainabilityInput): string | null {
  if (isAutoDirectorRecoveryInProgress(input)) {
    const currentStageLabel = getCurrentStageLabel(input);
    return currentStageLabel
      ? getBackendMessage("workflow.display.recovery_in_progress", { stageLabel: currentStageLabel })
      : getBackendMessage("workflow.display.auto_director_recovering");
  }
  if (
    (input.status === "queued" || input.status === "running")
    && (input.checkpointType === "front10_ready" || input.checkpointType === "chapter_batch_ready")
  ) {
    return buildAutoExecutionRunningStatus(input);
  }
  if (input.status === "waiting_approval") {
    if (input.checkpointType === "front10_ready") {
      return buildAutoExecutionPreparedStatus(input);
    }
    if (input.checkpointType === "chapter_batch_ready") {
      return buildAutoExecutionPausedStatus(input);
    }
    return input.checkpointType
      ? getBackendMessage(CHECKPOINT_DISPLAY_STATUS_KEYS[input.checkpointType])
      : getBackendMessage("workflow.display.waiting_continue");
  }
  if (input.status === "running") {
    const currentStageLabel = getCurrentStageLabel(input);
    return currentStageLabel
      ? getBackendMessage("workflow.display.stage_running", { stageLabel: currentStageLabel })
      : getBackendMessage("workflow.display.auto_director_running");
  }
  if (input.status === "queued") {
    return getBackendMessage("workflow.display.auto_director_queued");
  }
  if (input.status === "failed") {
    if (input.checkpointType === "chapter_batch_ready") {
      return buildAutoExecutionPausedStatus(input);
    }
    return getBackendMessage("workflow.display.auto_director_failed");
  }
  if (input.status === "cancelled") {
    if (input.checkpointType === "chapter_batch_ready") {
      return buildAutoExecutionCancelledStatus(input);
    }
    return getBackendMessage("workflow.display.auto_director_cancelled");
  }
  if (input.checkpointType === "workflow_completed") {
    return getBackendMessage("workflow.display.auto_director_completed");
  }
  return input.status === "succeeded" ? getBackendMessage("workflow.display.main_flow_completed") : null;
}

function buildBlockingReason(input: WorkflowExplainabilityInput): string | null {
  if (isAutoDirectorRecoveryInProgress(input)) {
    return input.lastError?.trim() || getBackendMessage("workflow.blocking.recovering");
  }
  if (input.status === "running" || input.status === "succeeded") {
    return null;
  }
  if (input.status === "queued") {
    return getBackendMessage("workflow.blocking.queued");
  }
  if (input.status === "waiting_approval") {
    if (input.checkpointType === "front10_ready") {
      return buildAutoExecutionPreparedReason(input);
    }
    if (input.checkpointType === "chapter_batch_ready") {
      return buildAutoExecutionPausedReason(input);
    }
    return input.checkpointType
      ? getBackendMessage(CHECKPOINT_BLOCKING_REASON_KEYS[input.checkpointType])
      : getBackendMessage("workflow.blocking.safe_checkpoint");
  }
  if (input.status === "failed") {
    if (input.checkpointType === "chapter_batch_ready") {
      return getBackendMessage("workflow.blocking.failed_batch", { scopeLabel: getExecutionScopeLabel(input) });
    }
    return normalizeFailureSummary(input.lastError, getBackendMessage("workflow.blocking.failed_default"));
  }
  if (input.status === "cancelled") {
    if (input.checkpointType === "chapter_batch_ready") {
      return getBackendMessage("workflow.blocking.cancelled_batch", { scopeLabel: getExecutionScopeLabel(input) });
    }
    return getBackendMessage("workflow.blocking.cancelled_default");
  }
  return null;
}

export function buildWorkflowExplainability(input: WorkflowExplainabilityInput): WorkflowExplainabilitySummary {
  return {
    displayStatus: buildDisplayStatus(input),
    blockingReason: buildBlockingReason(input),
    resumeAction: buildWorkflowResumeAction(input.status, input.checkpointType ?? null, input.executionScopeLabel),
    lastHealthyStage: getLastHealthyStage(input),
  };
}
