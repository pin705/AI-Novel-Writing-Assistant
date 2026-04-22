import { asObject, summarizeOutput } from "../agents/runtime/runtimeHelpers";
import type { AgentRuntimeResult, PlannerResult, StructuredIntent } from "../agents/types";
import { localizeAgentRunCurrentStep } from "../agents/runtime/agentRunLabels";
import { getBackendLanguage, getBackendMessage, getRequestLocale } from "../i18n";
import type { ProductionStatusResult } from "../services/novel/NovelProductionStatusService";
import type { AgentStep } from "@ai-novel/shared/types/agent";
import type {
  CreativeHubInterrupt,
  CreativeHubThread,
  CreativeHubTurnStatus,
  CreativeHubTurnSummary,
} from "@ai-novel/shared/types/creativeHub";

function truncateText(value: string, max = 180): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

function getSummarySeparator(): string {
  return getBackendLanguage(getRequestLocale()) === "zh" ? "；" : "; ";
}

function formatIntentLabel(intent: StructuredIntent["intent"] | undefined): string {
  switch (intent) {
    case "social_opening":
      return getBackendMessage("creativeHub.turn.intent.social_opening");
    case "list_novels":
      return getBackendMessage("creativeHub.turn.intent.list_novels");
    case "create_novel":
      return getBackendMessage("creativeHub.turn.intent.create_novel");
    case "select_novel_workspace":
      return getBackendMessage("creativeHub.turn.intent.select_novel_workspace");
    case "unbind_world_from_novel":
      return getBackendMessage("creativeHub.turn.intent.unbind_world_from_novel");
    case "produce_novel":
      return getBackendMessage("creativeHub.turn.intent.produce_novel");
    case "query_novel_production_status":
      return getBackendMessage("creativeHub.turn.intent.query_novel_production_status");
    case "query_chapter_content":
      return getBackendMessage("creativeHub.turn.intent.query_chapter_content");
    case "inspect_failure_reason":
      return getBackendMessage("creativeHub.turn.intent.inspect_failure_reason");
    case "write_chapter":
      return getBackendMessage("creativeHub.turn.intent.write_chapter");
    case "rewrite_chapter":
      return getBackendMessage("creativeHub.turn.intent.rewrite_chapter");
    case "search_knowledge":
      return getBackendMessage("creativeHub.turn.intent.search_knowledge");
    case "ideate_novel_setup":
      return getBackendMessage("creativeHub.turn.intent.ideate_novel_setup");
    case "inspect_world":
      return getBackendMessage("creativeHub.turn.intent.inspect_world");
    case "inspect_characters":
      return getBackendMessage("creativeHub.turn.intent.inspect_characters");
    case "general_chat":
      return getBackendMessage("creativeHub.turn.intent.general_chat");
    default:
      return getBackendMessage("creativeHub.turn.intent.default");
  }
}

function toTurnStatus(
  threadStatus: CreativeHubThread["status"],
  latestError: string | null,
  executionResult: AgentRuntimeResult | null,
): CreativeHubTurnStatus {
  if (latestError || executionResult?.run.status === "failed") {
    return "failed";
  }
  if (threadStatus === "interrupted" || executionResult?.run.status === "waiting_approval") {
    return "interrupted";
  }
  if (executionResult?.run.status === "cancelled") {
    return "cancelled";
  }
  if (executionResult?.run.status === "running" || threadStatus === "busy") {
    return "running";
  }
  return "succeeded";
}

function extractToolSummaries(steps: AgentStep[]): string[] {
  return steps
    .filter((step) => step.stepType === "tool_result" && step.status === "succeeded")
    .map((step) => {
      const input = asObject(step.inputJson);
      const output = asObject(step.outputJson);
      const tool = typeof input.tool === "string" ? input.tool : "";
      if (!tool) {
        return "";
      }
      return truncateText(summarizeOutput(tool, output), 120);
    })
    .filter(Boolean);
}

function shouldEmitTurnSummary(
  turnStatus: CreativeHubTurnStatus,
  latestError: string | null,
  plannerResult: PlannerResult | null,
  executionResult: AgentRuntimeResult | null,
): boolean {
  if (plannerResult?.structuredIntent.intent === "social_opening") {
    return false;
  }
  if (latestError) {
    return true;
  }
  if (turnStatus !== "succeeded") {
    return true;
  }
  const steps = executionResult?.steps ?? [];
  return steps.some((step) => step.stepType === "tool_result" && step.status === "succeeded");
}

function buildIntentSummary(goal: string, plannerResult: PlannerResult | null): string {
  const structuredIntent = plannerResult?.structuredIntent;
  const describedGoal = truncateText(structuredIntent?.description ?? structuredIntent?.note ?? goal, 150);
  const label = formatIntentLabel(structuredIntent?.intent);
  return describedGoal
    ? getBackendMessage("creativeHub.turn.intent_summary.with_goal", { label, goal: describedGoal })
    : getBackendMessage("creativeHub.turn.intent_summary.label_only", { label });
}

function buildActionSummary(
  turnStatus: CreativeHubTurnStatus,
  plannerResult: PlannerResult | null,
  toolSummaries: string[],
): string {
  if (toolSummaries.length > 0) {
    const preview = toolSummaries.slice(0, 3).join(getSummarySeparator());
    if (toolSummaries.length > 3) {
      return getBackendMessage("creativeHub.turn.action.with_more", {
        preview,
        remainingCount: toolSummaries.length - 3,
      });
    }
    return preview;
  }
  if ((plannerResult?.actions.length ?? 0) > 0) {
    const count = plannerResult?.actions.reduce((total, action) => total + action.calls.length, 0) ?? 0;
    if (turnStatus === "interrupted") {
      return getBackendMessage("creativeHub.turn.action.planned.interrupted", { count });
    }
    return getBackendMessage("creativeHub.turn.action.planned.default", { count });
  }
  return getBackendMessage("creativeHub.turn.action.none");
}

function buildImpactSummary(
  latestError: string | null,
  interrupts: CreativeHubInterrupt[],
  productionStatus?: ProductionStatusResult | null,
  toolSummaries: string[] = [],
): string {
  if (latestError) {
    return truncateText(latestError, 180);
  }
  if (interrupts.length > 0) {
    return truncateText(interrupts[0]?.summary ?? getBackendMessage("creativeHub.turn.impact.pending_approval"), 180);
  }
  if (productionStatus?.summary?.trim()) {
    return truncateText(productionStatus.summary, 180);
  }
  if (toolSummaries.length > 0) {
    return toolSummaries[toolSummaries.length - 1];
  }
  return getBackendMessage("creativeHub.turn.impact.default");
}

function buildNextSuggestion(
  turnStatus: CreativeHubTurnStatus,
  plannerResult: PlannerResult | null,
  latestError: string | null,
  interrupts: CreativeHubInterrupt[],
  productionStatus?: ProductionStatusResult | null,
): string {
  if (turnStatus === "interrupted" && interrupts.length > 0) {
    return getBackendMessage("creativeHub.turn.next.interrupted");
  }
  if (turnStatus === "failed" || latestError) {
    return productionStatus?.recoveryHint?.trim()
      || getBackendMessage("creativeHub.turn.next.failure_default");
  }
  switch (plannerResult?.structuredIntent.intent) {
    case "create_novel":
      return getBackendMessage("creativeHub.turn.next.create_novel");
    case "unbind_world_from_novel":
      return getBackendMessage("creativeHub.turn.next.unbind_world_from_novel");
    case "produce_novel":
      return getBackendMessage("creativeHub.turn.next.produce_novel");
    case "query_novel_production_status":
      return getBackendMessage("creativeHub.turn.next.query_novel_production_status");
    case "write_chapter":
    case "rewrite_chapter":
      return getBackendMessage("creativeHub.turn.next.write_chapter");
    case "search_knowledge":
      return getBackendMessage("creativeHub.turn.next.search_knowledge");
    case "ideate_novel_setup":
      return getBackendMessage("creativeHub.turn.next.ideate_novel_setup");
    default:
      return getBackendMessage("creativeHub.turn.next.default");
  }
}

function buildCurrentStage(
  turnStatus: CreativeHubTurnStatus,
  plannerResult: PlannerResult | null,
  executionResult: AgentRuntimeResult | null,
  productionStatus?: ProductionStatusResult | null,
): string {
  if (turnStatus === "interrupted") {
    return localizeAgentRunCurrentStep("waiting_approval") ?? formatIntentLabel(plannerResult?.structuredIntent.intent);
  }
  if (turnStatus === "failed") {
    return localizeAgentRunCurrentStep("failed") ?? formatIntentLabel(plannerResult?.structuredIntent.intent);
  }
  if (productionStatus?.currentStage?.trim()) {
    return productionStatus.currentStage.trim();
  }
  if (executionResult?.run.currentStep?.trim()) {
    return localizeAgentRunCurrentStep(executionResult.run.currentStep) ?? executionResult.run.currentStep.trim();
  }
  return formatIntentLabel(plannerResult?.structuredIntent.intent);
}

export function buildCreativeHubTurnSummary(input: {
  checkpointId: string;
  goal: string;
  threadStatus: CreativeHubThread["status"];
  latestError: string | null;
  plannerResult: PlannerResult | null;
  executionResult: AgentRuntimeResult | null;
  interrupts: CreativeHubInterrupt[];
  productionStatus?: ProductionStatusResult | null;
}): CreativeHubTurnSummary | null {
  const executionResult = input.executionResult;
  const runId = executionResult?.run.id;
  if (!runId) {
    return null;
  }

  const turnStatus = toTurnStatus(input.threadStatus, input.latestError, executionResult);
  if (!shouldEmitTurnSummary(turnStatus, input.latestError, input.plannerResult, executionResult)) {
    return null;
  }
  const toolSummaries = extractToolSummaries(executionResult.steps);

  return {
    runId,
    checkpointId: input.checkpointId,
    status: turnStatus,
    currentStage: buildCurrentStage(turnStatus, input.plannerResult, executionResult, input.productionStatus),
    intentSummary: buildIntentSummary(input.goal, input.plannerResult),
    actionSummary: buildActionSummary(turnStatus, input.plannerResult, toolSummaries),
    impactSummary: buildImpactSummary(input.latestError, input.interrupts, input.productionStatus, toolSummaries),
    nextSuggestion: buildNextSuggestion(
      turnStatus,
      input.plannerResult,
      input.latestError,
      input.interrupts,
      input.productionStatus,
    ),
  };
}
