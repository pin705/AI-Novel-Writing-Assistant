import type { BookAnalysisDetail, BookAnalysisSection, BookAnalysisStatus } from "@ai-novel/shared/types/bookAnalysis";
import type { SectionDraft } from "./bookAnalysis.types";

export function formatStatus(status: BookAnalysisStatus | BookAnalysisSection["status"]): string {
  switch (status) {
    case "draft":
      return "Bản nháp";
    case "queued":
      return "Đang xếp hàng";
    case "running":
      return "Đang chạy";
    case "succeeded":
      return "Thành công";
    case "failed":
      return "Thất bại";
    case "archived":
      return "Đã lưu trữ";
    case "idle":
      return "Chờ xử lý";
    default:
      return status;
  }
}

export function formatStage(stage?: string | null): string {
  switch (stage) {
    case "loading_cache":
      return "Đang kiểm tra cache";
    case "preparing_notes":
      return "Đang chuẩn bị ghi chú";
    case "generating_sections":
      return "Đang tạo phần nội dung";
    default:
      return stage?.trim() || "Chưa có";
  }
}

export function formatDate(value?: string | null): string {
  if (!value) {
    return "Chưa có";
  }
  return new Date(value).toLocaleString();
}

export function syncDrafts(detail: BookAnalysisDetail): Record<string, SectionDraft> {
  return Object.fromEntries(
    detail.sections.map((section) => [
      section.id,
      {
        editedContent: section.editedContent ?? section.aiContent ?? "",
        notes: section.notes ?? "",
        frozen: section.frozen,
        optimizeInstruction: "",
        optimizePreview: "",
      },
    ]),
  );
}

export function createDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function buildSectionDraft(section: BookAnalysisSection): SectionDraft {
  return {
    editedContent: section.editedContent ?? section.aiContent ?? "",
    notes: section.notes ?? "",
    frozen: section.frozen,
    optimizeInstruction: "",
    optimizePreview: "",
  };
}
