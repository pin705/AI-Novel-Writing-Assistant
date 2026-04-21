import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { buildTitleLibraryListKey, deleteTitleLibraryEntry, listTitleLibrary, markTitleLibraryUsed } from "@/api/title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { queryKeys } from "@/api/queryKeys";
import { toast } from "@/components/ui/toast";
import { getClickRateBadgeClass, truncateText } from "../titleStudio.shared";

interface TitleLibraryPanelProps {
  genreOptions: Array<{ id: string; label: string; path: string }>;
}

export default function TitleLibraryPanel({ genreOptions }: TitleLibraryPanelProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [genreId, setGenreId] = useState("");
  const [sort, setSort] = useState<"newest" | "hot" | "clickRate">("newest");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [genreId, search, sort]);

  const listParams = useMemo(
    () => ({
      page,
      pageSize: 18,
      search,
      genreId,
      sort,
    }),
    [genreId, page, search, sort],
  );
  const listKey = useMemo(() => buildTitleLibraryListKey(listParams), [listParams]);

  const libraryQuery = useQuery({
    queryKey: queryKeys.titles.list(listKey),
    queryFn: () => listTitleLibrary(listParams),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTitleLibraryEntry(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.titles.all });
      toast.success("Đã xóa tiêu đề.");
    },
  });

  const markUsedMutation = useMutation({
    mutationFn: (id: string) => markTitleLibraryUsed(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.titles.all });
      toast.success("Đã cập nhật số lần dùng tiêu đề.");
    },
  });

  const handleCopy = async (title: string) => {
    await navigator.clipboard.writeText(title);
    toast.success("Đã sao chép tiêu đề vào clipboard.");
  };

  const rows = libraryQuery.data?.data?.items ?? [];
  const pagination = libraryQuery.data?.data;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border bg-muted/20 p-4 md:grid-cols-[minmax(0,1fr)_220px_180px]">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">Tìm kiếm</span>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Khớp theo tiêu đề, mô tả hoặc từ khóa"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">Thể loại</span>
          <select
            className="w-full rounded-md border bg-background p-2 text-sm"
            value={genreId}
            onChange={(event) => setGenreId(event.target.value)}
          >
            <option value="">Tất cả thể loại</option>
            {genreOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.path}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">Sắp xếp</span>
          <select
            className="w-full rounded-md border bg-background p-2 text-sm"
            value={sort}
            onChange={(event) => setSort(event.target.value as "newest" | "hot" | "clickRate")}
          >
            <option value="newest">Mới thêm</option>
            <option value="hot">Số lần dùng</option>
            <option value="clickRate">Tiềm năng click</option>
          </select>
        </label>
      </div>

      {libraryQuery.isLoading ? (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Đang tải kho tiêu đề...
        </div>
      ) : null}

      {!libraryQuery.isLoading && rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center">
          <div className="text-sm font-medium text-foreground">Kho tiêu đề vẫn còn trống</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Hãy sang xưởng tiêu đề tạo một loạt phương án trước, rồi đưa những tiêu đề đáng dùng vào đây.
          </div>
        </div>
      ) : null}

      <div className="grid gap-3">
        {rows.map((entry) => (
          <div key={entry.id} className="rounded-xl border bg-background p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {typeof entry.clickRate === "number" ? (
                    <Badge className={getClickRateBadgeClass(entry.clickRate)}>Ước tính {entry.clickRate}</Badge>
                  ) : null}
                  {entry.genre?.name ? <Badge variant="secondary">{entry.genre.name}</Badge> : null}
                  <Badge variant="outline">Dùng {entry.usedCount}</Badge>
                </div>
                <div className="text-lg font-semibold text-foreground">{entry.title}</div>
                {entry.description ? (
                  <div className="text-sm leading-6 text-muted-foreground">
                    {truncateText(entry.description, 180)}
                  </div>
                ) : null}
                {entry.keywords ? (
                  <div className="text-xs text-muted-foreground">Từ khóa: {truncateText(entry.keywords, 140)}</div>
                ) : null}
                <div className="text-xs text-muted-foreground">
                  Thời gian thêm: {new Date(entry.createdAt).toLocaleDateString("vi-VN")}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" onClick={() => void handleCopy(entry.title)}>
                  Sao chép
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={markUsedMutation.isPending && markUsedMutation.variables === entry.id}
                  onClick={() => markUsedMutation.mutate(entry.id)}
                >
                  {markUsedMutation.isPending && markUsedMutation.variables === entry.id ? "Đang cập nhật..." : "Đánh dấu đã dùng"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={deleteMutation.isPending && deleteMutation.variables === entry.id}
                  onClick={() => {
                    const confirmed = window.confirm(`Bạn có chắc muốn xóa tiêu đề “${entry.title}” không?`);
                    if (confirmed) {
                      deleteMutation.mutate(entry.id);
                    }
                  }}
                >
                  {deleteMutation.isPending && deleteMutation.variables === entry.id ? "Đang xóa..." : "Xóa"}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between rounded-xl border bg-muted/20 px-4 py-3 text-sm">
          <div className="text-muted-foreground">
            Trang {pagination.page} / {pagination.totalPages}, tổng {pagination.total} mục
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>
              Trang trước
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Trang sau
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
