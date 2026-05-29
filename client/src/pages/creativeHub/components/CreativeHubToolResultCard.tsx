import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/i18n";

type Translator = (key: string, values?: Record<string, string | number | undefined | null>) => string;

interface CreativeHubToolResultCardProps {
  toolName: string;
  summary: string;
  success: boolean;
  output?: Record<string, unknown>;
  errorCode?: string;
  onQuickAction?: (prompt: string) => void;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.map((item) => asRecord(item)).filter((item) => Object.keys(item).length > 0)
    : [];
}

function itemLabel(item: Record<string, unknown>, t: Translator): string {
  const candidates = ["title", "name", "label", "summary", "content"];
  for (const key of candidates) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  if (typeof item.id === "string" && item.id.trim()) {
    return item.id.trim();
  }
  return t("creativeHub.toolResult.unnamedItem");
}

function compactText(value: string, max = 140): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

const NOVEL_STATUS_KEYS = new Set(["in_progress", "not_started", "completed", "rework", "blocked"]);

function formatNovelProjectStatus(value: unknown, t: Translator): string | null {
  if (typeof value !== "string" || !NOVEL_STATUS_KEYS.has(value)) {
    return null;
  }
  return t(`creativeHub.toolResult.novelStatus.${value}`);
}

function renderActionButtons(actions: Array<{ label: string; prompt: string }>, onQuickAction?: (prompt: string) => void) {
  if (!onQuickAction || actions.length === 0) {
    return null;
  }
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button
          key={`${action.label}-${action.prompt}`}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onQuickAction(action.prompt)}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}

function renderNovelList(
  output: Record<string, unknown>,
  t: Translator,
  onQuickAction?: (prompt: string) => void,
) {
  const total = typeof output.total === "number" ? output.total : null;
  const items = asRecordArray(output.items).slice(0, 8);
  const headerText = total != null && total > items.length
    ? t("creativeHub.toolResult.novels.totalFoundShown", { total, shown: items.length })
    : t("creativeHub.toolResult.novels.totalFound", { total: total ?? items.length });
  return (
    <div className="space-y-2">
      <div className="text-xs text-slate-600">{headerText}</div>
      <div className="space-y-2">
        {items.map((item) => {
          const title = itemLabel(item, t);
          const chapterCount = typeof item.chapterCount === "number" ? item.chapterCount : null;
          const projectStatus = formatNovelProjectStatus(item.projectStatus, t);
          return (
            <div key={`${item.id ?? title}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-sm font-medium text-slate-900">《{title}》</div>
              <div className="mt-1 text-xs text-slate-500">
                {chapterCount != null
                  ? t("creativeHub.toolResult.novels.chapterCount", { count: chapterCount })
                  : t("creativeHub.toolResult.novels.chapterUnknown")}
                {projectStatus ? ` · ${projectStatus}` : ""}
              </div>
              {onQuickAction ? (
                <div className="mt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onQuickAction(t("creativeHub.toolResult.novels.setAsWorkspacePrompt", { title }))}
                  >
                    {t("creativeHub.toolResult.novels.setAsWorkspace")}
                  </Button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function renderWorkspaceCard(
  output: Record<string, unknown>,
  variant: "created" | "selected",
  t: Translator,
  onQuickAction?: (prompt: string) => void,
) {
  const title = typeof output.title === "string" && output.title.trim()
    ? output.title.trim()
    : t("creativeHub.toolResult.workspace.untitledNovel");
  const chapterCount = typeof output.chapterCount === "number" ? output.chapterCount : 0;
  const actions = variant === "created"
    ? [
      { label: t("creativeHub.toolResult.workspace.viewProgress"), prompt: t("creativeHub.toolResult.workspace.viewProgressPrompt") },
      { label: t("creativeHub.toolResult.workspace.designFirstChapter"), prompt: t("creativeHub.toolResult.workspace.designFirstChapterPrompt") },
    ]
    : [
      { label: t("creativeHub.toolResult.workspace.viewProgress"), prompt: t("creativeHub.toolResult.workspace.viewProgressPrompt") },
      { label: t("creativeHub.toolResult.workspace.viewFirstChapters"), prompt: t("creativeHub.toolResult.workspace.viewFirstChaptersPrompt") },
    ];
  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3">
        <div className="text-sm font-medium text-slate-900">《{title}》</div>
        <div className="mt-1 text-xs text-slate-600">
          {variant === "created"
            ? t("creativeHub.toolResult.workspace.createdMessage")
            : t("creativeHub.toolResult.workspace.selectedMessage")}
        </div>
        <div className="mt-2 text-xs text-slate-500">
          {t("creativeHub.toolResult.workspace.currentChapterCount", { count: chapterCount })}
        </div>
      </div>
      {renderActionButtons(actions, onQuickAction)}
    </div>
  );
}

function renderWorldBindingCard(output: Record<string, unknown>, t: Translator, onQuickAction?: (prompt: string) => void) {
  const novelTitle = typeof output.novelTitle === "string" && output.novelTitle.trim()
    ? output.novelTitle.trim()
    : t("creativeHub.toolResult.world.currentNovelFallback");
  const worldName = typeof output.worldName === "string" && output.worldName.trim()
    ? output.worldName.trim()
    : t("creativeHub.toolResult.world.untitledWorld");
  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-3">
        <div className="text-sm font-medium text-slate-900">《{novelTitle}》</div>
        <div className="mt-1 text-xs text-slate-600">{t("creativeHub.toolResult.world.boundMessage", { world: worldName })}</div>
      </div>
      {renderActionButtons([
        { label: t("creativeHub.toolResult.world.viewRules"), prompt: t("creativeHub.toolResult.world.viewRulesPrompt") },
        { label: t("creativeHub.toolResult.world.checkConflicts"), prompt: t("creativeHub.toolResult.world.checkConflictsPrompt") },
      ], onQuickAction)}
    </div>
  );
}

function renderProductionAssetCard(
  title: string,
  description: string,
  actions: Array<{ label: string; prompt: string }>,
  onQuickAction?: (prompt: string) => void,
) {
  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-3">
        <div className="text-sm font-medium text-slate-900">{title}</div>
        <div className="mt-1 text-xs leading-5 text-slate-600">{description}</div>
      </div>
      {renderActionButtons(actions, onQuickAction)}
    </div>
  );
}

function renderProductionStatusCard(output: Record<string, unknown>, t: Translator, onQuickAction?: (prompt: string) => void) {
  const title = typeof output.title === "string" && output.title.trim()
    ? output.title.trim()
    : t("creativeHub.toolResult.production.currentNovelFallback");
  const currentStage = typeof output.currentStage === "string"
    ? output.currentStage.trim()
    : t("creativeHub.toolResult.production.unknownStage");
  const chapterCount = typeof output.chapterCount === "number" ? output.chapterCount : 0;
  const targetChapterCount = typeof output.targetChapterCount === "number" ? output.targetChapterCount : null;
  const pipelineStatus = typeof output.pipelineStatus === "string" && output.pipelineStatus.trim()
    ? output.pipelineStatus.trim()
    : t("creativeHub.toolResult.production.pipelineStatusFallback");
  const assetStages = asRecordArray(output.assetStages);
  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-3">
        <div className="text-sm font-medium text-slate-900">《{title}》</div>
        <div className="mt-1 text-xs text-slate-600">
          {t("creativeHub.toolResult.production.currentStage", { value: currentStage })}
        </div>
        <div className="mt-1 text-xs text-slate-600">
          {targetChapterCount != null
            ? t("creativeHub.toolResult.production.chapterCatalogWithTarget", { chapters: chapterCount, target: targetChapterCount })
            : t("creativeHub.toolResult.production.chapterCatalog", { chapters: chapterCount })}
        </div>
        <div className="mt-1 text-xs text-slate-600">
          {t("creativeHub.toolResult.production.pipelineStatus", { value: pipelineStatus })}
        </div>
        {typeof output.failureSummary === "string" && output.failureSummary.trim() ? (
          <div className="mt-2 text-xs leading-5 text-slate-600">
            {t("creativeHub.toolResult.production.failureSummary", { value: output.failureSummary.trim() })}
          </div>
        ) : null}
      </div>
      {assetStages.length > 0 ? (
        <div className="grid gap-2">
          {assetStages.slice(0, 8).map((stage) => (
            <div key={`${stage.key ?? stage.label}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-sm font-medium text-slate-900">
                {String(stage.label ?? stage.key ?? t("creativeHub.toolResult.production.stageLabel"))}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {t("creativeHub.toolResult.production.stageStatus", { value: String(stage.status ?? "unknown") })}
              </div>
              {typeof stage.detail === "string" && stage.detail.trim() ? (
                <div className="mt-1 text-xs text-slate-600">{stage.detail.trim()}</div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {renderActionButtons([
        { label: t("creativeHub.toolResult.production.continueGeneration"), prompt: t("creativeHub.toolResult.production.continueGenerationPrompt") },
        { label: t("creativeHub.toolResult.production.viewProgress"), prompt: t("creativeHub.toolResult.production.viewProgressPrompt") },
      ], onQuickAction)}
    </div>
  );
}

function renderPipelineRunCard(
  toolName: "preview_pipeline_run" | "queue_pipeline_run",
  output: Record<string, unknown>,
  t: Translator,
  onQuickAction?: (prompt: string) => void,
) {
  const startOrder = typeof output.startOrder === "number" ? output.startOrder : null;
  const endOrder = typeof output.endOrder === "number" ? output.endOrder : null;
  const jobId = typeof output.jobId === "string" && output.jobId.trim() ? output.jobId.trim() : null;
  const scope = startOrder != null && endOrder != null
    ? startOrder === endOrder
      ? t("creativeHub.toolResult.pipeline.scopeSingleChapter", { value: startOrder })
      : t("creativeHub.toolResult.pipeline.scopeChapterRange", { start: startOrder, end: endOrder })
    : t("creativeHub.toolResult.pipeline.scopeFallback");
  const title = toolName === "preview_pipeline_run"
    ? t("creativeHub.toolResult.pipeline.previewTitle")
    : t("creativeHub.toolResult.pipeline.queueTitle");
  const description = toolName === "preview_pipeline_run"
    ? t("creativeHub.toolResult.pipeline.previewDescription", { scope })
    : jobId
      ? t("creativeHub.toolResult.pipeline.queueDescriptionWithJob", { scope, jobId })
      : t("creativeHub.toolResult.pipeline.queueDescription", { scope });
  const actions = toolName === "preview_pipeline_run"
    ? [
      { label: t("creativeHub.toolResult.production.viewProgress"), prompt: t("creativeHub.toolResult.production.viewProgressPrompt") },
      { label: t("creativeHub.toolResult.production.viewBlockers"), prompt: t("creativeHub.toolResult.production.viewBlockersPrompt") },
    ]
    : [
      { label: t("creativeHub.toolResult.production.viewProgress"), prompt: t("creativeHub.toolResult.production.viewProgressPrompt") },
      { label: t("creativeHub.toolResult.production.viewTaskStatus"), prompt: t("creativeHub.toolResult.production.viewTaskStatusPrompt") },
    ];
  return renderProductionAssetCard(title, description, actions, onQuickAction);
}

function renderDiagnosticCard(output: Record<string, unknown>, t: Translator, onQuickAction?: (prompt: string) => void) {
  const failureSummary = typeof output.failureSummary === "string" ? output.failureSummary : "";
  const failureDetails = typeof output.failureDetails === "string" ? output.failureDetails : "";
  const recoveryHint = typeof output.recoveryHint === "string" ? output.recoveryHint : "";
  return (
    <div className="space-y-2">
      {failureSummary ? <div className="text-sm font-medium text-slate-900">{failureSummary}</div> : null}
      {failureDetails ? (
        <div className="text-xs leading-5 text-slate-600">
          {t("creativeHub.toolResult.diagnostic.detailsPrefix", { value: failureDetails })}
        </div>
      ) : null}
      {recoveryHint ? (
        <div className="text-xs leading-5 text-slate-600">
          {t("creativeHub.toolResult.diagnostic.advicePrefix", { value: recoveryHint })}
        </div>
      ) : null}
      {renderActionButtons([
        { label: t("creativeHub.toolResult.diagnostic.continueDiagnose"), prompt: t("creativeHub.toolResult.diagnostic.continueDiagnosePrompt") },
        { label: t("creativeHub.toolResult.production.viewTaskStatus"), prompt: t("creativeHub.toolResult.production.viewTaskStatusPrompt") },
      ], onQuickAction)}
    </div>
  );
}

function renderListCard(
  output: Record<string, unknown>,
  emptyLabel: string,
  t: Translator,
  onQuickAction?: (prompt: string) => void,
) {
  const items = asRecordArray(output.items).slice(0, 6);
  if (items.length === 0) {
    return <div className="text-xs text-slate-500">{emptyLabel}</div>;
  }
  return (
    <div className="space-y-2">
      <div className="space-y-2">
        {items.map((item) => (
          <div key={`${item.id ?? itemLabel(item, t)}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="text-sm font-medium text-slate-900">{itemLabel(item, t)}</div>
            {"status" in item && typeof item.status === "string" ? (
              <div className="mt-1 text-xs text-slate-500">
                {t("creativeHub.toolResult.list.statusPrefix", { value: item.status })}
              </div>
            ) : null}
          </div>
        ))}
      </div>
      {renderActionButtons([{ label: t("creativeHub.toolResult.list.refine"), prompt: t("creativeHub.toolResult.list.refinePrompt") }], onQuickAction)}
    </div>
  );
}

function renderChapterCard(output: Record<string, unknown>, t: Translator, onQuickAction?: (prompt: string) => void) {
  const title = typeof output.title === "string" && output.title.trim() ? output.title.trim() : "";
  const order = typeof output.order === "number" ? output.order : null;
  const content = typeof output.content === "string"
    ? output.content
    : typeof output.summary === "string"
      ? output.summary
      : "";
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-slate-900">
        {order != null
          ? t("creativeHub.toolResult.chapter.chapterOrder", { order })
          : t("creativeHub.toolResult.chapter.fallbackTitle")}
        {title ? t("creativeHub.toolResult.chapter.titleSuffix", { title }) : ""}
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-700">
        {content || t("creativeHub.toolResult.chapter.empty")}
      </div>
      {renderActionButtons([
        { label: t("creativeHub.toolResult.chapter.summarize"), prompt: t("creativeHub.toolResult.chapter.summarizePrompt") },
        { label: t("creativeHub.toolResult.chapter.checkConflict"), prompt: t("creativeHub.toolResult.chapter.checkConflictPrompt") },
      ], onQuickAction)}
    </div>
  );
}

export default function CreativeHubToolResultCard({
  toolName,
  summary,
  success,
  output,
  errorCode,
  onQuickAction,
}: CreativeHubToolResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();
  const payload = asRecord(output);
  const summaryText = compactText(summary, 160) || t("creativeHub.toolResult.fallbackSummary");
  const cardContent = (() => {
    if (toolName === "list_novels") {
      return renderNovelList(payload, t, onQuickAction);
    }
    if (toolName === "create_novel") {
      return renderWorkspaceCard(payload, "created", t, onQuickAction);
    }
    if (toolName === "select_novel_workspace") {
      return renderWorkspaceCard(payload, "selected", t, onQuickAction);
    }
    if (toolName === "bind_world_to_novel") {
      return renderWorldBindingCard(payload, t, onQuickAction);
    }
    if (toolName === "generate_world_for_novel") {
      const worldName = typeof payload.worldName === "string" && payload.worldName.trim()
        ? payload.worldName.trim()
        : t("creativeHub.toolResult.world.untitledWorld");
      return renderProductionAssetCard(
        t("creativeHub.toolResult.world.generatedTitle"),
        t("creativeHub.toolResult.world.generatedDescription", { world: worldName }),
        [
          { label: t("creativeHub.toolResult.production.continueGeneration"), prompt: t("creativeHub.toolResult.production.continueGenerationPrompt") },
          { label: t("creativeHub.toolResult.production.viewProgress"), prompt: t("creativeHub.toolResult.production.viewProgressPrompt") },
        ],
        onQuickAction,
      );
    }
    if (toolName === "generate_novel_characters") {
      const characterCount = typeof payload.characterCount === "number" ? payload.characterCount : 0;
      return renderProductionAssetCard(
        t("creativeHub.toolResult.production.characterGeneratedTitle"),
        t("creativeHub.toolResult.production.characterGeneratedDescription", { count: characterCount }),
        [
          { label: t("creativeHub.toolResult.production.continueGeneration"), prompt: t("creativeHub.toolResult.production.continueGenerationPrompt") },
          { label: t("creativeHub.toolResult.production.viewCharacterStatus"), prompt: t("creativeHub.toolResult.production.viewCharacterStatusPrompt") },
        ],
        onQuickAction,
      );
    }
    if (toolName === "generate_story_bible") {
      return renderProductionAssetCard(
        t("creativeHub.toolResult.production.storyBibleGeneratedTitle"),
        typeof payload.mainPromise === "string" && payload.mainPromise.trim()
          ? payload.mainPromise.trim()
          : t("creativeHub.toolResult.production.storyBibleGeneratedFallback"),
        [
          { label: t("creativeHub.toolResult.production.continueGeneration"), prompt: t("creativeHub.toolResult.production.continueGenerationPrompt") },
          { label: t("creativeHub.toolResult.production.viewProgress"), prompt: t("creativeHub.toolResult.production.viewProgressPrompt") },
        ],
        onQuickAction,
      );
    }
    if (toolName === "generate_novel_outline") {
      return renderProductionAssetCard(
        t("creativeHub.toolResult.production.outlineGeneratedTitle"),
        typeof payload.outline === "string" && payload.outline.trim()
          ? payload.outline.trim()
          : t("creativeHub.toolResult.production.outlineGeneratedFallback"),
        [
          { label: t("creativeHub.toolResult.production.continueGeneration"), prompt: t("creativeHub.toolResult.production.continueGenerationPrompt") },
          { label: t("creativeHub.toolResult.production.viewProgress"), prompt: t("creativeHub.toolResult.production.viewProgressPrompt") },
        ],
        onQuickAction,
      );
    }
    if (toolName === "generate_structured_outline") {
      const targetChapterCount = typeof payload.targetChapterCount === "number" ? payload.targetChapterCount : 0;
      return renderProductionAssetCard(
        t("creativeHub.toolResult.production.structuredOutlineTitle"),
        targetChapterCount > 0
          ? t("creativeHub.toolResult.production.structuredOutlineWithCount", { count: targetChapterCount })
          : t("creativeHub.toolResult.production.structuredOutlineFallback"),
        [
          { label: t("creativeHub.toolResult.production.syncChapterDirectory"), prompt: t("creativeHub.toolResult.production.continueGenerationPrompt") },
          { label: t("creativeHub.toolResult.production.viewProgress"), prompt: t("creativeHub.toolResult.production.viewProgressPrompt") },
        ],
        onQuickAction,
      );
    }
    if (toolName === "sync_chapters_from_structured_outline") {
      const chapterCount = typeof payload.chapterCount === "number" ? payload.chapterCount : 0;
      return renderProductionAssetCard(
        t("creativeHub.toolResult.production.chaptersSyncedTitle"),
        chapterCount > 0
          ? t("creativeHub.toolResult.production.chaptersSyncedWithCount", { count: chapterCount })
          : t("creativeHub.toolResult.production.chaptersSyncedFallback"),
        [
          { label: t("creativeHub.toolResult.production.viewProgress"), prompt: t("creativeHub.toolResult.production.viewProgressPrompt") },
          { label: t("creativeHub.toolResult.production.startGeneration"), prompt: t("creativeHub.toolResult.production.continueGenerationPrompt") },
        ],
        onQuickAction,
      );
    }
    if (toolName === "start_full_novel_pipeline" || toolName === "get_novel_production_status") {
      return renderProductionStatusCard(payload, t, onQuickAction);
    }
    if (toolName === "preview_pipeline_run" || toolName === "queue_pipeline_run") {
      return renderPipelineRunCard(toolName, payload, t, onQuickAction);
    }
    if (
      toolName === "get_task_failure_reason"
      || toolName === "get_run_failure_reason"
      || toolName === "get_index_failure_reason"
      || toolName === "get_book_analysis_failure_reason"
      || toolName === "explain_generation_blocker"
      || toolName === "explain_world_conflict"
      || toolName === "failure_diagnostic"
    ) {
      return renderDiagnosticCard(payload, t, onQuickAction);
    }
    if (
      toolName === "list_worlds"
      || toolName === "list_tasks"
      || toolName === "list_knowledge_documents"
      || toolName === "list_book_analyses"
      || toolName === "list_writing_formulas"
      || toolName === "list_base_characters"
    ) {
      return renderListCard(payload, t("creativeHub.toolResult.list.empty"), t, onQuickAction);
    }
    if (
      toolName === "get_chapter_content"
      || toolName === "get_chapter_content_by_order"
      || toolName === "summarize_chapter_range"
    ) {
      return renderChapterCard(payload, t, onQuickAction);
    }
    return null;
  })();

  if (!cardContent) {
    return null;
  }

  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-medium text-slate-900">{summaryText}</div>
          <Badge variant={success ? "secondary" : "destructive"}>
            {success ? t("creativeHub.toolResult.parsedBadge") : errorCode ?? t("creativeHub.common.failedLabel")}
          </Badge>
        </div>
        <button
          type="button"
          className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] text-slate-600 transition hover:bg-slate-100"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? t("creativeHub.toolResult.collapse") : t("creativeHub.toolResult.expand")}
        </button>
      </div>
      {expanded ? (
        <div className="mt-3">{cardContent}</div>
      ) : (
        <div className="mt-2 text-xs text-slate-500">{t("creativeHub.toolResult.collapsedHint")}</div>
      )}
    </div>
  );
}
