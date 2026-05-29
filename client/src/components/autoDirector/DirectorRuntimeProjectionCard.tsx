import type {
  DirectorPolicyMode,
  DirectorRuntimeProjection,
  DirectorRuntimeProjectionStatus,
} from "@ai-novel/shared/types/directorRuntime";
import { getDirectorNodeDisplayLabel } from "@ai-novel/shared/types/directorRuntime";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  PauseCircle,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/i18n";
import type { TranslateValues } from "@/i18n";
import { cn } from "@/lib/utils";

type Translator = (key: string, values?: TranslateValues) => string;

interface DirectorRuntimeProjectionCardProps {
  projection: DirectorRuntimeProjection | null | undefined;
  className?: string;
  compact?: boolean;
}

function formatDate(value: string | null | undefined, t: Translator): string {
  if (!value) {
    return t("components.autoDirector.runtimeProjection.datePlaceholder");
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return t("components.autoDirector.runtimeProjection.datePlaceholder");
  }
  return date.toLocaleString();
}

function formatTokenCount(value: number | null | undefined): string {
  const count = Math.max(0, Math.round(Number(value ?? 0)));
  return count.toLocaleString();
}

function formatDuration(value: number | null | undefined, t: Translator): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  const seconds = Math.round(value / 1000);
  if (seconds <= 0) {
    return t("components.autoDirector.runtimeProjection.usageLine.lessThanOneSecond");
  }
  if (seconds < 60) {
    return t("components.autoDirector.runtimeProjection.usageLine.secondsUnit", { count: seconds });
  }
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  return restSeconds > 0
    ? t("components.autoDirector.runtimeProjection.usageLine.minutesSecondsUnit", { minutes, seconds: restSeconds })
    : t("components.autoDirector.runtimeProjection.usageLine.minutesUnit", { count: minutes });
}

function formatUsageLine(usage: {
  llmCallCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs?: number | null;
}, t: Translator): string {
  const duration = formatDuration(usage.durationMs, t);
  return [
    t("components.autoDirector.runtimeProjection.usageLine.callCount", { count: formatTokenCount(usage.llmCallCount) }),
    t("components.autoDirector.runtimeProjection.usageLine.promptTokens", { count: formatTokenCount(usage.promptTokens) }),
    t("components.autoDirector.runtimeProjection.usageLine.completionTokens", { count: formatTokenCount(usage.completionTokens) }),
    t("components.autoDirector.runtimeProjection.usageLine.totalTokens", { count: formatTokenCount(usage.totalTokens) }),
    duration ? t("components.autoDirector.runtimeProjection.usageLine.duration", { duration }) : null,
  ].filter(Boolean).join(" · ");
}

function formatPolicyMode(mode: DirectorPolicyMode, t: Translator): string {
  if (mode === "suggest_only") {
    return t("components.autoDirector.runtimeProjection.policyModes.suggest_only");
  }
  if (mode === "run_next_step") {
    return t("components.autoDirector.runtimeProjection.policyModes.run_next_step");
  }
  if (mode === "auto_safe_scope") {
    return t("components.autoDirector.runtimeProjection.policyModes.auto_safe_scope");
  }
  return t("components.autoDirector.runtimeProjection.policyModes.default");
}

function formatStatus(status: DirectorRuntimeProjectionStatus, t: Translator): string {
  const key = `components.autoDirector.runtimeProjection.statuses.${status}`;
  const result = t(key);
  if (result !== key) return result;
  return t("components.autoDirector.runtimeProjection.statuses.default");
}

function statusClassName(status: DirectorRuntimeProjectionStatus): string {
  if (status === "running") {
    return "border-sky-300 bg-sky-50 text-sky-900";
  }
  if (status === "waiting_approval") {
    return "border-amber-300 bg-amber-50 text-amber-900";
  }
  if (status === "blocked" || status === "failed") {
    return "border-destructive/30 bg-destructive/5 text-destructive";
  }
  if (status === "completed") {
    return "border-emerald-300 bg-emerald-50 text-emerald-900";
  }
  return "border-border bg-muted/30 text-muted-foreground";
}

function statusIcon(status: DirectorRuntimeProjectionStatus) {
  if (status === "running") {
    return <Activity className="h-4 w-4" />;
  }
  if (status === "waiting_approval") {
    return <PauseCircle className="h-4 w-4" />;
  }
  if (status === "blocked") {
    return <AlertTriangle className="h-4 w-4" />;
  }
  if (status === "failed") {
    return <XCircle className="h-4 w-4" />;
  }
  if (status === "completed") {
    return <CheckCircle2 className="h-4 w-4" />;
  }
  return <ShieldCheck className="h-4 w-4" />;
}

function riskBadgeClassName(level: NonNullable<DirectorRuntimeProjection["visibleRiskBadges"]>[number]["level"]) {
  if (level === "danger") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (level === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function formatQualityDebtSummary(
  summary: DirectorRuntimeProjection["qualityDebtSummary"] | null | undefined,
  t: Translator,
): string | null {
  if (!summary || summary.deferredChapterCount <= 0) {
    return null;
  }
  const detail = summary.deferredChapterOrders.length > 0
    ? t("components.autoDirector.runtimeProjection.qualityDebtChapters", {
      chapters: summary.deferredChapterOrders.join("、"),
    })
    : "";
  return t("components.autoDirector.runtimeProjection.qualityDebt", { detail });
}

function formatQualityBudgetSummary(
  summary: DirectorRuntimeProjection["qualityBudgetSummary"] | null | undefined,
  t: Translator,
): string | null {
  if (!summary) {
    return null;
  }
  const chapterText = typeof summary.currentChapterOrder === "number"
    ? t("components.autoDirector.runtimeProjection.qualityBudgetSpecificChapter", {
      order: summary.currentChapterOrder,
    })
    : t("components.autoDirector.runtimeProjection.qualityBudgetCurrentChapter");
  return t("components.autoDirector.runtimeProjection.qualityBudget", {
    chapter: chapterText,
    patch: summary.patchRepairUsed,
    rewrite: summary.chapterRewriteUsed,
    replan: summary.windowReplanUsed,
    nextAction: summary.nextActionLabel,
  });
}

function formatRootCauseSummary(projection: DirectorRuntimeProjection, t: Translator): string | null {
  if (!projection.rootCauseCode || projection.rootCauseCode === "none") {
    return null;
  }
  if (projection.rootCauseCode === "replan_required") {
    return t("components.autoDirector.runtimeProjection.rootCauses.replan");
  }
  if (projection.rootCauseCode === "draft_obligation_unmet") {
    return t("components.autoDirector.runtimeProjection.rootCauses.obligation");
  }
  if (projection.rootCauseCode === "draft_repair_exhausted") {
    return t("components.autoDirector.runtimeProjection.rootCauses.repairExhausted");
  }
  return t("components.autoDirector.runtimeProjection.rootCauses.draftMissing");
}

function formatPercent(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "0%";
  }
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

export default function DirectorRuntimeProjectionCard({
  projection,
  className,
  compact = false,
}: DirectorRuntimeProjectionCardProps) {
  const { t } = useTranslation();
  if (!projection) {
    return null;
  }
  const primaryText = projection.headline?.trim()
    || projection.currentLabel?.trim()
    || projection.lastEventSummary?.trim()
    || t("components.autoDirector.runtimeProjection.primaryFallback");
  const detailText = projection.detail?.trim();
  const attentionText = projection.requiresUserAction
    ? projection.blockingReason?.trim()
      || projection.blockedReason?.trim()
      || projection.lastEventSummary?.trim()
      || t("components.autoDirector.runtimeProjection.attentionFallback")
    : projection.blockingReason?.trim() || projection.blockedReason?.trim();
  const progressLine = projection.progressBreakdown?.explanation?.trim()
    || projection.progressSummary?.trim()
    || null;
  const qualityDebtLine = formatQualityDebtSummary(projection.qualityDebtSummary, t);
  const qualityBudgetLine = formatQualityBudgetSummary(projection.qualityBudgetSummary, t);
  const rootCauseLine = formatRootCauseSummary(projection, t);
  const obligationLine = projection.blockingObligations && projection.blockingObligations.length > 0
    ? t("components.autoDirector.runtimeProjection.obligationsLine", {
      summaries: projection.blockingObligations.slice(0, 3).map((item) => item.summary).join("；"),
    })
    : null;
  const activeExecutionLine = projection.activeExecution
    ? (projection.activeExecution.resourceClass
      ? t("components.autoDirector.runtimeProjection.activeExecutionWithClass", {
        label: getDirectorNodeDisplayLabel({
          nodeKey: projection.activeExecution.stepType,
          fallback: projection.currentAction || t("components.autoDirector.runtimeProjection.activeExecutionFallback"),
        }),
        class: projection.activeExecution.resourceClass,
      })
      : t("components.autoDirector.runtimeProjection.activeExecution", {
        label: getDirectorNodeDisplayLabel({
          nodeKey: projection.activeExecution.stepType,
          fallback: projection.currentAction || t("components.autoDirector.runtimeProjection.activeExecutionFallback"),
        }),
      }))
    : null;
  const waitingLine = projection.waitingReason
    ? t("components.autoDirector.runtimeProjection.waitingReason", { reason: projection.waitingReason })
    : null;
  const workerHealthLine = projection.workerHealth
    ? [
      t("components.autoDirector.runtimeProjection.executionQueue", {
        queued: projection.workerHealth.queuedCommandCount,
      }),
      projection.workerHealth.runningCommandCount > 0
        ? t("components.autoDirector.runtimeProjection.executionProcessing", {
          count: projection.workerHealth.runningCommandCount,
        })
        : null,
      projection.workerHealth.currentWorkerId
        ? t("components.autoDirector.runtimeProjection.executor", { id: projection.workerHealth.currentWorkerId })
        : null,
    ].filter(Boolean).join(" · ")
    : null;
  const helperLines = [
    activeExecutionLine,
    waitingLine,
    workerHealthLine,
    projection.nextActionLabel
      ? t("components.autoDirector.runtimeProjection.nextAction", { label: projection.nextActionLabel })
      : null,
    projection.recommendedAction?.reason
      ? t("components.autoDirector.runtimeProjection.recommendedReason", { reason: projection.recommendedAction.reason })
      : null,
    projection.isAutopilotRecoverable
      ? t("components.autoDirector.runtimeProjection.autopilotRecoverable")
      : null,
    rootCauseLine,
    obligationLine,
    qualityBudgetLine,
    qualityDebtLine,
    projection.scopeSummary,
    progressLine,
  ].filter((line): line is string => Boolean(line?.trim()));
  const recentEvents = projection.recentEvents.slice(0, compact ? 2 : 4);
  const usageSummary = projection.usageSummary ?? null;
  const stepUsage = projection.stepUsage?.slice(0, compact ? 2 : 4) ?? [];
  const promptUsage = projection.promptUsage?.slice(0, compact ? 2 : 6) ?? [];
  const visibleRiskBadges = projection.visibleRiskBadges?.slice(0, compact ? 3 : 6) ?? [];
  const progressBreakdown = projection.progressBreakdown ?? null;

  return (
    <div className={cn("rounded-lg border bg-background/80 p-3", statusClassName(projection.status), className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <span className="mt-0.5 shrink-0">{statusIcon(projection.status)}</span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">{t("components.autoDirector.runtimeProjection.title")}</div>
            <div className="mt-1 text-sm leading-5">{primaryText}</div>
          </div>
        </div>
        <Badge variant="outline" className="shrink-0 bg-background/70">
          {formatStatus(projection.status, t)}
        </Badge>
      </div>

      {visibleRiskBadges.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {visibleRiskBadges.map((badge) => (
            <Badge key={`${badge.source ?? "risk"}:${badge.label}`} variant="outline" className={cn("bg-background/70", riskBadgeClassName(badge.level))}>
              {badge.label}
            </Badge>
          ))}
        </div>
      ) : null}

      {progressBreakdown && !compact ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-md border bg-background/70 px-3 py-2">
            <div className="text-[11px] text-muted-foreground">{t("components.autoDirector.runtimeProjection.metrics.planning")}</div>
            <div className="mt-1 text-sm font-semibold text-foreground">{formatPercent(progressBreakdown.planningProgress ?? progressBreakdown.planningPercent)}</div>
          </div>
          <div className="rounded-md border bg-background/70 px-3 py-2">
            <div className="text-[11px] text-muted-foreground">{t("components.autoDirector.runtimeProjection.metrics.chapters")}</div>
            <div className="mt-1 text-sm font-semibold text-foreground">{progressBreakdown.continuableChapters}/{progressBreakdown.totalChapters}</div>
          </div>
          <div className="rounded-md border bg-background/70 px-3 py-2">
            <div className="text-[11px] text-muted-foreground">{t("components.autoDirector.runtimeProjection.metrics.quality")}</div>
            <div className="mt-1 text-sm font-semibold text-foreground">{formatPercent(progressBreakdown.qualityProgress ?? progressBreakdown.qualityRepairPercent)}</div>
          </div>
          <div className="rounded-md border bg-background/70 px-3 py-2">
            <div className="text-[11px] text-muted-foreground">{t("components.autoDirector.runtimeProjection.metrics.currentAction")}</div>
            <div className="mt-1 text-sm font-semibold text-foreground">{formatPercent(progressBreakdown.activeJobProgress)}</div>
          </div>
        </div>
      ) : null}

      {attentionText ? (
        <div className="mt-3 rounded-md border bg-background/70 px-3 py-2 text-sm leading-5">
          {projection.requiresUserAction
            ? t("components.autoDirector.runtimeProjection.needsAttention", { text: attentionText })
            : t("components.autoDirector.runtimeProjection.pausedReason", { text: attentionText })}
        </div>
      ) : null}

      {detailText && detailText !== attentionText ? (
        <div className="mt-3 rounded-md border bg-background/70 px-3 py-2 text-sm leading-5">
          {detailText}
        </div>
      ) : null}

      {helperLines.length > 0 && !compact ? (
        <div className="mt-3 space-y-2">
          {helperLines.map((line) => (
            <div key={line} className="rounded-md border bg-background/70 px-3 py-2 text-xs leading-5 text-muted-foreground">
              {line}
            </div>
          ))}
        </div>
      ) : null}

      {usageSummary ? (
        <div className="mt-3 rounded-md border bg-background/70 px-3 py-2 text-xs leading-5 text-muted-foreground">
          <div className="font-medium text-foreground">{t("components.autoDirector.runtimeProjection.usagePanel.title")}</div>
          <div className="mt-1">{formatUsageLine(usageSummary, t)}</div>
          {promptUsage.length > 0 && !compact ? (
            <div className="mt-2 space-y-1">
              <div className="text-[11px] font-medium text-muted-foreground">{t("components.autoDirector.runtimeProjection.usagePanel.stages")}</div>
              {promptUsage.map((item) => (
                <div key={`${item.promptAssetKey}:${item.promptVersion ?? ""}:${item.nodeKey ?? ""}`} className="flex flex-wrap items-center justify-between gap-2 border-t pt-1">
                  <span className="min-w-0 truncate text-foreground">
                    {getDirectorNodeDisplayLabel({ label: item.label ?? item.promptAssetKey, nodeKey: item.nodeKey })}
                  </span>
                  <span className="shrink-0">{formatUsageLine(item, t)}</span>
                </div>
              ))}
            </div>
          ) : null}
          {stepUsage.length > 0 && !compact ? (
            <div className="mt-2 space-y-1">
              <div className="text-[11px] font-medium text-muted-foreground">{t("components.autoDirector.runtimeProjection.usagePanel.steps")}</div>
              {stepUsage.map((item) => (
                <div key={item.stepIdempotencyKey} className="flex flex-wrap items-center justify-between gap-2 border-t pt-1">
                  <span className="min-w-0 truncate text-foreground">
                    {getDirectorNodeDisplayLabel({ label: item.label, nodeKey: item.nodeKey })}
                  </span>
                  <span className="shrink-0">{formatUsageLine(item, t)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-background/70 px-2 py-1">
          {t("components.autoDirector.runtimeProjection.policy", { mode: formatPolicyMode(projection.policyMode, t) })}
        </span>
        <span className="rounded-full bg-background/70 px-2 py-1">
          {t("components.autoDirector.runtimeProjection.updatedAt", { value: formatDate(projection.updatedAt, t) })}
        </span>
      </div>

      {recentEvents.length > 0 && !compact ? (
        <div className="mt-3 space-y-2">
          <div className="text-xs font-medium text-muted-foreground">{t("components.autoDirector.runtimeProjection.recentEvents")}</div>
          {recentEvents.map((event) => (
            <div key={event.eventId} className="rounded-md border bg-background/70 px-3 py-2 text-xs leading-5">
              <div className="text-foreground">{event.summary}</div>
              <div className="mt-1 text-muted-foreground">{formatDate(event.occurredAt, t)}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
