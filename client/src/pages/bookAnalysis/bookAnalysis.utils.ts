import type { BookAnalysisDetail, BookAnalysisSection, BookAnalysisStatus } from "@ai-novel/shared/types/bookAnalysis";
import type { SectionDraft } from "./bookAnalysis.types";
import { t } from "@/i18n";


export function formatStatus(status: BookAnalysisStatus | BookAnalysisSection["status"]): string {
  switch (status) {
    case "draft":
      return t("草稿");
    case "queued":
      return t("排队中");
    case "running":
      return t("运行中");
    case "succeeded":
      return t("成功");
    case "failed":
      return t("失败");
    case "archived":
      return t("已归档");
    case "idle":
      return t("待处理");
    default:
      return status;
  }
}

export function formatStage(stage?: string | null): string {
  switch (stage) {
    case "loading_cache":
      return t("查缓存");
    case "preparing_notes":
      return t("准备 notes");
    case "generating_sections":
      return t("生成章节");
    default:
      return stage?.trim() || t("暂无");
  }
}

export function formatDate(value?: string | null): string {
  if (!value) {
    return t("暂无");
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
