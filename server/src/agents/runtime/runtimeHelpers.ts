import type {
  AgentRunStartInput,
  PlannedAction,
  StructuredIntent,
  ToolCall,
  ToolExecutionContext,
} from "../types";
import type { AgentToolError } from "../types";
import type { AgentToolErrorCode } from "@ai-novel/shared/types/agent";
import { getBackendMessage } from "../../i18n";

export interface ToolExecutionResult {
  tool: ToolCall["tool"];
  success: boolean;
  summary: string;
  output?: Record<string, unknown>;
  errorCode?: AgentToolErrorCode;
  stepId?: string;
}

export interface SerializedContinuationPayload {
  goal: string;
  structuredIntent?: StructuredIntent;
  context: Omit<ToolExecutionContext, "runId" | "agentName">;
  plannedActions: PlannedAction[];
}

export interface RunMetadata {
  contextMode: AgentRunStartInput["contextMode"];
  worldId?: string;
  provider?: AgentRunStartInput["provider"];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  messages?: AgentRunStartInput["messages"];
  parentRunId?: string;
  replayFromStepId?: string;
  plannerIntent?: StructuredIntent;
}

export const APPROVAL_TTL_MS = 1000 * 60 * 30;
export const MAX_TOOL_RETRIES = 1;
export const TERMINAL_STATUSES = new Set(["succeeded", "failed", "cancelled"]);

export function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return JSON.stringify({ error: "serialize_failed" });
  }
}

export function asObject(value: string | null | undefined): Record<string, unknown> {
  if (!value?.trim()) {
    return {};
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function extractErrorCode(error: unknown): AgentToolErrorCode {
  if ((error as AgentToolError)?.name === "AgentToolError" && typeof (error as AgentToolError).code === "string") {
    return (error as AgentToolError).code;
  }
  return "INTERNAL";
}

export function canRetry(errorCode: AgentToolErrorCode): boolean {
  return errorCode === "TIMEOUT" || errorCode === "INTERNAL";
}

export function summarizeOutput(tool: string, output: Record<string, unknown>): string {
  if (typeof output.summary === "string" && output.summary.trim()) {
    return output.summary;
  }
  if (tool === "list_novels") {
    const items = Array.isArray(output.items) ? output.items : [];
    return getBackendMessage("agent.runtime.summary.list_novels", { count: items.length });
  }
  if (tool === "create_novel") {
    const title = typeof output.title === "string" ? output.title : "";
    const stage = typeof (output.setup as Record<string, unknown> | undefined)?.stage === "string"
      ? String((output.setup as Record<string, unknown>).stage)
      : "";
    if (title && stage === "ready_for_production") {
      return getBackendMessage("agent.runtime.summary.create_novel.ready", { title });
    }
    return title
      ? getBackendMessage("agent.runtime.summary.create_novel.setup", { title })
      : getBackendMessage("agent.runtime.summary.create_novel.generic");
  }
  if (tool === "select_novel_workspace") {
    const title = typeof output.title === "string" ? output.title : "";
    const stage = typeof (output.setup as Record<string, unknown> | undefined)?.stage === "string"
      ? String((output.setup as Record<string, unknown>).stage)
      : "";
    if (title && stage !== "ready_for_production") {
      return getBackendMessage("agent.runtime.summary.select_workspace.setup", { title });
    }
    return title
      ? getBackendMessage("agent.runtime.summary.select_workspace.ready", { title })
      : getBackendMessage("agent.runtime.summary.select_workspace.generic");
  }
  if (tool === "bind_world_to_novel") {
    const worldName = typeof output.worldName === "string" ? output.worldName.trim() : "";
    const novelTitle = typeof output.novelTitle === "string" ? output.novelTitle.trim() : "";
    if (worldName && novelTitle) {
      return getBackendMessage("agent.runtime.summary.bind_world.with_novel", { worldName, novelTitle });
    }
    if (worldName) {
      return getBackendMessage("agent.runtime.summary.bind_world.with_world", { worldName });
    }
    return getBackendMessage("agent.runtime.summary.bind_world.generic");
  }
  if (tool === "unbind_world_from_novel") {
    const previousWorldName = typeof output.previousWorldName === "string" ? output.previousWorldName.trim() : "";
    const novelTitle = typeof output.novelTitle === "string" ? output.novelTitle.trim() : "";
    if (previousWorldName && novelTitle) {
      return getBackendMessage("agent.runtime.summary.unbind_world.with_novel_and_world", {
        worldName: previousWorldName,
        novelTitle,
      });
    }
    if (novelTitle) {
      return getBackendMessage("agent.runtime.summary.unbind_world.no_world_bound", { novelTitle });
    }
    return getBackendMessage("agent.runtime.summary.unbind_world.generic");
  }
  if (tool === "generate_world_for_novel") {
    const worldName = typeof output.worldName === "string" ? output.worldName.trim() : "";
    return worldName
      ? getBackendMessage("agent.runtime.summary.generate_world.named", { worldName })
      : getBackendMessage("agent.runtime.summary.generate_world.generic");
  }
  if (tool === "generate_novel_characters") {
    return getBackendMessage("agent.runtime.summary.generate_characters", {
      count: String(output.characterCount ?? 0),
    });
  }
  if (tool === "generate_story_bible") {
    return getBackendMessage("agent.runtime.summary.generate_story_bible");
  }
  if (tool === "generate_novel_outline") {
    return getBackendMessage("agent.runtime.summary.generate_outline");
  }
  if (tool === "generate_structured_outline") {
    return getBackendMessage("agent.runtime.summary.generate_structured_outline", {
      count: String(output.targetChapterCount ?? output.chapterCount ?? 0),
    });
  }
  if (tool === "sync_chapters_from_structured_outline") {
    return getBackendMessage("agent.runtime.summary.sync_chapters", {
      count: String(output.chapterCount ?? 0),
    });
  }
  if (tool === "start_full_novel_pipeline" || tool === "get_novel_production_status") {
    return typeof output.summary === "string"
      ? output.summary
      : getBackendMessage("agent.runtime.summary.tool_completed", { tool });
  }
  if (tool === "get_novel_context") {
    const title = typeof output.title === "string" ? output.title.trim() : "";
    const chapterCount = typeof output.chapterCount === "number" ? output.chapterCount : null;
    if (title && chapterCount != null) {
      return getBackendMessage("agent.runtime.summary.novel_context.with_chapters", { title, chapterCount });
    }
    if (title) {
      return getBackendMessage("agent.runtime.summary.novel_context.with_title", { title });
    }
    return getBackendMessage("agent.runtime.summary.novel_context.generic");
  }
  if (tool === "get_story_bible") {
    const exists = output.exists === true;
    return exists
      ? getBackendMessage("agent.runtime.summary.story_bible.exists")
      : getBackendMessage("agent.runtime.summary.story_bible.missing");
  }
  if (tool === "get_world_constraints") {
    const worldName = typeof output.worldName === "string" ? output.worldName.trim() : "";
    return worldName
      ? getBackendMessage("agent.runtime.summary.world_constraints.with_name", { worldName })
      : getBackendMessage("agent.runtime.summary.world_constraints.missing");
  }
  if (tool === "list_chapters") {
    const items = Array.isArray(output.items) ? output.items : [];
    return getBackendMessage("agent.runtime.summary.list_chapters", { count: items.length });
  }
  if (tool === "get_chapter_by_order" || tool === "get_chapter_content_by_order" || tool === "get_chapter_content") {
    const order = typeof output.order === "number" ? output.order : null;
    const title = typeof output.title === "string" ? output.title.trim() : "";
    if (order != null && title) {
      return getBackendMessage("agent.runtime.summary.chapter.with_order_and_title", { order, title });
    }
    if (order != null) {
      return getBackendMessage("agent.runtime.summary.chapter.with_order", { order });
    }
    return getBackendMessage("agent.runtime.summary.chapter.generic");
  }
  if (tool === "summarize_chapter_range") {
    const start = typeof output.startOrder === "number" ? output.startOrder : null;
    const end = typeof output.endOrder === "number" ? output.endOrder : null;
    return start != null && end != null
      ? getBackendMessage("agent.runtime.summary.summarize_range.with_bounds", {
        startOrder: start,
        endOrder: end,
      })
      : getBackendMessage("agent.runtime.summary.summarize_range.generic");
  }
  if (tool === "search_knowledge") {
    const hitCount = typeof output.hitCount === "number" ? output.hitCount : 0;
    return getBackendMessage("agent.runtime.summary.search_knowledge", { hitCount });
  }
  if (tool === "list_book_analyses") {
    const items = Array.isArray(output.items) ? output.items : [];
    return getBackendMessage("agent.runtime.summary.list_book_analyses", { count: items.length });
  }
  if (tool === "get_book_analysis_detail") {
    return typeof output.title === "string"
      ? getBackendMessage("agent.runtime.summary.book_analysis_detail.with_title", { title: output.title })
      : getBackendMessage("agent.runtime.summary.book_analysis_detail.generic");
  }
  if (tool === "get_book_analysis_failure_reason" || tool === "get_index_failure_reason" || tool === "get_task_failure_reason" || tool === "get_run_failure_reason") {
    return typeof output.failureSummary === "string"
      ? output.failureSummary
      : getBackendMessage("agent.runtime.summary.diagnosis.generic", { tool });
  }
  if (tool === "list_knowledge_documents") {
    const items = Array.isArray(output.items) ? output.items : [];
    return getBackendMessage("agent.runtime.summary.list_knowledge_documents", { count: items.length });
  }
  if (tool === "get_knowledge_document_detail") {
    return typeof output.title === "string"
      ? getBackendMessage("agent.runtime.summary.knowledge_document_detail.with_title", { title: output.title })
      : getBackendMessage("agent.runtime.summary.knowledge_document_detail.generic");
  }
  if (tool === "list_worlds") {
    const items = Array.isArray(output.items) ? output.items : [];
    return getBackendMessage("agent.runtime.summary.list_worlds", { count: items.length });
  }
  if (tool === "get_world_detail") {
    return typeof output.name === "string"
      ? getBackendMessage("agent.runtime.summary.world_detail.with_name", { name: output.name })
      : getBackendMessage("agent.runtime.summary.world_detail.generic");
  }
  if (tool === "explain_world_conflict" || tool === "explain_generation_blocker") {
    return typeof output.failureSummary === "string"
      ? output.failureSummary
      : getBackendMessage("agent.runtime.summary.blocker.generic", { tool });
  }
  if (tool === "list_writing_formulas") {
    const items = Array.isArray(output.items) ? output.items : [];
    return getBackendMessage("agent.runtime.summary.list_writing_formulas", { count: items.length });
  }
  if (tool === "get_writing_formula_detail") {
    return typeof output.name === "string"
      ? getBackendMessage("agent.runtime.summary.writing_formula_detail.with_name", { name: output.name })
      : getBackendMessage("agent.runtime.summary.writing_formula_detail.generic");
  }
  if (tool === "explain_formula_match") {
    return typeof output.summary === "string"
      ? output.summary
      : getBackendMessage("agent.runtime.summary.formula_match.generic");
  }
  if (tool === "list_base_characters") {
    const items = Array.isArray(output.items) ? output.items : [];
    return getBackendMessage("agent.runtime.summary.list_base_characters", { count: items.length });
  }
  if (tool === "get_base_character_detail") {
    return typeof output.name === "string"
      ? getBackendMessage("agent.runtime.summary.base_character_detail.with_name", { name: output.name })
      : getBackendMessage("agent.runtime.summary.base_character_detail.generic");
  }
  if (tool === "list_tasks") {
    const items = Array.isArray(output.items) ? output.items : [];
    return getBackendMessage("agent.runtime.summary.list_tasks", { count: items.length });
  }
  if (tool === "get_task_detail") {
    return typeof output.title === "string"
      ? getBackendMessage("agent.runtime.summary.task_detail.with_title", { title: output.title })
      : getBackendMessage("agent.runtime.summary.task_detail.generic");
  }
  if (tool === "retry_task" || tool === "cancel_task") {
    return typeof output.summary === "string"
      ? output.summary
      : getBackendMessage("agent.runtime.summary.tool_completed", { tool });
  }
  if (tool === "preview_pipeline_run") {
    return getBackendMessage("agent.runtime.summary.preview_pipeline_run", {
      count: String(output.chapterCount ?? 0),
    });
  }
  if (tool === "queue_pipeline_run") {
    return getBackendMessage("agent.runtime.summary.queue_pipeline_run", {
      value: String(output.jobId ?? output.status ?? "unknown"),
    });
  }
  if (tool === "apply_chapter_patch" || tool === "save_chapter_draft") {
    return getBackendMessage("agent.runtime.summary.chapter_write_processed", {
      contentLength: String(output.contentLength ?? 0),
    });
  }
  return getBackendMessage("agent.runtime.summary.tool_completed", { tool });
}

export function summarizeFailure(tool: string, error: unknown): string {
  return getBackendMessage("agent.runtime.summary.tool_failed", {
    tool,
    message: error instanceof Error ? error.message : getBackendMessage("agent.runtime.unknown_error"),
  });
}

export function buildFinalMessage(results: ToolExecutionResult[], waitingForApproval: boolean): string {
  const lines: string[] = [];
  if (results.length > 0) {
    lines.push(getBackendMessage("agent.runtime.final.completed_steps"));
    for (const item of results) {
      lines.push(`- ${item.summary}`);
    }
  }
  if (waitingForApproval) {
    lines.push(getBackendMessage("agent.runtime.final.waiting_approval"));
  } else if (results.length > 0) {
    lines.push(getBackendMessage("agent.runtime.final.completed"));
  } else {
    lines.push(getBackendMessage("agent.runtime.final.no_steps"));
  }
  return lines.join("\n");
}

function isWriteTool(tool: ToolCall["tool"]): boolean {
  return tool === "save_chapter_draft" || tool === "apply_chapter_patch" || tool === "queue_pipeline_run";
}

export function shouldUseDryRunPreview(toolCall: ToolCall): boolean {
  return isWriteTool(toolCall.tool) && toolCall.input.dryRun !== true;
}

export function normalizeAgent(value: unknown): PlannedAction["agent"] {
  if (value === "Writer" || value === "Reviewer" || value === "Continuity" || value === "Repair") {
    return value;
  }
  return "Planner";
}

function isStructuredIntent(value: unknown): value is StructuredIntent {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value.goal === "string"
    && typeof value.intent === "string"
    && typeof value.confidence === "number"
    && isRecord(value.chapterSelectors);
}

export function parseApprovalPayload(payloadJson: string | null | undefined): SerializedContinuationPayload | null {
  const raw = asObject(payloadJson);
  if (!Array.isArray(raw.plannedActions) || typeof raw.goal !== "string" || !isRecord(raw.context)) {
    return null;
  }
  const contextRecord = raw.context;
  const context: SerializedContinuationPayload["context"] = {
    contextMode: contextRecord.contextMode === "novel" ? "novel" : "global",
    novelId: typeof contextRecord.novelId === "string" ? contextRecord.novelId : undefined,
    worldId: typeof contextRecord.worldId === "string" ? contextRecord.worldId : undefined,
    provider: typeof contextRecord.provider === "string"
      ? contextRecord.provider as AgentRunStartInput["provider"]
      : undefined,
    model: typeof contextRecord.model === "string" ? contextRecord.model : undefined,
    temperature: typeof contextRecord.temperature === "number" ? contextRecord.temperature : undefined,
    maxTokens: typeof contextRecord.maxTokens === "number" ? contextRecord.maxTokens : undefined,
  };
  const plannedActions: PlannedAction[] = raw.plannedActions
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item) => {
      const callsRaw = Array.isArray(item.calls) ? item.calls : [];
      const calls: ToolCall[] = callsRaw
        .filter((call): call is Record<string, unknown> => isRecord(call))
        .map((call) => ({
          tool: call.tool as ToolCall["tool"],
          reason: typeof call.reason === "string" ? call.reason : getBackendMessage("agent.runtime.approval.default_reason"),
          idempotencyKey: typeof call.idempotencyKey === "string" ? call.idempotencyKey : `k_${Date.now()}`,
          input: isRecord(call.input) ? call.input : {},
          dryRun: call.dryRun === true,
          approvalSatisfied: call.approvalSatisfied === true,
        }));
      return {
        agent: normalizeAgent(item.agent),
        reasoning: typeof item.reasoning === "string"
          ? item.reasoning
          : getBackendMessage("agent.runtime.approval.default_reasoning"),
        calls,
      };
    })
    .filter((item) => item.calls.length > 0);

  if (plannedActions.length === 0) {
    return null;
  }
  return {
    goal: raw.goal,
    structuredIntent: isStructuredIntent(raw.structuredIntent) ? raw.structuredIntent : undefined,
    context,
    plannedActions,
  };
}

export function buildAlternativePathFromRejectedApproval(
  approvalPayload: SerializedContinuationPayload | null,
  note?: string,
): PlannedAction[] {
  if (!approvalPayload) {
    return [];
  }
  const firstCall = approvalPayload.plannedActions[0]?.calls[0];
  if (!firstCall) {
    return [];
  }

  if (firstCall.tool === "apply_chapter_patch") {
    const novelId = typeof firstCall.input.novelId === "string" ? firstCall.input.novelId : undefined;
    const chapterId = typeof firstCall.input.chapterId === "string" ? firstCall.input.chapterId : undefined;
    const content = typeof firstCall.input.content === "string" ? firstCall.input.content : "";
    if (novelId && chapterId && content.trim()) {
      return [{
        agent: "Writer",
        reasoning: getBackendMessage("agent.runtime.approval.fallback_draft.reasoning"),
        calls: [{
          tool: "save_chapter_draft",
          reason: note?.trim()
            ? getBackendMessage("agent.runtime.approval.fallback_draft.reason.with_note", { note: note.trim() })
            : getBackendMessage("agent.runtime.approval.fallback_draft.reason.without_note"),
          idempotencyKey: `fallback_draft_${chapterId}_${Date.now()}`,
          input: {
            novelId,
            chapterId,
            content,
            dryRun: false,
          },
        }],
      }];
    }
  }

  if (firstCall.tool === "queue_pipeline_run") {
    const novelId = typeof firstCall.input.novelId === "string" ? firstCall.input.novelId : undefined;
    const startOrder = typeof firstCall.input.startOrder === "number" ? firstCall.input.startOrder : undefined;
    const endOrder = typeof firstCall.input.endOrder === "number" ? firstCall.input.endOrder : undefined;
    if (novelId && typeof startOrder === "number" && typeof endOrder === "number") {
      return [{
        agent: "Planner",
        reasoning: getBackendMessage("agent.runtime.approval.fallback_preview.reasoning"),
        calls: [{
          tool: "preview_pipeline_run",
          reason: getBackendMessage("agent.runtime.approval.fallback_preview.reason"),
          idempotencyKey: `fallback_preview_${startOrder}_${endOrder}_${Date.now()}`,
          input: {
            novelId,
            startOrder,
            endOrder,
          },
        }],
      }];
    }
  }

  return [];
}

export function parseRunMetadata(metadataJson: string | null | undefined): RunMetadata {
  const raw = asObject(metadataJson);
  const metadata: RunMetadata = {
    contextMode: raw.contextMode === "novel" ? "novel" : "global",
  };
  if (typeof raw.provider === "string") {
    metadata.provider = raw.provider as AgentRunStartInput["provider"];
  }
  if (typeof raw.worldId === "string") {
    metadata.worldId = raw.worldId;
  }
  if (typeof raw.model === "string") {
    metadata.model = raw.model;
  }
  if (typeof raw.temperature === "number") {
    metadata.temperature = raw.temperature;
  }
  if (typeof raw.maxTokens === "number") {
    metadata.maxTokens = raw.maxTokens;
  }
  if (Array.isArray(raw.messages)) {
    metadata.messages = raw.messages
      .filter((item): item is { role: "user" | "assistant" | "system"; content: string } =>
        isRecord(item)
        && (item.role === "user" || item.role === "assistant" || item.role === "system")
        && typeof item.content === "string")
      .slice(-30);
  }
  if (typeof raw.parentRunId === "string") {
    metadata.parentRunId = raw.parentRunId;
  }
  if (typeof raw.replayFromStepId === "string") {
    metadata.replayFromStepId = raw.replayFromStepId;
  }
  if (isStructuredIntent(raw.plannerIntent)) {
    metadata.plannerIntent = raw.plannerIntent;
  }
  return metadata;
}
