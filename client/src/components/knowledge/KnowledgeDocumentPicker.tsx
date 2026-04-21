import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { KnowledgeDocumentStatus } from "@ai-novel/shared/types/knowledge";
import { listKnowledgeDocuments } from "@/api/knowledge";
import { queryKeys } from "@/api/queryKeys";
import { Input } from "@/components/ui/input";

interface KnowledgeDocumentPickerProps {
  selectedIds: string[] | null;
  onChange: (next: string[] | null) => void;
  title?: string;
  description?: string;
  allowAuto?: boolean;
  queryStatus?: KnowledgeDocumentStatus;
}

export default function KnowledgeDocumentPicker(props: KnowledgeDocumentPickerProps) {
  const [keyword, setKeyword] = useState("");

  const documentsQuery = useQuery({
    queryKey: queryKeys.knowledge.documents(props.queryStatus ?? "default"),
    queryFn: () => listKnowledgeDocuments(props.queryStatus ? { status: props.queryStatus } : undefined),
  });

  const visibleDocuments = useMemo(() => {
    const term = keyword.trim().toLowerCase();
    const documents = documentsQuery.data?.data ?? [];
    if (!term) {
      return documents;
    }
    return documents.filter((item) =>
      item.title.toLowerCase().includes(term) || item.fileName.toLowerCase().includes(term));
  }, [documentsQuery.data?.data, keyword]);

  const selectedIds = props.selectedIds ?? [];
  const isAuto = props.allowAuto && props.selectedIds === null;

  return (
    <div className="space-y-3 rounded-md border p-3">
      {props.title ? <div className="text-sm font-medium">{props.title}</div> : null}
      {props.description ? <div className="text-xs text-muted-foreground">{props.description}</div> : null}

      {props.allowAuto ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`rounded-md border px-3 py-1 text-sm ${isAuto ? "bg-accent" : ""}`}
            onClick={() => props.onChange(null)}
          >
            Tự động
          </button>
          <button
            type="button"
            className={`rounded-md border px-3 py-1 text-sm ${!isAuto ? "bg-accent" : ""}`}
            onClick={() => props.onChange(selectedIds)}
          >
            Tùy chỉnh
          </button>
        </div>
      ) : null}

      {isAuto ? (
        <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          Đang dùng quy tắc tự động: nếu thực thể có tài liệu ràng buộc thì ưu tiên dùng tài liệu đó, nếu không sẽ quay về toàn bộ tài liệu đang bật.
        </div>
      ) : (
        <>
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm tài liệu tri thức"
          />
          <div className="max-h-64 space-y-2 overflow-auto rounded-md border p-2">
            {documentsQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">Đang tải...</div>
            ) : null}
            {visibleDocuments.length === 0 && !documentsQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">Không có tài liệu nào để chọn.</div>
            ) : null}
            {visibleDocuments.map((item) => {
              const checked = selectedIds.includes(item.id);
              return (
                <label key={item.id} className="flex items-start gap-2 rounded-md border p-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      if (props.selectedIds === null && props.allowAuto) {
                        props.onChange(event.target.checked ? [item.id] : []);
                        return;
                      }
                      const nextIds = event.target.checked
                        ? [...selectedIds, item.id]
                        : selectedIds.filter((id) => id !== item.id);
                      props.onChange(nextIds);
                    }}
                  />
                  <div className="min-w-0">
                    <div className="font-medium">{item.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.fileName} | v{item.activeVersionNumber} | {item.latestIndexStatus}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
          <div className="text-xs text-muted-foreground">
            Đã chọn {selectedIds.length} tài liệu. Để trống nghĩa là tắt hẳn truy xuất tri thức.
          </div>
        </>
      )}
    </div>
  );
}
