import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  History,
  LayoutDashboard,
  ListTodo,
} from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import type { DirectorLockScope } from "@ai-novel/shared/types/novelDirector";
import type { VolumePlan } from "@ai-novel/shared/types/novel";
import { getNovelDetail, getNovelQualityReport, getNovelVolumeWorkspace } from "@/api/novel";
import { getActiveAutoDirectorTask } from "@/api/novelWorkflow";
import { queryKeys } from "@/api/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getNovelWorkspaceTabLabel,
  NOVEL_WORKSPACE_FLOW_STEPS,
  normalizeNovelWorkspaceTab,
  tabFromDirectorProgress,
  type NovelWorkspaceFlowTab,
  type NovelWorkspaceTab,
} from "@/pages/novels/novelWorkspaceNavigation";

interface NovelWorkspaceRailProps {
  novelId: string;
  chapterId?: string;
  collapsed: boolean;
  onToggle: () => void;
  onSwitchToProjectNav?: () => void;
}

function hasVolumePlanContent(volume: VolumePlan): boolean {
  return [
    volume.summary,
    volume.openingHook,
    volume.mainPromise,
    volume.primaryPressureSource,
    volume.coreSellingPoint,
    volume.escalationMode,
    volume.protagonistChange,
    volume.midVolumeRisk,
    volume.climax,
    volume.payoffType,
    volume.nextVolumeHook,
    volume.resetPoint,
  ].some((value) => Boolean(value?.trim())) || volume.openPayoffs.length > 0;
}

function hasChapterPlanContent(chapter: VolumePlan["chapters"][number]): boolean {
  return Boolean(chapter.summary?.trim())
    || Boolean(chapter.purpose?.trim())
    || Boolean(chapter.mustAvoid?.trim())
    || Boolean(chapter.taskSheet?.trim())
    || typeof chapter.conflictLevel === "number"
    || typeof chapter.revealLevel === "number"
    || typeof chapter.targetWordCount === "number"
    || chapter.payoffRefs.length > 0;
}

function formatTaskStatus(status: string | null | undefined): string {
  if (status === "running") return "Đang chạy";
  if (status === "queued") return "Đang xếp hàng";
  if (status === "waiting_approval") return "Chờ duyệt";
  if (status === "failed") return "Có lỗi";
  if (status === "succeeded") return "Đã hoàn tất";
  return "Nhàn rỗi";
}

export default function NovelWorkspaceRail(props: NovelWorkspaceRailProps) {
  const { novelId, chapterId = "", collapsed, onToggle, onSwitchToProjectNav } = props;
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const novelDetailQuery = useQuery({
    queryKey: queryKeys.novels.detail(novelId),
    queryFn: () => getNovelDetail(novelId),
    enabled: Boolean(novelId),
  });
  const volumeWorkspaceQuery = useQuery({
    queryKey: queryKeys.novels.volumeWorkspace(novelId),
    queryFn: () => getNovelVolumeWorkspace(novelId),
    enabled: Boolean(novelId),
  });
  const qualityReportQuery = useQuery({
    queryKey: queryKeys.novels.qualityReport(novelId),
    queryFn: () => getNovelQualityReport(novelId),
    enabled: Boolean(novelId),
  });
  const activeTaskQuery = useQuery({
    queryKey: queryKeys.novels.autoDirectorTask(novelId),
    queryFn: () => getActiveAutoDirectorTask(novelId),
    enabled: Boolean(novelId),
    refetchInterval: (query) => {
      const task = query.state.data?.data;
      return task && (task.status === "queued" || task.status === "running" || task.status === "waiting_approval")
        ? 2000
        : false;
    },
  });

  const novelDetail = novelDetailQuery.data?.data;
  const workspace = volumeWorkspaceQuery.data?.data;
  const qualitySummary = qualityReportQuery.data?.data?.summary;
  const activeTask = activeTaskQuery.data?.data ?? null;
  const reviewScope = useMemo(() => {
    const rawMeta = activeTask?.meta;
    if (!rawMeta || typeof rawMeta !== "object") {
      return null;
    }
    const directorSession = (rawMeta as { directorSession?: { reviewScope?: DirectorLockScope | null } }).directorSession;
    return directorSession?.reviewScope ?? null;
  }, [activeTask?.meta]);
  const workflowCurrentTab = useMemo(
    () => tabFromDirectorProgress({
      currentStage: activeTask?.currentStage,
      currentItemKey: activeTask?.currentItemKey,
      checkpointType: activeTask?.checkpointType,
      reviewScope,
    }),
    [
      activeTask?.checkpointType,
      activeTask?.currentItemKey,
      activeTask?.currentStage,
      reviewScope,
    ],
  );

  const activeTab = useMemo<NovelWorkspaceTab>(() => {
    if (location.pathname.includes("/chapters/")) {
      return "chapter";
    }
    return normalizeNovelWorkspaceTab(searchParams.get("stage"));
  }, [location.pathname, searchParams]);

  const stepReadiness = useMemo(() => {
    const basicReady = Boolean(novelDetail?.title?.trim());
    const outlineReady = Boolean(workspace?.strategyPlan) || (workspace?.volumes ?? []).some((volume) => hasVolumePlanContent(volume));
    const structuredReady = (workspace?.beatSheets ?? []).some((sheet) => sheet.beats.length > 0)
      || (workspace?.volumes ?? []).some((volume) => volume.chapters.some((chapter) => hasChapterPlanContent(chapter)));
    const chapterReady = (novelDetail?.chapters ?? []).some((chapter) => Boolean(chapter.content?.trim()));
    const characterReady = (novelDetail?.characters ?? []).length > 0;
    const storyMacroReady = characterReady
      || outlineReady
      || structuredReady
      || chapterReady
      || Boolean(novelDetail?.bible)
      || Boolean((novelDetail?.plotBeats ?? []).length);
    const pipelineReady = Boolean(qualitySummary && qualitySummary.overall >= 75);

    return {
      basic: basicReady,
      story_macro: storyMacroReady,
      character: characterReady,
      outline: outlineReady,
      structured: structuredReady,
      chapter: chapterReady,
      pipeline: pipelineReady,
    } satisfies Record<NovelWorkspaceFlowTab, boolean>;
  }, [novelDetail?.bible, novelDetail?.chapters, novelDetail?.characters, novelDetail?.plotBeats, qualitySummary, workspace]);

  const workflowIndex = workflowCurrentTab
    ? NOVEL_WORKSPACE_FLOW_STEPS.findIndex((item) => item.key === workflowCurrentTab)
    : -1;

  const stepStates = useMemo(() => (
    NOVEL_WORKSPACE_FLOW_STEPS.map((step, index) => {
      const isSelected = activeTab === step.key;
      const isWorkflowCurrent = workflowCurrentTab === step.key;
      const isDone = stepReadiness[step.key] || (workflowIndex >= 0 && index < workflowIndex);
      const statusLabel = isWorkflowCurrent
            ? isSelected ? "Bước hiện tại" : "Đang trong quy trình"
            : isSelected
          ? "Đang xem"
          : isDone
            ? "Đã hoàn thành"
            : "Chưa triển khai";

      return {
        ...step,
        isSelected,
        isWorkflowCurrent,
        isDone,
        statusLabel,
      };
    })
  ), [activeTab, stepReadiness, workflowCurrentTab, workflowIndex]);

  const completedStepCount = stepStates.filter((item) => item.isDone).length;
  const novelTitle = novelDetail?.title?.trim() || "Không gian sáng tác tiểu thuyết";
  const cockpitSummary = activeTask
    ? activeTask.status === "failed"
      ? activeTask.lastError || "Tác vụ nền đã bị gián đoạn, bạn nên xem trung tâm tác vụ trước."
      : activeTask.status === "waiting_approval"
        ? `Đang chờ xử lý: ${getNovelWorkspaceTabLabel(workflowCurrentTab ?? activeTab)}`
        : activeTask.currentItemLabel || `AI đang triển khai ${getNovelWorkspaceTabLabel(workflowCurrentTab ?? activeTab)}`
    : "Hiện chưa có tác vụ đạo diễn nền, bạn có thể tiếp tục sáng tác thủ công.";
  const cockpitVariant = activeTask?.status === "failed"
    ? "destructive"
    : activeTask?.status === "running" || activeTask?.status === "queued"
      ? "default"
      : "secondary";

  const goToTab = (tab: NovelWorkspaceTab) => {
    const next = new URLSearchParams(searchParams);
    next.set("stage", tab);
    if (tab === "chapter" && chapterId) {
      next.set("chapterId", chapterId);
    } else if (tab !== "chapter") {
      next.delete("chapterId");
    }
    navigate(`/novels/${novelId}/edit?${next.toString()}`);
  };

  const openTaskCenter = () => {
    const taskId = activeTask?.id;
    if (taskId) {
      navigate(`/tasks?kind=novel_workflow&id=${taskId}`);
      return;
    }
    navigate("/tasks");
  };

  return (
    <aside
      className={cn(
        "border-r bg-background/95 backdrop-blur transition-[width] duration-200",
        collapsed ? "w-[84px]" : "w-[248px]",
      )}
    >
      <div className="flex h-[calc(100vh-4rem)] flex-col gap-3 p-3">
        <div className={cn("flex items-center gap-2", collapsed ? "justify-center" : "justify-between")}>
          {!collapsed ? (
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/8 text-primary">
                <BookOpenText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Không gian sáng tác
                </div>
                <div className="truncate text-sm font-semibold text-foreground">{novelTitle}</div>
              </div>
            </div>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground"
            onClick={onToggle}
            aria-label={collapsed ? "Mở rộng điều hướng sáng tác" : "Thu gọn điều hướng sáng tác"}
            title={collapsed ? "Mở rộng điều hướng sáng tác" : "Thu gọn điều hướng sáng tác"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {!collapsed ? (
          <Button
            type="button"
            variant="outline"
            className="justify-start"
            onClick={() => navigate("/novels")}
          >
            Quay lại danh sách tiểu thuyết
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="mx-auto h-9 w-9"
            onClick={() => navigate("/novels")}
            title="Quay lại danh sách tiểu thuyết"
            aria-label="Quay lại danh sách tiểu thuyết"
          >
            <BookOpenText className="h-4 w-4" />
          </Button>
        )}

        {!collapsed ? (
          <div className="rounded-2xl border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between gap-2">
              <span>Quy trình: {getNovelWorkspaceTabLabel(workflowCurrentTab ?? activeTab)}</span>
              <span>{completedStepCount}/{NOVEL_WORKSPACE_FLOW_STEPS.length}</span>
            </div>
          </div>
        ) : null}

        <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
          {stepStates.map((step, index) => (
            <button
              key={step.key}
              type="button"
              title={collapsed ? step.label : undefined}
              aria-current={step.isSelected ? "step" : undefined}
              onClick={() => goToTab(step.key)}
              className={cn(
                "relative flex w-full items-center rounded-2xl border text-left transition-colors",
                collapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-3",
                step.isWorkflowCurrent && step.isSelected
                  ? "border-sky-400 bg-sky-100 text-sky-950 shadow-sm ring-1 ring-sky-200"
                  : step.isWorkflowCurrent
                  ? "border-sky-200 bg-sky-50 text-sky-900"
                  : step.isSelected
                    ? "border-slate-900 bg-slate-900 text-white"
                    : step.isDone
                      ? "border-emerald-200 bg-emerald-50/60 text-foreground"
                      : "border-border/70 bg-background hover:bg-muted/40",
              )}
            >
              {step.isWorkflowCurrent && !step.isSelected ? (
                <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-sky-400" />
              ) : null}
              <span
                className={cn(
                  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  step.isWorkflowCurrent
                    ? "bg-sky-600 text-white"
                    : step.isSelected
                    ? "bg-white/15 text-white"
                    : step.isDone
                      ? "bg-emerald-600 text-white"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {index + 1}
              </span>
              {!collapsed ? (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{step.label}</span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-1 text-[11px] font-medium",
                      step.isWorkflowCurrent
                        ? "bg-sky-600 text-white"
                        : step.isSelected
                        ? "bg-white/15 text-white"
                        : step.isDone
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {step.statusLabel}
                  </span>
                </>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="space-y-2 border-t border-border/70 pt-3">
          <button
            type="button"
            onClick={() => goToTab("history")}
            title="Lịch sử phiên bản"
            className={cn(
              "flex w-full items-center rounded-2xl border border-border/70 transition-colors hover:bg-muted/40",
              collapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-3 text-left",
              activeTab === "history" && "border-slate-900 bg-slate-900 text-white",
            )}
          >
            <History className="h-4 w-4 shrink-0" />
            {!collapsed ? <span className="text-sm font-medium">Lịch sử phiên bản</span> : null}
          </button>

          {!collapsed ? (
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-foreground">Buồng lái AI</div>
                <Badge variant={cockpitVariant}>{formatTaskStatus(activeTask?.status)}</Badge>
              </div>
              <div className="mt-2 text-xs leading-5 text-muted-foreground">
                {cockpitSummary}
              </div>
              <div className="mt-3 flex gap-2">
                <Button type="button" size="sm" className="flex-1" onClick={openTaskCenter}>
                  Trung tâm tác vụ
                </Button>
                {onSwitchToProjectNav ? (
                  <Button type="button" size="sm" variant="outline" onClick={onSwitchToProjectNav}>
                    Điều hướng dự án
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-9 w-9"
                onClick={openTaskCenter}
                title={`Buồng lái AI: ${formatTaskStatus(activeTask?.status)}`}
                aria-label="Mở trung tâm tác vụ"
              >
                <ListTodo className="h-4 w-4" />
              </Button>
              {onSwitchToProjectNav ? (
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-9 w-9"
                  onClick={onSwitchToProjectNav}
                  title="Chuyển sang điều hướng dự án"
                  aria-label="Chuyển sang điều hướng dự án"
                >
                  <LayoutDashboard className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
