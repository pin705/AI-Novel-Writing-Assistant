import type { TitleFactorySuggestion } from "@ai-novel/shared/types/title";
import {
  DIRECTOR_CORRECTION_PRESETS,
  type DirectorCandidate,
  type DirectorCandidateBatch,
  type DirectorCorrectionPreset,
} from "@ai-novel/shared/types/novelDirector";
import { useI18n, type TranslateFn } from "@/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface NovelAutoDirectorCandidateBatchesProps {
  batches: DirectorCandidateBatch[];
  selectedPresets: DirectorCorrectionPreset[];
  feedback: string;
  onFeedbackChange: (value: string) => void;
  onTogglePreset: (preset: DirectorCorrectionPreset) => void;
  candidatePatchFeedbacks: Record<string, string>;
  onCandidatePatchFeedbackChange: (candidateId: string, value: string) => void;
  titlePatchFeedbacks: Record<string, string>;
  onTitlePatchFeedbackChange: (candidateId: string, value: string) => void;
  isGenerating: boolean;
  isPatchingCandidate: boolean;
  isRefiningTitle: boolean;
  isConfirming: boolean;
  onApplyCandidateTitleOption: (batchId: string, candidateId: string, option: TitleFactorySuggestion) => void;
  onPatchCandidate: (batchId: string, candidate: DirectorCandidate, feedback: string) => void;
  onRefineTitle: (batchId: string, candidate: DirectorCandidate, feedback: string) => void;
  onConfirmCandidate: (candidate: DirectorCandidate) => void | Promise<void>;
  onGenerateNext: () => void;
}

function buildFallbackTitleOption(candidate: DirectorCandidate, t: TranslateFn): TitleFactorySuggestion {
  return {
    title: candidate.workingTitle,
    clickRate: 60,
    style: "high_concept",
    angle: t("novelCreate.autoDirector.candidates.fallbackTitle.angle"),
    reason: t("novelCreate.autoDirector.candidates.fallbackTitle.reason"),
  };
}

function resolveCandidateTitleOptions(candidate: DirectorCandidate, t: TranslateFn): TitleFactorySuggestion[] {
  if (Array.isArray(candidate.titleOptions) && candidate.titleOptions.length > 0) {
    return candidate.titleOptions;
  }
  return [buildFallbackTitleOption(candidate, t)];
}

function renderCandidateDetails(candidate: DirectorCandidate, t: TranslateFn) {
  return [
    { label: t("novelCreate.autoDirector.candidates.detail.positioning"), value: candidate.positioning },
    { label: t("novelCreate.autoDirector.candidates.detail.sellingPoint"), value: candidate.sellingPoint },
    { label: t("novelCreate.autoDirector.candidates.detail.coreConflict"), value: candidate.coreConflict },
    { label: t("novelCreate.autoDirector.candidates.detail.protagonistPath"), value: candidate.protagonistPath },
    { label: t("novelCreate.autoDirector.candidates.detail.hookStrategy"), value: candidate.hookStrategy },
    { label: t("novelCreate.autoDirector.candidates.detail.progressionLoop"), value: candidate.progressionLoop },
    { label: t("novelCreate.autoDirector.candidates.detail.endingDirection"), value: candidate.endingDirection },
    { label: t("novelCreate.autoDirector.candidates.detail.targetChapterCount"), value: t("novelCreate.autoDirector.candidates.detail.targetChapterCountValue", { value: candidate.targetChapterCount }) },
  ];
}

function getPresetLabel(preset: DirectorCorrectionPreset, t: TranslateFn): string {
  const keyByValue = {
    more_hooky: "novelCreate.autoDirector.candidates.preset.moreHooky",
    stronger_conflict: "novelCreate.autoDirector.candidates.preset.strongerConflict",
    sharper_protagonist: "novelCreate.autoDirector.candidates.preset.sharperProtagonist",
    more_grounded: "novelCreate.autoDirector.candidates.preset.moreGrounded",
    lighter_ending: "novelCreate.autoDirector.candidates.preset.lighterEnding",
  } as const satisfies Record<DirectorCorrectionPreset, Parameters<TranslateFn>[0]>;
  return t(keyByValue[preset]);
}

export default function NovelAutoDirectorCandidateBatches(props: NovelAutoDirectorCandidateBatchesProps) {
  const {
    batches,
    selectedPresets,
    feedback,
    onFeedbackChange,
    onTogglePreset,
    candidatePatchFeedbacks,
    onCandidatePatchFeedbackChange,
    titlePatchFeedbacks,
    onTitlePatchFeedbackChange,
    isGenerating,
    isPatchingCandidate,
    isRefiningTitle,
    isConfirming,
    onApplyCandidateTitleOption,
    onPatchCandidate,
    onRefineTitle,
    onConfirmCandidate,
    onGenerateNext,
  } = props;
  const { t } = useI18n();

  if (batches.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        {t("novelCreate.autoDirector.candidates.empty")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {batches.map((batch) => (
        <section key={batch.id} className="rounded-xl border p-4">
          <div className="flex flex-col gap-2 border-b pb-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-base font-semibold text-foreground">{batch.roundLabel}</div>
              <div className="text-sm text-muted-foreground">
                {batch.refinementSummary?.trim() || t("novelCreate.autoDirector.candidates.initialBatch")}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {batch.presets.map((preset) => {
                const meta = DIRECTOR_CORRECTION_PRESETS.find((item) => item.value === preset);
                return meta ? <Badge key={preset} variant="outline">{getPresetLabel(meta.value, t)}</Badge> : null;
              })}
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {batch.candidates.map((candidate) => {
              const titleOptions = resolveCandidateTitleOptions(candidate, t);
              return (
                <article key={candidate.id} className="rounded-xl border bg-background p-4 shadow-sm">
                  <div className="space-y-2">
                    <div className="text-lg font-semibold text-foreground">{candidate.workingTitle}</div>
                    <div className="text-sm leading-6 text-muted-foreground">{candidate.logline}</div>
                    <div className="rounded-md border bg-muted/20 p-3">
                      <div className="text-sm font-medium text-foreground">{t("novelCreate.autoDirector.candidates.titleOptions.title")}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {titleOptions.map((option) => {
                          const active = option.title === candidate.workingTitle;
                          return (
                            <button
                              key={`${candidate.id}-${option.title}`}
                              type="button"
                              className={`rounded-full border px-3 py-1.5 text-left text-xs transition ${
                                active
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border bg-background text-foreground hover:border-primary/40"
                              }`}
                              onClick={() => onApplyCandidateTitleOption(batch.id, candidate.id, option)}
                            >
                              <span className="font-medium">{option.title}</span>
                              <span className="ml-2 text-muted-foreground">{t("novelCreate.autoDirector.candidates.titleOptions.clickRate", { value: option.clickRate })}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-2 text-xs leading-5 text-muted-foreground">
                        {titleOptions[0]?.reason?.trim() || t("novelCreate.autoDirector.candidates.titleOptions.description")}
                      </div>
                      <div className="mt-3 border-t pt-3">
                        <div className="text-xs font-medium text-foreground">{t("novelCreate.autoDirector.candidates.refineTitles.title")}</div>
                        <div className="mt-1 text-xs leading-5 text-muted-foreground">
                          {t("novelCreate.autoDirector.candidates.refineTitles.description")}
                        </div>
                        <Input
                          className="mt-2"
                          value={titlePatchFeedbacks[candidate.id] ?? ""}
                          onChange={(event) => onTitlePatchFeedbackChange(candidate.id, event.target.value)}
                          placeholder={t("novelCreate.autoDirector.candidates.refineTitles.placeholder")}
                        />
                        <div className="mt-2 flex justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isRefiningTitle || !titlePatchFeedbacks[candidate.id]?.trim()}
                            onClick={() => onRefineTitle(batch.id, candidate, titlePatchFeedbacks[candidate.id] ?? "")}
                          >
                            {isRefiningTitle ? t("novelCreate.autoDirector.candidates.refineTitles.loading") : t("novelCreate.autoDirector.candidates.refineTitles.action")}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-md bg-muted/30 p-3 text-sm leading-6 text-foreground">
                      <div className="font-medium">{t("novelCreate.autoDirector.candidates.whyFit.title")}</div>
                      <div className="mt-1 text-muted-foreground">{candidate.whyItFits}</div>
                    </div>
                    <div className="grid gap-2 text-sm">
                      {renderCandidateDetails(candidate, t).map((item) => (
                        <div key={item.label}>
                          <span className="font-medium text-foreground">{item.label}：</span>
                          <span className="text-muted-foreground">{item.value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {candidate.toneKeywords.map((keyword) => (
                        <Badge key={keyword} variant="secondary">{keyword}</Badge>
                      ))}
                    </div>
                    <div className="rounded-md border border-dashed p-3">
                      <div className="text-sm font-medium text-foreground">{t("novelCreate.autoDirector.candidates.patchCandidate.title")}</div>
                      <div className="mt-1 text-xs leading-5 text-muted-foreground">
                        {t("novelCreate.autoDirector.candidates.patchCandidate.description")}
                      </div>
                      <Input
                        className="mt-3"
                        value={candidatePatchFeedbacks[candidate.id] ?? ""}
                        onChange={(event) => onCandidatePatchFeedbackChange(candidate.id, event.target.value)}
                        placeholder={t("novelCreate.autoDirector.candidates.patchCandidate.placeholder")}
                      />
                      <div className="mt-2 flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isPatchingCandidate || !candidatePatchFeedbacks[candidate.id]?.trim()}
                          onClick={() => onPatchCandidate(batch.id, candidate, candidatePatchFeedbacks[candidate.id] ?? "")}
                        >
                          {isPatchingCandidate ? t("novelCreate.autoDirector.candidates.patchCandidate.loading") : t("novelCreate.autoDirector.candidates.patchCandidate.action")}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Button
                      type="button"
                      onClick={() => void onConfirmCandidate(candidate)}
                      disabled={isConfirming}
                    >
                      {isConfirming ? t("novelCreate.autoDirector.candidates.confirm.loading") : t("novelCreate.autoDirector.candidates.confirm.action")}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      <section className="rounded-xl border border-dashed p-4">
        <div className="text-base font-semibold text-foreground">{t("novelCreate.autoDirector.candidates.nextRound.title")}</div>
        <div className="mt-1 text-sm text-muted-foreground">
          {t("novelCreate.autoDirector.candidates.nextRound.description")}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {DIRECTOR_CORRECTION_PRESETS.map((preset) => {
            const active = selectedPresets.includes(preset.value);
            return (
              <button
                key={preset.value}
                type="button"
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:border-primary/40"
                }`}
                onClick={() => onTogglePreset(preset.value)}
              >
                {getPresetLabel(preset.value, t)}
              </button>
            );
          })}
        </div>

        <div className="mt-4 space-y-2">
          <label htmlFor="director-refine-feedback" className="text-sm font-medium text-foreground">
            {t("novelCreate.autoDirector.candidates.nextRound.feedbackLabel")}
          </label>
          <Input
            id="director-refine-feedback"
            value={feedback}
            onChange={(event) => onFeedbackChange(event.target.value)}
            placeholder={t("novelCreate.autoDirector.candidates.nextRound.feedbackPlaceholder")}
          />
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onGenerateNext}
            disabled={isGenerating}
          >
            {isGenerating ? t("novelCreate.autoDirector.candidates.nextRound.loading") : t("novelCreate.autoDirector.candidates.nextRound.action")}
          </Button>
        </div>
      </section>
    </div>
  );
}
