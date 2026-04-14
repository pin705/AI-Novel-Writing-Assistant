import type { NovelWorkflowCheckpoint } from "@ai-novel/shared/types/novelWorkflow";
import type { TaskStatus } from "@ai-novel/shared/types/task";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n, type TranslationKey } from "@/i18n";
import type { NovelTaskDrawerState } from "./NovelEditView.types";

function formatStatus(status: TaskStatus): TranslationKey {
  if (status === "queued") {
    return "novelTaskDrawer.status.queued";
  }
  if (status === "running") {
    return "novelTaskDrawer.status.running";
  }
  if (status === "waiting_approval") {
    return "novelTaskDrawer.status.waitingApproval";
  }
  if (status === "succeeded") {
    return "novelTaskDrawer.status.succeeded";
  }
  if (status === "failed") {
    return "novelTaskDrawer.status.failed";
  }
  return "novelTaskDrawer.status.cancelled";
}

function toStatusVariant(status: TaskStatus): "default" | "outline" | "secondary" | "destructive" {
  if (status === "running") {
    return "default";
  }
  if (status === "failed") {
    return "destructive";
  }
  if (status === "queued" || status === "waiting_approval") {
    return "secondary";
  }
  return "outline";
}

function formatCheckpoint(checkpoint: NovelWorkflowCheckpoint | null | undefined): TranslationKey {
  if (checkpoint === "candidate_selection_required") {
    return "novelTaskDrawer.checkpoint.candidateSelectionRequired";
  }
  if (checkpoint === "book_contract_ready") {
    return "novelTaskDrawer.checkpoint.bookContractReady";
  }
  if (checkpoint === "character_setup_required") {
    return "novelTaskDrawer.checkpoint.characterSetupRequired";
  }
  if (checkpoint === "volume_strategy_ready") {
    return "novelTaskDrawer.checkpoint.volumeStrategyReady";
  }
  if (checkpoint === "front10_ready") {
    return "novelTaskDrawer.checkpoint.front10Ready";
  }
  if (checkpoint === "chapter_batch_ready") {
    return "novelTaskDrawer.checkpoint.chapterBatchReady";
  }
  if (checkpoint === "workflow_completed") {
    return "novelTaskDrawer.checkpoint.workflowCompleted";
  }
  return "common.notAvailable";
}

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

function formatTokenCount(value: number | null | undefined): string {
  return new Intl.NumberFormat("zh-CN").format(Math.max(0, Math.round(value ?? 0)));
}

function formatStepStatus(status: "idle" | "running" | "succeeded" | "failed" | "cancelled"): TranslationKey {
  if (status === "running") {
    return "novelTaskDrawer.stepStatus.running";
  }
  if (status === "succeeded") {
    return "novelTaskDrawer.stepStatus.succeeded";
  }
  if (status === "failed") {
    return "novelTaskDrawer.stepStatus.failed";
  }
  if (status === "cancelled") {
    return "novelTaskDrawer.stepStatus.cancelled";
  }
  return "novelTaskDrawer.stepStatus.idle";
}

export default function NovelTaskDrawer({
  open,
  onOpenChange,
  task,
  currentUiModel,
  actions,
  onOpenFullTaskCenter,
}: NovelTaskDrawerState) {
  const { t } = useI18n();
  const milestones = Array.isArray(task?.meta.milestones)
    ? task.meta.milestones as Array<{ checkpointType: NovelWorkflowCheckpoint; summary: string; createdAt: string }>
    : [];
  const progressPercent = Math.max(0, Math.min(100, Math.round((task?.progress ?? 0) * 100)));
  const tokenUsage = task?.tokenUsage ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-auto right-0 top-0 flex h-dvh max-h-dvh w-full max-w-[520px] translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-y-0 border-r-0 border-l bg-background p-0 sm:max-w-[520px]">
        <DialogHeader className="border-b border-border/70 px-5 py-4">
          <DialogTitle>{t("novelTaskDrawer.title")}</DialogTitle>
          <DialogDescription>{t("novelTaskDrawer.description")}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {task ? (
            <>
              <section className="space-y-3 rounded-2xl border border-border/70 bg-muted/15 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                  <div className="text-base font-semibold text-foreground">{task.title}</div>
                  <Badge variant={toStatusVariant(task.status)}>{t(formatStatus(task.status))}</Badge>
                  <Badge variant="outline">{t("novelTaskDrawer.progress", { value: progressPercent })}</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border bg-background/80 p-3">
                    <div className="text-xs text-muted-foreground">{t("novelTaskDrawer.currentStage")}</div>
                    <div className="mt-1 text-sm font-medium text-foreground">{task.currentStage ?? t("common.notAvailable")}</div>
                  </div>
                  <div className="rounded-xl border bg-background/80 p-3">
                    <div className="text-xs text-muted-foreground">{t("novelTaskDrawer.currentAction")}</div>
                    <div className="mt-1 text-sm font-medium text-foreground">{task.currentItemLabel ?? t("common.notAvailable")}</div>
                  </div>
                  <div className="rounded-xl border bg-background/80 p-3">
                    <div className="text-xs text-muted-foreground">{t("novelTaskDrawer.recentCheckpoint")}</div>
                    <div className="mt-1 text-sm font-medium text-foreground">{t(formatCheckpoint(task.checkpointType))}</div>
                  </div>
                  <div className="rounded-xl border bg-background/80 p-3">
                    <div className="text-xs text-muted-foreground">{t("novelTaskDrawer.heartbeat")}</div>
                    <div className="mt-1 text-sm font-medium text-foreground">{formatDate(task.heartbeatAt) || t("common.notAvailable")}</div>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
                </div>
                {task.checkpointSummary ? (
                  <div className="rounded-xl border bg-background/80 p-3 text-sm text-muted-foreground">
                    {task.checkpointSummary}
                  </div>
                ) : null}
                {task.lastError ? (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    <div className="font-medium">{t("novelTaskDrawer.recentError")}</div>
                    <div className="mt-1">{task.lastError}</div>
                    {task.recoveryHint ? (
                      <div className="mt-2 text-xs text-destructive/80">{t("novelTaskDrawer.recoveryHint", { value: task.recoveryHint })}</div>
                    ) : null}
                  </div>
                ) : null}
              </section>

              <section className="space-y-3">
                <div className="text-sm font-medium text-foreground">{t("novelTaskDrawer.actions.title")}</div>
                {actions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {actions.map((action) => (
                      <Button
                        key={action.label}
                        type="button"
                        size="sm"
                        variant={action.variant ?? "default"}
                        disabled={action.disabled}
                        onClick={action.onClick}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed px-4 py-5 text-sm text-muted-foreground">
                    {t("novelTaskDrawer.actions.empty")}
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <div className="text-sm font-medium text-foreground">{t("novelTaskDrawer.modelInfo.title")}</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border bg-background/80 p-3">
                    <div className="text-xs text-muted-foreground">{t("novelTaskDrawer.modelInfo.boundModel")}</div>
                    <div className="mt-1 text-sm font-medium text-foreground">
                      {task.provider ?? t("common.notAvailable")} / {task.model ?? t("common.notAvailable")}
                    </div>
                  </div>
                  <div className="rounded-xl border bg-background/80 p-3">
                    <div className="text-xs text-muted-foreground">{t("novelTaskDrawer.modelInfo.currentUiModel")}</div>
                    <div className="mt-1 text-sm font-medium text-foreground">
                      {currentUiModel.provider} / {currentUiModel.model}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {t("novelTaskDrawer.modelInfo.currentTemperature", { value: currentUiModel.temperature })}
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="text-sm font-medium text-foreground">{t("novelTaskDrawer.tokens.title")}</div>
                {tokenUsage ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border bg-background/80 p-3">
                      <div className="text-xs text-muted-foreground">{t("novelTaskDrawer.tokens.llmCallCount")}</div>
                      <div className="mt-1 text-sm font-medium text-foreground">{formatTokenCount(tokenUsage.llmCallCount)}</div>
                    </div>
                    <div className="rounded-xl border bg-background/80 p-3">
                      <div className="text-xs text-muted-foreground">{t("novelTaskDrawer.tokens.totalTokens")}</div>
                      <div className="mt-1 text-sm font-medium text-foreground">{formatTokenCount(tokenUsage.totalTokens)}</div>
                    </div>
                    <div className="rounded-xl border bg-background/80 p-3">
                      <div className="text-xs text-muted-foreground">{t("novelTaskDrawer.tokens.promptTokens")}</div>
                      <div className="mt-1 text-sm font-medium text-foreground">{formatTokenCount(tokenUsage.promptTokens)}</div>
                    </div>
                    <div className="rounded-xl border bg-background/80 p-3">
                      <div className="text-xs text-muted-foreground">{t("novelTaskDrawer.tokens.completionTokens")}</div>
                      <div className="mt-1 text-sm font-medium text-foreground">{formatTokenCount(tokenUsage.completionTokens)}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {t("novelTaskDrawer.tokens.lastRecordedAt", { value: formatDate(tokenUsage.lastRecordedAt) || t("common.notAvailable") })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed px-4 py-5 text-sm text-muted-foreground">
                    {t("novelTaskDrawer.tokens.empty")}
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <div className="text-sm font-medium text-foreground">{t("novelTaskDrawer.stepStatus.title")}</div>
                <div className="space-y-2">
                  {task.steps.map((step) => (
                    <div key={step.key} className="flex items-center justify-between rounded-xl border bg-background/80 px-3 py-2">
                      <div className="text-sm text-foreground">{step.label}</div>
                      <Badge variant="outline">{t(formatStepStatus(step.status))}</Badge>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <div className="text-sm font-medium text-foreground">{t("novelTaskDrawer.milestones.title")}</div>
                {milestones.length > 0 ? (
                  <div className="space-y-2">
                    {milestones
                      .slice()
                      .reverse()
                      .map((milestone) => (
                        <div key={`${milestone.checkpointType}:${milestone.createdAt}`} className="rounded-xl border bg-background/80 p-3">
                          <div className="font-medium text-foreground">{t(formatCheckpoint(milestone.checkpointType))}</div>
                          <div className="mt-1 text-sm text-muted-foreground">{milestone.summary}</div>
                          <div className="mt-2 text-xs text-muted-foreground">{t("novelTaskDrawer.milestones.recordedAt", { value: formatDate(milestone.createdAt) || t("common.notAvailable") })}</div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed px-4 py-5 text-sm text-muted-foreground">
                    {t("novelTaskDrawer.milestones.empty")}
                  </div>
                )}
              </section>
            </>
          ) : (
            <section className="rounded-2xl border border-dashed px-5 py-8 text-sm text-muted-foreground">
              {t("novelTaskDrawer.noTask")}
            </section>
          )}
        </div>

        <div className="border-t border-border/70 px-5 py-4">
          <Button type="button" variant="outline" className="w-full" onClick={onOpenFullTaskCenter}>
            {t("novelTaskDrawer.openFullTaskCenter")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
