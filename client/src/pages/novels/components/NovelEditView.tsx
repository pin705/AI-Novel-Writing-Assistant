import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AITakeoverContainer from "@/components/workflow/AITakeoverContainer";
import KnowledgeBindingPanel from "@/components/knowledge/KnowledgeBindingPanel";
import { useI18n, type TranslateFn } from "@/i18n";
import NovelTaskDrawer from "./NovelTaskDrawer";
import NovelCharacterPanel from "./NovelCharacterPanel";
import BasicInfoTab from "./BasicInfoTab";
import OutlineTab from "./OutlineTab";
import StructuredOutlineTab from "./StructuredOutlineTab";
import ChapterManagementTab from "./ChapterManagementTab";
import PipelineTab from "./PipelineTab";
import StoryMacroPlanTab from "./StoryMacroPlanTab";
import VersionHistoryTab from "./VersionHistoryTab";
import type { NovelEditViewProps } from "./NovelEditView.types";
import {
  getNextNovelWorkspaceFlowTab,
  getNovelWorkspaceFlowStepIndex,
  getNovelWorkspaceTabLabel,
  getPreviousNovelWorkspaceFlowTab,
  NOVEL_WORKSPACE_FLOW_STEPS,
  normalizeNovelWorkspaceTab,
} from "../novelWorkspaceNavigation";

function getStepGuidanceDescription(input: {
  tab: string;
  totalChapters: number;
  pendingRepairs: number;
}, t: TranslateFn) {
  switch (input.tab) {
    case "basic":
      return t("novelEdit.guidance.basic");
    case "story_macro":
      return t("novelEdit.guidance.storyMacro");
    case "character":
      return t("novelEdit.guidance.character");
    case "outline":
      return t("novelEdit.guidance.outline");
    case "structured":
      return t("novelEdit.guidance.structured");
    case "chapter":
      return input.totalChapters > 0
        ? t("novelEdit.guidance.chapter.hasChapters")
        : t("novelEdit.guidance.chapter.empty");
    case "pipeline":
      return input.pendingRepairs > 0
        ? t("novelEdit.guidance.pipeline.hasRepairs", { value: input.pendingRepairs })
        : t("novelEdit.guidance.pipeline.empty");
    default:
      return t("novelEdit.guidance.default");
  }
}

export default function NovelEditView(props: NovelEditViewProps) {
  const { t } = useI18n();
  const {
    id,
    activeTab,
    workflowCurrentTab,
    basicTab,
    storyMacroTab,
    outlineTab,
    structuredTab,
    chapterTab,
    pipelineTab,
    characterTab,
    takeover,
    taskDrawer,
  } = props;

  const [isProjectToolsOpen, setIsProjectToolsOpen] = useState(false);

  const totalChapters = chapterTab.chapters.length;
  const generatedChapters = chapterTab.chapters.filter((item) => Boolean(item.content?.trim())).length;
  const pendingRepairs = pipelineTab.chapterReports.filter(
    (item) => item.overall < pipelineTab.pipelineForm.qualityThreshold,
  ).length;
  const currentModel = pipelineTab.pipelineJob?.payload ? (() => {
    try {
      const parsed = JSON.parse(pipelineTab.pipelineJob.payload) as { model?: string };
      return parsed.model ?? "default";
    } catch {
      return "default";
    }
  })() : "default";

  const taskAttentionLabel = taskDrawer?.task
    ? taskDrawer.task.status === "failed"
      ? t("novelEdit.taskAttention.failed")
      : taskDrawer.task.status === "waiting_approval"
        ? t("novelEdit.taskAttention.waitingApproval")
        : taskDrawer.task.status === "running" || taskDrawer.task.status === "queued"
          ? t("novelEdit.taskAttention.running")
          : t("novelEdit.taskAttention.recent")
    : null;

  const normalizedActiveTab = normalizeNovelWorkspaceTab(activeTab);
  const normalizedWorkflowTab = normalizeNovelWorkspaceTab(workflowCurrentTab ?? activeTab);
  const novelTitle = basicTab.basicForm.title.trim() || t("novelEdit.fallbackNovelTitle");
  const currentStepLabel = getNovelWorkspaceTabLabel(normalizedActiveTab, t);
  const workflowStepLabel = getNovelWorkspaceTabLabel(normalizedWorkflowTab, t);
  const guidedFlowTab = normalizedActiveTab === "history"
    ? normalizedWorkflowTab === "history"
      ? "basic"
      : normalizedWorkflowTab
    : normalizedActiveTab;
  const stepIndex = getNovelWorkspaceFlowStepIndex(guidedFlowTab);
  const previousStep = getPreviousNovelWorkspaceFlowTab(guidedFlowTab);
  const nextStep = getNextNovelWorkspaceFlowTab(guidedFlowTab);
  const progressLabel = stepIndex >= 0
    ? t("novelEdit.progressLabel", { current: stepIndex + 1, total: NOVEL_WORKSPACE_FLOW_STEPS.length })
    : null;
  const guidanceDescription = normalizedActiveTab === "history"
    ? t("novelEdit.guidance.history")
    : getStepGuidanceDescription({
      tab: guidedFlowTab,
      totalChapters,
      pendingRepairs,
    }, t);
  const currentChapterLabel = normalizedActiveTab === "chapter"
    ? chapterTab.selectedChapter
      ? t("novelEdit.currentChapterLabel", {
        order: chapterTab.selectedChapter.order,
        title: chapterTab.selectedChapter.title?.trim() || t("novelEdit.fallbackChapterTitle"),
      })
      : t("novelEdit.currentChapterEmpty")
    : null;
  const primaryActionLabel = normalizedActiveTab === "history"
    ? t("novelEdit.returnToCurrentStep", { value: getNovelWorkspaceTabLabel(guidedFlowTab, t) })
    : nextStep
      ? t("novelEdit.nextStep", { value: getNovelWorkspaceTabLabel(nextStep, t) })
      : t("novelEdit.viewVersionHistory");
  const handlePreviousStep = () => {
    if (!previousStep) {
      return;
    }
    props.onActiveTabChange(previousStep);
  };
  const handlePrimaryAction = () => {
    if (normalizedActiveTab === "history") {
      props.onActiveTabChange(guidedFlowTab);
      return;
    }
    if (nextStep) {
      props.onActiveTabChange(nextStep);
      return;
    }
    props.onActiveTabChange("history");
  };
  const handleHistoryAction = () => {
    if (normalizedActiveTab === "history") {
      props.onActiveTabChange(guidedFlowTab);
      return;
    }
    props.onActiveTabChange("history");
  };

  const renderActivePanel = () => {
    switch (activeTab) {
      case "basic":
        return <BasicInfoTab {...basicTab} />;
      case "outline":
        return <OutlineTab {...outlineTab} />;
      case "story_macro":
        return <StoryMacroPlanTab {...storyMacroTab} />;
      case "structured":
        return <StructuredOutlineTab {...structuredTab} />;
      case "chapter":
        return <ChapterManagementTab {...chapterTab} />;
      case "pipeline":
        return <PipelineTab {...pipelineTab} />;
      case "character":
        return <NovelCharacterPanel {...characterTab} />;
      case "history":
        return <VersionHistoryTab novelId={id} />;
      default:
        return <BasicInfoTab {...basicTab} />;
    }
  };

  return (
    <div className="space-y-6 lg:space-y-7">
      {id ? (
        <div className="space-y-3 pb-1">
          <div className="flex min-w-0 flex-wrap items-center gap-3 text-sm">
            <span className="truncate font-semibold text-foreground">{novelTitle}</span>
            <span className="h-1 w-1 shrink-0 rounded-full bg-border" />
            <span className="shrink-0 text-muted-foreground">{t("novelEdit.currentStepPrefix", { value: currentStepLabel })}</span>
            {progressLabel ? (
              <>
                <span className="h-1 w-1 shrink-0 rounded-full bg-border" />
                <span className="shrink-0 text-muted-foreground">{progressLabel}</span>
              </>
            ) : null}
            {normalizedWorkflowTab !== normalizedActiveTab ? (
              <>
                <span className="h-1 w-1 shrink-0 rounded-full bg-border" />
                <span className="shrink-0 text-sky-700">{t("novelEdit.workflowRecommendationPrefix", { value: workflowStepLabel })}</span>
              </>
            ) : null}
          </div>

          <div className="rounded-3xl border border-border/70 bg-gradient-to-r from-slate-50 via-background to-emerald-50/40 p-4 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{progressLabel ?? t("novelEdit.resumeEntry")}</Badge>
                  <Badge variant={normalizedActiveTab === "history" ? "secondary" : "default"}>
                    {normalizedActiveTab === "history"
                      ? t("novelEdit.versionRestoreArea")
                      : t("novelEdit.processing", { value: getNovelWorkspaceTabLabel(guidedFlowTab, t) })}
                  </Badge>
                  {currentChapterLabel ? <Badge variant="secondary">{currentChapterLabel}</Badge> : null}
                </div>
                <div className="text-sm leading-7 text-muted-foreground">
                  {guidanceDescription}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={handlePreviousStep} disabled={!previousStep}>
                  {t("novelEdit.previousStep")}
                </Button>
                <Button variant="secondary" onClick={handleHistoryAction}>
                  {normalizedActiveTab === "history" ? t("novelEdit.returnToCurrentStepButton") : t("novelEdit.versionHistory")}
                </Button>
                <Button onClick={handlePrimaryAction}>
                  {primaryActionLabel}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Dialog open={isProjectToolsOpen} onOpenChange={setIsProjectToolsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">{t("novelEdit.projectTools.trigger")}</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-4xl overflow-auto">
                <DialogHeader>
                  <DialogTitle>{t("novelEdit.projectTools.title")}</DialogTitle>
                  <DialogDescription>{t("novelEdit.projectTools.description")}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("novelEdit.projectTools.chapterProgress")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>{t("novelEdit.projectTools.chapterProgressValue", { generated: generatedChapters, total: Math.max(totalChapters, 1) })}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("novelEdit.projectTools.pendingRepairs")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>{pendingRepairs}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("novelEdit.projectTools.currentModel")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>{currentModel}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("novelEdit.projectTools.recentTask")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>{pipelineTab.pipelineJob?.status ?? "idle"}</p>
                    </CardContent>
                  </Card>
                </div>
                <KnowledgeBindingPanel targetType="novel" targetId={id} title={t("novelEdit.projectTools.knowledgeReference")} />
              </DialogContent>
            </Dialog>

            <Button
              variant={taskDrawer?.task?.status === "failed" ? "destructive" : "outline"}
              onClick={() => taskDrawer?.onOpenChange(true)}
            >
              {t("novelEdit.taskDrawer.open")}
              {taskAttentionLabel ? <Badge variant="secondary">{taskAttentionLabel}</Badge> : null}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="space-y-4 pt-1">
        {takeover ? (
          <AITakeoverContainer
            mode={takeover.mode}
            title={takeover.title}
            description={takeover.description}
            progress={takeover.progress}
            currentAction={takeover.currentAction}
            checkpointLabel={takeover.checkpointLabel}
            taskId={takeover.taskId}
            actions={takeover.actions}
          >
            {renderActivePanel()}
          </AITakeoverContainer>
        ) : (
          renderActivePanel()
        )}
      </div>

      {taskDrawer ? <NovelTaskDrawer {...taskDrawer} /> : null}
    </div>
  );
}
