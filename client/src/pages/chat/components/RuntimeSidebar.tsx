import { useEffect, useState } from "react";
import type { AgentStep } from "@ai-novel/shared/types/agent";
import KnowledgeDocumentPicker from "@/components/knowledge/KnowledgeDocumentPicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ChatMode = "standard" | "agent";
type ContextMode = "global" | "novel";
type ApprovalCard = {
  approvalId: string;
  targetType: string;
  targetId: string;
  summary: string;
};
type ApprovalHistoryItem = {
  id: string;
  status: string;
  targetType: string;
  targetId: string;
  decisionNote?: string | null;
};
type NovelOption = {
  id: string;
  title: string;
};
type TraceItem = {
  key: string;
  text: string;
  step?: AgentStep;
};
type PanelTab = "console" | "trace";

interface RuntimeSidebarProps {
  chatMode: ChatMode;
  onChatModeChange: (mode: ChatMode) => void;
  contextMode: ContextMode;
  onContextModeChange: (mode: ContextMode) => void;
  runHistoryIds: string[];
  currentRunId: string;
  onSelectRun: (runId: string) => void;
  novelId: string;
  novels: NovelOption[];
  onNovelChange: (novelId: string) => void;
  provider: string;
  model: string;
  temperature: number;
  onTemperatureChange: (value: number) => void;
  maxTokens?: number;
  onMaxTokensChange: (value?: number) => void;
  enableRag: boolean;
  onEnableRagChange: (value: boolean) => void;
  systemPrompt: string;
  onSystemPromptChange: (value: string) => void;
  knowledgeDocumentIds: string[] | null;
  onKnowledgeDocumentIdsChange: (ids: string[] | null) => void;
  approvalCards: ApprovalCard[];
  approvalHistory: ApprovalHistoryItem[];
  approvalNote: string;
  onApprovalNoteChange: (value: string) => void;
  onSubmitApproval: (action: "approve" | "reject") => void;
  isStreaming: boolean;
  persistedSteps: AgentStep[];
  replayableSteps: AgentStep[];
  effectiveReplayStepId: string;
  onReplayStepChange: (value: string) => void;
  onReplay: (mode: "continue" | "dry_run") => void;
  traceItems: TraceItem[];
  hasLiveEvents: boolean;
  safePreview: (json: string | null | undefined) => string;
  stepTitle: (step: AgentStep) => string;
}

function stepStatusTone(status: string): string {
  if (status === "succeeded") return "border-emerald-200 bg-emerald-50";
  if (status === "failed") return "border-red-200 bg-red-50";
  if (status === "pending") return "border-amber-200 bg-amber-50";
  if (status === "running") return "border-blue-200 bg-blue-50";
  return "border-slate-200 bg-slate-50";
}

export default function RuntimeSidebar({
  chatMode,
  onChatModeChange,
  contextMode,
  onContextModeChange,
  runHistoryIds,
  currentRunId,
  onSelectRun,
  novelId,
  novels,
  onNovelChange,
  provider,
  model,
  temperature,
  onTemperatureChange,
  maxTokens,
  onMaxTokensChange,
  enableRag,
  onEnableRagChange,
  systemPrompt,
  onSystemPromptChange,
  knowledgeDocumentIds,
  onKnowledgeDocumentIdsChange,
  approvalCards,
  approvalHistory,
  approvalNote,
  onApprovalNoteChange,
  onSubmitApproval,
  isStreaming,
  persistedSteps,
  replayableSteps,
  effectiveReplayStepId,
  onReplayStepChange,
  onReplay,
  traceItems,
  hasLiveEvents,
  safePreview,
  stepTitle,
}: RuntimeSidebarProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>("console");

  useEffect(() => {
    if (approvalCards.length > 0) {
      setActiveTab("console");
    }
  }, [approvalCards.length]);

  return (
    <Card className="sticky top-4 flex h-[calc(100vh-8rem)] flex-col border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-200 pb-3">
        <CardTitle className="text-base">Bảng điều khiển run</CardTitle>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 overflow-y-auto p-3 text-sm">
        <div className="flex rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition ${
              activeTab === "console" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
            onClick={() => setActiveTab("console")}
          >
            Console
            {approvalCards.length > 0 ? ` · ${approvalCards.length}` : ""}
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition ${
              activeTab === "trace" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
            onClick={() => setActiveTab("trace")}
          >
            Dấu vết
          </button>
        </div>

        {activeTab === "console" ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-2 text-xs font-medium tracking-wide text-slate-500">Ngữ cảnh hội thoại</div>
              <div className="grid gap-2">
                <div className="grid gap-1">
                  <label className="text-[11px] text-slate-500">Chế độ hội thoại</label>
                  <select
                    className="w-full rounded-lg border border-slate-300 bg-white p-2"
                    value={chatMode}
                    onChange={(event) => onChatModeChange(event.target.value as ChatMode)}
                  >
                    <option value="standard">Chế độ chuẩn</option>
                    <option value="agent">Tác nhân thông minh</option>
                  </select>
                </div>
                <div className="grid gap-1">
                  <label className="text-[11px] text-slate-500">Chế độ ngữ cảnh</label>
                  <select
                    className="w-full rounded-lg border border-slate-300 bg-white p-2"
                    value={contextMode}
                    onChange={(event) => onContextModeChange(event.target.value as ContextMode)}
                  >
                    <option value="global">Toàn cục</option>
                    <option value="novel">Tiểu thuyết</option>
                  </select>
                </div>
                {runHistoryIds.length > 0 ? (
                  <div className="grid gap-1">
                    <label className="text-[11px] text-slate-500">Run hội thoại</label>
                    <select
                      className="w-full rounded-lg border border-slate-300 bg-white p-2"
                      value={currentRunId}
                      onChange={(event) => onSelectRun(event.target.value)}
                    >
                      {runHistoryIds.map((id) => (
                        <option key={id} value={id}>
                          {id.slice(0, 16)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                {contextMode === "novel" ? (
                  <div className="grid gap-1">
                    <label className="text-[11px] text-slate-500">Tiểu thuyết</label>
                    <select
                      className="w-full rounded-lg border border-slate-300 bg-white p-2"
                      value={novelId}
                      onChange={(event) => onNovelChange(event.target.value)}
                    >
                      <option value="">Chọn tiểu thuyết</option>
                      {novels.map((novel) => (
                        <option key={novel.id} value={novel.id}>
                          {novel.title}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-medium tracking-wide text-slate-500">Phê duyệt</div>
                {approvalCards.length > 0 ? (
                  <div className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                    {approvalCards.length} mục chờ xử lý
                  </div>
                ) : null}
              </div>

              {approvalCards.length > 0 ? (
                <div className="space-y-3">
                  {approvalCards.map((item, index) => (
                    <div key={item.approvalId} className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                      <div className="text-sm font-semibold text-slate-900">Mục phê duyệt {index + 1}</div>
                      <div className="mt-1 text-xs text-slate-500">{item.targetType}:{item.targetId}</div>
                      <div className="mt-2 rounded-lg bg-white p-2 text-sm text-slate-800">{item.summary}</div>
                    </div>
                  ))}
                  <textarea
                    className="min-h-[88px] w-full rounded-lg border border-slate-300 bg-slate-50 p-2"
                    value={approvalNote}
                    onChange={(event) => onApprovalNoteChange(event.target.value)}
                    placeholder="Ghi chú phê duyệt (không bắt buộc)"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={() => onSubmitApproval("approve")} disabled={isStreaming}>
                      Đồng ý và tiếp tục
                    </Button>
                    <Button size="sm" variant="destructive" className="flex-1" onClick={() => onSubmitApproval("reject")} disabled={isStreaming}>
                      Từ chối
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  Hiện không có phê duyệt nào đang chờ xử lý.
                </div>
              )}

              {approvalHistory.length > 0 ? (
                <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-2">
                  <summary className="cursor-pointer px-1 py-1 text-xs font-medium text-slate-700">
                    Lịch sử phê duyệt
                  </summary>
                  <div className="mt-2 space-y-2">
                    {approvalHistory.map((item) => (
                      <div key={item.id} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs">
                        <div className="font-medium text-slate-800">{item.status} · {item.targetType}:{item.targetId}</div>
                        {item.decisionNote ? <div className="mt-1 text-slate-600">{item.decisionNote}</div> : null}
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}
            </div>

            <details className="rounded-xl border border-slate-200 bg-white">
              <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-700">
                Cấu hình run
              </summary>
              <div className="space-y-3 border-t border-slate-200 p-3">
                <div>
                  <div className="mb-2 text-xs font-medium tracking-wide text-slate-500">Mô hình</div>
                  <div className="space-y-2">
                    <div className="rounded-lg bg-slate-50 px-2 py-1.5 text-xs">
                      <span className="text-slate-500">Nhà cung cấp: </span>
                      <span className="font-medium text-slate-800">{provider}</span>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-2 py-1.5 text-xs">
                      <span className="text-slate-500">Mô hình: </span>
                      <span className="font-medium text-slate-800">{model}</span>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="grid gap-1">
                      <label className="text-[11px] text-slate-500">Nhiệt độ</label>
                      <input
                        type="number"
                        min={0}
                        max={2}
                        step={0.1}
                        className="w-full rounded-lg border border-slate-300 bg-white p-2"
                        value={temperature}
                        onChange={(event) => onTemperatureChange(Number(event.target.value))}
                      />
                    </div>
                    <div className="grid gap-1">
                      <label className="text-[11px] text-slate-500">Token tối đa</label>
                      <input
                        type="number"
                        min={128}
                        max={16384}
                        step={128}
                        className="w-full rounded-lg border border-slate-300 bg-white p-2"
                        value={maxTokens ?? ""}
                        onChange={(event) => {
                          if (!event.target.value.trim()) {
                            onMaxTokensChange(undefined);
                            return;
                          }
                          onMaxTokensChange(Number(event.target.value));
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium tracking-wide text-slate-500">Prompt hệ thống</div>
                  <textarea
                    className="min-h-[110px] w-full rounded-lg border border-slate-300 p-2"
                    value={systemPrompt}
                    onChange={(event) => onSystemPromptChange(event.target.value)}
                    placeholder="Ghi đè prompt hệ thống mặc định."
                  />
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={enableRag}
                      onChange={(event) => onEnableRagChange(event.target.checked)}
                    />
                    Bật truy xuất tri thức (RAG)
                  </label>
                  <KnowledgeDocumentPicker
                    selectedIds={knowledgeDocumentIds}
                    onChange={onKnowledgeDocumentIdsChange}
                    title="Tài liệu tri thức"
                    description={enableRag
                      ? "Để trống thì hệ thống sẽ tự phân tích, hoặc bạn có thể chọn tài liệu để giới hạn phạm vi truy xuất."
                      : "RAG hiện đang tắt, hãy bật ở phía trên rồi mới dùng truy xuất theo tài liệu."}
                    allowAuto
                    queryStatus="enabled"
                  />
                </div>
              </div>
            </details>
          </div>
        ) : (
          <div className="space-y-3">
            {replayableSteps.length > 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-medium text-slate-600">Điều khiển phát lại</div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Chỉ hiển thị các bước phía sau vẫn còn gọi công cụ.
                </div>
                <div className="mt-2 flex flex-col gap-2">
                  <select
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
                    value={effectiveReplayStepId}
                    onChange={(event) => onReplayStepChange(event.target.value)}
                  >
                    {replayableSteps.map((step) => (
                      <option key={step.id} value={step.id}>
                        {step.seq}. {stepTitle(step)}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => onReplay("continue")} disabled={isStreaming}>
                      Tiếp tục từ đây
                    </Button>
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => onReplay("dry_run")} disabled={isStreaming}>
                      Chạy thử
                    </Button>
                  </div>
                </div>
              </div>
            ) : persistedSteps.length > 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                Run đã chọn hiện không còn bước nào có thể phát lại tiếp.
              </div>
            ) : null}

            <div className="space-y-2">
              {traceItems.map((item, index) => (
                item.step ? (
                  <details key={item.key} className={`rounded-xl border px-3 py-2 text-xs ${stepStatusTone(item.step.status)}`}>
                    <summary className="cursor-pointer list-none">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
                          {item.step.seq}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-slate-900">{item.text}</div>
                          <div className="mt-1 text-[11px] text-slate-500">
                            {item.step.stepType}
                            {item.step.durationMs ? ` · ${item.step.durationMs} ms` : ""}
                            {item.step.provider ? ` · ${item.step.provider}` : ""}
                            {item.step.model ? ` / ${item.step.model}` : ""}
                          </div>
                        </div>
                      </div>
                    </summary>
                    <div className="mt-2 space-y-2">
                      <div>
                        <div className="mb-1 text-[11px] font-medium text-slate-500">Đầu vào</div>
                        <pre className="overflow-auto whitespace-pre-wrap rounded-lg bg-white p-2">{safePreview(item.step.inputJson)}</pre>
                      </div>
                      <div>
                        <div className="mb-1 text-[11px] font-medium text-slate-500">Đầu ra</div>
                        <pre className="overflow-auto whitespace-pre-wrap rounded-lg bg-white p-2">{safePreview(item.step.outputJson)}</pre>
                      </div>
                      {item.step.error ? <div className="text-red-600">Lỗi: {item.step.error}</div> : null}
                    </div>
                  </details>
                ) : (
                  <div key={item.key} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                    <div className="mb-1 text-[11px] text-slate-400">Sự kiện {index + 1}</div>
                    <div className="text-slate-700">{item.text}</div>
                  </div>
                )
              ))}
              {!hasLiveEvents && persistedSteps.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                  Chưa có sự kiện run nào.
                </div>
              ) : null}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
