import type { NovelWorkflowCheckpoint } from "@ai-novel/shared/types/novelWorkflow";
import {
  DIRECTOR_CANDIDATE_SETUP_STEPS,
} from "@ai-novel/shared/types/novelDirector";
import type { UnifiedTaskDetail } from "@ai-novel/shared/types/task";
import { Button } from "@/components/ui/button";
import AITakeoverContainer, { type AITakeoverMode } from "@/components/workflow/AITakeoverContainer";
import {
  isChapterTitleDiversitySummary,
  resolveChapterTitleWarning,
} from "@/lib/directorTaskNotice";
import { useDirectorChapterTitleRepair } from "@/hooks/useDirectorChapterTitleRepair";

type DirectorExecutionViewMode = "execution_progress" | "execution_failed";

interface NovelAutoDirectorProgressPanelProps {
  mode: DirectorExecutionViewMode;
  task: UnifiedTaskDetail | null;
  taskId: string;
  titleHint?: string;
  fallbackError?: string | null;
  onBackgroundContinue: () => void;
  onOpenTaskCenter: () => void;
}

type DirectorStepVisualStatus = "pending" | "running" | "completed" | "failed";
type DirectorStepDefinition = {
  key: string;
  label: string;
};

const DIRECTOR_EXECUTION_STEPS: DirectorStepDefinition[] = [
  { key: "novel_create", label: "Tạo dự án" },
  { key: "book_contract", label: "Book Contract + quy hoạch vĩ mô câu chuyện" },
  { key: "character_setup", label: "Chuẩn bị nhân vật" },
  { key: "volume_strategy", label: "Chiến lược tập + khung tập" },
  { key: "beat_sheet", label: "Bảng nhịp tập 1 + danh sách chương" },
  { key: "chapter_detail_bundle", label: "Tinh chỉnh chương hàng loạt" },
];

const DIRECTOR_CANDIDATE_SETUP_STEP_KEYS = new Set<string>(
  DIRECTOR_CANDIDATE_SETUP_STEPS.map((step) => step.key),
);

const AUTO_DIRECTOR_PLACEHOLDER_TITLES = new Set([
  "Đạo diễn tự động cho tiểu thuyết",
  "Nhiệm vụ quy trình tiểu thuyết",
]);

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Chưa có";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Chưa có";
  }
  return date.toLocaleString();
}

function formatTokenCount(value: number | null | undefined): string {
  return new Intl.NumberFormat("zh-CN").format(Math.max(0, Math.round(value ?? 0)));
}

function resolveAutoExecutionScopeLabel(task: UnifiedTaskDetail | null): string {
  const seedPayload = (task?.meta.seedPayload ?? null) as {
    autoExecution?: {
      scopeLabel?: string | null;
      totalChapterCount?: number | null;
    } | null;
  } | null;
  const scopeLabel = seedPayload?.autoExecution?.scopeLabel?.trim();
  if (scopeLabel) {
    return scopeLabel;
  }
  const fallbackCount = Math.max(1, Math.round(seedPayload?.autoExecution?.totalChapterCount ?? 10));
  return `${fallbackCount} chương đầu`;
}

function formatCheckpoint(
  checkpoint: NovelWorkflowCheckpoint | null | undefined,
  task: UnifiedTaskDetail | null,
): string {
  if (checkpoint === "candidate_selection_required") {
    return "Chờ xác nhận hướng cấp sách";
  }
  if (checkpoint === "book_contract_ready") {
    return "Book Contract đã sẵn sàng";
  }
  if (checkpoint === "character_setup_required") {
    return "Chuẩn bị nhân vật chờ duyệt";
  }
  if (checkpoint === "volume_strategy_ready") {
    return "Chiến lược tập đã sẵn sàng";
  }
  if (checkpoint === "front10_ready") {
    return `${resolveAutoExecutionScopeLabel(task)} có thể bắt đầu viết`;
  }
  if (checkpoint === "chapter_batch_ready") {
    return `${resolveAutoExecutionScopeLabel(task)} đã tạm dừng tự động thực thi`;
  }
  if (checkpoint === "replan_required") {
    return "Cần lập lại kế hoạch";
  }
  if (checkpoint === "workflow_completed") {
    return "Quy trình chính đã hoàn tất";
  }
    return "Chưa có";
}

function isCandidateSetupFlow(task: UnifiedTaskDetail | null): boolean {
  return DIRECTOR_CANDIDATE_SETUP_STEP_KEYS.has(task?.currentItemKey ?? "");
}

function resolveDirectorExecutionStepIndex(task: UnifiedTaskDetail | null): number {
  const itemKey = task?.currentItemKey ?? "";
  if (
    task?.checkpointType === "front10_ready"
    || (task?.status === "running" && task?.checkpointType === "chapter_batch_ready")
    || itemKey === "chapter_detail_bundle"
    || itemKey === "chapter_execution"
  ) {
    return 5;
  }
  if (itemKey === "beat_sheet" || itemKey === "chapter_list" || itemKey === "chapter_sync") {
    return 4;
  }
  if (
    task?.checkpointType === "character_setup_required"
    || itemKey === "character_setup"
    || itemKey === "character_cast_apply"
  ) {
    return 2;
  }
  if (
    task?.checkpointType === "volume_strategy_ready"
    || itemKey === "volume_strategy"
    || itemKey === "volume_skeleton"
  ) {
    return 3;
  }
  if (
    task?.checkpointType === "book_contract_ready"
    || itemKey === "book_contract"
    || itemKey === "story_macro"
    || itemKey === "constraint_engine"
  ) {
    return 1;
  }
  return 0;
}

function resolveCandidateSetupStepIndex(task: UnifiedTaskDetail | null): number {
  const itemKey = task?.currentItemKey ?? "";
  const foundIndex = DIRECTOR_CANDIDATE_SETUP_STEPS.findIndex((step) => step.key === itemKey);
  return foundIndex >= 0 ? foundIndex : 0;
}

function resolveDirectorStepStatuses(
  task: UnifiedTaskDetail | null,
  mode: DirectorExecutionViewMode,
  steps: ReadonlyArray<DirectorStepDefinition>,
): DirectorStepVisualStatus[] {
  if (task?.checkpointType === "front10_ready" || task?.status === "succeeded") {
    return steps.map(() => "completed");
  }

  const currentIndex = isCandidateSetupFlow(task)
    ? resolveCandidateSetupStepIndex(task)
    : resolveDirectorExecutionStepIndex(task);
  return steps.map((_, index) => {
    if (index < currentIndex) {
      return "completed";
    }
    if (index === currentIndex) {
      return mode === "execution_failed" ? "failed" : "running";
    }
    return "pending";
  });
}

function stepClasses(status: DirectorStepVisualStatus): string {
  if (status === "completed") {
    return "border-emerald-500/40 bg-emerald-500/10";
  }
  if (status === "running") {
    return "border-sky-400/60 bg-sky-50";
  }
  if (status === "failed") {
    return "border-destructive/40 bg-destructive/5";
  }
  return "border-border/70 bg-background";
}

function stepBadgeClasses(status: DirectorStepVisualStatus): string {
  if (status === "completed") {
    return "bg-emerald-600 text-white";
  }
  if (status === "running") {
    return "bg-sky-600 text-white";
  }
  if (status === "failed") {
    return "bg-destructive text-destructive-foreground";
  }
  return "bg-muted text-muted-foreground";
}

function stepStatusLabel(status: DirectorStepVisualStatus): string {
  if (status === "completed") {
    return "Hoàn tất";
  }
  if (status === "running") {
    return "Đang chạy";
  }
  if (status === "failed") {
    return "Thất bại";
  }
    return "Chờ tiếp tục";
}

export default function NovelAutoDirectorProgressPanel({
  mode,
  task,
  taskId,
  titleHint,
  fallbackError,
  onBackgroundContinue,
  onOpenTaskCenter,
}: NovelAutoDirectorProgressPanelProps) {
  const taskChapterTitleWarning = resolveChapterTitleWarning(task);
  const chapterTitleRepairMutation = useDirectorChapterTitleRepair();
  const fallbackChapterTitleWarning = !taskChapterTitleWarning && isChapterTitleDiversitySummary(fallbackError)
    ? {
      summary: fallbackError?.trim() ?? "",
      route: null,
      label: "Sửa nhanh tiêu đề chương",
    }
    : null;
  const chapterTitleWarning = taskChapterTitleWarning ?? fallbackChapterTitleWarning;
  const visualMode: DirectorExecutionViewMode = mode === "execution_failed" && !chapterTitleWarning
    ? "execution_failed"
    : "execution_progress";
  const currentAction = (
    task?.status === "running"
    && task?.checkpointType === "chapter_batch_ready"
    && task.currentItemLabel?.includes("đã tạm dừng")
  )
    ? `Đang tiếp tục tự động thực thi ${resolveAutoExecutionScopeLabel(task)}`
    : (
      task?.currentItemLabel?.trim()
      || (visualMode === "execution_failed"
        ? "Nhiệm vụ đạo diễn bị gián đoạn"
        : (chapterTitleWarning ? "Danh sách chương đã được tạo, đang chờ sửa cấu trúc tiêu đề" : "Đang chuẩn bị nhiệm vụ đạo diễn"))
    );
  const workflowTitle = task?.title?.trim() || "";
  const hintedTitle = titleHint?.trim() || "";
  const taskTitle = (
    hintedTitle && (!workflowTitle || AUTO_DIRECTOR_PLACEHOLDER_TITLES.has(workflowTitle))
      ? hintedTitle
      : workflowTitle || hintedTitle || "Dự án tiểu thuyết mới"
  );
  const milestones = Array.isArray(task?.meta.milestones)
    ? task.meta.milestones as Array<{ checkpointType: NovelWorkflowCheckpoint; summary: string; createdAt: string }>
    : [];
  const candidateSetupFlow = isCandidateSetupFlow(task);
  const stepDefinitions = candidateSetupFlow
    ? DIRECTOR_CANDIDATE_SETUP_STEPS
    : DIRECTOR_EXECUTION_STEPS;
  const steps = resolveDirectorStepStatuses(task, visualMode, stepDefinitions);
  const failureMessage = task?.lastError?.trim() || fallbackError?.trim() || "Nhiệm vụ đạo diễn thất bại nhưng không có lỗi cụ thể được ghi lại.";
  const tokenUsage = task?.tokenUsage ?? null;
  const containerMode: AITakeoverMode = visualMode === "execution_failed"
    ? "failed"
    : !task
      ? "loading"
      : (task.status === "waiting_approval" || chapterTitleWarning)
        ? "waiting"
        : "running";
  const description = candidateSetupFlow
    ? (
      visualMode === "execution_failed"
        ? "Chuỗi tạo hướng ứng viên đã bị gián đoạn, bạn có thể vào trung tâm nhiệm vụ xem chi tiết rồi quyết định có thử lại hay không."
        : "Hệ thống sẽ trước tiên sắp xếp thiết lập dự án, đồng bộ framing cấp sách, rồi tạo hai bộ phương án cấp sách cùng nhóm tiêu đề tương ứng."
    )
    : (
      visualMode === "execution_failed"
        ? "Nhiệm vụ đã dừng ở bước gần nhất, bạn có thể vào trung tâm nhiệm vụ xem chi tiết rồi quyết định có khôi phục hay không."
        : chapterTitleWarning
          ? "Danh sách chương đã được giữ lại, đây là một cảnh báo cấu trúc có thể xử lý ngay. Bạn có thể sửa nhanh tiêu đề rồi mới quyết định có tiếp tục quy trình đạo diễn hay không."
          : task?.status === "waiting_approval"
            ? "Quy trình đạo diễn hiện đã dừng ở điểm duyệt, bạn có thể kiểm tra sản phẩm rồi quyết định có tiếp tục tự động đẩy hay không."
            : "Có thể rời trang hiện tại, nhiệm vụ vẫn sẽ chạy và bạn có thể khôi phục xem lại trong trung tâm nhiệm vụ."
    );
  const actions = [
    ...(visualMode === "execution_progress" && task?.status !== "waiting_approval" && !chapterTitleWarning
      ? [{
        label: "Tiếp tục nền",
        onClick: onBackgroundContinue,
        variant: "outline" as const,
      }]
      : []),
    {
      label: "Đi xem ở trung tâm nhiệm vụ",
      onClick: onOpenTaskCenter,
      variant: "default" as const,
    },
  ];

  return (
    <div className="space-y-4">
      <AITakeoverContainer
        mode={containerMode}
        title={visualMode === "execution_failed"
          ? (candidateSetupFlow ? "Tạo phương án ứng viên thất bại" : "Thực thi đạo diễn thất bại")
          : candidateSetupFlow
            ? "Đang tạo phương án ứng viên cho đạo diễn"
            : `Đang đạo diễn “${taskTitle}”`}
        description={description}
        progress={task ? task.progress : null}
        currentAction={currentAction}
        checkpointLabel={formatCheckpoint(task?.checkpointType, task)}
        taskId={taskId || task?.id}
        actions={actions}
      >
        <div className={`grid gap-3 ${candidateSetupFlow ? "md:grid-cols-4" : "md:grid-cols-6"}`}>
          {stepDefinitions.map((step, index) => (
            <div key={step.key} className={`rounded-xl border p-3 ${stepClasses(steps[index] ?? "pending")}`}>
              <div className="flex items-center justify-between gap-2">
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${stepBadgeClasses(steps[index] ?? "pending")}`}>
                  {index + 1}
                </span>
                <span className="text-[11px] text-muted-foreground">{stepStatusLabel(steps[index] ?? "pending")}</span>
              </div>
              <div className="mt-3 text-sm font-medium text-foreground">{step.label}</div>
            </div>
          ))}
        </div>

        {tokenUsage ? (
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-xl border bg-background/80 p-3">
              <div className="text-xs text-muted-foreground">Lượt gọi tích lũy</div>
              <div className="mt-1 text-sm font-medium text-foreground">{formatTokenCount(tokenUsage.llmCallCount)}</div>
            </div>
            <div className="rounded-xl border bg-background/80 p-3">
              <div className="text-xs text-muted-foreground">Tokens đầu vào</div>
              <div className="mt-1 text-sm font-medium text-foreground">{formatTokenCount(tokenUsage.promptTokens)}</div>
            </div>
            <div className="rounded-xl border bg-background/80 p-3">
              <div className="text-xs text-muted-foreground">Tokens đầu ra</div>
              <div className="mt-1 text-sm font-medium text-foreground">{formatTokenCount(tokenUsage.completionTokens)}</div>
            </div>
            <div className="rounded-xl border bg-background/80 p-3">
              <div className="text-xs text-muted-foreground">Tổng Tokens tích lũy</div>
              <div className="mt-1 text-sm font-medium text-foreground">{formatTokenCount(tokenUsage.totalTokens)}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">Ghi nhận gần nhất: {formatDate(tokenUsage.lastRecordedAt)}</div>
            </div>
          </div>
        ) : null}

        {chapterTitleWarning ? (
          <div className="mt-4 rounded-xl border border-amber-300/60 bg-amber-50/80 p-4 text-sm text-amber-950">
            <div className="font-medium">Cảnh báo hiện tại</div>
            <div className="mt-1">{chapterTitleWarning.summary}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {task && chapterTitleWarning ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    chapterTitleRepairMutation.startRepair(task);
                  }}
                  disabled={chapterTitleRepairMutation.isPending}
                >
                  {chapterTitleRepairMutation.isPending && chapterTitleRepairMutation.pendingTaskId === task.id
                    ? "AI đang sửa..."
                    : chapterTitleWarning.label}
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                onClick={onOpenTaskCenter}
              >
                Đi xem ở trung tâm nhiệm vụ
              </Button>
            </div>
          </div>
        ) : visualMode === "execution_failed" ? (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <div className="font-medium">Tóm tắt lỗi</div>
            <div className="mt-1">{failureMessage}</div>
            {task?.recoveryHint ? (
              <div className="mt-2 text-xs text-destructive/80">Gợi ý khôi phục: {task.recoveryHint}</div>
            ) : null}
          </div>
        ) : null}
      </AITakeoverContainer>

      <div className="rounded-xl border bg-background/70 p-4">
        <div className="text-sm font-medium text-foreground">Lịch sử mốc tiến trình</div>
        {milestones.length > 0 ? (
          <div className="mt-3 space-y-3">
            {milestones
              .slice()
              .reverse()
              .map((item) => (
                <div key={`${item.checkpointType}:${item.createdAt}`} className="rounded-lg border bg-muted/15 p-3">
                  <div className="font-medium text-foreground">{formatCheckpoint(item.checkpointType, task)}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{item.summary}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Thời điểm ghi nhận: {formatDate(item.createdAt)}</div>
                </div>
              ))}
          </div>
        ) : (
          <div className="mt-3 text-sm text-muted-foreground">
            Nhiệm vụ đã được tạo, đang chờ mốc ổn định đầu tiên được ghi vào.
          </div>
        )}
      </div>
    </div>
  );
}
