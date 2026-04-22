import {
  LOADING_CACHE_PROGRESS,
  NOTES_PROGRESS_SHARE,
  SECTION_PROGRESS_SHARE,
} from "./bookAnalysis.config";
import {
  formatBookAnalysisCacheHitLabel,
  formatBookAnalysisCacheLookupLabel,
  formatBookAnalysisSectionProgressLabel,
  formatBookAnalysisSegmentProgressLabel,
} from "./bookAnalysis.i18n";

export function getLoadingCacheProgress(): number {
  return LOADING_CACHE_PROGRESS;
}

export function getCacheHitProgress(): number {
  return NOTES_PROGRESS_SHARE;
}

export function getNotesStageProgress(completed: number, total: number): number {
  if (total <= 0) {
    return NOTES_PROGRESS_SHARE;
  }
  return Number((NOTES_PROGRESS_SHARE * (completed / total)).toFixed(4));
}

export function getSectionStageProgress(completed: number, total: number): number {
  if (total <= 0) {
    return 1;
  }
  return Number((NOTES_PROGRESS_SHARE + SECTION_PROGRESS_SHARE * (completed / total)).toFixed(4));
}

export function formatCacheLookupLabel(): string {
  return formatBookAnalysisCacheLookupLabel();
}

export function formatCacheHitLabel(segmentCount: number): string {
  return formatBookAnalysisCacheHitLabel(segmentCount);
}

export function formatSegmentProgressLabel(index: number, total: number, label: string): string {
  return formatBookAnalysisSegmentProgressLabel(index, total, label);
}

export function formatSectionProgressLabel(index: number, total: number, label: string): string {
  return formatBookAnalysisSectionProgressLabel(index, total, label);
}
