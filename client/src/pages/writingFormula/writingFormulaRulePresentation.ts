import type {
  CharacterRules,
  LanguageRules,
  NarrativeRules,
  RhythmRules,
} from "@ai-novel/shared/types/styleEngine";

export type RuleSection = "narrativeRules" | "characterRules" | "languageRules" | "rhythmRules";
type RuleObject = NarrativeRules | CharacterRules | LanguageRules | RhythmRules;

export type Translator = (key: string, values?: Record<string, string | number>) => string;

export interface RuleEntry {
  key: string;
  label: string;
  value: string;
}

const FIELD_ORDER: Record<RuleSection, string[]> = {
  narrativeRules: [
    "summary",
    "progressionMode",
    "sceneUnitPattern",
    "multiPov",
    "looping",
    "endingStyle",
    "povSwitchStyle",
  ],
  characterRules: [
    "summary",
    "dialogueStyle",
    "emotionExpression",
    "defenseMechanisms",
    "allowSelfReflection",
    "facePriority",
  ],
  languageRules: [
    "summary",
    "register",
    "roughness",
    "sentenceVariation",
    "allowIncompleteSentences",
    "allowSwearing",
    "allowUselessDetails",
  ],
  rhythmRules: [
    "summary",
    "pace",
    "paragraphDensity",
    "allowFragmentedFlow",
    "actionOverExplanation",
  ],
};

const VALUE_KEYS: Record<string, string[]> = {
  progressionMode: [
    "time_sequence",
    "goal_driven",
    "mystery_escalation",
    "relationship_push_pull",
    "multi_thread",
    "scene_immersion",
    "fact_driven",
    "contrast_driven",
  ],
  endingStyle: [
    "unresolved",
    "hook",
    "suspense",
    "emotional_hook",
    "cross_hook",
    "soft_open",
    "pressure_continue",
    "bitter_aftertaste",
  ],
  povSwitchStyle: ["controlled"],
  emotionExpression: [
    "behavior_only",
    "dialogue_and_action",
    "reaction_only",
    "subtext",
    "mixed",
    "light_behavior",
    "suppressed",
    "deadpan",
  ],
  dialogueStyle: [
    "short_colloquial",
    "direct",
    "restrained",
    "subtext_heavy",
    "distinct_by_role",
    "daily_natural",
    "informational",
    "deadpan_colloquial",
  ],
  register: [
    "colloquial",
    "direct",
    "restrained",
    "natural",
    "flexible",
    "professional",
  ],
  sentenceVariation: ["high", "medium", "medium_high"],
  pace: ["medium_fast", "fast", "medium", "medium_slow", "balanced", "slow"],
  paragraphDensity: ["high", "medium", "medium_high"],
};

const BOOLEAN_KEYS = new Set([
  "multiPov",
  "looping",
  "allowSelfReflection",
  "facePriority",
  "allowIncompleteSentences",
  "allowSwearing",
  "allowUselessDetails",
  "allowFragmentedFlow",
  "actionOverExplanation",
]);

function compactText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim();
}

function humanizeUnknownToken(value: string): string {
  return value.replace(/_/g, " ").trim();
}

function formatBooleanValue(t: Translator, key: string, value: boolean): string {
  const bucket = BOOLEAN_KEYS.has(key) ? key : "default";
  const subKey = value ? "true" : "false";
  return t(`writingFormula.rulePresentation.booleanValues.${bucket}.${subKey}`);
}

function formatArrayValue(value: unknown[]): string {
  return value
    .map((item) => {
      if (typeof item === "string") {
        return humanizeUnknownToken(item);
      }
      return String(item);
    })
    .filter(Boolean)
    .join(" / ");
}

export function formatRuleFieldLabel(t: Translator, section: RuleSection, key: string): string {
  const translated = t(`writingFormula.rulePresentation.fieldLabels.${section}.${key}`);
  const expectedFullKey = `writingFormula.rulePresentation.fieldLabels.${section}.${key}`;
  if (translated && translated !== expectedFullKey) {
    return translated;
  }
  return humanizeUnknownToken(key);
}

export function formatRuleFieldValue(
  t: Translator,
  _section: RuleSection,
  key: string,
  value: unknown,
): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "boolean") {
    return formatBooleanValue(t, key, value);
  }

  if (typeof value === "number") {
    if (key === "roughness") {
      return t("writingFormula.rulePresentation.roughnessValue", { value: Math.round(value * 100) });
    }
    return String(value);
  }

  if (Array.isArray(value)) {
    return formatArrayValue(value);
  }

  if (typeof value === "string") {
    const normalized = compactText(value);
    if (!normalized) {
      return "";
    }
    const knownValues = VALUE_KEYS[key];
    if (knownValues && knownValues.includes(normalized)) {
      const translated = t(`writingFormula.rulePresentation.fieldValues.${key}.${normalized}`);
      const expectedKey = `writingFormula.rulePresentation.fieldValues.${key}.${normalized}`;
      if (translated && translated !== expectedKey) {
        return translated;
      }
    }
    return normalized;
  }

  return "";
}

export function buildReadableRuleEntries(
  t: Translator,
  section: RuleSection,
  rules: RuleObject | Record<string, unknown>,
): RuleEntry[] {
  const record = rules as Record<string, unknown>;
  const keySet = new Set<string>([
    ...FIELD_ORDER[section],
    ...Object.keys(record),
  ]);

  return Array.from(keySet)
    .map((key) => ({
      key,
      label: formatRuleFieldLabel(t, section, key),
      value: formatRuleFieldValue(t, section, key, record[key]),
    }))
    .filter((entry) => Boolean(entry.value))
    .sort((left, right) => {
      const leftIndex = FIELD_ORDER[section].indexOf(left.key);
      const rightIndex = FIELD_ORDER[section].indexOf(right.key);
      const normalizedLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
      const normalizedRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
      return normalizedLeft - normalizedRight;
    });
}

export function buildReadableRuleSummary(
  t: Translator,
  section: RuleSection,
  rules: RuleObject | Record<string, unknown>,
  fallback: string,
): string {
  const entries = buildReadableRuleEntries(t, section, rules);
  if (entries.length === 0) {
    return fallback;
  }

  const separator = t("writingFormula.landingItems.ruleSummarySeparator");
  return entries
    .slice(0, 3)
    .map((entry) =>
      entry.key === "summary"
        ? entry.value
        : t("writingFormula.landingItems.ruleSummaryEntry", { label: entry.label, value: entry.value }),
    )
    .join(separator);
}
