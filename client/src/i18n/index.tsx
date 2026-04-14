import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AIOutputLanguage, AppLocale, AppPreferences } from "@ai-novel/shared/types/appPreferences";
import { getAppPreferences } from "@/api/settings";
import { queryKeys } from "@/api/queryKeys";
import zhTranslations from "./locales/zh-CN.json";
import enTranslations from "./locales/en-US.json";
import viTranslations from "./locales/vi-VN.json";

const APP_PREFERENCES_STORAGE_KEY = "ai-novel.app-preferences";

const translations = {
  "zh-CN": zhTranslations,
  "en-US": enTranslations,
  "vi-VN": viTranslations,
};

export const APP_LOCALE_OPTIONS: AppLocale[] = ["zh-CN", "en-US", "vi-VN"];
export const AI_OUTPUT_LANGUAGE_OPTIONS: AIOutputLanguage[] = ["zh", "en", "vi"];

export type TranslationKey = keyof typeof zhTranslations;
export type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

interface I18nContextValue {
  locale: AppLocale;
  aiOutputLanguage: AIOutputLanguage;
  preferences: AppPreferences;
  setPreferences: (next: AppPreferences) => void;
  t: TranslateFn;
}

const I18nContext = createContext<I18nContextValue | null>(null);

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
  if (value === "en-US" || value === "vi-VN" || value === "zh-CN") {
    return value;
  }
  return "zh-CN";
}

function normalizeAiOutputLanguage(value: string | undefined | null): AIOutputLanguage {
  if (value === "en" || value === "vi" || value === "zh") {
    return value;
  }
  return "zh";
}

function normalizeAppPreferences(value: Partial<AppPreferences> | null | undefined): AppPreferences {
  const uiLocale = normalizeUiLocale(value?.uiLocale);
  return {
    uiLocale,
    aiOutputLanguage: normalizeAiOutputLanguage(value?.aiOutputLanguage ?? getDefaultAiOutputLanguageForLocale(uiLocale)),
  };
}

function resolveBrowserLocale(): AppLocale {
  if (typeof window === "undefined") {
    return "zh-CN";
  }
  const browserLocale = window.navigator.language.toLowerCase();
  if (browserLocale.startsWith("vi")) {
    return "vi-VN";
  }
  if (browserLocale.startsWith("en")) {
    return "en-US";
  }
  return "zh-CN";
}

function readStoredPreferences(): AppPreferences {
  if (typeof window === "undefined") {
    return normalizeAppPreferences(undefined);
  }
  const raw = window.localStorage.getItem(APP_PREFERENCES_STORAGE_KEY);
  if (!raw) {
    const uiLocale = resolveBrowserLocale();
    return {
      uiLocale,
      aiOutputLanguage: getDefaultAiOutputLanguageForLocale(uiLocale),
    };
  }
  try {
    return normalizeAppPreferences(JSON.parse(raw) as Partial<AppPreferences>);
  } catch {
    return normalizeAppPreferences(undefined);
  }
}

function translate(
  locale: AppLocale,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  const localeTranslations = translations[locale] as Record<TranslationKey, string>;
  const fallbackTranslations = translations["zh-CN"] as Record<TranslationKey, string>;
  const template = localeTranslations[key] ?? fallbackTranslations[key] ?? key;
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (_match: string, token: string) => String(params[token] ?? `{${token}}`));
}

export function I18nProvider(props: { children: ReactNode }) {
  const { children } = props;
  const [preferences, setPreferences] = useState<AppPreferences>(() => readStoredPreferences());
  const [hydratedFromServer, setHydratedFromServer] = useState(false);

  const preferencesQuery = useQuery({
    queryKey: queryKeys.settings.appPreferences,
    queryFn: getAppPreferences,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const data = preferencesQuery.data?.data;
    if (!data || hydratedFromServer) {
      return;
    }
    setPreferences(normalizeAppPreferences(data));
    setHydratedFromServer(true);
  }, [hydratedFromServer, preferencesQuery.data?.data]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(APP_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
    document.documentElement.lang = preferences.uiLocale;
  }, [preferences]);

  return (
    <I18nContext.Provider
      value={{
        locale: preferences.uiLocale,
        aiOutputLanguage: preferences.aiOutputLanguage,
        preferences,
        setPreferences: (next) => setPreferences(normalizeAppPreferences(next)),
        t: (key, params) => translate(preferences.uiLocale, key, params),
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider.");
  }
  return context;
}
