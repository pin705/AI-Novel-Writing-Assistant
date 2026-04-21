import { useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { EmbeddingProvider, RagEmbeddingModelStatus, RagProviderStatus } from "@/api/settings";
import SearchableSelect from "@/components/common/SearchableSelect";

export interface KnowledgeEmbeddingSettingsFormState {
  embeddingProvider: EmbeddingProvider;
  embeddingModel: string;
  collectionVersion: number;
  collectionMode: "auto" | "manual";
  collectionName: string;
  collectionTag: string;
  autoReindexOnChange: boolean;
  embeddingBatchSize: number;
  embeddingTimeoutMs: number;
  embeddingMaxRetries: number;
  embeddingRetryBaseMs: number;
}

interface KnowledgeEmbeddingSettingsCardProps {
  form: KnowledgeEmbeddingSettingsFormState;
  setForm: Dispatch<SetStateAction<KnowledgeEmbeddingSettingsFormState>>;
  providers: RagProviderStatus[];
  modelOptions: string[];
  modelQuery: {
    isLoading: boolean;
    data?: RagEmbeddingModelStatus;
  };
  isSaving: boolean;
  onSave: () => void;
}

function slugifySegment(value: string, fallback: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || fallback;
}

function buildSuggestedCollectionName(form: KnowledgeEmbeddingSettingsFormState): string {
  const parts = [
    "ai",
    "novel",
    "rag",
    form.embeddingProvider,
    slugifySegment(form.embeddingModel, "embedding"),
    slugifySegment(form.collectionTag, "kb"),
    `v${form.collectionVersion}`,
  ];
  return parts.join("_").slice(0, 120);
}

export default function KnowledgeEmbeddingSettingsCard({
  form,
  setForm,
  providers,
  modelOptions,
  modelQuery,
  isSaving,
  onSave,
}: KnowledgeEmbeddingSettingsCardProps) {
  const suggestedCollectionName = useMemo(() => buildSuggestedCollectionName(form), [form]);
  const currentProvider = providers.find((item) => item.provider === form.embeddingProvider);
  const collectionNameToDisplay = form.collectionMode === "auto"
    ? suggestedCollectionName
    : form.collectionName.trim();

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Cấu hình Embedding</CardTitle>
          <Badge variant="outline">Phiên bản collection v{form.collectionVersion}</Badge>
          {currentProvider ? <Badge variant="outline">{currentProvider.name}</Badge> : null}
          {modelQuery.data ? (
            <Badge variant="outline">
              {modelQuery.data.source === "remote" ? "Mô hình từ nhà cung cấp" : "Mô hình tích hợp"}
            </Badge>
          ) : null}
        </div>
        <div className="text-sm text-muted-foreground">
          Khi đổi Provider hoặc Model, hệ thống có thể tự tạo tên collection Qdrant mới để tránh xung đột kích thước vector; bạn cũng có thể tự chỉ định tên collection và chiến lược tái tạo.
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-sm font-medium">Embedding Provider</div>
            <select
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={form.embeddingProvider}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  embeddingProvider: event.target.value as EmbeddingProvider,
                  embeddingModel: "",
                }))}
            >
              {providers.map((item) => (
                <option key={item.provider} value={item.provider}>
                  {item.name}
                </option>
              ))}
            </select>
            {currentProvider ? (
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant={currentProvider.isConfigured ? "default" : "outline"}>
                  {currentProvider.isConfigured ? "Đã cấu hình API Key" : "Chưa cấu hình API Key"}
                </Badge>
                <Badge variant={currentProvider.isActive ? "default" : "outline"}>
                  {currentProvider.isActive ? "Đang bật" : "Chưa bật"}
                </Badge>
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Embedding Model</div>
            {modelQuery.isLoading ? (
              <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                Đang lấy danh sách mô hình Embedding của nhà cung cấp này...
              </div>
            ) : modelOptions.length > 0 ? (
              <SearchableSelect
                value={form.embeddingModel}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, embeddingModel: value }))}
                options={modelOptions.map((model) => ({ value: model }))}
                placeholder="Chọn mô hình Embedding"
                searchPlaceholder="Tìm mô hình Embedding"
                emptyText="Không có mô hình Embedding nào khớp"
              />
            ) : null}
            <Input
              className={modelQuery.isLoading || modelOptions.length > 0 ? "hidden" : undefined}
              value={form.embeddingModel}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, embeddingModel: event.target.value }))}
              placeholder="Ví dụ: text-embedding-3-small"
            />
            {modelQuery.data ? (
              <div className="text-xs text-muted-foreground">
                {modelQuery.data.source === "remote"
                  ? `Đã lấy ${modelQuery.data.models.length} mô hình Embedding của nhà cung cấp này.`
                  : "Hiện đang hiển thị danh sách mô hình Embedding tích hợp; sau khi cấu hình và bật API Key, hệ thống sẽ tự tải mô hình của nhà cung cấp."}
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-sm font-medium">Chế độ đặt tên collection</div>
            <select
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={form.collectionMode}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  collectionMode: event.target.value as "auto" | "manual",
                }))}
            >
              <option value="auto">Tự động tạo</option>
              <option value="manual">Tự chỉ định</option>
            </select>
            <div className="text-xs text-muted-foreground">
              Chế độ tự động sẽ dựa vào Provider, Model, mã collection và số phiên bản để sinh tên collection mới; chế độ thủ công phù hợp nếu bạn muốn tự giữ một collection cố định.
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Mã collection</div>
            <Input
              value={form.collectionTag}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, collectionTag: event.target.value }))}
              placeholder="Ví dụ: kb / prod / novel"
            />
            <div className="text-xs text-muted-foreground">
              Sẽ được dùng khi tự tạo tên collection, nên đặt để phân biệt môi trường, mục đích hoặc nhóm dữ liệu.
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">
            {form.collectionMode === "auto" ? "Tên collection tự động" : "Tên collection Qdrant"}
          </div>
          {form.collectionMode === "auto" ? (
            <div className="rounded-md border border-dashed bg-muted/20 p-3 font-mono text-xs break-all">
              {collectionNameToDisplay}
            </div>
          ) : (
            <Input
              value={form.collectionName}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, collectionName: event.target.value }))}
              placeholder="Ví dụ: ai_novel_rag_openai_text_embedding_3_small_kb_v1"
            />
          )}
          <div className="text-xs text-muted-foreground">
            {form.collectionMode === "auto"
              ? "Sau khi lưu, cấu hình Embedding hiện tại sẽ được gắn với tên collection này; nếu kích thước vector đổi, hệ thống sẽ tự chuyển sang collection mới."
              : "Ở chế độ thủ công, bạn cần tự đảm bảo tên collection khớp với kích thước vector của mô hình hiện tại."}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-sm font-medium">Tự tái tạo chỉ mục khi đổi mô hình</div>
            <select
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={form.autoReindexOnChange ? "true" : "false"}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  autoReindexOnChange: event.target.value === "true",
                }))}
            >
              <option value="true">Bật</option>
              <option value="false">Tắt</option>
            </select>
            <div className="text-xs text-muted-foreground">
              Khi bật, mỗi lần đổi Provider, Model hoặc tên collection, hệ thống sẽ tự xếp hàng tái tạo toàn bộ chỉ mục.
            </div>
          </div>

          <div className="rounded-md border bg-muted/20 p-3">
            <div className="text-sm font-medium">Collection sẽ dùng</div>
            <div className="mt-2 font-mono text-xs break-all">{collectionNameToDisplay}</div>
            <div className="mt-2 text-xs text-muted-foreground">
              Nên đặt tên collection theo dạng “mô hình + mã nghiệp vụ + số phiên bản” để dễ di chuyển và quay lui.
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-medium">Tham số yêu cầu Embedding</div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm font-medium">Kích thước batch</div>
              <Input
                type="number"
                min={1}
                max={256}
                value={form.embeddingBatchSize}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    embeddingBatchSize: Number(event.target.value || prev.embeddingBatchSize),
                  }))}
              />
              <div className="text-xs text-muted-foreground">
                Số khối văn bản trong một lần gọi vector hóa; càng lớn càng nhanh, nhưng cũng dễ gặp timeout hoặc giới hạn tốc độ hơn.
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Thời gian chờ yêu cầu (ms)</div>
              <Input
                type="number"
                min={5000}
                max={300000}
                value={form.embeddingTimeoutMs}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    embeddingTimeoutMs: Number(event.target.value || prev.embeddingTimeoutMs),
                  }))}
              />
              <div className="text-xs text-muted-foreground">
                Thời gian chờ của request Embedding, có thể tăng lên nếu mạng chậm hoặc mô hình lớn.
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Số lần thử lại tối đa</div>
              <Input
                type="number"
                min={0}
                max={8}
                value={form.embeddingMaxRetries}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    embeddingMaxRetries: Number(event.target.value || prev.embeddingMaxRetries),
                  }))}
              />
              <div className="text-xs text-muted-foreground">
                Số lần hệ thống được phép tự thử lại khi request thất bại; đặt 0 thì chỉ thử một lần.
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Khoảng chờ cơ bản giữa các lần thử lại (ms)</div>
              <Input
                type="number"
                min={100}
                max={10000}
                value={form.embeddingRetryBaseMs}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    embeddingRetryBaseMs: Number(event.target.value || prev.embeddingRetryBaseMs),
                  }))}
              />
              <div className="text-xs text-muted-foreground">
                Thời gian chờ cơ bản trước mỗi lần thử lại, dùng để kiểm soát nhịp lùi khi gặp lỗi.
              </div>
            </div>
          </div>
        </div>

        <Button
          onClick={onSave}
          disabled={isSaving || modelQuery.isLoading || !form.embeddingModel.trim() || !collectionNameToDisplay.trim()}
        >
          {isSaving ? "Đang lưu..." : "Lưu cấu hình Embedding"}
        </Button>
      </CardContent>
    </Card>
  );
}
