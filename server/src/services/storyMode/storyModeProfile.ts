import { z } from "zod";
import type { NovelStoryMode, StoryModeConflictCeiling, StoryModeProfile } from "@ai-novel/shared/types/storyMode";
import { getBackendLanguage } from "../../i18n";

export const storyModeConflictCeilingSchema = z.enum(["low", "medium", "high"]);

export const storyModeProfileSchema = z.object({
  coreDrive: z.string().trim().min(1).max(300),
  readerReward: z.string().trim().min(1).max(300),
  progressionUnits: z.array(z.string().trim().min(1).max(120)).min(1).max(8),
  allowedConflictForms: z.array(z.string().trim().min(1).max(120)).min(1).max(8),
  forbiddenConflictForms: z.array(z.string().trim().min(1).max(120)).min(1).max(8),
  conflictCeiling: storyModeConflictCeilingSchema,
  resolutionStyle: z.string().trim().min(1).max(300),
  chapterUnit: z.string().trim().min(1).max(300),
  volumeReward: z.string().trim().min(1).max(300),
  mandatorySignals: z.array(z.string().trim().min(1).max(120)).min(1).max(8),
  antiSignals: z.array(z.string().trim().min(1).max(120)).min(1).max(8),
}).strict();

const DEFAULT_STORY_MODE_PROFILE: StoryModeProfile = {
  coreDrive: "通过稳定兑现核心阅读期待来推动连载体验。",
  readerReward: "每隔数章都获得清晰、可感知的满足感。",
  progressionUnits: ["关键关系推进", "阶段性目标兑现"],
  allowedConflictForms: ["与主驱动一致的中低烈度冲突"],
  forbiddenConflictForms: ["无关的高压狗血冲突"],
  conflictCeiling: "medium",
  resolutionStyle: "优先使用符合该模式的方式化解问题，而不是强行升级。",
  chapterUnit: "每章围绕一个清晰的推进单位展开。",
  volumeReward: "卷末给出与模式一致的阶段性兑现。",
  mandatorySignals: ["主驱动持续出现", "读者期待被重复确认"],
  antiSignals: ["长期偏离主驱动", "冲突烈度失控"],
};

function normalizeText(value: unknown, fallback: string): string {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || fallback;
}

function normalizeList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }
  const normalized = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 8);
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeConflictCeiling(value: unknown): StoryModeConflictCeiling {
  return value === "low" || value === "medium" || value === "high"
    ? value
    : DEFAULT_STORY_MODE_PROFILE.conflictCeiling;
}

export function sanitizeStoryModeProfile(value: unknown): StoryModeProfile {
  if (!value || typeof value !== "object") {
    return DEFAULT_STORY_MODE_PROFILE;
  }
  const record = value as Partial<StoryModeProfile>;
  return storyModeProfileSchema.parse({
    coreDrive: normalizeText(record.coreDrive, DEFAULT_STORY_MODE_PROFILE.coreDrive),
    readerReward: normalizeText(record.readerReward, DEFAULT_STORY_MODE_PROFILE.readerReward),
    progressionUnits: normalizeList(record.progressionUnits, DEFAULT_STORY_MODE_PROFILE.progressionUnits),
    allowedConflictForms: normalizeList(record.allowedConflictForms, DEFAULT_STORY_MODE_PROFILE.allowedConflictForms),
    forbiddenConflictForms: normalizeList(record.forbiddenConflictForms, DEFAULT_STORY_MODE_PROFILE.forbiddenConflictForms),
    conflictCeiling: normalizeConflictCeiling(record.conflictCeiling),
    resolutionStyle: normalizeText(record.resolutionStyle, DEFAULT_STORY_MODE_PROFILE.resolutionStyle),
    chapterUnit: normalizeText(record.chapterUnit, DEFAULT_STORY_MODE_PROFILE.chapterUnit),
    volumeReward: normalizeText(record.volumeReward, DEFAULT_STORY_MODE_PROFILE.volumeReward),
    mandatorySignals: normalizeList(record.mandatorySignals, DEFAULT_STORY_MODE_PROFILE.mandatorySignals),
    antiSignals: normalizeList(record.antiSignals, DEFAULT_STORY_MODE_PROFILE.antiSignals),
  });
}

export function parseStoryModeProfileJson(profileJson: string | null | undefined): StoryModeProfile {
  if (!profileJson?.trim()) {
    return DEFAULT_STORY_MODE_PROFILE;
  }
  try {
    return sanitizeStoryModeProfile(JSON.parse(profileJson));
  } catch {
    return DEFAULT_STORY_MODE_PROFILE;
  }
}

export function serializeStoryModeProfile(profile: unknown): string {
  return JSON.stringify(sanitizeStoryModeProfile(profile));
}

type StoryModeRow = {
  id: string;
  name: string;
  description?: string | null;
  template?: string | null;
  parentId?: string | null;
  profileJson?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export function normalizeStoryModeOutput<T extends StoryModeRow>(
  storyMode: T,
): Omit<T, "profileJson" | "createdAt" | "updatedAt"> & NovelStoryMode {
  const { profileJson, createdAt, updatedAt, ...rest } = storyMode;
  return {
    ...rest,
    profile: parseStoryModeProfileJson(profileJson),
    createdAt: typeof createdAt === "string" ? createdAt : createdAt.toISOString(),
    updatedAt: typeof updatedAt === "string" ? updatedAt : updatedAt.toISOString(),
  };
}

export function buildStoryModePromptBlock(input: {
  primary?: (Pick<NovelStoryMode, "id" | "name" | "description" | "template" | "profile">) | null;
  secondary?: (Pick<NovelStoryMode, "id" | "name" | "description" | "template" | "profile">) | null;
}): string {
  const language = getBackendLanguage();
  const labels = language === "en"
    ? {
        primary: "Primary story mode",
        secondary: "Secondary story mode",
        preface: "Story-mode constraints: the primary mode is the hard constraint; the secondary mode can only add flavor and cannot override the primary mode's conflict ceiling or forbidden signals.",
      }
    : language === "zh"
      ? {
          primary: "主流派模式",
          secondary: "副流派模式",
          preface: "流派模式约束：主流派模式是硬约束，副流派模式只能补充风味，不能覆盖主模式的冲突上限和禁止信号。",
        }
      : {
          primary: "Chế độ truyện chính",
          secondary: "Chế độ truyện phụ",
          preface: "Ràng buộc chế độ truyện: chế độ chính là ràng buộc cứng; chế độ phụ chỉ được bổ sung sắc thái, không được lấn át trần xung đột hay tín hiệu cấm của chế độ chính.",
        };
  const sections: string[] = [];
  if (input.primary) {
    sections.push(formatSingleStoryModeBlock(labels.primary, input.primary, true, language));
  }
  if (input.secondary) {
    sections.push(formatSingleStoryModeBlock(labels.secondary, input.secondary, false, language));
  }
  if (sections.length === 0) {
    return "";
  }
  return [
    labels.preface,
    ...sections,
  ].join("\n\n");
}

function formatSingleStoryModeBlock(
  label: string,
  storyMode: Pick<NovelStoryMode, "name" | "description" | "template" | "profile">,
  isPrimary: boolean,
  language: "vi" | "en" | "zh",
): string {
  const profile = storyMode.profile;
  const labels = language === "en"
    ? {
        description: "Description",
        template: "Supplemental template",
        coreDrive: "Core drive",
        readerReward: "Reader reward",
        chapterUnit: "Chapter progression unit",
        volumeReward: "Volume-end payoff",
        allowed: "Allowed conflict forms",
        forbidden: "Forbidden conflict forms",
        ceiling: "Conflict ceiling",
        resolution: "Resolution style",
        mandatory: "Signals that must recur",
        anti: "Signals that must be avoided",
        progression: "Main progression units",
        requirementPrimary: "Usage requirement: all downstream planning and generation must prioritize this mode.",
        requirementSecondary: "Usage requirement: this may only add flavor and must not break the primary mode boundaries.",
      }
    : language === "zh"
      ? {
          description: "说明",
          template: "补充模板",
          coreDrive: "核心驱动",
          readerReward: "读者奖励",
          chapterUnit: "章节推进单位",
          volumeReward: "卷末兑现",
          allowed: "允许的冲突形式",
          forbidden: "禁止的冲突形式",
          ceiling: "冲突上限",
          resolution: "化解方式",
          mandatory: "必须反复出现的信号",
          anti: "必须避免的跑偏信号",
          progression: "剧情主要推进单位",
          requirementPrimary: "使用要求：后续规划与生成必须优先服从这一模式。",
          requirementSecondary: "使用要求：只能作为补充风味，不得破坏主模式的边界。",
        }
      : {
          description: "Mô tả",
          template: "Mẫu bổ sung",
          coreDrive: "Động lực cốt lõi",
          readerReward: "Phần thưởng cho độc giả",
          chapterUnit: "Đơn vị tiến triển của chương",
          volumeReward: "Điểm trả thưởng cuối tập",
          allowed: "Dạng xung đột được phép",
          forbidden: "Dạng xung đột bị cấm",
          ceiling: "Trần xung đột",
          resolution: "Cách hóa giải",
          mandatory: "Tín hiệu phải lặp lại",
          anti: "Tín hiệu lệch hướng phải tránh",
          progression: "Đơn vị tiến triển chính của cốt truyện",
          requirementPrimary: "Yêu cầu sử dụng: mọi bước lập kế hoạch và sinh nội dung phía sau phải ưu tiên tuân theo chế độ này.",
          requirementSecondary: "Yêu cầu sử dụng: chỉ được bổ sung sắc thái, không được phá vỡ biên của chế độ chính.",
        };
  return [
    `${label}: ${storyMode.name}`,
    storyMode.description ? `${labels.description}: ${storyMode.description}` : "",
    storyMode.template ? `${labels.template}: ${storyMode.template}` : "",
    `${labels.coreDrive}: ${profile.coreDrive}`,
    `${labels.readerReward}: ${profile.readerReward}`,
    `${labels.chapterUnit}: ${profile.chapterUnit}`,
    `${labels.volumeReward}: ${profile.volumeReward}`,
    `${labels.allowed}: ${profile.allowedConflictForms.join(language === "zh" ? "、" : ", ")}`,
    `${labels.forbidden}: ${profile.forbiddenConflictForms.join(language === "zh" ? "、" : ", ")}`,
    `${labels.ceiling}: ${profile.conflictCeiling}`,
    `${labels.resolution}: ${profile.resolutionStyle}`,
    `${labels.mandatory}: ${profile.mandatorySignals.join(language === "zh" ? "、" : ", ")}`,
    `${labels.anti}: ${profile.antiSignals.join(language === "zh" ? "、" : ", ")}`,
    `${labels.progression}: ${profile.progressionUnits.join(language === "zh" ? "、" : ", ")}`,
    isPrimary
      ? labels.requirementPrimary
      : labels.requirementSecondary,
  ].filter(Boolean).join("\n");
}
