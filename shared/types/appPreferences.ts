export type AppLocale = "zh-CN" | "en-US" | "vi-VN";

export type AIOutputLanguage = "zh" | "en" | "vi";

export interface AppPreferences {
  uiLocale: AppLocale;
  aiOutputLanguage: AIOutputLanguage;
}
