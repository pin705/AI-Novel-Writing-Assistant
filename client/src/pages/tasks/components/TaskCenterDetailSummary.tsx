import type { UnifiedTaskDetail } from "@ai-novel/shared/types/task";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/i18n";
import {
  formatCheckpoint,
  formatDate,
  formatKind,
  formatResumeTarget,
  formatStatus,
  formatTokenCount,
  toStatusVariant,
} from "../taskCenterUtils";

interface TaskCenterDetailSummaryProps {
  task: UnifiedTaskDetail;
  isAutoDirectorTask: boolean;
  currentModelLabel: string;
}

export default function TaskCenterDetailSummary({
  task,
  isAutoDirectorTask,
  currentModelLabel,
}: TaskCenterDetailSummaryProps) {
  const { t } = useTranslation();
  const noneLabel = t("tasks.common.none");
  return (
    <>
      <div className="space-y-1">
        <div className="font-medium">{task.title}</div>
        <div className="text-xs text-muted-foreground">
          {t("tasks.detail.ownershipLine", { kind: formatKind(t, task.kind), owner: task.ownerLabel })}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant={toStatusVariant(task.status)}>{formatStatus(t, task.status)}</Badge>
        <Badge variant="outline">{t("tasks.detail.progressBadge", { percent: Math.round(task.progress * 100) })}</Badge>
      </div>
      <div className="space-y-1 text-muted-foreground">
        <div>{t("tasks.detail.displayStatus", { value: task.displayStatus ?? formatStatus(t, task.status) })}</div>
        <div>{t("tasks.detail.currentStage", { value: task.currentStage ?? noneLabel })}</div>
        <div>{t("tasks.detail.currentItem", { value: task.currentItemLabel ?? noneLabel })}</div>
        {task.kind === "novel_workflow" ? (
          <>
            <div>{t("tasks.detail.lastCheckpoint", { value: formatCheckpoint(t, task.checkpointType, task.executionScopeLabel) })}</div>
            <div>{t("tasks.detail.resumeTarget", { value: formatResumeTarget(t, task.resumeTarget) })}</div>
            <div>{t("tasks.detail.suggestedContinue", { value: task.resumeAction ?? task.nextActionLabel ?? t("tasks.detail.fallbackContinue") })}</div>
            <div>{t("tasks.detail.lastHealthyStage", { value: task.lastHealthyStage ?? noneLabel })}</div>
          </>
        ) : null}
        {task.blockingReason ? (
          <div>{t("tasks.detail.blockingReason", { value: task.blockingReason })}</div>
        ) : null}
        <div>{t("tasks.detail.heartbeat", { value: formatDate(t, task.heartbeatAt) })}</div>
        <div>{t("tasks.detail.startedAt", { value: formatDate(t, task.startedAt) })}</div>
        <div>{t("tasks.detail.finishedAt", { value: formatDate(t, task.finishedAt) })}</div>
        <div>{t("tasks.detail.retryCount", { value: task.retryCountLabel })}</div>
        {(task.provider || task.model) ? (
          <div>{t("tasks.detail.model", { provider: task.provider ?? noneLabel, model: task.model ?? noneLabel })}</div>
        ) : null}
        {isAutoDirectorTask ? (
          <div>{t("tasks.detail.currentUiModel", { value: currentModelLabel })}</div>
        ) : null}
        {(task.tokenUsage || task.provider || task.model) ? (
          <>
            <div>{t("tasks.detail.totalCalls", { value: formatTokenCount(task.tokenUsage?.llmCallCount ?? 0) })}</div>
            <div>{t("tasks.detail.promptTokens", { value: formatTokenCount(task.tokenUsage?.promptTokens ?? 0) })}</div>
            <div>{t("tasks.detail.completionTokens", { value: formatTokenCount(task.tokenUsage?.completionTokens ?? 0) })}</div>
            <div>{t("tasks.detail.totalTokens", { value: formatTokenCount(task.tokenUsage?.totalTokens ?? 0) })}</div>
            <div>{t("tasks.detail.lastRecorded", { value: formatDate(t, task.tokenUsage?.lastRecordedAt) })}</div>
          </>
        ) : null}
      </div>
    </>
  );
}
