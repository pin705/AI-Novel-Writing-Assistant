import type { KnowledgeDocumentDetail, KnowledgeRecallTestResult } from "@ai-novel/shared/types/knowledge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatStatus } from "./knowledgeRagUi";

interface KnowledgeDocumentDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document?: KnowledgeDocumentDetail;
  selectedDocumentId: string;
  versionBusy: boolean;
  onUploadVersionFile: (file: File) => Promise<void>;
  onReindex: () => void;
  recallQuery: string;
  onRecallQueryChange: (value: string) => void;
  onRecallTest: () => void;
  recallPending: boolean;
  recallErrorMessage?: string | null;
  recallResult: KnowledgeRecallTestResult | null;
  onActivateVersion: (versionId: string) => void;
  activateVersionPending: boolean;
}

export default function KnowledgeDocumentDetailDialog({
  open,
  onOpenChange,
  document,
  selectedDocumentId,
  versionBusy,
  onUploadVersionFile,
  onReindex,
  recallQuery,
  onRecallQueryChange,
  onRecallTest,
  recallPending,
  recallErrorMessage,
  recallResult,
  onActivateVersion,
  activateVersionPending,
}: KnowledgeDocumentDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-4xl flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>{document?.title ?? "Chi tiết tài liệu tri thức"}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="flex flex-wrap gap-2">
            <input
              type="file"
              accept=".txt,text/plain"
              className="rounded-md border bg-background p-2 text-sm"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) {
                  return;
                }
                void onUploadVersionFile(file);
              }}
              disabled={versionBusy}
            />
            {selectedDocumentId ? (
              <Button variant="outline" onClick={onReindex}>
                Tạo lại chỉ mục thủ công
              </Button>
            ) : null}
          </div>

          {document ? (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline">Trạng thái tài liệu: {formatStatus(document.status)}</Badge>
                <Badge variant="outline">Trạng thái chỉ mục: {formatStatus(document.latestIndexStatus ?? "-")}</Badge>
              </div>
              {document.latestIndexStatus === "failed" && document.latestIndexError ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  Lý do tạo chỉ mục thất bại: {document.latestIndexError}
                </div>
              ) : null}

              <Card>
                <CardHeader>
                  <CardTitle>Kiểm tra truy hồi</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {document.latestIndexStatus === "succeeded" ? (
                    <>
                      <div className="flex min-w-0 flex-col gap-2 md:flex-row">
                        <Input
                          value={recallQuery}
                          onChange={(event) => onRecallQueryChange(event.target.value)}
                          placeholder="Nhập một câu hỏi hoặc đoạn trích để kiểm tra khả năng truy hồi của phiên bản đang kích hoạt"
                        />
                        <Button
                          onClick={onRecallTest}
                          disabled={recallPending || !selectedDocumentId || !recallQuery.trim()}
                        >
                          {recallPending ? "Đang kiểm tra..." : "Bắt đầu kiểm tra"}
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Chỉ kiểm tra truy hồi trên phiên bản đang kích hoạt và đã được tạo chỉ mục.
                      </div>
                      {recallErrorMessage ? (
                        <div className="text-sm text-destructive">{recallErrorMessage}</div>
                      ) : null}
                      {recallResult ? (
                        <div className="min-w-0 space-y-2 overflow-hidden">
                          {recallResult.hits.length === 0 ? (
                            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                              Truy vấn hiện tại chưa gọi về được đoạn nội dung nào.
                            </div>
                          ) : (
                            recallResult.hits.map((hit, index) => (
                              <div key={hit.id} className="min-w-0 max-w-full overflow-hidden rounded-md border p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="min-w-0 break-all font-medium">
                                    Khớp {index + 1} | {hit.source === "vector" ? "vector" : "từ khóa"} | Đoạn #{hit.chunkOrder + 1}
                                  </div>
                                  <Badge variant="outline">Điểm {hit.score.toFixed(4)}</Badge>
                                </div>
                                {hit.title ? (
                                  <div className="mt-1 break-all text-xs text-muted-foreground">{hit.title}</div>
                                ) : null}
                                <pre className="mt-3 max-h-52 w-full max-w-full overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-all rounded-md bg-muted/40 p-3 text-xs">
                                  {hit.chunkText}
                                </pre>
                              </div>
                            ))
                          )}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Chỉ khi phiên bản đang kích hoạt tạo chỉ mục thành công thì mới kiểm tra truy hồi được.
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="min-w-0 space-y-3">
                {document.versions.map((version) => (
                  <div key={version.id} className="min-w-0 max-w-full overflow-hidden rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium">Phiên bản v{version.versionNumber}</div>
                      {version.isActive ? <Badge>Đang kích hoạt</Badge> : null}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Số ký tự {version.charCount} | {new Date(version.createdAt).toLocaleString()}
                    </div>
                    {!version.isActive ? (
                      <div className="mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onActivateVersion(version.id)}
                          disabled={activateVersionPending}
                        >
                          Chuyển thành phiên bản kích hoạt
                        </Button>
                      </div>
                    ) : null}
                    <pre className="mt-3 max-h-64 w-full max-w-full overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-all rounded-md bg-muted/40 p-3 text-xs">
                      {version.content}
                    </pre>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Đang tải chi tiết tài liệu...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
