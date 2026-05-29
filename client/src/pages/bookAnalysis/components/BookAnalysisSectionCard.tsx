import { useState } from "react";
import type { BookAnalysisSection } from "@ai-novel/shared/types/bookAnalysis";
import MarkdownViewer from "@/components/common/MarkdownViewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/i18n";
import type { SectionDraft } from "../bookAnalysis.types";
import { formatStatus } from "../bookAnalysis.utils";

interface BookAnalysisSectionCardProps {
  section: BookAnalysisSection;
  draft: SectionDraft;
  canOperate: boolean;
  isRegenerating: boolean;
  isOptimizing: boolean;
  isSaving: boolean;
  onDraftChange: (section: BookAnalysisSection, patch: Partial<SectionDraft>) => void;
  onRegenerate: (section: BookAnalysisSection) => void;
  onOptimize: (section: BookAnalysisSection) => void;
  onApplyOptimizePreview: (section: BookAnalysisSection) => void;
  onCancelOptimizePreview: (section: BookAnalysisSection) => void;
  onSave: (section: BookAnalysisSection) => void;
}

export default function BookAnalysisSectionCard(props: BookAnalysisSectionCardProps) {
  const {
    section,
    draft,
    canOperate,
    isRegenerating,
    isOptimizing,
    isSaving,
    onDraftChange,
    onRegenerate,
    onOptimize,
    onApplyOptimizePreview,
    onCancelOptimizePreview,
    onSave,
  } = props;
  const [draftMode, setDraftMode] = useState<"view" | "edit">("view");
  const { t } = useTranslation();

  const canRegenerate = canOperate && !draft.frozen && !isRegenerating;
  const canOptimize = canOperate && !draft.frozen && !isOptimizing && draft.optimizeInstruction.trim().length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CardTitle>{section.title}</CardTitle>
            <Badge variant="outline">{formatStatus(section.status, t)}</Badge>
            {draft.frozen ? <Badge variant="secondary">{t("bookAnalysis.section.frozenBadge")}</Badge> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!canRegenerate}
              onClick={() => onRegenerate(section)}
            >
              {t("bookAnalysis.section.regenerate")}
            </Button>
            <Button size="sm" disabled={!canOperate || isSaving} onClick={() => onSave(section)}>
              {t("bookAnalysis.section.save")}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.frozen}
            onChange={(event) => onDraftChange(section, { frozen: event.target.checked })}
          />
          {t("bookAnalysis.section.freezeLabel")}
        </label>

        {draft.frozen ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
            {t("bookAnalysis.section.frozenNotice")}
          </div>
        ) : null}

        <div className="space-y-2">
          <Tabs value={draftMode} onValueChange={(value) => setDraftMode(value as "view" | "edit")} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium">{t("bookAnalysis.section.draftTitle")}</div>
              <TabsList className="h-9">
                <TabsTrigger value="view">{t("bookAnalysis.section.viewTab")}</TabsTrigger>
                <TabsTrigger value="edit">{t("bookAnalysis.section.editTab")}</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="view" className="mt-0">
              <div className="min-h-[220px] rounded-md border bg-muted/20 p-4">
                {draft.editedContent.trim() ? (
                  <MarkdownViewer content={draft.editedContent} />
                ) : (
                  <div className="text-sm text-muted-foreground">{t("bookAnalysis.section.viewEmpty")}</div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="edit" className="mt-0">
              <textarea
                className="min-h-[220px] w-full rounded-md border bg-background p-3 text-sm"
                value={draft.editedContent}
                onChange={(event) => onDraftChange(section, { editedContent: event.target.value })}
                placeholder={t("bookAnalysis.section.editPlaceholder")}
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-2 rounded-md border p-3">
          <div className="text-sm font-medium">{t("bookAnalysis.section.optimize.title")}</div>
          <textarea
            className="min-h-[90px] w-full rounded-md border bg-background p-2 text-sm"
            value={draft.optimizeInstruction}
            onChange={(event) => onDraftChange(section, { optimizeInstruction: event.target.value })}
            placeholder={t("bookAnalysis.section.optimize.instructionPlaceholder")}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!canOptimize}
              onClick={() => onOptimize(section)}
            >
              {isOptimizing
                ? t("bookAnalysis.section.optimize.previewing")
                : t("bookAnalysis.section.optimize.preview")}
            </Button>
          </div>

          {draft.optimizePreview.trim() ? (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                {t("bookAnalysis.section.optimize.previewLabel")}
              </div>
              <div className="max-h-[320px] overflow-auto rounded-md border bg-muted/20 p-4">
                <MarkdownViewer content={draft.optimizePreview} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => onApplyOptimizePreview(section)}>
                  {t("bookAnalysis.section.optimize.apply")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => onCancelOptimizePreview(section)}>
                  {t("bookAnalysis.section.optimize.cancel")}
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <details className="rounded-md border p-3">
          <summary className="cursor-pointer text-sm font-medium">{t("bookAnalysis.section.advanced.summary")}</summary>
          <div className="mt-3 space-y-2">
            <div className="text-sm font-medium">{t("bookAnalysis.section.advanced.notesLabel")}</div>
            <textarea
              className="min-h-[120px] w-full rounded-md border bg-background p-3 text-sm"
              value={draft.notes}
              onChange={(event) => onDraftChange(section, { notes: event.target.value })}
              placeholder={t("bookAnalysis.section.advanced.notesPlaceholder")}
            />
          </div>
        </details>

        {section.evidence.length > 0 ? (
          <div className="space-y-2">
            <div className="text-sm font-medium">{t("bookAnalysis.section.evidence.title")}</div>
            <div className="space-y-2">
              {section.evidence.map((item, index) => (
                <div key={`${section.id}-${index}`} className="rounded-md border p-3 text-sm">
                  <div className="font-medium">
                    {t("bookAnalysis.section.evidence.itemHeading", { source: item.sourceLabel, label: item.label })}
                  </div>
                  <div className="mt-1 whitespace-pre-wrap text-muted-foreground">{item.excerpt}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
