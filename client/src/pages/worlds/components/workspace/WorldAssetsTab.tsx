import type { Dispatch, SetStateAction } from "react";
import type { World, WorldSnapshot } from "@ai-novel/shared/types/world";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface WorldLibraryItem {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  worldType?: string | null;
  usageCount: number;
  sourceWorldId?: string | null;
}

interface WorldAssetsTabProps {
  worldId: string;
  world?: World;
  selectedLayerPrimaryField: "background" | "magicSystem" | "politics" | "cultures" | "history" | "conflicts";
  libraryKeyword: string;
  setLibraryKeyword: Dispatch<SetStateAction<string>>;
  libraryCategory: string;
  setLibraryCategory: Dispatch<SetStateAction<string>>;
  publishName: string;
  setPublishName: Dispatch<SetStateAction<string>>;
  publishCategory: string;
  setPublishCategory: Dispatch<SetStateAction<string>>;
  publishDescription: string;
  setPublishDescription: Dispatch<SetStateAction<string>>;
  snapshotLabel: string;
  setSnapshotLabel: Dispatch<SetStateAction<string>>;
  diffFrom: string;
  setDiffFrom: Dispatch<SetStateAction<string>>;
  diffTo: string;
  setDiffTo: Dispatch<SetStateAction<string>>;
  importFormat: "json" | "markdown" | "text";
  setImportFormat: Dispatch<SetStateAction<"json" | "markdown" | "text">>;
  importContent: string;
  setImportContent: Dispatch<SetStateAction<string>>;
  libraryItems: WorldLibraryItem[];
  snapshots: WorldSnapshot[];
  diffChanges: Array<{ field: string; before: string | null; after: string | null }>;
  createSnapshotPending: boolean;
  publishPending: boolean;
  importPending: boolean;
  onRefreshLibrary: () => void;
  onInjectLibraryField: (libraryId: string) => void;
  onInjectLibraryStructure: (libraryId: string, targetCollection: "forces" | "locations") => void;
  onPublishLibrary: () => void;
  onCreateSnapshot: () => void;
  onRestoreSnapshot: (snapshotId: string) => void;
  onDiffSnapshots: () => void;
  onExport: (format: "markdown" | "json") => Promise<void>;
  onImport: () => void;
}

export default function WorldAssetsTab(props: WorldAssetsTabProps) {
  const {
    selectedLayerPrimaryField,
    libraryKeyword,
    setLibraryKeyword,
    libraryCategory,
    setLibraryCategory,
    publishName,
    setPublishName,
    publishCategory,
    setPublishCategory,
    publishDescription,
    setPublishDescription,
    snapshotLabel,
    setSnapshotLabel,
    diffFrom,
    setDiffFrom,
    diffTo,
    setDiffTo,
    importFormat,
    setImportFormat,
    importContent,
    setImportContent,
    libraryItems,
    snapshots,
    diffChanges,
    createSnapshotPending,
    publishPending,
    importPending,
    onRefreshLibrary,
    onInjectLibraryField,
    onInjectLibraryStructure,
    onPublishLibrary,
    onCreateSnapshot,
    onRestoreSnapshot,
    onDiffSnapshots,
    onExport,
    onImport,
  } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kho tài nguyên + phiên bản snapshot + nhập xuất</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border p-3 space-y-2">
          <div className="font-medium">Kho tài nguyên</div>
          <div className="grid gap-2 md:grid-cols-3">
            <Input
              placeholder="Từ khóa"
              value={libraryKeyword}
              onChange={(event) => setLibraryKeyword(event.target.value)}
            />
            <select
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={libraryCategory}
              onChange={(event) => setLibraryCategory(event.target.value)}
            >
              <option value="all">Tất cả danh mục</option>
              <option value="terrain">Địa hình / địa mạo</option>
              <option value="race">Chủng tộc</option>
              <option value="power_system">Hệ thống sức mạnh</option>
              <option value="organization">Tổ chức thế lực</option>
              <option value="resource">Tài nguyên</option>
              <option value="event">Sự kiện</option>
              <option value="artifact">Đạo cụ / dị vật</option>
              <option value="custom">Tùy chỉnh</option>
            </select>
            <Button variant="outline" onClick={onRefreshLibrary}>
              Làm mới
            </Button>
          </div>
          <div className="rounded-md border p-2 space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">
              Đẩy thiết lập hiện tại lên kho tài nguyên
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              <Input
                placeholder="Tên tài nguyên"
                value={publishName}
                onChange={(event) => setPublishName(event.target.value)}
              />
              <select
                className="w-full rounded-md border bg-background p-2 text-sm"
                value={publishCategory}
                onChange={(event) => setPublishCategory(event.target.value)}
              >
                <option value="custom">Tùy chỉnh</option>
                <option value="terrain">Địa hình / địa mạo</option>
                <option value="race">Chủng tộc</option>
                <option value="power_system">Hệ thống sức mạnh</option>
                <option value="organization">Tổ chức thế lực</option>
                <option value="resource">Tài nguyên</option>
                <option value="event">Sự kiện</option>
                <option value="artifact">Đạo cụ / dị vật</option>
              </select>
              <Button onClick={onPublishLibrary} disabled={publishPending}>
                {publishPending ? "Đang đăng..." : "Đăng tài nguyên"}
              </Button>
            </div>
            <textarea
              className="min-h-[80px] w-full rounded-md border bg-background p-2 text-sm"
              value={publishDescription}
              onChange={(event) => setPublishDescription(event.target.value)}
              placeholder="Mô tả tùy chọn (để trống sẽ dùng nội dung phân lớp hiện tại)"
            />
          </div>
          {libraryItems.map((item) => (
            <div key={item.id} className="rounded border p-3 text-sm space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div>{item.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.category} / số lần dùng = {item.usageCount}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => onInjectLibraryField(item.id)}>
                  Nạp vào lớp hiện tại ({selectedLayerPrimaryField})
                </Button>
                <Button size="sm" variant="outline" onClick={() => onInjectLibraryStructure(item.id, "forces")}>
                  Nạp vào thế lực cấu trúc
                </Button>
                <Button size="sm" variant="outline" onClick={() => onInjectLibraryStructure(item.id, "locations")}>
                  Nạp vào địa điểm cấu trúc
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-md border p-3 space-y-2">
          <div className="font-medium">Phiên bản snapshot</div>
          <div className="flex gap-2">
            <Input
              placeholder="Nhãn snapshot (không bắt buộc)"
              value={snapshotLabel}
              onChange={(event) => setSnapshotLabel(event.target.value)}
            />
            <Button onClick={onCreateSnapshot} disabled={createSnapshotPending}>
              Tạo snapshot
            </Button>
          </div>
          {snapshots.map((snapshot) => (
            <div key={snapshot.id} className="flex items-center justify-between rounded border p-2 text-sm">
              <div>
                {snapshot.label ?? snapshot.id.slice(0, 8)} / {new Date(snapshot.createdAt).toLocaleString()}
              </div>
              <Button size="sm" variant="outline" onClick={() => onRestoreSnapshot(snapshot.id)}>
                Khôi phục
              </Button>
            </div>
          ))}
          <div className="grid gap-2 md:grid-cols-3">
            <select
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={diffFrom}
              onChange={(event) => setDiffFrom(event.target.value)}
            >
              <option value="">Snapshot bắt đầu</option>
              {snapshots.map((snapshot) => (
                <option key={`from-${snapshot.id}`} value={snapshot.id}>
                  {snapshot.label ?? snapshot.id.slice(0, 8)}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={diffTo}
              onChange={(event) => setDiffTo(event.target.value)}
            >
              <option value="">Snapshot mục tiêu</option>
              {snapshots.map((snapshot) => (
                <option key={`to-${snapshot.id}`} value={snapshot.id}>
                  {snapshot.label ?? snapshot.id.slice(0, 8)}
                </option>
              ))}
            </select>
            <Button onClick={onDiffSnapshots} disabled={!diffFrom || !diffTo}>
              So sánh khác biệt
            </Button>
          </div>
          {diffChanges.map((change) => (
            <div key={change.field} className="rounded border p-2 text-xs">
                {change.field}: {change.before ?? "Trống"} {"->"} {change.after ?? "Trống"}
            </div>
          ))}
        </div>

        <div className="rounded-md border p-3 space-y-2">
          <div className="font-medium">Xuất dữ liệu</div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void onExport("markdown")}>
              Xuất Markdown (sao chép vào clipboard)
            </Button>
            <Button variant="secondary" onClick={() => void onExport("json")}>
              Xuất JSON (sao chép vào clipboard)
            </Button>
          </div>
        </div>

        <div className="rounded-md border p-3 space-y-2">
          <div className="font-medium">Nhập dữ liệu</div>
          <select
            className="w-full rounded-md border bg-background p-2 text-sm"
            value={importFormat}
            onChange={(event) => setImportFormat(event.target.value as "json" | "markdown" | "text")}
          >
            <option value="text">Văn bản thuần</option>
            <option value="markdown">Markdown</option>
            <option value="json">JSON</option>
          </select>
          <textarea
            className="min-h-[160px] w-full rounded-md border bg-background p-2 text-sm"
            value={importContent}
            onChange={(event) => setImportContent(event.target.value)}
            placeholder="Dán nội dung cần nhập vào đây"
          />
          <Button onClick={onImport} disabled={importPending || !importContent.trim()}>
            {importPending ? "Đang nhập..." : "Nhập thành thế giới mới"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
