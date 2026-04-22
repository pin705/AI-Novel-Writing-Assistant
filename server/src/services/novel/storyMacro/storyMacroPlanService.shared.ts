import type { StoryMacroField, StoryMacroFieldValue, StoryMacroPlan } from "@ai-novel/shared/types/storyMacro";
import type { NovelStoryMode } from "@ai-novel/shared/types/storyMode";
import { getBackendMessage, type BackendLocale } from "../../../i18n";
import { AppError } from "../../../middleware/errorHandler";
import { buildBookFramingSummary } from "../bookFraming";
import { buildStoryModePromptBlock } from "../../storyMode/storyModeProfile";
import {
  EMPTY_DECOMPOSITION,
  EMPTY_EXPANSION,
  type StoryMacroEditablePlan,
  normalizeConflictLayers,
  normalizeConstraints,
  normalizeDecomposition,
  normalizeExpansion,
} from "./storyMacroPlanUtils";

const STORY_MACRO_PROMPT_LOCALE: BackendLocale = "zh-CN";

export interface StoryMacroNovelContext {
  id: string;
  title: string;
  targetAudience: string | null;
  bookSellingPoint: string | null;
  competingFeel: string | null;
  first30ChapterPromise: string | null;
  commercialTagsJson: string | null;
  styleTone: string | null;
  narrativePov: string | null;
  pacePreference: string | null;
  emotionIntensity: string | null;
  estimatedChapterCount: number | null;
  genre: { name: string } | null;
  primaryStoryMode: NovelStoryMode | null;
  secondaryStoryMode: NovelStoryMode | null;
}

export function formatProjectContext(
  novel: StoryMacroNovelContext,
  worldSliceContext = "",
  locale: BackendLocale = STORY_MACRO_PROMPT_LOCALE,
): string {
  const bookFramingSummary = buildBookFramingSummary(novel);
  const storyModeBlock = buildStoryModePromptBlock({
    primary: novel.primaryStoryMode,
    secondary: novel.secondaryStoryMode,
  });

  return [
    novel.title ? `${getBackendMessage("story_macro.prompt.project_context.title", undefined, locale)}: ${novel.title}` : "",
    novel.genre?.name ? `${getBackendMessage("story_macro.prompt.project_context.genre", undefined, locale)}: ${novel.genre.name}` : "",
    bookFramingSummary ? `${getBackendMessage("story_macro.prompt.project_context.framing", undefined, locale)}:\n${bookFramingSummary}` : "",
    storyModeBlock,
    novel.styleTone ? `${getBackendMessage("story_macro.prompt.project_context.style", undefined, locale)}: ${novel.styleTone}` : "",
    novel.narrativePov ? `${getBackendMessage("story_macro.prompt.project_context.pov", undefined, locale)}: ${novel.narrativePov}` : "",
    novel.pacePreference ? `${getBackendMessage("story_macro.prompt.project_context.pace", undefined, locale)}: ${novel.pacePreference}` : "",
    novel.emotionIntensity ? `${getBackendMessage("story_macro.prompt.project_context.emotion", undefined, locale)}: ${novel.emotionIntensity}` : "",
    novel.estimatedChapterCount ? `${getBackendMessage("story_macro.prompt.project_context.chapter_count", undefined, locale)}: ${novel.estimatedChapterCount}` : "",
    worldSliceContext.trim(),
  ].filter(Boolean).join("\n");
}

export function toEditablePlan(plan: StoryMacroPlan | null | undefined): StoryMacroEditablePlan {
  return {
    expansion: normalizeExpansion(plan?.expansion ?? EMPTY_EXPANSION),
    decomposition: normalizeDecomposition(plan?.decomposition ?? EMPTY_DECOMPOSITION),
    constraints: normalizeConstraints(plan?.constraints ?? []),
  };
}

function normalizeStringList(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, maxItems);
}

export function normalizeRegeneratedFieldValue(field: StoryMacroField, value: unknown): StoryMacroFieldValue {
  if (field === "conflict_layers") {
    const layers = normalizeConflictLayers(value);
    if (!layers.external || !layers.internal || !layers.relational) {
      throw new AppError("story_macro.error.invalid_conflict_layers", 400);
    }
    return layers;
  }
  if (field === "major_payoffs" || field === "setpiece_seeds" || field === "constraints") {
    const arrayValue = field === "constraints"
      ? normalizeConstraints(value)
      : normalizeStringList(value, field === "setpiece_seeds" ? 3 : 5);
    if (arrayValue.length === 0) {
      throw new AppError("story_macro.error.invalid_field_list", 400, { field });
    }
    return arrayValue;
  }
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError("story_macro.error.invalid_field_value", 400, { field });
  }
  return value.trim();
}
