import { useEffect, useState } from "react";
import type { BookAnalysis } from "@ai-novel/shared/types/bookAnalysis";
import type { KnowledgeDocumentDetail, KnowledgeDocumentSummary } from "@ai-novel/shared/types/knowledge";
import type { StyleExtractionSourceProcessingMode, StyleTemplate } from "@ai-novel/shared/types/styleEngine";
import type { UnifiedTaskDetail } from "@ai-novel/shared/types/task";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/i18n";
import type { Translator } from "../writingFormulaRulePresentation";
import type {
  WritingFormulaCreateFormState,
  WritingFormulaMaterialSource,
} from "../useWritingFormulaCreateFlow";

type ExtractionPresetKey = "imitate" | "balanced" | "transfer";

const EXTRACTION_PRESET_KEYS: ExtractionPresetKey[] = ["imitate", "balanced", "transfer"];

const MATERIAL_SOURCE_KEYS: WritingFormulaMaterialSource[] = [
  "direct_text",
  "knowledge_document",
  "book_analysis",
];

const KNOWLEDGE_SOURCE_PROCESSING_KEYS: StyleExtractionSourceProcessingMode[] = [
  "representative_sample",
  "full_text",
];

function getExtractionPreset(t: Translator, key: ExtractionPresetKey) {
  return {
    key,
    label: t(`writingFormula.createDialog.extractionPresets.${key}.label`),
    summary: t(`writingFormula.createDialog.extractionPresets.${key}.summary`),
  };
}

function getMaterialSourceOption(t: Translator, key: WritingFormulaMaterialSource) {
  const i18nKey = key === "direct_text"
    ? "directText"
    : key === "knowledge_document"
      ? "knowledgeDocument"
      : "bookAnalysis";
  return {
    key,
    label: t(`writingFormula.createDialog.materialSources.${i18nKey}.label`),
    summary: t(`writingFormula.createDialog.materialSources.${i18nKey}.summary`),
  };
}

function getKnowledgeProcessingOption(t: Translator, key: StyleExtractionSourceProcessingMode) {
  const i18nKey = key === "representative_sample" ? "representativeSample" : "fullText";
  const baseLabel = `writingFormula.createDialog.knowledgeProcessing.${i18nKey}`;
  const badgeKey = `${baseLabel}.badge`;
  const badge = t(badgeKey);
  return {
    key,
    label: t(`${baseLabel}.label`),
    summary: t(`${baseLabel}.summary`),
    badge: badge && badge !== badgeKey ? badge : undefined,
  };
}

function formatTaskStatus(t: Translator, task: UnifiedTaskDetail | null): string {
  if (!task) {
    return t("writingFormula.createDialog.taskStatus.none");
  }
  switch (task.status) {
    case "queued":
      return t("writingFormula.createDialog.taskStatus.queued");
    case "running":
      return t("writingFormula.createDialog.taskStatus.running");
    case "succeeded":
      return t("writingFormula.createDialog.taskStatus.succeeded");
    case "failed":
      return t("writingFormula.createDialog.taskStatus.failed");
    case "cancelled":
      return t("writingFormula.createDialog.taskStatus.cancelled");
    default:
      return t("writingFormula.createDialog.taskStatus.pending");
  }
}

function formatCharCount(t: Translator, value: number | null | undefined): string {
  if (!value) {
    return t("writingFormula.createDialog.charCountZero");
  }
  return t("writingFormula.createDialog.charCount", { value: value.toLocaleString() });
}

function formatKnowledgeStatus(t: Translator, status: KnowledgeDocumentSummary["status"]): string {
  if (status === "enabled") {
    return t("writingFormula.createDialog.knowledgeStatus.enabled");
  }
  if (status === "disabled") {
    return t("writingFormula.createDialog.knowledgeStatus.disabled");
  }
  return t("writingFormula.createDialog.knowledgeStatus.archived");
}

interface WritingFormulaCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: WritingFormulaCreateFormState;
  onFormChange: (patch: Partial<WritingFormulaCreateFormState>) => void;
  templates: StyleTemplate[];
  createManualPending: boolean;
  createFromBriefPending: boolean;
  createFromTemplatePending: boolean;
  extractTaskSubmitting: boolean;
  activeExtractionTask: UnifiedTaskDetail | null;
  knowledgeDocuments: KnowledgeDocumentSummary[];
  knowledgeDocumentsLoading: boolean;
  selectedKnowledgeDocument: KnowledgeDocumentDetail | null;
  selectedKnowledgeDocumentLoading: boolean;
  bookAnalyses: BookAnalysis[];
  bookAnalysesLoading: boolean;
  selectedPresetKey: ExtractionPresetKey;
  onCreateManual: () => void;
  onCreateFromBrief: () => void;
  onCreateFromTemplate: (templateId: string) => void;
  onPresetChange: (value: ExtractionPresetKey) => void;
  onSubmitExtractionTask: () => void;
  onOpenTaskCenter?: (task: UnifiedTaskDetail) => void;
}

export default function WritingFormulaCreateDialog(props: WritingFormulaCreateDialogProps) {
  const { t } = useTranslation();
  const {
    open,
    onOpenChange,
    form,
    onFormChange,
    templates,
    createManualPending,
    createFromBriefPending,
    createFromTemplatePending,
    extractTaskSubmitting,
    activeExtractionTask,
    knowledgeDocuments,
    knowledgeDocumentsLoading,
    selectedKnowledgeDocument,
    selectedKnowledgeDocumentLoading,
    bookAnalyses,
    bookAnalysesLoading,
    selectedPresetKey,
    onCreateManual,
    onCreateFromBrief,
    onCreateFromTemplate,
    onPresetChange,
    onSubmitExtractionTask,
    onOpenTaskCenter,
  } = props;
  const [activeTab, setActiveTab] = useState<"quick_start" | "blank" | "extract">("quick_start");

  useEffect(() => {
    if (open && activeExtractionTask) {
      setActiveTab("extract");
    }
  }, [activeExtractionTask, open]);

  const extractionPresetOptions = EXTRACTION_PRESET_KEYS.map((key) => getExtractionPreset(t, key));
  const materialSourceOptions = MATERIAL_SOURCE_KEYS.map((key) => getMaterialSourceOption(t, key));
  const knowledgeProcessingOptions = KNOWLEDGE_SOURCE_PROCESSING_KEYS.map((key) =>
    getKnowledgeProcessingOption(t, key),
  );

  const extractionTaskIsActive = activeExtractionTask?.status === "queued" || activeExtractionTask?.status === "running";
  const selectedPreset = extractionPresetOptions.find((item) => item.key === selectedPresetKey) ?? extractionPresetOptions[1];
  const activeKnowledgeVersion = selectedKnowledgeDocument?.versions.find((version) => version.isActive) ?? null;
  const selectedBookAnalysis = bookAnalyses.find((analysis) => analysis.id === form.bookAnalysisId) ?? null;
  const knowledgeDocumentReady = Boolean(
    selectedKnowledgeDocument
      && selectedKnowledgeDocument.status !== "archived"
      && activeKnowledgeVersion
      && activeKnowledgeVersion.content.trim(),
  );
  const bookAnalysisReady = Boolean(form.bookAnalysisId);
  const materialSubmitDisabled = extractTaskSubmitting
    || (form.materialSource !== "book_analysis" && extractionTaskIsActive)
    || !form.extractName.trim()
    || (form.materialSource === "direct_text" && !form.extractSourceText.trim())
    || (form.materialSource === "knowledge_document" && !knowledgeDocumentReady)
    || (form.materialSource === "book_analysis" && !bookAnalysisReady);
  const materialSubmitLabel = form.materialSource === "book_analysis"
    ? t("writingFormula.createDialog.extract.submit.bookAnalysis")
    : form.materialSource === "knowledge_document"
      ? t("writingFormula.createDialog.extract.submit.knowledge")
      : t("writingFormula.createDialog.extract.submit.directText");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-5xl flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>{t("writingFormula.createDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("writingFormula.createDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="flex min-h-0 flex-1 flex-col space-y-4">
          <TabsList className="grid w-full shrink-0 grid-cols-3">
            <TabsTrigger value="quick_start">{t("writingFormula.createDialog.tabs.quickStart")}</TabsTrigger>
            <TabsTrigger value="blank">{t("writingFormula.createDialog.tabs.blank")}</TabsTrigger>
            <TabsTrigger value="extract">{t("writingFormula.createDialog.tabs.extract")}</TabsTrigger>
          </TabsList>

          <TabsContent value="quick_start" className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            <div className="rounded-lg border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
              {t("writingFormula.createDialog.quickStart.intro")}
            </div>
            <div className="grid gap-3 pr-1 md:grid-cols-2">
              {templates.map((template) => (
                <div key={template.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-foreground">{template.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{template.category}</div>
                    </div>
                    <Badge variant="outline">{t("writingFormula.createDialog.quickStart.templateBadge")}</Badge>
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
                      {t("writingFormula.createDialog.quickStart.applicableTo", { value: template.applicableGenres.join(" / ") })}
                    </div>
                  ) : null}
                  <Button
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => onCreateFromTemplate(template.id)}
                    disabled={createFromTemplatePending}
                  >
                    {createFromTemplatePending
                      ? t("writingFormula.createDialog.quickStart.creating")
                      : t("writingFormula.createDialog.quickStart.createFromTemplate")}
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="blank" className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            <div className="rounded-lg border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
              {t("writingFormula.createDialog.blank.intro")}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border p-4">
                <div className="mb-3">
                  <div className="text-sm font-medium text-foreground">{t("writingFormula.createDialog.blank.manualTitle")}</div>
                  <div className="mt-1 text-xs leading-5 text-muted-foreground">
                    {t("writingFormula.createDialog.blank.manualHint")}
                  </div>
                </div>
                <div className="space-y-3">
                  <input
                    className="w-full rounded-md border p-2 text-sm"
                    placeholder={t("writingFormula.createDialog.blank.manualNamePlaceholder")}
                    value={form.manualName}
                    onChange={(event) => onFormChange({ manualName: event.target.value })}
                  />
                  <Button
                    className="w-full"
                    onClick={onCreateManual}
                    disabled={!form.manualName.trim() || createManualPending}
                  >
                    {createManualPending
                      ? t("writingFormula.createDialog.blank.manualCreating")
                      : t("writingFormula.createDialog.blank.manualSubmit")}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="mb-3">
                  <div className="text-sm font-medium text-foreground">{t("writingFormula.createDialog.blank.aiTitle")}</div>
                  <div className="mt-1 text-xs leading-5 text-muted-foreground">
                    {t("writingFormula.createDialog.blank.aiHint")}
                  </div>
                </div>
                <div className="space-y-3">
                  <input
                    className="w-full rounded-md border p-2 text-sm"
                    placeholder={t("writingFormula.createDialog.blank.aiNamePlaceholder")}
                    value={form.briefName}
                    onChange={(event) => onFormChange({ briefName: event.target.value })}
                  />
                  <input
                    className="w-full rounded-md border p-2 text-sm"
                    placeholder={t("writingFormula.createDialog.blank.aiCategoryPlaceholder")}
                    value={form.briefCategory}
                    onChange={(event) => onFormChange({ briefCategory: event.target.value })}
                  />
                  <textarea
                    className="min-h-[180px] w-full rounded-md border p-2 text-sm"
                    placeholder={t("writingFormula.createDialog.blank.aiBriefPlaceholder")}
                    value={form.briefPrompt}
                    onChange={(event) => onFormChange({ briefPrompt: event.target.value })}
                  />
                  <Button
                    className="w-full"
                    onClick={onCreateFromBrief}
                    disabled={!form.briefPrompt.trim() || createFromBriefPending}
                  >
                    {createFromBriefPending
                      ? t("writingFormula.createDialog.blank.aiGenerating")
                      : t("writingFormula.createDialog.blank.aiSubmit")}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="extract" className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            <div className="rounded-lg border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
              {t("writingFormula.createDialog.extract.intro")}
            </div>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
              <div className="space-y-4 rounded-lg border p-4">
                <div className={form.materialSource === "book_analysis" ? "grid gap-3" : "grid gap-3 md:grid-cols-2"}>
                  <input
                    className="rounded-md border p-2 text-sm"
                    placeholder={t("writingFormula.createDialog.extract.namePlaceholder")}
                    value={form.extractName}
                    onChange={(event) => onFormChange({ extractName: event.target.value })}
                  />
                  {form.materialSource !== "book_analysis" ? (
                    <input
                      className="rounded-md border p-2 text-sm"
                      placeholder={t("writingFormula.createDialog.extract.categoryPlaceholder")}
                      value={form.extractCategory}
                      onChange={(event) => onFormChange({ extractCategory: event.target.value })}
                    />
                  ) : null}
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  {materialSourceOptions.map((option) => {
                    const active = option.key === form.materialSource;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        className={`rounded-2xl border px-3 py-3 text-left transition ${
                          active
                            ? "border-slate-950 bg-slate-950 text-white shadow"
                            : "border-slate-200 bg-white hover:border-slate-400"
                        }`}
                        onClick={() => onFormChange({ materialSource: option.key })}
                      >
                        <div className="text-sm font-semibold">{option.label}</div>
                        <div className={`mt-1 text-xs leading-5 ${active ? "text-slate-200" : "text-slate-500"}`}>
                          {option.summary}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {form.materialSource === "direct_text" ? (
                  <textarea
                    className="min-h-[260px] w-full rounded-md border p-2 text-sm"
                    placeholder={t("writingFormula.createDialog.extract.directTextPlaceholder")}
                    value={form.extractSourceText}
                    onChange={(event) => onFormChange({ extractSourceText: event.target.value })}
                  />
                ) : null}

                {form.materialSource === "knowledge_document" ? (
                  <div className="space-y-3">
                    <input
                      className="w-full rounded-md border p-2 text-sm"
                      placeholder={t("writingFormula.createDialog.extract.knowledgeSearchPlaceholder")}
                      value={form.knowledgeSearchKeyword}
                      onChange={(event) => onFormChange({ knowledgeSearchKeyword: event.target.value })}
                    />
                    <div className="grid max-h-[220px] gap-2 overflow-y-auto pr-1">
                      {knowledgeDocumentsLoading && knowledgeDocuments.length === 0 ? (
                        <div className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                          {t("writingFormula.createDialog.extract.knowledgeLoading")}
                        </div>
                      ) : null}
                      {!knowledgeDocumentsLoading && knowledgeDocuments.length === 0 ? (
                        <div className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                          {t("writingFormula.createDialog.extract.knowledgeNotFound")}
                        </div>
                      ) : null}
                      {knowledgeDocuments.map((document) => {
                        const selected = document.id === form.knowledgeDocumentId;
                        return (
                          <button
                            key={document.id}
                            type="button"
                            className={`rounded-xl border px-3 py-3 text-left transition ${
                              selected ? "border-slate-950 bg-slate-50" : "border-slate-200 bg-white hover:border-slate-400"
                            }`}
                            disabled={document.status === "archived"}
                            onClick={() => onFormChange({
                              knowledgeDocumentId: document.id,
                              knowledgeDocumentTitle: document.title,
                              extractName: form.extractName.trim()
                                ? form.extractName
                                : t("writingFormula.createDialog.extract.knowledgeTitleSuffix", { title: document.title }),
                            })}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-medium text-slate-950">{document.title}</div>
                                <div className="mt-1 text-xs leading-5 text-slate-500">{document.fileName}</div>
                              </div>
                              <Badge variant={selected ? "default" : "outline"}>
                                {selected
                                  ? t("writingFormula.createDialog.extract.knowledgeSelected")
                                  : formatKnowledgeStatus(t, document.status)}
                              </Badge>
                            </div>
                            <div className="mt-2 text-xs leading-5 text-slate-500">
                              {t("writingFormula.createDialog.extract.knowledgeMeta", {
                                version: document.activeVersionNumber,
                                versionCount: document.versionCount,
                                analysisCount: document.bookAnalysisCount,
                              })}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="space-y-2 rounded-xl border bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-medium text-slate-950">{t("writingFormula.createDialog.extract.knowledgeProcessingTitle")}</div>
                        {activeKnowledgeVersion ? (
                          <div className="text-xs text-slate-500">
                            {t("writingFormula.createDialog.extract.knowledgeSnapshot", { value: formatCharCount(t, activeKnowledgeVersion.charCount) })}
                          </div>
                        ) : null}
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        {knowledgeProcessingOptions.map((option) => {
                          const active = option.key === form.knowledgeSourceProcessingMode;
                          return (
                            <button
                              key={option.key}
                              type="button"
                              className={`rounded-xl border px-3 py-3 text-left transition ${
                                active
                                  ? "border-slate-950 bg-slate-950 text-white"
                                  : "border-slate-200 bg-white hover:border-slate-400"
                              }`}
                              onClick={() => onFormChange({ knowledgeSourceProcessingMode: option.key })}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-sm font-semibold">{option.label}</div>
                                {option.badge ? (
                                  <Badge variant={active ? "secondary" : "outline"}>{option.badge}</Badge>
                                ) : null}
                              </div>
                              <div className={`mt-1 text-xs leading-5 ${active ? "text-slate-200" : "text-slate-500"}`}>
                                {option.summary}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {form.knowledgeSourceProcessingMode === "representative_sample" ? (
                        <div className="text-xs leading-5 text-slate-500">
                          {t("writingFormula.createDialog.extract.knowledgeSampleHint")}
                        </div>
                      ) : (
                        <div className="text-xs leading-5 text-amber-700">
                          {t("writingFormula.createDialog.extract.knowledgeFullTextWarning")}
                        </div>
                      )}
                    </div>
                    <div className="rounded-xl border bg-slate-50/80 p-3 text-sm leading-6 text-slate-700">
                      {selectedKnowledgeDocumentLoading ? (
                        t("writingFormula.createDialog.extract.knowledgePreviewLoading")
                      ) : selectedKnowledgeDocument ? (
                        <>
                          <div className="font-medium text-slate-950">{selectedKnowledgeDocument.title}</div>
                          {activeKnowledgeVersion ? (
                            <div className="mt-1 text-xs text-slate-500">
                              {t("writingFormula.createDialog.extract.knowledgeActiveVersion", {
                                version: activeKnowledgeVersion.versionNumber,
                                value: formatCharCount(t, activeKnowledgeVersion.charCount),
                              })}
                            </div>
                          ) : (
                            <div className="mt-1 text-xs text-amber-700">{t("writingFormula.createDialog.extract.knowledgeMissingActive")}</div>
                          )}
                          {activeKnowledgeVersion && !activeKnowledgeVersion.content.trim() ? (
                            <div className="mt-1 text-xs text-amber-700">{t("writingFormula.createDialog.extract.knowledgeEmptyContent")}</div>
                          ) : null}
                        </>
                      ) : (
                        t("writingFormula.createDialog.extract.knowledgePromptSelect")
                      )}
                    </div>
                  </div>
                ) : null}

                {form.materialSource === "book_analysis" ? (
                  <div className="space-y-3">
                    <input
                      className="w-full rounded-md border p-2 text-sm"
                      placeholder={t("writingFormula.createDialog.extract.bookAnalysisSearchPlaceholder")}
                      value={form.bookAnalysisSearchKeyword}
                      onChange={(event) => onFormChange({ bookAnalysisSearchKeyword: event.target.value })}
                    />
                    <div className="grid max-h-[290px] gap-2 overflow-y-auto pr-1">
                      {bookAnalysesLoading && bookAnalyses.length === 0 ? (
                        <div className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                          {t("writingFormula.createDialog.extract.bookAnalysisLoading")}
                        </div>
                      ) : null}
                      {!bookAnalysesLoading && bookAnalyses.length === 0 ? (
                        <div className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                          {t("writingFormula.createDialog.extract.bookAnalysisNotFound")}
                        </div>
                      ) : null}
                      {bookAnalyses.map((analysis) => {
                        const selected = analysis.id === form.bookAnalysisId;
                        return (
                          <button
                            key={analysis.id}
                            type="button"
                            className={`rounded-xl border px-3 py-3 text-left transition ${
                              selected ? "border-slate-950 bg-slate-50" : "border-slate-200 bg-white hover:border-slate-400"
                            }`}
                            onClick={() => onFormChange({
                              bookAnalysisId: analysis.id,
                              bookAnalysisTitle: analysis.title,
                              extractName: form.extractName.trim()
                                ? form.extractName
                                : t("writingFormula.createDialog.extract.bookAnalysisTitleSuffix", { title: analysis.title }),
                            })}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-medium text-slate-950">{analysis.title}</div>
                                <div className="mt-1 text-xs leading-5 text-slate-500">{analysis.documentTitle}</div>
                              </div>
                              <Badge variant={selected ? "default" : "outline"}>
                                {selected
                                  ? t("writingFormula.createDialog.extract.knowledgeSelected")
                                  : t("writingFormula.createDialog.extract.bookAnalysisAvailable")}
                              </Badge>
                            </div>
                            <div className="mt-2 text-xs leading-5 text-slate-500">
                              {t("writingFormula.createDialog.extract.bookAnalysisMeta", {
                                version: analysis.documentVersionNumber,
                                summary: analysis.summary || t("writingFormula.createDialog.extract.bookAnalysisFallbackSummary"),
                              })}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <div className="sticky bottom-0 -mx-4 border-t bg-white/95 px-4 py-3 backdrop-blur">
                  <Button
                    className="w-full"
                    onClick={onSubmitExtractionTask}
                    disabled={materialSubmitDisabled}
                  >
                    {extractTaskSubmitting
                      ? form.materialSource === "book_analysis"
                        ? t("writingFormula.createDialog.extract.submit.generating")
                        : t("writingFormula.createDialog.extract.submit.submitting")
                      : extractionTaskIsActive && form.materialSource !== "book_analysis"
                        ? t("writingFormula.createDialog.extract.submit.running")
                        : materialSubmitLabel}
                  </Button>
                </div>
              </div>

              <div className="space-y-4 rounded-lg border p-4">
                {form.materialSource === "book_analysis" ? (
                  <>
                    <div>
                      <div className="text-sm font-medium text-foreground">{t("writingFormula.createDialog.extract.bookAnalysisPanel.title")}</div>
                      <div className="mt-1 text-xs leading-5 text-muted-foreground">
                        {t("writingFormula.createDialog.extract.bookAnalysisPanel.hint")}
                      </div>
                    </div>
                    <div className="rounded-xl border bg-slate-50/80 p-4 text-sm leading-6 text-slate-700">
                      {selectedBookAnalysis ? (
                        <>
                          <div className="font-medium text-slate-950">{selectedBookAnalysis.title}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {t("writingFormula.createDialog.extract.bookAnalysisPanel.sourceLabel", {
                              title: selectedBookAnalysis.documentTitle,
                              version: selectedBookAnalysis.documentVersionNumber,
                            })}
                          </div>
                          {selectedBookAnalysis.summary ? (
                            <div className="mt-3 text-xs leading-6 text-slate-600">{selectedBookAnalysis.summary}</div>
                          ) : null}
                        </>
                      ) : (
                        t("writingFormula.createDialog.extract.bookAnalysisPanel.promptSelect")
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div className="text-sm font-medium text-foreground">{t("writingFormula.createDialog.extract.presetPanel.title")}</div>
                      <div className="mt-1 text-xs leading-5 text-muted-foreground">
                        {t("writingFormula.createDialog.extract.presetPanel.hint")}
                      </div>
                    </div>
                    <div className="grid gap-3">
                      {extractionPresetOptions.map((preset) => {
                        const active = preset.key === selectedPresetKey;
                        return (
                          <button
                            key={preset.key}
                            type="button"
                            className={`rounded-2xl border px-4 py-4 text-left transition ${
                              active
                                ? "border-slate-950 bg-slate-950 text-white shadow-lg"
                                : "border-slate-200 bg-white hover:border-slate-400"
                            }`}
                            onClick={() => onPresetChange(preset.key)}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-base font-semibold">{preset.label}</div>
                              {active ? (
                                <Badge variant="secondary" className="bg-white/10 text-white">
                                  {t("writingFormula.createDialog.extract.presetPanel.currentScheme")}
                                </Badge>
                              ) : null}
                            </div>
                            <div className={`mt-2 text-sm leading-6 ${active ? "text-slate-200" : "text-slate-600"}`}>
                              {preset.summary}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="rounded-xl border bg-amber-50/80 p-3 text-xs leading-6 text-amber-900">
                      {t("writingFormula.createDialog.extract.presetPanel.presetSubmitHint", { label: selectedPreset.label })}
                    </div>
                    {activeExtractionTask ? (
                      <div className="rounded-xl border bg-slate-50/80 p-4 text-sm text-slate-700">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium text-slate-900">{t("writingFormula.createDialog.extract.task.title")}</div>
                          <Badge variant={extractionTaskIsActive ? "secondary" : "outline"}>
                            {formatTaskStatus(t, activeExtractionTask)}
                          </Badge>
                        </div>
                        <div className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
                          <div>{t("writingFormula.createDialog.extract.task.taskTitle", { title: activeExtractionTask.title })}</div>
                          <div>{t("writingFormula.createDialog.extract.task.stage", { value: activeExtractionTask.currentStage ?? t("writingFormula.createDialog.extract.task.stageWaiting") })}</div>
                          <div>{t("writingFormula.createDialog.extract.task.progress", { percent: Math.round(activeExtractionTask.progress * 100) })}</div>
                          {activeExtractionTask.failureSummary ? (
                            <div className="text-rose-600">{t("writingFormula.createDialog.extract.task.failure", { reason: activeExtractionTask.failureSummary })}</div>
                          ) : null}
                        </div>
                        {onOpenTaskCenter ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="mt-4 w-full"
                            onClick={() => onOpenTaskCenter(activeExtractionTask)}
                          >
                            {t("writingFormula.createDialog.extract.task.openTaskCenter")}
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed p-4 text-sm leading-6 text-muted-foreground">
                        {t("writingFormula.createDialog.extract.task.noTaskHint")}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
