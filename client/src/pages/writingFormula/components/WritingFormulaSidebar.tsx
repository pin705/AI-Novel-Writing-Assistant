import { useMemo, useState } from "react";
import type { AntiAiRule, StyleProfile, StyleTemplate } from "@ai-novel/shared/types/styleEngine";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WritingFormulaRulesPanel from "./WritingFormulaRulesPanel";

const STARTER_STYLE_PROFILE_SOURCE_PREFIX = "starter-style-profile:";
const AI_STYLE_BRIEF_SOURCE_PREFIX = "ai-style-brief:";

export interface WritingFormulaCreateFormState {
  manualName: string;
  briefName: string;
  briefCategory: string;
  briefPrompt: string;
  extractName: string;
  extractCategory: string;
  extractSourceText: string;
}

interface WritingFormulaSidebarProps {
  createForm: WritingFormulaCreateFormState;
  onCreateFormChange: (patch: Partial<WritingFormulaCreateFormState>) => void;
  onCreateManual: () => void;
  onCreateFromBrief: () => void;
  onExtractFromText: () => void;
  onCreateFromTemplate: (templateId: string) => void;
  createManualPending: boolean;
  createFromBriefPending: boolean;
  extractFromTextPending: boolean;
  createFromTemplatePending: boolean;
  templates: StyleTemplate[];
  antiAiRules: AntiAiRule[];
  profiles: StyleProfile[];
  selectedProfileId: string;
  onSelectProfile: (profileId: string) => void;
  onToggleRule: (rule: AntiAiRule, enabled: boolean) => void;
}

function isStarterProfile(profile: StyleProfile): boolean {
  return profile.sourceRefId?.startsWith(STARTER_STYLE_PROFILE_SOURCE_PREFIX) ?? false;
}

function getProfileOriginLabel(profile: StyleProfile): string {
  if (isStarterProfile(profile)) {
    return "Có sẵn";
  }
  if (profile.sourceRefId?.startsWith(AI_STYLE_BRIEF_SOURCE_PREFIX)) {
    return "Do AI tạo";
  }
  if (profile.sourceType === "from_text") {
    return "Trích từ văn bản";
  }
  if (profile.sourceType === "from_book_analysis") {
    return "Sinh từ phân tích sách";
  }
  if (profile.sourceType === "from_current_work") {
    return "Từ tác phẩm hiện tại";
  }
  return "Tự tạo";
}

export default function WritingFormulaSidebar(props: WritingFormulaSidebarProps) {
  const {
    createForm,
    onCreateFormChange,
    onCreateManual,
    onCreateFromBrief,
    onExtractFromText,
    onCreateFromTemplate,
    createManualPending,
    createFromBriefPending,
    extractFromTextPending,
    createFromTemplatePending,
    templates,
    antiAiRules,
    profiles,
    selectedProfileId,
    onSelectProfile,
    onToggleRule,
  } = props;
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activeCreateTab, setActiveCreateTab] = useState("quick_start");

  const { starterProfiles, customProfiles } = useMemo(() => {
    const starters = profiles.filter((profile) => isStarterProfile(profile));
    const custom = profiles.filter((profile) => !isStarterProfile(profile));
    return {
      starterProfiles: starters,
      customProfiles: custom,
    };
  }, [profiles]);

  return (
    <div className="space-y-4 xl:min-h-0 xl:overflow-y-auto xl:pr-1">
      <Card>
        <CardHeader>
          <CardTitle>Chọn một kiểu viết trước rồi chỉnh sau</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm leading-6 text-muted-foreground">
            Nếu đây là lần đầu bạn dùng, chưa cần hiểu hết các trường quy tắc. Cứ chọn một kiểu viết có sẵn giống nhất với cảm giác bạn muốn, rồi vào chỉnh tên, thẻ và quy tắc sau sẽ nhẹ hơn nhiều.
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="text-xs font-medium text-muted-foreground">Kiểu viết của tôi có thể sửa ngay</div>
              <div className="mt-1 text-2xl font-semibold text-foreground">{profiles.length}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Trong đó có {starterProfiles.length} kiểu có sẵn, rất hợp để lấy ý tưởng rồi tinh chỉnh lại.
              </div>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="text-xs font-medium text-muted-foreground">Mẫu dựng sẵn</div>
              <div className="mt-1 text-2xl font-semibold text-foreground">{templates.length}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Phù hợp để tạo nhanh một kiểu viết mới, không cần bắt đầu từ trang trắng.
              </div>
            </div>
          </div>
          <Button className="w-full" onClick={() => setCreateDialogOpen(true)}>
            Tạo mới hoặc nhập kiểu viết
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kiểu viết của tôi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {starterProfiles.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Gợi ý để bắt đầu</div>
              {starterProfiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  className={`w-full rounded-md border p-3 text-left transition ${
                    profile.id === selectedProfileId ? "border-primary bg-primary/5" : "hover:border-primary/40"
                  }`}
                  onClick={() => onSelectProfile(profile.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-foreground">{profile.name}</div>
                    <Badge variant="outline">Có sẵn</Badge>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{profile.description || "Kiểu viết mặc định có thể chỉnh ngay."}</div>
                </button>
              ))}
            </div>
          ) : null}

          {customProfiles.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Kiểu viết do bạn tự tạo</div>
              {customProfiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  className={`w-full rounded-md border p-3 text-left transition ${
                    profile.id === selectedProfileId ? "border-primary bg-primary/5" : "hover:border-primary/40"
                  }`}
                  onClick={() => onSelectProfile(profile.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-foreground">{profile.name}</div>
                    <Badge variant="secondary">{getProfileOriginLabel(profile)}</Badge>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{profile.description || "Chưa có mô tả"}</div>
                </button>
              ))}
            </div>
          ) : null}

          {profiles.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Hiện chưa có kiểu viết nào. Hãy bấm “Tạo mới hoặc nhập kiểu viết” ở trên để dựng nhanh một bộ mẫu cho đỡ mất công.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <WritingFormulaRulesPanel antiAiRules={antiAiRules} onToggleRule={onToggleRule} />

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Tạo mới hoặc nhập kiểu viết</DialogTitle>
            <DialogDescription>
              Mình khuyên nên bắt đầu bằng “Bắt đầu nhanh” hoặc “Trang trắng / AI”. Chỉ khi bạn đã có sẵn văn bản mẫu thì mới nên dùng “Trích từ văn bản”.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeCreateTab} onValueChange={setActiveCreateTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="quick_start">Bắt đầu nhanh</TabsTrigger>
              <TabsTrigger value="blank">Trang trắng / AI</TabsTrigger>
              <TabsTrigger value="extract">Trích từ văn bản</TabsTrigger>
            </TabsList>

            <TabsContent value="quick_start" className="space-y-4">
              <div className="rounded-lg border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
                Bên trái đã có sẵn vài kiểu viết bạn có thể chỉnh ngay. Nếu muốn mở thêm một bộ mới, cách nhẹ đầu nhất vẫn là tạo nhanh từ mẫu rồi tinh chỉnh theo dự án của bạn.
              </div>
              <div className="grid max-h-[58vh] gap-3 overflow-y-auto pr-1 md:grid-cols-2">
                {templates.map((template) => (
                  <div key={template.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold text-foreground">{template.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{template.category}</div>
                      </div>
                      <Badge variant="outline">Mẫu</Badge>
                    </div>
                    <div className="mt-3 text-sm leading-6 text-muted-foreground">{template.description}</div>
                    {template.tags.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {template.tags.slice(0, 4).map((tag) => (
                          <Badge key={`${template.id}-${tag}`} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    ) : null}
                    {template.applicableGenres.length > 0 ? (
                      <div className="mt-3 text-xs text-muted-foreground">
                        Phù hợp: {template.applicableGenres.join(" / ")}
                      </div>
                    ) : null}
                    <Button
                      size="sm"
                      className="mt-4 w-full"
                    onClick={() => onCreateFromTemplate(template.id)}
                    disabled={createFromTemplatePending}
                  >
                      {createFromTemplatePending ? "Đang tạo..." : "Tạo nhanh dựa trên mẫu này"}
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="blank" className="space-y-4">
              <div className="rounded-lg border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
                Có hai cách khởi đầu nhẹ tay ở đây: nếu bạn đã biết mình muốn tự quản một bộ quy tắc thì tạo trang trắng thủ công; còn nếu bạn chỉ biết “muốn ra cảm giác gì” thì cứ viết một câu ngắn để AI dựng khung trước.
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <div className="mb-3">
                    <div className="text-sm font-medium text-foreground">Tạo trang trắng thủ công</div>
                    <div className="mt-1 text-xs leading-5 text-muted-foreground">
                      Hợp khi bạn đã biết mình muốn duy trì kiểu quy tắc nào, chỉ cần dựng một khung rỗng trước rồi bổ sung dần.
                    </div>
                  </div>
                  <div className="space-y-3">
                    <input
                      className="w-full rounded-md border p-2 text-sm"
                      placeholder="Ví dụ: Kiểu viết quan hệ đô thị cho nữ của tôi"
                      value={createForm.manualName}
                      onChange={(event) => onCreateFormChange({ manualName: event.target.value })}
                    />
                    <Button
                      className="w-full"
                      onClick={onCreateManual}
                      disabled={!createForm.manualName.trim() || createManualPending}
                    >
                      {createManualPending ? "Đang tạo..." : "Tạo kiểu viết mới"}
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="mb-3">
                    <div className="text-sm font-medium text-foreground">Để AI dựng trước một bộ</div>
                    <div className="mt-1 text-xs leading-5 text-muted-foreground">
                      Nếu chưa muốn tìm hiểu các trường quy tắc, cứ mô tả cảm giác đọc, khí chất hoặc hướng tham chiếu bạn muốn. AI sẽ dựng sẵn một bộ có thể chỉnh tiếp.
                    </div>
                  </div>
                  <div className="space-y-3">
                    <input
                      className="w-full rounded-md border p-2 text-sm"
                      placeholder="Tên kiểu viết (không bắt buộc, để trống thì AI tự đặt)"
                      value={createForm.briefName}
                      onChange={(event) => onCreateFormChange({ briefName: event.target.value })}
                    />
                    <input
                      className="w-full rounded-md border p-2 text-sm"
                      placeholder="Danh mục (không bắt buộc)"
                      value={createForm.briefCategory}
                      onChange={(event) => onCreateFormChange({ briefCategory: event.target.value })}
                    />
                    <textarea
                      className="min-h-[180px] w-full rounded-md border p-2 text-sm"
                      placeholder="Ví dụ: kiểu viết tiết chế, thiên về suy ngẫm, hội thoại sắc, ít sáo rỗng, nhiều va chạm đời thường."
                      value={createForm.briefPrompt}
                      onChange={(event) => onCreateFormChange({ briefPrompt: event.target.value })}
                    />
                    <Button
                      className="w-full"
                      onClick={onCreateFromBrief}
                      disabled={!createForm.briefPrompt.trim() || createFromBriefPending}
                    >
                      {createFromBriefPending ? "AI đang tạo..." : "Cho AI tạo một kiểu viết"}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="extract" className="space-y-4">
              <div className="rounded-lg border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
                Phù hợp khi bạn đã có sẵn một đoạn văn bản tham chiếu khá rõ, muốn hệ thống trích đặc trưng trước rồi mới vào chỉnh sửa. Nếu chưa có mẫu, không nên chọn cách này làm bước đầu.
              </div>
              <div className="rounded-lg border p-4">
                <div className="space-y-3">
                  <input
                    className="w-full rounded-md border p-2 text-sm"
                    placeholder="Tên kiểu viết"
                    value={createForm.extractName}
                    onChange={(event) => onCreateFormChange({ extractName: event.target.value })}
                  />
                  <input
                    className="w-full rounded-md border p-2 text-sm"
                    placeholder="Danh mục (không bắt buộc)"
                    value={createForm.extractCategory}
                    onChange={(event) => onCreateFormChange({ extractCategory: event.target.value })}
                  />
                  <textarea
                    className="min-h-[220px] w-full rounded-md border p-2 text-sm"
                    placeholder="Dán văn bản tham chiếu vào đây"
                    value={createForm.extractSourceText}
                    onChange={(event) => onCreateFormChange({ extractSourceText: event.target.value })}
                  />
                  <Button
                    className="w-full"
                    onClick={onExtractFromText}
                    disabled={!createForm.extractName.trim() || !createForm.extractSourceText.trim() || extractFromTextPending}
                  >
                    {extractFromTextPending ? "Đang trích xuất..." : "Cho AI trích đặc trưng rồi tạo"}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
