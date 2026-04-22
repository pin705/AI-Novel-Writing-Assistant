import { getLLM } from "../../llm/factory";
import { preparePromptExecution, runTextPrompt } from "../../prompting/core/promptRunner";
import { runtimeSetupGuidancePrompt } from "../../prompting/prompts/agent/runtime.prompts";
import { getBackendMessage } from "../../i18n";
import type { StructuredIntent, ToolCall, ToolExecutionContext } from "../types";
import type { ToolExecutionResult } from "./runtimeHelpers";
import {
  buildNovelSetupGuidanceFacts,
  formatNovelSetupGuidance,
  parseNovelSetupStatus,
} from "./novelSetupResponses";

type GuidanceScene =
  | "create_missing_title"
  | "produce_missing_title"
  | "create_setup"
  | "select_setup";

type GuidanceLLMFactory = typeof getLLM;

let guidanceLLMFactory: GuidanceLLMFactory = getLLM;

function resolveGuidanceMaxTokens(maxTokens: number | undefined): number | undefined {
  if (typeof maxTokens !== "number" || !Number.isFinite(maxTokens)) {
    return undefined;
  }
  return Math.min(Math.floor(maxTokens), 8000);
}

function truncateFact(value: string, max = 160): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

function extractTextFromContent(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (item && typeof item === "object" && "text" in item && typeof item.text === "string") {
          return item.text;
        }
        return "";
      })
      .join("")
      .trim();
  }
  return "";
}

function getSuccessfulOutput(results: ToolExecutionResult[], tool: ToolCall["tool"]): Record<string, unknown> | null {
  return results.find((item) => item.success && item.tool === tool && item.output)?.output ?? null;
}

function buildIntentFacts(structuredIntent?: StructuredIntent): string {
  if (!structuredIntent) {
    return getBackendMessage("agent.setup.intent.none");
  }
  const lines = [
    structuredIntent.novelTitle
      ? getBackendMessage("agent.setup.intent.title_known", { value: truncateFact(structuredIntent.novelTitle) })
      : getBackendMessage("agent.setup.intent.title_missing"),
    structuredIntent.genre
      ? getBackendMessage("agent.setup.intent.genre_known", { value: truncateFact(structuredIntent.genre) })
      : null,
    structuredIntent.description
      ? getBackendMessage("agent.setup.intent.description_known", { value: truncateFact(structuredIntent.description) })
      : null,
    structuredIntent.styleTone
      ? getBackendMessage("agent.setup.intent.style_known", { value: truncateFact(structuredIntent.styleTone) })
      : null,
  ].filter((item): item is string => Boolean(item));

  return lines.length > 0 ? lines.join("\n") : getBackendMessage("agent.setup.intent.none");
}

function fallbackForMissingTitle(scene: GuidanceScene): string {
  if (scene === "produce_missing_title") {
    return getBackendMessage("agent.setup.fallback.missing_title.produce");
  }
  return getBackendMessage("agent.setup.fallback.missing_title.create");
}

async function composeWarmGuidance(input: {
  goal: string;
  scene: GuidanceScene;
  context: Omit<ToolExecutionContext, "runId" | "agentName">;
  facts: string;
  fallback: string;
  structuredIntent?: StructuredIntent;
}): Promise<string> {
  try {
    const resolvedMaxTokens = resolveGuidanceMaxTokens(input.context.maxTokens);
    const sceneInstruction = input.scene === "create_missing_title"
      ? getBackendMessage("agent.setup.prompt.scene.create_missing_title")
      : input.scene === "produce_missing_title"
        ? getBackendMessage("agent.setup.prompt.scene.produce_missing_title")
        : input.scene === "create_setup"
          ? getBackendMessage("agent.setup.prompt.scene.create_setup")
          : getBackendMessage("agent.setup.prompt.scene.select_setup");
    if (guidanceLLMFactory === getLLM) {
      const result = await runTextPrompt({
        asset: runtimeSetupGuidancePrompt,
        promptInput: {
          sceneInstruction,
          goal: input.goal,
          intentFacts: buildIntentFacts(input.structuredIntent),
          knownFacts: input.facts,
        },
        options: {
          provider: input.context.provider ?? "deepseek",
          model: input.context.model,
          temperature: Math.max(input.context.temperature ?? 0.7, 0.7),
          maxTokens: resolvedMaxTokens,
        },
      });
      return result.output.trim() || input.fallback;
    }

    const prepared = preparePromptExecution({
      asset: runtimeSetupGuidancePrompt,
      promptInput: {
        sceneInstruction,
        goal: input.goal,
        intentFacts: buildIntentFacts(input.structuredIntent),
        knownFacts: input.facts,
      },
    });
    const llm = await guidanceLLMFactory(input.context.provider ?? "deepseek", {
      model: input.context.model,
      temperature: Math.max(input.context.temperature ?? 0.7, 0.7),
      maxTokens: resolvedMaxTokens,
      taskType: runtimeSetupGuidancePrompt.taskType,
      promptMeta: prepared.invocation,
    });
    const result = await llm.invoke(prepared.messages);
    const text = extractTextFromContent(result.content);
    return text || input.fallback;
  } catch {
    return input.fallback;
  }
}

export async function composeCreateNovelSetupAnswer(
  goal: string,
  results: ToolExecutionResult[],
  context: Omit<ToolExecutionContext, "runId" | "agentName">,
  structuredIntent?: StructuredIntent,
): Promise<string> {
  const created = getSuccessfulOutput(results, "create_novel");
  if (!created) {
    return composeWarmGuidance({
      goal,
      scene: "create_missing_title",
      context,
      structuredIntent,
      facts: getBackendMessage("agent.setup.facts.no_created_novel"),
      fallback: fallbackForMissingTitle("create_missing_title"),
    });
  }

  const title = typeof created.title === "string" ? created.title.trim() : "";
  const setup = parseNovelSetupStatus(created.setup);
  if (title && setup) {
    return composeWarmGuidance({
      goal,
      scene: "create_setup",
      context,
      structuredIntent,
      facts: buildNovelSetupGuidanceFacts(setup),
      fallback: formatNovelSetupGuidance(getBackendMessage("agent.setup.guidance.create_prefix", { title }), setup),
    });
  }

  return title
    ? getBackendMessage("agent.setup.result.created_titled", { title })
    : getBackendMessage("agent.setup.result.created_generic");
}

export async function composeSelectNovelWorkspaceSetupAnswer(
  goal: string,
  results: ToolExecutionResult[],
  context: Omit<ToolExecutionContext, "runId" | "agentName">,
  structuredIntent?: StructuredIntent,
): Promise<string> {
  const selected = getSuccessfulOutput(results, "select_novel_workspace");
  if (!selected) {
    return getBackendMessage("agent.setup.result.select_prompt");
  }

  const title = typeof selected.title === "string" ? selected.title.trim() : "";
  const setup = parseNovelSetupStatus(selected.setup);
  if (title && setup && setup.stage !== "ready_for_production") {
    return composeWarmGuidance({
      goal,
      scene: "select_setup",
      context,
      structuredIntent,
      facts: buildNovelSetupGuidanceFacts(setup),
      fallback: formatNovelSetupGuidance(getBackendMessage("agent.setup.guidance.select_prefix", { title }), setup),
    });
  }

  return title
    ? getBackendMessage("agent.setup.result.switched_titled", { title })
    : getBackendMessage("agent.setup.result.switched_generic");
}

export async function composeMissingNovelKickoffAnswer(
  goal: string,
  context: Omit<ToolExecutionContext, "runId" | "agentName">,
  structuredIntent: StructuredIntent | undefined,
  scene: "create_missing_title" | "produce_missing_title",
): Promise<string> {
  return composeWarmGuidance({
    goal,
    scene,
    context,
    structuredIntent,
    facts: [
      getBackendMessage("agent.setup.facts.no_novel_context"),
      structuredIntent?.novelTitle
        ? getBackendMessage("agent.setup.facts.title_clue", { value: truncateFact(structuredIntent.novelTitle) })
        : getBackendMessage("agent.setup.facts.no_reliable_title"),
    ].join("\n"),
    fallback: fallbackForMissingTitle(scene),
  });
}

export function setNovelSetupGuidanceLLMFactoryForTests(factory?: GuidanceLLMFactory): void {
  guidanceLLMFactory = factory ?? getLLM;
}
