import { getLLM } from "../../llm/factory";
import { preparePromptExecution, runTextPrompt } from "../../prompting/core/promptRunner";
import { runtimeSetupIdeationPrompt } from "../../prompting/prompts/agent/runtime.prompts";
import { getBackendMessage } from "../../i18n";
import type { StructuredIntent, ToolCall, ToolExecutionContext } from "../types";
import { safeJson, type ToolExecutionResult } from "./runtimeHelpers";

type IdeationLLMFactory = typeof getLLM;

let ideationLLMFactory: IdeationLLMFactory = getLLM;

function resolveIdeationMaxTokens(maxTokens: number | undefined): number | undefined {
  if (typeof maxTokens !== "number" || !Number.isFinite(maxTokens)) {
    return undefined;
  }
  return Math.min(Math.floor(maxTokens), 8000);
}

function truncateFact(value: string, max = 220): string {
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

function toReadableValue(value: unknown): string | null {
  if (typeof value === "string") {
    return truncateFact(value);
  }
  if (typeof value === "number") {
    return String(value);
  }
  return null;
}

function pushFact(lines: string[], labelKey: Parameters<typeof getBackendMessage>[0], value: unknown): void {
  const text = toReadableValue(value);
  if (text) {
    lines.push(getBackendMessage("agent.setup.fact.label_value", {
      label: getBackendMessage(labelKey),
      value: text,
    }));
  }
}

function buildIdeationFacts(results: ToolExecutionResult[], structuredIntent?: StructuredIntent): string {
  const novelContext = getSuccessfulOutput(results, "get_novel_context");
  const storyBible = getSuccessfulOutput(results, "get_story_bible");
  const world = getSuccessfulOutput(results, "get_world_constraints");
  const knowledge = getSuccessfulOutput(results, "search_knowledge");
  const lines: string[] = [];

  if (novelContext) {
    pushFact(lines, "agent.ideation.label.novel_title", novelContext.title);
    pushFact(lines, "agent.ideation.label.novel_description", novelContext.description);
    pushFact(lines, "agent.ideation.label.novel_genre", novelContext.genre);
    pushFact(lines, "agent.ideation.label.novel_style_tone", novelContext.styleTone);
    pushFact(lines, "agent.ideation.label.novel_narrative_pov", novelContext.narrativePov);
    pushFact(lines, "agent.ideation.label.novel_pace_preference", novelContext.pacePreference);
    pushFact(lines, "agent.ideation.label.novel_project_mode", novelContext.projectMode);
    pushFact(lines, "agent.ideation.label.novel_emotion_intensity", novelContext.emotionIntensity);
    pushFact(lines, "agent.ideation.label.novel_ai_freedom", novelContext.aiFreedom);
    pushFact(lines, "agent.ideation.label.novel_default_chapter_length", novelContext.defaultChapterLength);
    pushFact(lines, "agent.ideation.label.novel_world_name", novelContext.worldName);
    pushFact(lines, "agent.ideation.label.novel_outline", novelContext.outline);
    pushFact(lines, "agent.ideation.label.novel_structured_outline", novelContext.structuredOutline);
    pushFact(lines, "agent.ideation.label.novel_chapter_count", novelContext.chapterCount);
    pushFact(lines, "agent.ideation.label.novel_completed_chapter_count", novelContext.completedChapterCount);
  }

  if (storyBible) {
    pushFact(lines, "agent.ideation.label.bible_core_setting", storyBible.coreSetting);
    pushFact(lines, "agent.ideation.label.bible_main_promise", storyBible.mainPromise);
    pushFact(lines, "agent.ideation.label.bible_character_arcs", storyBible.characterArcs);
    pushFact(lines, "agent.ideation.label.bible_world_rules", storyBible.worldRules);
    pushFact(lines, "agent.ideation.label.bible_forbidden_rules", storyBible.forbiddenRules);
  }

  if (world) {
    pushFact(lines, "agent.ideation.label.world_name", world.worldName);
    const constraints = typeof world.constraints === "object" && world.constraints
      ? world.constraints as Record<string, unknown>
      : null;
    if (constraints) {
      pushFact(lines, "agent.ideation.label.world_axioms", constraints.axioms);
      pushFact(lines, "agent.ideation.label.world_magic_system", constraints.magicSystem);
      pushFact(lines, "agent.ideation.label.world_conflicts", constraints.conflicts);
      pushFact(lines, "agent.ideation.label.world_consistency_report", constraints.consistencyReport);
    }
  }

  if (knowledge) {
    pushFact(lines, "agent.ideation.label.knowledge_hit_count", knowledge.hitCount);
    pushFact(lines, "agent.ideation.label.knowledge_context_block", knowledge.contextBlock);
  }

  if (structuredIntent) {
    pushFact(lines, "agent.ideation.label.intent_title", structuredIntent.novelTitle);
    pushFact(lines, "agent.ideation.label.intent_genre", structuredIntent.genre);
    pushFact(lines, "agent.ideation.label.intent_description", structuredIntent.description);
    pushFact(lines, "agent.ideation.label.intent_style", structuredIntent.styleTone);
  }

  return lines.length > 0 ? lines.join("\n") : getBackendMessage("agent.ideation.no_facts");
}

function buildIdeationFallback(results: ToolExecutionResult[], structuredIntent?: StructuredIntent): string {
  const novelContext = getSuccessfulOutput(results, "get_novel_context");
  const title = typeof novelContext?.title === "string" && novelContext.title.trim()
    ? novelContext.title.trim()
    : typeof structuredIntent?.novelTitle === "string" && structuredIntent.novelTitle.trim()
      ? structuredIntent.novelTitle.trim()
      : "";

  if (title) {
    return getBackendMessage("agent.ideation.fallback.with_title", { title });
  }
  return getBackendMessage("agent.ideation.fallback.without_title");
}

export async function composeNovelSetupIdeationAnswer(
  goal: string,
  results: ToolExecutionResult[],
  context: Omit<ToolExecutionContext, "runId" | "agentName">,
  structuredIntent?: StructuredIntent,
): Promise<string> {
  const facts = buildIdeationFacts(results, structuredIntent);
  const fallback = buildIdeationFallback(results, structuredIntent);

  try {
    const resolvedMaxTokens = resolveIdeationMaxTokens(context.maxTokens);
    if (ideationLLMFactory === getLLM) {
      const result = await runTextPrompt({
        asset: runtimeSetupIdeationPrompt,
        promptInput: {
          goal,
          structuredIntentJson: safeJson(structuredIntent ?? { intent: "ideate_novel_setup" }),
          facts,
        },
        options: {
          provider: context.provider ?? "deepseek",
          model: context.model,
          temperature: Math.max(context.temperature ?? 0.75, 0.75),
          maxTokens: resolvedMaxTokens,
        },
      });
      return result.output.trim() || fallback;
    }

    const prepared = preparePromptExecution({
      asset: runtimeSetupIdeationPrompt,
      promptInput: {
        goal,
        structuredIntentJson: safeJson(structuredIntent ?? { intent: "ideate_novel_setup" }),
        facts,
      },
    });
    const llm = await ideationLLMFactory(context.provider ?? "deepseek", {
      model: context.model,
      temperature: Math.max(context.temperature ?? 0.75, 0.75),
      maxTokens: resolvedMaxTokens,
      taskType: runtimeSetupIdeationPrompt.taskType,
      promptMeta: prepared.invocation,
    });
    const result = await llm.invoke(prepared.messages);
    const text = extractTextFromContent(result.content);
    return text || fallback;
  } catch {
    return fallback;
  }
}

export function setNovelSetupIdeationLLMFactoryForTests(factory?: IdeationLLMFactory): void {
  ideationLLMFactory = factory ?? getLLM;
}
