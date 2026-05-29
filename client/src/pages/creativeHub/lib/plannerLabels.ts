type Translator = (key: string, values?: Record<string, string | number | undefined | null>) => string;

const INTENT_KEYS = new Set([
  "social_opening",
  "list_novels",
  "list_worlds",
  "query_task_status",
  "create_novel",
  "select_novel_workspace",
  "bind_world_to_novel",
  "unbind_world_from_novel",
  "produce_novel",
  "query_novel_production_status",
  "query_novel_title",
  "query_chapter_content",
  "query_progress",
  "inspect_failure_reason",
  "write_chapter",
  "rewrite_chapter",
  "save_chapter_draft",
  "start_pipeline",
  "inspect_characters",
  "inspect_timeline",
  "inspect_world",
  "search_knowledge",
  "ideate_novel_setup",
  "general_chat",
  "unknown",
]);

const SOURCE_KEYS = new Set(["llm", "unknown"]);

function formatBilingualLabel(label: string, rawValue: string) {
  return `${label}（${rawValue}）`;
}

export function getIntentDisplayLabel(intent: unknown, t: Translator): string {
  const rawValue = typeof intent === "string" && intent.trim() ? intent.trim() : "unknown";
  const label = INTENT_KEYS.has(rawValue)
    ? t(`creativeHub.plannerLabels.intent.${rawValue}`)
    : t("creativeHub.plannerLabels.intent.unmapped");
  return formatBilingualLabel(label, rawValue);
}

export function getPlannerSourceDisplayLabel(source: unknown, t: Translator): string {
  const rawValue = typeof source === "string" && source.trim() ? source.trim() : "unknown";
  const label = SOURCE_KEYS.has(rawValue)
    ? t(`creativeHub.plannerLabels.source.${rawValue}`)
    : t("creativeHub.plannerLabels.source.unmapped");
  return formatBilingualLabel(label, rawValue);
}
