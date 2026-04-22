import crypto from "node:crypto";
import type {
  CreativeHubInterrupt,
  CreativeHubMessage,
  CreativeHubResourceBinding,
  CreativeHubThread,
} from "@ai-novel/shared/types/creativeHub";
import type { AgentRunStatus } from "@ai-novel/shared/types/agent";
import { getBackendLanguage, getBackendMessage, getRequestLocale } from "../i18n";

export function toBindings(bindings?: CreativeHubResourceBinding): CreativeHubResourceBinding {
  return {
    novelId: bindings?.novelId ?? null,
    chapterId: bindings?.chapterId ?? null,
    worldId: bindings?.worldId ?? null,
    taskId: bindings?.taskId ?? null,
    bookAnalysisId: bindings?.bookAnalysisId ?? null,
    formulaId: bindings?.formulaId ?? null,
    styleProfileId: bindings?.styleProfileId ?? null,
    baseCharacterId: bindings?.baseCharacterId ?? null,
    knowledgeDocumentIds: bindings?.knowledgeDocumentIds ?? [],
  };
}

export function describeBindings(bindings: CreativeHubResourceBinding): string | null {
  const separator = getBackendLanguage(getRequestLocale()) === "zh" ? "，" : ", ";
  const parts = [
    bindings.novelId
      ? getBackendMessage("creativeHub.runtime.binding.entry", {
        label: getBackendMessage("creativeHub.runtime.binding.label.novel_id"),
        value: bindings.novelId,
      })
      : null,
    bindings.chapterId
      ? getBackendMessage("creativeHub.runtime.binding.entry", {
        label: getBackendMessage("creativeHub.runtime.binding.label.chapter_id"),
        value: bindings.chapterId,
      })
      : null,
    bindings.worldId
      ? getBackendMessage("creativeHub.runtime.binding.entry", {
        label: getBackendMessage("creativeHub.runtime.binding.label.world_id"),
        value: bindings.worldId,
      })
      : null,
    bindings.taskId
      ? getBackendMessage("creativeHub.runtime.binding.entry", {
        label: getBackendMessage("creativeHub.runtime.binding.label.task_id"),
        value: bindings.taskId,
      })
      : null,
    bindings.bookAnalysisId
      ? getBackendMessage("creativeHub.runtime.binding.entry", {
        label: getBackendMessage("creativeHub.runtime.binding.label.book_analysis_id"),
        value: bindings.bookAnalysisId,
      })
      : null,
    bindings.formulaId
      ? getBackendMessage("creativeHub.runtime.binding.entry", {
        label: getBackendMessage("creativeHub.runtime.binding.label.formula_id"),
        value: bindings.formulaId,
      })
      : null,
    bindings.styleProfileId
      ? getBackendMessage("creativeHub.runtime.binding.entry", {
        label: getBackendMessage("creativeHub.runtime.binding.label.style_profile_id"),
        value: bindings.styleProfileId,
      })
      : null,
    bindings.baseCharacterId
      ? getBackendMessage("creativeHub.runtime.binding.entry", {
        label: getBackendMessage("creativeHub.runtime.binding.label.base_character_id"),
        value: bindings.baseCharacterId,
      })
      : null,
    bindings.knowledgeDocumentIds?.length
      ? getBackendMessage("creativeHub.runtime.binding.entry", {
        label: getBackendMessage("creativeHub.runtime.binding.label.knowledge_document_ids"),
        value: bindings.knowledgeDocumentIds.join(","),
      })
      : null,
  ].filter((item): item is string => Boolean(item));

  return parts.length > 0 ? parts.join(separator) : null;
}

export function prependBindingMessage(
  messages: CreativeHubMessage[],
  bindings: CreativeHubResourceBinding,
): CreativeHubMessage[] {
  const summary = describeBindings(bindings);
  if (!summary) {
    return messages;
  }

  return [
    {
      id: "creative_hub_binding_context",
      type: "system",
      content: getBackendMessage("creativeHub.runtime.binding.system_message", { summary }),
      additional_kwargs: {
        source: "creative_hub_binding",
        bindings,
      },
    },
    ...messages,
  ];
}

export function toChatMessages(
  messages: CreativeHubMessage[],
): Array<{ role: "user" | "assistant" | "system"; content: string }> {
  return messages
    .map((message) => {
      if (message.type === "human") {
        return {
          role: "user" as const,
          content: typeof message.content === "string" ? message.content : JSON.stringify(message.content),
        };
      }
      if (message.type === "ai") {
        return {
          role: "assistant" as const,
          content: typeof message.content === "string" ? message.content : JSON.stringify(message.content),
        };
      }
      if (message.type === "system") {
        return {
          role: "system" as const,
          content: typeof message.content === "string" ? message.content : JSON.stringify(message.content),
        };
      }
      return null;
    })
    .filter((item): item is { role: "user" | "assistant" | "system"; content: string } => Boolean(item?.content?.trim()));
}

export function appendAssistantMessage(
  messages: CreativeHubMessage[],
  assistantOutput: string,
  runId?: string | null,
): CreativeHubMessage[] {
  if (!assistantOutput.trim()) {
    return messages;
  }

  return [
    ...messages,
    {
      id: `ai_${runId ?? crypto.randomUUID()}`,
      type: "ai",
      content: assistantOutput,
      additional_kwargs: { source: "creative_hub" },
    },
  ];
}

export function parseStepRecord(value: string | null | undefined): Record<string, unknown> {
  if (!value?.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

export function deriveNextBindingsFromRunSteps(
  bindings: CreativeHubResourceBinding,
  steps: Array<{
    stepType: string;
    status: string;
    inputJson?: string | null;
    outputJson?: string | null;
  }>,
): CreativeHubResourceBinding {
  const nextBindings = toBindings(bindings);

  for (let index = steps.length - 1; index >= 0; index -= 1) {
    const step = steps[index];
    if (step.stepType !== "tool_result" || step.status !== "succeeded") {
      continue;
    }

    const input = parseStepRecord(step.inputJson);
    const output = parseStepRecord(step.outputJson);
    const tool = typeof input.tool === "string" ? input.tool : "";

    if (
      (tool === "create_novel" || tool === "select_novel_workspace")
      && typeof output.novelId === "string"
      && output.novelId.trim()
    ) {
      const nextNovelId = output.novelId.trim();
      if (nextBindings.novelId !== nextNovelId) {
        nextBindings.chapterId = null;
      }
      nextBindings.novelId = nextNovelId;
    }

    if (
      (tool === "generate_world_for_novel" || tool === "bind_world_to_novel")
      && typeof output.worldId === "string"
      && output.worldId.trim()
    ) {
      nextBindings.worldId = output.worldId.trim();
      if (typeof output.novelId === "string" && output.novelId.trim()) {
        nextBindings.novelId = output.novelId.trim();
      }
    }

    if (tool === "unbind_world_from_novel") {
      nextBindings.worldId = null;
      if (typeof output.novelId === "string" && output.novelId.trim()) {
        nextBindings.novelId = output.novelId.trim();
      }
    }
  }

  return nextBindings;
}

export function deriveThreadStatusFromRunStatus(status: AgentRunStatus): CreativeHubThread["status"] {
  if (status === "failed") {
    return "error";
  }
  if (status === "waiting_approval") {
    return "interrupted";
  }
  if (status === "running" || status === "queued") {
    return "busy";
  }
  return "idle";
}

export function buildInterrupt(payload: {
  approvalId: string;
  runId: string;
  summary: string;
  targetType: string;
  targetId: string;
}): CreativeHubInterrupt {
  return {
    id: payload.approvalId,
    approvalId: payload.approvalId,
    runId: payload.runId,
    title: getBackendMessage("creativeHub.runtime.interrupt.title.approval"),
    summary: payload.summary,
    targetType: payload.targetType,
    targetId: payload.targetId,
    resumable: true,
    createdAt: new Date().toISOString(),
    metadata: payload,
  };
}
