import type { BookAnalysisDetail, BookAnalysisSection, BookAnalysisStatus } from "@ai-novel/shared/types/bookAnalysis";
import type { SectionDraft } from "./bookAnalysis.types";

type Translator = (key: string, values?: Record<string, string | number | undefined | null>) => string;

export function formatStatus(
  status: BookAnalysisStatus | BookAnalysisSection["status"],
  t: Translator,
): string {
  switch (status) {
    case "draft":
      return t("bookAnalysis.status.draft");
    case "queued":
      return t("bookAnalysis.status.queued");
    case "running":
      return t("bookAnalysis.status.running");
    case "succeeded":
      return t("bookAnalysis.status.succeeded");
    case "failed":
      return t("bookAnalysis.status.failed");
    case "archived":
      return t("bookAnalysis.status.archived");
    case "idle":
      return t("bookAnalysis.status.idle");
    default:
      return status;
  }
}

export function formatStage(stage: string | null | undefined, t: Translator): string {
  switch (stage) {
    case "loading_cache":
      return t("bookAnalysis.stage.loadingCache");
    case "preparing_notes":
      return t("bookAnalysis.stage.preparingNotes");
    case "generating_sections":
      return t("bookAnalysis.stage.generatingSections");
    default:
      return stage?.trim() || t("bookAnalysis.common.none");
  }
}

export function formatDate(value: string | null | undefined, t: Translator): string {
  if (!value) {
    return t("bookAnalysis.common.none");
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
