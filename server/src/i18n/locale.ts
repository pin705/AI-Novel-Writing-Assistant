import { AsyncLocalStorage } from "node:async_hooks";
import type { NextFunction, Request, RequestHandler, Response } from "express";

export const SUPPORTED_BACKEND_LOCALES = ["vi-VN", "en-US", "zh-CN"] as const;

export type BackendLocale = (typeof SUPPORTED_BACKEND_LOCALES)[number];
export type BackendLanguage = "vi" | "en" | "zh";

export const DEFAULT_BACKEND_LOCALE: BackendLocale = "vi-VN";

type RequestLocaleStore = {
  locale: BackendLocale;
};

const requestLocaleStorage = new AsyncLocalStorage<RequestLocaleStore>();

function normalizeLocale(input: string | null | undefined): BackendLocale | null {
  const normalized = input?.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized.startsWith("vi")) {
    return "vi-VN";
  }
  if (normalized.startsWith("en")) {
    return "en-US";
  }
  if (normalized.startsWith("zh")) {
    return "zh-CN";
  }
  return null;
}

function getHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function parseAcceptLanguage(headerValue: string | undefined): BackendLocale | null {
  if (!headerValue?.trim()) {
    return null;
  }

  const candidates = headerValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [languageTag, ...params] = item.split(";").map((part) => part.trim());
      const quality = params
        .find((part) => part.startsWith("q="))
        ?.slice(2);
      return {
        languageTag,
        quality: quality ? Number(quality) : 1,
      };
    })
    .filter((item) => item.languageTag && !Number.isNaN(item.quality))
    .sort((left, right) => right.quality - left.quality);

  for (const candidate of candidates) {
    const normalized = normalizeLocale(candidate.languageTag);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

export function resolveRequestLocale(req: Pick<Request, "headers">): BackendLocale {
  const explicitLocale = normalizeLocale(
    getHeaderValue(req.headers["x-ai-novel-locale"])
      ?? getHeaderValue(req.headers["x-app-locale"]),
  );

  if (explicitLocale) {
    return explicitLocale;
  }

  return parseAcceptLanguage(getHeaderValue(req.headers["accept-language"])) ?? DEFAULT_BACKEND_LOCALE;
}

export function getRequestLocale(): BackendLocale {
  return requestLocaleStorage.getStore()?.locale ?? DEFAULT_BACKEND_LOCALE;
}

export function getBackendLanguage(locale: BackendLocale = getRequestLocale()): BackendLanguage {
  if (locale === "en-US") {
    return "en";
  }
  if (locale === "zh-CN") {
    return "zh";
  }
  return "vi";
}

const collatorCache = new Map<BackendLocale, Intl.Collator>();

function getCollator(locale: BackendLocale): Intl.Collator {
  const existing = collatorCache.get(locale);
  if (existing) {
    return existing;
  }

  const collator = new Intl.Collator(locale, {
    sensitivity: "base",
    numeric: true,
  });
  collatorCache.set(locale, collator);
  return collator;
}

export function compareLocalizedText(
  left: string,
  right: string,
  locale: BackendLocale = getRequestLocale(),
): number {
  return getCollator(locale).compare(left, right);
}

export const requestLocaleMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const locale = resolveRequestLocale(req);
  req.locale = locale;
  res.setHeader("Content-Language", locale);
  res.vary("Accept-Language");
  res.vary("X-AI-Novel-Locale");
  res.vary("X-App-Locale");
  requestLocaleStorage.run({ locale }, () => next());
};
