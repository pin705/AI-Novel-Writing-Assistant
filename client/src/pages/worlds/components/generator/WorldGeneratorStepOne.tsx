import { useMemo } from "react";
import type { WorldOptionRefinementLevel, WorldReferenceAnchor, WorldReferenceMode } from "@ai-novel/shared/types/worldWizard";
import { Button } from "@/components/ui/button";
import KnowledgeDocumentPicker from "@/components/knowledge/KnowledgeDocumentPicker";
import { useTranslation } from "@/i18n";
import type {
  GeneratorGenreOption,
  InspirationMode,
  WorldGeneratorConceptCard,
} from "./worldGeneratorShared";
import { buildReferenceModeOptions } from "./worldGeneratorShared";

interface WorldGeneratorStepOneProps {
  worldName: string;
  selectedGenreId: string;
  selectedGenre: GeneratorGenreOption | null;
  genreOptions: GeneratorGenreOption[];
  genreLoading: boolean;
  inspirationMode: InspirationMode;
  referenceMode: WorldReferenceMode;
  selectedKnowledgeDocumentIds: string[];
  preserveText: string;
  allowedChangesText: string;
  forbiddenText: string;
  inspirationText: string;
  optionRefinementLevel: WorldOptionRefinementLevel;
  optionsCount: number;
  canAnalyze: boolean;
  analyzeStreaming: boolean;
  analyzeButtonLabel: string;
  analyzeProgressMessage?: string;
  inspirationSourceMeta: {
    extracted: boolean;
    originalLength: number;
    chunkCount: number;
  } | null;
  concept: WorldGeneratorConceptCard | null;
  propertyOptionsCount: number;
  referenceAnchors: WorldReferenceAnchor[];
  onWorldNameChange: (value: string) => void;
  onGenreChange: (value: string) => void;
  onOpenGenreManager: () => void;
  onInspirationModeChange: (value: InspirationMode) => void;
  onKnowledgeDocumentIdsChange: (ids: string[]) => void;
  onReferenceModeChange: (value: WorldReferenceMode) => void;
  onPreserveTextChange: (value: string) => void;
  onAllowedChangesTextChange: (value: string) => void;
  onForbiddenTextChange: (value: string) => void;
  onInspirationTextChange: (value: string) => void;
  onOptionRefinementLevelChange: (value: WorldOptionRefinementLevel) => void;
  onOptionsCountChange: (value: number) => void;
  onAnalyze: () => void;
}

export default function WorldGeneratorStepOne(props: WorldGeneratorStepOneProps) {
  const {
    worldName,
    selectedGenreId,
    selectedGenre,
    genreOptions,
    genreLoading,
    inspirationMode,
    referenceMode,
    selectedKnowledgeDocumentIds,
    preserveText,
    allowedChangesText,
    forbiddenText,
    inspirationText,
    optionRefinementLevel,
    optionsCount,
    canAnalyze,
    analyzeStreaming,
    analyzeButtonLabel,
    analyzeProgressMessage,
    inspirationSourceMeta,
    concept,
    propertyOptionsCount,
    referenceAnchors,
    onWorldNameChange,
    onGenreChange,
    onOpenGenreManager,
    onInspirationModeChange,
    onKnowledgeDocumentIdsChange,
    onReferenceModeChange,
    onPreserveTextChange,
    onAllowedChangesTextChange,
    onForbiddenTextChange,
    onInspirationTextChange,
    onOptionRefinementLevelChange,
    onOptionsCountChange,
    onAnalyze,
  } = props;

  const { t } = useTranslation();
  const referenceModeOptions = useMemo(() => buildReferenceModeOptions(t), [t]);
  const isReferenceMode = inspirationMode === "reference";

  return (
    <div className="space-y-3">
      <input
        className="w-full rounded-md border p-2 text-sm"
        placeholder={t("worlds.generator.stepOne.namePlaceholder")}
        value={worldName}
        onChange={(event) => onWorldNameChange(event.target.value)}
      />

      <div className="space-y-2">
        <div className="text-sm font-medium">{t("worlds.generator.stepOne.worldTypeLabel")}</div>
        <select
          className="w-full rounded-md border bg-background p-2 text-sm"
          value={selectedGenreId}
          disabled={genreLoading || genreOptions.length === 0}
          onChange={(event) => onGenreChange(event.target.value)}
        >
          <option value="">{genreLoading ? t("worlds.generator.stepOne.loadingGenres") : t("worlds.generator.stepOne.selectGenre")}</option>
          {genreOptions.map((genre) => (
            <option key={genre.id} value={genre.id}>
              {genre.path}
            </option>
          ))}
        </select>
        {selectedGenre ? (
          <div className="rounded-md border p-3 text-xs text-muted-foreground space-y-1">
            <div>{t("worlds.generator.stepOne.currentPath", { value: selectedGenre.path })}</div>
            {selectedGenre.description?.trim() ? <div>{t("worlds.generator.stepOne.genreDescription", { value: selectedGenre.description.trim() })}</div> : null}
            {selectedGenre.template?.trim() ? (
              <div className="whitespace-pre-wrap">{t("worlds.generator.stepOne.genreTemplate", { value: selectedGenre.template.trim() })}</div>
            ) : null}
          </div>
        ) : null}
        {genreLoading ? <div className="text-xs text-muted-foreground">{t("worlds.generator.stepOne.loadingGenreTree")}</div> : null}
        {!genreLoading && genreOptions.length === 0 ? (
          <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground space-y-2">
            <div>{t("worlds.generator.stepOne.noGenres")}</div>
            <Button type="button" variant="outline" onClick={onOpenGenreManager}>
              {t("worlds.generator.stepOne.openGenreManager")}
            </Button>
          </div>
        ) : null}
        <div className="text-xs text-muted-foreground">
          {t("worlds.generator.stepOne.hintLibrary")}
        </div>
        <div className="text-xs text-muted-foreground">
          {t("worlds.generator.stepOne.hintFlow")}
        </div>
      </div>

      <select
        className="w-full rounded-md border bg-background p-2 text-sm"
        value={inspirationMode}
        onChange={(event) => onInspirationModeChange(event.target.value as InspirationMode)}
      >
        <option value="free">{t("worlds.generator.stepOne.modeFree")}</option>
        <option value="reference">{t("worlds.generator.stepOne.modeReference")}</option>
        <option value="random">{t("worlds.generator.stepOne.modeRandom")}</option>
      </select>

      {isReferenceMode ? (
        <div className="space-y-3">
          <KnowledgeDocumentPicker
            selectedIds={selectedKnowledgeDocumentIds}
            onChange={(next) => onKnowledgeDocumentIdsChange(next ?? [])}
            title={t("worlds.generator.stepOne.knowledgeTitle")}
            description={t("worlds.generator.stepOne.knowledgeDescription")}
            queryStatus="enabled"
          />

          <div className="rounded-md border p-3 text-sm space-y-2">
            <div className="font-medium">{t("worlds.generator.stepOne.referenceMode")}</div>
            <select
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={referenceMode}
              onChange={(event) => onReferenceModeChange(event.target.value as WorldReferenceMode)}
            >
              {referenceModeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="text-xs text-muted-foreground">
              {referenceModeOptions.find((item) => item.value === referenceMode)?.description}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md border p-3 text-sm space-y-2">
              <div className="font-medium">{t("worlds.generator.stepOne.preserveTitle")}</div>
              <textarea
                className="min-h-[120px] w-full rounded-md border p-2 text-sm"
                placeholder={t("worlds.generator.stepOne.preservePlaceholder")}
                value={preserveText}
                onChange={(event) => onPreserveTextChange(event.target.value)}
              />
            </div>

            <div className="rounded-md border p-3 text-sm space-y-2">
              <div className="font-medium">{t("worlds.generator.stepOne.allowedTitle")}</div>
              <textarea
                className="min-h-[120px] w-full rounded-md border p-2 text-sm"
                placeholder={t("worlds.generator.stepOne.allowedPlaceholder")}
                value={allowedChangesText}
                onChange={(event) => onAllowedChangesTextChange(event.target.value)}
              />
            </div>

            <div className="rounded-md border p-3 text-sm space-y-2">
              <div className="font-medium">{t("worlds.generator.stepOne.forbiddenTitle")}</div>
              <textarea
                className="min-h-[120px] w-full rounded-md border p-2 text-sm"
                placeholder={t("worlds.generator.stepOne.forbiddenPlaceholder")}
                value={forbiddenText}
                onChange={(event) => onForbiddenTextChange(event.target.value)}
              />
            </div>
          </div>
        </div>
      ) : null}

      <textarea
        className="min-h-[180px] w-full rounded-md border p-2 text-sm"
        placeholder={
          isReferenceMode
            ? t("worlds.generator.stepOne.inspirationPlaceholderRef")
            : t("worlds.generator.stepOne.inspirationPlaceholderFree")
        }
        value={inspirationText}
        onChange={(event) => onInspirationTextChange(event.target.value)}
      />

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md border p-3 text-sm space-y-2">
          <div className="font-medium">{t("worlds.generator.stepOne.refinementTitle")}</div>
          <select
            className="w-full rounded-md border bg-background p-2 text-sm"
            value={optionRefinementLevel}
            onChange={(event) => onOptionRefinementLevelChange(event.target.value as WorldOptionRefinementLevel)}
          >
            <option value="basic">{t("worlds.generator.stepOne.refinementBasic")}</option>
            <option value="standard">{t("worlds.generator.stepOne.refinementStandard")}</option>
            <option value="detailed">{t("worlds.generator.stepOne.refinementDetailed")}</option>
          </select>
        </div>

        <div className="rounded-md border p-3 text-sm space-y-2">
          <div className="font-medium">{t("worlds.generator.stepOne.optionsCountTitle")}</div>
          <input
            className="w-full rounded-md border p-2 text-sm"
            type="number"
            min={4}
            max={8}
            value={optionsCount}
            onChange={(event) => onOptionsCountChange(Number(event.target.value) || 6)}
          />
          <div className="text-xs text-muted-foreground">
            {t("worlds.generator.stepOne.optionsCountHint")}
          </div>
        </div>
      </div>

      <Button onClick={onAnalyze} disabled={!canAnalyze}>
        {analyzeButtonLabel}
      </Button>

      {analyzeStreaming ? (
        <div className="rounded-md border p-3 text-sm space-y-1">
          <div className="font-medium">{t("worlds.generator.stepOne.progressTitle")}</div>
          <div>{analyzeProgressMessage ?? t("worlds.generator.stepOne.progressStarting")}</div>
          <div className="text-xs text-muted-foreground">
            {isReferenceMode
              ? t("worlds.generator.stepOne.progressHintRef")
              : t("worlds.generator.stepOne.progressHintFree")}
          </div>
        </div>
      ) : null}

      {inspirationSourceMeta?.extracted ? (
        <div className="text-xs text-muted-foreground">
          {t("worlds.generator.stepOne.extractedMeta", { length: inspirationSourceMeta.originalLength, chunks: inspirationSourceMeta.chunkCount })}
        </div>
      ) : null}

      {concept ? (
        <div className="rounded-md border p-3 text-sm space-y-2">
          <div className="font-medium">{isReferenceMode ? t("worlds.generator.stepOne.summaryRef") : t("worlds.generator.stepOne.summaryFree")}</div>
          <div>{t("worlds.generator.stepOne.summaryType", { value: concept.worldType })}</div>
          <div>{t("worlds.generator.stepOne.summaryTone", { value: concept.tone })}</div>
          <div>{t("worlds.generator.stepOne.summaryKeywords", { value: concept.keywords.join(" / ") || "-" })}</div>
          <div>{t("worlds.generator.stepOne.summaryOptions", { count: propertyOptionsCount })}</div>
          {isReferenceMode && referenceAnchors.length > 0 ? (
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">{t("worlds.generator.stepOne.anchorsTitle")}</div>
              {referenceAnchors.map((anchor) => (
                <div key={anchor.id} className="text-xs text-muted-foreground">
                  {t("worlds.generator.stepOne.anchorLine", { label: anchor.label, content: anchor.content })}
                </div>
              ))}
            </div>
          ) : null}
          <div className="whitespace-pre-wrap">{concept.summary}</div>
        </div>
      ) : null}
    </div>
  );
}
