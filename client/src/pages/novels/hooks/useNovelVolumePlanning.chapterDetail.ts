import type { VolumePlan, VolumePlanDocument } from "@ai-novel/shared/types/novel";
import {
  CHAPTER_DETAIL_MODES,
  hasAnyChapterDetailDraft,
  hasChapterDetailDraft,
  type ChapterDetailBundleRequest,
  type ChapterDetailMode,
} from "../chapterDetailPlanning.shared";
import { t } from "@/i18n";


interface ChapterDetailTarget {
  chapterId: string;
  chapterOrder: number;
  title: string;
}

interface ResolvedChapterDetailBatch {
  label: string;
  missingCount: number;
  targets: ChapterDetailTarget[];
  hasExistingDrafts: boolean;
}

interface ChapterDetailMutationPayload {
  targetVolumeId: string;
  targetChapterId: string;
  detailMode: ChapterDetailMode;
  draftVolumesOverride: VolumePlan[];
  suppressSuccessMessage: true;
}

interface ChapterDetailMutationResult {
  nextDocument: VolumePlanDocument;
}

interface RunChapterDetailBatchGenerationArgs {
  initialDraft: VolumePlan[];
  label: string;
  targetVolumeId: string;
  targets: ChapterDetailTarget[];
  setIsGenerating: (value: boolean) => void;
  setCurrentChapterId: (value: string) => void;
  setCurrentMode: (value: ChapterDetailMode | "") => void;
  setStructuredMessage: (value: string) => void;
  generateChapterDetail: (
    payload: ChapterDetailMutationPayload,
  ) => Promise<ChapterDetailMutationResult>;
}

function describeChapterTarget(target: ChapterDetailTarget): string {
  return t("第{{chapterOrder}}章《{{value}}》", { chapterOrder: target.chapterOrder, value: target.title || t("未命名章节") });
}

function buildFallbackLabel(targets: ChapterDetailTarget[]): string {
  if (targets.length === 1) {
    return describeChapterTarget(targets[0]);
  }
  const first = targets[0];
  const last = targets[targets.length - 1];
  if (!first || !last) {
    return t("当前章节范围");
  }
  return t("第{{chapterOrder}}-{{chapterOrder1}}章（共 {{length}} 章）", { chapterOrder: first.chapterOrder, chapterOrder1: last.chapterOrder, length: targets.length });
}

function resolveMissingChapterDetailModes(
  draft: VolumePlan[],
  targetVolumeId: string,
  targetChapterId: string,
): ChapterDetailMode[] {
  const chapter = draft
    .find((volume) => volume.id === targetVolumeId)
    ?.chapters.find((item) => item.id === targetChapterId);
  if (!chapter) {
    return [];
  }
  return CHAPTER_DETAIL_MODES.filter((mode) => !hasChapterDetailDraft(chapter, mode));
}

export function resolveChapterDetailBatch(
  volume: VolumePlan | undefined,
  request: ChapterDetailBundleRequest,
): ResolvedChapterDetailBatch {
  const requestedIds = typeof request === "string"
    ? [request]
    : Array.from(new Set(request.chapterIds.map((id) => id.trim()).filter(Boolean)));
  const matchedChapters = requestedIds
    .map((chapterId) => volume?.chapters.find((chapter) => chapter.id === chapterId))
    .filter((chapter): chapter is VolumePlan["chapters"][number] => Boolean(chapter));

  return {
    label: typeof request === "string"
      ? buildFallbackLabel(matchedChapters.map((chapter) => ({
        chapterId: chapter.id,
        chapterOrder: chapter.chapterOrder,
        title: chapter.title,
      })))
      : request.label?.trim() || buildFallbackLabel(matchedChapters.map((chapter) => ({
        chapterId: chapter.id,
        chapterOrder: chapter.chapterOrder,
        title: chapter.title,
      }))),
    missingCount: Math.max(requestedIds.length - matchedChapters.length, 0),
    targets: matchedChapters.map((chapter) => ({
      chapterId: chapter.id,
      chapterOrder: chapter.chapterOrder,
      title: chapter.title,
    })),
    hasExistingDrafts: matchedChapters.some((chapter) => hasAnyChapterDetailDraft(chapter)),
  };
}

export function buildChapterDetailBatchConfirmationMessage(
  batch: ResolvedChapterDetailBatch,
): string {
  return [
    batch.targets.length === 1
      ? t("将基于当前内容为{{label}} AI 补齐章节目标、执行边界和任务单。", { label: batch.label })
      : t("将基于当前内容为{{label}}连续补齐章节目标、执行边界和任务单。", { label: batch.label }),
    batch.hasExistingDrafts
      ? t("会优先沿用各章已填写结果，只修正空缺、模糊和不够可执行的部分。")
      : t("当前这些章节还是空白，AI 会先补出首版，再按现有标题和摘要逐章收束。"),
    t("不会改动章节标题和摘要。"),
    batch.missingCount > 0 ? t("有 {{missingCount}} 章已不在当前卷草稿中，会自动跳过。", { missingCount: batch.missingCount }) : "",
  ].filter(Boolean).join("\n\n");
}

export async function runChapterDetailBatchGeneration({
  initialDraft,
  label,
  targetVolumeId,
  targets,
  setIsGenerating,
  setCurrentChapterId,
  setCurrentMode,
  setStructuredMessage,
  generateChapterDetail,
}: RunChapterDetailBatchGenerationArgs): Promise<void> {
  let workingDraft = initialDraft;
  let processedModeCount = 0;
  setIsGenerating(true);
  setCurrentMode("");
  setCurrentChapterId(targets[0]?.chapterId ?? "");
  setStructuredMessage(t("正在为{{label}}补齐缺失的章节目标、执行边界和任务单...", { label: label }));

  try {
    for (const target of targets) {
      const missingModes = resolveMissingChapterDetailModes(workingDraft, targetVolumeId, target.chapterId);
      if (missingModes.length === 0) {
        continue;
      }
      setCurrentChapterId(target.chapterId);
      for (const mode of missingModes) {
        setCurrentMode(mode);
        const result = await generateChapterDetail({
          targetVolumeId,
          targetChapterId: target.chapterId,
          detailMode: mode,
          draftVolumesOverride: workingDraft,
          suppressSuccessMessage: true,
        });
        workingDraft = result.nextDocument.volumes;
        processedModeCount += 1;
      }
    }
    setStructuredMessage(
      processedModeCount > 0
        ? t("{{label}}的章节目标、执行边界和任务单已补齐并自动保存。", { label: label })
        : t("{{label}}当前已经完整，无需重复生成章节细化。", { label: label }),
    );
  } catch {
    // error message is handled by mutation onError
  } finally {
    setIsGenerating(false);
    setCurrentChapterId("");
    setCurrentMode("");
  }
}
