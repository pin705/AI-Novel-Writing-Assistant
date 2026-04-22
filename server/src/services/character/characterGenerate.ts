import type { LLMProvider } from "@ai-novel/shared/types/llm";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { getBackendLanguage, getBackendMessage, type BackendLocale } from "../../i18n";
import { AppError } from "../../middleware/errorHandler";
import { runStructuredPrompt } from "../../prompting/core/promptRunner";
import {
  baseCharacterFinalPrompt,
  baseCharacterSkeletonPrompt,
} from "../../prompting/prompts/character/character.prompts";
import { buildReferenceContext } from "./characterGenerateReference";

const STORY_FUNCTION_VALUES = ["主角", "反派", "导师", "对照组", "配角"] as const;
const GROWTH_STAGE_VALUES = ["起点", "受挫", "转折", "觉醒", "收束"] as const;

export const characterGenerateConstraintsSchema = z.object({
  storyFunction: z.enum(STORY_FUNCTION_VALUES).optional(),
  externalGoal: z.string().trim().optional(),
  internalNeed: z.string().trim().optional(),
  coreFear: z.string().trim().optional(),
  moralBottomLine: z.string().trim().optional(),
  secret: z.string().trim().optional(),
  coreFlaw: z.string().trim().optional(),
  relationshipHooks: z.string().trim().optional(),
  growthStage: z.enum(GROWTH_STAGE_VALUES).optional(),
  toneStyle: z.string().trim().optional(),
});

export type CharacterGenerateConstraints = z.infer<typeof characterGenerateConstraintsSchema>;

export interface CharacterGenerateInput {
  description: string;
  category: string;
  genre?: string;
  provider?: LLMProvider;
  model?: string;
  novelId?: string;
  knowledgeDocumentIds?: string[];
  bookAnalysisIds?: string[];
  constraints?: CharacterGenerateConstraints;
}

type CreatedBaseCharacter = Awaited<ReturnType<typeof prisma.baseCharacter.create>>;

interface JsonInvokeResult {
  parsed: Record<string, unknown> | null;
  retried: boolean;
  rawText: string;
  errorMessage?: string;
}

interface FinalCharacterPayload {
  name: string;
  role: string;
  personality: string;
  background: string;
  development: string;
  appearance: string;
  weaknesses: string;
  interests: string;
  keyEvents: string;
  tags: string;
  category: string;
}

export interface GenerateBaseCharacterResult {
  data: CreatedBaseCharacter;
  outputAnomaly: boolean;
}

const CHARACTER_PROMPT_LOCALE: BackendLocale = "zh-CN";

function getCharacterGenerateStageLabel(stageLabel: "skeleton" | "final"): string {
  return stageLabel === "skeleton"
    ? getBackendMessage("character.generate.stage.skeleton")
    : getBackendMessage("character.generate.stage.final");
}

function getCharacterStoryFunctionLabel(
  value: string | null | undefined,
  locale?: BackendLocale,
): string {
  const normalized = value?.trim();
  switch (normalized) {
    case "主角":
      return getBackendMessage("character.generate.story_function.protagonist", undefined, locale);
    case "反派":
      return getBackendMessage("character.generate.story_function.antagonist", undefined, locale);
    case "导师":
      return getBackendMessage("character.generate.story_function.mentor", undefined, locale);
    case "对照组":
      return getBackendMessage("character.generate.story_function.foil", undefined, locale);
    case "配角":
      return getBackendMessage("character.generate.story_function.supporting", undefined, locale);
    default:
      return normalized ?? "";
  }
}

function getCharacterGrowthStageLabel(
  value: string | null | undefined,
  locale?: BackendLocale,
): string {
  const normalized = value?.trim();
  switch (normalized) {
    case "起点":
    case "start":
      return getBackendMessage("character.generate.growth_stage.start", undefined, locale);
    case "受挫":
    case "setback":
      return getBackendMessage("character.generate.growth_stage.setback", undefined, locale);
    case "转折":
    case "turning_point":
      return getBackendMessage("character.generate.growth_stage.turning_point", undefined, locale);
    case "觉醒":
    case "awakening":
      return getBackendMessage("character.generate.growth_stage.awakening", undefined, locale);
    case "收束":
    case "resolution":
      return getBackendMessage("character.generate.growth_stage.resolution", undefined, locale);
    default:
      return normalized ?? "";
  }
}

function formatCharacterField(label: string, value: string, locale?: BackendLocale): string {
  if (getBackendLanguage(locale) === "zh") {
    return `${label}：${value}`;
  }
  return `${label}: ${value}`;
}

function joinCharacterSentences(parts: Array<string | undefined>, locale?: BackendLocale): string {
  const filtered = parts.map((part) => part?.trim() ?? "").filter(Boolean);
  if (filtered.length === 0) {
    return "";
  }
  const separator = getBackendLanguage(locale) === "zh" ? "。" : ". ";
  return filtered.join(separator);
}

function joinCharacterInline(parts: Array<string | undefined>, locale?: BackendLocale): string {
  const filtered = parts.map((part) => part?.trim() ?? "").filter(Boolean);
  if (filtered.length === 0) {
    return "";
  }
  const separator = getBackendLanguage(locale) === "zh" ? "；" : "; ";
  return filtered.join(separator);
}

function toTrimmedText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toStringList(value: unknown, limit = 8): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => toTrimmedText(item))
    .filter(Boolean)
    .slice(0, limit);
}

function normalizeConstraints(input: CharacterGenerateConstraints | undefined): CharacterGenerateConstraints | null {
  if (!input) {
    return null;
  }
  const normalized: CharacterGenerateConstraints = {
    storyFunction: input.storyFunction,
    externalGoal: toTrimmedText(input.externalGoal),
    internalNeed: toTrimmedText(input.internalNeed),
    coreFear: toTrimmedText(input.coreFear),
    moralBottomLine: toTrimmedText(input.moralBottomLine),
    secret: toTrimmedText(input.secret),
    coreFlaw: toTrimmedText(input.coreFlaw),
    relationshipHooks: toTrimmedText(input.relationshipHooks),
    growthStage: input.growthStage,
    toneStyle: toTrimmedText(input.toneStyle),
  };
  return Object.values(normalized).some(Boolean) ? normalized : null;
}

function assertConstraintConsistency(category: string, constraints: CharacterGenerateConstraints | null): void {
  if (!constraints?.storyFunction) {
    return;
  }
  const normalizedCategory = category.trim();
  const categoryInSet = STORY_FUNCTION_VALUES.includes(normalizedCategory as (typeof STORY_FUNCTION_VALUES)[number]);
  if (categoryInSet && normalizedCategory !== constraints.storyFunction) {
    throw new AppError("character.error.constraint_story_function_category_conflict", 400, {
      category: getCharacterStoryFunctionLabel(normalizedCategory),
      storyFunction: getCharacterStoryFunctionLabel(constraints.storyFunction),
    });
  }
}

function buildConstraintsText(
  constraints: CharacterGenerateConstraints | null,
  locale: BackendLocale = CHARACTER_PROMPT_LOCALE,
): string {
  if (!constraints) {
    return getBackendMessage("character.generate.constraints.none", undefined, locale);
  }
  const lines = [
    constraints.storyFunction
      ? formatCharacterField(
        getBackendMessage("character.generate.constraints.label.story_function", undefined, locale),
        getCharacterStoryFunctionLabel(constraints.storyFunction, locale),
        locale,
      )
      : "",
    constraints.externalGoal ? formatCharacterField(getBackendMessage("character.generate.constraints.label.external_goal", undefined, locale), constraints.externalGoal, locale) : "",
    constraints.internalNeed ? formatCharacterField(getBackendMessage("character.generate.constraints.label.internal_need", undefined, locale), constraints.internalNeed, locale) : "",
    constraints.coreFear ? formatCharacterField(getBackendMessage("character.generate.constraints.label.core_fear", undefined, locale), constraints.coreFear, locale) : "",
    constraints.moralBottomLine ? formatCharacterField(getBackendMessage("character.generate.constraints.label.moral_bottom_line", undefined, locale), constraints.moralBottomLine, locale) : "",
    constraints.secret ? formatCharacterField(getBackendMessage("character.generate.constraints.label.secret", undefined, locale), constraints.secret, locale) : "",
    constraints.coreFlaw ? formatCharacterField(getBackendMessage("character.generate.constraints.label.core_flaw", undefined, locale), constraints.coreFlaw, locale) : "",
    constraints.relationshipHooks ? formatCharacterField(getBackendMessage("character.generate.constraints.label.relationship_hooks", undefined, locale), constraints.relationshipHooks, locale) : "",
    constraints.growthStage
      ? formatCharacterField(
        getBackendMessage("character.generate.constraints.label.growth_stage", undefined, locale),
        getCharacterGrowthStageLabel(constraints.growthStage, locale),
        locale,
      )
      : "",
    constraints.toneStyle ? formatCharacterField(getBackendMessage("character.generate.constraints.label.tone_style", undefined, locale), constraints.toneStyle, locale) : "",
  ].filter(Boolean);
  return lines.length > 0 ? lines.join("\n") : getBackendMessage("character.generate.constraints.none", undefined, locale);
}

async function invokeJsonWithRetry(
  provider: LLMProvider,
  model: string | undefined,
  temperature: number,
  promptInput:
    | {
        description: string;
        category: string;
        genre: string;
        constraintsText: string;
        referenceContext: string;
      }
    | {
        skeleton: Record<string, unknown>;
        constraintsText: string;
        referenceContext: string;
      },
  stageLabel: "skeleton" | "final",
): Promise<JsonInvokeResult> {
  try {
    const result = stageLabel === "skeleton"
      ? await runStructuredPrompt({
        asset: baseCharacterSkeletonPrompt,
        promptInput: promptInput as {
          description: string;
          category: string;
          genre: string;
          constraintsText: string;
          referenceContext: string;
        },
        options: {
          provider,
          model,
          temperature,
        },
      })
      : await runStructuredPrompt({
        asset: baseCharacterFinalPrompt,
        promptInput: promptInput as {
          skeleton: Record<string, unknown>;
          constraintsText: string;
          referenceContext: string;
        },
        options: {
          provider,
          model,
          temperature,
        },
      });
    return { parsed: result.output as Record<string, unknown>, retried: false, rawText: "" };
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : getBackendMessage("character.generate.error.parse_failed", {
        stageLabel: getCharacterGenerateStageLabel(stageLabel),
      });
    return { parsed: null, retried: false, rawText: "", errorMessage };
  }
}

function buildFallbackSkeleton(input: CharacterGenerateInput, constraints: CharacterGenerateConstraints | null): Record<string, unknown> {
  const description = input.description.trim();
  const growthStart = constraints?.growthStage ?? "start";
  return {
    nameSuggestion: description.slice(0, 12) || "Unnamed Character",
    role: constraints?.storyFunction || input.category.trim(),
    corePersona: constraints?.toneStyle || "rational and restrained with hidden emotional tension",
    surfaceTemperament: constraints?.toneStyle || "calm on the surface, intense underneath",
    coreDrive: constraints?.internalNeed || "needs recognition and emotional safety",
    socialMask: "appears composed and in-control in public, reveals anxiety in private",
    behaviorPatterns: [
      constraints?.externalGoal ? `prioritizes actions around "${constraints.externalGoal}"` : "result-driven in critical moments",
      constraints?.moralBottomLine ? `keeps moral line: "${constraints.moralBottomLine}"` : "keeps a personal bottom line under pressure",
    ],
    triggerPoints: [
      constraints?.coreFear ? `strong stress reaction when touching "${constraints.coreFear}"` : "reacts strongly to betrayal or being underestimated",
    ],
    lifeOrigin: constraints?.relationshipHooks || `derived from user description: ${description}`,
    relationshipNetwork: constraints?.relationshipHooks ? [constraints.relationshipHooks] : ["strong tie to core cast"],
    externalGoal: constraints?.externalGoal || "secure a staged victory while preserving key relationships",
    internalNeed: constraints?.internalNeed || "be understood and accepted",
    coreFear: constraints?.coreFear || "losing control and hurting important people",
    moralBottomLine: constraints?.moralBottomLine || "does not actively harm innocents",
    secret: constraints?.secret || "keeps a decisive truth from the past",
    coreFlaw: constraints?.coreFlaw || "overcontrol that strains relationships",
    growthArc: [
      `${growthStart}: acts for external objective`,
      "turning point: flaw exposed in major conflict with real cost",
      "resolution: integrates inner need with external mission and makes a new choice",
    ],
    keyEvents: [
      "trigger event: pulled into high-pressure conflict",
      "breakthrough event: secret exposed or core relationship ruptures",
      "resolution event: makes a decisive trade-off",
    ],
    dailyAnchors: ["regular solo debrief", "stabilizes mood with fixed rituals"],
    habitualActions: ["brief pause before key responses", "adjusts sleeves when tense"],
    speechStyle: "concise and controlled; direct at decision points",
    talents: ["information synthesis", "rapid situational judgment", "execution under pressure"],
    conflictKeywords: ["control", "trust", "sacrifice"],
    themeKeywords: ["growth", "redemption", "cost"],
    bodyType: "fit build, tense posture, efficient movement",
    facialFeatures: "sharp eye focus and high facial recognizability",
    styleSignature: "utility-first outfit with one repeating signature accessory",
    auraAndVoice: "cool and steady voice, noticeable presence",
    appearance: "clean and capable look with memorable detail",
    toneStyle: constraints?.toneStyle || "restrained, calm, high inner tension",
  };
}

function buildFallbackFinalPayload(
  input: CharacterGenerateInput,
  constraints: CharacterGenerateConstraints | null,
  skeleton: Record<string, unknown>,
  options: {
    usedFallbackSkeleton: boolean;
  },
): FinalCharacterPayload {
  const role = getCharacterStoryFunctionLabel(
    constraints?.storyFunction || toTrimmedText(skeleton.role) || input.category.trim(),
  ) || input.category.trim();

  if (options.usedFallbackSkeleton) {
    return {
      name: input.description.trim().slice(0, 12) || getBackendMessage("character.generate.final.default_name"),
      role,
      personality: joinCharacterSentences([
        formatCharacterField(getBackendMessage("character.generate.final.label.core_persona"), constraints?.toneStyle || getBackendMessage("character.generate.final.default.core_persona")),
        formatCharacterField(getBackendMessage("character.generate.final.label.surface_temperament"), constraints?.toneStyle || getBackendMessage("character.generate.final.default.surface_temperament")),
        formatCharacterField(getBackendMessage("character.generate.final.label.core_drive"), constraints?.internalNeed || getBackendMessage("character.generate.final.default.core_drive")),
        formatCharacterField(getBackendMessage("character.generate.final.label.social_mask"), getBackendMessage("character.generate.final.default.social_mask")),
      ]),
      background: joinCharacterSentences([
        formatCharacterField(
          getBackendMessage("character.generate.final.label.origin"),
          getBackendMessage("character.generate.final.default.origin_from_description", {
            description: input.description.trim(),
          }),
        ),
        formatCharacterField(
          getBackendMessage("character.generate.final.label.relationship_network"),
          constraints?.relationshipHooks || getBackendMessage("character.generate.final.default.relationship_network"),
        ),
        formatCharacterField(
          getBackendMessage("character.generate.final.label.secret"),
          constraints?.secret || getBackendMessage("character.generate.final.default.secret"),
        ),
      ]),
      development: joinCharacterInline([
        getCharacterGrowthStageLabel(constraints?.growthStage || "start"),
        getCharacterGrowthStageLabel("setback"),
        getCharacterGrowthStageLabel("resolution"),
      ]),
      appearance: joinCharacterSentences([
        formatCharacterField(getBackendMessage("character.generate.final.label.body"), getBackendMessage("character.generate.final.default.body")),
        formatCharacterField(getBackendMessage("character.generate.final.label.facial_features"), getBackendMessage("character.generate.final.default.facial_features")),
        formatCharacterField(getBackendMessage("character.generate.final.label.style_signature"), getBackendMessage("character.generate.final.default.style_signature")),
        formatCharacterField(getBackendMessage("character.generate.final.label.aura_voice"), getBackendMessage("character.generate.final.default.aura_voice")),
      ]),
      weaknesses: joinCharacterInline([
        formatCharacterField(getBackendMessage("character.generate.final.label.core_flaw"), constraints?.coreFlaw || getBackendMessage("character.generate.final.default.core_flaw")),
        formatCharacterField(getBackendMessage("character.generate.final.label.cost"), constraints?.coreFear || getBackendMessage("character.generate.final.default.cost")),
      ]),
      interests: getBackendMessage("character.generate.final.default.interests"),
      keyEvents: getBackendMessage("character.generate.final.default.key_events"),
      tags: Array.from(new Set([
        role,
        constraints?.toneStyle?.trim(),
        constraints?.coreFlaw?.trim(),
        constraints?.coreFear?.trim(),
        getBackendMessage("character.generate.final.default.tag.inner_tension"),
        getBackendMessage("character.generate.final.default.tag.relationship_pressure"),
      ].filter(Boolean))).slice(0, 10).join(","),
      category: input.category.trim(),
    };
  }

  const behaviorPatterns = toStringList(skeleton.behaviorPatterns, 4);
  const triggerPoints = toStringList(skeleton.triggerPoints, 3);
  const relationHooks = toStringList(skeleton.relationshipNetwork, 3);
  const growthArc = toStringList(skeleton.growthArc, 3);
  const keyEvents = toStringList(skeleton.keyEvents, 3);
  const dailyAnchors = toStringList(skeleton.dailyAnchors, 3);
  const habitualActions = toStringList(skeleton.habitualActions, 3);
  const talents = toStringList(skeleton.talents, 4);
  const conflictKeywords = toStringList(skeleton.conflictKeywords, 4);
  const themeKeywords = toStringList(skeleton.themeKeywords, 4);

  const personality = joinCharacterSentences([
    formatCharacterField(getBackendMessage("character.generate.final.label.core_persona"), toTrimmedText(skeleton.corePersona) || getBackendMessage("character.generate.final.default.core_persona")),
    formatCharacterField(getBackendMessage("character.generate.final.label.surface_temperament"), toTrimmedText(skeleton.surfaceTemperament) || constraints?.toneStyle || getBackendMessage("character.generate.final.default.surface_temperament")),
    formatCharacterField(getBackendMessage("character.generate.final.label.core_drive"), toTrimmedText(skeleton.coreDrive) || constraints?.internalNeed || getBackendMessage("character.generate.final.default.core_drive")),
    behaviorPatterns.length > 0
      ? formatCharacterField(getBackendMessage("character.generate.final.label.behavior_patterns"), joinCharacterInline(behaviorPatterns))
      : "",
    triggerPoints.length > 0
      ? formatCharacterField(getBackendMessage("character.generate.final.label.emotional_triggers"), joinCharacterInline(triggerPoints))
      : "",
    toTrimmedText(skeleton.socialMask)
      ? formatCharacterField(getBackendMessage("character.generate.final.label.social_mask"), toTrimmedText(skeleton.socialMask))
      : "",
  ]);

  const background = joinCharacterSentences([
    formatCharacterField(
      getBackendMessage("character.generate.final.label.origin"),
      toTrimmedText(skeleton.lifeOrigin) || getBackendMessage("character.generate.final.default.origin_from_description", {
        description: input.description.trim(),
      }),
    ),
    relationHooks.length > 0
      ? formatCharacterField(getBackendMessage("character.generate.final.label.relationship_network"), joinCharacterInline(relationHooks))
      : "",
    formatCharacterField(
      getBackendMessage("character.generate.final.label.secret"),
      toTrimmedText(skeleton.secret) || constraints?.secret || getBackendMessage("character.generate.final.default.secret"),
    ),
  ]);

  const development = growthArc.length > 0
    ? joinCharacterInline(growthArc)
    : joinCharacterInline([
      getCharacterGrowthStageLabel(constraints?.growthStage || "start"),
      getCharacterGrowthStageLabel("setback"),
      getCharacterGrowthStageLabel("resolution"),
    ]);

  const weaknesses = joinCharacterInline([
    formatCharacterField(
      getBackendMessage("character.generate.final.label.core_flaw"),
      toTrimmedText(skeleton.coreFlaw) || constraints?.coreFlaw || getBackendMessage("character.generate.final.default.core_flaw"),
    ),
    formatCharacterField(
      getBackendMessage("character.generate.final.label.cost"),
      toTrimmedText(skeleton.coreFear) || constraints?.coreFear || getBackendMessage("character.generate.final.default.cost"),
    ),
  ]);

  const appearance = joinCharacterSentences([
    formatCharacterField(getBackendMessage("character.generate.final.label.body"), toTrimmedText(skeleton.bodyType) || getBackendMessage("character.generate.final.default.body")),
    formatCharacterField(getBackendMessage("character.generate.final.label.facial_features"), toTrimmedText(skeleton.facialFeatures) || toTrimmedText(skeleton.appearance) || getBackendMessage("character.generate.final.default.facial_features")),
    formatCharacterField(getBackendMessage("character.generate.final.label.style_signature"), toTrimmedText(skeleton.styleSignature) || getBackendMessage("character.generate.final.default.style_signature")),
    formatCharacterField(getBackendMessage("character.generate.final.label.aura_voice"), toTrimmedText(skeleton.auraAndVoice) || getBackendMessage("character.generate.final.default.aura_voice")),
  ]);

  const interests = joinCharacterSentences([
    dailyAnchors.length > 0
      ? formatCharacterField(getBackendMessage("character.generate.final.label.daily_anchors"), joinCharacterInline(dailyAnchors))
      : "",
    habitualActions.length > 0
      ? formatCharacterField(getBackendMessage("character.generate.final.label.habitual_actions"), joinCharacterInline(habitualActions))
      : "",
    toTrimmedText(skeleton.speechStyle)
      ? formatCharacterField(getBackendMessage("character.generate.final.label.speech_style"), toTrimmedText(skeleton.speechStyle))
      : "",
    talents.length > 0
      ? formatCharacterField(getBackendMessage("character.generate.final.label.talents"), joinCharacterInline(talents))
      : "",
  ]);

  const tagSet = new Set<string>([
    role,
    toTrimmedText(skeleton.surfaceTemperament),
    ...talents,
    ...conflictKeywords,
    ...themeKeywords,
  ].filter(Boolean));

  return {
    name: toTrimmedText(skeleton.nameSuggestion) || input.description.trim().slice(0, 12) || getBackendMessage("agent.character.unnamed"),
    role,
    personality: personality || input.description.trim(),
    background: background || getBackendMessage("character.generate.final.default.origin_from_description", {
      description: input.description.trim(),
    }),
    development: development || getBackendMessage("character.generate.final.default.development"),
    appearance: appearance || toTrimmedText(skeleton.appearance),
    weaknesses,
    interests: interests || getBackendMessage("character.generate.final.default.interests"),
    keyEvents: joinCharacterInline(keyEvents) || getBackendMessage("character.generate.final.default.key_events"),
    tags: Array.from(tagSet).slice(0, 10).join(","),
    category: input.category.trim(),
  };
}

function mergeFinalPayload(
  generated: Record<string, unknown> | null,
  fallback: FinalCharacterPayload,
  constraints: CharacterGenerateConstraints | null,
): FinalCharacterPayload {
  const merged: FinalCharacterPayload = {
    name: toTrimmedText(generated?.name) || fallback.name,
    role: constraints?.storyFunction || toTrimmedText(generated?.role) || fallback.role,
    personality: toTrimmedText(generated?.personality) || fallback.personality,
    background: toTrimmedText(generated?.background) || fallback.background,
    development: toTrimmedText(generated?.development) || fallback.development,
    appearance: toTrimmedText(generated?.appearance) || fallback.appearance,
    weaknesses: toTrimmedText(generated?.weaknesses) || fallback.weaknesses,
    interests: toTrimmedText(generated?.interests) || fallback.interests,
    keyEvents: toTrimmedText(generated?.keyEvents) || fallback.keyEvents,
    tags: toTrimmedText(generated?.tags) || fallback.tags,
    category: fallback.category,
  };
  return merged;
}

export async function generateBaseCharacterFromAI(input: CharacterGenerateInput): Promise<GenerateBaseCharacterResult> {
  const constraints = normalizeConstraints(input.constraints);
  assertConstraintConsistency(input.category, constraints);

  console.info("[base-characters.generate] start", {
    category: input.category,
    hasConstraints: Boolean(constraints),
    knowledgeRefCount: input.knowledgeDocumentIds?.length ?? 0,
    bookAnalysisRefCount: input.bookAnalysisIds?.length ?? 0,
  });

  const referenceContext = await buildReferenceContext({
    novelId: input.novelId,
    knowledgeDocumentIds: input.knowledgeDocumentIds,
    bookAnalysisIds: input.bookAnalysisIds,
  });

  const provider = input.provider ?? "deepseek";
  const model = input.model;
  const temperature = 0.6;

  const constraintsText = buildConstraintsText(constraints, CHARACTER_PROMPT_LOCALE);
  const stageOne = await invokeJsonWithRetry(provider, model, temperature, {
    description: input.description,
    category: input.category,
    genre: input.genre ?? getBackendMessage("character.generate.default_genre"),
    constraintsText,
    referenceContext,
  }, "skeleton");
  if (stageOne.retried || !stageOne.parsed) {
    console.warn("[base-characters.generate] stage_one_retry_or_fallback", {
      retried: stageOne.retried,
      parseSucceeded: Boolean(stageOne.parsed),
      errorMessage: stageOne.errorMessage ?? "",
    });
  }

  const skeleton = stageOne.parsed ?? buildFallbackSkeleton(input, constraints);
  const stageTwo = await invokeJsonWithRetry(provider, model, temperature, {
    skeleton,
    constraintsText,
    referenceContext,
  }, "final");
  if (stageTwo.retried || !stageTwo.parsed) {
    console.warn("[base-characters.generate] stage_two_retry_or_fallback", {
      retried: stageTwo.retried,
      parseSucceeded: Boolean(stageTwo.parsed),
      errorMessage: stageTwo.errorMessage ?? "",
    });
  }

  const fallbackPayload = buildFallbackFinalPayload(input, constraints, skeleton, {
    usedFallbackSkeleton: !stageOne.parsed,
  });
  const finalPayload = mergeFinalPayload(stageTwo.parsed, fallbackPayload, constraints);
  const outputAnomaly = !stageOne.parsed || !stageTwo.parsed;

  if (outputAnomaly) {
    console.warn("[base-characters.generate] model_output_anomaly_fallback_used", {
      stageOneParsed: Boolean(stageOne.parsed),
      stageTwoParsed: Boolean(stageTwo.parsed),
    });
  }

  const data = await prisma.baseCharacter.create({
    data: finalPayload,
  });

  console.info("[base-characters.generate] done", {
    outputAnomaly,
    retriedStageOne: stageOne.retried,
    retriedStageTwo: stageTwo.retried,
  });

  return {
    data,
    outputAnomaly,
  };
}
