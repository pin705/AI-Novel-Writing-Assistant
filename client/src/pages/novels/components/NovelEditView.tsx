import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AITakeoverContainer from "@/components/workflow/AITakeoverContainer";
import KnowledgeBindingPanel from "@/components/knowledge/KnowledgeBindingPanel";
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
}) {
  switch (input.tab) {
    case "basic":
      return "Hãy chốt rõ tiêu đề, thể loại và ý tưởng một câu của cuốn sách trước, để các bước sau không bị lệch hướng.";
    case "story_macro":
      return "Trước hết hãy xác nhận điểm bán chính, cam kết 30 chương đầu và hướng tổng thể rồi mới tiếp tục tách nhỏ.";
    case "character":
      return "Ưu tiên lấp đủ các nhân vật cốt lõi nâng đỡ giai đoạn đầu, chưa cần điền hết toàn bộ vai phụ ngay.";
    case "outline":
      return "Hãy nghĩ rõ mỗi tập sẽ giải quyết điều gì, xung đột tăng cấp ra sao và móc câu cuối tập sẽ là gì.";
    case "structured":
      return "Tách rõ mục tiêu chương và nhịp truyện ngay từ đầu thì lúc vào viết nội dung sẽ trơn hơn nhiều.";
    case "chapter":
      return input.totalChapters > 0
        ? "Chọn chương đang cần đẩy tiếp, để phần nội dung nằm ở giữa còn các chức năng khác lùi về khu phụ."
        : "Hãy tạo ít nhất một chương trước rồi mới bắt đầu viết nội dung.";
    case "pipeline":
      return input.pendingRepairs > 0
        ? `Hiện còn ${input.pendingRepairs} chương cần sửa, hãy ưu tiên xử lý các chương rủi ro cao trước.`
        : "Khu này chủ yếu để rà soát và sửa lỗi, nếu vấn đề không nhiều thì không cần ở lại lâu.";
    default:
      return "Đi theo từng bước, trang này chỉ giữ lại những gì cần nhìn nhất.";
  }
}

export default function NovelEditView(props: NovelEditViewProps) {
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
      ? "Bất thường"
      : taskDrawer.task.status === "waiting_approval"
        ? "Chờ duyệt"
        : taskDrawer.task.status === "running" || taskDrawer.task.status === "queued"
          ? "Đang chạy"
          : "Nhiệm vụ gần đây"
    : null;

  const normalizedActiveTab = normalizeNovelWorkspaceTab(activeTab);
  const normalizedWorkflowTab = normalizeNovelWorkspaceTab(workflowCurrentTab ?? activeTab);
  const novelTitle = basicTab.basicForm.title.trim() || "Tiểu thuyết chưa đặt tên";
  const currentStepLabel = getNovelWorkspaceTabLabel(normalizedActiveTab);
  const workflowStepLabel = getNovelWorkspaceTabLabel(normalizedWorkflowTab);
  const guidedFlowTab = normalizedActiveTab === "history"
    ? normalizedWorkflowTab === "history"
      ? "basic"
      : normalizedWorkflowTab
    : normalizedActiveTab;
  const stepIndex = getNovelWorkspaceFlowStepIndex(guidedFlowTab);
  const previousStep = getPreviousNovelWorkspaceFlowTab(guidedFlowTab);
  const nextStep = getNextNovelWorkspaceFlowTab(guidedFlowTab);
  const progressLabel = stepIndex >= 0
    ? `Bước ${stepIndex + 1} / ${NOVEL_WORKSPACE_FLOW_STEPS.length}`
    : null;
  const guidanceDescription = normalizedActiveTab === "history"
    ? "Nơi này lưu các bản sáng tác gần nhất có thể khôi phục. Trước khi phục hồi, hệ thống sẽ tự sao lưu trạng thái hiện tại một lần."
    : getStepGuidanceDescription({
      tab: guidedFlowTab,
      totalChapters,
      pendingRepairs,
    });
  const currentChapterLabel = normalizedActiveTab === "chapter"
    ? chapterTab.selectedChapter
      ? `Chương hiện tại: Chương ${chapterTab.selectedChapter.order} · ${chapterTab.selectedChapter.title?.trim() || "Chưa đặt tên"}`
      : "Chương hiện tại: Hãy chọn chương muốn tiếp tục sáng tác"
    : null;
  const primaryActionLabel = normalizedActiveTab === "history"
    ? `Quay lại bước hiện tại: ${getNovelWorkspaceTabLabel(guidedFlowTab)}`
    : nextStep
      ? `Bước tiếp theo: ${getNovelWorkspaceTabLabel(nextStep)}`
      : "Xem lịch sử phiên bản";
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
            <span className="shrink-0 text-muted-foreground">Bước hiện tại: {currentStepLabel}</span>
            {progressLabel ? (
              <>
                <span className="h-1 w-1 shrink-0 rounded-full bg-border" />
                <span className="shrink-0 text-muted-foreground">{progressLabel}</span>
              </>
            ) : null}
            {normalizedWorkflowTab !== normalizedActiveTab ? (
              <>
                <span className="h-1 w-1 shrink-0 rounded-full bg-border" />
                <span className="shrink-0 text-sky-700">Gợi ý quy trình: {workflowStepLabel}</span>
              </>
            ) : null}
          </div>

          <div className="rounded-3xl border border-border/70 bg-gradient-to-r from-slate-50 via-background to-emerald-50/40 p-4 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{progressLabel ?? "Lối vào khôi phục"}</Badge>
                  <Badge variant={normalizedActiveTab === "history" ? "secondary" : "default"}>
                    {normalizedActiveTab === "history" ? "Khu khôi phục phiên bản" : `Đang xử lý: ${getNovelWorkspaceTabLabel(guidedFlowTab)}`}
                  </Badge>
                  {currentChapterLabel ? <Badge variant="secondary">{currentChapterLabel}</Badge> : null}
                </div>
                <div className="text-sm leading-7 text-muted-foreground">
                  {guidanceDescription}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={handlePreviousStep} disabled={!previousStep}>
                  Bước trước
                </Button>
                <Button variant="secondary" onClick={handleHistoryAction}>
                  {normalizedActiveTab === "history" ? "Quay lại bước hiện tại" : "Lịch sử phiên bản"}
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
                <Button variant="outline">Công cụ dự án</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-4xl overflow-auto">
                <DialogHeader>
                  <DialogTitle>Công cụ dự án</DialogTitle>
                  <DialogDescription>
                    Ở đây gom các thông tin phụ. Màn hình đầu chỉ giữ bước hiện tại, nút tiếp tục và lối vào khôi phục để khu làm việc chính không bị thông tin dự án lấp đầy.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Tiến độ chương</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>{generatedChapters} / {Math.max(totalChapters, 1)} đã tạo</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Chương cần sửa</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>{pendingRepairs}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Mô hình hiện tại</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>{currentModel}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Nhiệm vụ gần đây</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>{pipelineTab.pipelineJob?.status ?? "idle"}</p>
                    </CardContent>
                  </Card>
                </div>
                <KnowledgeBindingPanel targetType="novel" targetId={id} title="Tri thức tham chiếu" />
              </DialogContent>
            </Dialog>

            <Button
              variant={taskDrawer?.task?.status === "failed" ? "destructive" : "outline"}
              onClick={() => taskDrawer?.onOpenChange(true)}
            >
              Bảng nhiệm vụ
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
