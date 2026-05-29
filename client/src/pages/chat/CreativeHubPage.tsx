import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { getAgentCatalog } from "@/api/agentCatalog";
import { queryKeys } from "@/api/queryKeys";
import ChatPage from "./ChatPage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/i18n";

export default function CreativeHubPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const boundNovelId = searchParams.get("novelId")?.trim() ?? "";
  const boundRunId = searchParams.get("runId")?.trim() ?? "";
  const catalogQuery = useQuery({
    queryKey: queryKeys.agentCatalog,
    queryFn: getAgentCatalog,
    staleTime: 60_000,
  });

  const toCategoryLabel = (category: string): string => {
    if (category === "read") return t("chat.creativeHub.category.read");
    if (category === "inspect") return t("chat.creativeHub.category.inspect");
    if (category === "mutate") return t("chat.creativeHub.category.mutate");
    if (category === "run") return t("chat.creativeHub.category.run");
    return category;
  };

  const catalog = catalogQuery.data?.data;
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tool of catalog?.tools ?? []) {
      counts.set(tool.category, (counts.get(tool.category) ?? 0) + 1);
    }
    return [...counts.entries()];
  }, [catalog?.tools]);

  return (
    <div className="space-y-4">
      <Card className="border-slate-200 bg-gradient-to-r from-slate-50 to-white">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle>{t("chat.creativeHub.title")}</CardTitle>
            <CardDescription>
              {t("chat.creativeHub.description")}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Agent {catalog?.agents.length ?? 0}</Badge>
            <Badge variant="secondary">Tools {catalog?.tools.length ?? 0}</Badge>
            {boundNovelId ? <Badge variant="outline">{t("chat.creativeHub.novelBadge", { id: boundNovelId })}</Badge> : null}
            {boundRunId ? <Badge variant="outline">{t("chat.creativeHub.runBadge", { id: boundRunId.slice(0, 8) })}</Badge> : null}
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {categoryCounts.map(([category, count]) => (
            <Badge key={category} variant="outline">
              {toCategoryLabel(category)} {count}
            </Badge>
          ))}
          {catalogQuery.isLoading ? <span>{t("chat.creativeHub.loading")}</span> : null}
        </CardContent>
      </Card>

      <ChatPage />
    </div>
  );
}
