import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Braces, Eye, LockKeyhole, RefreshCw, Search, ShieldCheck } from "lucide-react";
import {
  exportNovelPromptMaterials,
  getPromptCatalog,
  previewPrompt,
  type NovelMaterialBlock,
  type NovelMaterialImportance,
  type PromptCatalogItem,
  type PromptPreviewResult,
} from "@/api/promptWorkbench";
import { queryKeys } from "@/api/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import { PromptAddendumPanel } from "./components/PromptAddendumPanel";

const ENTRYPOINT_OPTIONS = [
  { value: "creative_hub", labelKey: "promptWorkbench.entrypoint.creative_hub" },
  { value: "auto_director", labelKey: "promptWorkbench.entrypoint.auto_director" },
  { value: "chapter_pipeline", labelKey: "promptWorkbench.entrypoint.chapter_pipeline" },
  { value: "manual_test", labelKey: "promptWorkbench.entrypoint.manual_test" },
];

function buildPreviewPromptInput(prompt: PromptCatalogItem): Record<string, unknown> {
  const base = {
    goal: "查看提示词预览",
    messages: [],
    contextMode: "novel",
    novelId: "novel-1",
    chapterTitle: "示例章节",
    chapterMission: "让主角发现关键线索。",
  };

  if (prompt.id === "novel.chapter_editor.workspace_diagnosis") {
    return {
      chapterTitle: "示例章节",
      chapterMission: "让主角发现关键线索。",
      volumePositionLabel: "第一卷中段",
      volumePhaseLabel: "冲突展开",
      paceDirective: "加快推进",
      previousChapterBridge: "上一章留下追踪线索。",
      nextChapterBridge: "下一章进入正面对抗。",
      activePlotThreads: ["追踪档案站"],
      paragraphs: [{ index: 1, text: "主角走进旧仓库。" }],
      openIssues: [],
    };
  }

  return base;
}

function statusBadgeVariant(status: PromptCatalogItem["managementStatus"]) {
  return status === "complete" ? "default" : "secondary";
}

function capabilityLabels(prompt: PromptCatalogItem): string[] {
  return [
    prompt.capabilities.hasOutputSchema ? "Schema" : null,
    prompt.capabilities.hasPostValidate ? "PostValidate" : null,
    prompt.capabilities.hasSemanticRetryPolicy ? "SemanticRetry" : null,
    prompt.capabilities.hasRepairPolicy ? "Repair" : null,
    prompt.capabilities.hasStructuredOutputHint ? "OutputHint" : null,
  ].filter(Boolean) as string[];
}

function PromptListItem({
  prompt,
  active,
  onSelect,
}: {
  prompt: PromptCatalogItem;
  active: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-md border px-3 py-3 text-left transition-colors",
        active ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-muted/60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">{prompt.id}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {prompt.version} · {prompt.taskType} · {prompt.mode}
          </div>
          <div className="mt-2 max-h-10 overflow-hidden text-xs leading-relaxed text-muted-foreground">
            {prompt.description}
          </div>
        </div>
        <Badge variant={prompt.addendumSupported ? "default" : statusBadgeVariant(prompt.managementStatus)} className="shrink-0">
          {prompt.addendumSupported ? t("promptWorkbench.list.canAddendum") : t(`promptWorkbench.managementStatus.${prompt.managementStatus}`)}
        </Badge>
      </div>
    </button>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-72 overflow-auto rounded-md bg-slate-950 p-3 text-xs leading-relaxed text-slate-100">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function MaterialBlockCard({ block }: { block: NovelMaterialBlock }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-md border">
      <div className="flex flex-col gap-2 border-b bg-muted/40 px-3 py-2 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{block.title}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {block.group} · {block.source.type}{block.source.id ? ` · ${block.source.id}` : ""}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={block.required ? "default" : "secondary"}>
            {t(`promptWorkbench.materialImportance.${block.importance as NovelMaterialImportance}`)}
          </Badge>
          <Badge variant="outline">{block.estimatedTokens} {t("promptWorkbench.materials.tokensSuffix")}</Badge>
        </div>
      </div>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap p-3 text-xs leading-relaxed">
        {block.content}
      </pre>
    </div>
  );
}

function PreviewPanel({ preview }: { preview: PromptPreviewResult | null }) {
  const { t } = useTranslation();
  if (!preview) {
    return (
      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        {t("promptWorkbench.preview.placeholder")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">{t("promptWorkbench.preview.entrypointLabel")}</div>
          <div className="mt-1 text-sm font-semibold">{preview.diagnostics.entrypoint}</div>
        </div>
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">{t("promptWorkbench.preview.estimatedTokens")}</div>
          <div className="mt-1 text-sm font-semibold">{preview.context.estimatedInputTokens}</div>
        </div>
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">{t("promptWorkbench.preview.selectedContext")}</div>
          <div className="mt-1 text-sm font-semibold">{preview.context.selectedBlockIds.length}</div>
        </div>
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">{t("promptWorkbench.preview.missingCount")}</div>
          <div className="mt-1 text-sm font-semibold">{preview.diagnostics.missingRequiredGroups.length}</div>
        </div>
      </div>

      {preview.diagnostics.notes.length > 0 ? (
        <div className="rounded-md border bg-amber-50 p-3 text-sm text-amber-900">
          {preview.diagnostics.notes.join(" ")}
        </div>
      ) : null}

      <DetailSection title={t("promptWorkbench.preview.finalMessages")}>
        <div className="space-y-3">
          {preview.messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className="rounded-md border">
              <div className="border-b bg-muted/50 px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
                {message.role}
              </div>
              <pre className="max-h-80 overflow-auto whitespace-pre-wrap p-3 text-xs leading-relaxed">
                {message.content}
              </pre>
            </div>
          ))}
        </div>
      </DetailSection>

      <DetailSection title={t("promptWorkbench.preview.contextDiagnosis")}>
        <JsonBlock
          value={{
            selectedBlockIds: preview.context.selectedBlockIds,
            droppedBlockIds: preview.context.droppedBlockIds,
            missingRequiredGroups: preview.diagnostics.missingRequiredGroups,
            resolverErrors: preview.diagnostics.resolverErrors,
            tracePreview: preview.diagnostics.tracePreview,
          }}
        />
      </DetailSection>
    </div>
  );
}

export default function PromptWorkbenchPage() {
  const { t } = useTranslation();
  const [keyword, setKeyword] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [entrypoint, setEntrypoint] = useState("manual_test");
  const [materialNovelId, setMaterialNovelId] = useState("");
  const [materialChapterId, setMaterialChapterId] = useState("");
  const [materialTaskId, setMaterialTaskId] = useState("");
  const [materialMaxTokens, setMaterialMaxTokens] = useState("6000");

  const catalogParamsKey = useMemo(() => JSON.stringify({ keyword: keyword.trim() }), [keyword]);
  const catalogQuery = useQuery({
    queryKey: queryKeys.promptWorkbench.catalog(catalogParamsKey),
    queryFn: () => getPromptCatalog(keyword.trim() ? { keyword: keyword.trim() } : {}),
    staleTime: 30_000,
  });

  const prompts = catalogQuery.data?.data ?? [];
  const selectedPrompt = prompts.find((item) => item.key === selectedKey) ?? prompts[0] ?? null;

  const previewMutation = useMutation({
    mutationFn: (prompt: PromptCatalogItem) => previewPrompt({
      promptKey: prompt.key,
      promptInput: buildPreviewPromptInput(prompt),
      executionContext: {
        entrypoint,
        novelId: "novel-1",
        chapterId: "chapter-1",
        userGoal: "查看提示词预览",
        resourceBindings: {
          novelId: "novel-1",
          chapterId: "chapter-1",
        },
      },
      maxContextTokens: prompt.contextPolicy.maxTokensBudget,
    }),
  });

  const materialGroups = useMemo(
    () => selectedPrompt?.contextRequirements.map((requirement) => requirement.group) ?? [],
    [selectedPrompt?.contextRequirements],
  );

  const materialsMutation = useMutation({
    mutationFn: () => exportNovelPromptMaterials({
      novelId: materialNovelId.trim(),
      chapterId: materialChapterId.trim() || undefined,
      taskId: materialTaskId.trim() || undefined,
      groups: materialGroups.length > 0 ? materialGroups : undefined,
      maxTokens: Number.parseInt(materialMaxTokens, 10) || 6000,
    }),
  });

  const selectedCapabilities = selectedPrompt ? capabilityLabels(selectedPrompt) : [];
  const preview = previewMutation.data?.data ?? null;
  const joinSeparator = t("promptWorkbench.materials.joinSeparator");

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="shrink-0 border-b bg-muted/20 px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Braces className="h-4 w-4" />
              {t("promptWorkbench.header.eyebrow")}
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-foreground">{t("promptWorkbench.header.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("promptWorkbench.header.subtitle")}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => void catalogQuery.refetch()}
            disabled={catalogQuery.isFetching}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", catalogQuery.isFetching && "animate-spin")} />
            {t("promptWorkbench.header.refresh")}
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-6 p-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col gap-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={t("promptWorkbench.list.searchPlaceholder")}
              className="pl-9"
            />
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {catalogQuery.isLoading ? (
              <div className="rounded-md border p-4 text-sm text-muted-foreground">{t("promptWorkbench.list.loading")}</div>
            ) : prompts.length === 0 ? (
              <div className="rounded-md border p-4 text-sm text-muted-foreground">{t("promptWorkbench.list.empty")}</div>
            ) : (
              prompts.map((prompt) => (
                <PromptListItem
                  key={prompt.key}
                  prompt={prompt}
                  active={prompt.key === selectedPrompt?.key}
                      onSelect={() => {
                        setSelectedKey(prompt.key);
                        previewMutation.reset();
                        materialsMutation.reset();
                      }}
                />
              ))
            )}
          </div>
        </aside>

        <main className="min-h-0 space-y-6 overflow-y-auto pr-1">
          {selectedPrompt ? (
            <>
              <Card className="rounded-lg">
                <CardHeader className="pb-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-xl tracking-normal">{selectedPrompt.id}</CardTitle>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge>{selectedPrompt.version}</Badge>
                        <Badge variant="secondary">{selectedPrompt.taskType}</Badge>
                        <Badge variant="secondary">{selectedPrompt.outputType}</Badge>
                        <Badge variant={statusBadgeVariant(selectedPrompt.managementStatus)}>
                          {t(`promptWorkbench.managementStatus.${selectedPrompt.managementStatus}`)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <select
                        value={entrypoint}
                        onChange={(event) => setEntrypoint(event.target.value)}
                        className="h-10 rounded-md border bg-background px-3 text-sm"
                      >
                        {ENTRYPOINT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-5 lg:grid-cols-2">
                  <DetailSection title={t("promptWorkbench.detail.purpose")}>
                    <div className="rounded-md border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
                      {selectedPrompt.description}
                    </div>
                  </DetailSection>

                  <DetailSection title={t("promptWorkbench.detail.basicInfo")}>
                    <JsonBlock
                      value={{
                        key: selectedPrompt.key,
                        language: selectedPrompt.language,
                        family: selectedPrompt.family,
                        maxTokensBudget: selectedPrompt.contextPolicy.maxTokensBudget,
                        addendumSupported: selectedPrompt.addendumSupported,
                        addendumScopes: selectedPrompt.addendumScopeLabels,
                      }}
                    />
                  </DetailSection>

                  <DetailSection title={t("promptWorkbench.detail.capabilities")}>
                    <div className="flex flex-wrap gap-2">
                      {selectedCapabilities.length > 0 ? selectedCapabilities.map((label) => (
                        <Badge key={label} variant="secondary">{label}</Badge>
                      )) : (
                        <span className="text-sm text-muted-foreground">{t("promptWorkbench.detail.noCapabilities")}</span>
                      )}
                    </div>
                  </DetailSection>

                  <DetailSection title={t("promptWorkbench.detail.contextRequirements")}>
                    <div className="space-y-2">
                      {selectedPrompt.contextRequirements.length > 0 ? selectedPrompt.contextRequirements.map((requirement) => (
                        <div key={requirement.group} className="rounded-md border p-3 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-semibold">{requirement.group}</span>
                            <Badge variant={requirement.required ? "default" : "outline"}>
                              {requirement.required ? t("promptWorkbench.detail.required") : t("promptWorkbench.detail.optional")}
                            </Badge>
                          </div>
                          {requirement.sourceHint ? (
                            <div className="mt-1 text-xs text-muted-foreground">{requirement.sourceHint}</div>
                          ) : null}
                        </div>
                      )) : (
                        <div className="rounded-md border p-3 text-sm text-muted-foreground">{t("promptWorkbench.detail.noContextRequirements")}</div>
                      )}
                    </div>
                  </DetailSection>

                  <DetailSection title={t("promptWorkbench.detail.safeEditBoundary")}>
                    <div className="space-y-3">
                      <div className="rounded-md border p-3">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                          <ShieldCheck className="h-4 w-4 text-primary" />
                          {t("promptWorkbench.detail.editableSlots")}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedPrompt.editableSlots.length > 0 ? selectedPrompt.editableSlots.map((slot) => (
                            <Badge key={slot.key} variant="secondary">{slot.label}</Badge>
                          )) : (
                            <span className="text-sm text-muted-foreground">{t("promptWorkbench.detail.noEditableSlots")}</span>
                          )}
                        </div>
                      </div>
                      <div className="rounded-md border p-3">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                          <LockKeyhole className="h-4 w-4 text-primary" />
                          {t("promptWorkbench.detail.lockedFields")}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedPrompt.lockedFields.map((field) => (
                            <Badge key={field} variant="outline">{field}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </DetailSection>
                </CardContent>
              </Card>

              <Card className="rounded-lg">
                <CardHeader>
                  <CardTitle className="text-lg tracking-normal">{t("promptWorkbench.detail.addendumSectionTitle")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <PromptAddendumPanel prompt={selectedPrompt} />
                </CardContent>
              </Card>

              <details className="rounded-lg border bg-card">
                <summary className="cursor-pointer px-6 py-4 text-lg font-semibold tracking-normal">
                  {t("promptWorkbench.detail.debugTitle")}
                </summary>
                <div className="space-y-6 border-t p-6">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold tracking-normal">{t("promptWorkbench.materials.title")}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("promptWorkbench.materials.subtitle")}
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => materialsMutation.mutate()}
                      disabled={materialsMutation.isPending || !materialNovelId.trim()}
                    >
                      {materialsMutation.isPending ? t("promptWorkbench.materials.loading") : t("promptWorkbench.materials.load")}
                    </Button>
                  </div>
                  <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-4">
                    <Input
                      value={materialNovelId}
                      onChange={(event) => setMaterialNovelId(event.target.value)}
                      placeholder={t("promptWorkbench.materials.novelIdPlaceholder")}
                    />
                    <Input
                      value={materialChapterId}
                      onChange={(event) => setMaterialChapterId(event.target.value)}
                      placeholder={t("promptWorkbench.materials.chapterIdPlaceholder")}
                    />
                    <Input
                      value={materialTaskId}
                      onChange={(event) => setMaterialTaskId(event.target.value)}
                      placeholder={t("promptWorkbench.materials.taskIdPlaceholder")}
                    />
                    <Input
                      value={materialMaxTokens}
                      onChange={(event) => setMaterialMaxTokens(event.target.value)}
                      placeholder={t("promptWorkbench.materials.budgetPlaceholder")}
                    />
                  </div>

                  <DetailSection title={t("promptWorkbench.materials.requiredGroups")}>
                    <div className="flex flex-wrap gap-2">
                      {materialGroups.length > 0 ? materialGroups.map((group) => (
                        <Badge key={group} variant="outline">{group}</Badge>
                      )) : (
                        <span className="text-sm text-muted-foreground">{t("promptWorkbench.materials.noRequiredGroups")}</span>
                      )}
                    </div>
                  </DetailSection>

                  {materialsMutation.data?.data ? (
                    <div className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-4">
                        <div className="rounded-md border p-3">
                          <div className="text-xs text-muted-foreground">{t("promptWorkbench.materials.received")}</div>
                          <div className="mt-1 text-sm font-semibold">{materialsMutation.data.data.blocks.length}</div>
                        </div>
                        <div className="rounded-md border p-3">
                          <div className="text-xs text-muted-foreground">{t("promptWorkbench.materials.missingGroups")}</div>
                          <div className="mt-1 text-sm font-semibold">{materialsMutation.data.data.missingGroups.length}</div>
                        </div>
                        <div className="rounded-md border p-3">
                          <div className="text-xs text-muted-foreground">{t("promptWorkbench.materials.missingInputs")}</div>
                          <div className="mt-1 text-sm font-semibold">{materialsMutation.data.data.missingInputs.length}</div>
                        </div>
                        <div className="rounded-md border p-3">
                          <div className="text-xs text-muted-foreground">{t("promptWorkbench.materials.warnings")}</div>
                          <div className="mt-1 text-sm font-semibold">{materialsMutation.data.data.warnings.length}</div>
                        </div>
                      </div>

                      {materialsMutation.data.data.missingInputs.length > 0 ? (
                        <div className="rounded-md border bg-amber-50 p-3 text-sm text-amber-900">
                          {t("promptWorkbench.materials.missingInputsList", { value: materialsMutation.data.data.missingInputs.join(joinSeparator) })}
                        </div>
                      ) : null}
                      {materialsMutation.data.data.missingGroups.length > 0 ? (
                        <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                          {t("promptWorkbench.materials.missingGroupsList", { value: materialsMutation.data.data.missingGroups.join(joinSeparator) })}
                        </div>
                      ) : null}
                      {materialsMutation.data.data.warnings.length > 0 ? (
                        <div className="rounded-md border bg-amber-50 p-3 text-sm text-amber-900">
                          {materialsMutation.data.data.warnings.join(" ")}
                        </div>
                      ) : null}

                      <div className="space-y-3">
                        {materialsMutation.data.data.blocks.map((item) => (
                          <MaterialBlockCard key={item.id} block={item} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                      {t("promptWorkbench.materials.placeholder")}
                    </div>
                  )}

                  <div className="border-t pt-6">
                    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h2 className="text-lg font-semibold tracking-normal">{t("promptWorkbench.previewActions.title")}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t("promptWorkbench.previewActions.subtitle")}
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={() => previewMutation.mutate(selectedPrompt)}
                        disabled={previewMutation.isPending}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        {previewMutation.isPending ? t("promptWorkbench.previewActions.previewing") : t("promptWorkbench.previewActions.generate")}
                      </Button>
                    </div>
                    <PreviewPanel preview={preview} />
                  </div>
                </div>
                </div>
              </details>
            </>
          ) : (
            <div className="rounded-md border p-6 text-sm text-muted-foreground">{t("promptWorkbench.detail.selectPromptHint")}</div>
          )}
        </main>
      </div>
    </div>
  );
}
