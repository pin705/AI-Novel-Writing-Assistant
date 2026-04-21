import type { BookAnalysis, BookAnalysisStatus } from "@ai-novel/shared/types/bookAnalysis";
import type { KnowledgeDocumentDetail, KnowledgeDocumentSummary } from "@ai-novel/shared/types/knowledge";
import LLMSelector from "@/components/common/LLMSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { LLMConfigState } from "../bookAnalysis.types";
import { formatDate, formatStatus } from "../bookAnalysis.utils";

interface BookAnalysisSidebarProps {
  selectedDocumentId: string;
  selectedVersionId: string;
  keyword: string;
  status: BookAnalysisStatus | "";
  includeTimeline: boolean;
  llmConfig: LLMConfigState;
  documentOptions: KnowledgeDocumentSummary[];
  versionOptions: KnowledgeDocumentDetail["versions"];
  sourceDocument?: KnowledgeDocumentDetail;
  analyses: BookAnalysis[];
  selectedAnalysisId: string;
  createPending: boolean;
  onSelectDocument: (documentId: string) => void;
  onSelectVersion: (versionId: string) => void;
  onKeywordChange: (keyword: string) => void;
  onStatusChange: (status: BookAnalysisStatus | "") => void;
  onIncludeTimelineChange: (includeTimeline: boolean) => void;
  onLlmConfigChange: (config: LLMConfigState) => void;
  onCreate: () => void;
  onOpenAnalysis: (analysisId: string, documentId: string) => void;
}

export default function BookAnalysisSidebar(props: BookAnalysisSidebarProps) {
  const {
    selectedDocumentId,
    selectedVersionId,
    keyword,
    status,
    includeTimeline,
    llmConfig,
    documentOptions,
    versionOptions,
    sourceDocument,
    analyses,
    selectedAnalysisId,
    createPending,
    onSelectDocument,
    onSelectVersion,
    onKeywordChange,
    onStatusChange,
    onIncludeTimelineChange,
    onLlmConfigChange,
    onCreate,
    onOpenAnalysis,
  } = props;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Tạo phân tích sách</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">Tài liệu tri thức</div>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={selectedDocumentId}
              onChange={(event) => onSelectDocument(event.target.value)}
            >
              <option value="">Chọn tài liệu</option>
              {documentOptions.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Phiên bản tài liệu</div>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={selectedVersionId}
              onChange={(event) => onSelectVersion(event.target.value)}
              disabled={!selectedDocumentId}
            >
              <option value="">Dùng phiên bản đang kích hoạt</option>
              {versionOptions.map((version) => (
                <option key={version.id} value={version.id}>
                  v{version.versionNumber} {version.isActive ? " (hiện tại)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Mô hình</div>
            <LLMSelector
              value={llmConfig}
              onChange={(next) =>
                onLlmConfigChange({
                  provider: next.provider,
                  model: next.model,
                  temperature: next.temperature ?? llmConfig.temperature,
                  maxTokens: next.maxTokens ?? llmConfig.maxTokens,
                })
              }
              showParameters
            />
          </div>

          <label className="flex items-center gap-2 rounded-md border p-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={includeTimeline}
              onChange={(event) => onIncludeTimelineChange(event.target.checked)}
            />
            Tạo dòng thời gian câu chuyện (mặc định tắt)
          </label>

          <Button className="w-full" onClick={onCreate} disabled={!selectedDocumentId || createPending}>
            Tạo
          </Button>

          {sourceDocument ? (
            <div className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
              Số phiên bản: {sourceDocument.versions.length} | Phân tích sách: {sourceDocument.bookAnalysisCount}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách phân tích</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={keyword} onChange={(event) => onKeywordChange(event.target.value)} placeholder="Tìm theo tiêu đề hoặc từ khóa" />
          <select
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={status}
            onChange={(event) => onStatusChange(event.target.value as BookAnalysisStatus | "")}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="draft">Bản nháp</option>
            <option value="queued">Đang xếp hàng</option>
            <option value="running">Đang chạy</option>
            <option value="succeeded">Thành công</option>
            <option value="failed">Thất bại</option>
            <option value="archived">Đã lưu trữ</option>
          </select>

          <div className="space-y-2">
            {analyses.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`w-full rounded-md border p-3 text-left transition-colors ${
                  item.id === selectedAnalysisId ? "border-primary bg-primary/5" : "hover:bg-muted/30"
                }`}
                onClick={() => onOpenAnalysis(item.id, item.documentId)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{item.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {item.documentTitle} | v{item.documentVersionNumber}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {item.publishedDocumentId && (
                      <Badge variant="secondary" className="text-xs">Đã phát hành</Badge>
                    )}
                    <Badge variant="outline">{formatStatus(item.status)}</Badge>
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Tiến độ {Math.round(item.progress * 100)}% | Cập nhật lúc {formatDate(item.updatedAt)}
                </div>
                {item.lastError ? (
                  <div className="mt-2 line-clamp-2 text-xs text-destructive">{item.lastError}</div>
                ) : null}
              </button>
            ))}

            {analyses.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Chưa có phân tích sách nào, hãy chọn tài liệu tri thức rồi tạo mới.
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
