import type { TitleSuggestionStyle } from "@ai-novel/shared/types/title";
import { t } from "@/i18n";


export function getTitleStyleLabel(style: TitleSuggestionStyle): string {
  switch (style) {
    case "literary":
      return t("叙事感");
    case "conflict":
      return t("冲突钩子");
    case "suspense":
      return t("悬念感");
    case "high_concept":
      return t("高概念");
    default:
      return t("标题策略");
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
