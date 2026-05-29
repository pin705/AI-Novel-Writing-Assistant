import type { BookAnalysis, BookAnalysisStatus } from "@ai-novel/shared/types/bookAnalysis";
import type { KnowledgeDocumentDetail, KnowledgeDocumentSummary } from "@ai-novel/shared/types/knowledge";
import LLMSelector from "@/components/common/LLMSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/i18n";
import type { LLMConfigState } from "../bookAnalysis.types";
import { formatDate, formatStatus } from "../bookAnalysis.utils";

interface BookAnalysisSidebarProps {
  selectedDocumentId: string;
  selectedVersionId: string;
  keyword: string;
  status: BookAnalysisStatus | "";
  includeTimeline: boolean;
  llmConfig: LLMConfigState;
  documentOptions: KnowledgeDocumentSummary[];
  versionOptions: KnowledgeDocumentDetail["versions"];
  sourceDocument?: KnowledgeDocumentDetail;
  analyses: BookAnalysis[];
  selectedAnalysisId: string;
  createPending: boolean;
  onSelectDocument: (documentId: string) => void;
  onSelectVersion: (versionId: string) => void;
  onKeywordChange: (keyword: string) => void;
  onStatusChange: (status: BookAnalysisStatus | "") => void;
  onIncludeTimelineChange: (includeTimeline: boolean) => void;
  onLlmConfigChange: (config: LLMConfigState) => void;
  onCreate: () => void;
  onOpenAnalysis: (analysisId: string, documentId: string) => void;
}

export default function BookAnalysisSidebar(props: BookAnalysisSidebarProps) {
  const {
    selectedDocumentId,
    selectedVersionId,
    keyword,
    status,
    includeTimeline,
    llmConfig,
    documentOptions,
    versionOptions,
    sourceDocument,
    analyses,
    selectedAnalysisId,
    createPending,
    onSelectDocument,
    onSelectVersion,
    onKeywordChange,
    onStatusChange,
    onIncludeTimelineChange,
    onLlmConfigChange,
    onCreate,
    onOpenAnalysis,
  } = props;
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("bookAnalysis.sidebar.create.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">{t("bookAnalysis.sidebar.create.documentLabel")}</div>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={selectedDocumentId}
              onChange={(event) => onSelectDocument(event.target.value)}
            >
              <option value="">{t("bookAnalysis.sidebar.create.selectDocumentPlaceholder")}</option>
              {documentOptions.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">{t("bookAnalysis.sidebar.create.versionLabel")}</div>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={selectedVersionId}
              onChange={(event) => onSelectVersion(event.target.value)}
              disabled={!selectedDocumentId}
            >
              <option value="">{t("bookAnalysis.sidebar.create.useActiveVersionPlaceholder")}</option>
              {versionOptions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.isActive
                    ? t("bookAnalysis.sidebar.create.versionLabelActiveFormat", { version: version.versionNumber })
                    : t("bookAnalysis.sidebar.create.versionLabelFormat", { version: version.versionNumber })}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">{t("bookAnalysis.sidebar.create.modelLabel")}</div>
            <LLMSelector
              value={llmConfig}
              onChange={(next) =>
                onLlmConfigChange({
                  provider: next.provider,
                  model: next.model,
                  temperature: next.temperature ?? llmConfig.temperature,
                  maxTokens: next.maxTokens ?? llmConfig.maxTokens,
                })
              }
              showParameters
            />
          </div>

          <label className="flex items-center gap-2 rounded-md border p-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={includeTimeline}
              onChange={(event) => onIncludeTimelineChange(event.target.checked)}
            />
            {t("bookAnalysis.sidebar.create.includeTimelineLabel")}
          </label>

          <Button className="w-full" onClick={onCreate} disabled={!selectedDocumentId || createPending}>
            {t("bookAnalysis.sidebar.create.submit")}
          </Button>

          {sourceDocument ? (
            <div className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
              {t("bookAnalysis.sidebar.create.sourceSummary", {
                versions: sourceDocument.versions.length,
                count: sourceDocument.bookAnalysisCount,
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("bookAnalysis.sidebar.list.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            placeholder={t("bookAnalysis.sidebar.list.searchPlaceholder")}
          />
          <select
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={status}
            onChange={(event) => onStatusChange(event.target.value as BookAnalysisStatus | "")}
          >
            <option value="">{t("bookAnalysis.sidebar.list.filterAll")}</option>
            <option value="draft">{t("bookAnalysis.status.draft")}</option>
            <option value="queued">{t("bookAnalysis.status.queued")}</option>
            <option value="running">{t("bookAnalysis.status.running")}</option>
            <option value="succeeded">{t("bookAnalysis.status.succeeded")}</option>
            <option value="failed">{t("bookAnalysis.status.failed")}</option>
            <option value="archived">{t("bookAnalysis.status.archived")}</option>
          </select>

          <div className="space-y-2">
            {analyses.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`w-full rounded-md border p-3 text-left transition-colors ${
                  item.id === selectedAnalysisId ? "border-primary bg-primary/5" : "hover:bg-muted/30"
                }`}
                onClick={() => onOpenAnalysis(item.id, item.documentId)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{item.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {t("bookAnalysis.sidebar.list.documentVersionFormat", {
                        title: item.documentTitle,
                        version: item.documentVersionNumber,
                      })}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {item.publishedDocumentId && (
                      <Badge variant="secondary" className="text-xs">
                        {t("bookAnalysis.sidebar.list.publishedBadge")}
                      </Badge>
                    )}
                    <Badge variant="outline">{formatStatus(item.status, t)}</Badge>
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {t("bookAnalysis.sidebar.list.progressFormat", {
                    percent: Math.round(item.progress * 100),
                    updatedAt: formatDate(item.updatedAt, t),
                  })}
                </div>
                {item.lastError ? (
                  <div className="mt-2 line-clamp-2 text-xs text-destructive">{item.lastError}</div>
                ) : null}
              </button>
            ))}

            {analyses.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                {t("bookAnalysis.sidebar.list.empty")}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
