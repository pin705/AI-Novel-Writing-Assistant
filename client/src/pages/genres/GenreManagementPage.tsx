import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteGenre, flattenGenreTreeOptions, getGenreTree, type GenreTreeNode } from "@/api/genre";
import { queryKeys } from "@/api/queryKeys";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/i18n";
import GenreCreateDialog from "./components/GenreCreateDialog";
import GenreEditDialog from "./components/GenreEditDialog";
import GenreTreeItem from "./components/GenreTreeItem";
import { collectDescendantIds, countGenres, findGenreNode } from "./genreManagement.shared";

export default function GenreManagementPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [defaultParentId, setDefaultParentId] = useState("");
  const [editingGenreId, setEditingGenreId] = useState("");

  const genreTreeQuery = useQuery({
    queryKey: queryKeys.genres.all,
    queryFn: getGenreTree,
  });

  const genreTree = genreTreeQuery.data?.data ?? [];
  const parentOptions = useMemo(() => flattenGenreTreeOptions(genreTree), [genreTree]);
  const totalGenres = useMemo(() => countGenres(genreTree), [genreTree]);
  const editingGenre = useMemo(
    () => (editingGenreId ? findGenreNode(genreTree, editingGenreId) : null),
    [editingGenreId, genreTree],
  );
  const blockedParentIds = useMemo(
    () => editingGenre ? new Set([editingGenre.id, ...collectDescendantIds(editingGenre)]) : new Set<string>(),
    [editingGenre],
  );

  const deleteMutation = useMutation({
    mutationFn: (genreId: string) => deleteGenre(genreId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.genres.all });
      toast.success(t("genres.toast.deleted"));
    },
  });

  const handleCreateRoot = () => {
    setDefaultParentId("");
    setCreateDialogOpen(true);
  };

  const handleCreateChild = (parentId: string) => {
    setDefaultParentId(parentId);
    setCreateDialogOpen(true);
  };

  const handleDelete = (genre: GenreTreeNode) => {
    const descendantCount = collectDescendantIds(genre).length;
    const message = descendantCount > 0
      ? t("genres.confirm.deleteWithDescendants", { name: genre.name, count: descendantCount })
      : t("genres.confirm.deleteSingle", { name: genre.name });
    const confirmed = window.confirm(message);
    if (!confirmed) {
      return;
    }
    deleteMutation.mutate(genre.id);
  };

  return (
    <div className="space-y-4">
      <GenreCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        parentOptions={parentOptions}
        defaultParentId={defaultParentId}
      />

      <GenreEditDialog
        open={Boolean(editingGenre)}
        genre={editingGenre}
        onOpenChange={(open) => {
          if (!open) {
            setEditingGenreId("");
          }
        }}
        parentOptions={parentOptions}
        blockedParentIds={blockedParentIds}
      />

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>{t("genres.page.title")}</CardTitle>
            <CardDescription>
              {t("genres.page.description")}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-sm text-muted-foreground">{t("genres.page.totalCount", { count: totalGenres })}</div>
            <Button type="button" onClick={handleCreateRoot}>
              {t("genres.page.createRoot")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {genreTreeQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">{t("genres.page.loadingTree")}</div>
          ) : null}

          {!genreTreeQuery.isLoading && genreTree.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center">
              <div className="text-sm font-medium text-foreground">{t("genres.page.emptyTitle")}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {t("genres.page.emptyDescription")}
              </div>
              <div className="mt-4">
                <Button type="button" onClick={handleCreateRoot}>
                  {t("genres.page.startCreating")}
                </Button>
              </div>
            </div>
          ) : null}

          {genreTree.map((node) => (
            <GenreTreeItem
              key={node.id}
              node={node}
              onCreateChild={handleCreateChild}
              onEdit={setEditingGenreId}
              onDelete={handleDelete}
              deletingId={deleteMutation.isPending ? deleteMutation.variables : undefined}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
