import type {
  VolumeBeatSheet,
  VolumeChapterListGenerationMode,
  VolumeGenerationScopeInput,
  VolumePlan,
  VolumePlanDocument,
} from "@ai-novel/shared/types/novel";
import { findBeatSheet } from "../volumePlan.utils";
import type { ChapterDetailMode } from "../chapterDetailPlanning.shared";
import { t } from "@/i18n";


export interface ChapterListGenerationRequest {
  generationMode?: VolumeChapterListGenerationMode;
  targetBeatKey?: string;
}

export interface VolumeGenerationPayload {
  scope: VolumeGenerationScopeInput;
  generationMode?: VolumeChapterListGenerationMode;
  targetVolumeId?: string;
  targetBeatKey?: string;
  targetChapterId?: string;
  detailMode?: ChapterDetailMode;
  draftVolumesOverride?: VolumePlan[];
  suppressSuccessMessage?: boolean;
}

export function startStrategyGenerationAction(params: {
  ensureCharacterGuard: () => boolean;
  userPreferredVolumeCount: number | null;
  forceSystemRecommendedVolumeCount: boolean;
  volumeCountGuidance: {
    systemRecommendedVolumeCount: number;
    allowedVolumeCountRange: { min: number; max: number };
    respectedExistingVolumeCount?: number | null;
  };
  hasUnsavedVolumeDraft: boolean;
  generate: (payload: VolumeGenerationPayload) => void;
}): void {
  if (!params.ensureCharacterGuard()) {
    return;
  }
  const confirmed = window.confirm([
    t("将生成卷战略建议，帮助决定推荐卷数、硬规划卷数和各卷角色定位。"),
    t("这一步不会直接生成卷骨架，也不会拆章节。"),
    params.userPreferredVolumeCount != null
      ? t("本次将固定为 {{userPreferredVolumeCount}} 卷生成分卷策略。", { userPreferredVolumeCount: params.userPreferredVolumeCount })
      : params.forceSystemRecommendedVolumeCount
        ? t("本次将按系统建议卷数生成（当前建议 {{systemRecommendedVolumeCount}} 卷），不沿用现有草稿卷数。", { systemRecommendedVolumeCount: params.volumeCountGuidance.systemRecommendedVolumeCount })
        : params.volumeCountGuidance.respectedExistingVolumeCount != null
          ? t("本次会优先沿用当前草稿的 {{respectedExistingVolumeCount}} 卷结构，同时保持在允许区间 {{min}}-{{max}} 内。", { respectedExistingVolumeCount: params.volumeCountGuidance.respectedExistingVolumeCount, min: params.volumeCountGuidance.allowedVolumeCountRange.min, max: params.volumeCountGuidance.allowedVolumeCountRange.max })
          : t("当前系统建议 {{systemRecommendedVolumeCount}} 卷，允许区间 {{min}}-{{max}} 卷。", { systemRecommendedVolumeCount: params.volumeCountGuidance.systemRecommendedVolumeCount, min: params.volumeCountGuidance.allowedVolumeCountRange.min, max: params.volumeCountGuidance.allowedVolumeCountRange.max }),
    params.hasUnsavedVolumeDraft ? t("本次会直接使用当前页面未保存草稿作为参考。") : t("本次会基于当前工作区状态生成建议。"),
  ].join("\n\n"));
  if (!confirmed) {
    return;
  }
  params.generate({ scope: "strategy" });
}

export function startStrategyCritiqueAction(params: {
  ensureCharacterGuard: () => boolean;
  generate: (payload: VolumeGenerationPayload) => void;
}): void {
  if (!params.ensureCharacterGuard()) {
    return;
  }
  params.generate({ scope: "strategy_critique" });
}

export function startSkeletonGenerationAction(params: {
  ensureCharacterGuard: () => boolean;
  hasUnsavedVolumeDraft: boolean;
  generate: (payload: VolumeGenerationPayload) => void;
}): void {
  if (!params.ensureCharacterGuard()) {
    return;
  }
  const confirmed = window.confirm([
    t("将根据当前卷战略建议生成或重生成全书卷骨架。"),
    t("这一步会清空已有节奏板和相邻卷再平衡建议，但不会直接删除章节正文。"),
    params.hasUnsavedVolumeDraft ? t("本次会直接使用当前页面草稿作为卷骨架上下文。") : t("本次会基于当前卷工作区继续推进。"),
  ].join("\n\n"));
  if (!confirmed) {
    return;
  }
  params.generate({ scope: "skeleton" });
}

export function startBeatSheetGenerationAction(params: {
  volumeId: string;
  normalizedVolumeDraft: VolumePlan[];
  strategyPlan: object | null;
  beatSheets: VolumeBeatSheet[];
  ensureCharacterGuard: () => boolean;
  setStructuredMessage: (value: string) => void;
  generate: (payload: VolumeGenerationPayload) => void;
}): void {
  const targetVolume = params.normalizedVolumeDraft.find((volume) => volume.id === params.volumeId);
  if (!targetVolume) {
    params.setStructuredMessage(t("当前卷不存在，无法生成节奏板。"));
    return;
  }
  if (!params.strategyPlan) {
    params.setStructuredMessage(t("请先生成卷战略建议，再生成当前卷节奏板。"));
    return;
  }
  if (!params.ensureCharacterGuard()) {
    return;
  }
  const existingBeatSheet = findBeatSheet(params.beatSheets, params.volumeId);
  if (existingBeatSheet) {
    const confirmed = window.confirm([
      t("将重新生成「{{value}}」的节奏板。", {
        value: targetVolume.title?.trim() || t("第{{sortOrder}}卷", { sortOrder: targetVolume.sortOrder }),
      }),
      t("这一步会覆盖当前卷现有节奏段与交付项。"),
      t("已有章节列表和章节细化资产不会被直接删除，但如果新节奏区间发生变化，建议随后检查章节列表是否仍然匹配。"),
    ].join("\n\n"));
    if (!confirmed) {
      return;
    }
  }
  params.generate({
    scope: "beat_sheet",
    targetVolumeId: params.volumeId,
  });
}

export function startChapterListGenerationAction(params: {
  volumeId: string;
  request?: ChapterListGenerationRequest;
  normalizedVolumeDraft: VolumePlan[];
  beatSheets: VolumeBeatSheet[];
  ensureCharacterGuard: () => boolean;
  setStructuredMessage: (value: string) => void;
  generate: (payload: VolumeGenerationPayload) => void;
}): void {
  const targetVolume = params.normalizedVolumeDraft.find((volume) => volume.id === params.volumeId);
  if (!targetVolume) {
    params.setStructuredMessage(t("当前卷不存在，无法生成章节列表。"));
    return;
  }
  if (!findBeatSheet(params.beatSheets, params.volumeId)) {
    params.setStructuredMessage(t("当前卷还没有节奏板，默认不能直接拆章节列表。"));
    return;
  }
  if (!params.ensureCharacterGuard()) {
    return;
  }
  const generationMode = params.request?.generationMode ?? "full_volume";
  const targetBeatKey = params.request?.targetBeatKey?.trim();
  if (generationMode === "single_beat" && !targetBeatKey) {
    params.setStructuredMessage(t("当前节奏段不存在，无法重生该段章节标题。"));
    return;
  }
  params.generate({
    scope: "chapter_list",
    generationMode,
    targetVolumeId: params.volumeId,
    targetBeatKey,
  });
}

export function buildChapterListSuccessMessage(params: {
  document: VolumePlanDocument;
  targetVolumeId?: string;
  generationMode?: VolumeChapterListGenerationMode;
  targetBeatKey?: string;
}): string {
  const updatedVolume = params.targetVolumeId
    ? params.document.volumes.find((volume) => volume.id === params.targetVolumeId)
    : undefined;
  const updatedChapterCount = updatedVolume?.chapters.length ?? 0;
  if (params.generationMode === "single_beat" && params.targetVolumeId && params.targetBeatKey) {
    const targetBeat = findBeatSheet(params.document.beatSheets, params.targetVolumeId)?.beats
      .find((beat) => beat.key === params.targetBeatKey);
    return updatedChapterCount > 0
      ? t("当前卷节奏段「{{value}}」已重生并自动保存，本卷现有 {{updatedChapterCount}} 章，相邻卷再平衡建议也已同步更新。", { value: targetBeat?.label ?? params.targetBeatKey, updatedChapterCount: updatedChapterCount })
      : t("当前卷节奏段「{{value}}」已重生并自动保存，相邻卷再平衡建议也已同步更新。", { value: targetBeat?.label ?? params.targetBeatKey });
  }
  return updatedChapterCount > 0
    ? t("当前卷章节列表已生成并自动保存，现已更新为 {{updatedChapterCount}} 章，相邻卷再平衡建议也已同步更新。", { updatedChapterCount: updatedChapterCount })
    : t("当前卷章节列表已生成并自动保存，相邻卷再平衡建议也已同步更新。");
}
