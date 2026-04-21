import type { ReactNode } from "react";
import type { Chapter, NovelBible, PipelineJob, PlotBeat, QualityScore, ReviewIssue } from "@ai-novel/shared/types/novel";
import AiButton from "@/components/common/AiButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import LLMSelector from "@/components/common/LLMSelector";
import StreamOutput from "@/components/common/StreamOutput";
import CollapsibleSummary from "./CollapsibleSummary";
import WorldInjectionHint from "./WorldInjectionHint";
import { getLowScoreChapterRange, getPipelineStageState, PIPELINE_STAGE_ITEMS } from "./pipelineTab.utils";
import DirectorTakeoverEntryPanel from "./DirectorTakeoverEntryPanel";
import { t } from "@/i18n";


interface PipelineTabProps {
  novelId: string;
  worldInjectionSummary: string | null;
  hasCharacters: boolean;
  directorTakeoverEntry?: ReactNode;
  onGoToCharacterTab: () => void;
  pipelineForm: {
    startOrder: number;
    endOrder: number;
    maxRetries: number;
    runMode: "fast" | "polish";
    autoReview: boolean;
    autoRepair: boolean;
    skipCompleted: boolean;
    qualityThreshold: number;
    repairMode: "detect_only" | "light_repair" | "heavy_repair" | "continuity_only" | "character_only" | "ending_only";
  };
  onPipelineFormChange: (
    field: "startOrder" | "endOrder" | "maxRetries" | "runMode" | "autoReview" | "autoRepair" | "skipCompleted" | "qualityThreshold" | "repairMode",
    value: number | boolean | string,
  ) => void;
  maxOrder: number;
  onGenerateBible: () => void;
  onAbortBible: () => void;
  isBibleStreaming: boolean;
  bibleStreamContent: string;
  onGenerateBeats: () => void;
  onAbortBeats: () => void;
  isBeatsStreaming: boolean;
  beatsStreamContent: string;
  onRunPipeline: (patch?: Partial<PipelineTabProps["pipelineForm"]>) => void;
  isRunningPipeline: boolean;
  pipelineMessage: string;
  pipelineJob?: PipelineJob;
  chapters: Chapter[];
  selectedChapterId: string;
  onSelectedChapterChange: (chapterId: string) => void;
  onReviewChapter: () => void;
  isReviewing: boolean;
  onRepairChapter: () => void;
  isRepairing: boolean;
  onGenerateHook: () => void;
  isGeneratingHook: boolean;
  reviewResult: {
    score: QualityScore;
    issues: ReviewIssue[];
  } | null;
  repairBeforeContent: string;
  repairAfterContent: string;
  repairStreamContent: string;
  isRepairStreaming: boolean;
  onAbortRepair: () => void;
  qualitySummary?: QualityScore;
  chapterReports: Array<{
    chapterId?: string | null;
    coherence: number;
    repetition: number;
    pacing: number;
    voice: number;
    engagement: number;
    overall: number;
    issues?: string | null;
  }>;
  bible?: NovelBible | null;
  plotBeats: PlotBeat[];
}

function repairModeLabel(mode: PipelineTabProps["pipelineForm"]["repairMode"]): string {
  const mapping: Record<PipelineTabProps["pipelineForm"]["repairMode"], string> = {
    detect_only: "只检测不修复",
    light_repair: "自动轻修",
    heavy_repair: "自动重修",
    continuity_only: "只修连续性",
    character_only: "只修人设",
    ending_only: "只修结尾力度",
  };
  return mapping[mode];
}

function stageStatusLabel(state: "pending" | "active" | "completed" | "failed"): string {
  if (state === "active") return t("进行中");
  if (state === "completed") return t("已完成");
  if (state === "failed") return t("异常");
  return t("待执行");
}

export default function PipelineTab(props: PipelineTabProps) {
  const {
    worldInjectionSummary,
    hasCharacters,
    onGoToCharacterTab,
    pipelineForm,
    onPipelineFormChange,
    maxOrder,
    onGenerateBible,
    onAbortBible,
    isBibleStreaming,
    bibleStreamContent,
    onGenerateBeats,
    onAbortBeats,
    isBeatsStreaming,
    beatsStreamContent,
    onRunPipeline,
    isRunningPipeline,
    pipelineMessage,
    pipelineJob,
    chapters,
    selectedChapterId,
    onSelectedChapterChange,
    onReviewChapter,
    isReviewing,
    onRepairChapter,
    isRepairing,
    onGenerateHook,
    isGeneratingHook,
    reviewResult,
    repairBeforeContent,
    repairAfterContent,
    repairStreamContent,
    isRepairStreaming,
    onAbortRepair,
    qualitySummary,
    chapterReports,
    bible,
    plotBeats,
    directorTakeoverEntry,
  } = props;

  const lowScoreRange = getLowScoreChapterRange(chapters, chapterReports, pipelineForm.qualityThreshold);
  const lowScoreReports = chapterReports
    .filter((item) => item.chapterId && item.overall < pipelineForm.qualityThreshold)
    .slice(0, 12);
  const pendingRepairCount = chapterReports.filter((item) => item.chapterId && item.overall < pipelineForm.qualityThreshold).length;

  const exportPipelineReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      pipelineForm,
      pipelineJob,
      qualitySummary,
      chapterReports,
      lowScoreThreshold: pipelineForm.qualityThreshold,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pipeline-report-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <DirectorTakeoverEntryPanel
        title={t("从质量修复接管")}
        description={t("AI 会优先判断当前是否有活动中的章节批次或待修检查点，再决定恢复当前修复还是新开批次。")}
        entry={directorTakeoverEntry}
      />
      <Card>
        <CardHeader>
          <CardTitle>{t("批量生成与质检")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <WorldInjectionHint worldInjectionSummary={worldInjectionSummary} />
          {!hasCharacters ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
              <span>{t("请先添加至少 1 个角色，再执行流水线。")}</span>
              <Button size="sm" variant="outline" onClick={onGoToCharacterTab}>{t("去角色管理")}</Button>
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground">{t("当前重点")}</div>
              <div className="mt-1 text-sm font-semibold text-foreground">
                {pendingRepairCount > 0 ? t("先处理 {{pendingRepairCount}} 个低分章节", { pendingRepairCount: pendingRepairCount }) : t("当前没有明显低分章节")}
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground">{t("质量阈值")}</div>
              <div className="mt-1 text-sm font-semibold text-foreground">{pipelineForm.qualityThreshold}</div>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground">{t("当前运行模式")}</div>
              <div className="mt-1 text-sm font-semibold text-foreground">{pipelineForm.runMode === "polish" ? t("精修") : t("快速")}</div>
            </div>
          </div>
          {pipelineMessage ? <div className="text-sm text-muted-foreground">{pipelineMessage}</div> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("质量修复中心")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <select
            className="w-full rounded-md border bg-background p-2 text-sm"
            value={selectedChapterId}
            onChange={(event) => onSelectedChapterChange(event.target.value)}
          >
            {chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>{t("第")}{chapter.order}{t("章 -")}{chapter.title}</option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            <AiButton onClick={onReviewChapter} disabled={isReviewing || !selectedChapterId}>{t("执行审校")}</AiButton>
            <AiButton variant="secondary" onClick={onRepairChapter} disabled={isRepairing || !selectedChapterId}>{t("执行修复")}</AiButton>
            <AiButton variant="outline" onClick={onGenerateHook} disabled={isGeneratingHook || !selectedChapterId}>{t("生成钩子")}</AiButton>
          </div>
          {reviewResult ? (
            <div className="rounded-md border p-3 text-sm">
              <div className="mb-2 font-medium">{t("审校评分")}</div>
              <div className="grid gap-1 md:grid-cols-2">
                <div>{t("连贯性：")}{reviewResult.score.coherence}</div>
                <div>{t("重复率：")}{reviewResult.score.repetition}</div>
                <div>{t("节奏：")}{reviewResult.score.pacing}</div>
                <div>{t("口吻：")}{reviewResult.score.voice}</div>
                <div>{t("追更感：")}{reviewResult.score.engagement}</div>
                <div>{t("综合：")}{reviewResult.score.overall}</div>
              </div>
            </div>
          ) : null}
          <StreamOutput content={repairStreamContent} isStreaming={isRepairStreaming} onAbort={onAbortRepair} />
          {(repairBeforeContent || repairAfterContent) ? (
            <div className="grid gap-3 md:grid-cols-2">
              <pre className="max-h-[220px] overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-2 text-xs">{repairBeforeContent || t("暂无")}</pre>
              <pre className="max-h-[220px] overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-2 text-xs">{repairAfterContent || t("修复执行后显示")}</pre>
            </div>
          ) : null}
          {lowScoreReports.length > 0 ? (
            <div className="space-y-2 rounded-md border p-2 text-xs">
              <div className="font-medium">{t("低分章节筛选（阈值")}{pipelineForm.qualityThreshold}）</div>
              {lowScoreReports.map((item, index) => (
                <div key={`${item.chapterId}-${index}`} className="flex items-center justify-between">
                  <span>{item.chapterId}</span>
                  <Badge variant="secondary">overall {item.overall}</Badge>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <details className="group rounded-2xl border border-border/70 bg-background/95 p-4">
        <summary className="cursor-pointer list-none">
          <CollapsibleSummary
            title={t("流水线配置、运行与模型设置")}
            description={t("批量任务、模型和高级参数都收在这里。默认先处理当前问题章节，只有需要批量推进时再展开。")}
          />
        </summary>

        <div className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("模型与配置")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <LLMSelector />
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">{t("起始章节")}</div>
                  <Input
                    type="number"
                    min={1}
                    max={maxOrder}
                    value={pipelineForm.startOrder}
                    onChange={(event) => onPipelineFormChange("startOrder", Number(event.target.value) || 1)}
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">{t("结束章节")}</div>
                  <Input
                    type="number"
                    min={1}
                    max={maxOrder}
                    value={pipelineForm.endOrder}
                    onChange={(event) => onPipelineFormChange("endOrder", Number(event.target.value) || 1)}
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">{t("失败重试")}</div>
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    value={pipelineForm.maxRetries}
                    onChange={(event) => onPipelineFormChange("maxRetries", Number(event.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">{t("运行模式")}</div>
                  <select
                    className="w-full rounded-md border bg-background p-2 text-sm"
                    value={pipelineForm.runMode}
                    onChange={(event) => onPipelineFormChange("runMode", event.target.value)}
                  >
                    <option value="fast">{t("快速")}</option>
                    <option value="polish">{t("精修")}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">{t("质量阈值")}</div>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={pipelineForm.qualityThreshold}
                    onChange={(event) => onPipelineFormChange("qualityThreshold", Number(event.target.value) || 75)}
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">{t("修复模式")}</div>
                  <select
                    className="w-full rounded-md border bg-background p-2 text-sm"
                    value={pipelineForm.repairMode}
                    onChange={(event) => onPipelineFormChange("repairMode", event.target.value)}
                  >
                    <option value="detect_only">{t("只检测不修复")}</option>
                    <option value="light_repair">{t("自动轻修")}</option>
                    <option value="heavy_repair">{t("自动重修")}</option>
                    <option value="continuity_only">{t("只修连续性")}</option>
                    <option value="character_only">{t("只修人设")}</option>
                    <option value="ending_only">{t("只修结尾力度")}</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={pipelineForm.autoReview}
                    onChange={(event) => onPipelineFormChange("autoReview", event.target.checked)}
                  />
                  {t("自动审校")}</label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={pipelineForm.autoRepair}
                    onChange={(event) => onPipelineFormChange("autoRepair", event.target.checked)}
                  />
                  {t("自动修复")}</label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={pipelineForm.skipCompleted}
                    onChange={(event) => onPipelineFormChange("skipCompleted", event.target.checked)}
                  />
                  {t("跳过已完成章节")}</label>
              </div>
              <div className="rounded-md border bg-muted/20 p-2 text-xs text-muted-foreground">
                {t("当前设置：")}{pipelineForm.runMode === "polish" ? t("精修") : t("快速")} {t("| 阈值")}{pipelineForm.qualityThreshold} | {repairModeLabel(pipelineForm.repairMode)}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("阶段可视化")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {PIPELINE_STAGE_ITEMS.map((stage) => {
                  const state = getPipelineStageState(stage.key, pipelineJob, PIPELINE_STAGE_ITEMS);
                  return (
                    <div
                      key={stage.key}
                      className={`rounded-md border px-3 py-2 text-sm ${
                        state === "active"
                          ? "border-primary bg-primary/10"
                          : state === "completed"
                            ? "border-emerald-500/30 bg-emerald-500/10"
                            : state === "failed"
                              ? "border-red-400/40 bg-red-500/10"
                              : "border-border bg-background"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{stage.label}</span>
                        <span className="text-xs text-muted-foreground">{stageStatusLabel(state)}</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("运行面板")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <AiButton onClick={() => onRunPipeline()} disabled={isRunningPipeline || !hasCharacters}>{t("启动批量生成")}</AiButton>
                  <AiButton
                    variant="outline"
                    onClick={() => {
                      if (!lowScoreRange) {
                        return;
                      }
                      onRunPipeline({
                        startOrder: lowScoreRange.startOrder,
                        endOrder: lowScoreRange.endOrder,
                        skipCompleted: true,
                      });
                    }}
                    disabled={isRunningPipeline || !lowScoreRange}
                  >
                    {t("仅重跑低分章节")}</AiButton>
                  <Button variant="outline" onClick={exportPipelineReport}>{t("导出任务报告")}</Button>
                  <AiButton onClick={onGenerateBible} disabled={isBibleStreaming || !hasCharacters}>{t("生成圣经")}</AiButton>
                  <Button variant="secondary" onClick={onAbortBible} disabled={!isBibleStreaming}>{t("停止圣经")}</Button>
                  <AiButton onClick={onGenerateBeats} disabled={isBeatsStreaming || !hasCharacters}>{t("生成拍点")}</AiButton>
                  <Button variant="secondary" onClick={onAbortBeats} disabled={!isBeatsStreaming}>{t("停止拍点")}</Button>
                </div>
                {lowScoreRange ? (
                  <div className="text-xs text-muted-foreground">
                    {t("低分章节")}{lowScoreRange.count} {t("个，可重跑范围：第")}{lowScoreRange.startOrder} {t("章 - 第")}{lowScoreRange.endOrder} {t("章。")}</div>
                ) : (
                  <div className="text-xs text-muted-foreground">{t("当前无低于阈值的章节。")}</div>
                )}
                <div className="rounded-md border p-3 text-sm">
                  <div className="mb-2 font-medium">{t("任务状态")}</div>
                  {pipelineJob ? (
                    <div className="space-y-1">
                      <div>{t("任务ID：")}{pipelineJob.id}</div>
                      <div>{t("状态：")}{pipelineJob.status}</div>
                      <div>{t("当前阶段：")}{pipelineJob.currentStage || "-"}</div>
                      <div>{t("当前章节：")}{pipelineJob.currentItemLabel || "-"}</div>
                      <div>{t("进度：")}{Math.round((pipelineJob.progress ?? 0) * 100)}%</div>
                      <div>{t("完成：")}{pipelineJob.completedCount}/{pipelineJob.totalCount}</div>
                      <div>{t("重试：")}{pipelineJob.retryCount}/{pipelineJob.maxRetries}</div>
                      {pipelineJob.lastErrorType ? <div>{t("失败分类：")}{pipelineJob.lastErrorType}</div> : null}
                      {pipelineJob.error ? <div className="text-red-600">{t("错误：")}{pipelineJob.error}</div> : null}
                    </div>
                  ) : (
                    <div className="text-muted-foreground">{t("暂无运行中的流水线任务。")}</div>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <StreamOutput content={bibleStreamContent} isStreaming={isBibleStreaming} onAbort={onAbortBible} />
                  <StreamOutput content={beatsStreamContent} isStreaming={isBeatsStreaming} onAbort={onAbortBeats} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </details>

      <details className="group rounded-2xl border border-border/70 bg-background/95 p-4">
        <summary className="cursor-pointer list-none">
          <CollapsibleSummary
            title={t("质量报告与衍生产物")}
            description={t("全量质量报告、已保存圣经和拍点都属于查看型信息，默认收起。")}
          />
        </summary>

        <div className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("质量报告总览")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {qualitySummary ? (
                <div className="grid gap-2 md:grid-cols-3">
                  <Badge variant="outline">{t("连贯性：")}{qualitySummary.coherence}</Badge>
                  <Badge variant="outline">{t("重复率：")}{qualitySummary.repetition}</Badge>
                  <Badge variant="outline">{t("节奏：")}{qualitySummary.pacing}</Badge>
                  <Badge variant="outline">{t("口吻：")}{qualitySummary.voice}</Badge>
                  <Badge variant="outline">{t("追更感：")}{qualitySummary.engagement}</Badge>
                  <Badge variant="default">{t("综合：")}{qualitySummary.overall}</Badge>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">{t("暂无质量报告。")}</div>
              )}
              <div className="space-y-2 text-sm">
                {chapterReports.slice(0, 10).map((item, index) => (
                  <div key={`${item.chapterId ?? "novel"}-${index}`} className="rounded-md border p-2">
                    <div>{t("章节：")}{item.chapterId ?? t("全书")}</div>
                    <div className="text-muted-foreground">
                      {t("综合：")}{item.overall}{t("，连贯性：")}{item.coherence}{t("，重复率：")}{item.repetition}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>{t("已保存圣经")}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {bible ? (
                  <>
                    <div className="rounded-md border p-2"><div className="font-medium">{t("主线承诺")}</div><div className="text-muted-foreground">{bible.mainPromise ?? t("暂无")}</div></div>
                    <div className="rounded-md border p-2"><div className="font-medium">{t("核心设定")}</div><div className="text-muted-foreground">{bible.coreSetting ?? t("暂无")}</div></div>
                    <div className="rounded-md border p-2"><div className="font-medium">{t("世界规则")}</div><div className="text-muted-foreground">{bible.worldRules ?? t("暂无")}</div></div>
                  </>
                ) : (
                  <div className="text-muted-foreground">{t("暂无作品圣经。")}</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>{t("已保存拍点")}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {plotBeats.length > 0 ? (
                  plotBeats.slice(0, 20).map((beat) => (
                    <div key={beat.id} className="rounded-md border p-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">{t("第")}{beat.chapterOrder ?? "-"} {t("章 ·")}{beat.title}</div>
                        <Badge variant="outline">{beat.status}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{t("类型：")}{beat.beatType}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground">{t("暂无剧情拍点。")}</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </details>
    </div>
  );
}
