import type { NovelWorkflowCheckpoint } from "@ai-novel/shared/types/novelWorkflow";
import {
  DIRECTOR_CANDIDATE_SETUP_STEPS,
} from "@ai-novel/shared/types/novelDirector";
import type { UnifiedTaskDetail } from "@ai-novel/shared/types/task";
import { useI18n, type TranslateFn, type TranslationKey } from "@/i18n";
import { Button } from "@/components/ui/button";
import AITakeoverContainer, { type AITakeoverMode } from "@/components/workflow/AITakeoverContainer";
import {
  isChapterTitleDiversitySummary,
  resolveChapterTitleWarning,
} from "@/lib/directorTaskNotice";
import { useDirectorChapterTitleRepair } from "@/hooks/useDirectorChapterTitleRepair";

type DirectorExecutionViewMode = "execution_progress" | "execution_failed";

interface NovelAutoDirectorProgressPanelProps {
  mode: DirectorExecutionViewMode;
  task: UnifiedTaskDetail | null;
  taskId: string;
  titleHint?: string;
  fallbackError?: string | null;
  onBackgroundContinue: () => void;
  onOpenTaskCenter: () => void;
}

type DirectorStepVisualStatus = "pending" | "running" | "completed" | "failed";
type DirectorStepDefinition = {
  key: string;
  label: string;
};

function getDirectorExecutionSteps(t: TranslateFn): DirectorStepDefinition[] {
  return [
    { key: "novel_create", label: t("novelCreate.autoDirector.progress.step.novelCreate") },
    { key: "book_contract", label: t("novelCreate.autoDirector.progress.step.bookContract") },
    { key: "character_setup", label: t("novelCreate.autoDirector.progress.step.characterSetup") },
    { key: "volume_strategy", label: t("novelCreate.autoDirector.progress.step.volumeStrategy") },
    { key: "beat_sheet", label: t("novelCreate.autoDirector.progress.step.beatSheet") },
    { key: "chapter_detail_bundle", label: t("novelCreate.autoDirector.progress.step.chapterDetailBundle") },
  ];
}

function getCandidateSetupSteps(t: TranslateFn): DirectorStepDefinition[] {
  const labelByKey = {
    candidate_seed_alignment: "novelCreate.autoDirector.progress.candidateStep.seedAlignment",
    candidate_project_framing: "novelCreate.autoDirector.progress.candidateStep.projectFraming",
    candidate_direction_batch: "novelCreate.autoDirector.progress.candidateStep.directionBatch",
    candidate_title_pack: "novelCreate.autoDirector.progress.candidateStep.titlePack",
  } as const satisfies Record<typeof DIRECTOR_CANDIDATE_SETUP_STEPS[number]["key"], Parameters<TranslateFn>[0]>;
  return DIRECTOR_CANDIDATE_SETUP_STEPS.map((step) => ({
    key: step.key,
    label: t(labelByKey[step.key]),
  }));
}

const DIRECTOR_CANDIDATE_SETUP_STEP_KEYS = new Set<string>(
  DIRECTOR_CANDIDATE_SETUP_STEPS.map((step) => step.key),
);

const AUTO_DIRECTOR_PLACEHOLDER_TITLES = new Set([
  "AI 自动导演小说",
  "小说流程任务",
  "AI Auto Director Novel",
  "Novel Workflow Task",
]);

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString();
}

function formatTokenCount(value: number | null | undefined, locale: string): string {
  return new Intl.NumberFormat(locale).format(Math.max(0, Math.round(value ?? 0)));
}

function resolveAutoExecutionScopeLabel(task: UnifiedTaskDetail | null, t: TranslateFn): string {
  const seedPayload = (task?.meta.seedPayload ?? null) as {
    autoExecution?: {
      scopeLabel?: string | null;
      totalChapterCount?: number | null;
    } | null;
  } | null;
  const scopeLabel = seedPayload?.autoExecution?.scopeLabel?.trim();
  if (scopeLabel) {
    return scopeLabel;
  }
  const fallbackCount = Math.max(1, Math.round(seedPayload?.autoExecution?.totalChapterCount ?? 10));
  return t("novelCreate.autoDirector.progress.scope.frontChapters", { value: fallbackCount });
}

function formatCheckpoint(
  checkpoint: NovelWorkflowCheckpoint | null | undefined,
  task: UnifiedTaskDetail | null,
  t: TranslateFn,
): string {
  if (checkpoint === "candidate_selection_required") {
    return t("workflow.checkpoint.candidate_selection_required");
  }
  if (checkpoint === "book_contract_ready") {
    return t("workflow.checkpoint.book_contract_ready");
  }
  if (checkpoint === "character_setup_required") {
    return t("workflow.checkpoint.character_setup_required");
  }
  if (checkpoint === "volume_strategy_ready") {
    return t("workflow.checkpoint.volume_strategy_ready");
  }
  if (checkpoint === "front10_ready") {
    return t("novelCreate.autoDirector.progress.checkpoint.front10Ready", {
      value: resolveAutoExecutionScopeLabel(task, t),
    });
  }
  if (checkpoint === "chapter_batch_ready") {
    return t("novelCreate.autoDirector.progress.checkpoint.chapterBatchReady", {
      value: resolveAutoExecutionScopeLabel(task, t),
    });
  }
  if (checkpoint === "replan_required") {
    return t("workflow.checkpoint.replan_required");
  }
  if (checkpoint === "workflow_completed") {
    return t("novelCreate.autoDirector.progress.checkpoint.workflowCompleted");
  }
  return t("common.notAvailable");
}

function isCandidateSetupFlow(task: UnifiedTaskDetail | null): boolean {
  return DIRECTOR_CANDIDATE_SETUP_STEP_KEYS.has(task?.currentItemKey ?? "");
}

function resolveDirectorExecutionStepIndex(task: UnifiedTaskDetail | null): number {
  const itemKey = task?.currentItemKey ?? "";
  if (
    task?.checkpointType === "front10_ready"
    || (task?.status === "running" && task?.checkpointType === "chapter_batch_ready")
    || itemKey === "chapter_detail_bundle"
    || itemKey === "chapter_execution"
  ) {
    return 5;
  }
  if (itemKey === "beat_sheet" || itemKey === "chapter_list" || itemKey === "chapter_sync") {
    return 4;
  }
  if (
    task?.checkpointType === "character_setup_required"
    || itemKey === "character_setup"
    || itemKey === "character_cast_apply"
  ) {
    return 2;
  }
  if (
    task?.checkpointType === "volume_strategy_ready"
    || itemKey === "volume_strategy"
    || itemKey === "volume_skeleton"
  ) {
    return 3;
  }
  if (
    task?.checkpointType === "book_contract_ready"
    || itemKey === "book_contract"
    || itemKey === "story_macro"
    || itemKey === "constraint_engine"
  ) {
    return 1;
  }
  return 0;
}

function resolveCandidateSetupStepIndex(task: UnifiedTaskDetail | null): number {
  const itemKey = task?.currentItemKey ?? "";
  const foundIndex = DIRECTOR_CANDIDATE_SETUP_STEPS.findIndex((step) => step.key === itemKey);
  return foundIndex >= 0 ? foundIndex : 0;
}

function resolveDirectorStepStatuses(
  task: UnifiedTaskDetail | null,
  mode: DirectorExecutionViewMode,
  steps: ReadonlyArray<DirectorStepDefinition>,
): DirectorStepVisualStatus[] {
  if (task?.checkpointType === "front10_ready" || task?.status === "succeeded") {
    return steps.map(() => "completed");
  }

  const currentIndex = isCandidateSetupFlow(task)
    ? resolveCandidateSetupStepIndex(task)
    : resolveDirectorExecutionStepIndex(task);
  return steps.map((_, index) => {
    if (index < currentIndex) {
      return "completed";
    }
    if (index === currentIndex) {
      return mode === "execution_failed" ? "failed" : "running";
    }
    return "pending";
  });
}

function stepClasses(status: DirectorStepVisualStatus): string {
  if (status === "completed") {
    return "border-emerald-500/40 bg-emerald-500/10";
  }
  if (status === "running") {
    return "border-sky-400/60 bg-sky-50";
  }
  if (status === "failed") {
    return "border-destructive/40 bg-destructive/5";
  }
  return "border-border/70 bg-background";
}

function stepBadgeClasses(status: DirectorStepVisualStatus): string {
  if (status === "completed") {
    return "bg-emerald-600 text-white";
  }
  if (status === "running") {
    return "bg-sky-600 text-white";
  }
  if (status === "failed") {
    return "bg-destructive text-destructive-foreground";
  }
  return "bg-muted text-muted-foreground";
}

function stepStatusLabel(status: DirectorStepVisualStatus): TranslationKey {
  if (status === "completed") {
    return "common.progressStatus.completed";
  }
  if (status === "running") {
    return "common.progressStatus.inProgress";
  }
  if (status === "failed") {
    return "novelCreate.autoDirector.progress.stepStatus.failed";
  }
  return "novelCreate.autoDirector.progress.stepStatus.pending";
}

export default function NovelAutoDirectorProgressPanel({
  mode,
  task,
  taskId,
  titleHint,
  fallbackError,
  onBackgroundContinue,
  onOpenTaskCenter,
}: NovelAutoDirectorProgressPanelProps) {
  const { locale, t } = useI18n();
  const taskChapterTitleWarning = resolveChapterTitleWarning(task);
  const chapterTitleRepairMutation = useDirectorChapterTitleRepair();
  const fallbackChapterTitleWarning = !taskChapterTitleWarning && isChapterTitleDiversitySummary(fallbackError)
    ? {
      summary: fallbackError?.trim() ?? "",
      route: null,
      label: t("novelCreate.autoDirector.progress.chapterTitleRepair"),
    }
    : null;
  const chapterTitleWarning = taskChapterTitleWarning ?? fallbackChapterTitleWarning;
  const visualMode: DirectorExecutionViewMode = mode === "execution_failed" && !chapterTitleWarning
    ? "execution_failed"
    : "execution_progress";
  const currentAction = (
    task?.status === "running"
    && task?.checkpointType === "chapter_batch_ready"
    && /已暂停|paused/i.test(task.currentItemLabel ?? "")
  )
    ? t("novelCreate.autoDirector.progress.currentAction.autoExecuting", {
      value: resolveAutoExecutionScopeLabel(task, t),
    })
    : (
      task?.currentItemLabel?.trim()
      || (visualMode === "execution_failed"
        ? t("novelCreate.autoDirector.progress.currentAction.failed")
        : (chapterTitleWarning
          ? t("novelCreate.autoDirector.progress.currentAction.chapterTitlesReady")
          : t("novelCreate.autoDirector.progress.currentAction.preparing")))
    );
  const workflowTitle = task?.title?.trim() || "";
  const hintedTitle = titleHint?.trim() || "";
  const taskTitle = (
    hintedTitle && (!workflowTitle || AUTO_DIRECTOR_PLACEHOLDER_TITLES.has(workflowTitle))
      ? hintedTitle
      : workflowTitle || hintedTitle || t("novelCreate.autoDirector.progress.defaultProjectTitle")
  );
  const milestones = Array.isArray(task?.meta.milestones)
    ? task.meta.milestones as Array<{ checkpointType: NovelWorkflowCheckpoint; summary: string; createdAt: string }>
    : [];
  const candidateSetupFlow = isCandidateSetupFlow(task);
  const stepDefinitions = candidateSetupFlow
    ? getCandidateSetupSteps(t)
    : getDirectorExecutionSteps(t);
  const steps = resolveDirectorStepStatuses(task, visualMode, stepDefinitions);
  const failureMessage = task?.lastError?.trim() || fallbackError?.trim() || t("novelCreate.autoDirector.progress.failureMessage");
  const tokenUsage = task?.tokenUsage ?? null;
  const containerMode: AITakeoverMode = visualMode === "execution_failed"
    ? "failed"
    : !task
      ? "loading"
      : (task.status === "waiting_approval" || chapterTitleWarning)
        ? "waiting"
        : "running";
  const description = candidateSetupFlow
    ? (
      visualMode === "execution_failed"
        ? t("novelCreate.autoDirector.progress.description.candidateFailed")
        : t("novelCreate.autoDirector.progress.description.candidateRunning")
    )
    : (
      visualMode === "execution_failed"
        ? t("novelCreate.autoDirector.progress.description.executionFailed")
        : chapterTitleWarning
          ? t("novelCreate.autoDirector.progress.description.chapterTitleWarning")
          : task?.status === "waiting_approval"
            ? t("novelCreate.autoDirector.progress.description.waitingApproval")
            : t("novelCreate.autoDirector.progress.description.running")
    );
  const actions = [
    ...(visualMode === "execution_progress" && task?.status !== "waiting_approval" && !chapterTitleWarning
      ? [{
        label: t("novelCreate.autoDirector.progress.action.backgroundContinue"),
        onClick: onBackgroundContinue,
        variant: "outline" as const,
      }]
      : []),
    {
      label: t("novelCreate.autoDirector.progress.action.openTaskCenter"),
      onClick: onOpenTaskCenter,
      variant: "default" as const,
    },
  ];

  return (
    <div className="space-y-4">
      <AITakeoverContainer
        mode={containerMode}
        title={visualMode === "execution_failed"
          ? (candidateSetupFlow ? t("novelCreate.autoDirector.progress.title.candidateFailed") : t("novelCreate.autoDirector.progress.title.executionFailed"))
          : candidateSetupFlow
            ? t("novelCreate.autoDirector.progress.title.candidateRunning")
            : t("novelCreate.autoDirector.progress.title.executing", { value: taskTitle })}
        description={description}
        progress={task ? task.progress : null}
        currentAction={currentAction}
        checkpointLabel={formatCheckpoint(task?.checkpointType, task, t)}
        taskId={taskId || task?.id}
        actions={actions}
      >
        <div className={`grid gap-3 ${candidateSetupFlow ? "md:grid-cols-4" : "md:grid-cols-6"}`}>
          {stepDefinitions.map((step, index) => (
            <div key={step.key} className={`rounded-xl border p-3 ${stepClasses(steps[index] ?? "pending")}`}>
              <div className="flex items-center justify-between gap-2">
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${stepBadgeClasses(steps[index] ?? "pending")}`}>
                  {index + 1}
                </span>
                <span className="text-[11px] text-muted-foreground">{t(stepStatusLabel(steps[index] ?? "pending"))}</span>
              </div>
              <div className="mt-3 text-sm font-medium text-foreground">{step.label}</div>
            </div>
          ))}
        </div>

        {tokenUsage ? (
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-xl border bg-background/80 p-3">
              <div className="text-xs text-muted-foreground">{t("novelCreate.autoDirector.progress.tokens.llmCallCount")}</div>
              <div className="mt-1 text-sm font-medium text-foreground">{formatTokenCount(tokenUsage.llmCallCount, locale)}</div>
            </div>
            <div className="rounded-xl border bg-background/80 p-3">
              <div className="text-xs text-muted-foreground">{t("novelCreate.autoDirector.progress.tokens.promptTokens")}</div>
              <div className="mt-1 text-sm font-medium text-foreground">{formatTokenCount(tokenUsage.promptTokens, locale)}</div>
            </div>
            <div className="rounded-xl border bg-background/80 p-3">
              <div className="text-xs text-muted-foreground">{t("novelCreate.autoDirector.progress.tokens.completionTokens")}</div>
              <div className="mt-1 text-sm font-medium text-foreground">{formatTokenCount(tokenUsage.completionTokens, locale)}</div>
            </div>
            <div className="rounded-xl border bg-background/80 p-3">
              <div className="text-xs text-muted-foreground">{t("novelCreate.autoDirector.progress.tokens.totalTokens")}</div>
              <div className="mt-1 text-sm font-medium text-foreground">{formatTokenCount(tokenUsage.totalTokens, locale)}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {t("novelCreate.autoDirector.progress.tokens.lastRecordedAt", {
                  value: formatDate(tokenUsage.lastRecordedAt) || t("common.notAvailable"),
                })}
              </div>
            </div>
          </div>
        ) : null}

        {chapterTitleWarning ? (
          <div className="mt-4 rounded-xl border border-amber-300/60 bg-amber-50/80 p-4 text-sm text-amber-950">
            <div className="font-medium">{t("novelCreate.autoDirector.progress.warning.title")}</div>
            <div className="mt-1">{chapterTitleWarning.summary}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {task && chapterTitleWarning ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    chapterTitleRepairMutation.startRepair(task);
                  }}
                  disabled={chapterTitleRepairMutation.isPending}
                >
                  {chapterTitleRepairMutation.isPending && chapterTitleRepairMutation.pendingTaskId === task.id
                    ? t("novelCreate.autoDirector.progress.warning.repairing")
                    : chapterTitleWarning.label}
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                onClick={onOpenTaskCenter}
              >
                {t("novelCreate.autoDirector.progress.action.openTaskCenter")}
              </Button>
            </div>
          </div>
        ) : visualMode === "execution_failed" ? (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <div className="font-medium">{t("novelCreate.autoDirector.progress.failureSummary.title")}</div>
            <div className="mt-1">{failureMessage}</div>
            {task?.recoveryHint ? (
              <div className="mt-2 text-xs text-destructive/80">{t("novelCreate.autoDirector.progress.failureSummary.recoveryHint", { value: task.recoveryHint })}</div>
            ) : null}
          </div>
        ) : null}
      </AITakeoverContainer>

      <div className="rounded-xl border bg-background/70 p-4">
        <div className="text-sm font-medium text-foreground">{t("novelCreate.autoDirector.progress.milestones.title")}</div>
        {milestones.length > 0 ? (
          <div className="mt-3 space-y-3">
            {milestones
              .slice()
              .reverse()
              .map((item) => (
                <div key={`${item.checkpointType}:${item.createdAt}`} className="rounded-lg border bg-muted/15 p-3">
                  <div className="font-medium text-foreground">{formatCheckpoint(item.checkpointType, task, t)}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{item.summary}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {t("novelCreate.autoDirector.progress.milestones.recordedAt", {
                      value: formatDate(item.createdAt) || t("common.notAvailable"),
                    })}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="mt-3 text-sm text-muted-foreground">
            {t("novelCreate.autoDirector.progress.milestones.empty")}
          </div>
        )}
      </div>
    </div>
  );
}
