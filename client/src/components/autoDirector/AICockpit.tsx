import type {
  DirectorBookAutomationAction,
  DirectorBookAutomationDisplayState,
  DirectorBookAutomationProjection,
} from "@ai-novel/shared/types/directorRuntime";
import { getDirectorNodeDisplayLabel } from "@ai-novel/shared/types/directorRuntime";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  ExternalLink,
  History,
  PauseCircle,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";
import type { TranslateValues } from "@/i18n";
import { cn } from "@/lib/utils";

type Translator = (key: string, values?: TranslateValues) => string;

export interface AICockpitProps {
  projection?: DirectorBookAutomationProjection | null;
  mode?: "focusedNovel" | "compact";
  fallbackSummary?: string | null;
  fallbackStatusLabel?: string | null;
  isActionPending?: boolean;
  showDetailsAction?: boolean;
  onAction?: (projection: DirectorBookAutomationProjection, action: DirectorBookAutomationAction) => void;
  onOpenDetails?: (projection: DirectorBookAutomationProjection) => void;
  onOpenNovel?: (projection: DirectorBookAutomationProjection) => void;
  onOpenFallbackDetails?: () => void;
}

function displayStateLabel(state: DirectorBookAutomationDisplayState, t: Translator): string {
  return t(`components.autoDirector.cockpit.states.${state === "needs_confirmation"
    ? "needsConfirmation"
    : state === "needs_attention"
      ? "needsAttention"
      : state}`);
}

function stateBadgeVariant(state: DirectorBookAutomationDisplayState): "default" | "secondary" | "outline" | "destructive" {
  if (state === "needs_attention") {
    return "destructive";
  }
  if (state === "processing") {
    return "default";
  }
  if (state === "needs_confirmation" || state === "paused") {
    return "outline";
  }
  return "secondary";
}

function stateClassName(state: DirectorBookAutomationDisplayState): string {
  if (state === "processing") {
    return "border-sky-200 bg-sky-50/70";
  }
  if (state === "needs_confirmation") {
    return "border-amber-200 bg-amber-50/70";
  }
  if (state === "paused") {
    return "border-indigo-200 bg-indigo-50/60";
  }
  if (state === "needs_attention") {
    return "border-destructive/30 bg-destructive/5";
  }
  if (state === "completed") {
    return "border-emerald-200 bg-emerald-50/60";
  }
  return "border-border/70 bg-muted/20";
}

function stateIcon(state: DirectorBookAutomationDisplayState) {
  if (state === "processing") {
    return <Activity className="h-4 w-4" />;
  }
  if (state === "needs_confirmation") {
    return <PauseCircle className="h-4 w-4" />;
  }
  if (state === "paused") {
    return <Clock3 className="h-4 w-4" />;
  }
  if (state === "needs_attention") {
    return <AlertTriangle className="h-4 w-4" />;
  }
  if (state === "completed") {
    return <CheckCircle2 className="h-4 w-4" />;
  }
  return <ShieldCheck className="h-4 w-4" />;
}

function formatDate(value: string | null | undefined, t: Translator): string {
  if (!value) {
    return t("components.autoDirector.cockpit.datePlaceholder");
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return t("components.autoDirector.cockpit.datePlaceholder");
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
    return t("components.autoDirector.cockpit.lessThanOneSecond");
  }
  if (seconds < 60) {
    return t("components.autoDirector.cockpit.secondsUnit", { count: seconds });
  }
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  return restSeconds > 0
    ? t("components.autoDirector.cockpit.minutesSecondsUnit", { minutes, seconds: restSeconds })
    : t("components.autoDirector.cockpit.minutesUnit", { count: minutes });
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
    t("components.autoDirector.cockpit.usageLine.callCount", { count: formatTokenCount(usage.llmCallCount) }),
    t("components.autoDirector.cockpit.usageLine.promptTokens", { count: formatTokenCount(usage.promptTokens) }),
    t("components.autoDirector.cockpit.usageLine.completionTokens", { count: formatTokenCount(usage.completionTokens) }),
    t("components.autoDirector.cockpit.usageLine.totalTokens", { count: formatTokenCount(usage.totalTokens) }),
    duration ? t("components.autoDirector.cockpit.usageLine.duration", { duration }) : null,
  ].filter(Boolean).join(" · ");
}

function fallbackProjectionReason(props: Pick<AICockpitProps, "fallbackSummary">, t: Translator): string {
  return props.fallbackSummary?.trim() || t("components.autoDirector.cockpit.fallbackReason");
}

function renderActionLabel(
  action: DirectorBookAutomationAction,
  displayState: DirectorBookAutomationDisplayState | undefined,
  t: Translator,
): string {
  if (
    displayState === "needs_confirmation"
    && (action.type === "continue" || action.type === "auto_execute_range")
  ) {
    return t("components.autoDirector.cockpit.renderAction.confirmContinue");
  }
  return action.label || t("components.autoDirector.cockpit.renderAction.fallback");
}

function artifactTypeLabel(type: string, t: Translator): string {
  const labels: Record<string, string> = {
    book_contract: t("components.autoDirector.cockpit.artifactTypes.book_contract"),
    story_macro: t("components.autoDirector.cockpit.artifactTypes.story_macro"),
    character_cast: t("components.autoDirector.cockpit.artifactTypes.character_cast"),
    volume_strategy: t("components.autoDirector.cockpit.artifactTypes.volume_strategy"),
    chapter_task_sheet: t("components.autoDirector.cockpit.artifactTypes.chapter_task_sheet"),
    chapter_draft: t("components.autoDirector.cockpit.artifactTypes.chapter_draft"),
    audit_report: t("components.autoDirector.cockpit.artifactTypes.audit_report"),
    repair_ticket: t("components.autoDirector.cockpit.artifactTypes.repair_ticket"),
    reader_promise: t("components.autoDirector.cockpit.artifactTypes.reader_promise"),
    character_governance_state: t("components.autoDirector.cockpit.artifactTypes.character_governance_state"),
    world_skeleton: t("components.autoDirector.cockpit.artifactTypes.world_skeleton"),
    source_knowledge_pack: t("components.autoDirector.cockpit.artifactTypes.source_knowledge_pack"),
    chapter_retention_contract: t("components.autoDirector.cockpit.artifactTypes.chapter_retention_contract"),
    continuity_state: t("components.autoDirector.cockpit.artifactTypes.continuity_state"),
    rolling_window_review: t("components.autoDirector.cockpit.artifactTypes.rolling_window_review"),
  };
  return labels[type] ?? type;
}

function recoveryActionLabel(
  action: NonNullable<DirectorBookAutomationProjection["circuitBreaker"]>["recoveryAction"],
  t: Translator,
): string | null {
  if (!action) return null;
  const labels: Record<string, string> = {
    retry: t("components.autoDirector.cockpit.recoveryActions.retry"),
    resume_after_review: t("components.autoDirector.cockpit.recoveryActions.resume_after_review"),
    switch_model: t("components.autoDirector.cockpit.recoveryActions.switch_model"),
    confirm_protected_content: t("components.autoDirector.cockpit.recoveryActions.confirm_protected_content"),
    manual_repair: t("components.autoDirector.cockpit.recoveryActions.manual_repair"),
  };
  return labels[action] ?? null;
}

function workerStateLabel(
  state: NonNullable<DirectorBookAutomationProjection["workerHealth"]>["derivedState"],
  t: Translator,
): string {
  const key = `components.autoDirector.cockpit.workerStates.${state}`;
  const result = t(key);
  return result === key ? state : result;
}

function workerStateDetail(
  health: NonNullable<DirectorBookAutomationProjection["workerHealth"]>,
  t: Translator,
): string {
  if (health.message?.trim()) {
    return health.message.trim();
  }
  if (health.queuedCommandCount > 0) {
    return t("components.autoDirector.cockpit.workerDetail.queued");
  }
  if (health.runningCommandCount > 0 || health.leasedCommandCount > 0) {
    return t("components.autoDirector.cockpit.workerDetail.running");
  }
  if (health.staleCommandCount > 0) {
    return t("components.autoDirector.cockpit.workerDetail.stale");
  }
  return t("components.autoDirector.cockpit.workerDetail.noBackgroundAction");
}

export default function AICockpit(props: AICockpitProps) {
  const {
    mode = "focusedNovel",
    fallbackStatusLabel,
    isActionPending = false,
    showDetailsAction = true,
    onAction,
    onOpenDetails,
    onOpenNovel,
    onOpenFallbackDetails,
  } = props;
  const { t } = useTranslation();
  const focusProjection = props.projection ?? null;
  const isCompact = mode === "compact";

  if (!focusProjection) {
    return (
      <div className={cn("rounded-lg border p-3", stateClassName("idle"))}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <span className="mt-0.5 shrink-0 text-foreground">{stateIcon("idle")}</span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">{t("components.autoDirector.cockpit.title")}</div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">{fallbackProjectionReason(props, t)}</div>
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {fallbackStatusLabel ?? t("components.autoDirector.cockpit.fallbackStatus")}
          </Badge>
        </div>
        {onOpenFallbackDetails ? (
          <Button type="button" size="sm" variant="outline" className="mt-3 w-full" onClick={onOpenFallbackDetails}>
            {t("components.autoDirector.cockpit.view")}
          </Button>
        ) : null}
      </div>
    );
  }

  const primaryAction = focusProjection.primaryAction ?? null;
  const detailAction = focusProjection.secondaryActions?.find((item) => item.type === "open_details") ?? null;
  const canOpenDetails = showDetailsAction && Boolean(onOpenDetails || (detailAction && onAction));
  const recentItems = focusProjection.timeline.slice(0, isCompact ? 2 : 3);
  const artifactRows = focusProjection.artifactSummary.byType?.slice(0, 3) ?? [];
  const usageSummary = focusProjection.usageSummary ?? null;
  const stepUsage = focusProjection.stepUsage?.slice(0, 2) ?? [];
  const promptUsage = focusProjection.promptUsage?.slice(0, 6) ?? [];
  const circuitBreaker = focusProjection.circuitBreaker?.status === "open" ? focusProjection.circuitBreaker : null;
  const circuitRecovery = recoveryActionLabel(circuitBreaker?.recoveryAction ?? null, t);
  const workerHealth = focusProjection.workerHealth ?? null;
  const artifactInsightLines = [
    focusProjection.artifactSummary.affectedChapterCount
      ? t("components.autoDirector.cockpit.artifacts.affectedChapters", {
        count: focusProjection.artifactSummary.affectedChapterCount,
      })
      : null,
    focusProjection.artifactSummary.recentStaleArtifacts?.length
      ? t("components.autoDirector.cockpit.artifacts.needsReview", {
        count: focusProjection.artifactSummary.recentStaleArtifacts.length,
      })
      : null,
    focusProjection.artifactSummary.recentRepairArtifacts?.length
      ? t("components.autoDirector.cockpit.artifacts.recentRepairs", {
        count: focusProjection.artifactSummary.recentRepairArtifacts.length,
      })
      : null,
    focusProjection.artifactSummary.recentVersionedArtifacts?.length
      ? t("components.autoDirector.cockpit.artifacts.newVersions", {
        count: focusProjection.artifactSummary.recentVersionedArtifacts.length,
      })
      : null,
  ].filter((line): line is string => Boolean(line));
  const reason = focusProjection.userReason?.trim()
    || focusProjection.blockedReason?.trim()
    || focusProjection.detail?.trim()
    || focusProjection.automationSummary?.trim()
    || fallbackProjectionReason(props, t);

  const handlePrimaryAction = () => {
    if (primaryAction && onAction) {
      onAction(focusProjection, primaryAction);
      return;
    }
    onOpenNovel?.(focusProjection);
  };

  const handleDetails = () => {
    if (detailAction && onAction) {
      onAction(focusProjection, detailAction);
      return;
    }
    onOpenDetails?.(focusProjection);
  };

  const handleCompactOpen = () => {
    if (onOpenNovel) {
      onOpenNovel(focusProjection);
      return;
    }
    handleDetails();
  };

  if (isCompact) {
    return (
      <div className={cn("rounded-lg border p-3", stateClassName(focusProjection.displayState))}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <span className="mt-0.5 shrink-0 text-foreground">{stateIcon(focusProjection.displayState)}</span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">{t("components.autoDirector.cockpit.title")}</div>
              <div className="mt-1 line-clamp-1 text-xs leading-5 text-muted-foreground">
                {focusProjection.userHeadline || focusProjection.headline || reason}
              </div>
            </div>
          </div>
          <Badge variant={stateBadgeVariant(focusProjection.displayState)} className="shrink-0">
            {displayStateLabel(focusProjection.displayState, t)}
          </Badge>
        </div>
        <Button type="button" size="sm" variant="outline" className="mt-3 w-full" onClick={handleCompactOpen}>
          {t("components.autoDirector.cockpit.view")}
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border p-3", stateClassName(focusProjection.displayState))}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <span className="mt-0.5 shrink-0 text-foreground">{stateIcon(focusProjection.displayState)}</span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">{t("components.autoDirector.cockpit.title")}</div>
            {!isCompact ? (
              <div className="mt-1 truncate text-xs font-medium text-foreground">{focusProjection.focusNovel.title}</div>
            ) : null}
            <div className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
              {focusProjection.userHeadline || focusProjection.headline}
            </div>
          </div>
        </div>
        <Badge variant={stateBadgeVariant(focusProjection.displayState)} className="shrink-0">
          {displayStateLabel(focusProjection.displayState, t)}
        </Badge>
      </div>

      <div className="mt-3 rounded-md border bg-background/70 px-3 py-2 text-xs leading-5 text-muted-foreground">
        {reason}
      </div>

      {!isCompact && focusProjection.progressSummary ? (
        <div className="mt-2 text-xs leading-5 text-muted-foreground">{focusProjection.progressSummary}</div>
      ) : null}

      {!isCompact && workerHealth ? (
        <div className="mt-3 rounded-md border bg-background/70 px-3 py-2 text-xs leading-5 text-muted-foreground">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Database className="h-3.5 w-3.5" />
              {t("components.autoDirector.cockpit.workerDetail.label")}
            </div>
            <Badge variant="outline">{workerStateLabel(workerHealth.derivedState, t)}</Badge>
          </div>
          <div className="mt-1">{workerStateDetail(workerHealth, t)}</div>
          <div className="mt-2 grid gap-2 sm:grid-cols-4">
            <div className="rounded-md bg-muted/40 px-2 py-1">
              <div className="text-[11px] text-muted-foreground">{t("components.autoDirector.cockpit.workerDetail.queueCount")}</div>
              <div className="font-medium text-foreground">{workerHealth.queuedCommandCount}</div>
            </div>
            <div className="rounded-md bg-muted/40 px-2 py-1">
              <div className="text-[11px] text-muted-foreground">{t("components.autoDirector.cockpit.workerDetail.leasedCount")}</div>
              <div className="font-medium text-foreground">{workerHealth.leasedCommandCount}</div>
            </div>
            <div className="rounded-md bg-muted/40 px-2 py-1">
              <div className="text-[11px] text-muted-foreground">{t("components.autoDirector.cockpit.workerDetail.runningCount")}</div>
              <div className="font-medium text-foreground">{workerHealth.runningCommandCount}</div>
            </div>
            <div className="rounded-md bg-muted/40 px-2 py-1">
              <div className="text-[11px] text-muted-foreground">{t("components.autoDirector.cockpit.workerDetail.recoveringCount")}</div>
              <div className="font-medium text-foreground">{workerHealth.staleCommandCount}</div>
            </div>
          </div>
          {workerHealth.oldestQueuedWaitMs ? (
            <div className="mt-2 text-[11px] text-muted-foreground">
              {t("components.autoDirector.cockpit.workerDetail.waitingForLease", {
                duration: formatDuration(workerHealth.oldestQueuedWaitMs, t)
                  ?? t("components.autoDirector.cockpit.lessThanOneSecond"),
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      {circuitBreaker ? (
        <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs leading-5 text-destructive">
          <div className="font-medium">{t("components.autoDirector.cockpit.circuitBreaker.title")}</div>
          <div className="mt-1">{circuitBreaker.message || t("components.autoDirector.cockpit.circuitBreaker.fallback")}</div>
          {circuitRecovery
            ? <div className="mt-1">{t("components.autoDirector.cockpit.circuitBreaker.recovery", { action: circuitRecovery })}</div>
            : null}
        </div>
      ) : null}

      {usageSummary ? (
        <div className="mt-3 rounded-md border bg-background/70 px-3 py-2 text-xs leading-5 text-muted-foreground">
          <div className="font-medium text-foreground">{t("components.autoDirector.cockpit.usagePanel.title")}</div>
          <div className="mt-1">{formatUsageLine(usageSummary, t)}</div>
          {promptUsage.length > 0 ? (
            <div className="mt-2 space-y-1">
              <div className="text-[11px] font-medium text-muted-foreground">{t("components.autoDirector.cockpit.usagePanel.stagesTitle")}</div>
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
          {stepUsage.length > 0 ? (
            <div className="mt-2 space-y-1">
              <div className="text-[11px] font-medium text-muted-foreground">{t("components.autoDirector.cockpit.usagePanel.stepsTitle")}</div>
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

      {artifactRows.length > 0 ? (
        <div className="mt-3 rounded-md border bg-background/70 px-3 py-2">
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Database className="h-3.5 w-3.5" />
            {t("components.autoDirector.cockpit.artifacts.title")}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {artifactRows.map((item) => (
              <Badge key={item.artifactType} variant={item.staleCount > 0 ? "outline" : "secondary"} className="text-[11px]">
                {artifactTypeLabel(String(item.artifactType), t)}
                <span className="ml-1 text-muted-foreground">{item.activeCount}/{item.totalCount}</span>
              </Badge>
            ))}
          </div>
          {artifactInsightLines.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
              {artifactInsightLines.map((line) => (
                <span key={line} className="rounded-full bg-muted/40 px-2 py-0.5">{line}</span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {focusProjection.nextActionLabel ? (
        <div className="mt-2 rounded-md border bg-background/70 px-3 py-2 text-xs leading-5 text-muted-foreground">
          {t("components.autoDirector.cockpit.nextAction", { label: focusProjection.nextActionLabel })}
        </div>
      ) : null}

      {recentItems.length > 0 ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <History className="h-3.5 w-3.5" />
            {t("components.autoDirector.cockpit.historyTitle")}
          </div>
          {recentItems.map((item) => (
            <div key={item.id} className="rounded-md border bg-background/70 px-3 py-2 text-xs leading-5">
              <div className="line-clamp-2 text-foreground">{item.title}</div>
              {item.usage ? (
                <div className="mt-1 text-muted-foreground">{formatUsageLine(item.usage, t)}</div>
              ) : item.durationMs ? (
                <div className="mt-1 text-muted-foreground">
                  {t("components.autoDirector.cockpit.historyDuration", {
                    duration: formatDuration(item.durationMs, t) ?? "",
                  })}
                </div>
              ) : null}
              <div className="mt-1 text-muted-foreground">{formatDate(item.occurredAt, t)}</div>
            </div>
          ))}
        </div>
      ) : null}

      <div className={cn("mt-3 flex gap-2", isCompact && canOpenDetails && "grid grid-cols-2")}>
        <Button type="button" size="sm" className="flex-1" onClick={handlePrimaryAction} disabled={isActionPending}>
          {isActionPending
            ? t("components.autoDirector.cockpit.processing")
            : renderActionLabel(primaryAction ?? {
              type: "open_novel",
              label: t("components.autoDirector.cockpit.renderAction.openNovel"),
              target: { novelId: focusProjection.novelId },
            }, focusProjection.displayState, t)}
        </Button>
        {canOpenDetails ? (
          <Button type="button" size="sm" variant="outline" onClick={handleDetails}>
            <ExternalLink className="h-4 w-4" />
            {t("components.autoDirector.cockpit.executionDetails")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
