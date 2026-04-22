import type { CreativeHubNovelSetupStatus } from "@ai-novel/shared/types/creativeHub";
import { getBackendLanguage, getBackendMessage, getRequestLocale } from "../../i18n";

function getLocalizedListSeparator(): string {
  return getBackendLanguage(getRequestLocale()) === "zh" ? "、" : ", ";
}

function joinLocalizedItems(items: string[]): string {
  return items.join(getLocalizedListSeparator());
}

function buildLabeledLine(labelKey: Parameters<typeof getBackendMessage>[0], value: string): string {
  return getBackendMessage("agent.setup.fact.label_value", {
    label: getBackendMessage(labelKey),
    value,
  });
}

function stageLabel(stage: CreativeHubNovelSetupStatus["stage"]): string {
  switch (stage) {
    case "ready_for_production":
      return getBackendMessage("agent.setup.stage.ready_for_production");
    case "ready_for_planning":
      return getBackendMessage("agent.setup.stage.ready_for_planning");
    default:
      return getBackendMessage("agent.setup.stage.initializing");
  }
}

export function parseNovelSetupStatus(value: unknown): CreativeHubNovelSetupStatus | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.novelId !== "string"
    || typeof record.title !== "string"
    || typeof record.stage !== "string"
    || typeof record.nextQuestion !== "string"
    || typeof record.recommendedAction !== "string"
    || !Array.isArray(record.missingItems)
  ) {
    return null;
  }
  return record as unknown as CreativeHubNovelSetupStatus;
}

export function buildNovelSetupGuidanceFacts(setup: CreativeHubNovelSetupStatus): string {
  const missing = joinLocalizedItems(setup.missingItems.slice(0, 5));
  const priorityItem = setup.checklist
    .find((item) => item.requiredForProduction && item.status !== "ready")
    ?? setup.checklist.find((item) => item.status !== "ready");
  const currentValue = priorityItem?.currentValue?.trim();
  const lines = [
    buildLabeledLine("agent.setup.fact.title", setup.title),
    buildLabeledLine("agent.setup.fact.current_stage", stageLabel(setup.stage)),
    buildLabeledLine("agent.setup.fact.progress", getBackendMessage("agent.setup.fact.progress_value", {
      completedCount: setup.completedCount,
      totalCount: setup.totalCount,
      completionRatio: setup.completionRatio,
    })),
    buildLabeledLine("agent.setup.fact.missing_items", missing || getBackendMessage("agent.setup.common.none")),
    buildLabeledLine("agent.setup.fact.priority_item", priorityItem?.label ?? getBackendMessage("agent.setup.common.none")),
    buildLabeledLine("agent.setup.fact.next_question", setup.nextQuestion),
    buildLabeledLine("agent.setup.fact.recommended_action", setup.recommendedAction),
  ];

  if (currentValue) {
    lines.push(buildLabeledLine("agent.setup.fact.current_value", currentValue));
  }

  return lines.join("\n");
}

export function formatNovelSetupGuidance(prefix: string, setup: CreativeHubNovelSetupStatus): string {
  const missing = joinLocalizedItems(setup.missingItems.slice(0, 3));
  const lines = [prefix];

  lines.push(getBackendMessage("agent.setup.guidance.current_status", {
    stageLabel: stageLabel(setup.stage),
    completedCount: setup.completedCount,
    totalCount: setup.totalCount,
  }));
  if (missing) {
    lines.push(getBackendMessage("agent.setup.guidance.remaining_items", {
      missingItems: missing,
      moreSuffix: setup.missingItems.length > 3
        ? getBackendMessage("agent.setup.guidance.remaining_items_more_suffix")
        : "",
    }));
  }
  lines.push(getBackendMessage("agent.setup.guidance.discuss_question", { question: setup.nextQuestion }));
  lines.push(getBackendMessage("agent.setup.guidance.offer_options"));

  return lines.join("\n");
}
