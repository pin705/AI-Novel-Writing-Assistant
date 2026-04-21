import type { StyleBinding, StyleDetectionReport } from "@ai-novel/shared/types/styleEngine";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BindingFormState {
  targetType: StyleBinding["targetType"];
  novelId: string;
  chapterId: string;
  taskTargetId: string;
  priority: number;
  weight: number;
}

interface TestWriteFormState {
  mode: "generate" | "rewrite";
  topic: string;
  sourceText: string;
  targetLength: number;
}

interface WritingFormulaWorkbenchPanelProps {
  selectedProfileId: string;
  bindingForm: BindingFormState;
  bindings: StyleBinding[];
  novelOptions: Array<{ id: string; title: string }>;
  chapterOptions: Array<{ id: string; order: number; title: string }>;
  createBindingPending: boolean;
  onBindingFormChange: (patch: Partial<BindingFormState>) => void;
  onCreateBinding: () => void;
  onDeleteBinding: (bindingId: string) => void;
  testWriteForm: TestWriteFormState;
  testWriteOutput: string;
  testWritePending: boolean;
  onTestWriteFormChange: (patch: Partial<TestWriteFormState>) => void;
  onRunTestWrite: () => void;
  detectInput: string;
  detectionReport: StyleDetectionReport | null;
  detectionPending: boolean;
  rewritePending: boolean;
  rewritePreview: string;
  onDetectInputChange: (value: string) => void;
  onDetect: () => void;
  onRewrite: () => void;
}

export default function WritingFormulaWorkbenchPanel(props: WritingFormulaWorkbenchPanelProps) {
  const {
    selectedProfileId,
    bindingForm,
    bindings,
    novelOptions,
    chapterOptions,
    createBindingPending,
    onBindingFormChange,
    onCreateBinding,
    onDeleteBinding,
    testWriteForm,
    testWriteOutput,
    testWritePending,
    onTestWriteFormChange,
    onRunTestWrite,
    detectInput,
    detectionReport,
    detectionPending,
    rewritePending,
    rewritePreview,
    onDetectInputChange,
    onDetect,
    onRewrite,
  } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Áp dụng và thử nghiệm</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border p-3">
          <div className="mb-2 text-sm font-medium">Ràng buộc vào mục tiêu</div>
          <div className="grid gap-2 md:grid-cols-2">
            <select
              className="rounded-md border p-2 text-sm"
              value={bindingForm.targetType}
              onChange={(event) => onBindingFormChange({ targetType: event.target.value as StyleBinding["targetType"] })}
            >
              <option value="novel">Toàn bộ sách</option>
              <option value="chapter">Chương</option>
              <option value="task">Tác vụ này</option>
            </select>
            <select
              className="rounded-md border p-2 text-sm"
              value={bindingForm.novelId}
              onChange={(event) => onBindingFormChange({ novelId: event.target.value, chapterId: "" })}
            >
              {novelOptions.map((novel) => <option key={novel.id} value={novel.id}>{novel.title}</option>)}
            </select>
            {bindingForm.targetType === "chapter" ? (
              <select
                className="rounded-md border p-2 text-sm"
                value={bindingForm.chapterId}
                onChange={(event) => onBindingFormChange({ chapterId: event.target.value })}
              >
                <option value="">Chọn chương</option>
                {chapterOptions.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.order}. {chapter.title}
                  </option>
                ))}
              </select>
            ) : null}
            {bindingForm.targetType === "task" ? (
              <input
                className="rounded-md border p-2 text-sm"
                placeholder="Mã tác vụ"
                value={bindingForm.taskTargetId}
                onChange={(event) => onBindingFormChange({ taskTargetId: event.target.value })}
              />
            ) : null}
            <input
              className="rounded-md border p-2 text-sm"
              type="number"
              min={0}
              max={99}
              value={bindingForm.priority}
              onChange={(event) => onBindingFormChange({ priority: Number(event.target.value) || 1 })}
            />
            <input
              className="rounded-md border p-2 text-sm"
              type="number"
              min={0.3}
              max={1}
              step={0.1}
              value={bindingForm.weight}
              onChange={(event) => onBindingFormChange({ weight: Number(event.target.value) || 1 })}
            />
          </div>
          <Button className="mt-3" onClick={onCreateBinding} disabled={createBindingPending || !selectedProfileId}>
            Tạo ràng buộc
          </Button>
          <div className="mt-3 space-y-2">
            {bindings.map((binding) => (
              <div key={binding.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                <span>{binding.targetType} / {binding.targetId} / P{binding.priority} / W{binding.weight}</span>
                <Button size="sm" variant="ghost" onClick={() => onDeleteBinding(binding.id)}>Xóa</Button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border p-3">
          <div className="mb-2 text-sm font-medium">Thử viết</div>
          <select
            className="mb-2 w-full rounded-md border p-2 text-sm"
            value={testWriteForm.mode}
            onChange={(event) => onTestWriteFormChange({ mode: event.target.value as "generate" | "rewrite" })}
          >
            <option value="generate">Sinh nội dung</option>
            <option value="rewrite">Viết lại văn bản</option>
          </select>
          {testWriteForm.mode === "generate" ? (
            <input
              className="mb-2 w-full rounded-md border p-2 text-sm"
              placeholder="Nhập chủ đề"
              value={testWriteForm.topic}
              onChange={(event) => onTestWriteFormChange({ topic: event.target.value })}
            />
          ) : (
            <textarea
              className="mb-2 min-h-[120px] w-full rounded-md border p-2 text-sm"
              placeholder="Dán văn bản cần viết lại"
              value={testWriteForm.sourceText}
              onChange={(event) => onTestWriteFormChange({ sourceText: event.target.value })}
            />
          )}
          <Button onClick={onRunTestWrite} disabled={testWritePending || !selectedProfileId}>
            Chạy thử viết
          </Button>
          {testWriteOutput ? (
            <pre className="mt-3 max-h-[260px] overflow-auto whitespace-pre-wrap rounded-md border bg-muted/20 p-3 text-sm">
              {testWriteOutput}
            </pre>
          ) : null}
        </div>

        <div className="rounded-md border p-3">
          <div className="mb-2 text-sm font-medium">Phát hiện và sửa cảm giác AI</div>
          <textarea
            className="min-h-[150px] w-full rounded-md border p-2 text-sm"
            placeholder="Dán văn bản cần kiểm tra"
            value={detectInput}
            onChange={(event) => onDetectInputChange(event.target.value)}
          />
          <div className="mt-2 flex gap-2">
            <Button onClick={onDetect} disabled={detectionPending || !selectedProfileId || !detectInput.trim()}>
              Chạy kiểm tra
            </Button>
            <Button variant="secondary" onClick={onRewrite} disabled={rewritePending || !selectedProfileId || !detectInput.trim()}>
              Sửa một chạm
            </Button>
          </div>
          {detectionReport ? (
            <div className="mt-3 rounded-md border p-3 text-sm">
              <div className="font-medium">Điểm rủi ro: {detectionReport.riskScore}</div>
              <div className="mt-1 text-muted-foreground">{detectionReport.summary}</div>
              <div className="mt-2 space-y-2">
                {detectionReport.violations.map((item, index) => (
                  <div key={`${item.ruleId}-${index}`} className="rounded-md border p-2">
                    <div className="font-medium">{item.ruleName}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.reason}</div>
                    <div className="mt-1 whitespace-pre-wrap text-xs">{item.excerpt}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {rewritePreview ? (
            <pre className="mt-3 max-h-[260px] overflow-auto whitespace-pre-wrap rounded-md border bg-muted/20 p-3 text-sm">
              {rewritePreview}
            </pre>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
