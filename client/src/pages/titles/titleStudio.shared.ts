import type { TitleSuggestionStyle } from "@ai-novel/shared/types/title";

type Translator = (key: string, values?: Record<string, string | number>) => string;

export function getTitleStyleLabel(style: TitleSuggestionStyle, t: Translator): string {
  switch (style) {
    case "literary":
      return t("titles.styles.literary");
    case "conflict":
      return t("titles.styles.conflict");
    case "suspense":
      return t("titles.styles.suspense");
    case "high_concept":
      return t("titles.styles.high_concept");
    default:
      return t("titles.styles.default");
  }
}

export function getClickRateBadgeClass(rate: number): string {
  if (rate >= 90) {
    return "bg-rose-500 text-white";
  }
  if (rate >= 80) {
    return "bg-orange-500 text-white";
  }
  if (rate >= 70) {
    return "bg-amber-500 text-black";
  }
  return "bg-muted text-muted-foreground";
}

export function truncateText(value: string | null | undefined, maxLength = 120): string {
  const text = (value ?? "").trim();
  if (!text) {
    return "";
  }
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
}
