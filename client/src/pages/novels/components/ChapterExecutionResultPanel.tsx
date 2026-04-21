import type {
  AuditReport,
  Chapter,
  ReplanRecommendation,
  ReplanResult,
  StoryPlan,
  StoryStateSnapshot,
} from "@ai-novel/shared/types/novel";
import type { SSEFrame } from "@ai-novel/shared/types/api";
import type { ChapterRuntimePackage } from "@ai-novel/shared/types/chapterRuntime";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MarkdownViewer from "@/components/common/MarkdownViewer";
import StreamOutput from "@/components/common/StreamOutput";
import CollapsibleSummary from "./CollapsibleSummary";
import {
  ChapterRuntimeAuditCard,
  ChapterRuntimeContextCard,
  ChapterRuntimeLengthCard,
} from "./ChapterRuntimePanels";
import {
  hasText,
  parseChapterScenePlanForDisplay,
  resolveDisplayedChapterStatus,
  type AssetTabKey,
  MetricBadge,
} from "./chapterExecution.shared";
import { t } from "@/i18n";


interface ChapterExecutionResultPanelProps {
  novelId: string;
  selectedChapter: Chapter | undefined;
  assetTab: AssetTabKey;
  onAssetTabChange: (tab: AssetTabKey) => void;
  chapterPlan?: StoryPlan | null;
  latestStateSnapshot?: StoryStateSnapshot | null;
  chapterAuditReports: AuditReport[];
  replanRecommendation?: ReplanRecommendation | null;
  onReplanChapter: () => void;
  isReplanningChapter: boolean;
  lastReplanResult?: ReplanResult | null;
  chapterQualityReport?: {
    coherence: number;
    repetition: number;
    pacing: number;
    voice: number;
    engagement: number;
    overall: number;
    issues?: string | null;
  };
  chapterRuntimePackage?: ChapterRuntimePackage | null;
  reviewResult: {
    issues?: Array<{ category: string; fixSuggestion: string }>;
  } | null;
  openAuditIssues: Array<{ id: string; auditType: string; fixSuggestion: string }>;
  streamContent: string;
  isStreaming: boolean;
  streamingChapterId?: string | null;
  streamingChapterLabel?: string | null;
  chapterRunStatus?: Extract<SSEFrame, { type: "run_status" }> | null;
  onAbortStream: () => void;
  onRunFullAudit: () => void;
  isRunningFullAudit: boolean;
  onAutoRepair: () => void;
  repairStreamContent: string;
  isRepairStreaming: boolean;
  repairStreamingChapterId?: string | null;
  repairStreamingChapterLabel?: string | null;
  repairRunStatus?: Extract<SSEFrame, { type: "run_status" }> | null;
  onAbortRepair: () => void;
}

function PanelHintCard(props: { title: string; content: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/90 p-4">
      <div className="text-xs text-muted-foreground">{props.title}</div>
      <div className="mt-2 text-sm leading-7 text-foreground">{props.content}</div>
    </div>
  );
}

function WorkspaceNotice(props: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-900">
      <div className="font-medium">{props.title}</div>
      <div className="mt-1 leading-6 text-amber-800">{props.description}</div>
    </div>
  );
}

export default function ChapterExecutionResultPanel(props: ChapterExecutionResultPanelProps) {
  const {
    novelId,
    selectedChapter,
    assetTab,
    onAssetTabChange,
    chapterPlan,
    latestStateSnapshot,
    chapterAuditReports,
    replanRecommendation,
    onReplanChapter,
    isReplanningChapter,
    lastReplanResult,
    chapterQualityReport,
    chapterRuntimePackage,
    reviewResult,
    openAuditIssues,
    streamContent,
    isStreaming,
    streamingChapterId,
    streamingChapterLabel,
    chapterRunStatus,
    onAbortStream,
    onRunFullAudit,
    isRunningFullAudit,
    onAutoRepair,
    repairStreamContent,
    isRepairStreaming,
    repairStreamingChapterId,
    repairStreamingChapterLabel,
    repairRunStatus,
    onAbortRepair,
  } = props;

  if (!selectedChapter) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-sm leading-7 text-muted-foreground">
        {t("先从左侧选中一个章节，这里会变成当前章节的主写作区，集中展示正文、任务单、质量反馈和修复记录。")}</div>
    );
  }

  const chapterLabel = t("第{{order}}章", { order: selectedChapter.order });
  const chapterTitle = selectedChapter.title || t("未命名章节");
  const runtimePackage = chapterRuntimePackage?.chapterId === selectedChapter.id ? chapterRuntimePackage : null;
  const lengthControl = runtimePackage?.lengthControl ?? null;
  const chapterObjective = chapterPlan?.objective ?? selectedChapter.expectation ?? t("这一章还没有明确目标，建议先补章节计划。");
  const scenePlan = parseChapterScenePlanForDisplay(selectedChapter);
  const savedChapterContent = selectedChapter.content?.trim() ?? "";
  const hasSavedChapterContent = hasText(savedChapterContent);

  const isSelectedChapterStreaming = isStreaming && streamingChapterId === selectedChapter.id;
  const isSelectedChapterFinalizing = isSelectedChapterStreaming && chapterRunStatus?.phase === "finalizing";
  const visibleLiveWritingOutput = streamingChapterId === selectedChapter.id ? streamContent : "";
  const hasVisibleLiveWritingOutput = hasText(visibleLiveWritingOutput);
  const useLiveWritingPanel = isSelectedChapterStreaming || (!hasSavedChapterContent && hasVisibleLiveWritingOutput);
  const contentPanelTitle = isSelectedChapterFinalizing
    ? t("章节收尾中")
    : useLiveWritingPanel
      ? t("实时写作稿")
      : t("已保存正文");
  const contentPanelContent = useLiveWritingPanel
    ? visibleLiveWritingOutput
    : hasSavedChapterContent
      ? savedChapterContent
      : hasVisibleLiveWritingOutput
        ? visibleLiveWritingOutput
        : "";
  const contentPanelWordCount = contentPanelContent.trim().length;

  const isSelectedChapterRepairStreaming = isRepairStreaming && repairStreamingChapterId === selectedChapter.id;
  const isSelectedChapterRepairFinalizing = isSelectedChapterRepairStreaming && repairRunStatus?.phase === "finalizing";
  const visibleRepairStreamContent = repairStreamingChapterId === selectedChapter.id ? repairStreamContent : "";
  const hasVisibleRepairOutput = hasText(visibleRepairStreamContent);

  const writingInOtherChapter = isStreaming && streamingChapterId && streamingChapterId !== selectedChapter.id;
  const repairingOtherChapter = isRepairStreaming && repairStreamingChapterId && repairStreamingChapterId !== selectedChapter.id;

  const targetWordCount = selectedChapter.targetWordCount ?? null;
  const qualityOverall = chapterQualityReport?.overall ?? selectedChapter.qualityScore ?? null;
  const detailTab = assetTab === "content" ? "taskSheet" : assetTab;
  const contentViewportRef = useRef<HTMLDivElement | null>(null);
  const detailSectionRef = useRef<HTMLDetailsElement | null>(null);
  const [isDetailSectionOpen, setIsDetailSectionOpen] = useState(false);
  const displayedStatus = resolveDisplayedChapterStatus(selectedChapter);
  const needsAuditPrompt = displayedStatus === "pending_review"
    && selectedChapter.generationState !== "reviewed"
    && selectedChapter.generationState !== "approved";
  const needsConfirmationPrompt = displayedStatus === "pending_review"
    && (selectedChapter.generationState === "reviewed" || selectedChapter.generationState === "approved");
  const needsRepairPrompt = displayedStatus === "needs_repair";

  useEffect(() => {
    if (!isSelectedChapterStreaming && !isSelectedChapterFinalizing) {
      return;
    }
    const viewport = contentViewportRef.current;
    if (!viewport) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      viewport.scrollTop = viewport.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [contentPanelContent, isSelectedChapterFinalizing, isSelectedChapterStreaming, selectedChapter.id]);

  const openQualityPanel = () => {
    setIsDetailSectionOpen(true);
    onAssetTabChange("quality");
    window.requestAnimationFrame(() => {
      detailSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const openRepairPanel = () => {
    setIsDetailSectionOpen(true);
    onAssetTabChange("repair");
    window.requestAnimationFrame(() => {
      detailSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const runAutoRepairFromWorkspace = () => {
    openRepairPanel();
    onAutoRepair();
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-border/70">
        <CardHeader className="gap-4 border-b bg-gradient-to-b from-muted/30 via-background to-background pb-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{chapterLabel}</Badge>
                <Badge variant={isSelectedChapterStreaming ? "default" : "secondary"}>
                  {isSelectedChapterFinalizing
                    ? t("正在收尾处理")
                    : isSelectedChapterStreaming
                      ? t("正在实时写作")
                      : t("章节结果工作台")}
                </Badge>
                {typeof qualityOverall === "number" ? (
                  <Badge variant={qualityOverall >= 85 ? "default" : qualityOverall >= 70 ? "outline" : "secondary"}>
                    {t("质量")}{qualityOverall}
                  </Badge>
                ) : null}
                {targetWordCount ? <Badge variant="outline">{t("目标")}{targetWordCount} {t("字")}</Badge> : null}
              </div>
              <div>
                <CardTitle className="text-lg">{chapterTitle}</CardTitle>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
                  {t("这里是当前章节的主写作区，正文会稳定占据中心位置，任务单、质量报告和修复记录退到次级标签里，避免正文被操作区挤压。")}</p>
              </div>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to={`/novels/${novelId}/chapters/${selectedChapter.id}`}>{t("打开章节编辑器")}</Link>
            </Button>
          </div>

          <div className={`grid gap-3 md:grid-cols-2 ${lengthControl ? "xl:grid-cols-5" : "xl:grid-cols-4"}`}>
            <MetricBadge label={t("当前字数")} value={String(contentPanelWordCount || selectedChapter.content?.length || 0)} hint="主面板正在展示的正文长度" />
            <MetricBadge label={t("章节目标")} value={targetWordCount ? t("{{targetWordCount}} 字", { targetWordCount: targetWordCount }) : t("未设定")} hint="用于判断当前篇幅是否足够" />
            {lengthControl ? (
              <MetricBadge
                label={t("预算区间")}
                value={`${lengthControl.softMinWordCount}-${lengthControl.softMaxWordCount}`}
                hint={t("硬上限 {{hardMaxWordCount}} 字", { hardMaxWordCount: lengthControl.hardMaxWordCount })}
              />
            ) : null}
            <MetricBadge label={t("待处理问题")} value={String(openAuditIssues.length || reviewResult?.issues?.length || 0)} hint="未修复的问题越少，越适合进入精修" />
            {lengthControl ? (
              <MetricBadge
                label={t("控字模式")}
                value={lengthControl.wordControlMode === "prompt_only" ? t("自然优先") : lengthControl.wordControlMode === "balanced" ? t("标准控字") : t("混合控字")}
                hint={t("偏差 {{value}}%", { value: Math.round(lengthControl.variance * 100) })}
              />
            ) : null}
            <MetricBadge label={t("最近更新")} value={selectedChapter.updatedAt ? new Date(selectedChapter.updatedAt).toLocaleString("zh-CN") : t("暂无")} hint="帮助判断这一章是否需要重新检查" />
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-5">
          {writingInOtherChapter ? (
            <WorkspaceNotice
              title={t("还有其他章节正在后台写作")}
              description={t("{{value}} 仍在生成中。切到这一章后不会再把那一章的流式正文带过来，返回对应章节即可继续查看实时输出。", { value: streamingChapterLabel ?? t("另一章") })}
            />
          ) : null}

          <div className="rounded-[28px] border border-border/80 bg-gradient-to-br from-slate-50 via-background to-amber-50/40 p-5 shadow-sm">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={isSelectedChapterStreaming ? "default" : "secondary"}>
                  {isSelectedChapterFinalizing
                    ? t("收尾处理中")
                    : isSelectedChapterStreaming
                      ? t("实时写作中")
                      : t("已保存版本")}
                </Badge>
                <Badge variant="outline">{chapterLabel}</Badge>
                <Badge variant="outline">{t("当前展示")}{contentPanelWordCount} {t("字")}</Badge>
              </div>
              <div>
                <div className="text-xl font-semibold text-foreground">{chapterTitle}</div>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">{chapterObjective}</p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-border/80 bg-background shadow-sm">
            <div className="flex flex-col gap-3 border-b bg-muted/20 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-sm font-semibold text-foreground">{contentPanelTitle}</div>
                <div className="mt-1 text-xs leading-6 text-muted-foreground">
                  {isSelectedChapterFinalizing
                    ? (chapterRunStatus?.message ?? t("正文已经输出完成，系统正在保存草稿、执行审计并同步章节状态。"))
                    : isSelectedChapterStreaming
                      ? t("AI 正在持续输出这一章的正文，先在这里观察节奏和手感，不满意时可以随时停止。")
                      : t("正文固定显示在主区域，任务单、质量反馈和修复记录都收进下面的详情区。")}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("字数")}{contentPanelWordCount}</span>
                {needsAuditPrompt ? (
                  <Button size="sm" onClick={onRunFullAudit} disabled={isRunningFullAudit}>
                    {isRunningFullAudit ? t("审校中...") : t("去审校")}
                  </Button>
                ) : null}
                {needsConfirmationPrompt ? (
                  <Button size="sm" variant="outline" onClick={openQualityPanel}>
                    {t("查看建议")}</Button>
                ) : null}
                {(needsConfirmationPrompt || needsRepairPrompt) ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={runAutoRepairFromWorkspace}
                    disabled={isSelectedChapterRepairStreaming}
                  >
                    {isSelectedChapterRepairStreaming ? t("修复中...") : t("一键修复")}
                  </Button>
                ) : null}
                {isSelectedChapterStreaming && !isSelectedChapterFinalizing ? (
                  <Button size="sm" variant="secondary" onClick={onAbortStream}>
                    {t("停止生成")}</Button>
                ) : null}
              </div>
            </div>

            <div ref={contentViewportRef} className="max-h-[760px] overflow-y-auto px-6 py-6 lg:px-10">
              {contentPanelContent ? (
                <article className="mx-auto max-w-4xl text-[15px] leading-8 text-foreground">
                  <MarkdownViewer content={contentPanelContent} />
                </article>
              ) : (
                <div className="mx-auto max-w-3xl rounded-3xl border border-dashed bg-muted/15 p-8 text-sm leading-7 text-muted-foreground">
                  {t("当前章节还没有正文。建议先补章节计划或任务单，然后从右侧直接执行“写本章”。")}</div>
              )}
            </div>
          </div>

          {lengthControl ? (
            <div className="rounded-2xl border border-border/70 bg-muted/15 p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">scene {lengthControl.generatedSceneCount}/{lengthControl.plannedSceneCount}</Badge>
                <Badge variant="secondary">{t("硬停")}{lengthControl.hardStopsTriggered} {t("次")}</Badge>
                {lengthControl.closingPhaseTriggered ? <Badge variant="default">{t("已进入收尾区")}</Badge> : null}
                {lengthControl.overlengthRepairApplied ? <Badge variant="outline">{t("已触发超长修整")}</Badge> : null}
              </div>
              <div className="mt-2 text-xs leading-6 text-muted-foreground">
                {lengthControl.lengthRepairPath.length > 0
                  ? t("本次长度修整路径：{{value}}", { value: lengthControl.lengthRepairPath.join(" -> ") })
                  : t("本次写作未触发额外长度修整。")}
              </div>
            </div>
          ) : null}

          <details
            ref={detailSectionRef}
            className="group rounded-2xl border border-border/70 bg-background/95 p-4"
            open={isDetailSectionOpen}
            onToggle={(event) => setIsDetailSectionOpen((event.currentTarget as HTMLDetailsElement).open)}
          >
            <summary className="cursor-pointer list-none">
              <CollapsibleSummary
                title={t("章节详情区")}
                description={t("这里收纳任务单、场景拆解、质量报告和修复记录，默认收起，避免主写作区被次级信息挤满。")}
                meta={(
                  <>
                    <span>{t("任务单")}</span>
                    <span>{t("场景拆解")}</span>
                    <span>{t("质量报告")}</span>
                    <span>{t("修复记录")}</span>
                  </>
                )}
              />
            </summary>

            <div className="mt-4">
              <Tabs value={detailTab} onValueChange={(value) => onAssetTabChange(value as AssetTabKey)}>
                <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl bg-muted/50 p-1.5">
                  <TabsTrigger value="taskSheet" className="rounded-xl">{t("任务单")}</TabsTrigger>
                  <TabsTrigger value="sceneCards" className="rounded-xl">{t("场景拆解")}</TabsTrigger>
                  <TabsTrigger value="quality" className="rounded-xl">{t("质量报告")}</TabsTrigger>
                  <TabsTrigger value="repair" className="rounded-xl">{t("修复记录")}</TabsTrigger>
                </TabsList>

                <TabsContent value="taskSheet" className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-2xl border bg-muted/20 p-5">
                      <div className="text-xs text-muted-foreground">{t("本章任务单")}</div>
                      <div className="mt-3 whitespace-pre-wrap text-sm leading-7">
                        {selectedChapter.taskSheet?.trim() || t("暂无任务单。你可以先让 AI 生成任务单，再回来继续写这章。")}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <PanelHintCard title={t("章节目标")} content={chapterObjective} />
                      <PanelHintCard title={t("最新状态")} content={latestStateSnapshot?.summary || t("暂无状态摘要。")} />
                    </div>
                  </div>
                  <ChapterRuntimeContextCard
                    runtimePackage={runtimePackage}
                    chapterPlan={chapterPlan}
                    stateSnapshot={latestStateSnapshot}
                  />
                </TabsContent>

                <TabsContent value="sceneCards" className="space-y-4">
                  <ChapterRuntimeLengthCard runtimePackage={runtimePackage} />
                  {scenePlan ? (
                    <div className="space-y-3">
                      <div className="rounded-2xl border bg-muted/20 p-5">
                        <div className="text-xs text-muted-foreground">{t("场景预算合同")}</div>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <MetricBadge label={t("章节目标")} value={t("{{targetWordCount}} 字", { targetWordCount: scenePlan.targetWordCount })} />
                          <MetricBadge label={t("场景数")} value={String(scenePlan.scenes.length)} />
                        </div>
                      </div>
                      {scenePlan.scenes.map((scene, index) => (
                        <div key={scene.key} className="rounded-2xl border bg-background p-5">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{t("场景")}{index + 1}</Badge>
                            <Badge variant="secondary">{scene.targetWordCount} {t("字")}</Badge>
                          </div>
                          <div className="mt-3 text-base font-semibold text-foreground">{scene.title}</div>
                          <div className="mt-2 text-sm leading-7 text-muted-foreground">{scene.purpose}</div>
                          <div className="mt-4 grid gap-3 lg:grid-cols-2">
                            <PanelHintCard title={t("必须推进")} content={scene.mustAdvance.join("；") || t("无")} />
                            <PanelHintCard title={t("必须保留")} content={scene.mustPreserve.join("；") || t("无")} />
                            <PanelHintCard title={t("起始状态")} content={scene.entryState} />
                            <PanelHintCard title={t("结束状态")} content={scene.exitState} />
                          </div>
                          {scene.forbiddenExpansion.length > 0 ? (
                            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm leading-7 text-amber-900">
                              {t("禁止展开：")}{scene.forbiddenExpansion.join("；")}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border bg-muted/20 p-5">
                      <div className="text-xs text-muted-foreground">{t("场景拆解")}</div>
                      <div className="mt-3 whitespace-pre-wrap text-sm leading-7">
                        {selectedChapter.sceneCards?.trim()
                          ? t("当前是旧版场景拆解文本，建议重新生成章节执行合同。")
                          : t("暂无场景拆解。")}
                      </div>
                    </div>
                  )}
                  <PanelHintCard title={t("本章目标")} content={chapterObjective} />
                </TabsContent>

                <TabsContent value="quality" className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <MetricBadge label={t("总体")} value={String(chapterQualityReport?.overall ?? selectedChapter.qualityScore ?? "-")} />
                    <MetricBadge label={t("连贯性")} value={String(chapterQualityReport?.coherence ?? "-")} />
                    <MetricBadge label={t("重复度")} value={String(chapterQualityReport?.repetition ?? "-")} />
                    <MetricBadge label={t("节奏")} value={String(chapterQualityReport?.pacing ?? selectedChapter.pacingScore ?? "-")} />
                    <MetricBadge label={t("文风")} value={String(chapterQualityReport?.voice ?? "-")} />
                    <MetricBadge label={t("吸引力")} value={String(chapterQualityReport?.engagement ?? "-")} />
                  </div>

                  <div className="rounded-2xl border p-5 text-sm">
                    <div className="font-semibold text-foreground">{t("最近审校问题")}</div>
                    {reviewResult?.issues?.length ? (
                      <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                        {reviewResult.issues.slice(0, 5).map((item, index) => (
                          <div key={`${item.category}-${index}`} className="rounded-xl border p-3">
                            <div className="font-medium text-foreground">{item.category}</div>
                            <div className="mt-1 leading-6">{item.fixSuggestion}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 text-xs leading-6 text-muted-foreground">{t("当前没有最近审校问题。")}</div>
                    )}
                  </div>

                  <div className="rounded-2xl border p-5 text-sm">
                    <div className="font-semibold text-foreground">{t("结构化审计问题")}</div>
                    {openAuditIssues.length > 0 ? (
                      <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                        {openAuditIssues.slice(0, 6).map((item) => (
                          <div key={item.id} className="rounded-xl border p-3">
                            <div className="font-medium text-foreground">{item.auditType}</div>
                            <div className="mt-1 leading-6">{item.fixSuggestion}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 text-xs leading-6 text-muted-foreground">{t("当前没有结构化审计问题。")}</div>
                    )}
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <ChapterRuntimeAuditCard
                      runtimePackage={runtimePackage}
                      auditReports={chapterAuditReports}
                      replanRecommendation={replanRecommendation}
                      onReplan={onReplanChapter}
                      isReplanning={isReplanningChapter}
                      lastReplanResult={lastReplanResult}
                    />
                    <ChapterRuntimeContextCard
                      runtimePackage={runtimePackage}
                      chapterPlan={chapterPlan}
                      stateSnapshot={latestStateSnapshot}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="repair" className="space-y-4">
                  {repairingOtherChapter ? (
                    <WorkspaceNotice
                      title={t("还有其他章节正在后台修复")}
                      description={t("{{value}} 仍在修复中。当前章节不会再显示那一章的修复流，返回对应章节即可继续查看。", { value: repairStreamingChapterLabel ?? t("另一章") })}
                    />
                  ) : null}

                  {(isSelectedChapterRepairStreaming || hasVisibleRepairOutput) ? (
                    <StreamOutput
                      title={t("问题修复输出")}
                      emptyText={isSelectedChapterRepairFinalizing
                        ? (repairRunStatus?.message ?? t("修复文本已经输出完成，系统正在保存并复审。"))
                        : t("等待修复输出...")}
                      content={visibleRepairStreamContent}
                      isStreaming={isSelectedChapterRepairStreaming}
                      onAbort={isSelectedChapterRepairFinalizing ? undefined : onAbortRepair}
                    />
                  ) : null}

                  <div className="rounded-2xl border bg-muted/20 p-5">
                    <div className="text-xs text-muted-foreground">{t("修复记录")}</div>
                    <div className="mt-3 max-h-[420px] overflow-y-auto whitespace-pre-wrap text-sm leading-7">
                      {selectedChapter.repairHistory?.trim() || t("暂无修复记录。")}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </details>
        </CardContent>
      </Card>

      <details className="group rounded-2xl border border-border/70 bg-background/95 p-4">
        <summary className="cursor-pointer list-none">
          <CollapsibleSummary
            title={t("上下文与问题诊断")}
            description={t("只有在需要追查为什么写偏、为什么要重规划时，再展开这一层。")}
            meta={t("{{length}} 份审计报告", { length: chapterAuditReports.length })}
          />
        </summary>

        <Tabs defaultValue="context">
          <TabsList className="mt-4 h-auto w-full justify-start overflow-x-auto rounded-2xl bg-muted/50 p-1.5">
            <TabsTrigger value="context" className="rounded-xl">{t("本章目标与上下文")}</TabsTrigger>
            <TabsTrigger value="audit" className="rounded-xl">{t("当前问题与修复建议")}</TabsTrigger>
          </TabsList>
          <TabsContent value="context" className="pt-2">
            <ChapterRuntimeContextCard
              runtimePackage={null}
              chapterPlan={chapterPlan}
              stateSnapshot={latestStateSnapshot}
            />
          </TabsContent>
          <TabsContent value="audit" className="pt-2">
            <ChapterRuntimeAuditCard
              runtimePackage={null}
              auditReports={chapterAuditReports}
              replanRecommendation={replanRecommendation}
              onReplan={onReplanChapter}
              isReplanning={isReplanningChapter}
              lastReplanResult={lastReplanResult}
            />
          </TabsContent>
        </Tabs>
      </details>
    </div>
  );
}
