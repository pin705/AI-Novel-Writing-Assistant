import type { LLMProvider } from "./llm";

export type BookAnalysisStatus = "draft" | "queued" | "running" | "succeeded" | "failed" | "cancelled" | "archived";
export type BookAnalysisSectionStatus = "idle" | "running" | "succeeded" | "failed";
export type BookAnalysisSectionKey =
  | "overview"
  | "plot_structure"
  | "timeline"
  | "character_system"
  | "worldbuilding"
  | "themes"
  | "style_technique"
  | "market_highlights";

export interface BookAnalysisSectionDefinition {
  key: BookAnalysisSectionKey;
}

export const BOOK_ANALYSIS_SECTIONS: ReadonlyArray<BookAnalysisSectionDefinition> = [
  { key: "overview" },
  { key: "plot_structure" },
  { key: "timeline" },
  { key: "character_system" },
  { key: "worldbuilding" },
  { key: "themes" },
  { key: "style_technique" },
  { key: "market_highlights" },
];

export interface BookAnalysisEvidenceItem {
  label: string;
  excerpt: string;
  sourceLabel: string;
}

export interface BookAnalysisSection {
  id: string;
  analysisId: string;
  sectionKey: BookAnalysisSectionKey;
  title: string;
  status: BookAnalysisSectionStatus;
  aiContent?: string | null;
  editedContent?: string | null;
  notes?: string | null;
  structuredData?: Record<string, unknown> | null;
  evidence: BookAnalysisEvidenceItem[];
  frozen: boolean;
  sortOrder: number;
  updatedAt: string;
}

export interface BookAnalysis {
  id: string;
  documentId: string;
  documentVersionId: string;
  documentTitle: string;
  documentFileName: string;
  documentVersionNumber: number;
  currentDocumentVersionId?: string | null;
  currentDocumentVersionNumber: number;
  isCurrentVersion: boolean;
  title: string;
  status: BookAnalysisStatus;
  summary?: string | null;
  provider?: LLMProvider | null;
  model?: string | null;
  temperature?: number | null;
  maxTokens?: number | null;
  progress: number;
  heartbeatAt?: string | null;
  currentStage?: string | null;
  currentItemKey?: string | null;
  currentItemLabel?: string | null;
  cancelRequestedAt?: string | null;
  attemptCount: number;
  maxAttempts: number;
  lastError?: string | null;
  lastRunAt?: string | null;
  publishedDocumentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookAnalysisDetail extends BookAnalysis {
  sections: BookAnalysisSection[];
}

export interface BookAnalysisPublishResult {
  analysisId: string;
  novelId: string;
  knowledgeDocumentId: string;
  knowledgeDocumentVersionNumber: number;
  bindingCount: number;
  publishedAt: string;
}

export interface BookAnalysisSectionOptimizePreview {
  optimizedDraft: string;
}
