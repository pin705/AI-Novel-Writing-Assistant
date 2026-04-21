import { t } from "@/i18n";
export interface StorylineStructuredView {
  coreTheme: string;
  mainGoal: string;
  earlyPhase: string;
  middlePhase: string;
  latePhase: string;
  growthCurve: string;
  emotionTrend: string;
  coreConflicts: string;
  endingDirection: string;
  forbiddenItems: string;
}

function normalizeLines(draftText: string): string[] {
  return draftText
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function stripLabel(line: string): string {
  return line.replace(/^[^:：]{1,16}[:：]\s*/, "").trim();
}

function findByKeywords(lines: string[], keywords: string[]): string {
  const matched = lines.find((line) => keywords.some((keyword) => line.includes(keyword)));
  if (!matched) {
    return "";
  }
  const stripped = stripLabel(matched);
  return stripped || matched;
}

function buildFallbackPhases(lines: string[]): { early: string; middle: string; late: string } {
  if (lines.length === 0) {
    return { early: "", middle: "", late: "" };
  }
  const blockSize = Math.max(1, Math.ceil(lines.length / 3));
  return {
    early: lines.slice(0, blockSize).join("；"),
    middle: lines.slice(blockSize, blockSize * 2).join("；"),
    late: lines.slice(blockSize * 2).join("；"),
  };
}

export function parseStorylineStructuredView(draftText: string): StorylineStructuredView {
  const lines = normalizeLines(draftText);
  const fallbackPhases = buildFallbackPhases(lines);
  const coreTheme = findByKeywords(lines, [t("核心主题"), t("主题")]);
  const mainGoal = findByKeywords(lines, [t("主线目标"), t("目标"), t("核心任务")]);
  const earlyPhase = findByKeywords(lines, [t("前期"), t("开篇"), t("第一阶段")]) || fallbackPhases.early;
  const middlePhase = findByKeywords(lines, [t("中期"), t("第二阶段"), t("转折")]) || fallbackPhases.middle;
  const latePhase = findByKeywords(lines, [t("后期"), t("第三阶段"), t("收束"), t("结局阶段")]) || fallbackPhases.late;
  const growthCurve = findByKeywords(lines, [t("成长"), t("成长路径"), t("成长弧")]);
  const emotionTrend = findByKeywords(lines, [t("情感"), t("情绪"), t("情感线")]);
  const coreConflicts = findByKeywords(lines, [t("冲突"), t("矛盾"), t("对抗")]);
  const endingDirection = findByKeywords(lines, [t("结局"), t("终局"), t("收尾")]);
  const forbiddenItems = findByKeywords(lines, [t("禁止"), t("避免"), t("禁忌")]);

  return {
    coreTheme: coreTheme || t("未标注"),
    mainGoal: mainGoal || t("未标注"),
    earlyPhase: earlyPhase || t("未标注"),
    middlePhase: middlePhase || t("未标注"),
    latePhase: latePhase || t("未标注"),
    growthCurve: growthCurve || t("未标注"),
    emotionTrend: emotionTrend || t("未标注"),
    coreConflicts: coreConflicts || t("未标注"),
    endingDirection: endingDirection || t("未标注"),
    forbiddenItems: forbiddenItems || t("未标注"),
  };
}
