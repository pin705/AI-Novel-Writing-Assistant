import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TitleFactorySuggestion, TitleLibraryEntry } from "@ai-novel/shared/types/title";
import {
  buildNovelBasicInfoI18n,
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
import { useI18n, type TranslateFn } from "@/i18n";
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

function buildGenerationBrief(
  basicForm: NovelBasicFormState,
  t: TranslateFn,
  optionLabels: Pick<ReturnType<typeof buildNovelBasicInfoI18n>, "writingModeOptions" | "povOptions" | "paceOptions" | "emotionOptions" | "aiFreedomOptions">,
): string {
  const lines = [
    basicForm.description.trim() ? t("novelCreate.titleQuickFill.autoBrief.description", { value: basicForm.description.trim() }) : "",
    basicForm.title.trim() ? t("novelCreate.titleQuickFill.autoBrief.currentTitle", { value: basicForm.title.trim() }) : "",
    t("novelCreate.titleQuickFill.autoBrief.writingMode", {
      value: resolveOptionLabel(optionLabels.writingModeOptions, basicForm.writingMode) ?? basicForm.writingMode,
    }),
    t("novelCreate.titleQuickFill.autoBrief.narrativePov", {
      value: resolveOptionLabel(optionLabels.povOptions, basicForm.narrativePov) ?? basicForm.narrativePov,
    }),
    t("novelCreate.titleQuickFill.autoBrief.pacePreference", {
      value: resolveOptionLabel(optionLabels.paceOptions, basicForm.pacePreference) ?? basicForm.pacePreference,
    }),
    t("novelCreate.titleQuickFill.autoBrief.emotionIntensity", {
      value: resolveOptionLabel(optionLabels.emotionOptions, basicForm.emotionIntensity) ?? basicForm.emotionIntensity,
    }),
    t("novelCreate.titleQuickFill.autoBrief.aiFreedom", {
      value: resolveOptionLabel(optionLabels.aiFreedomOptions, basicForm.aiFreedom) ?? basicForm.aiFreedom,
    }),
    basicForm.styleTone.trim() ? t("novelCreate.titleQuickFill.autoBrief.styleTone", { value: basicForm.styleTone.trim() }) : "",
  ].filter(Boolean);
  return lines.join("\n");
}

function renderLibraryDescription(entry: TitleLibraryEntry, t: TranslateFn): string {
  if (entry.description?.trim()) {
    return truncateText(entry.description, 100);
  }
  if (entry.keywords?.trim()) {
    return t("novelCreate.titleQuickFill.library.keywords", { value: truncateText(entry.keywords, 80) });
  }
  return t("novelCreate.titleQuickFill.library.defaultDescription");
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
  const { t } = useI18n();
  const llm = useLLMStore();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"generate" | "library">("generate");
  const [count, setCount] = useState(DEFAULT_TITLE_COUNT);
  const [search, setSearch] = useState("");
  const [manualBrief, setManualBrief] = useState("");
  const [referenceTitle, setReferenceTitle] = useState("");
  const [suggestions, setSuggestions] = useState<TitleFactorySuggestion[]>([]);
  const optionLabels = useMemo(() => buildNovelBasicInfoI18n(t), [t]);

  const autoBrief = useMemo(
    () => buildGenerationBrief(basicForm, t, optionLabels),
    [basicForm, optionLabels, t],
  );
  const resolvedBrief = useMemo(
    () => [
      autoBrief,
      manualBrief.trim() ? t("novelCreate.titleQuickFill.autoBrief.extra", { value: manualBrief.trim() }) : "",
    ].filter(Boolean).join("\n"),
    [autoBrief, manualBrief, t],
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
        throw new Error(t("novelCreate.titleQuickFill.error.missingContext"));
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
      toast.success(t("novelCreate.titleQuickFill.toast.generated", { count: next.length }));
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
      toast.success(t("novelCreate.titleQuickFill.toast.saved"));
    },
  });

  const handleApplyTitle = (title: string, source: "generated" | "library") => {
    onApplyTitle(title);
    setOpen(false);
    toast.success(
      source === "generated"
        ? t("novelCreate.titleQuickFill.toast.appliedGenerated")
        : t("novelCreate.titleQuickFill.toast.appliedLibrary"),
    );
  };

  const handleCopySuggestion = async (suggestion: TitleFactorySuggestion) => {
    await navigator.clipboard.writeText(suggestion.title);
    toast.success(t("novelCreate.titleQuickFill.toast.copied"));
  };

  return (
    <>
      <div className="flex items-center justify-end">
        <AiButton type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          {t("novelCreate.titleQuickFill.action")}
        </AiButton>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("novelCreate.titleQuickFill.title")}</DialogTitle>
            <DialogDescription>
              {t("novelCreate.titleQuickFill.description")}
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={mode}
            onValueChange={(value) => setMode(value as "generate" | "library")}
            className="space-y-4"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="generate">{t("novelCreate.titleQuickFill.tab.generate")}</TabsTrigger>
              <TabsTrigger value="library">{t("novelCreate.titleQuickFill.tab.library")}</TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="space-y-4">
              <div className="rounded-lg border bg-background/80 p-3">
                <div className="text-xs leading-6 text-muted-foreground">
                  {t("novelCreate.titleQuickFill.generate.description")}
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
                      {t("novelCreate.titleQuickFill.manualBrief.label")}
                    </label>
                    <textarea
                      id="novel-create-title-quick-brief"
                      className="min-h-[132px] w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      value={manualBrief}
                      onChange={(event) => setManualBrief(event.target.value)}
                      placeholder={t("novelCreate.titleQuickFill.manualBrief.placeholder")}
                    />
                    <div className="text-xs leading-6 text-muted-foreground">
                      {t("novelCreate.titleQuickFill.manualBrief.helper")}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label
                        htmlFor="novel-create-title-reference"
                        className="text-sm font-medium text-foreground"
                      >
                        {t("novelCreate.titleQuickFill.referenceTitle.label")}
                      </label>
                      <Input
                        id="novel-create-title-reference"
                        value={referenceTitle}
                        onChange={(event) => setReferenceTitle(event.target.value)}
                        placeholder={t("novelCreate.titleQuickFill.referenceTitle.placeholder")}
                      />
                    </div>
                    <div className="rounded-md border bg-muted/20 p-3 text-xs leading-6 text-muted-foreground">
                      {referenceTitle.trim()
                        ? t("novelCreate.titleQuickFill.referenceTitle.filledHelper")
                        : t("novelCreate.titleQuickFill.referenceTitle.emptyHelper")}
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-md border bg-muted/20 p-3">
                  <div className="text-xs font-medium text-foreground">{t("novelCreate.titleQuickFill.autoRead.title")}</div>
                  <div className="mt-2 whitespace-pre-wrap text-xs leading-6 text-muted-foreground">
                    {autoBrief || t("novelCreate.titleQuickFill.autoRead.empty")}
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-foreground">{t("novelCreate.titleQuickFill.count.label")}</span>
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
                    {generateMutation.isPending ? t("novelCreate.titleQuickFill.generating") : t("novelCreate.titleQuickFill.generateAction")}
                  </AiButton>
                </div>

                {!hasGenerationContext ? (
                  <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800">
                    {t("novelCreate.titleQuickFill.warning.missingContext")}
                  </div>
                ) : null}
              </div>

              <TitleSuggestionList
                suggestions={suggestions}
                selectedTitle={basicForm.title}
                primaryActionLabel={t("novelCreate.titleQuickFill.primaryAction")}
                onPrimaryAction={(suggestion) => handleApplyTitle(suggestion.title, "generated")}
                onCopy={handleCopySuggestion}
                onSave={(suggestion) => saveMutation.mutate(suggestion)}
                savingTitle={saveMutation.isPending ? saveMutation.variables?.title ?? "" : ""}
                emptyMessage={t("novelCreate.titleQuickFill.emptyGenerated")}
              />
            </TabsContent>

            <TabsContent value="library" className="space-y-4">
              <div className="flex flex-col gap-3 rounded-lg border bg-background/80 p-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-foreground">{t("novelCreate.titleQuickFill.library.title")}</div>
                  <div className="text-xs leading-6 text-muted-foreground">
                    {basicForm.genreId
                      ? t("novelCreate.titleQuickFill.library.descriptionFiltered")
                      : t("novelCreate.titleQuickFill.library.description")}
                  </div>
                </div>
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("novelCreate.titleQuickFill.library.searchPlaceholder")}
                  className="md:max-w-xs"
                />
              </div>

              {libraryQuery.isLoading ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  {t("novelCreate.titleQuickFill.library.loading")}
                </div>
              ) : (libraryQuery.data?.data?.items ?? []).length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  {t("novelCreate.titleQuickFill.library.empty")}
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
                                  {t("novelCreate.titleQuickFill.library.clickRate", { value: entry.clickRate })}
                                </Badge>
                              ) : null}
                              {typeof entry.usedCount === "number" ? (
                                <Badge variant="secondary">{t("novelCreate.titleQuickFill.library.usedCount", { value: entry.usedCount })}</Badge>
                              ) : null}
                              {entry.genre?.name ? <Badge variant="outline">{entry.genre.name}</Badge> : null}
                              {isSelected ? <Badge variant="outline">{t("novelCreate.titleQuickFill.library.selected")}</Badge> : null}
                            </div>
                            <div className="text-lg font-semibold text-foreground">{entry.title}</div>
                            <div className="text-sm leading-6 text-muted-foreground">
                              {renderLibraryDescription(entry, t)}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Button type="button" size="sm" onClick={() => handleApplyTitle(entry.title, "library")}>
                              {t("novelCreate.titleQuickFill.primaryAction")}
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
