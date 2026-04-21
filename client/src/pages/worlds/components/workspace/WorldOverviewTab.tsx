import type { WorldVisualizationPayload } from "@ai-novel/shared/types/world";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { featureFlags } from "@/config/featureFlags";
import WorldVisualizationBoard from "../WorldVisualizationBoard";
import { t } from "@/i18n";


interface WorldOverviewTabProps {
  summary?: string;
  sections: Array<{ key: string; title: string; content: string }>;
  visualization?: WorldVisualizationPayload;
}

export default function WorldOverviewTab(props: WorldOverviewTabProps) {
  const { summary, sections, visualization } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{featureFlags.worldVisEnabled ? t("总览与可视化") : t("世界总览")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border p-3 text-sm">
          <div className="font-medium mb-1">{t("一句话概括")}</div>
          <div>{summary ?? t("暂无")}</div>
        </div>
        {sections.map((section) => (
          <div key={section.key} className="rounded-md border p-3 text-sm">
            <div className="font-medium mb-1">{section.title}</div>
            <div className="whitespace-pre-wrap">{section.content}</div>
          </div>
        ))}
        {featureFlags.worldVisEnabled ? (
          <WorldVisualizationBoard payload={visualization} />
        ) : (
          <div className="rounded-md border p-3 text-sm text-muted-foreground">
            {t("可视化功能已关闭（`VITE_WORLD_VIS_ENABLED=false`）。")}</div>
        )}
      </CardContent>
    </Card>
  );
}
