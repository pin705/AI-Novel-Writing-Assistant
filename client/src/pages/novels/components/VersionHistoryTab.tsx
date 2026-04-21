import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createNovelSnapshot, listNovelSnapshots, restoreNovelSnapshot } from "@/api/novel";
import { queryKeys } from "@/api/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface VersionHistoryTabProps {
  novelId: string;
}

function formatSnapshotTrigger(triggerType: string): string {
  if (triggerType === "manual") {
    return "Lưu thủ công";
  }
  if (triggerType === "auto_milestone") {
    return "Mốc tự động";
  }
  if (triggerType === "before_pipeline") {
    return "Trước khi xử lý hàng loạt";
  }
  return "Bản chụp phiên bản";
}

function summarizeSnapshot(snapshotData: string): {
  chapterCount: number;
  writtenChapterCount: number;
  totalWordCount: number;
  latestChapterLabel: string;
  hasOutline: boolean;
  hasStructuredOutline: boolean;
  recentChapterTitles: string[];
} | null {
  try {
    const parsed = JSON.parse(snapshotData) as {
      outline?: string | null;
      structuredOutline?: string | null;
      chapters?: Array<{ title?: string | null; order?: number | null; content?: string | null }>;
    };
    const chapters = Array.isArray(parsed.chapters) ? parsed.chapters : [];
    const writtenChapters = chapters.filter((chapter) => Boolean(chapter.content?.trim()));
    const totalWordCount = writtenChapters.reduce((sum, chapter) => sum + (chapter.content?.trim().length ?? 0), 0);
    const latestChapter = [...chapters]
      .sort((left, right) => (right.order ?? 0) - (left.order ?? 0))[0];

    return {
      chapterCount: chapters.length,
      writtenChapterCount: writtenChapters.length,
      totalWordCount,
      latestChapterLabel: latestChapter
        ? `Chương ${latestChapter.order ?? "?"} · ${latestChapter.title?.trim() || "Chưa đặt tên"}`
        : "Chưa có chương nào",
      hasOutline: Boolean(parsed.outline?.trim()),
      hasStructuredOutline: Boolean(parsed.structuredOutline?.trim()),
      recentChapterTitles: chapters
        .slice(0, 3)
        .map((chapter) => chapter.title?.trim())
        .filter((title): title is string => Boolean(title)),
    };
  } catch {
    return null;
  }
}

export default function VersionHistoryTab({ novelId }: VersionHistoryTabProps) {
  const queryClient = useQueryClient();
  const snapshotsQuery = useQuery({
    queryKey: queryKeys.novels.snapshots(novelId),
    queryFn: () => listNovelSnapshots(novelId),
    enabled: Boolean(novelId),
  });

  const createMutation = useMutation({
    mutationFn: () => createNovelSnapshot(novelId, {
      triggerType: "manual",
      label: `manual-${new Date().toLocaleString()}`,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.novels.snapshots(novelId) });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (snapshotId: string) => restoreNovelSnapshot(novelId, snapshotId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.novels.detail(novelId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.novels.snapshots(novelId) });
    },
  });

  const snapshots = snapshotsQuery.data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/15 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-medium">Lịch sử phiên bản</div>
          <div className="text-sm text-muted-foreground">
            Ở đây hệ thống ưu tiên tìm lại bản ổn định gần nhất cho bạn. Trước khi khôi phục, hệ thống sẽ tự sao lưu lại trạng thái hiện tại một lần nữa, và mặc định không còn hiển thị dữ liệu chụp thô.
          </div>
        </div>
        <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
          {createMutation.isPending ? "Đang lưu..." : "Lưu phiên bản hiện tại"}
        </Button>
      </div>

      <div className="space-y-3">
        {snapshots.map((snapshot) => {
          const summary = summarizeSnapshot(snapshot.snapshotData);
          const isRestoringCurrent = restoreMutation.isPending && restoreMutation.variables === snapshot.id;

          return (
            <div key={snapshot.id} className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="font-medium">{snapshot.label || "Phiên bản chưa đặt tên"}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatSnapshotTrigger(snapshot.triggerType)} · {new Date(snapshot.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{summary?.chapterCount ?? 0} chương</Badge>
                    <Badge variant="outline">{summary?.writtenChapterCount ?? 0} chương có nội dung</Badge>
                    <Badge variant="outline">{summary?.totalWordCount ?? 0} chữ</Badge>
                    {summary?.hasOutline ? <Badge variant="secondary">Có dàn ý</Badge> : null}
                    {summary?.hasStructuredOutline ? <Badge variant="secondary">Có tách chương</Badge> : null}
                  </div>

                  <div className="text-sm leading-6 text-muted-foreground">
                    {summary
                      ? `Phiên bản này gần nhất được lưu đến ${summary.latestChapterLabel}, rất hợp khi bạn muốn quay về trạng thái triển khai chương ổn định hơn.`
                      : "Tóm tắt dữ liệu của phiên bản này tạm thời chưa giải mã được, nhưng vẫn có thể khôi phục."}
                  </div>

                  {summary?.recentChapterTitles.length ? (
                    <div className="text-xs text-muted-foreground">
                      Bao gồm chương: {summary.recentChapterTitles.join(" / ")}
                    </div>
                  ) : null}
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const confirmed = window.confirm("Trước khi khôi phục, hệ thống sẽ tự sao lưu trạng thái hiện tại. Bạn có chắc muốn khôi phục phiên bản này không?");
                    if (confirmed) {
                      restoreMutation.mutate(snapshot.id);
                    }
                  }}
                  disabled={restoreMutation.isPending}
                >
                  {isRestoringCurrent ? "Đang khôi phục..." : "Khôi phục phiên bản này"}
                </Button>
              </div>
            </div>
          );
        })}
        {snapshots.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
            Hiện chưa có bản ghi phiên bản nào. Nên lưu thủ công một phiên bản trước khi đổi hướng lớn, tạo hàng loạt hoặc viết lại một đoạn dài.
          </div>
        ) : null}
      </div>
    </div>
  );
}
