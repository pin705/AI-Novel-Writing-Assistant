import type { AntiAiRule, StyleProfile, StyleProfileFeature } from "@ai-novel/shared/types/styleEngine";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STARTER_STYLE_PROFILE_SOURCE_PREFIX = "starter-style-profile:";

interface WritingFormulaEditorState {
  name: string;
  description: string;
  category: string;
  tags: string;
  applicableGenres: string;
  sourceContent: string;
  extractedFeatures: StyleProfileFeature[];
  analysisMarkdown: string;
  narrativeRules: string;
  characterRules: string;
  languageRules: string;
  rhythmRules: string;
  antiAiRuleIds: string[];
}

interface WritingFormulaEditorPanelProps {
  selectedProfile: StyleProfile | null;
  editor: WritingFormulaEditorState;
  antiAiRules: AntiAiRule[];
  savePending: boolean;
  deletePending: boolean;
  reextractPending: boolean;
  onEditorChange: (patch: Partial<WritingFormulaEditorState>) => void;
  onToggleExtractedFeature: (featureId: string, checked: boolean) => void;
  onReextractFeatures: () => void;
  onToggleAntiAiRule: (ruleId: string, checked: boolean) => void;
  onSave: () => void;
  onDelete: () => void;
}

export default function WritingFormulaEditorPanel(props: WritingFormulaEditorPanelProps) {
  const {
    selectedProfile,
    editor,
    antiAiRules,
    savePending,
    deletePending,
    reextractPending,
    onEditorChange,
    onToggleExtractedFeature,
    onReextractFeatures,
    onToggleAntiAiRule,
    onSave,
    onDelete,
  } = props;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Chỉnh sửa phong cách viết</CardTitle>
          {selectedProfile ? (
            <Button size="sm" variant="destructive" onClick={onDelete} disabled={deletePending}>
              Xóa
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!selectedProfile ? (
          <div className="text-sm text-muted-foreground">Vui lòng chọn một tài sản phong cách viết.</div>
        ) : (
          <>
            {selectedProfile.sourceRefId?.startsWith(STARTER_STYLE_PROFILE_SOURCE_PREFIX) ? (
              <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                Đây là phong cách khởi đầu do hệ thống chuẩn bị sẵn cho bạn. Bạn có thể chỉnh trực tiếp theo dự án của mình, không cần sao chép trước rồi mới sửa.
              </div>
            ) : null}
            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="rounded-md border p-2 text-sm"
                value={editor.name}
                onChange={(event) => onEditorChange({ name: event.target.value })}
              />
              <input
                className="rounded-md border p-2 text-sm"
                placeholder="Phân loại"
                value={editor.category}
                onChange={(event) => onEditorChange({ category: event.target.value })}
              />
            </div>
            <textarea
              className="min-h-[80px] w-full rounded-md border p-2 text-sm"
              placeholder="Giới thiệu"
              value={editor.description}
              onChange={(event) => onEditorChange({ description: event.target.value })}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="rounded-md border p-2 text-sm"
                placeholder="Thẻ, phân tách bằng dấu phẩy"
                value={editor.tags}
                onChange={(event) => onEditorChange({ tags: event.target.value })}
              />
              <input
                className="rounded-md border p-2 text-sm"
                placeholder="Thể loại phù hợp, phân tách bằng dấu phẩy"
                value={editor.applicableGenres}
                onChange={(event) => onEditorChange({ applicableGenres: event.target.value })}
              />
            </div>
            {selectedProfile.sourceType === "from_text" || editor.sourceContent.trim() ? (
              <div className="space-y-2">
                <div className="text-sm font-medium">Mẫu văn bản gốc</div>
                <textarea
                  className="min-h-[140px] w-full rounded-md border p-2 text-sm"
                  placeholder="Mẫu văn bản gốc dùng khi trích xuất tài sản phong cách này"
                  value={editor.sourceContent}
                  onChange={(event) => onEditorChange({ sourceContent: event.target.value })}
                />
                <div className="text-xs text-muted-foreground">
                  Phong cách kiểu trích xuất văn bản sẽ lưu luôn mẫu gốc, giúp xem lại, đối chiếu và tinh chỉnh tiếp về sau.
                </div>
              </div>
            ) : null}
            {selectedProfile.sourceType === "from_text" || editor.extractedFeatures.length > 0 ? (
              <div className="rounded-md border p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">Bật đặc trưng đã trích xuất</div>
                    <div className="text-xs text-muted-foreground">
                      Ở đây sẽ hiển thị toàn bộ đặc trưng trích từ văn bản, bạn tick từng mục để bật.
                      {editor.extractedFeatures.length > 0 ? ` 当前共 ${editor.extractedFeatures.length} 项。` : ""}
                    </div>
                  </div>
                  {editor.sourceContent.trim() ? (
                    <Button size="sm" variant="outline" onClick={onReextractFeatures} disabled={reextractPending}>
                      {reextractPending ? "Đang trích xuất lại..." : "Trích xuất lại đặc trưng"}
                    </Button>
                  ) : null}
                </div>
                {editor.extractedFeatures.length > 0 ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    {editor.extractedFeatures.map((feature) => (
                      <label key={feature.id} className="flex items-start gap-2 rounded-md border p-2 text-sm">
                        <input
                          type="checkbox"
                          checked={feature.enabled}
                          onChange={(event) => onToggleExtractedFeature(feature.id, event.target.checked)}
                        />
                        <span>
                          <span className="font-medium">{feature.label}</span>
                          <span className="ml-2 text-xs text-muted-foreground">[{feature.group}]</span>
                          <span className="mt-1 block text-xs text-muted-foreground">{feature.description}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">Bằng chứng: {feature.evidence}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    Phong cách trích từ văn bản này هنوز chưa sinh ra mục đặc trưng có thể chọn, nên bạn chưa thấy ô tick.
                    Có thể bấm “Trích xuất lại đặc trưng” ở góc trên bên phải để tạo lại toàn bộ kho đặc trưng từ mẫu gốc.
                  </div>
                )}
              </div>
            ) : null}
            <textarea
              className="min-h-[90px] w-full rounded-md border p-2 text-sm"
              placeholder="Bản nháp AI / ghi chú phân tích"
              value={editor.analysisMarkdown}
              onChange={(event) => onEditorChange({ analysisMarkdown: event.target.value })}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <textarea
                className="min-h-[170px] rounded-md border p-2 font-mono text-xs"
                value={editor.narrativeRules}
                onChange={(event) => onEditorChange({ narrativeRules: event.target.value })}
              />
              <textarea
                className="min-h-[170px] rounded-md border p-2 font-mono text-xs"
                value={editor.characterRules}
                onChange={(event) => onEditorChange({ characterRules: event.target.value })}
              />
              <textarea
                className="min-h-[170px] rounded-md border p-2 font-mono text-xs"
                value={editor.languageRules}
                onChange={(event) => onEditorChange({ languageRules: event.target.value })}
              />
              <textarea
                className="min-h-[170px] rounded-md border p-2 font-mono text-xs"
                value={editor.rhythmRules}
                onChange={(event) => onEditorChange({ rhythmRules: event.target.value })}
              />
            </div>
            <div className="rounded-md border p-3">
              <div className="mb-2 text-sm font-medium">Ràng buộc quy tắc chống AI</div>
              <div className="grid gap-2 md:grid-cols-2">
                {antiAiRules.map((rule) => (
                  <label key={rule.id} className="flex items-start gap-2 rounded-md border p-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editor.antiAiRuleIds.includes(rule.id)}
                      onChange={(event) => onToggleAntiAiRule(rule.id, event.target.checked)}
                    />
                    <span>
                      <span className="font-medium">{rule.name}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{rule.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={onSave} disabled={savePending || !editor.name.trim()}>
              Lưu tài sản phong cách viết
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
