import type { UnifiedTaskSummary } from "@ai-novel/shared/types/task";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n";
import {
  formatCheckpoint,
  formatDate,
  formatKind,
  formatStatus,
  toStatusVariant,
} from "../taskCenterUtils";

interface TaskCenterListPanelProps {
  tasks: UnifiedTaskSummary[];
  selectedKind: string | null;
  selectedId: string | null;
  onSelectTask: (task: UnifiedTaskSummary) => void;
}

export default function TaskCenterListPanel({
  tasks,
  selectedKind,
  selectedId,
  onSelectTask,
}: TaskCenterListPanelProps) {
  const { t } = useTranslation();
  const noneLabel = t("tasks.common.none");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("tasks.list.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.map((task) => {
          const isSelected = task.kind === selectedKind && task.id === selectedId;
          return (
            <button
              key={`${task.kind}:${task.id}`}
              type="button"
              className={`w-full rounded-md border p-3 text-left transition-colors ${
                isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/40"
              }`}
              onClick={() => onSelectTask(task)}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium">{task.title}</div>
                <Badge variant={toStatusVariant(task.status)}>{formatStatus(t, task.status)}</Badge>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {formatKind(t, task.kind)} | {t("tasks.list.progress", { percent: Math.round(task.progress * 100) })}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {t("tasks.list.stageLine", { stage: task.currentStage ?? noneLabel, item: task.currentItemLabel ?? noneLabel })}
              </div>
              {task.displayStatus || task.lastHealthyStage ? (
                <div className="mt-1 text-xs text-muted-foreground">
                  {t("tasks.list.statusLine", {
                    status: task.displayStatus ?? formatStatus(t, task.status),
                    healthy: task.lastHealthyStage ?? noneLabel,
                  })}
                </div>
              ) : null}
              {task.kind === "novel_workflow" ? (
                <div className="mt-1 text-xs text-muted-foreground">
                  {t("tasks.list.checkpointLine", {
                    checkpoint: formatCheckpoint(t, task.checkpointType, task.executionScopeLabel),
                    action: task.resumeAction ?? task.nextActionLabel ?? t("tasks.list.fallbackNext"),
                  })}
                </div>
              ) : null}
              {task.blockingReason ? (
                <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {t("tasks.list.blockingLine", { reason: task.blockingReason })}
                </div>
              ) : null}
              <div className="mt-1 text-xs text-muted-foreground">
                {t("tasks.list.timeLine", { heartbeat: formatDate(t, task.heartbeatAt), updated: formatDate(t, task.updatedAt) })}
              </div>
            </button>
          );
        })}
        {tasks.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            {t("tasks.list.empty")}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
