import type { BookAnalysisDetail, BookAnalysisSection } from "@ai-novel/shared/types/bookAnalysis";
import {
  getBookAnalysisExportText,
  getBookAnalysisSeparators,
  getBookAnalysisStatusLabel,
} from "./bookAnalysis.i18n";
import { getEffectiveContent } from "./bookAnalysis.utils";

function sectionContentToMarkdown(section: BookAnalysisSection): string {
  const content = getEffectiveContent(section);
  if (!content) {
    return getBookAnalysisExportText().emptyContent;
  }
  return content;
}

export function buildPublishDocumentTitle(detail: Pick<BookAnalysisDetail, "id" | "documentTitle">): string {
  return getBookAnalysisExportText()
    .publishDocumentTitle
    .replace("{{documentTitle}}", detail.documentTitle)
    .replace("{{id}}", detail.id);
}

export function buildPublishFileName(
  detail: Pick<BookAnalysisDetail, "id" | "documentTitle" | "documentVersionNumber">,
): string {
  const slug = `${detail.documentTitle}-v${detail.documentVersionNumber}`.replace(/[\\/:*?"<>|]/g, "-");
  return `${slug}-book-analysis-${detail.id}.md`;
}

export function buildPublishMarkdown(
  detail: Pick<
    BookAnalysisDetail,
    | "id"
    | "title"
    | "status"
    | "documentTitle"
    | "documentFileName"
    | "documentVersionNumber"
    | "currentDocumentVersionNumber"
    | "sections"
  >,
  publishedAtISO: string,
): { content: string; hasPublishableContent: boolean } {
  const exportText = getBookAnalysisExportText();
  const separators = getBookAnalysisSeparators();
  const markdownParts: string[] = [
    `# ${detail.title} ${exportText.publishedHeadingSuffix}`.trim(),
    "",
    exportText.publishMetadataHeading,
    "",
    `- ${exportText.sourceAnalysisId}${separators.value}${detail.id}`,
    `- ${exportText.sourceDocument}${separators.value}${detail.documentTitle}`,
    `- ${exportText.sourceFileName}${separators.value}${detail.documentFileName}`,
    `- ${exportText.sourceVersion}${separators.value}v${detail.documentVersionNumber}`,
    `- ${exportText.currentVersion}${separators.value}v${detail.currentDocumentVersionNumber}`,
    `- ${exportText.status}${separators.value}${getBookAnalysisStatusLabel(detail.status)}`,
    `- ${exportText.publishedAt}${separators.value}${publishedAtISO}`,
    "",
  ];

  let hasPublishableContent = false;

  for (const section of detail.sections) {
    const content = getEffectiveContent(section).trim();
    const notes = section.notes?.trim() ?? "";
    const evidence = section.evidence.filter((item) => item.label.trim() || item.excerpt.trim());
    if (!content && !notes && evidence.length === 0) {
      continue;
    }
    hasPublishableContent = true;
    markdownParts.push(`## ${section.title}`);
    markdownParts.push("");
    markdownParts.push(content || exportText.emptyContent);
    markdownParts.push("");

    if (notes) {
      markdownParts.push(exportText.editorNotesHeading);
      markdownParts.push("");
      markdownParts.push(notes);
      markdownParts.push("");
    }

    if (evidence.length > 0) {
      markdownParts.push(exportText.evidenceHeading);
      markdownParts.push("");
      for (const item of evidence) {
        markdownParts.push(`- [${item.sourceLabel}] ${item.label}${separators.value}${item.excerpt}`);
      }
      markdownParts.push("");
    }
  }

  return {
    content: markdownParts.join("\n"),
    hasPublishableContent,
  };
}

export function buildAnalysisExportContent(
  detail: BookAnalysisDetail,
  format: "markdown" | "json",
): { fileName: string; contentType: string; content: string } {
  const slugBase = `${detail.documentTitle}-v${detail.documentVersionNumber}`.replace(/[\\/:*?"<>|]/g, "-");
  if (format === "json") {
    return {
      fileName: `${slugBase}-book-analysis.json`,
      contentType: "application/json; charset=utf-8",
      content: JSON.stringify(detail, null, 2),
    };
  }

  const exportText = getBookAnalysisExportText();
  const separators = getBookAnalysisSeparators();
  const markdownParts: string[] = [
    `# ${detail.title}`,
    "",
    `- ${exportText.document}${separators.value}${detail.documentTitle}`,
    `- ${exportText.originalFile}${separators.value}${detail.documentFileName}`,
    `- ${exportText.sourceVersion}${separators.value}v${detail.documentVersionNumber}`,
    `- ${exportText.currentVersion}${separators.value}v${detail.currentDocumentVersionNumber}`,
    `- ${exportText.status}${separators.value}${getBookAnalysisStatusLabel(detail.status)}`,
    detail.summary ? `- ${exportText.summary}${separators.value}${detail.summary}` : "",
    "",
  ];

  for (const section of detail.sections) {
    markdownParts.push(`## ${section.title}`);
    markdownParts.push("");
    markdownParts.push(sectionContentToMarkdown(section));
    if (section.notes?.trim()) {
      markdownParts.push("");
      markdownParts.push(exportText.editorNotesHeading);
      markdownParts.push("");
      markdownParts.push(section.notes.trim());
    }
    if (section.evidence.length > 0) {
      markdownParts.push("");
      markdownParts.push(exportText.evidenceHeading);
      markdownParts.push("");
      for (const evidence of section.evidence) {
        markdownParts.push(`- [${evidence.sourceLabel}] ${evidence.label}${separators.value}${evidence.excerpt}`);
      }
    }
    markdownParts.push("");
  }

  return {
    fileName: `${slugBase}-book-analysis.md`,
    contentType: "text/markdown; charset=utf-8",
    content: markdownParts.join("\n"),
  };
}
