import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import OpenInCreativeHubButton from "@/components/creativeHub/OpenInCreativeHubButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteWorld, getWorldList } from "@/api/world";
import { queryKeys } from "@/api/queryKeys";
import { featureFlags } from "@/config/featureFlags";
import { toast } from "@/components/ui/toast";

function extractStructuredPreview(raw: string): string | null {
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
      return "Có cấu trúc thiết lập, vào workspace để xem chi tiết.";
    }
    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      const summary = [record.summary, record.description, record.content].find((value) => typeof value === "string");
      if (typeof summary === "string" && summary.trim()) {
        return summary.trim();
      }
      return "Có cấu trúc thiết lập, vào workspace để xem chi tiết.";
    }
  } catch {
    return null;
  }

  return null;
}

function buildPreview(raw: string | null | undefined, fallback: string, limit: number): string {
  if (!raw?.trim()) {
    return fallback;
  }

  const normalized = raw.replace(/\s+/g, " ").trim();
  const structured = extractStructuredPreview(normalized);
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
  const worldListQuery = useQuery({
    queryKey: queryKeys.worlds.all,
    queryFn: getWorldList,
  });

  const deleteWorldMutation = useMutation({
    mutationFn: (id: string) => deleteWorld(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.worlds.all });
      toast.success("Đã xóa thế giới quan.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Xóa thế giới quan thất bại.");
    },
  });

  const worlds = worldListQuery.data?.data ?? [];

  const handleDelete = (worldId: string, worldName: string) => {
    const confirmed = window.confirm(`Bạn có chắc muốn xóa thế giới quan “${worldName}” không? Thao tác này không thể hoàn tác.`);
    if (!confirmed) {
      return;
    }
    deleteWorldMutation.mutate(worldId);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <OpenInCreativeHubButton bindings={{}} label="Tổng quan Trung tâm Sáng tạo" />
        {featureFlags.worldWizardEnabled ? (
          <Button asChild>
            <Link to="/worlds/generator">Tạo thế giới quan mới</Link>
          </Button>
        ) : null}
      </div>

      {worlds.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Chưa có thế giới quan nào</CardTitle>
            <CardDescription>Bấm “Tạo thế giới quan mới” để bắt đầu.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {worlds.map((world) => {
            const structuredPreview = buildStructuredWorldPreview(world.structureJson);
            const summary = buildPreview(structuredPreview.summary ?? world.description, "Chưa có mô tả", 120);
            const detail = buildPreview(
              structuredPreview.detail ?? world.overviewSummary ?? world.conflicts ?? world.geography ?? world.background,
              "Chưa có thông tin chi tiết",
              180,
            );

            return (
              <Card key={world.id}>
                <CardHeader>
                  <CardTitle>{world.name}</CardTitle>
                  <CardDescription>
                    {summary} | Trạng thái: {world.status} | v{world.version}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <div className="mb-2">{detail}</div>
                  <div className="flex flex-wrap gap-2">
                    <OpenInCreativeHubButton
                      bindings={{ worldId: world.id }}
                      label="Tiếp tục trong Trung tâm Sáng tạo"
                    />
                    {featureFlags.worldWizardEnabled ? (
                      <Button asChild size="sm">
                        <Link to={`/worlds/${world.id}/workspace`}>Vào workspace</Link>
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(world.id, world.name)}
                      disabled={deleteWorldMutation.isPending && deleteWorldMutation.variables === world.id}
                    >
                      {deleteWorldMutation.isPending && deleteWorldMutation.variables === world.id ? "Đang xóa..." : "Xóa"}
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
