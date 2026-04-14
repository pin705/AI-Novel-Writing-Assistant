import type { BookAnalysisSectionKey } from "@ai-novel/shared/types/bookAnalysis";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import {
  buildNovelBasicInfoI18n,
  type NovelBasicFormState,
} from "../../novelBasicInfo.shared";
import {
  FieldLabel,
  HelpHint,
  SectionBlock,
  SelectionCard,
} from "./BasicInfoFormPrimitives";

interface ContinuationSourceSectionProps {
  basicForm: NovelBasicFormState;
  sourceNovelOptions: Array<{ id: string; title: string }>;
  sourceKnowledgeOptions: Array<{ id: string; title: string }>;
  sourceNovelBookAnalysisOptions: Array<{
    id: string;
    title: string;
    documentTitle: string;
    documentVersionNumber: number;
  }>;
  isLoadingSourceNovelBookAnalyses: boolean;
  availableBookAnalysisSections: Array<{ key: BookAnalysisSectionKey; title: string }>;
  hasSelectedContinuationSource: boolean;
  onFormChange: (patch: Partial<NovelBasicFormState>) => void;
}

export function ContinuationSourceSection(props: ContinuationSourceSectionProps) {
  const {
    basicForm,
    sourceNovelOptions,
    sourceKnowledgeOptions,
    sourceNovelBookAnalysisOptions,
    isLoadingSourceNovelBookAnalyses,
    availableBookAnalysisSections,
    hasSelectedContinuationSource,
    onFormChange,
  } = props;
  const { t } = useI18n();
  const { fieldHints } = buildNovelBasicInfoI18n(t);

  return (
    <SectionBlock
      title={t("novelCreate.continuation.title")}
      description={t("novelCreate.continuation.description")}
    >
      <div className="space-y-2">
        <FieldLabel hint={fieldHints.continuationSourceType}>{t("novelCreate.continuation.sourceType.label")}</FieldLabel>
        <div className="grid gap-3 md:grid-cols-2">
          <SelectionCard
            option={{
              value: "novel",
              label: t("novelCreate.continuation.sourceType.novel.label"),
              summary: t("novelCreate.continuation.sourceType.novel.summary"),
            }}
            selected={basicForm.continuationSourceType === "novel"}
            onSelect={(value) => onFormChange({ continuationSourceType: value })}
          />
          <SelectionCard
            option={{
              value: "knowledge_document",
              label: t("novelCreate.continuation.sourceType.knowledge.label"),
              summary: t("novelCreate.continuation.sourceType.knowledge.summary"),
            }}
            selected={basicForm.continuationSourceType === "knowledge_document"}
            onSelect={(value) => onFormChange({ continuationSourceType: value })}
          />
        </div>
      </div>

      {basicForm.continuationSourceType === "novel" ? (
        <div className="space-y-2">
          <FieldLabel htmlFor="basic-source-novel">{t("novelCreate.continuation.sourceNovel.label")}</FieldLabel>
          <select
            id="basic-source-novel"
            className="w-full rounded-md border bg-background p-2 text-sm"
            value={basicForm.sourceNovelId}
            onChange={(event) => onFormChange({ sourceNovelId: event.target.value })}
          >
            <option value="">{t("novelCreate.continuation.sourceNovel.placeholder")}</option>
            {sourceNovelOptions.map((novel) => (
              <option key={novel.id} value={novel.id}>{novel.title}</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="space-y-2">
          <FieldLabel htmlFor="basic-source-knowledge">{t("novelCreate.continuation.sourceKnowledge.label")}</FieldLabel>
          <select
            id="basic-source-knowledge"
            className="w-full rounded-md border bg-background p-2 text-sm"
            value={basicForm.sourceKnowledgeDocumentId}
            onChange={(event) => onFormChange({ sourceKnowledgeDocumentId: event.target.value })}
          >
            <option value="">{t("novelCreate.continuation.sourceKnowledge.placeholder")}</option>
            {sourceKnowledgeOptions.map((doc) => (
              <option key={doc.id} value={doc.id}>{doc.title}</option>
            ))}
          </select>
        </div>
      )}

      {hasSelectedContinuationSource ? (
        <div className="space-y-3 rounded-lg border border-border/60 bg-background p-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              {t("novelCreate.continuation.bookAnalysis.referenceTitle")}
              <HelpHint text={fieldHints.continuationBookAnalysis} />
            </div>
            <div className="text-xs text-muted-foreground">{t("novelCreate.continuation.bookAnalysis.referenceDescription")}</div>
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="basic-book-analysis">{t("novelCreate.continuation.bookAnalysis.label")}</FieldLabel>
            <select
              id="basic-book-analysis"
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={basicForm.continuationBookAnalysisId}
              onChange={(event) => {
                const nextAnalysisId = event.target.value;
                onFormChange({
                  continuationBookAnalysisId: nextAnalysisId,
                  continuationBookAnalysisSections: nextAnalysisId
                    ? (
                      basicForm.continuationBookAnalysisSections.length > 0
                        ? basicForm.continuationBookAnalysisSections
                        : availableBookAnalysisSections.map((item) => item.key)
                    )
                    : [],
                });
              }}
            >
              <option value="">{t("novelCreate.continuation.bookAnalysis.none")}</option>
              {sourceNovelBookAnalysisOptions.map((analysis) => (
                <option key={analysis.id} value={analysis.id}>
                  {analysis.title} | {analysis.documentTitle} v{analysis.documentVersionNumber}
                </option>
              ))}
            </select>
          </div>

          {isLoadingSourceNovelBookAnalyses ? (
            <div className="text-xs text-muted-foreground">{t("novelCreate.continuation.bookAnalysis.loading")}</div>
          ) : null}
          {!isLoadingSourceNovelBookAnalyses && sourceNovelBookAnalysisOptions.length === 0 ? (
            <div className="text-xs text-muted-foreground">
              {t("novelCreate.continuation.bookAnalysis.empty")}
            </div>
          ) : null}

          {basicForm.continuationBookAnalysisId ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{t("novelCreate.continuation.bookAnalysis.sectionsLabel")}</span>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => onFormChange({
                    continuationBookAnalysisSections: availableBookAnalysisSections.map((item) => item.key),
                  })}
                >
                  {t("novelCreate.continuation.bookAnalysis.selectAll")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => onFormChange({ continuationBookAnalysisSections: [] })}
                >
                  {t("novelCreate.continuation.bookAnalysis.clear")}
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {availableBookAnalysisSections.map((section) => (
                  <label key={section.key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={basicForm.continuationBookAnalysisSections.includes(section.key)}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        const next = checked
                          ? [...basicForm.continuationBookAnalysisSections, section.key]
                          : basicForm.continuationBookAnalysisSections.filter((item) => item !== section.key);
                        onFormChange({
                          continuationBookAnalysisSections: Array.from(new Set(next)),
                        });
                      }}
                    />
                    <span>{section.title}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </SectionBlock>
  );
}
