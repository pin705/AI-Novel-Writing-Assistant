import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import zhCommon from "@/locales/zh-CN/common.json";
import viCommon from "@/locales/vi-VN/common.json";

export const LANGUAGE_STORAGE_KEY = "ai-novel.locale";

export const SUPPORTED_LANGUAGES = [
  { code: "vi-VN", label: "Tiếng Việt", shortLabel: "VI" },
  { code: "zh-CN", label: "简体中文", shortLabel: "中文" },
] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

function normalizeLanguage(value: string | null | undefined): AppLanguage {
  if (value?.toLowerCase().startsWith("zh")) {
    return "zh-CN";
  }
  if (value?.toLowerCase().startsWith("vi")) {
    return "vi-VN";
  }
  return "vi-VN";
}

function resolveInitialLanguage(): AppLanguage {
  if (typeof window === "undefined") {
    return "vi-VN";
  }
  return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? window.navigator.language);
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    lng: resolveInitialLanguage(),
    fallbackLng: "zh-CN",
    supportedLngs: SUPPORTED_LANGUAGES.map((item) => item.code),
    defaultNS: "common",
    ns: ["common"],
    resources: {
      "zh-CN": { common: zhCommon },
      "vi-VN": { common: viCommon },
    },
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
    returnEmptyString: false,
  });
}

export function getAppLanguage(): AppLanguage {
  return normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);
}

export async function setAppLanguage(language: AppLanguage): Promise<void> {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }
  await i18n.changeLanguage(language);
}

export function t(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options);
}

export default i18n;
