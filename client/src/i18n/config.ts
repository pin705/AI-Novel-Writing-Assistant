export const SUPPORTED_LOCALES = ["zh-CN", "vi-VN", "en-US"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "zh-CN";
export const FALLBACK_LOCALE: SupportedLocale = "zh-CN";

export const LOCALE_STORAGE_KEY = "ai-novel.locale";

export interface LocaleMeta {
  code: SupportedLocale;
  label: string;
  nativeLabel: string;
  htmlLang: string;
}

export const LOCALE_METADATA: Record<SupportedLocale, LocaleMeta> = {
  "zh-CN": { code: "zh-CN", label: "Chinese (Simplified)", nativeLabel: "简体中文", htmlLang: "zh-CN" },
  "vi-VN": { code: "vi-VN", label: "Vietnamese", nativeLabel: "Tiếng Việt", htmlLang: "vi" },
  "en-US": { code: "en-US", label: "English", nativeLabel: "English", htmlLang: "en" },
};

export function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  return Boolean(value) && (SUPPORTED_LOCALES as readonly string[]).includes(value as string);
}

export function detectInitialLocale(): SupportedLocale {
  if (typeof window === "undefined") {
    return DEFAULT_LOCALE;
  }
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (isSupportedLocale(stored)) {
    return stored;
  }
  const browser = window.navigator?.language ?? "";
  if (browser.toLowerCase().startsWith("vi")) return "vi-VN";
  if (browser.toLowerCase().startsWith("zh")) return "zh-CN";
  if (browser.toLowerCase().startsWith("en")) return "en-US";
  return DEFAULT_LOCALE;
}
