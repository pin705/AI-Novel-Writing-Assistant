import { runTextPrompt } from "../../prompting/core/promptRunner";
import { runtimeFallbackAnswerPrompt } from "../../prompting/prompts/agent/runtime.prompts";
import { getBackendLanguage, getBackendMessage, getRequestLocale } from "../../i18n";
import { listAgentToolDefinitions } from "../toolRegistry";
import type { StructuredIntent, ToolCall, ToolExecutionContext } from "../types";
import { isRecord, safeJson, type ToolExecutionResult } from "./runtimeHelpers";
import { composeCreateNovelSetupAnswer, composeMissingNovelKickoffAnswer, composeSelectNovelWorkspaceSetupAnswer } from "./novelSetupGuidanceComposer";
import { composeNovelSetupIdeationAnswer } from "./novelSetupIdeationComposer";

const COLLABORATION_FIRST_INTENTS = new Set<StructuredIntent["intent"]>([
  "create_novel",
  "produce_novel",
  "write_chapter",
  "rewrite_chapter",
  "save_chapter_draft",
  "start_pipeline",
  "ideate_novel_setup",
  "general_chat",
  "unknown",
]);

function truncateText(value: string, max = 320): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

function getLocalizedInlineSeparator(): string {
  return getBackendLanguage(getRequestLocale()) === "zh" ? "、" : ", ";
}

function joinLocalizedItems(items: string[]): string {
  return items.join(getLocalizedInlineSeparator());
}

function getSuccessfulOutputs(results: ToolExecutionResult[], tool: ToolCall["tool"]): Record<string, unknown>[] {
  return results
    .filter((item) => item.success && item.tool === tool && item.output)
    .map((item) => item.output as Record<string, unknown>);
}
function getFailedResult(results: ToolExecutionResult[], tool: ToolCall["tool"]): ToolExecutionResult | null {
  return results.find((item) => !item.success && item.tool === tool) ?? null;
}
function buildGroundingFacts(results: ToolExecutionResult[]): string {
  return safeJson(results.map((item) => ({
    tool: item.tool,
    success: item.success,
    summary: item.summary,
    output: item.output
      ? Object.fromEntries(
        Object.entries(item.output).map(([key, value]) => {
          if (typeof value === "string") {
            return [key, truncateText(value, 400)];
          }
          if (Array.isArray(value)) {
            return [key, value.slice(0, 6)];
          }
          return [key, value];
        }),
      )
      : undefined,
  })));
}

function formatMissingInfo(structuredIntent?: StructuredIntent): string[] {
  return (structuredIntent?.missingInfo ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function buildCollaborativeQuestion(structuredIntent?: StructuredIntent): string {
  switch (structuredIntent?.intent) {
    case "produce_novel":
    case "create_novel":
      return getBackendMessage("agent.collab.question.produce");
    case "write_chapter":
    case "rewrite_chapter":
      return getBackendMessage("agent.collab.question.write");
    case "ideate_novel_setup":
      return getBackendMessage("agent.collab.question.ideate");
    default:
      return getBackendMessage("agent.collab.question.default");
  }
}

function buildCollaborativeOptions(structuredIntent?: StructuredIntent): string[] {
  switch (structuredIntent?.intent) {
    case "produce_novel":
    case "create_novel":
      return [
        getBackendMessage("agent.collab.option.produce.1"),
        getBackendMessage("agent.collab.option.produce.2"),
        getBackendMessage("agent.collab.option.produce.3"),
      ];
    case "write_chapter":
    case "rewrite_chapter":
      return [
        getBackendMessage("agent.collab.option.write.1"),
        getBackendMessage("agent.collab.option.write.2"),
        getBackendMessage("agent.collab.option.write.3"),
      ];
    case "ideate_novel_setup":
      return [
        getBackendMessage("agent.collab.option.ideate.1"),
        getBackendMessage("agent.collab.option.ideate.2"),
        getBackendMessage("agent.collab.option.ideate.3"),
      ];
    default:
      return [
        getBackendMessage("agent.collab.option.default.1"),
        getBackendMessage("agent.collab.option.default.2"),
        getBackendMessage("agent.collab.option.default.3"),
      ];
  }
}

function composeCollaborativeAnswer(goal: string, structuredIntent?: StructuredIntent): string {
  const missingInfo = formatMissingInfo(structuredIntent);
  const missingInfoText = joinLocalizedItems(missingInfo);
  const lead = structuredIntent?.intent === "general_chat" || structuredIntent?.intent === "unknown"
    ? getBackendMessage("agent.collab.lead.general", { goal })
    : getBackendMessage("agent.collab.lead.intent", { goal });
  const collaborationLead = structuredIntent?.interactionMode === "review"
    ? getBackendMessage("agent.collab.mode.review")
    : getBackendMessage("agent.collab.mode.cocreate");

  if ((structuredIntent?.assistantResponse ?? "explain") === "offer_options") {
    const options = buildCollaborativeOptions(structuredIntent)
      .map((item, index) => `${index + 1}. ${item}`)
      .join("\n");
    const missingLine = missingInfo.length > 0
      ? getBackendMessage("agent.collab.missing.offer_options", { missingInfo: missingInfoText })
      : "";
    return `${lead}\n${collaborationLead}\n${missingLine}${getBackendMessage("agent.collab.choose_direction", { options })}`;
  }

  const missingLine = missingInfo.length > 0
    ? getBackendMessage("agent.collab.missing.default", { missingInfo: missingInfoText })
    : "";
  return [lead, collaborationLead, missingLine, buildCollaborativeQuestion(structuredIntent)]
    .filter(Boolean)
    .join("\n");
}

function composeSocialOpeningAnswer(context: Omit<ToolExecutionContext, "runId" | "agentName">): string {
  if (context.novelId) {
    return getBackendMessage("agent.social.with_novel");
  }
  return getBackendMessage("agent.social.default");
}

function composeTitleAnswer(results: ToolExecutionResult[]): string {
  const title = getSuccessfulOutputs(results, "get_novel_context")
    .map((item) => (typeof item.title === "string" ? item.title.trim() : ""))
    .find(Boolean);
  return title ? title : getBackendMessage("agent.common.title_missing");
}

function composeNovelListAnswer(results: ToolExecutionResult[]): string {
  const list = getSuccessfulOutputs(results, "list_novels")[0];
  const items = Array.isArray(list?.items) ? list.items : [];
  const total = typeof list?.total === "number" ? list.total : items.length;
  if (items.length === 0) {
    return getBackendMessage("agent.list.novels.empty");
  }
  const lines = items.slice(0, 8).map((item, index) => {
    const title = typeof item?.title === "string" && item.title.trim()
      ? item.title.trim()
      : getBackendMessage("agent.list.novels.untitled");
    const chapterCount = typeof item?.chapterCount === "number" ? item.chapterCount : null;
    return chapterCount != null
      ? getBackendMessage("agent.list.novels.item.with_count", { index: index + 1, title, chapterCount })
      : getBackendMessage("agent.list.novels.item.without_count", { index: index + 1, title });
  });
  return getBackendMessage("agent.list.novels.summary", { total, lines: lines.join("\n") });
}

function composeBaseCharacterListAnswer(results: ToolExecutionResult[]): string {
  const list = getSuccessfulOutputs(results, "list_base_characters")[0];
  const items = Array.isArray(list?.items) ? list.items : [];
  if (items.length === 0) {
    return getBackendMessage("agent.list.base_characters.empty");
  }
  const lines = items.slice(0, 8).map((item, index) => {
    const name = typeof item?.name === "string" && item.name.trim()
      ? item.name.trim()
      : getBackendMessage("agent.list.base_characters.unnamed");
    const role = typeof item?.role === "string" && item.role.trim() ? item.role.trim() : null;
    const category = typeof item?.category === "string" && item.category.trim() ? item.category.trim() : null;
    const tags = typeof item?.tags === "string" && item.tags.trim() ? item.tags.trim() : null;
    const suffix = [role, category, tags].filter(Boolean).join(" / ");
    return suffix
      ? getBackendMessage("agent.list.base_characters.item.with_suffix", { index: index + 1, name, suffix })
      : getBackendMessage("agent.list.base_characters.item.without_suffix", { index: index + 1, name });
  });
  return getBackendMessage("agent.list.base_characters.summary", { count: items.length, lines: lines.join("\n") });
}

function composeWorldListAnswer(results: ToolExecutionResult[]): string {
  const list = getSuccessfulOutputs(results, "list_worlds")[0];
  const items = Array.isArray(list?.items) ? list.items : [];
  if (items.length === 0) {
    return getBackendMessage("agent.list.worlds.empty");
  }
  const lines = items.slice(0, 8).map((item, index) => {
    const name = typeof item?.name === "string" && item.name.trim()
      ? item.name.trim()
      : getBackendMessage("agent.list.worlds.unnamed");
    const status = typeof item?.status === "string" && item.status.trim() ? item.status.trim() : null;
    return status
      ? getBackendMessage("agent.list.worlds.item.with_status", { index: index + 1, name, status })
      : getBackendMessage("agent.list.worlds.item.without_status", { index: index + 1, name });
  });
  return getBackendMessage("agent.list.worlds.summary", { count: items.length, lines: lines.join("\n") });
}

function composeTaskListAnswer(results: ToolExecutionResult[]): string {
  const list = getSuccessfulOutputs(results, "list_tasks")[0];
  const items = Array.isArray(list?.items) ? list.items : [];
  if (items.length === 0) {
    return getBackendMessage("agent.list.tasks.empty");
  }
  const lines = items.slice(0, 8).map((item, index) => {
    const title = typeof item?.title === "string" && item.title.trim()
      ? item.title.trim()
      : getBackendMessage("agent.list.tasks.unnamed");
    const status = typeof item?.status === "string" && item.status.trim() ? item.status.trim() : "unknown";
    const kind = typeof item?.kind === "string" && item.kind.trim() ? item.kind.trim() : null;
    return kind
      ? getBackendMessage("agent.list.tasks.item.with_kind", { index: index + 1, title, kind, status })
      : getBackendMessage("agent.list.tasks.item.without_kind", { index: index + 1, title, status });
  });
  return getBackendMessage("agent.list.tasks.summary", { count: items.length, lines: lines.join("\n") });
}

function getFirstSuccessfulOutput(results: ToolExecutionResult[], tool: ToolCall["tool"]): Record<string, unknown> | null {
  return getSuccessfulOutputs(results, tool)[0] ?? null;
}

function composeBindWorldAnswer(
  results: ToolExecutionResult[],
  context: Omit<ToolExecutionContext, "runId" | "agentName">,
): string {
  const bound = getSuccessfulOutputs(results, "bind_world_to_novel")[0];
  if (bound) {
    const summary = typeof bound.summary === "string" ? bound.summary.trim() : "";
    if (summary) {
      return summary;
    }
    const worldName = typeof bound.worldName === "string" ? bound.worldName.trim() : "";
    const novelTitle = typeof bound.novelTitle === "string" ? bound.novelTitle.trim() : "";
    if (worldName && novelTitle) {
      return getBackendMessage("agent.bind_world.bound", { worldName, novelTitle });
    }
    return getBackendMessage("agent.bind_world.completed");
  }
  if (!context.novelId) {
    return getBackendMessage("agent.bind_world.no_context");
  }
  const failed = getFailedResult(results, "bind_world_to_novel");
  if (failed?.errorCode === "NOT_FOUND") {
    return getBackendMessage("agent.bind_world.not_found");
  }
  if (failed?.summary) {
    return failed.summary;
  }
  return getBackendMessage("agent.bind_world.incomplete");
}

function composeUnbindWorldAnswer(
  results: ToolExecutionResult[],
  context: Omit<ToolExecutionContext, "runId" | "agentName">,
): string {
  const unbound = getSuccessfulOutputs(results, "unbind_world_from_novel")[0];
  if (unbound) {
    const summary = typeof unbound.summary === "string" ? unbound.summary.trim() : "";
    if (summary) {
      return summary;
    }
    const novelTitle = typeof unbound.novelTitle === "string" ? unbound.novelTitle.trim() : "";
    const previousWorldName = typeof unbound.previousWorldName === "string" ? unbound.previousWorldName.trim() : "";
    if (novelTitle && previousWorldName) {
      return getBackendMessage("agent.unbind_world.unbound", { worldName: previousWorldName, novelTitle });
    }
    if (novelTitle) {
      return getBackendMessage("agent.unbind_world.updated", { novelTitle });
    }
    return getBackendMessage("agent.unbind_world.completed");
  }
  if (!context.novelId) {
    return getBackendMessage("agent.unbind_world.no_context");
  }
  const failed = getFailedResult(results, "unbind_world_from_novel");
  if (failed?.summary) {
    return failed.summary;
  }
  return getBackendMessage("agent.unbind_world.incomplete");
}

function composeProgressAnswer(results: ToolExecutionResult[]): string {
  const context = getSuccessfulOutputs(results, "get_novel_context")[0];
  if (!context) {
    return getBackendMessage("agent.common.insufficient_info");
  }
  const completedChapterCount = typeof context.completedChapterCount === "number"
    ? context.completedChapterCount
    : null;
  const chapterCount = typeof context.chapterCount === "number" ? context.chapterCount : null;
  const latestCompletedChapterOrder = typeof context.latestCompletedChapterOrder === "number"
    ? context.latestCompletedChapterOrder
    : null;
  if (completedChapterCount == null) {
    return getBackendMessage("agent.common.insufficient_info");
  }
  const parts = [
    chapterCount != null
      ? getBackendMessage("agent.progress.completed.with_total", { completedChapterCount, chapterCount })
      : getBackendMessage("agent.progress.completed.without_total", { completedChapterCount }),
  ];
  if (latestCompletedChapterOrder != null) {
    parts.push(getBackendMessage("agent.progress.latest_completed", { chapterOrder: latestCompletedChapterOrder }));
  }
  if (completedChapterCount === 0) {
    parts.push(getBackendMessage("agent.progress.none_written"));
  }
  return parts.join(" ");
}

function composeCharacterAnswer(results: ToolExecutionResult[]): string {
  const characterState = getSuccessfulOutputs(results, "get_character_states")[0];
  if (!characterState) {
    return getBackendMessage("agent.character.status_missing");
  }
  const count = typeof characterState.count === "number" ? characterState.count : 0;
  const items = Array.isArray(characterState.items) ? characterState.items : [];
  if (count === 0 || items.length === 0) {
    return getBackendMessage("agent.character.none_planned");
  }
  const lines = items.slice(0, 6).map((item, index) => {
    const name = typeof item?.name === "string" && item.name.trim()
      ? item.name.trim()
      : getBackendMessage("agent.character.unnamed");
    const role = typeof item?.role === "string" && item.role.trim() ? item.role.trim() : null;
    return role
      ? getBackendMessage("agent.character.item.with_role", { index: index + 1, name, role })
      : getBackendMessage("agent.character.item.without_role", { index: index + 1, name });
  });
  return getBackendMessage("agent.character.summary", { count, lines: lines.join("\n") });
}

function composeChapterAnswer(results: ToolExecutionResult[]): string | null {
  const contentOutputs = [
    ...getSuccessfulOutputs(results, "get_chapter_content_by_order"),
    ...getSuccessfulOutputs(results, "get_chapter_content"),
  ]
    .filter((item) => typeof item.order === "number")
    .sort((left, right) => Number(left.order) - Number(right.order));
  if (contentOutputs.length > 0) {
    return contentOutputs.map((item) => {
      const order = Number(item.order);
      const title = typeof item.title === "string" ? item.title.trim() : "";
      const content = typeof item.content === "string" ? item.content : "";
      const truncated = truncateText(content, 360) || getBackendMessage("agent.chapter.empty_body");
      return title
        ? getBackendMessage("agent.chapter.item.with_title", { order, title, content: truncated })
        : getBackendMessage("agent.chapter.item.without_title", { order, content: truncated });
    }).join("\n\n");
  }

  const rangeSummary = getSuccessfulOutputs(results, "summarize_chapter_range")[0];
  if (rangeSummary && typeof rangeSummary.summary === "string" && rangeSummary.summary.trim()) {
    return rangeSummary.summary.trim();
  }
  return null;
}

function composeWriteAnswer(results: ToolExecutionResult[], waitingForApproval: boolean): string | null {
  const preview = getSuccessfulOutputs(results, "preview_pipeline_run")[0];
  const queue = getSuccessfulOutputs(results, "queue_pipeline_run")[0];
  const draft = getSuccessfulOutputs(results, "save_chapter_draft")[0];
  const patch = getSuccessfulOutputs(results, "apply_chapter_patch")[0];

  if (draft && typeof draft.summary === "string") {
    return draft.summary;
  }
  if (patch && typeof patch.summary === "string") {
    return patch.summary;
  }
  if (waitingForApproval && preview) {
    const start = typeof preview.startOrder === "number" ? preview.startOrder : null;
    const end = typeof preview.endOrder === "number" ? preview.endOrder : null;
    if (start != null && end != null) {
      return start === end
        ? getBackendMessage("agent.write.preview.single", { startOrder: start })
        : getBackendMessage("agent.write.preview.range", { startOrder: start, endOrder: end });
    }
  }
  if (queue) {
    const start = typeof queue.startOrder === "number" ? queue.startOrder : null;
    const end = typeof queue.endOrder === "number" ? queue.endOrder : null;
    const jobId = typeof queue.jobId === "string" ? queue.jobId : "";
    if (start != null && end != null) {
      const scope = start === end
        ? getBackendMessage("agent.write.task_scope.single", { startOrder: start })
        : getBackendMessage("agent.write.task_scope.range", { startOrder: start, endOrder: end });
      const jobSuffix = jobId ? getBackendMessage("agent.production.job_suffix", { jobId }) : "";
      return jobSuffix
        ? getBackendMessage("agent.write.task_created.with_job", { scope, jobSuffix })
        : getBackendMessage("agent.write.task_created.without_job", { scope });
    }
  }
  return null;
}

function composeProductionStatusAnswer(
  results: ToolExecutionResult[],
  context: Omit<ToolExecutionContext, "runId" | "agentName">,
): string {
  const status = getFirstSuccessfulOutput(results, "get_novel_production_status");
  if (!status) {
    return context.novelId
      ? getBackendMessage("agent.production.status.unavailable")
      : getBackendMessage("agent.production.status.no_context");
  }
  const title = typeof status.title === "string"
    ? status.title.trim()
    : getBackendMessage("agent.production.current_novel");
  const currentStage = typeof status.currentStage === "string"
    ? status.currentStage.trim()
    : getBackendMessage("agent.production.unknown_stage");
  const chapterCount = typeof status.chapterCount === "number" ? status.chapterCount : 0;
  const targetChapterCount = typeof status.targetChapterCount === "number" ? status.targetChapterCount : null;
  const pipelineStatus = typeof status.pipelineStatus === "string" ? status.pipelineStatus.trim() : null;
  const failureSummary = typeof status.failureSummary === "string" ? status.failureSummary.trim() : "";
  const recoveryHint = typeof status.recoveryHint === "string" ? status.recoveryHint.trim() : "";
  const parts = [getBackendMessage("agent.production.status.stage", { title, currentStage })];
  parts.push(targetChapterCount != null
    ? getBackendMessage("agent.production.status.chapters.with_target", { chapterCount, targetChapterCount })
    : getBackendMessage("agent.production.status.chapters.without_target", { chapterCount }));
  if (pipelineStatus) {
    parts.push(getBackendMessage("agent.production.status.pipeline", { pipelineStatus }));
  }
  if (failureSummary) {
    parts.push(getBackendMessage("agent.production.status.failure", { failureSummary }));
  }
  if (recoveryHint) {
    parts.push(getBackendMessage("agent.production.status.recovery", { recoveryHint }));
  }
  return parts.join(" ");
}

async function composeProduceNovelAnswer(
  results: ToolExecutionResult[],
  waitingForApproval: boolean,
  context: Omit<ToolExecutionContext, "runId" | "agentName">,
  goal: string,
  structuredIntent?: StructuredIntent,
): Promise<string> {
  const created = getFirstSuccessfulOutput(results, "create_novel");
  const world = getFirstSuccessfulOutput(results, "generate_world_for_novel");
  const characters = getFirstSuccessfulOutput(results, "generate_novel_characters");
  const bible = getFirstSuccessfulOutput(results, "generate_story_bible");
  const outline = getFirstSuccessfulOutput(results, "generate_novel_outline");
  const structured = getFirstSuccessfulOutput(results, "generate_structured_outline");
  const synced = getFirstSuccessfulOutput(results, "sync_chapters_from_structured_outline");
  const preview = getFirstSuccessfulOutput(results, "preview_pipeline_run");
  const queued = getFirstSuccessfulOutput(results, "queue_pipeline_run");
  const productionStatus = getFirstSuccessfulOutput(results, "get_novel_production_status");

  if (!created && !context.novelId) {
    return composeMissingNovelKickoffAnswer(goal, context, structuredIntent, "produce_missing_title");
  }

  const title = typeof created?.title === "string" && created.title.trim()
    ? created.title.trim()
    : typeof productionStatus?.title === "string" && productionStatus.title.trim()
      ? productionStatus.title.trim()
      : getBackendMessage("agent.production.current_novel");
  const assetParts: string[] = [];
  if (world) {
    const worldName = typeof world.worldName === "string" ? world.worldName.trim() : "";
    assetParts.push(worldName
      ? getBackendMessage("agent.production.asset.world.named", { worldName })
      : getBackendMessage("agent.production.asset.world.generic"));
  }
  if (characters) {
    const characterCount = typeof characters.characterCount === "number" ? characters.characterCount : 0;
    assetParts.push(getBackendMessage("agent.production.asset.characters", { characterCount }));
  }
  if (bible) {
    assetParts.push(getBackendMessage("agent.production.asset.story_bible"));
  }
  if (outline) {
    assetParts.push(getBackendMessage("agent.production.asset.outline"));
  }
  if (structured) {
    const targetChapterCount = typeof structured.targetChapterCount === "number" ? structured.targetChapterCount : null;
    assetParts.push(targetChapterCount != null
      ? getBackendMessage("agent.production.asset.structured_outline.count", { targetChapterCount })
      : getBackendMessage("agent.production.asset.structured_outline.generic"));
  }
  if (synced) {
    const chapterCount = typeof synced.chapterCount === "number" ? synced.chapterCount : null;
    assetParts.push(chapterCount != null
      ? getBackendMessage("agent.production.asset.chapter_list.count", { chapterCount })
      : getBackendMessage("agent.production.asset.chapter_list.generic"));
  }
  const assetList = assetParts.length > 0
    ? getBackendMessage("agent.production.asset_list.with_items", {
      assetList: joinLocalizedItems(assetParts),
    })
    : "";
  const assetsReadyLead = getBackendMessage("agent.production.assets_ready", { title, assetList });

  if (waitingForApproval && preview) {
    return `${assetsReadyLead} ${getBackendMessage("agent.production.preview_waiting")}`;
  }
  if (queued) {
    const jobId = typeof queued.jobId === "string" && queued.jobId.trim() ? queued.jobId.trim() : "";
    const jobSuffix = jobId ? getBackendMessage("agent.production.job_suffix", { jobId }) : "";
    return `${assetsReadyLead} ${getBackendMessage("agent.production.pipeline_started", { jobSuffix })}`;
  }
  if (preview) {
    return `${assetsReadyLead} ${getBackendMessage("agent.production.pipeline_not_started")}`;
  }
  return assetsReadyLead;
}

function composeFailureDiagnosisAnswer(results: ToolExecutionResult[]): string {
  const candidates = [
    ...getSuccessfulOutputs(results, "get_run_failure_reason"),
    ...getSuccessfulOutputs(results, "explain_generation_blocker"),
    ...getSuccessfulOutputs(results, "get_task_failure_reason"),
    ...getSuccessfulOutputs(results, "get_index_failure_reason"),
    ...getSuccessfulOutputs(results, "get_book_analysis_failure_reason"),
  ];
  const first = candidates.find((item) => typeof item.failureSummary === "string" && item.failureSummary.trim());
  if (!first) {
    return getBackendMessage("agent.failure.none");
  }
  const parts = [String(first.failureSummary).trim()];
  if (typeof first.failureDetails === "string" && first.failureDetails.trim() && first.failureDetails.trim() !== parts[0]) {
    parts.push(getBackendMessage("agent.failure.detail", { detail: first.failureDetails.trim() }));
  }
  if (typeof first.recoveryHint === "string" && first.recoveryHint.trim()) {
    parts.push(getBackendMessage("agent.failure.recovery", { recoveryHint: first.recoveryHint.trim() }));
  }
  if (typeof first.lastFailedStep === "string" && first.lastFailedStep.trim()) {
    parts.push(getBackendMessage("agent.failure.last_failed_step", { lastFailedStep: first.lastFailedStep.trim() }));
  }
  return parts.join("\n");
}

async function composeFallbackAnswer(
  goal: string,
  summary: string,
  results: ToolExecutionResult[],
  context: Omit<ToolExecutionContext, "runId" | "agentName">,
  structuredIntent?: StructuredIntent,
): Promise<string> {
  try {
    const toolList = listAgentToolDefinitions()
      .map((item) => `- ${item.name}: ${item.description}`)
      .join("\n");
    const result = await runTextPrompt({
      asset: runtimeFallbackAnswerPrompt,
      promptInput: {
        toolList,
        goal,
        structuredIntentJson: safeJson(structuredIntent ?? { intent: "unknown" }),
        summary,
        groundingFacts: buildGroundingFacts(results),
      },
      options: {
        provider: context.provider ?? "deepseek",
        model: context.model,
        temperature: 0.2,
        maxTokens: context.maxTokens,
      },
    });
    return result.output.trim() || getBackendMessage("agent.common.insufficient_info");
  } catch {
    return summary || getBackendMessage("agent.common.insufficient_info");
  }
  return getBackendMessage("agent.common.insufficient_info");
}

export async function composeAssistantMessage(
  goal: string,
  summary: string,
  results: ToolExecutionResult[],
  waitingForApproval: boolean,
  context: Omit<ToolExecutionContext, "runId" | "agentName">,
  structuredIntent?: StructuredIntent,
): Promise<string> {
  if (structuredIntent?.intent === "social_opening") {
    return composeSocialOpeningAnswer(context);
  }

  if (
    !waitingForApproval
    && structuredIntent
    && COLLABORATION_FIRST_INTENTS.has(structuredIntent.intent)
    && (
      structuredIntent.shouldAskFollowup
      || ((structuredIntent.interactionMode ?? "execute") !== "execute" && results.length === 0)
    )
  ) {
    return composeCollaborativeAnswer(goal, structuredIntent);
  }

  switch (structuredIntent?.intent) {
    case "list_novels":
      return composeNovelListAnswer(results);
    case "list_base_characters":
      return composeBaseCharacterListAnswer(results);
    case "list_worlds":
      return composeWorldListAnswer(results);
    case "query_task_status":
      return composeTaskListAnswer(results);
    case "create_novel":
      return composeCreateNovelSetupAnswer(goal, results, context, structuredIntent);
    case "select_novel_workspace":
      return composeSelectNovelWorkspaceSetupAnswer(goal, results, context, structuredIntent);
    case "bind_world_to_novel":
      return composeBindWorldAnswer(results, context);
    case "unbind_world_from_novel":
      return composeUnbindWorldAnswer(results, context);
    case "produce_novel":
      return composeProduceNovelAnswer(results, waitingForApproval, context, goal, structuredIntent);
    case "query_novel_production_status":
      return composeProductionStatusAnswer(results, context);
    case "query_novel_title":
      return composeTitleAnswer(results);
    case "query_progress":
      return composeProgressAnswer(results);
    case "query_chapter_content":
      return composeChapterAnswer(results) ?? getBackendMessage("agent.common.chapter_content_missing");
    case "inspect_failure_reason":
      return composeFailureDiagnosisAnswer(results);
    case "ideate_novel_setup":
      return composeNovelSetupIdeationAnswer(goal, results, context, structuredIntent);
    case "write_chapter":
    case "rewrite_chapter":
    case "save_chapter_draft":
    case "start_pipeline":
      return composeWriteAnswer(results, waitingForApproval) ?? getBackendMessage("agent.common.executable_range_missing");
    default:
      break;
  }

  if (waitingForApproval) {
    return summary;
  }
  return composeFallbackAnswer(goal, summary, results, context, structuredIntent);
}

export function hasUsableStructuredIntent(value: unknown): value is StructuredIntent {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value.goal === "string"
    && typeof value.intent === "string"
    && typeof value.confidence === "number"
    && isRecord(value.chapterSelectors);
}
