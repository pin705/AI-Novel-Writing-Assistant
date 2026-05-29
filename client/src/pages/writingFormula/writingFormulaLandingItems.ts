import {
  buildStyleIntentSummary,
  type StyleBinding,
  type StyleProfile,
} from "@ai-novel/shared/types/styleEngine";
import {
  buildReadableRuleEntries,
  buildReadableRuleSummary,
  type Translator,
} from "./writingFormulaRulePresentation";
import { getStyleProfileOriginLabel, isStarterStyleProfile } from "./writingFormulaV2.shared";

export interface LandingProfileItem {
  id: string;
  name: string;
  originLabel: string;
  summaryLine: string;
  detailLines: string[];
  description: string;
  recentNovelTitle?: string | null;
  category?: string | null;
  tags: string[];
  applicableGenres: string[];
  narrativeSummary: string;
  characterSummary: string;
  languageSummary: string;
  rhythmSummary: string;
  antiAiFocus: string[];
  antiAiRuleNames: string[];
  sourceTypeLabel: string;
  sourceContentPreview?: string | null;
  extractedFeatureCount: number;
  highRiskFeatureCount: number;
  selectedPresetLabel?: string | null;
  presetLabels: string[];
  extractionAntiAiRecommendationCount: number;
  bindingCount: number;
  updatedAtLabel: string;
  isStarter: boolean;
}

interface BuildLandingProfileItemsParams {
  t: Translator;
  profiles: StyleProfile[];
  allBindings: StyleBinding[];
  novelTitleMap: Record<string, string>;
  locale?: string;
}

function compactText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim();
}

function firstNonEmptyText(...values: unknown[]): string {
  for (const value of values) {
    const normalized = compactText(value);
    if (normalized) {
      return normalized;
    }
  }

  return "";
}

function formatSourceTypeLabel(t: Translator, sourceType: StyleProfile["sourceType"]): string {
  switch (sourceType) {
    case "manual":
      return t("writingFormula.landingItems.sourceTypes.manual");
    case "from_text":
      return t("writingFormula.landingItems.sourceTypes.from_text");
    case "from_book_analysis":
      return t("writingFormula.landingItems.sourceTypes.from_book_analysis");
    case "from_knowledge_document":
      return t("writingFormula.landingItems.sourceTypes.from_knowledge_document");
    case "from_current_work":
      return t("writingFormula.landingItems.sourceTypes.from_current_work");
    default:
      return t("writingFormula.landingItems.sourceTypes.other");
  }
}

function formatUpdatedAtLabel(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  return new Intl.DateTimeFormat(locale, {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function buildNarrativeSummary(t: Translator, profile: StyleProfile): string {
  return buildReadableRuleSummary(
    t,
    "narrativeRules",
    profile.narrativeRules,
    t("writingFormula.rulePresentation.narrativeEmpty"),
  );
}

function buildCharacterSummary(t: Translator, profile: StyleProfile): string {
  return buildReadableRuleSummary(
    t,
    "characterRules",
    profile.characterRules,
    t("writingFormula.rulePresentation.characterEmpty"),
  );
}

function buildLanguageSummary(t: Translator, profile: StyleProfile): string {
  return buildReadableRuleSummary(
    t,
    "languageRules",
    profile.languageRules,
    t("writingFormula.rulePresentation.languageEmpty"),
  );
}

function buildRhythmSummary(t: Translator, profile: StyleProfile): string {
  return buildReadableRuleSummary(
    t,
    "rhythmRules",
    profile.rhythmRules,
    t("writingFormula.rulePresentation.rhythmEmpty"),
  );
}

function buildSourceContentPreview(sourceContent?: string | null): string | null {
  const normalized = compactText(sourceContent);
  if (!normalized) {
    return null;
  }

  return normalized.length > 180 ? `${normalized.slice(0, 180)}...` : normalized;
}

export function buildLandingProfileItems(params: BuildLandingProfileItemsParams): LandingProfileItem[] {
  const { t, profiles, allBindings, novelTitleMap, locale = "zh-CN" } = params;
  const recentNovelBindingsByProfileId = allBindings
    .filter((binding) => binding.targetType === "novel")
    .reduce<Map<string, StyleBinding>>((result, binding) => {
      const current = result.get(binding.styleProfileId);
      const bindingTimestamp = new Date(binding.updatedAt).getTime();
      const currentTimestamp = current ? new Date(current.updatedAt).getTime() : Number.NEGATIVE_INFINITY;

      if (!current || bindingTimestamp >= currentTimestamp) {
        result.set(binding.styleProfileId, binding);
      }

      return result;
    }, new Map<string, StyleBinding>());
  const bindingCountByProfileId = allBindings.reduce<Record<string, number>>((result, binding) => {
    result[binding.styleProfileId] = (result[binding.styleProfileId] ?? 0) + 1;
    return result;
  }, {});

  return [...profiles]
    .sort((left, right) => {
      const starterDelta = Number(isStarterStyleProfile(left)) - Number(isStarterStyleProfile(right));
      if (starterDelta !== 0) {
        return starterDelta;
      }
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    })
    .map((profile) => {
      const profileSummary = buildStyleIntentSummary({ styleProfile: profile });
      const characterEntries = buildReadableRuleEntries(t, "characterRules", profile.characterRules);
      const dialogueEntry = characterEntries.find((entry) => entry.key === "dialogueStyle");
      const emotionEntry = characterEntries.find((entry) => entry.key === "emotionExpression");
      const antiAiSeparator = t("writingFormula.landingItems.antiAiSeparator");
      const readingFeelText = firstNonEmptyText(profile.description, profileSummary?.readingFeel);
      const detailLines = [
        readingFeelText
          ? t("writingFormula.landingItems.readingFeelLine", { value: readingFeelText })
          : "",
        t("writingFormula.landingItems.languageLine", { value: buildLanguageSummary(t, profile) }),
        dialogueEntry
          ? t("writingFormula.landingItems.dialogueLine", { value: dialogueEntry.value })
          : "",
        emotionEntry
          ? t("writingFormula.landingItems.emotionLine", { value: emotionEntry.value })
          : "",
        profileSummary?.antiAiFocus.length
          ? t("writingFormula.landingItems.antiAiLine", {
              value: profileSummary.antiAiFocus.join(antiAiSeparator),
            })
          : "",
      ].filter(Boolean);
      const recentNovelBinding = recentNovelBindingsByProfileId.get(profile.id);
      const selectedPresetLabel = profile.selectedExtractionPresetKey
        ? (
          profile.extractionPresets.find((preset) => preset.key === profile.selectedExtractionPresetKey)?.label
          ?? profile.selectedExtractionPresetKey
        )
        : null;

      return {
        id: profile.id,
        name: profile.name,
        originLabel: getStyleProfileOriginLabel(t, profile),
        summaryLine: detailLines[0] ?? profile.description ?? t("writingFormula.landingItems.summaryFallback"),
        detailLines,
        description: firstNonEmptyText(
          profile.description,
          profileSummary?.readingFeel,
          t("writingFormula.landingItems.readingFeelFallback"),
        ),
        recentNovelTitle: recentNovelBinding
          ? (novelTitleMap[recentNovelBinding.targetId] ?? recentNovelBinding.targetId)
          : null,
        category: profile.category,
        tags: Array.from(new Set([...profile.tags, ...profile.applicableGenres].filter(Boolean))).slice(0, 6),
        applicableGenres: profile.applicableGenres.filter(Boolean),
        narrativeSummary: buildNarrativeSummary(t, profile),
        characterSummary: buildCharacterSummary(t, profile),
        languageSummary: buildLanguageSummary(t, profile),
        rhythmSummary: buildRhythmSummary(t, profile),
        antiAiFocus: profileSummary?.antiAiFocus ?? [],
        antiAiRuleNames: profile.antiAiRules.map((rule) => rule.name).slice(0, 6),
        sourceTypeLabel: formatSourceTypeLabel(t, profile.sourceType),
        sourceContentPreview: buildSourceContentPreview(profile.sourceContent),
        extractedFeatureCount: profile.extractedFeatures.filter((feature) => feature.enabled).length,
        highRiskFeatureCount: profile.extractedFeatures.filter((feature) => feature.fingerprintRisk >= 0.7).length,
        selectedPresetLabel,
        presetLabels: profile.extractionPresets.map((preset) => preset.label).slice(0, 3),
        extractionAntiAiRecommendationCount: profile.extractionAntiAiRuleKeys.length,
        bindingCount: bindingCountByProfileId[profile.id] ?? 0,
        updatedAtLabel: formatUpdatedAtLabel(profile.updatedAt, locale),
        isStarter: isStarterStyleProfile(profile),
      };
    });
}
