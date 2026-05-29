import type { NovelWorkflowMilestone } from "@ai-novel/shared/types/novelWorkflow";
import { useTranslation } from "@/i18n";
import { formatCheckpoint, formatDate } from "../taskCenterUtils";

interface TaskCenterMilestoneHistoryProps {
  milestones: NovelWorkflowMilestone[];
}

export default function TaskCenterMilestoneHistory({
  milestones,
}: TaskCenterMilestoneHistoryProps) {
  const { t } = useTranslation();
  if (milestones.length === 0) {
    return null;
  }
  return (
    <div className="space-y-2">
      <div className="font-medium">{t("tasks.detail.milestonesTitle")}</div>
      {milestones.map((item) => (
        <div key={`${item.checkpointType}:${item.createdAt}`} className="rounded-md border p-2 text-muted-foreground">
          <div className="font-medium text-foreground">{formatCheckpoint(t, item.checkpointType)}</div>
          <div className="mt-1">{item.summary}</div>
          <div className="mt-1 text-xs">{t("tasks.detail.milestoneRecordedAt", { value: formatDate(t, item.createdAt) })}</div>
        </div>
      ))}
    </div>
  );
}
