import {
  BOOK_ANALYSIS_SECTIONS,
  type BookAnalysisSectionKey,
} from "@ai-novel/shared/types/bookAnalysis";
import { t } from "@/i18n";


export interface BookAnalysisSectionOption {
  key: BookAnalysisSectionKey;
  title: string;
}

export function getBookAnalysisSectionTitle(sectionKey: BookAnalysisSectionKey): string {
  switch (sectionKey) {
    case "overview":
      return t("拆书总览");
    case "plot_structure":
      return t("剧情结构");
    case "timeline":
      return t("故事时间线");
    case "character_system":
      return t("人物系统");
    case "worldbuilding":
      return t("世界观与设定");
    case "themes":
      return t("主题表达");
    case "style_technique":
      return t("文风与技法");
    case "market_highlights":
      return t("商业化卖点");
    default:
      return sectionKey;
  }
}

export function getBookAnalysisSectionOptions(): BookAnalysisSectionOption[] {
  return BOOK_ANALYSIS_SECTIONS.map((section) => ({
    ...section,
    title: getBookAnalysisSectionTitle(section.key),
  }));
}
