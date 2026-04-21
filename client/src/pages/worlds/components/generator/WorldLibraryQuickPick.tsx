import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listWorldLibrary } from "@/api/world";
import { queryKeys } from "@/api/queryKeys";
import { Button } from "@/components/ui/button";

interface WorldLibraryQuickItem {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  worldType?: string | null;
  usageCount: number;
  sourceWorldId?: string | null;
}

interface WorldLibraryQuickPickProps {
  worldType?: string;
  existingOptionIds: string[];
  onAdd: (item: WorldLibraryQuickItem) => void;
}

export default function WorldLibraryQuickPick({
  worldType,
  existingOptionIds,
  onAdd,
}: WorldLibraryQuickPickProps) {
  const [keyword, setKeyword] = useState("");

  const params = useMemo(
    () => ({
      worldType: worldType?.trim() || undefined,
      keyword: keyword.trim() || undefined,
      limit: 12,
    }),
    [keyword, worldType],
  );

  const libraryQuery = useQuery({
    queryKey: queryKeys.worlds.library(JSON.stringify(params)),
    queryFn: () => listWorldLibrary(params),
    staleTime: 30_000,
  });

  const libraryItems = (libraryQuery.data?.data ?? []) as WorldLibraryQuickItem[];

  return (
    <div className="rounded-md border p-3 text-sm space-y-3">
      <div className="space-y-1">
        <div className="font-medium">Chèn thư viện vào từ sớm</div>
        <div className="text-xs text-muted-foreground">
          Bản V2 cũ cho phép chọn vật liệu từ thư viện ngay trước khi sinh chính thức. Ở đây mình giữ cách làm đó nhưng gắn vào cấu trúc bản thiết kế hiện tại.
        </div>
      </div>

      <input
        className="w-full rounded-md border p-2 text-sm"
        placeholder="Tìm mục trong thư viện, có thể lọc theo tên hoặc từ khóa"
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
      />

      <div className="space-y-2">
        {libraryQuery.isLoading ? (
          <div className="text-xs text-muted-foreground">Đang tải thư viện...</div>
        ) : null}
        {!libraryQuery.isLoading && libraryItems.length === 0 ? (
          <div className="text-xs text-muted-foreground">
            Hiện chưa có mục thư viện nào khớp.
          </div>
        ) : null}

        {libraryItems.map((item) => {
          const added = existingOptionIds.includes(item.id);
          return (
            <div key={item.id} className="flex flex-col gap-3 rounded-md border p-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{item.name}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {item.category}
                  </span>
                  {item.worldType ? (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                      {item.worldType}
                    </span>
                  ) : null}
                </div>
                <div className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {item.description?.trim() || "Chưa có mô tả"}
                </div>
                <div className="text-xs text-muted-foreground">
                  Số lần sử dụng: {item.usageCount}
                </div>
              </div>
              <Button
                type="button"
                variant={added ? "secondary" : "outline"}
                disabled={added}
                onClick={() => onAdd(item)}
              >
                {added ? "Đã thêm vào bản thiết kế" : "Thêm vào bản thiết kế"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
