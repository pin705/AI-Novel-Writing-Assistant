import type { NovelExportScope } from "@ai-novel/shared/types/novelExport";
import { getBackendMessage, type BackendLocale } from "../../../i18n";
import type {
  NovelExportBasicSection,
  NovelExportBundle,
  NovelExportCharacterSection,
  NovelExportChapterSection,
  NovelExportOutlineSection,
  NovelExportPipelineSection,
  NovelExportSectionMap,
  NovelExportSectionScope,
  NovelExportStoryMacroSection,
  NovelExportStructuredSection,
} from "./novelExportTypes";

const FULL_SECTION_ORDER: NovelExportSectionScope[] = [
  "basic",
  "story_macro",
  "character",
  "outline",
  "structured",
  "chapter",
  "pipeline",
];

function normalizeText(input: string | null | undefined): string {
  return (input ?? "").replace(/\r\n?/g, "\n").trim();
}

function hasMeaningfulText(input: string | null | undefined): boolean {
  return normalizeText(input).length > 0;
}

function getNovelExportScopeLabel(scope: NovelExportScope, locale?: BackendLocale): string {
  switch (scope) {
    case "full":
      return getBackendMessage("novel.export.scope.full", undefined, locale);
    case "basic":
      return getBackendMessage("novel.export.scope.basic", undefined, locale);
    case "story_macro":
      return getBackendMessage("novel.export.scope.story_macro", undefined, locale);
    case "character":
      return getBackendMessage("novel.export.scope.character", undefined, locale);
    case "outline":
      return getBackendMessage("novel.export.scope.outline", undefined, locale);
    case "structured":
      return getBackendMessage("novel.export.scope.structured", undefined, locale);
    case "chapter":
      return getBackendMessage("novel.export.scope.chapter", undefined, locale);
    case "pipeline":
      return getBackendMessage("novel.export.scope.pipeline", undefined, locale);
    default:
      return scope;
  }
}

function addBullet(lines: string[], label: string, value: string | number | null | undefined): void {
  if (value === null || value === undefined) {
    return;
  }
  const text = typeof value === "number" ? String(value) : normalizeText(value);
  if (!text) {
    return;
  }
  lines.push(`- ${label}：${text}`);
}

function addParagraph(lines: string[], title: string, value: string | null | undefined, level = 3): void {
  const text = normalizeText(value);
  if (!text) {
    return;
  }
  lines.push(`${"#".repeat(level)} ${title}`);
  lines.push("");
  lines.push(text);
  lines.push("");
}

function addJsonBlock(lines: string[], title: string, value: unknown): void {
  lines.push(`### ${title}`);
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(value, null, 2));
  lines.push("```");
  lines.push("");
}

function buildBasicSummary(section: NovelExportBasicSection, locale?: BackendLocale): string[] {
  const lines: string[] = [];
  addBullet(lines, getBackendMessage("novel.export.summary.basic.title", undefined, locale), section.novel.title);
  addBullet(lines, getBackendMessage("novel.export.summary.basic.writing_mode", undefined, locale), section.novel.writingMode);
  addBullet(lines, getBackendMessage("novel.export.summary.basic.project_mode", undefined, locale), section.novel.projectMode ?? null);
  addBullet(lines, getBackendMessage("novel.export.summary.basic.genre", undefined, locale), section.novel.genre?.name ?? null);
  addBullet(lines, getBackendMessage("novel.export.summary.basic.primary_story_mode", undefined, locale), section.novel.primaryStoryMode?.name ?? null);
  addBullet(lines, getBackendMessage("novel.export.summary.basic.secondary_story_mode", undefined, locale), section.novel.secondaryStoryMode?.name ?? null);
  addBullet(lines, getBackendMessage("novel.export.summary.basic.bound_world", undefined, locale), section.novel.world?.name ?? null);
  addBullet(lines, getBackendMessage("novel.export.summary.basic.estimated_chapter_count", undefined, locale), section.novel.estimatedChapterCount ?? null);
  if ((section.novel.commercialTags ?? []).length > 0) {
    addBullet(lines, getBackendMessage("novel.export.summary.basic.commercial_tags", undefined, locale), section.novel.commercialTags.join(" / "));
  }
  addParagraph(lines, getBackendMessage("novel.export.summary.basic.one_line_description", undefined, locale), section.novel.description);
  addParagraph(lines, getBackendMessage("novel.export.summary.basic.target_audience", undefined, locale), section.novel.targetAudience);
  addParagraph(lines, getBackendMessage("novel.export.summary.basic.core_selling_point", undefined, locale), section.novel.bookSellingPoint);
  addParagraph(lines, getBackendMessage("novel.export.summary.basic.competing_feel", undefined, locale), section.novel.competingFeel);
  addParagraph(lines, getBackendMessage("novel.export.summary.basic.first30_chapter_promise", undefined, locale), section.novel.first30ChapterPromise);
  addParagraph(lines, getBackendMessage("novel.export.summary.basic.world_slice_core_frame", undefined, locale), section.worldSlice?.slice?.coreWorldFrame ?? null);
  return lines;
}

function buildStoryMacroSummary(section: NovelExportStoryMacroSection, locale?: BackendLocale): string[] {
  const lines: string[] = [];
  addParagraph(lines, getBackendMessage("novel.export.summary.story_macro.story_input", undefined, locale), section.storyMacroPlan?.storyInput);
  addParagraph(lines, getBackendMessage("novel.export.summary.story_macro.expanded_premise", undefined, locale), section.storyMacroPlan?.expansion?.expanded_premise ?? null);
  addParagraph(lines, getBackendMessage("novel.export.summary.story_macro.protagonist_core", undefined, locale), section.storyMacroPlan?.expansion?.protagonist_core ?? null);
  addParagraph(lines, getBackendMessage("novel.export.summary.story_macro.conflict_engine", undefined, locale), section.storyMacroPlan?.expansion?.conflict_engine ?? null);
  addParagraph(lines, getBackendMessage("novel.export.summary.story_macro.core_conflict", undefined, locale), section.storyMacroPlan?.decomposition?.core_conflict ?? null);
  addParagraph(lines, getBackendMessage("novel.export.summary.story_macro.main_hook", undefined, locale), section.storyMacroPlan?.decomposition?.main_hook ?? null);
  addParagraph(lines, getBackendMessage("novel.export.summary.story_macro.progression_loop", undefined, locale), section.storyMacroPlan?.decomposition?.progression_loop ?? null);
  addParagraph(lines, getBackendMessage("novel.export.summary.story_macro.reading_promise", undefined, locale), section.bookContract?.readingPromise ?? null);
  addParagraph(lines, getBackendMessage("novel.export.summary.story_macro.core_selling_point", undefined, locale), section.bookContract?.coreSellingPoint ?? null);
  addParagraph(lines, getBackendMessage("novel.export.summary.story_macro.escalation_ladder", undefined, locale), section.bookContract?.escalationLadder ?? null);
  if ((section.bookContract?.absoluteRedLines ?? []).length > 0) {
    lines.push(`### ${getBackendMessage("novel.export.summary.story_macro.absolute_red_lines", undefined, locale)}`);
    lines.push("");
    for (const item of section.bookContract?.absoluteRedLines ?? []) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }
  return lines;
}

function buildCharacterSummary(section: NovelExportCharacterSection, locale?: BackendLocale): string[] {
  const lines: string[] = [];
  addBullet(lines, getBackendMessage("novel.export.summary.character.character_count", undefined, locale), section.characters.length);
  addBullet(lines, getBackendMessage("novel.export.summary.character.relation_count", undefined, locale), section.relations.length);
  addBullet(lines, getBackendMessage("novel.export.summary.character.cast_option_count", undefined, locale), section.castOptions.length);
  if (section.characters.length > 0) {
    lines.push(`### ${getBackendMessage("novel.export.summary.character.current_characters", undefined, locale)}`);
    lines.push("");
    for (const character of section.characters) {
      const parts = [character.name, character.role, character.castRole].filter((item): item is string => Boolean(item?.trim()));
      lines.push(`- ${parts.join(" / ")}`);
    }
    lines.push("");
  }
  return lines;
}

function buildOutlineSummary(section: NovelExportOutlineSection, locale?: BackendLocale): string[] {
  const lines: string[] = [];
  addBullet(lines, getBackendMessage("novel.export.summary.outline.source", undefined, locale), section.workspace?.source ?? null);
  addBullet(lines, getBackendMessage("novel.export.summary.outline.volume_count", undefined, locale), section.workspace?.volumes.length ?? 0);
  addBullet(lines, getBackendMessage("novel.export.summary.outline.recommended_volume_count", undefined, locale), section.workspace?.strategyPlan?.recommendedVolumeCount ?? null);
  addParagraph(lines, getBackendMessage("novel.export.summary.outline.derived_outline", undefined, locale), section.workspace?.derivedOutline ?? null);
  addParagraph(lines, getBackendMessage("novel.export.summary.outline.reader_reward_ladder", undefined, locale), section.workspace?.strategyPlan?.readerRewardLadder ?? null);
  addParagraph(lines, getBackendMessage("novel.export.summary.outline.escalation_ladder", undefined, locale), section.workspace?.strategyPlan?.escalationLadder ?? null);
  addParagraph(lines, getBackendMessage("novel.export.summary.outline.strategy_notes", undefined, locale), section.workspace?.strategyPlan?.notes ?? null);
  addParagraph(lines, getBackendMessage("novel.export.summary.outline.critique_summary", undefined, locale), section.workspace?.critiqueReport?.summary ?? null);
  return lines;
}

function buildStructuredSummary(section: NovelExportStructuredSection, locale?: BackendLocale): string[] {
  const lines: string[] = [];
  const beatCount = (section.workspace?.beatSheets ?? []).reduce((sum, item) => sum + item.beats.length, 0);
  const chapterCount = (section.workspace?.volumes ?? []).reduce((sum, item) => sum + item.chapters.length, 0);
  addBullet(lines, getBackendMessage("novel.export.summary.structured.beat_sheet_count", undefined, locale), beatCount);
  addBullet(lines, getBackendMessage("novel.export.summary.structured.chapter_plan_count", undefined, locale), chapterCount);
  addBullet(lines, getBackendMessage("novel.export.summary.structured.rebalance_decision_count", undefined, locale), section.workspace?.rebalanceDecisions.length ?? 0);
  addParagraph(lines, getBackendMessage("novel.export.summary.structured.structured_outline", undefined, locale), section.workspace?.derivedStructuredOutline ?? null);
  return lines;
}

function buildChapterSummary(section: NovelExportChapterSection, locale?: BackendLocale): string[] {
  const lines: string[] = [];
  const generatedCount = section.chapters.filter((chapter) => hasMeaningfulText(chapter.content)).length;
  addBullet(lines, getBackendMessage("novel.export.summary.chapter.chapter_count", undefined, locale), section.chapters.length);
  addBullet(lines, getBackendMessage("novel.export.summary.chapter.generated_chapter_count", undefined, locale), generatedCount);
  addBullet(lines, getBackendMessage("novel.export.summary.chapter.chapter_plan_count", undefined, locale), section.chapterPlans.length);
  if (section.chapters.length > 0) {
    lines.push(`### ${getBackendMessage("novel.export.summary.chapter.chapter_list", undefined, locale)}`);
    lines.push("");
    for (const chapter of section.chapters) {
      lines.push(`- ${getBackendMessage("novel.export.summary.chapter.chapter_list_item", {
        order: chapter.order,
        title: chapter.title,
      }, locale)}`);
    }
    lines.push("");
  }
  return lines;
}

function buildPipelineSummary(section: NovelExportPipelineSection, locale?: BackendLocale): string[] {
  const lines: string[] = [];
  addBullet(lines, getBackendMessage("novel.export.summary.pipeline.overall_quality_score", undefined, locale), section.qualityReport.summary.overall);
  addBullet(lines, getBackendMessage("novel.export.summary.pipeline.quality_report_count", undefined, locale), section.qualityReport.totalReports ?? section.qualityReport.chapterReports.length);
  addBullet(lines, getBackendMessage("novel.export.summary.pipeline.audit_report_count", undefined, locale), section.chapterAuditReports.length);
  addBullet(lines, getBackendMessage("novel.export.summary.pipeline.plot_beat_count", undefined, locale), section.plotBeats.length);
  addBullet(lines, getBackendMessage("novel.export.summary.pipeline.payoff_ledger_item_count", undefined, locale), section.payoffLedger?.items.length ?? 0);
  addBullet(lines, getBackendMessage("novel.export.summary.pipeline.latest_pipeline_status", undefined, locale), section.latestPipelineJob?.status ?? null);
  addParagraph(lines, getBackendMessage("novel.export.summary.pipeline.bible_raw_content", undefined, locale), section.bible?.rawContent ?? null);
  return lines;
}

function buildSectionSummary(
  scope: NovelExportSectionScope,
  section: NovelExportSectionMap[NovelExportSectionScope],
  locale?: BackendLocale,
): string[] {
  switch (scope) {
    case "basic":
      return buildBasicSummary(section as NovelExportBasicSection, locale);
    case "story_macro":
      return buildStoryMacroSummary(section as NovelExportStoryMacroSection, locale);
    case "character":
      return buildCharacterSummary(section as NovelExportCharacterSection, locale);
    case "outline":
      return buildOutlineSummary(section as NovelExportOutlineSection, locale);
    case "structured":
      return buildStructuredSummary(section as NovelExportStructuredSection, locale);
    case "chapter":
      return buildChapterSummary(section as NovelExportChapterSection, locale);
    case "pipeline":
      return buildPipelineSummary(section as NovelExportPipelineSection, locale);
    default:
      return [];
  }
}

export function buildScopedNovelExportPayload(
  bundle: NovelExportBundle,
  scope: NovelExportScope,
): {
  metadata: NovelExportBundle["metadata"] & {
    scope: NovelExportScope;
    scopeLabel: string;
  };
  data: NovelExportSectionMap | NovelExportSectionMap[NovelExportSectionScope];
} {
  return {
    metadata: {
      ...bundle.metadata,
      scope,
      scopeLabel: getNovelExportScopeLabel(scope),
    },
    data: scope === "full" ? bundle.sections : bundle.sections[scope],
  };
}

export function buildMarkdownExportContent(bundle: NovelExportBundle, scope: NovelExportScope): string {
  const lines: string[] = [];
  const scopeLabel = getNovelExportScopeLabel(scope);
  const sectionScopes = scope === "full" ? FULL_SECTION_ORDER : [scope];

  lines.push(`# ${getBackendMessage("novel.export.markdown.title", { title: bundle.metadata.novelTitle })}`);
  lines.push("");
  lines.push(`- ${getBackendMessage("novel.export.markdown.scope")}: ${scopeLabel}`);
  lines.push(`- ${getBackendMessage("novel.export.markdown.exported_at")}: ${bundle.metadata.exportedAt}`);
  lines.push(`- ${getBackendMessage("novel.export.markdown.novel_id")}: ${bundle.metadata.novelId}`);
  lines.push("");

  for (const sectionScope of sectionScopes) {
    const section = bundle.sections[sectionScope];
    lines.push(`## ${getNovelExportScopeLabel(sectionScope)}`);
    lines.push("");
    const summaryLines = buildSectionSummary(sectionScope, section);
    if (summaryLines.length > 0) {
      lines.push(...summaryLines);
    } else {
      lines.push(getBackendMessage("novel.export.markdown.empty_summary"));
      lines.push("");
    }
    addJsonBlock(lines, getBackendMessage("novel.export.markdown.full_data"), section);
  }

  return lines.join("\n");
}
