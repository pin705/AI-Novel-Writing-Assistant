import type { BookAnalysisDetail, BookAnalysisPublishResult, BookAnalysisSection } from "@ai-novel/shared/types/bookAnalysis";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n";
import type { AggregatedEvidenceItem, SectionDraft } from "../bookAnalysis.types";
import { formatDate, formatStage, formatStatus } from "../bookAnalysis.utils";
import BookAnalysisSectionCard from "./BookAnalysisSectionCard";

type ExportFormat = "markdown" | "json";

interface NovelOption {
  id: string;
  title: string;
}

interface PendingState {
  copy: boolean;
  rebuild: boolean;
  archive: boolean;
  regenerate: boolean;
  optimizePreview: boolean;
  saveSection: boolean;
  publish: boolean;
  createStyleProfile: boolean;
}

interface BookAnalysisDetailPanelProps {
  selectedAnalysis?: BookAnalysisDetail;
  novelOptions: NovelOption[];
  selectedNovelId: string;
  publishFeedback: string;
  styleProfileFeedback: string;
  lastPublishResult: BookAnalysisPublishResult | null;
  aggregatedEvidence: AggregatedEvidenceItem[];
  optimizingSectionKey: BookAnalysisSection["sectionKey"] | null;
  pending: PendingState;
  onSelectedNovelChange: (novelId: string) => void;
  onCopy: () => void;
  onRebuild: (analysisId: string) => void;
  onArchive: (analysisId: string) => void;
  onDownload: (format: ExportFormat) => void;
  onPublish: () => void;
  onCreateStyleProfile: () => void;
  onRegenerateSection: (section: BookAnalysisSection) => void;
  onOptimizeSection: (section: BookAnalysisSection) => void;
  onApplyOptimizePreview: (section: BookAnalysisSection) => void;
  onCancelOptimizePreview: (section: BookAnalysisSection) => void;
  onSaveSection: (section: BookAnalysisSection) => void;
  onDraftChange: (section: BookAnalysisSection, patch: Partial<SectionDraft>) => void;
  getSectionDraft: (section: BookAnalysisSection) => SectionDraft;
}

export default function BookAnalysisDetailPanel(props: BookAnalysisDetailPanelProps) {
  const {
    selectedAnalysis,
    novelOptions,
    selectedNovelId,
    publishFeedback,
    styleProfileFeedback,
    lastPublishResult,
    aggregatedEvidence,
    optimizingSectionKey,
    pending,
    onSelectedNovelChange,
    onCopy,
    onRebuild,
    onArchive,
    onDownload,
    onPublish,
    onCreateStyleProfile,
    onRegenerateSection,
    onOptimizeSection,
    onApplyOptimizePreview,
    onCancelOptimizePreview,
    onSaveSection,
    onDraftChange,
    getSectionDraft,
  } = props;
  const { t } = useTranslation();

  if (!selectedAnalysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("bookAnalysis.detail.empty.title")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t("bookAnalysis.detail.empty.description")}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>{selectedAnalysis.title}</CardTitle>
              <CardDescription>
                {t("bookAnalysis.detail.header.documentInfo", {
                  document: selectedAnalysis.documentTitle,
                  version: selectedAnalysis.documentVersionNumber,
                })}
                {selectedAnalysis.isCurrentVersion
                  ? ""
                  : t("bookAnalysis.detail.header.activeVersionSuffix", {
                    version: selectedAnalysis.currentDocumentVersionNumber,
                  })}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{formatStatus(selectedAnalysis.status, t)}</Badge>
              {selectedAnalysis.publishedDocumentId && (
                <Badge variant="secondary">{t("bookAnalysis.detail.header.publishedBadge")}</Badge>
              )}
              <Badge variant="outline">
                {t("bookAnalysis.detail.header.progress", { percent: Math.round(selectedAnalysis.progress * 100) })}
              </Badge>
              <Button size="sm" variant="outline" onClick={onCopy} disabled={pending.copy}>
                {t("bookAnalysis.detail.header.copy")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRebuild(selectedAnalysis.id)}
                disabled={pending.rebuild || selectedAnalysis.status === "archived"}
              >
                {t("bookAnalysis.detail.header.rebuild")}
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to={`/tasks?kind=book_analysis&id=${selectedAnalysis.id}`}>
                  {t("bookAnalysis.detail.header.openInTasks")}
                </Link>
              </Button>
              <Button size="sm" variant="outline" onClick={() => onDownload("markdown")}>
                {t("bookAnalysis.detail.header.exportMarkdown")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => onDownload("json")}>
                {t("bookAnalysis.detail.header.exportJson")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onCreateStyleProfile}
                disabled={pending.createStyleProfile || selectedAnalysis.status === "archived"}
              >
                {pending.createStyleProfile
                  ? t("bookAnalysis.detail.header.generatingStyleProfile")
                  : t("bookAnalysis.detail.header.generateStyleProfile")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onArchive(selectedAnalysis.id)}
                disabled={pending.archive || selectedAnalysis.status === "archived"}
              >
                {t("bookAnalysis.detail.header.archive")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!selectedAnalysis.isCurrentVersion ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              {t("bookAnalysis.detail.warnings.outdatedSource", {
                version: selectedAnalysis.currentDocumentVersionNumber,
              })}
            </div>
          ) : null}
          {styleProfileFeedback ? (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
              {styleProfileFeedback}
            </div>
          ) : null}
          <div className="rounded-md border p-3 text-sm">
            <div className="mb-2 font-medium">{t("bookAnalysis.detail.publish.title")}</div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="h-9 min-w-[220px] rounded-md border bg-background px-2 text-sm"
                value={selectedNovelId}
                onChange={(event) => onSelectedNovelChange(event.target.value)}
              >
                <option value="">{t("bookAnalysis.detail.publish.selectNovelPlaceholder")}</option>
                {novelOptions.map((novel) => (
                  <option key={novel.id} value={novel.id}>
                    {novel.title}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                onClick={onPublish}
                disabled={!selectedNovelId || pending.publish || selectedAnalysis.status === "archived"}
              >
                {t("bookAnalysis.detail.publish.publishCta")}
              </Button>
            </div>
            {publishFeedback ? <div className="mt-2 text-xs text-muted-foreground">{publishFeedback}</div> : null}
            {lastPublishResult ? (
              <div className="mt-1 text-xs text-muted-foreground">
                {t("bookAnalysis.detail.publish.publishedAt", { value: formatDate(lastPublishResult.publishedAt, t) })}
              </div>
            ) : null}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md border p-3 text-sm">
              <div className="font-medium">{t("bookAnalysis.detail.summary.title")}</div>
              <div className="mt-2 whitespace-pre-wrap text-muted-foreground">
                {selectedAnalysis.summary?.trim() || t("bookAnalysis.detail.summary.placeholder")}
              </div>
            </div>
            <div className="rounded-md border p-3 text-sm">
              <div className="font-medium">{t("bookAnalysis.detail.meta.title")}</div>
              <div className="mt-2 space-y-1 text-muted-foreground">
                <div>{t("bookAnalysis.detail.meta.provider", { value: selectedAnalysis.provider ?? "deepseek" })}</div>
                <div>
                  {t("bookAnalysis.detail.meta.model", {
                    value: selectedAnalysis.model || t("bookAnalysis.common.default"),
                  })}
                </div>
                <div>
                  {t("bookAnalysis.detail.meta.temperature", {
                    value: selectedAnalysis.temperature ?? t("bookAnalysis.common.default"),
                  })}
                </div>
                <div>
                  {t("bookAnalysis.detail.meta.maxTokens", {
                    value: selectedAnalysis.maxTokens ?? t("bookAnalysis.common.default"),
                  })}
                </div>
                <div>
                  {t("bookAnalysis.detail.meta.currentStage", { value: formatStage(selectedAnalysis.currentStage, t) })}
                </div>
                <div>
                  {t("bookAnalysis.detail.meta.currentSection", {
                    value: selectedAnalysis.currentItemLabel ?? t("bookAnalysis.common.none"),
                  })}
                </div>
                <div>{t("bookAnalysis.detail.meta.heartbeatAt", { value: formatDate(selectedAnalysis.heartbeatAt, t) })}</div>
                <div>{t("bookAnalysis.detail.meta.lastRunAt", { value: formatDate(selectedAnalysis.lastRunAt, t) })}</div>
                <div>{t("bookAnalysis.detail.meta.createdAt", { value: formatDate(selectedAnalysis.createdAt, t) })}</div>
              </div>
            </div>
          </div>
          {selectedAnalysis.lastError ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {t("bookAnalysis.detail.lastError", { value: selectedAnalysis.lastError })}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {selectedAnalysis.sections.map((section) => (
        <BookAnalysisSectionCard
          key={section.id}
          section={section}
          draft={getSectionDraft(section)}
          canOperate={Boolean(selectedAnalysis)}
          isRegenerating={pending.regenerate}
          isOptimizing={pending.optimizePreview && optimizingSectionKey === section.sectionKey}
          isSaving={pending.saveSection}
          onDraftChange={onDraftChange}
          onRegenerate={onRegenerateSection}
          onOptimize={onOptimizeSection}
          onApplyOptimizePreview={onApplyOptimizePreview}
          onCancelOptimizePreview={onCancelOptimizePreview}
          onSave={onSaveSection}
        />
      ))}

      <Card>
        <CardHeader>
          <CardTitle>{t("bookAnalysis.detail.evidence.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {aggregatedEvidence.map((item, index) => (
            <div key={`${item.sectionTitle}-${index}`} className="rounded-md border p-3 text-sm">
              <div className="font-medium">
                {t("bookAnalysis.detail.evidence.itemHeading", {
                  section: item.sectionTitle,
                  source: item.sourceLabel,
                  label: item.label,
                })}
              </div>
              <div className="mt-1 whitespace-pre-wrap text-muted-foreground">{item.excerpt}</div>
            </div>
          ))}
          {aggregatedEvidence.length === 0 ? (
            <div className="text-sm text-muted-foreground">{t("bookAnalysis.detail.evidence.empty")}</div>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
