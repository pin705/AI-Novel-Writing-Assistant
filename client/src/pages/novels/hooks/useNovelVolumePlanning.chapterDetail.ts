import type { VolumePlan, VolumePlanDocument } from "@ai-novel/shared/types/novel";
import {
  CHAPTER_DETAIL_MODES,
  hasAnyChapterDetailDraft,
  type ChapterDetailBundleRequest,
  type ChapterDetailMode,
} from "../chapterDetailPlanning.shared";

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
  return `Chương ${target.chapterOrder} “${target.title || "Chưa đặt tên"}”`;
}

function buildFallbackLabel(targets: ChapterDetailTarget[]): string {
  if (targets.length === 1) {
    return describeChapterTarget(targets[0]);
  }
  const first = targets[0];
  const last = targets[targets.length - 1];
  if (!first || !last) {
    return "Phạm vi chương hiện tại";
  }
  return `Chương ${first.chapterOrder}-${last.chapterOrder} (tổng ${targets.length} chương)`;
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
      ? `Dựa trên nội dung hiện có, AI sẽ bổ sung mục tiêu chương, ranh giới thực hiện và danh sách việc cho ${batch.label}.`
      : `Dựa trên nội dung hiện có, AI sẽ bổ sung liên tiếp mục tiêu chương, ranh giới thực hiện và danh sách việc cho ${batch.label}.`,
    batch.hasExistingDrafts
      ? "Hệ thống sẽ ưu tiên giữ lại phần đã điền của từng chương, chỉ chỉnh các chỗ thiếu, mơ hồ hoặc chưa đủ khả thi."
      : "Các chương này hiện vẫn đang trống, nên AI sẽ tạo bản đầu tiên trước rồi thu gọn dần theo tiêu đề và tóm tắt sẵn có.",
    "Sẽ không thay đổi tiêu đề và tóm tắt chương.",
    batch.missingCount > 0 ? `Có ${batch.missingCount} chương không còn nằm trong bản nháp hiện tại, hệ thống sẽ tự bỏ qua.` : "",
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
  setIsGenerating(true);
  setCurrentMode("");
  setCurrentChapterId(targets[0]?.chapterId ?? "");
  setStructuredMessage(`Đang liên tiếp tạo mục tiêu chương, ranh giới thực hiện và danh sách việc cho ${label}...`);

  try {
    for (const target of targets) {
      setCurrentChapterId(target.chapterId);
      for (const mode of CHAPTER_DETAIL_MODES) {
        setCurrentMode(mode);
        const result = await generateChapterDetail({
          targetVolumeId,
          targetChapterId: target.chapterId,
          detailMode: mode,
          draftVolumesOverride: workingDraft,
          suppressSuccessMessage: true,
        });
        workingDraft = result.nextDocument.volumes;
      }
    }
    setStructuredMessage(`Mục tiêu chương, ranh giới thực hiện và danh sách việc của ${label} đã được bổ sung và tự động lưu.`);
  } catch {
    // error message is handled by mutation onError
  } finally {
    setIsGenerating(false);
    setCurrentChapterId("");
    setCurrentMode("");
  }
}
