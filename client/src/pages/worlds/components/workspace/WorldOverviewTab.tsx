import type { WorldVisualizationPayload } from "@ai-novel/shared/types/world";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { featureFlags } from "@/config/featureFlags";
import WorldVisualizationBoard from "../WorldVisualizationBoard";

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
        <CardTitle>{featureFlags.worldVisEnabled ? "Tổng quan và trực quan hóa" : "Tổng quan thế giới"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border p-3 text-sm">
          <div className="font-medium mb-1">Tóm tắt một câu</div>
          <div>{summary ?? "Chưa có"}</div>
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
            Tính năng trực quan hóa đang tắt (`VITE_WORLD_VIS_ENABLED=false`).
          </div>
        )}
      </CardContent>
    </Card>
  );
}
