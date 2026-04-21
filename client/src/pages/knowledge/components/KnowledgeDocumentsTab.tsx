import { Link } from "react-router-dom";
import type { KnowledgeDocumentStatus, KnowledgeDocumentSummary } from "@ai-novel/shared/types/knowledge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import OpenInCreativeHubButton from "@/components/creativeHub/OpenInCreativeHubButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { RagJobSummary } from "@/api/knowledge";
import {
  formatRagJobMeta,
  formatStatus,
  getRagJobProgressPercent,
  getRagJobProgressWidth,
} from "./knowledgeRagUi";

interface KnowledgeDocumentsTabProps {
  uploadTitle: string;
  onUploadTitleChange: (value: string) => void;
  uploadBusy: boolean;
  onUploadFile: (file: File) => Promise<void>;
  keyword: string;
  onKeywordChange: (value: string) => void;
  status: KnowledgeDocumentStatus | "";
  onStatusChange: (value: KnowledgeDocumentStatus | "") => void;
  documents: KnowledgeDocumentSummary[];
  latestKnowledgeDocumentJobs: Map<string, RagJobSummary>;
  onSelectDocument: (id: string) => void;
  onReindexDocument: (id: string) => void;
  onUpdateStatus: (id: string, status: KnowledgeDocumentStatus) => void;
}

export default function KnowledgeDocumentsTab({
  uploadTitle,
  onUploadTitleChange,
  uploadBusy,
  onUploadFile,
  keyword,
  onKeywordChange,
  status,
  onStatusChange,
  documents,
  latestKnowledgeDocumentJobs,
  onSelectDocument,
  onReindexDocument,
  onUpdateStatus,
}: KnowledgeDocumentsTabProps) {
  const renderDocumentRow = (document: KnowledgeDocumentSummary) => {
    const documentJob = latestKnowledgeDocumentJobs.get(document.id);
    const displayIndexStatus = documentJob && (documentJob.status === "queued" || documentJob.status === "running")
      ? documentJob.status
      : document.latestIndexStatus;

    return (
      <div key={document.id} className="rounded-md border p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="font-medium">{document.title}</div>
            <div className="text-xs text-muted-foreground">
              {document.fileName} | Số phiên bản {document.versionCount} | Đang dùng v{document.activeVersionNumber}
            </div>
            <div className="text-xs text-muted-foreground">Phân tích sách {document.bookAnalysisCount}</div>
            {documentJob?.progress && (documentJob.status === "queued" || documentJob.status === "running") ? (
              <div className="mt-2 rounded-md border border-dashed p-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-medium">{documentJob.progress.label}</span>
                  <span>{getRagJobProgressPercent(documentJob)}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: getRagJobProgressWidth(documentJob) }}
                  />
                </div>
                {documentJob.progress.detail ? (
                  <div className="mt-2 text-xs text-muted-foreground">{documentJob.progress.detail}</div>
                ) : null}
                <div className="mt-1 text-xs text-muted-foreground">{formatRagJobMeta(documentJob)}</div>
              </div>
            ) : null}
            {document.latestIndexStatus === "failed" && document.latestIndexError ? (
              <div className="text-xs text-destructive">Lý do thất bại: {document.latestIndexError}</div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{formatStatus(document.status)}</Badge>
            <Badge variant="outline">{formatStatus(displayIndexStatus)}</Badge>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => onSelectDocument(document.id)}>
            Xem phiên bản
          </Button>
          <OpenInCreativeHubButton
            bindings={{ knowledgeDocumentIds: [document.id] }}
            label="Tiếp tục trong Trung tâm Sáng tạo"
          />
          <Button asChild size="sm" variant="outline">
            <Link to={`/book-analysis?documentId=${document.id}`}>Tạo phân tích sách mới</Link>
          </Button>
          <Button size="sm" variant="outline" onClick={() => onReindexDocument(document.id)}>
            Tạo lại chỉ mục
          </Button>
          {document.status === "enabled" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpdateStatus(document.id, "disabled")}
            >
              Tắt
            </Button>
          ) : document.status === "disabled" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpdateStatus(document.id, "enabled")}
            >
              Bật
            </Button>
          ) : null}
          {document.status !== "archived" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpdateStatus(document.id, "archived")}
            >
              Lưu trữ
            </Button>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Tải tài liệu lên</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={uploadTitle}
            onChange={(event) => onUploadTitleChange(event.target.value)}
            placeholder="Tiêu đề tùy chọn, để trống sẽ dùng tên file"
          />
          <input
            type="file"
            accept=".txt,text/plain"
            className="w-full rounded-md border bg-background p-2 text-sm"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) {
                return;
              }
              void onUploadFile(file);
            }}
            disabled={uploadBusy}
          />
          <div className="text-xs text-muted-foreground">
            Chỉ hỗ trợ `.txt`, phía client sẽ đọc văn bản rồi gửi JSON. Nếu tải lên trùng tiêu đề, hệ thống sẽ tự thêm phiên bản mới và chuyển sang phiên bản kích hoạt.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách tài liệu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-[1fr_180px]">
            <Input
              value={keyword}
              onChange={(event) => onKeywordChange(event.target.value)}
              placeholder="Tìm theo tiêu đề hoặc tên file"
            />
            <select
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={status}
              onChange={(event) => onStatusChange(event.target.value as KnowledgeDocumentStatus | "")}
            >
              <option value="">Tất cả chưa lưu trữ</option>
              <option value="enabled">Chỉ bật</option>
              <option value="disabled">Chỉ tắt</option>
              <option value="archived">Chỉ lưu trữ</option>
            </select>
          </div>
          <div className="space-y-3">
            {documents.map(renderDocumentRow)}
            {documents.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                Hiện chưa có tài liệu tri thức nào khớp điều kiện.
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
