import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n";

interface TaskCenterSummaryCardsProps {
  runningCount: number;
  queuedCount: number;
  failedCount: number;
  completed24hCount: number;
}

export default function TaskCenterSummaryCards({
  runningCount,
  queuedCount,
  failedCount,
  completed24hCount,
}: TaskCenterSummaryCardsProps) {
  const { t } = useTranslation();
  return (
    <div className="task-status-summary-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("tasks.summary.running")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">{runningCount}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("tasks.summary.queued")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">{queuedCount}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("tasks.summary.failed")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">{failedCount}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("tasks.summary.completed24h")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">{completed24hCount}</div>
        </CardContent>
      </Card>
    </div>
  );
}
