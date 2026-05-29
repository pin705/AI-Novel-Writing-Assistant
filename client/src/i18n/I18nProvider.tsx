import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  LOCALE_METADATA,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  detectInitialLocale,
  isSupportedLocale,
  type SupportedLocale,
} from "./config";
import { createTranslator, type TranslateValues, type TranslationDict } from "./translate";
import { APP_RUNTIME } from "@/lib/constants";
import { notifyDesktopLocaleChanged } from "@/lib/desktop";

// Eagerly load every namespace JSON across every locale at build time.
// Path pattern: ./locales/<locale>/<namespace>.json
const NAMESPACE_MODULES = import.meta.glob<{ default: TranslationDict }>(
  "./locales/*/*.json",
  { eager: true },
);

function buildDictionaries(): Record<SupportedLocale, TranslationDict> {
  const acc: Record<string, TranslationDict> = {};
  for (const [path, mod] of Object.entries(NAMESPACE_MODULES)) {
    // path like "./locales/zh-CN/home.json"
    const match = /\.\/locales\/([^/]+)\/([^/]+)\.json$/.exec(path);
    if (!match) continue;
    const [, locale, namespace] = match;
    if (!isSupportedLocale(locale)) continue;
    if (!acc[locale]) acc[locale] = {};
    acc[locale][namespace] = mod.default;
  }
  // Make sure every supported locale has an entry, even if empty.
  for (const locale of SUPPORTED_LOCALES) {
    if (!acc[locale]) acc[locale] = {};
  }
  return acc as Record<SupportedLocale, TranslationDict>;
}

const DICTIONARIES = buildDictionaries();

interface I18nContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string, values?: TranslateValues) => string;
  availableLocales: ReadonlyArray<SupportedLocale>;
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  children: ReactNode;
  initialLocale?: SupportedLocale;
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => initialLocale ?? detectInitialLocale());

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = LOCALE_METADATA[locale].htmlLang;
  }, [locale]);

  useEffect(() => {
    if (APP_RUNTIME !== "desktop") return;
    try {
      notifyDesktopLocaleChanged(locale);
    } catch {
      // The desktop bridge may not be available; ignore.
    }
  }, [locale]);

  const setLocale = useCallback((next: SupportedLocale) => {
    if (!isSupportedLocale(next)) return;
    setLocaleState(next);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // localStorage may be unavailable (private mode, SSR); fail silently.
    }
    if (APP_RUNTIME === "desktop") {
      try {
        notifyDesktopLocaleChanged(next);
      } catch {
        // The desktop bridge may not be present yet; the renderer will still update its own UI.
      }
    }
  }, []);

  const t = useMemo(() => {
    const primary = DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
    const fallback = DICTIONARIES[FALLBACK_LOCALE];
    return createTranslator(primary, fallback);
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t, availableLocales: SUPPORTED_LOCALES }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an <I18nProvider>");
  }
  return ctx;
}

export function useTranslation() {
  const { t, locale, setLocale, availableLocales } = useI18n();
  return { t, locale, setLocale, availableLocales };
}
