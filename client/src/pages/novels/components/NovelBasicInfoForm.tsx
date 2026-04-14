import type { ReactNode } from "react";
import type { BookAnalysisSectionKey } from "@ai-novel/shared/types/bookAnalysis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n";
import {
  DEFAULT_ESTIMATED_CHAPTER_COUNT,
  buildNovelBasicInfoI18n,
  type NovelBasicFormState,
} from "../novelBasicInfo.shared";
import {
  FieldLabel,
  SectionBlock,
  SelectionCard,
  findOptionSummary,
} from "./basicInfoForm/BasicInfoFormPrimitives";
import { BookFramingSection } from "./basicInfoForm/BookFramingSection";
import CollapsibleSummary from "./CollapsibleSummary";
import { ContinuationSourceSection } from "./basicInfoForm/ContinuationSourceSection";

interface WorldOption {
  id: string;
  name: string;
}

interface GenreOption {
  id: string;
  label: string;
  path: string;
}

interface StoryModeOption {
  id: string;
  name: string;
  label: string;
  path: string;
  description?: string | null;
  profile: {
    coreDrive: string;
    readerReward: string;
  };
}

interface NovelBasicInfoFormProps {
  basicForm: NovelBasicFormState;
  genreOptions: GenreOption[];
  storyModeOptions: StoryModeOption[];
  worldOptions: WorldOption[];
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
  onFormChange: (patch: Partial<NovelBasicFormState>) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitLabel: string;
  showPublicationStatus?: boolean;
  titleQuickFill?: ReactNode;
  framingQuickFill?: ReactNode;
  projectQuickStart?: ReactNode;
  resourceRecommendation?: ReactNode;
}

export default function NovelBasicInfoForm(props: NovelBasicInfoFormProps) {
  const {
    basicForm,
    genreOptions,
    storyModeOptions,
    worldOptions,
    sourceNovelOptions,
    sourceKnowledgeOptions,
    sourceNovelBookAnalysisOptions,
    isLoadingSourceNovelBookAnalyses,
    availableBookAnalysisSections,
    onFormChange,
    onSubmit,
    isSubmitting,
    submitLabel,
    showPublicationStatus = true,
    titleQuickFill,
    framingQuickFill,
    projectQuickStart,
    resourceRecommendation,
  } = props;
  const { t } = useI18n();
  const {
    aiFreedomOptions,
    emotionOptions,
    fieldHints,
    paceOptions,
    povOptions,
    projectModeOptions,
    projectStatusOptions,
    publicationStatusOptions,
    writingModeOptions,
  } = buildNovelBasicInfoI18n(t);

  const continuationSourceMissing = basicForm.writingMode === "continuation"
    && (
      (basicForm.continuationSourceType === "novel" && !basicForm.sourceNovelId)
      || (basicForm.continuationSourceType === "knowledge_document" && !basicForm.sourceKnowledgeDocumentId)
    );

  const continuationAnalysisSectionMissing = basicForm.writingMode === "continuation"
    && Boolean(basicForm.continuationBookAnalysisId)
    && basicForm.continuationBookAnalysisSections.length === 0;

  const hasSelectedContinuationSource = basicForm.continuationSourceType === "novel"
    ? Boolean(basicForm.sourceNovelId)
    : Boolean(basicForm.sourceKnowledgeDocumentId);
  const primaryStoryMode = storyModeOptions.find((item) => item.id === basicForm.primaryStoryModeId);
  const secondaryStoryMode = storyModeOptions.find((item) => item.id === basicForm.secondaryStoryModeId);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="text-sm font-semibold text-foreground">{t("novelCreate.form.guidance.title")}</div>
        <div className="mt-1 text-sm leading-6 text-muted-foreground">
          {t("novelCreate.form.guidance.description")}
        </div>
        {projectQuickStart ? <div className="mt-3 flex justify-end">{projectQuickStart}</div> : null}
      </div>

      <SectionBlock
        title={t("novelCreate.form.positioning.title")}
        description={t("novelCreate.form.positioning.description")}
      >
        <div className="space-y-2">
          <FieldLabel htmlFor="basic-title">{t("novelCreate.form.title.label")}</FieldLabel>
          <Input
            id="basic-title"
            value={basicForm.title}
            placeholder={t("novelCreate.form.title.placeholder")}
            onChange={(event) => onFormChange({ title: event.target.value })}
          />
          {titleQuickFill ? <div className="pt-1">{titleQuickFill}</div> : null}
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="basic-description">{t("novelCreate.form.description.label")}</FieldLabel>
          <textarea
            id="basic-description"
            rows={4}
            className="min-h-[112px] w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            value={basicForm.description}
            placeholder={t("novelCreate.form.description.placeholder")}
            onChange={(event) => onFormChange({ description: event.target.value })}
          />
        </div>

        <BookFramingSection
          basicForm={basicForm}
          onFormChange={onFormChange}
          quickFill={framingQuickFill}
        />

        <div className="space-y-2">
          <FieldLabel hint={fieldHints.writingMode}>{t("novelCreate.form.writingMode.label")}</FieldLabel>
          <div className="grid gap-3 md:grid-cols-2">
            {writingModeOptions.map((option) => (
              <SelectionCard
                key={option.value}
                option={option}
                selected={basicForm.writingMode === option.value}
                onSelect={(value) => onFormChange({ writingMode: value })}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-muted/20 p-3 text-sm leading-6 text-muted-foreground">
          <div className="font-medium text-foreground">{t("novelCreate.form.genreVsStoryMode.title")}</div>
          <div className="mt-1">
            {t("novelCreate.form.genreVsStoryMode.description")}
          </div>
        </div>

        {resourceRecommendation}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <FieldLabel htmlFor="basic-genre" hint={fieldHints.genreId}>{t("novelCreate.form.genre.label")}</FieldLabel>
            <select
              id="basic-genre"
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={basicForm.genreId}
              onChange={(event) => onFormChange({ genreId: event.target.value })}
            >
              <option value="">{t("novelCreate.form.genre.placeholder")}</option>
              {genreOptions.map((genre) => (
                <option key={genre.id} value={genre.id}>
                  {genre.path}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="basic-world" hint={fieldHints.worldId}>{t("novelCreate.form.world.label")}</FieldLabel>
            <select
              id="basic-world"
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={basicForm.worldId}
              onChange={(event) => onFormChange({ worldId: event.target.value })}
            >
              <option value="">{t("novelCreate.form.world.placeholder")}</option>
              {worldOptions.map((world) => (
                <option key={world.id} value={world.id}>
                  {world.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="basic-default-length" hint={fieldHints.defaultChapterLength}>
              {t("novelCreate.form.defaultChapterLength.label")}
            </FieldLabel>
            <Input
              id="basic-default-length"
              type="number"
              min={500}
              max={10000}
              value={basicForm.defaultChapterLength}
              onChange={(event) => onFormChange({ defaultChapterLength: Number(event.target.value || 0) || 2800 })}
            />
            <div className="text-xs text-muted-foreground">{t("novelCreate.form.defaultChapterLength.helper")}</div>
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="basic-estimated-chapters" hint={fieldHints.estimatedChapterCount}>
              {t("novelCreate.form.estimatedChapterCount.label")}
            </FieldLabel>
            <Input
              id="basic-estimated-chapters"
              type="number"
              min={1}
              max={2000}
              value={basicForm.estimatedChapterCount}
              onChange={(event) => onFormChange({
                estimatedChapterCount: Math.max(
                  1,
                  Math.min(2000, Number(event.target.value || 0) || DEFAULT_ESTIMATED_CHAPTER_COUNT),
                ),
              })}
            />
            <div className="text-xs text-muted-foreground">{t("novelCreate.form.estimatedChapterCount.helper")}</div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel htmlFor="basic-primary-story-mode" hint={fieldHints.primaryStoryModeId}>
              {t("novelCreate.form.primaryStoryMode.label")}
            </FieldLabel>
            <select
              id="basic-primary-story-mode"
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={basicForm.primaryStoryModeId}
              onChange={(event) => onFormChange({ primaryStoryModeId: event.target.value })}
            >
              <option value="">{t("novelCreate.form.primaryStoryMode.placeholder")}</option>
              {storyModeOptions.map((storyMode) => (
                <option key={storyMode.id} value={storyMode.id}>
                  {storyMode.path}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="basic-secondary-story-mode" hint={fieldHints.secondaryStoryModeId}>
              {t("novelCreate.form.secondaryStoryMode.label")}
            </FieldLabel>
            <select
              id="basic-secondary-story-mode"
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={basicForm.secondaryStoryModeId}
              onChange={(event) => onFormChange({ secondaryStoryModeId: event.target.value })}
            >
              <option value="">{t("novelCreate.form.secondaryStoryMode.placeholder")}</option>
              {storyModeOptions.map((storyMode) => (
                <option
                  key={storyMode.id}
                  value={storyMode.id}
                  disabled={storyMode.id === basicForm.primaryStoryModeId}
                >
                  {storyMode.path}
                </option>
              ))}
            </select>
          </div>
        </div>

        {primaryStoryMode || secondaryStoryMode ? (
          <div className="grid gap-3 md:grid-cols-2">
            {primaryStoryMode ? (
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="text-sm font-semibold text-foreground">{t("novelCreate.form.primaryStoryMode.summaryTitle")}</div>
                <div className="mt-1 text-sm text-foreground">{primaryStoryMode.name}</div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">
                  {primaryStoryMode.description || primaryStoryMode.profile.coreDrive}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">{t("novelCreate.form.primaryStoryMode.coreDrive", { value: primaryStoryMode.profile.coreDrive })}</div>
              </div>
            ) : null}
            {secondaryStoryMode ? (
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="text-sm font-semibold text-foreground">{t("novelCreate.form.secondaryStoryMode.summaryTitle")}</div>
                <div className="mt-1 text-sm text-foreground">{secondaryStoryMode.name}</div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">
                  {secondaryStoryMode.description || secondaryStoryMode.profile.coreDrive}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">{t("novelCreate.form.secondaryStoryMode.readerReward", { value: secondaryStoryMode.profile.readerReward })}</div>
              </div>
            ) : null}
          </div>
        ) : null}
      </SectionBlock>

      <details className="group rounded-xl border border-border/70 bg-background/95 p-4">
        <summary className="cursor-pointer list-none">
          <CollapsibleSummary
            title={t("novelCreate.form.advanced.title")}
            description={t("novelCreate.form.advanced.description")}
          />
        </summary>

        <div className="mt-4 space-y-4">
          <SectionBlock
            title={t("novelCreate.form.narrativeExperience.title")}
            description={t("novelCreate.form.narrativeExperience.description")}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="basic-pov" hint={fieldHints.narrativePov}>{t("novelCreate.form.narrativePov.label")}</FieldLabel>
                <select
                  id="basic-pov"
                  className="w-full rounded-md border bg-background p-2 text-sm"
                  value={basicForm.narrativePov}
                  onChange={(event) => onFormChange({ narrativePov: event.target.value as NovelBasicFormState["narrativePov"] })}
                >
                  {povOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <div className="text-xs text-muted-foreground">{findOptionSummary(povOptions, basicForm.narrativePov)}</div>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="basic-pace" hint={fieldHints.pacePreference}>{t("novelCreate.form.pacePreference.label")}</FieldLabel>
                <select
                  id="basic-pace"
                  className="w-full rounded-md border bg-background p-2 text-sm"
                  value={basicForm.pacePreference}
                  onChange={(event) => onFormChange({ pacePreference: event.target.value as NovelBasicFormState["pacePreference"] })}
                >
                  {paceOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <div className="text-xs text-muted-foreground">{findOptionSummary(paceOptions, basicForm.pacePreference)}</div>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="basic-emotion" hint={fieldHints.emotionIntensity}>{t("novelCreate.form.emotionIntensity.label")}</FieldLabel>
                <select
                  id="basic-emotion"
                  className="w-full rounded-md border bg-background p-2 text-sm"
                  value={basicForm.emotionIntensity}
                  onChange={(event) => onFormChange({ emotionIntensity: event.target.value as NovelBasicFormState["emotionIntensity"] })}
                >
                  {emotionOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <div className="text-xs text-muted-foreground">{findOptionSummary(emotionOptions, basicForm.emotionIntensity)}</div>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="basic-style-tone" hint={fieldHints.styleTone}>{t("novelCreate.form.styleTone.label")}</FieldLabel>
                <Input
                  id="basic-style-tone"
                  value={basicForm.styleTone}
                  placeholder={t("novelCreate.form.styleTone.placeholder")}
                  onChange={(event) => onFormChange({ styleTone: event.target.value })}
                />
              </div>
            </div>
          </SectionBlock>

          <SectionBlock
            title={t("novelCreate.form.aiCollaboration.title")}
            description={t("novelCreate.form.aiCollaboration.description")}
          >
            <div className="space-y-2">
              <FieldLabel hint={fieldHints.projectMode}>{t("novelCreate.form.projectMode.label")}</FieldLabel>
              <div className="grid gap-3 md:grid-cols-2">
                {projectModeOptions.map((option) => (
                  <SelectionCard
                    key={option.value}
                    option={option}
                    selected={basicForm.projectMode === option.value}
                    onSelect={(value) => onFormChange({ projectMode: value })}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="basic-ai-freedom" hint={fieldHints.aiFreedom}>{t("novelCreate.form.aiFreedom.label")}</FieldLabel>
                <select
                  id="basic-ai-freedom"
                  className="w-full rounded-md border bg-background p-2 text-sm"
                  value={basicForm.aiFreedom}
                  onChange={(event) => onFormChange({ aiFreedom: event.target.value as NovelBasicFormState["aiFreedom"] })}
                >
                  {aiFreedomOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <div className="text-xs text-muted-foreground">{findOptionSummary(aiFreedomOptions, basicForm.aiFreedom)}</div>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="basic-resource-score" hint={fieldHints.resourceReadyScore}>
                  {t("novelCreate.form.resourceReadyScore.label")}
                </FieldLabel>
                <Input
                  id="basic-resource-score"
                  type="number"
                  min={0}
                  max={100}
                  value={basicForm.resourceReadyScore}
                  onChange={(event) => onFormChange({
                    resourceReadyScore: Math.max(0, Math.min(100, Number(event.target.value || 0))),
                  })}
                />
                <div className="text-xs text-muted-foreground">{t("novelCreate.form.resourceReadyScore.helper")}</div>
              </div>
            </div>
          </SectionBlock>
        </div>
      </details>

      {basicForm.writingMode === "continuation" ? (
        <details className="group rounded-xl border border-border/70 bg-background/95 p-4" open>
          <summary className="cursor-pointer list-none">
            <CollapsibleSummary
              title={t("novelCreate.form.continuationSettings.title")}
              description={t("novelCreate.form.continuationSettings.description")}
              collapsedLabel={t("novelCreate.form.continuationSettings.collapsed")}
              expandedLabel={t("novelCreate.form.continuationSettings.expanded")}
            />
          </summary>
          <div className="mt-4">
            <ContinuationSourceSection
              basicForm={basicForm}
              sourceNovelOptions={sourceNovelOptions}
              sourceKnowledgeOptions={sourceKnowledgeOptions}
              sourceNovelBookAnalysisOptions={sourceNovelBookAnalysisOptions}
              isLoadingSourceNovelBookAnalyses={isLoadingSourceNovelBookAnalyses}
              availableBookAnalysisSections={availableBookAnalysisSections}
              hasSelectedContinuationSource={hasSelectedContinuationSource}
              onFormChange={onFormChange}
            />
          </div>
        </details>
      ) : null}

      <details className="group rounded-xl border border-border/70 bg-background/95 p-4">
        <summary className="cursor-pointer list-none">
          <CollapsibleSummary
            title={t("novelCreate.form.projectStatusSection.title")}
            description={t("novelCreate.form.projectStatusSection.description")}
            collapsedLabel={t("novelCreate.form.projectStatusSection.collapsed")}
            expandedLabel={t("novelCreate.form.projectStatusSection.expanded")}
          />
        </summary>
        <div className="mt-4">
          <SectionBlock
            title={t("novelCreate.form.productionStatus.title")}
            description={t("novelCreate.form.productionStatus.description")}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="basic-project-status">{t("novelCreate.form.projectStatus.label")}</FieldLabel>
                <select
                  id="basic-project-status"
                  className="w-full rounded-md border bg-background p-2 text-sm"
                  value={basicForm.projectStatus}
                  onChange={(event) => onFormChange({ projectStatus: event.target.value as NovelBasicFormState["projectStatus"] })}
                >
                  {projectStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="basic-storyline-status">{t("novelCreate.form.storylineStatus.label")}</FieldLabel>
                <select
                  id="basic-storyline-status"
                  className="w-full rounded-md border bg-background p-2 text-sm"
                  value={basicForm.storylineStatus}
                  onChange={(event) => onFormChange({ storylineStatus: event.target.value as NovelBasicFormState["storylineStatus"] })}
                >
                  {projectStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="basic-outline-status">{t("novelCreate.form.outlineStatus.label")}</FieldLabel>
                <select
                  id="basic-outline-status"
                  className="w-full rounded-md border bg-background p-2 text-sm"
                  value={basicForm.outlineStatus}
                  onChange={(event) => onFormChange({ outlineStatus: event.target.value as NovelBasicFormState["outlineStatus"] })}
                >
                  {projectStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              {showPublicationStatus ? (
                <div className="space-y-2">
                  <FieldLabel hint={fieldHints.status}>{t("novelCreate.form.publicationStatus.label")}</FieldLabel>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {publicationStatusOptions.map((option) => (
                      <SelectionCard
                        key={option.value}
                        option={option}
                        selected={basicForm.status === option.value}
                        onSelect={(value) => onFormChange({ status: value })}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </SectionBlock>
        </div>
      </details>

      {continuationSourceMissing ? (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
          {t("novelCreate.form.warning.continuationSourceMissing")}
        </div>
      ) : null}

      {continuationAnalysisSectionMissing ? (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
          {t("novelCreate.form.warning.continuationSectionsMissing")}
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button
          onClick={onSubmit}
          disabled={isSubmitting || continuationSourceMissing || continuationAnalysisSectionMissing || !basicForm.title.trim()}
        >
          {isSubmitting ? t("novelCreate.form.submitting") : submitLabel}
        </Button>
      </div>
    </div>
  );
}
