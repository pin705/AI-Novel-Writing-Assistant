import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

import zhCN from "./locales/zh-CN.json";
import viVN from "./locales/vi-VN.json";
import enUS from "./locales/en-US.json";

export type DesktopLocale = "zh-CN" | "vi-VN" | "en-US";

export const SUPPORTED_DESKTOP_LOCALES: readonly DesktopLocale[] = ["zh-CN", "vi-VN", "en-US"];
export const DEFAULT_DESKTOP_LOCALE: DesktopLocale = "zh-CN";
export const FALLBACK_DESKTOP_LOCALE: DesktopLocale = "zh-CN";

const LOCALE_FILE_NAME = "desktop-locale.json";

type LocaleDict = Record<string, unknown>;

const DICTIONARIES: Record<DesktopLocale, LocaleDict> = {
  "zh-CN": zhCN as LocaleDict,
  "vi-VN": viVN as LocaleDict,
  "en-US": enUS as LocaleDict,
};

let cachedLocale: DesktopLocale | null = null;

function isSupportedDesktopLocale(value: unknown): value is DesktopLocale {
  return typeof value === "string"
    && (SUPPORTED_DESKTOP_LOCALES as readonly string[]).includes(value);
}

function mapSystemLocaleToDesktopLocale(raw: string | undefined | null): DesktopLocale {
  const normalized = (raw ?? "").toLowerCase();
  if (normalized.startsWith("vi")) return "vi-VN";
  if (normalized.startsWith("zh")) return "zh-CN";
  if (normalized.startsWith("en")) return "en-US";
  return DEFAULT_DESKTOP_LOCALE;
}

function resolveLocaleFilePath(): string | null {
  try {
    const userDataDir = app.getPath("userData");
    return path.join(userDataDir, LOCALE_FILE_NAME);
  } catch {
    return null;
  }
}

function readPersistedLocale(): DesktopLocale | null {
  const filePath = resolveLocaleFilePath();
  if (!filePath) return null;
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as { locale?: unknown };
    if (isSupportedDesktopLocale(parsed.locale)) {
      return parsed.locale;
    }
    return null;
  } catch {
    return null;
  }
}

export function getDesktopLocale(): DesktopLocale {
  if (cachedLocale) return cachedLocale;

  const persisted = readPersistedLocale();
  if (persisted) {
    cachedLocale = persisted;
    return persisted;
  }

  let systemLocale = "";
  try {
    systemLocale = app.getLocale();
  } catch {
    systemLocale = "";
  }
  const fallback = mapSystemLocaleToDesktopLocale(systemLocale);
  cachedLocale = fallback;
  return fallback;
}

export function setDesktopLocale(locale: DesktopLocale): void {
  if (!isSupportedDesktopLocale(locale)) return;
  cachedLocale = locale;
  const filePath = resolveLocaleFilePath();
  if (!filePath) return;
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({ locale }, null, 2), "utf-8");
  } catch {
    // Persistence is best-effort; the in-memory cache still reflects the new value.
  }
}

function lookupDottedKey(dict: LocaleDict, key: string): string | null {
  const segments = key.split(".");
  let cursor: unknown = dict;
  for (const segment of segments) {
    if (cursor && typeof cursor === "object" && segment in (cursor as Record<string, unknown>)) {
      cursor = (cursor as Record<string, unknown>)[segment];
    } else {
      return null;
    }
  }
  return typeof cursor === "string" ? cursor : null;
}

function interpolate(template: string, values?: Record<string, string | number>): string {
  if (!values) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) => {
    if (Object.prototype.hasOwnProperty.call(values, name)) {
      const replacement = values[name];
      return String(replacement);
    }
    return match;
  });
}

export function t(key: string, values?: Record<string, string | number>): string {
  const locale = getDesktopLocale();
  const primary = DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_DESKTOP_LOCALE];
  const fallback = DICTIONARIES[FALLBACK_DESKTOP_LOCALE];

  const fromPrimary = lookupDottedKey(primary, key);
  if (fromPrimary != null) {
    return interpolate(fromPrimary, values);
  }

  const fromFallback = lookupDottedKey(fallback, key);
  if (fromFallback != null) {
    return interpolate(fromFallback, values);
  }

  return key;
}

export function getDesktopHtmlLang(): string {
  const locale = getDesktopLocale();
  if (locale === "vi-VN") return "vi";
  if (locale === "en-US") return "en";
  return "zh-CN";
}
