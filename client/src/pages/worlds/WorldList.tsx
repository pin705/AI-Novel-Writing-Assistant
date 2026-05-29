import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import OpenInCreativeHubButton from "@/components/creativeHub/OpenInCreativeHubButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteWorld, getWorldList } from "@/api/world";
import { queryKeys } from "@/api/queryKeys";
import { featureFlags } from "@/config/featureFlags";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/i18n";

function extractStructuredPreview(raw: string, structuredPreviewFallback: string): string | null {
  const text = raw.trim();
  if (!text || (!text.startsWith("[") && !text.startsWith("{"))) {
    return null;
  }

  try {
    const parsed = JSON.parse(text) as unknown;
    if (Array.isArray(parsed)) {
      const parts = parsed
        .slice(0, 2)
        .map((item) => {
          if (typeof item === "string") {
            return item.trim();
          }
          if (!item || typeof item !== "object") {
            return "";
          }
          const record = item as Record<string, unknown>;
          const title = [record.name, record.title, record.label].find((value) => typeof value === "string");
          const description = [record.description, record.content, record.detail].find((value) => typeof value === "string");
          if (typeof title === "string" && typeof description === "string") {
            return `${title.trim()}：${description.trim()}`;
          }
          if (typeof title === "string") {
            return title.trim();
          }
          if (typeof description === "string") {
            return description.trim();
          }
          return "";
        })
        .filter(Boolean);
      if (parts.length > 0) {
        return parts.join("；");
      }
      return structuredPreviewFallback;
    }
    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      const summary = [record.summary, record.description, record.content].find((value) => typeof value === "string");
      if (typeof summary === "string" && summary.trim()) {
        return summary.trim();
      }
      return structuredPreviewFallback;
    }
  } catch {
    return null;
  }

  return null;
}

function buildPreview(raw: string | null | undefined, fallback: string, limit: number, structuredPreviewFallback: string): string {
  if (!raw?.trim()) {
    return fallback;
  }

  const normalized = raw.replace(/\s+/g, " ").trim();
  const structured = extractStructuredPreview(normalized, structuredPreviewFallback);
  const preview = (structured ?? normalized).slice(0, limit);
  return preview.length < (structured ?? normalized).length ? `${preview}...` : preview;
}

function buildStructuredWorldPreview(structureJson: string | null | undefined): {
  summary: string | null;
  detail: string | null;
} {
  if (!structureJson?.trim()) {
    return { summary: null, detail: null };
  }

  try {
    const parsed = JSON.parse(structureJson) as {
      profile?: { summary?: string; identity?: string; coreConflict?: string };
      rules?: { axioms?: Array<{ name?: string; summary?: string }> };
    };
    const summary = parsed.profile?.summary?.trim() || null;
    const detail = [
      parsed.profile?.identity?.trim(),
      parsed.profile?.coreConflict?.trim(),
      parsed.rules?.axioms?.[0]?.name?.trim(),
      parsed.rules?.axioms?.[0]?.summary?.trim(),
    ]
      .filter(Boolean)
      .join(" | ");
    return {
      summary,
      detail: detail || null,
    };
  } catch {
    return { summary: null, detail: null };
  }
}

export default function WorldList() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const worldListQuery = useQuery({
    queryKey: queryKeys.worlds.all,
    queryFn: getWorldList,
  });

  const deleteWorldMutation = useMutation({
    mutationFn: (id: string) => deleteWorld(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.worlds.all });
      toast.success(t("worlds.list.toast.deleted"));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("worlds.list.toast.deleteFailed"));
    },
  });

  const worlds = worldListQuery.data?.data ?? [];

  const handleDelete = (worldId: string, worldName: string) => {
    const confirmed = window.confirm(t("worlds.list.confirmDelete", { name: worldName }));
    if (!confirmed) {
      return;
    }
    deleteWorldMutation.mutate(worldId);
  };

  const structuredPreviewFallback = t("worlds.list.structuredPreview");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <OpenInCreativeHubButton bindings={{}} label={t("worlds.list.hubAll")} />
        {featureFlags.worldWizardEnabled ? (
          <Button asChild>
            <Link to="/worlds/generator">{t("worlds.list.createCta")}</Link>
          </Button>
        ) : null}
      </div>

      {worlds.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("worlds.list.emptyTitle")}</CardTitle>
            <CardDescription>{t("worlds.list.emptyDescription")}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {worlds.map((world) => {
            const structuredPreview = buildStructuredWorldPreview(world.structureJson);
            const summary = buildPreview(structuredPreview.summary ?? world.description, t("worlds.list.noDescription"), 120, structuredPreviewFallback);
            const detail = buildPreview(
              structuredPreview.detail ?? world.overviewSummary ?? world.conflicts ?? world.geography ?? world.background,
              t("worlds.list.noDetail"),
              180,
              structuredPreviewFallback,
            );

            return (
              <Card key={world.id}>
                <CardHeader>
                  <CardTitle>{world.name}</CardTitle>
                  <CardDescription>
                    {t("worlds.list.statusLine", { summary, status: world.status, version: world.version })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <div className="mb-2">{detail}</div>
                  <div className="flex flex-wrap gap-2">
                    <OpenInCreativeHubButton
                      bindings={{ worldId: world.id }}
                      label={t("worlds.list.hubContinue")}
                    />
                    {featureFlags.worldWizardEnabled ? (
                      <Button asChild size="sm">
                        <Link to={`/worlds/${world.id}/workspace`}>{t("worlds.list.enterWorkspace")}</Link>
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(world.id, world.name)}
                      disabled={deleteWorldMutation.isPending && deleteWorldMutation.variables === world.id}
                    >
                      {deleteWorldMutation.isPending && deleteWorldMutation.variables === world.id ? t("worlds.list.deleting") : t("worlds.list.delete")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
