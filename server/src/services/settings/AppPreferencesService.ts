import type { AIOutputLanguage, AppLocale, AppPreferences } from "@ai-novel/shared/types/appPreferences";
import { prisma } from "../../db/prisma";

const UI_LOCALE_KEY = "app.uiLocale";
const AI_OUTPUT_LANGUAGE_KEY = "app.aiOutputLanguage";

const DEFAULT_APP_PREFERENCES: AppPreferences = {
  uiLocale: "zh-CN",
  aiOutputLanguage: "zh",
};

let cachedPreferences: AppPreferences | null = null;
let testOverridePreferences: AppPreferences | undefined;

function isMissingTableError(error: unknown): boolean {
  return (
    typeof error === "object"
    && error !== null
    && "code" in error
    && (error as { code?: string }).code === "P2021"
  );
}

export function getDefaultAiOutputLanguageForLocale(locale: AppLocale): AIOutputLanguage {
  if (locale === "vi-VN") {
    return "vi";
  }
  if (locale === "en-US") {
    return "en";
  }
  return "zh";
}

function normalizeUiLocale(value: string | undefined | null): AppLocale {
  const normalized = value?.trim();
  if (normalized === "en-US" || normalized === "vi-VN" || normalized === "zh-CN") {
    return normalized;
  }
  return DEFAULT_APP_PREFERENCES.uiLocale;
}

function normalizeAiOutputLanguage(value: string | undefined | null): AIOutputLanguage {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "en" || normalized === "vi" || normalized === "zh") {
    return normalized;
  }
  return DEFAULT_APP_PREFERENCES.aiOutputLanguage;
}

function buildPreferencesFromEntries(entries: Map<string, string>): AppPreferences {
  const uiLocale = normalizeUiLocale(entries.get(UI_LOCALE_KEY));
  return {
    uiLocale,
    aiOutputLanguage: normalizeAiOutputLanguage(
      entries.get(AI_OUTPUT_LANGUAGE_KEY) ?? getDefaultAiOutputLanguageForLocale(uiLocale),
    ),
  };
}

export function buildAiOutputLanguageInstruction(language: AIOutputLanguage): string {
  if (language === "vi") {
    return [
      "Final output language: Vietnamese.",
      "Use natural Vietnamese for all user-facing content.",
      "If the response is JSON, keep schema keys unchanged and write all natural-language values in Vietnamese.",
      "Keep identifiers, code, URLs, and already-established proper nouns unchanged unless translation is explicitly required.",
    ].join(" ");
  }
  if (language === "en") {
    return [
      "Final output language: English.",
      "Use natural English for all user-facing content.",
      "If the response is JSON, keep schema keys unchanged and write all natural-language values in English.",
      "Keep identifiers, code, URLs, and already-established proper nouns unchanged unless translation is explicitly required.",
    ].join(" ");
  }
  return [
    "最终输出语言：简体中文。",
    "所有面向用户的自然语言内容都必须使用简体中文。",
    "如果输出是 JSON，必须保持 schema key 不变，但所有自然语言字段值都使用简体中文。",
    "标识符、代码、URL、以及已经确定的专有名词，除非明确要求翻译，否则保持原样。",
  ].join(" ");
}

export async function getAppPreferences(forceRefresh = false): Promise<AppPreferences> {
  if (testOverridePreferences) {
    return { ...testOverridePreferences };
  }
  if (!forceRefresh && cachedPreferences) {
    return cachedPreferences;
  }

  try {
    const rows = await prisma.appSetting.findMany({
      where: {
        key: {
          in: [UI_LOCALE_KEY, AI_OUTPUT_LANGUAGE_KEY],
        },
      },
    });
    cachedPreferences = buildPreferencesFromEntries(new Map(rows.map((item) => [item.key, item.value])));
    return cachedPreferences;
  } catch (error) {
    if (!isMissingTableError(error)) {
      console.warn("[app-preferences] falling back to cached/default preferences", error);
    }
    cachedPreferences = cachedPreferences ?? { ...DEFAULT_APP_PREFERENCES };
    return cachedPreferences;
  }
}

export async function saveAppPreferences(input: Partial<AppPreferences>): Promise<AppPreferences> {
  const previous = await getAppPreferences(true);
  const uiLocale = normalizeUiLocale(input.uiLocale ?? previous.uiLocale);
  const next: AppPreferences = {
    uiLocale,
    aiOutputLanguage: normalizeAiOutputLanguage(
      input.aiOutputLanguage ?? previous.aiOutputLanguage ?? getDefaultAiOutputLanguageForLocale(uiLocale),
    ),
  };

  try {
    await prisma.$transaction([
      prisma.appSetting.upsert({
        where: { key: UI_LOCALE_KEY },
        update: { value: next.uiLocale },
        create: { key: UI_LOCALE_KEY, value: next.uiLocale },
      }),
      prisma.appSetting.upsert({
        where: { key: AI_OUTPUT_LANGUAGE_KEY },
        update: { value: next.aiOutputLanguage },
        create: { key: AI_OUTPUT_LANGUAGE_KEY, value: next.aiOutputLanguage },
      }),
    ]);
    cachedPreferences = next;
    return next;
  } catch (error) {
    if (isMissingTableError(error)) {
      cachedPreferences = next;
      return next;
    }
    throw error;
  }
}

export function setAppPreferencesForTests(preferences?: AppPreferences): void {
  testOverridePreferences = preferences ? { ...preferences } : undefined;
  cachedPreferences = preferences ? { ...preferences } : null;
}
