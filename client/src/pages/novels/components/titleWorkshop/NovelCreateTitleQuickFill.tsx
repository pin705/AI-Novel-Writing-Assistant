import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TitleFactorySuggestion, TitleLibraryEntry } from "@ai-novel/shared/types/title";
import {
  AI_FREEDOM_OPTIONS,
  EMOTION_OPTIONS,
  PACE_OPTIONS,
  POV_OPTIONS,
  WRITING_MODE_OPTIONS,
  type NovelBasicFormState,
} from "../../novelBasicInfo.shared";
import {
  buildTitleLibraryListKey,
  createTitleLibraryEntry,
  generateTitleIdeas,
  listTitleLibrary,
} from "@/api/title";
import { queryKeys } from "@/api/queryKeys";
import AiButton from "@/components/common/AiButton";
import LLMSelector from "@/components/common/LLMSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { useLLMStore } from "@/store/llmStore";
import TitleSuggestionList from "@/pages/titles/components/TitleSuggestionList";
import { getClickRateBadgeClass, truncateText } from "@/pages/titles/titleStudio.shared";

interface NovelCreateTitleQuickFillProps {
  basicForm: NovelBasicFormState;
  onApplyTitle: (title: string) => void;
}

const DEFAULT_TITLE_COUNT = 8;
const TITLE_LIBRARY_PAGE_SIZE = 8;

function sortSuggestions(items: TitleFactorySuggestion[]): TitleFactorySuggestion[] {
  return [...items].sort((left, right) => right.clickRate - left.clickRate);
}

function resolveOptionLabel<T extends string>(
  options: Array<{ value: T; label: string }>,
  value: T,
): string | null {
  return options.find((item) => item.value === value)?.label ?? null;
}

function buildGenerationBrief(basicForm: NovelBasicFormState): string {
  const lines = [
    basicForm.description.trim() ? `Tổng quan tác phẩm: ${basicForm.description.trim()}` : "",
    basicForm.title.trim() ? `Tiêu đề nháp hiện tại: ${basicForm.title.trim()}` : "",
    `Chế độ sáng tác: ${resolveOptionLabel(WRITING_MODE_OPTIONS, basicForm.writingMode) ?? basicForm.writingMode}`,
    `Góc nhìn kể chuyện: ${resolveOptionLabel(POV_OPTIONS, basicForm.narrativePov) ?? basicForm.narrativePov}`,
    `Ưu tiên nhịp độ: ${resolveOptionLabel(PACE_OPTIONS, basicForm.pacePreference) ?? basicForm.pacePreference}`,
    `Cường độ cảm xúc: ${resolveOptionLabel(EMOTION_OPTIONS, basicForm.emotionIntensity) ?? basicForm.emotionIntensity}`,
    `Độ tự do của AI: ${resolveOptionLabel(AI_FREEDOM_OPTIONS, basicForm.aiFreedom) ?? basicForm.aiFreedom}`,
    basicForm.styleTone.trim() ? `Từ khóa văn phong: ${basicForm.styleTone.trim()}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}

function renderLibraryDescription(entry: TitleLibraryEntry): string {
  if (entry.description?.trim()) {
    return truncateText(entry.description, 100);
  }
  if (entry.keywords?.trim()) {
    return `Từ khóa: ${truncateText(entry.keywords, 80)}`;
  }
  return "Ứng viên trong thư viện tiêu đề, có thể viết thẳng vào biểu mẫu tạo hiện tại.";
}

function joinKeywords(...values: Array<string | null | undefined>): string | null {
  const next = values
    .map((value) => value?.trim() ?? "")
    .filter(Boolean)
    .join(" / ")
    .slice(0, 160);
  return next || null;
}

export default function NovelCreateTitleQuickFill({
  basicForm,
  onApplyTitle,
}: NovelCreateTitleQuickFillProps) {
  const llm = useLLMStore();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"generate" | "library">("generate");
  const [count, setCount] = useState(DEFAULT_TITLE_COUNT);
  const [search, setSearch] = useState("");
  const [manualBrief, setManualBrief] = useState("");
  const [referenceTitle, setReferenceTitle] = useState("");
  const [suggestions, setSuggestions] = useState<TitleFactorySuggestion[]>([]);

  const autoBrief = useMemo(() => buildGenerationBrief(basicForm), [basicForm]);
  const resolvedBrief = useMemo(
    () => [autoBrief, manualBrief.trim() ? `Bổ sung thêm: ${manualBrief.trim()}` : ""].filter(Boolean).join("\n"),
    [autoBrief, manualBrief],
  );
  const generationMode = referenceTitle.trim() ? "adapt" : "brief";
  const hasGenerationContext = Boolean(resolvedBrief.trim() || referenceTitle.trim());

  const titleLibraryParams = useMemo(
    () => ({
      page: 1,
      pageSize: TITLE_LIBRARY_PAGE_SIZE,
      search: search.trim() || undefined,
      genreId: basicForm.genreId || undefined,
      sort: "clickRate" as const,
    }),
    [basicForm.genreId, search],
  );
  const titleLibraryParamsKey = useMemo(
    () => buildTitleLibraryListKey(titleLibraryParams),
    [titleLibraryParams],
  );

  const libraryQuery = useQuery({
    queryKey: queryKeys.titles.list(titleLibraryParamsKey),
    queryFn: () => listTitleLibrary(titleLibraryParams),
    staleTime: 60 * 1000,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!hasGenerationContext) {
        throw new Error("Hãy nhập một câu brief về tiêu đề hoặc thêm một tiêu đề tham chiếu rồi hãy tạo.");
      }
      const response = await generateTitleIdeas({
        mode: generationMode,
        brief: resolvedBrief || undefined,
        referenceTitle: referenceTitle.trim() || undefined,
        genreId: basicForm.genreId || null,
        count: Math.min(24, Math.max(3, Math.floor(count) || DEFAULT_TITLE_COUNT)),
        provider: llm.provider,
        model: llm.model,
        temperature: llm.temperature,
        maxTokens: llm.maxTokens,
      });
      return response.data?.titles ?? [];
    },
    onSuccess: (rows) => {
      const next = sortSuggestions(rows);
      setSuggestions(next);
      toast.success(`Đã tạo ${next.length} ứng viên tiêu đề.`);
    },
  });

  const saveMutation = useMutation({
    mutationFn: (suggestion: TitleFactorySuggestion) => createTitleLibraryEntry({
      title: suggestion.title,
      description: basicForm.description.trim().slice(0, 400) || manualBrief.trim().slice(0, 400) || null,
      clickRate: suggestion.clickRate,
      keywords: joinKeywords(basicForm.title, referenceTitle, basicForm.styleTone),
      genreId: basicForm.genreId || null,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.titles.all });
      toast.success("Đã thêm tiêu đề vào thư viện.");
    },
  });

  const handleApplyTitle = (title: string, source: "generated" | "library") => {
    onApplyTitle(title);
    setOpen(false);
    toast.success(source === "generated" ? "Ứng viên tiêu đề đã được điền vào biểu mẫu tạo." : "Tiêu đề trong thư viện đã được điền vào biểu mẫu tạo.");
  };

  const handleCopySuggestion = async (suggestion: TitleFactorySuggestion) => {
    await navigator.clipboard.writeText(suggestion.title);
    toast.success("Đã sao chép tiêu đề vào clipboard.");
  };

  return (
    <>
      <div className="flex items-center justify-end">
        <AiButton type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          Chọn tiêu đề nhanh
        </AiButton>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chọn tiêu đề nhanh</DialogTitle>
            <DialogDescription>
              Không liên kết gì cả, chỉ giúp bạn điền tiêu đề vào biểu mẫu tạo nhanh hơn. Bạn có thể sinh ứng viên mới hoặc chọn một tiêu đề từ thư viện để điền lại.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={mode}
            onValueChange={(value) => setMode(value as "generate" | "library")}
            className="space-y-4"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="generate">Sinh nhanh</TabsTrigger>
              <TabsTrigger value="library">Chọn từ thư viện</TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="space-y-4">
              <div className="rounded-lg border bg-background/80 p-3">
                <div className="text-xs leading-6 text-muted-foreground">
                  Hệ thống sẽ ưu tiên đọc phần giới thiệu, thể loại, văn phong, nhịp độ và góc nhìn đã có ở trang tạo hiện tại. Bạn cũng có thể bổ sung tạm một câu brief bên dưới, không cần quay lại biểu mẫu trước.
                </div>
                <div className="mt-3">
                  <LLMSelector />
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="space-y-2">
                    <label
                      htmlFor="novel-create-title-quick-brief"
                      className="text-sm font-medium text-foreground"
                    >
                      Bổ sung brief tiêu đề
                    </label>
                    <textarea
                      id="novel-create-title-quick-brief"
                      className="min-h-[132px] w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      value={manualBrief}
                      onChange={(event) => setManualBrief(event.target.value)}
                      placeholder="Ví dụ: Trong thế giới hậu tận thế, một kỹ sư bị lưu đày bất ngờ nắm được lõi cơ giáp cổ đại, muốn tiêu đề mang cảm giác thiết lập cứng tay và số phận."
                    />
                    <div className="text-xs leading-6 text-muted-foreground">
                      Chỉ ảnh hưởng cho lần sinh này, sẽ không tự ghi ngược về biểu mẫu tạo truyện.
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label
                        htmlFor="novel-create-title-reference"
                        className="text-sm font-medium text-foreground"
                      >
                        Tiêu đề tham chiếu
                      </label>
                      <Input
                        id="novel-create-title-reference"
                        value={referenceTitle}
                        onChange={(event) => setReferenceTitle(event.target.value)}
                        placeholder="Tùy chọn, nhập vào sẽ sinh theo kiểu biến tấu từ tiêu đề tham chiếu"
                      />
                    </div>
                    <div className="rounded-md border bg-muted/20 p-3 text-xs leading-6 text-muted-foreground">
                      {referenceTitle.trim()
                        ? "Hiện hệ thống sẽ tham chiếu nhịp tiêu đề và cấu trúc đặt tên bạn nhập, rồi kết hợp thông tin cuốn truyện để sinh lại ứng viên."
                        : "Để trống thì hệ thống sẽ sinh trực tiếp từ brief. Nếu trong đầu bạn đã có hướng phong cách, có thể nhập tiêu đề tham chiếu ở đây."}
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-md border bg-muted/20 p-3">
                  <div className="text-xs font-medium text-foreground">Thông tin đã tự đọc từ trang tạo</div>
                  <div className="mt-2 whitespace-pre-wrap text-xs leading-6 text-muted-foreground">
                    {autoBrief || "Trang tạo hiện chưa có đủ thông tin. Bạn có thể viết một câu về thể loại, điểm hút hoặc xung đột trong phần brief tiêu đề ở trên rồi tạo lại."}
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-foreground">Số lượng tiêu đề</span>
                    <Input
                      type="number"
                      min={3}
                      max={24}
                      step={1}
                      value={count}
                      onChange={(event) => setCount(Number(event.target.value) || DEFAULT_TITLE_COUNT)}
                      className="w-[120px]"
                    />
                  </label>
                  <AiButton
                    type="button"
                    onClick={() => generateMutation.mutate()}
                    disabled={generateMutation.isPending || !hasGenerationContext}
                  >
                    {generateMutation.isPending ? "Đang sinh..." : "Sinh ứng viên tiêu đề"}
                  </AiButton>
                </div>

                {!hasGenerationContext ? (
                  <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800">
                    Hãy thêm ít nhất một câu brief tiêu đề hoặc một tiêu đề tham chiếu; nếu trang tạo đã có phần giới thiệu, thể loại hay văn phong thì chúng cũng sẽ tự động tham gia vào quá trình sinh.
                  </div>
                ) : null}
              </div>

              <TitleSuggestionList
                suggestions={suggestions}
                selectedTitle={basicForm.title}
                primaryActionLabel="Điền tiêu đề"
                onPrimaryAction={(suggestion) => handleApplyTitle(suggestion.title, "generated")}
                onCopy={handleCopySuggestion}
                onSave={(suggestion) => saveMutation.mutate(suggestion)}
                savingTitle={saveMutation.isPending ? saveMutation.variables?.title ?? "" : ""}
                emptyMessage="Bạn có thể viết một câu về thể loại hoặc điểm hút trong phần brief ở trên rồi bấm sinh lại, kết quả sẽ dùng trực tiếp làm ứng viên tiêu đề cho trang tạo."
              />
            </TabsContent>

            <TabsContent value="library" className="space-y-4">
              <div className="flex flex-col gap-3 rounded-lg border bg-background/80 p-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-foreground">Chọn nhanh từ thư viện tiêu đề</div>
                  <div className="text-xs leading-6 text-muted-foreground">
                    Mặc định sắp xếp theo tỉ lệ click
                    {basicForm.genreId ? ", đồng thời lọc theo nền tảng thể loại hiện tại" : ""}
                    .
                  </div>
                </div>
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm theo từ khóa tiêu đề"
                  className="md:max-w-xs"
                />
              </div>

              {libraryQuery.isLoading ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Đang tải thư viện tiêu đề...
                </div>
              ) : (libraryQuery.data?.data?.items ?? []).length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Hiện chưa có tiêu đề nào phù hợp với điều kiện này. Bạn có thể chuyển sang “Sinh nhanh” để tạo trước một lô ứng viên.
                </div>
              ) : (
                <div className="grid gap-3">
                  {(libraryQuery.data?.data?.items ?? []).map((entry) => {
                    const isSelected = basicForm.title.trim() === entry.title.trim();
                    return (
                      <div
                        key={entry.id}
                        className={`rounded-xl border p-4 transition ${
                          isSelected ? "border-primary/50 bg-primary/5" : "border-border/70 bg-background"
                        }`}
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              {typeof entry.clickRate === "number" ? (
                                <Badge className={getClickRateBadgeClass(entry.clickRate)}>
                                  Dự đoán {entry.clickRate}
                                </Badge>
                              ) : null}
                              {typeof entry.usedCount === "number" ? (
                                <Badge variant="secondary">Đã dùng {entry.usedCount}</Badge>
                              ) : null}
                              {entry.genre?.name ? <Badge variant="outline">{entry.genre.name}</Badge> : null}
                              {isSelected ? <Badge variant="outline">Đang chọn</Badge> : null}
                            </div>
                            <div className="text-lg font-semibold text-foreground">{entry.title}</div>
                            <div className="text-sm leading-6 text-muted-foreground">
                              {renderLibraryDescription(entry)}
                            </div>
                          </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <Button type="button" size="sm" onClick={() => handleApplyTitle(entry.title, "library")}>
                              Điền tiêu đề
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
