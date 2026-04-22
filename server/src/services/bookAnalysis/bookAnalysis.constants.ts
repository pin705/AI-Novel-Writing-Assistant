import type { BookAnalysisSectionKey } from "@ai-novel/shared/types/bookAnalysis";
import { getBookAnalysisSectionPrompt } from "./bookAnalysis.i18n";

export const CHAPTER_HEADING_REGEX =
  /^\s*((序章|楔子|尾声|后记|番外|第[零一二三四五六七八九十百千万两\d]+[章节回卷部集篇]|chapter\s+\d+|chap\.\s*\d+)[^\n]{0,40})\s*$/i;
export const MIN_CHAPTER_DETECTION_COUNT = 3;
export const MIN_SEGMENT_BODY_LENGTH = 120;
export const MAX_SEGMENT_COUNT = 12;
export const MIN_SEGMENT_CHARS = 6_000;
export const TARGET_SEGMENT_CHARS = 10_000;
export const MAX_SEGMENT_CHARS = 16_000;
export const CHUNK_OVERLAP_CHARS = 400;
export const DEFAULT_ANALYSIS_TEMPERATURE = 0.3;
export const MIN_ANALYSIS_MAX_TOKENS = 256;
export const MAX_ANALYSIS_MAX_TOKENS = 32_768;
export const UNLIMITED_NOTES_MAX_TOKENS_CACHE_KEY = 0;

export function getBookAnalysisPrompt(sectionKey: BookAnalysisSectionKey): string {
  return getBookAnalysisSectionPrompt(sectionKey);
}
