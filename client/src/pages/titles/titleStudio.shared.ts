import type { TitleSuggestionStyle } from "@ai-novel/shared/types/title";

export function getTitleStyleLabel(style: TitleSuggestionStyle): string {
  switch (style) {
    case "literary":
      return "Giàu chất tự sự";
    case "conflict":
      return "Móc xung đột";
    case "suspense":
      return "Đậm suspense";
    case "high_concept":
      return "Ý tưởng cao";
    default:
      return "Chiến lược tiêu đề";
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
