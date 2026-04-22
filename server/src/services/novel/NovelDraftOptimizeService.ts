import type { LLMProvider } from "@ai-novel/shared/types/llm";
import { prisma } from "../../db/prisma";
import { getBackendMessage, type BackendLocale } from "../../i18n";
import { AppError } from "../../middleware/errorHandler";
import { runTextPrompt } from "../../prompting/core/promptRunner";
import {
  novelDraftOptimizeFullPrompt,
  novelDraftOptimizeSelectionPrompt,
} from "../../prompting/prompts/novel/draftOptimize.prompts";

interface DraftOptimizeInput {
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
  currentDraft: string;
  instruction: string;
  mode: "full" | "selection";
  selectedText?: string;
  target: "outline" | "structured_outline";
}

const NOVEL_DRAFT_OPTIMIZE_PROMPT_LOCALE: BackendLocale = "zh-CN";

function toText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content.map((item) => {
      if (typeof item === "string") {
        return item;
      }
      if (item && typeof item === "object" && "text" in item && typeof item.text === "string") {
        return item.text;
      }
      return "";
    }).join("");
  }
  return JSON.stringify(content ?? "");
}

function cleanJsonText(source: string): string {
  return source.replace(/```json|```/gi, "").trim();
}

function extractJSONArray(source: string): string {
  const text = cleanJsonText(source);
  const first = text.indexOf("[");
  const last = text.lastIndexOf("]");
  if (first < 0 || last < 0 || first >= last) {
    throw new AppError("novel.draft_optimize.error.invalid_json_array", 400);
  }
  return text.slice(first, last + 1);
}

function normalizeLineBreaks(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

function buildSelectionContext(currentDraft: string, selectedText: string): {
  before: string;
  after: string;
  index: number;
} {
  const draft = normalizeLineBreaks(currentDraft);
  const selection = normalizeLineBreaks(selectedText);
  const index = draft.indexOf(selection);
  if (index < 0) {
    throw new AppError("novel.draft_optimize.error.selected_text_not_found", 400);
  }
  const windowSize = 180;
  const before = draft.slice(Math.max(0, index - windowSize), index).trim();
  const after = draft.slice(index + selection.length, index + selection.length + windowSize).trim();
  return { before, after, index };
}

function buildWorldContext(novel: {
  world?: {
    name: string;
    worldType?: string | null;
    description?: string | null;
    axioms?: string | null;
    background?: string | null;
    geography?: string | null;
    magicSystem?: string | null;
    politics?: string | null;
    races?: string | null;
    religions?: string | null;
    technology?: string | null;
    conflicts?: string | null;
    history?: string | null;
    economy?: string | null;
    factions?: string | null;
  } | null;
}, locale: BackendLocale = NOVEL_DRAFT_OPTIMIZE_PROMPT_LOCALE): string {
  const labels = {
    sectionTitle: getBackendMessage("novel.draft_optimize.world_context.section_title", undefined, locale),
    empty: getBackendMessage("novel.draft_optimize.world_context.empty", undefined, locale),
    name: getBackendMessage("novel.draft_optimize.world_context.name", undefined, locale),
    type: getBackendMessage("novel.draft_optimize.world_context.type", undefined, locale),
    summary: getBackendMessage("novel.draft_optimize.world_context.summary", undefined, locale),
    axioms: getBackendMessage("novel.draft_optimize.world_context.axioms", undefined, locale),
    background: getBackendMessage("novel.draft_optimize.world_context.background", undefined, locale),
    geography: getBackendMessage("novel.draft_optimize.world_context.geography", undefined, locale),
    powerSystem: getBackendMessage("novel.draft_optimize.world_context.power_system", undefined, locale),
    politics: getBackendMessage("novel.draft_optimize.world_context.politics", undefined, locale),
    races: getBackendMessage("novel.draft_optimize.world_context.races", undefined, locale),
    religions: getBackendMessage("novel.draft_optimize.world_context.religions", undefined, locale),
    technology: getBackendMessage("novel.draft_optimize.world_context.technology", undefined, locale),
    history: getBackendMessage("novel.draft_optimize.world_context.history", undefined, locale),
    economy: getBackendMessage("novel.draft_optimize.world_context.economy", undefined, locale),
    factions: getBackendMessage("novel.draft_optimize.world_context.factions", undefined, locale),
    conflicts: getBackendMessage("novel.draft_optimize.world_context.conflicts", undefined, locale),
    unspecified: getBackendMessage("novel.draft_optimize.world_context.unspecified", undefined, locale),
    none: getBackendMessage("novel.draft_optimize.world_context.none", undefined, locale),
  };
  const world = novel.world;
  if (!world) {
    return labels.empty;
  }
  let axiomsText = labels.none;
  if (world.axioms) {
    try {
      const parsed = JSON.parse(world.axioms) as string[];
      axiomsText = Array.isArray(parsed) && parsed.length > 0
        ? parsed.map((item) => `- ${item}`).join("\n")
        : world.axioms;
    } catch {
      axiomsText = world.axioms;
    }
  }
  return `${labels.sectionTitle}:
${labels.name}: ${world.name}
${labels.type}: ${world.worldType ?? labels.unspecified}
${labels.summary}: ${world.description ?? labels.none}
${labels.axioms}:
${axiomsText}
${labels.background}: ${world.background ?? labels.none}
${labels.geography}: ${world.geography ?? labels.none}
${labels.powerSystem}: ${world.magicSystem ?? labels.none}
${labels.politics}: ${world.politics ?? labels.none}
${labels.races}: ${world.races ?? labels.none}
${labels.religions}: ${world.religions ?? labels.none}
${labels.technology}: ${world.technology ?? labels.none}
${labels.history}: ${world.history ?? labels.none}
${labels.economy}: ${world.economy ?? labels.none}
${labels.factions}: ${world.factions ?? labels.none}
${labels.conflicts}: ${world.conflicts ?? labels.none}`;
}

export class NovelDraftOptimizeService {
  async optimizePreview(novelId: string, input: DraftOptimizeInput): Promise<{
    optimizedDraft: string;
    mode: "full" | "selection";
    selectedText?: string | null;
  }> {
    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
      include: { world: true, characters: true },
    });
    if (!novel) {
      throw new AppError("novel.draft_optimize.error.novel_not_found", 404);
    }

    const currentDraft = input.currentDraft.trim();
    if (!currentDraft) {
      throw new AppError("novel.draft_optimize.error.current_draft_required", 400);
    }

    const worldContext = buildWorldContext(novel, NOVEL_DRAFT_OPTIMIZE_PROMPT_LOCALE);
    const charactersText = novel.characters.length > 0
      ? novel.characters
          .map((c) => `- ${c.name} (${c.role})${c.personality ? `：${c.personality.slice(0, 80)}` : ""}`)
          .join("\n")
      : getBackendMessage("novel.draft_optimize.character_context.none", undefined, NOVEL_DRAFT_OPTIMIZE_PROMPT_LOCALE);

    if (input.mode === "selection") {
      const selectedText = input.selectedText?.trim();
      if (!selectedText) {
        throw new AppError("novel.draft_optimize.error.selected_text_required", 400);
      }
      const selectionContext = buildSelectionContext(currentDraft, selectedText);
      const rewrittenSelection = await runTextPrompt({
        asset: novelDraftOptimizeSelectionPrompt,
        promptInput: {
          target: input.target,
          instruction: input.instruction,
          charactersText,
          worldContext,
          before: selectionContext.before,
          after: selectionContext.after,
          selectedText,
        },
        options: {
          provider: input.provider ?? "deepseek",
          model: input.model,
          temperature: input.temperature ?? 0.4,
        },
      });
      const optimizedSelection = rewrittenSelection.output.trim() || selectedText;
      return {
        optimizedDraft: optimizedSelection,
        mode: "selection",
        selectedText,
      };
    }

    const rewritten = await runTextPrompt({
      asset: novelDraftOptimizeFullPrompt,
      promptInput: {
        target: input.target,
        instruction: input.instruction,
        charactersText,
        worldContext,
        currentDraft,
      },
      options: {
        provider: input.provider ?? "deepseek",
        model: input.model,
        temperature: input.temperature ?? 0.4,
      },
    });

    let optimizedDraft = rewritten.output.trim() || currentDraft;
    if (input.target === "structured_outline") {
      try {
        const jsonText = extractJSONArray(optimizedDraft);
        JSON.parse(jsonText);
        optimizedDraft = jsonText;
      } catch {
        // keep raw response for manual correction when model output is non-JSON
      }
    }
    return {
      optimizedDraft,
      mode: "full",
      selectedText: null,
    };
  }
}
