import type { TitleFactorySuggestion } from "@ai-novel/shared/types/title";
import {
  DIRECTOR_CORRECTION_PRESETS,
  type DirectorCandidate,
  type DirectorCandidateBatch,
  type DirectorCorrectionPreset,
} from "@ai-novel/shared/types/novelDirector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/i18n";


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

function buildFallbackTitleOption(candidate: DirectorCandidate): TitleFactorySuggestion {
  return {
    title: candidate.workingTitle,
    clickRate: 60,
    style: "high_concept",
    angle: "当前方案书名",
    reason: "当前沿用导演候选方案的书名。",
  };
}

function resolveCandidateTitleOptions(candidate: DirectorCandidate): TitleFactorySuggestion[] {
  if (Array.isArray(candidate.titleOptions) && candidate.titleOptions.length > 0) {
    return candidate.titleOptions;
  }
  return [buildFallbackTitleOption(candidate)];
}

function renderCandidateDetails(candidate: DirectorCandidate) {
  return [
    { label: t("作品定位"), value: candidate.positioning },
    { label: t("核心卖点"), value: candidate.sellingPoint },
    { label: t("主线冲突"), value: candidate.coreConflict },
    { label: t("主角路径"), value: candidate.protagonistPath },
    { label: t("主钩子"), value: candidate.hookStrategy },
    { label: t("推进循环"), value: candidate.progressionLoop },
    { label: t("结局方向"), value: candidate.endingDirection },
    { label: t("章节规模"), value: t("约 {{count}} 章", { count: candidate.targetChapterCount }) },
  ];
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

  if (batches.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        {t("先给 AI 一句灵感，它会先产出第一批整本书方向候选。")}</div>
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
                {batch.refinementSummary?.trim() || t("初始方案")}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {batch.presets.map((preset) => {
                const meta = DIRECTOR_CORRECTION_PRESETS.find((item) => item.value === preset);
                return meta ? <Badge key={preset} variant="outline">{meta.label}</Badge> : null;
              })}
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {batch.candidates.map((candidate) => {
              const titleOptions = resolveCandidateTitleOptions(candidate);
              return (
                <article key={candidate.id} className="rounded-xl border bg-background p-4 shadow-sm">
                  <div className="space-y-2">
                    <div className="text-lg font-semibold text-foreground">{candidate.workingTitle}</div>
                    <div className="text-sm leading-6 text-muted-foreground">{candidate.logline}</div>
                    <div className="rounded-md border bg-muted/20 p-3">
                      <div className="text-sm font-medium text-foreground">{t("书名候选")}</div>
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
                              <span className="ml-2 text-muted-foreground">{t("预估")}{option.clickRate}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-2 text-xs leading-5 text-muted-foreground">
                        {titleOptions[0]?.reason?.trim() || t("书名由标题工坊增强生成，你可以在这里切换当前方案名。")}
                      </div>
                      <div className="mt-3 border-t pt-3">
                        <div className="text-xs font-medium text-foreground">{t("AI 修正这组书名")}</div>
                        <div className="mt-1 text-xs leading-5 text-muted-foreground">
                          {t("适合“这组标题太土 / 太老派 / 不够都市 / 不够悬疑”这种定向修正。")}</div>
                        <Input
                          className="mt-2"
                          value={titlePatchFeedbacks[candidate.id] ?? ""}
                          onChange={(event) => onTitlePatchFeedbackChange(candidate.id, event.target.value)}
                          placeholder={t("例如：当前这组太土气了，想更偏都市冷感一点，别像旧式升级文。")}
                        />
                        <div className="mt-2 flex justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isRefiningTitle || !titlePatchFeedbacks[candidate.id]?.trim()}
                            onClick={() => onRefineTitle(batch.id, candidate, titlePatchFeedbacks[candidate.id] ?? "")}
                          >
                            {isRefiningTitle ? t("重做中...") : t("AI 重做标题组")}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-md bg-muted/30 p-3 text-sm leading-6 text-foreground">
                      <div className="font-medium">{t("为什么推荐这套")}</div>
                      <div className="mt-1 text-muted-foreground">{candidate.whyItFits}</div>
                    </div>
                    <div className="grid gap-2 text-sm">
                      {renderCandidateDetails(candidate).map((item) => (
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
                      <div className="text-sm font-medium text-foreground">{t("AI 微调这套方案")}</div>
                      <div className="mt-1 text-xs leading-5 text-muted-foreground">
                        {t("适合“我就偏向这套，但还有点偏差”的情况。AI 会保留这套主方向，只定向修正不对味的部分。")}</div>
                      <Input
                        className="mt-3"
                        value={candidatePatchFeedbacks[candidate.id] ?? ""}
                        onChange={(event) => onCandidatePatchFeedbackChange(candidate.id, event.target.value)}
                        placeholder={t("例如：保留这套，但更偏都市异能，主角更主动一点，别太像传统热血升级。")}
                      />
                      <div className="mt-2 flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isPatchingCandidate || !candidatePatchFeedbacks[candidate.id]?.trim()}
                          onClick={() => onPatchCandidate(batch.id, candidate, candidatePatchFeedbacks[candidate.id] ?? "")}
                        >
                          {isPatchingCandidate ? t("修正中...") : t("AI 修这套方案")}
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
                      {isConfirming ? t("正在进入导演流程...") : t("选用这套并创建项目")}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      <section className="rounded-xl border border-dashed p-4">
        <div className="text-base font-semibold text-foreground">{t("继续修正并生成下一轮")}</div>
        <div className="mt-1 text-sm text-muted-foreground">
          {t("如果这几套还不够对味，可以点几个方向，再补一句你真正想要的感觉。系统会保留上一轮，再给你一轮新的方案。")}</div>

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
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 space-y-2">
          <label htmlFor="director-refine-feedback" className="text-sm font-medium text-foreground">
            {t("再补一句修正建议")}</label>
          <Input
            id="director-refine-feedback"
            value={feedback}
            onChange={(event) => onFeedbackChange(event.target.value)}
            placeholder={t("例如：我想要女频成长感更强一点，别太像纯爱文，也不要太黑。")}
          />
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onGenerateNext}
            disabled={isGenerating}
          >
            {isGenerating ? t("生成中...") : t("带修正建议继续生成")}
          </Button>
        </div>
      </section>
    </div>
  );
}
