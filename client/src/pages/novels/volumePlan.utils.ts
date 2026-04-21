import type {
  VolumeBeatSheet,
  VolumeChapterPlan,
  VolumePlan,
  VolumePlanningReadiness,
  VolumeStrategyPlan,
  VolumeSyncPreview,
} from "@ai-novel/shared/types/novel";
import { t } from "@/i18n";


export interface ExistingOutlineChapter {
  id: string;
  order: number;
  title: string;
  content?: string | null;
  expectation?: string | null;
  targetWordCount?: number | null;
  conflictLevel?: number | null;
  revealLevel?: number | null;
  mustAvoid?: string | null;
  taskSheet?: string | null;
}

export interface VolumeSyncOptions {
  preserveContent: boolean;
  applyDeletes: boolean;
}

export function buildVolumePlanningReadiness(params: {
  volumes: VolumePlan[];
  strategyPlan: VolumeStrategyPlan | null;
  beatSheets: VolumeBeatSheet[];
}): VolumePlanningReadiness {
  const { volumes, strategyPlan, beatSheets } = params;
  const blockingReasons: string[] = [];
  if (!strategyPlan) {
    blockingReasons.push(t("请先生成卷战略建议，再确认卷骨架。"));
  }
  if (volumes.length === 0) {
    blockingReasons.push(t("当前还没有卷骨架。"));
  }
  if (!beatSheets.some((sheet) => sheet.beats.length > 0)) {
    blockingReasons.push(t("当前卷还没有节奏板，默认不能直接拆章节列表。"));
  }
  return {
    canGenerateStrategy: true,
    canGenerateSkeleton: Boolean(strategyPlan),
    canGenerateBeatSheet: Boolean(strategyPlan) && volumes.length > 0,
    canGenerateChapterList: Boolean(strategyPlan) && beatSheets.some((sheet) => sheet.beats.length > 0),
    blockingReasons,
  };
}

export function findBeatSheet(beatSheets: VolumeBeatSheet[], volumeId: string): VolumeBeatSheet | null {
  return beatSheets.find((sheet) => sheet.volumeId === volumeId && sheet.beats.length > 0) ?? null;
}

function createLocalId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
}

export function createEmptyVolume(sortOrder: number): VolumePlan {
  return {
    id: createLocalId("volume"),
    novelId: "",
    sortOrder,
    title: t("第{{sortOrder}}卷", { sortOrder: sortOrder }),
    summary: "",
    openingHook: "",
    mainPromise: "",
    primaryPressureSource: "",
    coreSellingPoint: "",
    escalationMode: "",
    protagonistChange: "",
    midVolumeRisk: "",
    climax: "",
    payoffType: "",
    nextVolumeHook: "",
    resetPoint: "",
    openPayoffs: [],
    status: "active",
    sourceVersionId: null,
    chapters: [],
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

export function createEmptyChapter(chapterOrder: number): VolumeChapterPlan {
  return {
    id: createLocalId("chapter"),
    volumeId: "",
    chapterOrder,
    beatKey: null,
    title: t("第{{chapterOrder}}章", { chapterOrder: chapterOrder }),
    summary: "",
    purpose: "",
    conflictLevel: null,
    revealLevel: null,
    targetWordCount: null,
    mustAvoid: "",
    taskSheet: "",
    payoffRefs: [],
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

export function buildTaskSheetFromVolumeChapter(chapter: VolumeChapterPlan): string {
  const lines = [
    t("章节目标：{{value}}", { value: chapter.purpose || chapter.summary || t("推进主线") }),
    typeof chapter.conflictLevel === "number" ? t("冲突等级：{{conflictLevel}}", { conflictLevel: chapter.conflictLevel }) : "",
    typeof chapter.revealLevel === "number" ? t("揭露等级：{{revealLevel}}", { revealLevel: chapter.revealLevel }) : "",
    typeof chapter.targetWordCount === "number" ? t("目标字数：{{targetWordCount}}", { targetWordCount: chapter.targetWordCount }) : "",
    chapter.mustAvoid?.trim() ? t("禁止事项：{{trim}}", { trim: chapter.mustAvoid.trim() }) : "",
    chapter.payoffRefs.length > 0 ? t("兑现关联：{{value}}", { value: chapter.payoffRefs.join("、") }) : "",
  ].filter(Boolean);
  return lines.join("\n");
}

export function normalizeVolumeDraft(volumes: VolumePlan[]): VolumePlan[] {
  let chapterOrder = 1;
  return volumes
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((volume, volumeIndex) => {
      const volumeId = volume.id || createLocalId("volume");
      const chapters = (volume.chapters ?? [])
        .slice()
        .sort((a, b) => a.chapterOrder - b.chapterOrder)
        .map((chapter) => {
          const normalizedChapter = {
            ...chapter,
            id: chapter.id || createLocalId("chapter"),
            volumeId,
            chapterOrder,
          };
          chapterOrder += 1;
          return normalizedChapter;
        });
      return {
        ...volume,
        id: volumeId,
        sortOrder: volumeIndex + 1,
        openPayoffs: (volume.openPayoffs ?? []).filter((item) => item.trim()),
        openingHook: volume.openingHook ?? "",
        primaryPressureSource: volume.primaryPressureSource ?? "",
        coreSellingPoint: volume.coreSellingPoint ?? "",
        midVolumeRisk: volume.midVolumeRisk ?? "",
        payoffType: volume.payoffType ?? "",
        chapters,
      };
    });
}

export function buildOutlinePreviewFromVolumes(volumes: VolumePlan[]): string {
  return normalizeVolumeDraft(volumes)
    .map((volume) => {
      const chapterSpan = volume.chapters.length > 0
        ? `${volume.chapters[0]?.chapterOrder ?? "-"}-${volume.chapters[volume.chapters.length - 1]?.chapterOrder ?? "-"}`
        : t("未拆章");
      return [
        t("【第{{sortOrder}}卷】{{title}}", { sortOrder: volume.sortOrder, title: volume.title }),
        volume.summary?.trim() ? t("卷摘要：{{trim}}", { trim: volume.summary.trim() }) : "",
        volume.openingHook?.trim() ? t("开卷抓手：{{trim}}", { trim: volume.openingHook.trim() }) : "",
        volume.mainPromise?.trim() ? t("主承诺：{{trim}}", { trim: volume.mainPromise.trim() }) : "",
        volume.primaryPressureSource?.trim() ? t("主压迫源：{{trim}}", { trim: volume.primaryPressureSource.trim() }) : "",
        volume.coreSellingPoint?.trim() ? t("核心卖点：{{trim}}", { trim: volume.coreSellingPoint.trim() }) : "",
        volume.escalationMode?.trim() ? t("升级方式：{{trim}}", { trim: volume.escalationMode.trim() }) : "",
        volume.protagonistChange?.trim() ? t("主角变化：{{trim}}", { trim: volume.protagonistChange.trim() }) : "",
        volume.midVolumeRisk?.trim() ? t("中段风险：{{trim}}", { trim: volume.midVolumeRisk.trim() }) : "",
        volume.climax?.trim() ? t("卷末高潮：{{trim}}", { trim: volume.climax.trim() }) : "",
        volume.payoffType?.trim() ? t("兑现类型：{{trim}}", { trim: volume.payoffType.trim() }) : "",
        volume.nextVolumeHook?.trim() ? t("下卷钩子：{{trim}}", { trim: volume.nextVolumeHook.trim() }) : "",
        volume.resetPoint?.trim() ? t("重置点：{{trim}}", { trim: volume.resetPoint.trim() }) : "",
        volume.openPayoffs.length > 0 ? t("未兑现事项：{{value}}", { value: volume.openPayoffs.join("；") }) : "",
        t("章节范围：{{chapterSpan}}", { chapterSpan: chapterSpan }),
      ].filter(Boolean).join("\n");
    })
    .join("\n\n");
}

export function buildStructuredPreviewFromVolumes(volumes: VolumePlan[]): string {
  return JSON.stringify({
    volumes: normalizeVolumeDraft(volumes).map((volume) => ({
      volumeTitle: volume.title,
      summary: volume.summary || undefined,
      openingHook: volume.openingHook || undefined,
      mainPromise: volume.mainPromise || undefined,
      primaryPressureSource: volume.primaryPressureSource || undefined,
      coreSellingPoint: volume.coreSellingPoint || undefined,
      escalationMode: volume.escalationMode || undefined,
      protagonistChange: volume.protagonistChange || undefined,
      midVolumeRisk: volume.midVolumeRisk || undefined,
      climax: volume.climax || undefined,
      payoffType: volume.payoffType || undefined,
      nextVolumeHook: volume.nextVolumeHook || undefined,
      resetPoint: volume.resetPoint || undefined,
      openPayoffs: volume.openPayoffs,
      chapters: volume.chapters.map((chapter) => ({
        order: chapter.chapterOrder,
        beat_key: chapter.beatKey ?? undefined,
        title: chapter.title,
        summary: chapter.summary,
        purpose: chapter.purpose || undefined,
        conflict_level: chapter.conflictLevel ?? undefined,
        reveal_level: chapter.revealLevel ?? undefined,
        target_word_count: chapter.targetWordCount ?? undefined,
        must_avoid: chapter.mustAvoid || undefined,
        task_sheet: chapter.taskSheet || undefined,
        payoff_refs: chapter.payoffRefs,
      })),
    })),
  }, null, 2);
}

export function applyVolumeChapterBatch(
  volumes: VolumePlan[],
  patch: {
    conflictLevel?: number;
    targetWordCount?: number;
    generateTaskSheet?: boolean;
  },
): VolumePlan[] {
  return normalizeVolumeDraft(volumes).map((volume) => ({
    ...volume,
    chapters: volume.chapters.map((chapter) => {
      const nextChapter: VolumeChapterPlan = { ...chapter };
      if (typeof patch.conflictLevel === "number") {
        nextChapter.conflictLevel = Math.max(0, Math.min(100, Math.round(patch.conflictLevel)));
      }
      if (typeof patch.targetWordCount === "number") {
        nextChapter.targetWordCount = Math.max(200, Math.round(patch.targetWordCount));
      }
      if (patch.generateTaskSheet) {
        nextChapter.taskSheet = buildTaskSheetFromVolumeChapter(nextChapter);
      }
      return nextChapter;
    }),
  }));
}

function compareText(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? "").trim() === (b ?? "").trim();
}

function compareNumber(a: number | null | undefined, b: number | null | undefined): boolean {
  return (typeof a === "number" ? a : null) === (typeof b === "number" ? b : null);
}

function getChangedFields(existing: ExistingOutlineChapter, chapter: VolumeChapterPlan, action: "update" | "move"): string[] {
  const changed: string[] = action === "move" ? [t("章节顺序")] : [];
  if (!compareText(existing.title, chapter.title)) changed.push(t("标题"));
  if (!compareText(existing.expectation, chapter.summary)) changed.push(t("摘要"));
  if (!compareNumber(existing.targetWordCount, chapter.targetWordCount)) changed.push(t("目标字数"));
  if (!compareNumber(existing.conflictLevel, chapter.conflictLevel)) changed.push(t("冲突等级"));
  if (!compareNumber(existing.revealLevel, chapter.revealLevel)) changed.push(t("揭露等级"));
  if (!compareText(existing.mustAvoid, chapter.mustAvoid)) changed.push(t("禁止事项"));
  if (!compareText(existing.taskSheet, chapter.taskSheet)) changed.push(t("任务单"));
  return changed;
}

export function buildVolumeSyncPreview(
  volumes: VolumePlan[],
  existingChapters: ExistingOutlineChapter[],
  options: VolumeSyncOptions,
): VolumeSyncPreview {
  const normalizedVolumes = normalizeVolumeDraft(volumes);
  const flattened = normalizedVolumes.flatMap((volume) => volume.chapters.map((chapter) => ({ volume, chapter })));
  const existingByOrder = new Map(existingChapters.map((chapter) => [chapter.order, chapter]));
  const existingByTitle = new Map(existingChapters.map((chapter) => [chapter.title.trim().toLowerCase(), chapter]));
  const matchedChapterIds = new Set<string>();
  const items: VolumeSyncPreview["items"] = [];
  let createCount = 0;
  let updateCount = 0;
  let keepCount = 0;
  let moveCount = 0;
  let deleteCount = 0;
  let deleteCandidateCount = 0;
  let affectedGeneratedCount = 0;
  let clearContentCount = 0;

  for (const entry of flattened) {
    const existingBySameOrder = existingByOrder.get(entry.chapter.chapterOrder);
    const matchedByOrder = existingBySameOrder && !matchedChapterIds.has(existingBySameOrder.id)
      ? existingBySameOrder
      : undefined;
    const matchedByTitle = existingByTitle.get(entry.chapter.title.trim().toLowerCase());
    const existing = matchedByOrder ?? (
      matchedByTitle && !matchedChapterIds.has(matchedByTitle.id)
        ? matchedByTitle
        : undefined
    );

    if (!existing) {
      createCount += 1;
      items.push({
        action: "create",
        volumeTitle: entry.volume.title,
        chapterOrder: entry.chapter.chapterOrder,
        nextTitle: entry.chapter.title,
        hasContent: false,
        changedFields: [t("新章节")],
      });
      continue;
    }

    matchedChapterIds.add(existing.id);
    const action = existing.order === entry.chapter.chapterOrder ? "update" : "move";
    const changedFields = getChangedFields(existing, entry.chapter, action);
    const hasContent = Boolean(existing.content?.trim());
    if (changedFields.length === 0) {
      keepCount += 1;
      items.push({
        action: "keep",
        volumeTitle: entry.volume.title,
        chapterOrder: entry.chapter.chapterOrder,
        nextTitle: entry.chapter.title,
        previousTitle: existing.title,
        hasContent,
        changedFields: [],
      });
      continue;
    }

    if (action === "move") {
      moveCount += 1;
    } else {
      updateCount += 1;
    }
    if (hasContent) {
      affectedGeneratedCount += 1;
      if (!options.preserveContent) {
        clearContentCount += 1;
      }
    }
    items.push({
      action,
      volumeTitle: entry.volume.title,
      chapterOrder: entry.chapter.chapterOrder,
      nextTitle: entry.chapter.title,
      previousTitle: existing.title,
      hasContent,
      changedFields,
    });
  }

  for (const chapter of existingChapters.slice().sort((a, b) => a.order - b.order)) {
    if (matchedChapterIds.has(chapter.id)) {
      continue;
    }
    const hasContent = Boolean(chapter.content?.trim());
    if (options.applyDeletes) {
      deleteCount += 1;
      items.push({
        action: "delete",
        volumeTitle: "未匹配",
        chapterOrder: chapter.order,
        nextTitle: chapter.title,
        previousTitle: chapter.title,
        hasContent,
        changedFields: [t("从卷纲移除")],
      });
    } else {
      deleteCandidateCount += 1;
      items.push({
        action: "delete_candidate",
        volumeTitle: "未匹配",
        chapterOrder: chapter.order,
        nextTitle: chapter.title,
        previousTitle: chapter.title,
        hasContent,
        changedFields: [t("待确认删除")],
      });
    }
  }

  return {
    createCount,
    updateCount,
    keepCount,
    moveCount,
    deleteCount,
    deleteCandidateCount,
    affectedGeneratedCount,
    clearContentCount,
    affectedVolumeCount: new Set(items.filter((item) => item.action !== "keep").map((item) => item.volumeTitle)).size,
    items,
  };
}
