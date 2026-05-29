import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { buildTitleLibraryListKey, deleteTitleLibraryEntry, listTitleLibrary, markTitleLibraryUsed } from "@/api/title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { queryKeys } from "@/api/queryKeys";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/i18n";
import { getClickRateBadgeClass, truncateText } from "../titleStudio.shared";

interface TitleLibraryPanelProps {
  genreOptions: Array<{ id: string; label: string; path: string }>;
}

export default function TitleLibraryPanel({ genreOptions }: TitleLibraryPanelProps) {
  const queryClient = useQueryClient();
  const { t, locale } = useTranslation();
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
      toast.success(t("titles.library.toast.deleted"));
    },
  });

  const markUsedMutation = useMutation({
    mutationFn: (id: string) => markTitleLibraryUsed(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.titles.all });
      toast.success(t("titles.library.toast.marked"));
    },
  });

  const handleCopy = async (title: string) => {
    await navigator.clipboard.writeText(title);
    toast.success(t("titles.library.toast.copied"));
  };

  const rows = libraryQuery.data?.data?.items ?? [];
  const pagination = libraryQuery.data?.data;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border bg-muted/20 p-4 md:grid-cols-[minmax(0,1fr)_220px_180px]">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">{t("titles.library.searchLabel")}</span>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("titles.library.searchPlaceholder")}
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">{t("titles.library.genreLabel")}</span>
          <select
            className="w-full rounded-md border bg-background p-2 text-sm"
            value={genreId}
            onChange={(event) => setGenreId(event.target.value)}
          >
            <option value="">{t("titles.library.genreAll")}</option>
            {genreOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.path}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">{t("titles.library.sortLabel")}</span>
          <select
            className="w-full rounded-md border bg-background p-2 text-sm"
            value={sort}
            onChange={(event) => setSort(event.target.value as "newest" | "hot" | "clickRate")}
          >
            <option value="newest">{t("titles.library.sortNewest")}</option>
            <option value="hot">{t("titles.library.sortHot")}</option>
            <option value="clickRate">{t("titles.library.sortClickRate")}</option>
          </select>
        </label>
      </div>

      {libraryQuery.isLoading ? (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t("titles.library.loading")}
        </div>
      ) : null}

      {!libraryQuery.isLoading && rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center">
          <div className="text-sm font-medium text-foreground">{t("titles.library.emptyTitle")}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {t("titles.library.emptyHint")}
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
                    <Badge className={getClickRateBadgeClass(entry.clickRate)}>{t("titles.library.estimate", { value: entry.clickRate })}</Badge>
                  ) : null}
                  {entry.genre?.name ? <Badge variant="secondary">{entry.genre.name}</Badge> : null}
                  <Badge variant="outline">{t("titles.library.usedBadge", { count: entry.usedCount })}</Badge>
                </div>
                <div className="text-lg font-semibold text-foreground">{entry.title}</div>
                {entry.description ? (
                  <div className="text-sm leading-6 text-muted-foreground">
                    {truncateText(entry.description, 180)}
                  </div>
                ) : null}
                {entry.keywords ? (
                  <div className="text-xs text-muted-foreground">{t("titles.library.keywordsLine", { value: truncateText(entry.keywords, 140) })}</div>
                ) : null}
                <div className="text-xs text-muted-foreground">
                  {t("titles.library.addedAt", { value: new Date(entry.createdAt).toLocaleDateString(locale) })}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" onClick={() => void handleCopy(entry.title)}>
                  {t("titles.library.copy")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={markUsedMutation.isPending && markUsedMutation.variables === entry.id}
                  onClick={() => markUsedMutation.mutate(entry.id)}
                >
                  {markUsedMutation.isPending && markUsedMutation.variables === entry.id ? t("titles.library.marking") : t("titles.library.markUsed")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={deleteMutation.isPending && deleteMutation.variables === entry.id}
                  onClick={() => {
                    const confirmed = window.confirm(t("titles.library.confirmDelete", { title: entry.title }));
                    if (confirmed) {
                      deleteMutation.mutate(entry.id);
                    }
                  }}
                >
                  {deleteMutation.isPending && deleteMutation.variables === entry.id ? t("titles.library.deleting") : t("titles.library.delete")}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between rounded-xl border bg-muted/20 px-4 py-3 text-sm">
          <div className="text-muted-foreground">
            {t("titles.library.pagination", { page: pagination.page, totalPages: pagination.totalPages, total: pagination.total })}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>
              {t("titles.library.prev")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((prev) => prev + 1)}
            >
              {t("titles.library.next")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
