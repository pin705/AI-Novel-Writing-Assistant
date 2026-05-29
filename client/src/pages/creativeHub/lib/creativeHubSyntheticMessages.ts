import type { FailureDiagnostic } from "@ai-novel/shared/types/agent";
import type { CreativeHubInterrupt, CreativeHubTurnSummary } from "@ai-novel/shared/types/creativeHub";
import type { CreativeHubStreamFrame } from "@ai-novel/shared/types/api";
import type { LangChainMessage } from "@assistant-ui/react-langgraph";
import type { CreativeHubDebugTraceEntry } from "../components/CreativeHubDebugTraceCard";
import { getIntentDisplayLabel, getPlannerSourceDisplayLabel } from "./plannerLabels";

type Translator = (key: string, values?: Record<string, string | number | undefined | null>) => string;

function compactArgs(record: Record<string, string | boolean | null | undefined>) {
  return Object.fromEntries(
    Object.entries(record).filter((entry): entry is [string, string | boolean | null] => entry[1] !== undefined),
  );
}

const RUN_STATUS_LABEL_KEYS = new Set([
  "running",
  "queued",
  "waiting_approval",
  "succeeded",
  "failed",
  "cancelled",
  "interrupted",
]);

function statusWord(status: string, t: Translator): string {
  if (RUN_STATUS_LABEL_KEYS.has(status)) {
    return t(`creativeHub.activityFeed.statusLabel.${status}`);
  }
  return status;
}

function createTurnSummaryMessage(summary: CreativeHubTurnSummary): LangChainMessage {
  const payload = JSON.parse(JSON.stringify(summary)) as any;
  return {
    id: `assistant_turn_summary_${summary.runId}`,
    type: "ai",
    content: "",
    tool_calls: [{
      id: `turn_summary_${summary.runId}`,
      name: "creative_hub_turn_summary",
      args: payload,
      partial_json: JSON.stringify(summary),
    }],
    additional_kwargs: {
      metadata: {
        synthetic: true,
        kind: "turn_summary",
        runId: summary.runId,
      },
    },
  };
}

function createDebugTraceMessage(
  runId: string,
  entries: CreativeHubDebugTraceEntry[],
  defaultCollapsed: boolean,
): LangChainMessage {
  const payload = {
    runId,
    entries,
    defaultCollapsed,
  } as any;
  return {
    id: `assistant_debug_trace_${runId}`,
    type: "ai",
    content: "",
    tool_calls: [{
      id: `debug_trace_${runId}`,
      name: "creative_hub_debug_trace",
      args: payload,
      partial_json: JSON.stringify(payload),
    }],
    additional_kwargs: {
      metadata: {
        synthetic: true,
        kind: "debug_trace",
        runId,
      },
    },
  };
}

export interface CreativeHubRunArtifacts {
  runId: string;
  turnSummary?: CreativeHubTurnSummary;
  debugEntries: CreativeHubDebugTraceEntry[];
}

function hasMeaningfulDebugEntries(entries: CreativeHubDebugTraceEntry[]): boolean {
  return entries.some((entry) => (
    entry.id.startsWith("tool_call_")
    || entry.id.startsWith("tool_result_")
    || entry.id.startsWith("approval_")
    || entry.id.startsWith("error_")
  ));
}

export function buildRunArtifactMessages(
  runArtifacts: CreativeHubRunArtifacts[],
  defaultCollapsed: boolean,
): LangChainMessage[][] {
  return runArtifacts
    .filter((artifact) => artifact.turnSummary || hasMeaningfulDebugEntries(artifact.debugEntries))
    .map((artifact) => {
      const messages: LangChainMessage[] = [];
      if (artifact.turnSummary) {
        messages.push(createTurnSummaryMessage(artifact.turnSummary));
      }
      if (hasMeaningfulDebugEntries(artifact.debugEntries)) {
        messages.push(createDebugTraceMessage(artifact.runId, artifact.debugEntries, defaultCollapsed));
      }
      return messages;
    });
}

export function mergeDisplayMessages(
  baseMessages: LangChainMessage[],
  inlineStateMessages: LangChainMessage[],
  runArtifactMessages: LangChainMessage[][],
): LangChainMessage[] {
  if (runArtifactMessages.length === 0 && inlineStateMessages.length === 0) {
    return baseMessages;
  }

  const aiIndices = baseMessages.reduce<number[]>((result, message, index) => {
    if (message.type === "ai") {
      result.push(index);
    }
    return result;
  }, []);

  const artifactStartIndex = Math.max(0, aiIndices.length - runArtifactMessages.length);
  const artifactTargetIndices = aiIndices.slice(artifactStartIndex);
  const artifactMap = new Map<number, LangChainMessage[]>();
  artifactTargetIndices.forEach((targetIndex, index) => {
    const artifactGroup = runArtifactMessages[index];
    if (artifactGroup?.length) {
      artifactMap.set(targetIndex, artifactGroup);
    }
  });

  const merged: LangChainMessage[] = [];
  baseMessages.forEach((message, index) => {
    merged.push(message);
    const artifactGroup = artifactMap.get(index);
    if (artifactGroup?.length) {
      merged.push(...artifactGroup);
    }
  });

  return [...merged, ...inlineStateMessages];
}

function buildDebugTraceEntry(
  frame: CreativeHubStreamFrame,
  fallbackRunId: string | null,
  sequence: number,
  t: Translator,
): { runId: string; entry: CreativeHubDebugTraceEntry } | null {
  if (frame.event === "creative_hub/turn_summary" || frame.event === "creative_hub/interrupt") {
    return null;
  }

  if (frame.event === "creative_hub/run_status") {
    const runId = frame.data.runId ?? fallbackRunId;
    if (!runId) {
      return null;
    }
    return {
      runId,
      entry: {
        id: `run_status_${sequence}`,
        kind: t("creativeHub.debugTrace.kind.runStatus"),
        title: t("creativeHub.debugTrace.entry.runStatusTitle"),
        summary: frame.data.message
          || t("creativeHub.debugTrace.entry.runStatusFallback", { status: statusWord(frame.data.status, t) }),
        meta: [statusWord(frame.data.status, t), t("creativeHub.debugTrace.runLabel", { value: runId.slice(0, 8) })],
        tone: frame.data.status === "failed" || frame.data.status === "cancelled"
          ? "destructive"
          : frame.data.status === "waiting_approval"
            ? "secondary"
            : "default",
      },
    };
  }

  if (frame.event === "creative_hub/tool_call") {
    const runId = frame.data.runId ?? fallbackRunId;
    if (!runId) {
      return null;
    }
    return {
      runId,
      entry: {
        id: `tool_call_${sequence}`,
        kind: t("creativeHub.debugTrace.kind.toolCall"),
        title: frame.data.toolName,
        summary: frame.data.inputSummary || t("creativeHub.debugTrace.entry.toolInputFallback"),
        meta: [
          t("creativeHub.debugTrace.runLabel", { value: runId.slice(0, 8) }),
          frame.data.stepId ? `Step ${frame.data.stepId.slice(0, 8)}` : "",
        ].filter(Boolean),
      },
    };
  }

  if (frame.event === "creative_hub/tool_result") {
    const runId = frame.data.runId ?? fallbackRunId;
    if (!runId) {
      return null;
    }
    return {
      runId,
      entry: {
        id: `tool_result_${sequence}`,
        kind: frame.data.success
          ? t("creativeHub.debugTrace.kind.toolCompleted")
          : t("creativeHub.debugTrace.kind.toolFailed"),
        title: frame.data.toolName,
        summary: frame.data.outputSummary || t("creativeHub.debugTrace.entry.toolOutputFallback"),
        meta: [
          frame.data.success ? t("creativeHub.common.successLabel") : t("creativeHub.common.failedLabel"),
          t("creativeHub.debugTrace.runLabel", { value: runId.slice(0, 8) }),
        ],
        tone: frame.data.success ? "default" : "destructive",
      },
    };
  }

  if (frame.event === "creative_hub/approval_resolved") {
    const runId = fallbackRunId;
    if (!runId) {
      return null;
    }
    return {
      runId,
      entry: {
        id: `approval_${sequence}`,
        kind: t("creativeHub.debugTrace.kind.approval"),
        title: frame.data.action === "approved"
          ? t("creativeHub.debugTrace.entry.approvedTitle")
          : t("creativeHub.debugTrace.entry.rejectedTitle"),
        summary: frame.data.note?.trim() || t("creativeHub.debugTrace.entry.approvalNoteFallback"),
        meta: [
          `Approval ${frame.data.approvalId.slice(0, 8)}`,
        ],
        tone: frame.data.action === "approved" ? "secondary" : "destructive",
      },
    };
  }

  if (frame.event === "creative_hub/error" || frame.event === "error") {
    const runId = fallbackRunId;
    if (!runId) {
      return null;
    }
    return {
      runId,
      entry: {
        id: `error_${sequence}`,
        kind: t("creativeHub.debugTrace.kind.runError"),
        title: t("creativeHub.debugTrace.entry.errorTitle"),
        summary: frame.data.message,
        meta: [t("creativeHub.debugTrace.runLabel", { value: runId.slice(0, 8) })],
        tone: "destructive",
      },
    };
  }

  if (frame.event === "metadata" && typeof frame.data.reasoning === "string") {
    const runId = fallbackRunId;
    if (!runId) {
      return null;
    }
    return {
      runId,
      entry: {
        id: `reasoning_${sequence}`,
        kind: t("creativeHub.debugTrace.kind.reasoning"),
        title: t("creativeHub.debugTrace.entry.reasoningTitle"),
        summary: frame.data.reasoning,
        meta: [t("creativeHub.debugTrace.runLabel", { value: runId.slice(0, 8) })],
      },
    };
  }

  if (frame.event === "metadata" && typeof frame.data.planner === "object" && frame.data.planner) {
    const runId = fallbackRunId;
    if (!runId) {
      return null;
    }
    const planner = frame.data.planner as Record<string, unknown>;
    return {
      runId,
      entry: {
        id: `planner_${sequence}`,
        kind: t("creativeHub.debugTrace.kind.planner"),
        title: t("creativeHub.debugTrace.entry.plannerTitle"),
        summary: t("creativeHub.debugTrace.entry.plannerSummary", {
          source: getPlannerSourceDisplayLabel(planner.source, t),
          intent: getIntentDisplayLabel(planner.intent, t),
        }),
        meta: [
          "confidence" in planner
            ? t("creativeHub.debugTrace.entry.confidence", { value: String(planner.confidence ?? "-") })
            : "",
          t("creativeHub.debugTrace.runLabel", { value: runId.slice(0, 8) }),
        ].filter(Boolean),
      },
    };
  }

  if (frame.event === "metadata" && typeof frame.data.checkpointId === "string") {
    const runId = typeof frame.data.runId === "string" && frame.data.runId.trim()
      ? frame.data.runId
      : fallbackRunId;
    if (!runId) {
      return null;
    }
    return {
      runId,
      entry: {
        id: `checkpoint_${sequence}`,
        kind: t("creativeHub.debugTrace.kind.checkpoint"),
        title: t("creativeHub.debugTrace.entry.checkpointTitle"),
        summary: t("creativeHub.debugTrace.entry.checkpointSummary", { value: frame.data.checkpointId.slice(0, 8) }),
        meta: [t("creativeHub.debugTrace.runLabel", { value: runId.slice(0, 8) })],
      },
    };
  }

  return null;
}

export function createRunArtifactEvent(
  frame: CreativeHubStreamFrame,
  fallbackRunId: string | null,
  sequence: number,
  t: Translator,
) {
  return buildDebugTraceEntry(frame, fallbackRunId, sequence, t);
}

export function buildInlineStateMessages(
  interrupt: CreativeHubInterrupt | undefined,
  diagnostics: FailureDiagnostic | undefined,
): LangChainMessage[] {
  const messages: LangChainMessage[] = [];

  if (interrupt?.id) {
    messages.push({
      id: `assistant_interrupt_${interrupt.id}`,
      type: "ai",
      content: "",
      tool_calls: [{
        id: `approval_gate_${interrupt.id}`,
        name: "approval_gate",
        args: compactArgs({
          title: interrupt.title,
          summary: interrupt.summary,
          targetType: interrupt.targetType ?? null,
          targetId: interrupt.targetId ?? null,
          approvalId: interrupt.approvalId ?? interrupt.id,
        }),
        partial_json: JSON.stringify(compactArgs({
          title: interrupt.title,
          summary: interrupt.summary,
          targetType: interrupt.targetType ?? null,
          targetId: interrupt.targetId ?? null,
          approvalId: interrupt.approvalId ?? interrupt.id,
        })),
      }],
      additional_kwargs: {
        metadata: {
          synthetic: true,
          kind: "interrupt",
        },
      },
    });
  }

  if (diagnostics?.failureSummary) {
    const toolCallId = "failure_diagnostic_current";
    messages.push({
      id: "assistant_failure_diagnostic",
      type: "ai",
      content: "",
      tool_calls: [{
        id: toolCallId,
        name: "failure_diagnostic",
        args: compactArgs({
          failureCode: diagnostics.failureCode ?? null,
          failureSummary: diagnostics.failureSummary,
          failureDetails: diagnostics.failureDetails ?? null,
          recoveryHint: diagnostics.recoveryHint ?? null,
        }),
        partial_json: JSON.stringify(compactArgs({
          failureCode: diagnostics.failureCode ?? null,
          failureSummary: diagnostics.failureSummary,
          failureDetails: diagnostics.failureDetails ?? null,
          recoveryHint: diagnostics.recoveryHint ?? null,
        })),
      }],
      additional_kwargs: {
        metadata: {
          synthetic: true,
          kind: "diagnostic",
        },
      },
    });
    messages.push({
      id: "tool_failure_diagnostic",
      type: "tool",
      tool_call_id: toolCallId,
      name: "failure_diagnostic",
      content: diagnostics.failureSummary,
      artifact: {
        summary: diagnostics.failureSummary,
        output: diagnostics,
        success: false,
        errorCode: diagnostics.failureCode ?? undefined,
      },
      status: "error",
    });
  }

  return messages;
}
