import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteGenre, flattenGenreTreeOptions, getGenreTree, type GenreTreeNode } from "@/api/genre";
import { queryKeys } from "@/api/queryKeys";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import GenreCreateDialog from "./components/GenreCreateDialog";
import GenreEditDialog from "./components/GenreEditDialog";
import GenreTreeItem from "./components/GenreTreeItem";
import { collectDescendantIds, countGenres, findGenreNode } from "./genreManagement.shared";

export default function GenreManagementPage() {
  const queryClient = useQueryClient();
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
      toast.success("Đã xóa nền tảng thể loại.");
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
      ? `Xác nhận xóa nền tảng thể loại「${genre.name}」? Thao tác này sẽ đồng thời xóa ${descendantCount} phân loại con bên dưới và không thể hoàn tác.`
      : `Xác nhận xóa nền tảng thể loại「${genre.name}」? Thao tác này không thể hoàn tác.`;
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
            <CardTitle>Thư viện nền tảng thể loại</CardTitle>
            <CardDescription>
              Duy trì nền tảng thể loại cho tác phẩm theo cấu trúc cây, ví dụ: tu tiên, huyền huyễn, đô thị, lịch sử giả tưởng. Nó trả lời câu hỏi "Đây là loại sách gì" và sẽ được dùng làm tài sản thể loại chính thức cho dự án tiểu thuyết, chứ không phải là trường nhập liệu tạm thời.
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-sm text-muted-foreground">Số nền tảng thể loại hiện tại: {totalGenres}</div>
            <Button type="button" onClick={handleCreateRoot}>
              Tạo cây nền tảng thể loại mới
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {genreTreeQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Đang tải cây nền tảng thể loại...</div>
          ) : null}

          {!genreTreeQuery.isLoading && genreTree.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center">
              <div className="text-sm font-medium text-foreground">Chưa có nền tảng thể loại nào</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Bạn có thể tự tạo một nền tảng gốc, hoặc dùng AI để tạo toàn bộ hệ thống phân cấp.
              </div>
              <div className="mt-4">
                <Button type="button" onClick={handleCreateRoot}>
                  Bắt đầu tạo
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
