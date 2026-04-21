import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TaskKind, TaskStatus } from "@ai-novel/shared/types/task";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { NovelWorkflowCheckpoint, NovelWorkflowResumeTarget } from "@ai-novel/shared/types/novelWorkflow";
import { continueNovelWorkflow } from "@/api/novelWorkflow";
import { archiveTask, cancelTask, getTaskDetail, listTasks, retryTask } from "@/api/tasks";
import { queryKeys } from "@/api/queryKeys";
import LLMSelector, { type LLMSelectorValue } from "@/components/common/LLMSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import OpenInCreativeHubButton from "@/components/creativeHub/OpenInCreativeHubButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { useDirectorChapterTitleRepair } from "@/hooks/useDirectorChapterTitleRepair";
import {
  buildTaskNoticeRoute,
  isChapterTitleDiversitySummary,
  parseDirectorTaskNotice,
  resolveChapterTitleWarning,
} from "@/lib/directorTaskNotice";
import { canContinueFront10AutoExecution, getCandidateSelectionLink, requiresCandidateSelection } from "@/lib/novelWorkflowTaskUi";
import { useLLMStore } from "@/store/llmStore";

const ACTIVE_STATUSES = new Set<TaskStatus>(["queued", "running", "waiting_approval"]);
const ANOMALY_STATUSES = new Set<TaskStatus>(["failed", "cancelled"]);
const ARCHIVABLE_STATUSES = new Set<TaskStatus>(["succeeded", "failed", "cancelled"]);

function getTaskListPriority(status: TaskStatus): number {
  return status === "failed" ? 0 : 1;
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Không có";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Không có";
  }
  return date.toLocaleString();
}

function formatTokenCount(value: number | null | undefined): string {
  return new Intl.NumberFormat("zh-CN").format(Math.max(0, Math.round(value ?? 0)));
}

function formatKind(kind: TaskKind): string {
  if (kind === "book_analysis") {
    return "Phân tích sách";
  }
  if (kind === "novel_workflow") {
    return "Sáng tác tiểu thuyết";
  }
  if (kind === "novel_pipeline") {
    return "Dây chuyền tiểu thuyết";
  }
  if (kind === "knowledge_document") {
    return "Chỉ mục tri thức";
  }
  if (kind === "agent_run") {
    return "Chạy Agent";
  }
  return "Tạo ảnh";
}

function formatCheckpoint(checkpoint: NovelWorkflowCheckpoint | null | undefined): string {
  if (checkpoint === "candidate_selection_required") {
    return "Chờ xác nhận hướng đi của cả cuốn";
  }
  if (checkpoint === "book_contract_ready") {
    return "Bộ khung cuốn sách đã sẵn sàng";
  }
  if (checkpoint === "character_setup_required") {
    return "Phần nhân vật chờ duyệt";
  }
  if (checkpoint === "volume_strategy_ready") {
    return "Chiến lược từng quyển đã sẵn sàng";
  }
  if (checkpoint === "front10_ready") {
    return "Đã sẵn sàng viết 10 chương đầu";
  }
  if (checkpoint === "chapter_batch_ready") {
    return "Tài nguyên theo lô của các chương đã sẵn sàng";
  }
  if (checkpoint === "replan_required") {
    return "Cần lập lại kế hoạch";
  }
  if (checkpoint === "workflow_completed") {
    return "Luồng chính đã hoàn tất";
  }
  return "Không có";
}

function formatResumeTarget(target: NovelWorkflowResumeTarget | null | undefined): string {
  if (!target) {
    return "Không có";
  }
  if (target.route === "/novels/create") {
    return target.mode === "director" ? "Trang tạo mới / Tự động đạo diễn AI" : "Trang tạo mới";
  }
  if (target.stage === "story_macro") {
    return "Trang chỉnh sửa tiểu thuyết / Quy hoạch tổng thể câu chuyện";
  }
  if (target.stage === "character") {
    return "Trang chỉnh sửa tiểu thuyết / Chuẩn bị nhân vật";
  }
  if (target.stage === "outline") {
    return "Trang chỉnh sửa tiểu thuyết / Chiến lược từng quyển";
  }
  if (target.stage === "structured") {
    return "Trang chỉnh sửa tiểu thuyết / Tách nhịp chương";
  }
  if (target.stage === "chapter") {
    return "Trang chỉnh sửa tiểu thuyết / Triển khai chương";
  }
  if (target.stage === "pipeline") {
    return "Trang chỉnh sửa tiểu thuyết / Sửa lỗi chất lượng";
  }
  return "Trang chỉnh sửa tiểu thuyết / Thiết lập dự án";
}

function formatStatus(status: TaskStatus): string {
  if (status === "queued") {
    return "Đang xếp hàng";
  }
  if (status === "running") {
    return "Đang chạy";
  }
  if (status === "waiting_approval") {
    return "Chờ duyệt";
  }
  if (status === "succeeded") {
    return "Đã hoàn tất";
  }
  if (status === "failed") {
    return "Thất bại";
  }
  return "Đã hủy";
}

function toStatusVariant(status: TaskStatus): "default" | "outline" | "secondary" | "destructive" {
  if (status === "running") {
    return "default";
  }
  if (status === "waiting_approval") {
    return "secondary";
  }
  if (status === "queued") {
    return "secondary";
  }
  if (status === "failed") {
    return "destructive";
  }
  return "outline";
}

function serializeListParams(input: {
  kind: TaskKind | "";
  status: TaskStatus | "";
  keyword: string;
}): string {
  return JSON.stringify({
    kind: input.kind || null,
    status: input.status || null,
    keyword: input.keyword.trim() || null,
  });
}

export default function TaskCenterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const llm = useLLMStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [kind, setKind] = useState<TaskKind | "">("");
  const [status, setStatus] = useState<TaskStatus | "">("");
  const [keyword, setKeyword] = useState("");
  const [onlyAnomaly, setOnlyAnomaly] = useState(false);
  const [retryOverride, setRetryOverride] = useState<LLMSelectorValue>({
    provider: llm.provider,
    model: llm.model,
    temperature: llm.temperature,
  });

  const selectedKind = (searchParams.get("kind") as TaskKind | null) ?? null;
  const selectedId = searchParams.get("id");
  const listParamsKey = serializeListParams({ kind, status, keyword });

  const listQuery = useQuery({
    queryKey: queryKeys.tasks.list(listParamsKey),
    queryFn: () =>
      listTasks({
        kind: kind || undefined,
        status: status || undefined,
        keyword: keyword.trim() || undefined,
        limit: 80,
      }),
    refetchInterval: (query) => {
      const rows = query.state.data?.data?.items ?? [];
      return rows.some((item) => ACTIVE_STATUSES.has(item.status)) ? 4000 : false;
    },
  });

  const allRows = listQuery.data?.data?.items ?? [];
  const visibleRows = useMemo(
    () =>
      (onlyAnomaly ? allRows.filter((item) => ANOMALY_STATUSES.has(item.status)) : allRows)
        .map((item, index) => ({ item, index }))
        .sort((left, right) => {
          const priorityDiff = getTaskListPriority(left.item.status) - getTaskListPriority(right.item.status);
          if (priorityDiff !== 0) {
            return priorityDiff;
          }
          return left.index - right.index;
        })
        .map(({ item }) => item),
    [allRows, onlyAnomaly],
  );

  const detailQuery = useQuery({
    queryKey: queryKeys.tasks.detail(selectedKind ?? "none", selectedId ?? "none"),
    queryFn: () => getTaskDetail(selectedKind as TaskKind, selectedId as string),
    enabled: Boolean(selectedKind && selectedId),
    retry: false,
    refetchInterval: (query) => {
      const task = query.state.data?.data;
      return task && ACTIVE_STATUSES.has(task.status) ? 4000 : false;
    },
  });

  useEffect(() => {
    if (!selectedKind || !selectedId) {
      if (visibleRows.length > 0) {
        const fallback = visibleRows[0];
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set("kind", fallback.kind);
          next.set("id", fallback.id);
          return next;
        });
      }
      return;
    }
    const exists = visibleRows.some((item) => item.kind === selectedKind && item.id === selectedId);
    if (!exists && visibleRows.length > 0) {
      const fallback = visibleRows[0];
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("kind", fallback.kind);
        next.set("id", fallback.id);
        return next;
      });
    }
  }, [selectedKind, selectedId, setSearchParams, visibleRows]);

  const runningCount = allRows.filter((item) => item.status === "running").length;
  const queuedCount = allRows.filter((item) => item.status === "queued").length;
  const failedCount = allRows.filter((item) => item.status === "failed").length;
  const completed24hCount = allRows.filter((item) => {
    if (item.status !== "succeeded") {
      return false;
    }
    const updatedAt = new Date(item.updatedAt).getTime();
    if (Number.isNaN(updatedAt)) {
      return false;
    }
    return Date.now() - updatedAt <= 24 * 60 * 60 * 1000;
  }).length;

  const invalidateTaskQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: ["tasks"] });
  };

  const retryMutation = useMutation({
    mutationFn: (payload: {
      kind: TaskKind;
      id: string;
      llmOverride?: {
        provider?: typeof llm.provider;
        model?: string;
        temperature?: number;
      };
      resume?: boolean;
    }) => retryTask(payload.kind, payload.id, {
      llmOverride: payload.llmOverride,
      resume: payload.resume,
    }),
    onSuccess: async (response, variables) => {
      const task = response.data;
      await invalidateTaskQueries();
      if (task) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set("kind", task.kind);
          next.set("id", task.id);
          return next;
        });
      }
      toast.success(
        variables.llmOverride
          ? `Đã chuyển sang ${variables.llmOverride.provider ?? "nhà cung cấp hiện tại"} / ${variables.llmOverride.model ?? "mô hình hiện tại"} và thử lại tác vụ`
          : "Tác vụ đã được đưa lại vào hàng chờ",
      );
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (payload: { kind: TaskKind; id: string }) => cancelTask(payload.kind, payload.id),
    onSuccess: async () => {
      await invalidateTaskQueries();
      toast.success("Yêu cầu hủy tác vụ đã được gửi");
    },
  });

  const continueWorkflowMutation = useMutation({
    mutationFn: (payload: { taskId: string; mode?: "auto_execute_front10" }) => continueNovelWorkflow(
      payload.taskId,
      payload.mode ? { continuationMode: payload.mode } : undefined,
    ),
    onSuccess: async (response, variables) => {
      await invalidateTaskQueries();
      const task = response.data;
      if (variables.mode === "auto_execute_front10") {
        toast.success("Đã tiếp tục tự động triển khai 10 chương đầu.");
        return;
      }
      if (task?.kind && task.id) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set("kind", task.kind);
          next.set("id", task.id);
          return next;
        });
        navigate(task.sourceRoute);
        return;
      }
      toast.success("Đã khôi phục luồng chính của tiểu thuyết.");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (payload: { kind: TaskKind; id: string }) => archiveTask(payload.kind, payload.id),
    onSuccess: async (_, payload) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.tasks.detail(payload.kind, payload.id),
      });
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("kind");
        next.delete("id");
        return next;
      });
      await invalidateTaskQueries();
      toast.success("Tác vụ đã được lưu trữ và ẩn khỏi trung tâm tác vụ");
    },
  });

  const selectedTask = detailQuery.data?.data;
  const isAutoDirectorTask = Boolean(
    selectedTask
    && selectedTask.kind === "novel_workflow"
    && selectedTask.meta.lane === "auto_director",
  );
  const isActiveAutoDirectorTask = Boolean(
    selectedTask
    && isAutoDirectorTask
    && ACTIVE_STATUSES.has(selectedTask.status),
  );
  const canResumeFront10AutoExecution = Boolean(
    selectedTask
    && selectedTask.kind === "novel_workflow"
    && canContinueFront10AutoExecution(selectedTask),
  );
  const needsCandidateSelection = Boolean(
    selectedTask
    && selectedTask.kind === "novel_workflow"
    && requiresCandidateSelection(selectedTask),
  );
  const selectedTaskNotice = useMemo(
    () => parseDirectorTaskNotice(selectedTask?.meta),
    [selectedTask?.meta],
  );
  const selectedTaskNoticeRoute = useMemo(
    () => (selectedTask ? buildTaskNoticeRoute(selectedTask, selectedTaskNotice) : null),
    [selectedTask, selectedTaskNotice],
  );
  const selectedTaskChapterTitleWarning = useMemo(
    () => (isAutoDirectorTask ? resolveChapterTitleWarning(selectedTask ?? null) : null),
    [isAutoDirectorTask, selectedTask],
  );
  const chapterTitleRepairMutation = useDirectorChapterTitleRepair();
  const selectedTaskFailureRepairRoute = selectedTaskChapterTitleWarning?.route ?? null;
  const selectedTaskHasChapterTitleFailure = Boolean(
    selectedTask
    && isChapterTitleDiversitySummary(
      selectedTask.failureSummary ?? selectedTask.lastError ?? null,
    ),
  );
  const canRetryWithSelectedModel = Boolean(retryOverride.provider && retryOverride.model.trim());

  useEffect(() => {
    setRetryOverride({
      provider: llm.provider,
      model: llm.model,
      temperature: llm.temperature,
    });
  }, [llm.model, llm.provider, llm.temperature, selectedTask?.id]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Đang chạy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{runningCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Đang xếp hàng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{queuedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Thất bại</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{failedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Hoàn tất trong 24h</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{completed24hCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lọc</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <select
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={kind}
              onChange={(event) => setKind(event.target.value as TaskKind | "")}
            >
              <option value="">Tất cả loại</option>
              <option value="book_analysis">Phân tích sách</option>
              <option value="novel_workflow">Sáng tác tiểu thuyết</option>
              <option value="novel_pipeline">Dây chuyền tiểu thuyết</option>
              <option value="knowledge_document">Chỉ mục tri thức</option>
              <option value="image_generation">Tạo ảnh</option>
              <option value="agent_run">Chạy Agent</option>
            </select>
            <select
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={status}
              onChange={(event) => setStatus(event.target.value as TaskStatus | "")}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="queued">Đang xếp hàng</option>
              <option value="running">Đang chạy</option>
              <option value="waiting_approval">Chờ duyệt</option>
              <option value="failed">Thất bại</option>
              <option value="cancelled">Đã hủy</option>
              <option value="succeeded">Đã hoàn tất</option>
            </select>
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tiêu đề hoặc đối tượng liên quan"
            />
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={onlyAnomaly}
                onChange={(event) => setOnlyAnomaly(event.target.checked)}
              />
              Chỉ xem tác vụ bất thường
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Danh sách tác vụ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {visibleRows.map((task) => {
              const isSelected = task.kind === selectedKind && task.id === selectedId;
              return (
                <button
                  key={`${task.kind}:${task.id}`}
                  type="button"
                  className={`w-full rounded-md border p-3 text-left transition-colors ${
                    isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                  }`}
                  onClick={() => {
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set("kind", task.kind);
                      next.set("id", task.id);
                      return next;
                    });
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">{task.title}</div>
                  <Badge variant={toStatusVariant(task.status)}>{formatStatus(task.status)}</Badge>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {formatKind(task.kind)} | Tiến độ {Math.round(task.progress * 100)}%
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Giai đoạn: {task.currentStage ?? "Không có"} | Mục hiện tại: {task.currentItemLabel ?? "Không có"}
                </div>
                {task.displayStatus || task.lastHealthyStage ? (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Trạng thái: {task.displayStatus ?? formatStatus(task.status)} | Giai đoạn ổn định gần nhất: {task.lastHealthyStage ?? "Không có"}
                  </div>
                ) : null}
                {task.kind === "novel_workflow" ? (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Mốc kiểm tra: {formatCheckpoint(task.checkpointType)} | Đề xuất tiếp tục: {task.resumeAction ?? task.nextActionLabel ?? "Tiếp tục luồng chính"}
                  </div>
                ) : null}
                {task.blockingReason ? (
                  <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    Lý do: {task.blockingReason}
                  </div>
                ) : null}
                <div className="mt-1 text-xs text-muted-foreground">
                  Nhịp gần nhất: {formatDate(task.heartbeatAt)} | Cập nhật: {formatDate(task.updatedAt)}
                </div>
              </button>
              );
            })}
            {visibleRows.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                Hiện không có tác vụ nào khớp điều kiện.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chi tiết tác vụ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {selectedTask ? (
              <>
                <div className="space-y-1">
                  <div className="font-medium">{selectedTask.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatKind(selectedTask.kind)} | Thuộc về: {selectedTask.ownerLabel}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={toStatusVariant(selectedTask.status)}>{formatStatus(selectedTask.status)}</Badge>
                  <Badge variant="outline">Tiến độ {Math.round(selectedTask.progress * 100)}%</Badge>
                </div>
                <div className="space-y-1 text-muted-foreground">
                  <div>Trạng thái hiển thị: {selectedTask.displayStatus ?? formatStatus(selectedTask.status)}</div>
                  <div>Giai đoạn hiện tại: {selectedTask.currentStage ?? "Không có"}</div>
                  <div>Mục hiện tại: {selectedTask.currentItemLabel ?? "Không có"}</div>
                  {selectedTask.kind === "novel_workflow" ? (
                    <>
                      <div>Mốc kiểm tra gần nhất: {formatCheckpoint(selectedTask.checkpointType)}</div>
                      <div>Trang khôi phục đích: {formatResumeTarget(selectedTask.resumeTarget)}</div>
                      <div>Đề xuất tiếp tục: {selectedTask.resumeAction ?? selectedTask.nextActionLabel ?? "Tiếp tục luồng chính của tiểu thuyết"}</div>
                      <div>Giai đoạn ổn định gần nhất: {selectedTask.lastHealthyStage ?? "Không có"}</div>
                    </>
                  ) : null}
                  {selectedTask.blockingReason ? (
                    <div>Lý do chặn: {selectedTask.blockingReason}</div>
                  ) : null}
                  <div>Nhịp gần nhất: {formatDate(selectedTask.heartbeatAt)}</div>
                  <div>Thời gian bắt đầu: {formatDate(selectedTask.startedAt)}</div>
                  <div>Thời gian kết thúc: {formatDate(selectedTask.finishedAt)}</div>
                  <div>Số lần thử lại: {selectedTask.retryCountLabel}</div>
                  {isAutoDirectorTask ? (
                    <>
                      <div>Mô hình gắn với tác vụ: {selectedTask.provider ?? "Không có"} / {selectedTask.model ?? "Không có"}</div>
                      <div>Mô hình giao diện hiện tại: {llm.provider} / {llm.model}</div>
                    </>
                  ) : null}
                  {selectedTask.tokenUsage ? (
                    <>
                      <div>Tổng số lần gọi: {formatTokenCount(selectedTask.tokenUsage.llmCallCount)}</div>
                      <div>Tokens đầu vào: {formatTokenCount(selectedTask.tokenUsage.promptTokens)}</div>
                      <div>Tokens đầu ra: {formatTokenCount(selectedTask.tokenUsage.completionTokens)}</div>
                      <div>Tổng tokens: {formatTokenCount(selectedTask.tokenUsage.totalTokens)}</div>
                      <div>Bản ghi gần nhất: {formatDate(selectedTask.tokenUsage.lastRecordedAt)}</div>
                    </>
                  ) : null}
                </div>
                {selectedTask.noticeCode || selectedTask.noticeSummary ? (
                  <div className="rounded-md border border-amber-300/50 bg-amber-50/70 p-2 text-amber-900">
                    <div className="font-medium">
                      {selectedTaskChapterTitleWarning ? "Cảnh báo hiện tại" : (selectedTask.noticeCode ?? "Thông báo kết quả")}
                    </div>
                    {selectedTask.noticeSummary ? (
                      <div className="mt-1 text-sm">{selectedTask.noticeSummary}</div>
                    ) : null}
                    {selectedTaskChapterTitleWarning || selectedTaskNoticeRoute ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (selectedTaskChapterTitleWarning) {
                              chapterTitleRepairMutation.startRepair(selectedTask ?? null);
                              return;
                            }
                            if (selectedTaskNoticeRoute) {
                              navigate(selectedTaskNoticeRoute);
                            }
                          }}
                          disabled={chapterTitleRepairMutation.isPending}
                        >
                          {selectedTaskChapterTitleWarning?.label ?? selectedTaskNotice?.action?.label ?? "Mở phần tách chương của quyển hiện tại"}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {selectedTask.failureCode || selectedTask.failureSummary ? (
                  <div className="rounded-md border border-amber-300/50 bg-amber-50/70 p-2 text-amber-900">
                    <div className="font-medium">
                      {selectedTaskHasChapterTitleFailure ? "Cảnh báo hiện tại" : (selectedTask.failureCode ?? "Tác vụ bất thường")}
                    </div>
                    {selectedTask.failureSummary ? (
                      <div className="mt-1 text-sm">{selectedTask.failureSummary}</div>
                    ) : null}
                    {selectedTaskChapterTitleWarning || selectedTaskFailureRepairRoute ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (selectedTaskChapterTitleWarning) {
                              chapterTitleRepairMutation.startRepair(selectedTask ?? null);
                              return;
                            }
                            if (selectedTaskFailureRepairRoute) {
                              navigate(selectedTaskFailureRepairRoute);
                            }
                          }}
                          disabled={chapterTitleRepairMutation.isPending}
                        >
                          {selectedTaskChapterTitleWarning?.label ?? "Sửa nhanh tiêu đề chương"}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {selectedTask.lastError && !selectedTaskHasChapterTitleFailure ? (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-destructive">
                    {selectedTask.lastError}
                  </div>
                ) : null}
                {selectedTask.kind === "novel_workflow" && selectedTask.checkpointSummary ? (
                  <div className="rounded-md border bg-muted/20 p-2 text-muted-foreground">
                    {selectedTask.checkpointSummary}
                  </div>
                ) : null}
                {(selectedTask.status === "failed" || selectedTask.status === "cancelled") && isAutoDirectorTask ? (
                  <div className="rounded-md border bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">Dùng mô hình khác để thử lại</div>
                    <div className="mt-2 flex flex-col gap-2">
                      <LLMSelector
                        value={retryOverride}
                        onChange={setRetryOverride}
                        compact
                        showBadge={false}
                        showHelperText={false}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            retryMutation.mutate({
                              kind: selectedTask.kind,
                              id: selectedTask.id,
                              llmOverride: {
                                provider: retryOverride.provider,
                                model: retryOverride.model,
                                temperature: retryOverride.temperature,
                              },
                              resume: true,
                            })
                          }
                          disabled={retryMutation.isPending || !canRetryWithSelectedModel}
                        >
                          Dùng mô hình đã chọn để thử lại
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {needsCandidateSelection ? (
                    <Button
                      size="sm"
                      onClick={() => navigate(getCandidateSelectionLink(selectedTask.id))}
                    >
                      {selectedTask.resumeAction ?? "Tiếp tục xác nhận hướng đi của cả cuốn"}
                    </Button>
                  ) : null}
                  {canResumeFront10AutoExecution ? (
                    <Button
                      size="sm"
                      onClick={() =>
                        continueWorkflowMutation.mutate({
                          taskId: selectedTask.id,
                          mode: "auto_execute_front10",
                        })}
                      disabled={continueWorkflowMutation.isPending}
                    >
                      {selectedTask.resumeAction ?? "Tiếp tục tự động triển khai 10 chương đầu"}
                    </Button>
                  ) : null}
                  {selectedTask.kind === "novel_workflow"
                  && !needsCandidateSelection
                  && !canResumeFront10AutoExecution
                  && (selectedTask.status === "waiting_approval" || selectedTask.status === "queued" || selectedTask.status === "running") ? (
                    <Button
                      size="sm"
                      onClick={() =>
                        continueWorkflowMutation.mutate({
                          taskId: selectedTask.id,
                        })}
                      disabled={continueWorkflowMutation.isPending}
                    >
                      {selectedTask.resumeAction ?? (isActiveAutoDirectorTask ? "Xem tiến độ" : "Tiếp tục")}
                    </Button>
                  ) : null}
                  {(selectedTask.status === "failed" || selectedTask.status === "cancelled") ? (
                    <>
                      <Button
                        size="sm"
                        variant={isAutoDirectorTask ? "outline" : "default"}
                        onClick={() =>
                          retryMutation.mutate({
                            kind: selectedTask.kind,
                            id: selectedTask.id,
                          })
                        }
                        disabled={retryMutation.isPending}
                      >
                        {isAutoDirectorTask ? "Thử lại theo mô hình gốc của tác vụ" : "Thử lại"}
                      </Button>
                    </>
                  ) : null}
                  {(selectedTask.status === "queued" || selectedTask.status === "running" || selectedTask.status === "waiting_approval") ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        cancelMutation.mutate({
                          kind: selectedTask.kind,
                          id: selectedTask.id,
                        })}
                      disabled={cancelMutation.isPending}
                      >
                      Hủy
                    </Button>
                  ) : null}
                  {ARCHIVABLE_STATUSES.has(selectedTask.status) ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        archiveMutation.mutate({
                          kind: selectedTask.kind,
                          id: selectedTask.id,
                        })}
                      disabled={archiveMutation.isPending}
                    >
                      Lưu trữ
                    </Button>
                  ) : null}
                  <Button asChild size="sm" variant="outline">
                    <Link to={selectedTask.sourceRoute}>Mở trang nguồn</Link>
                  </Button>
                  <OpenInCreativeHubButton
                    bindings={{ taskId: selectedTask.id }}
                    label="Chẩn đoán trong trung tâm sáng tác"
                  />
                </div>
                <div className="space-y-2">
                  <div className="font-medium">Trạng thái bước</div>
                  {selectedTask.steps.map((step) => (
                    <div key={step.key} className="flex items-center justify-between rounded-md border p-2">
                      <div>{step.label}</div>
                      <Badge variant="outline">{step.status}</Badge>
                    </div>
                  ))}
                </div>
                {selectedTask.kind === "novel_workflow" && Array.isArray(selectedTask.meta.milestones) && selectedTask.meta.milestones.length > 0 ? (
                  <div className="space-y-2">
                    <div className="font-medium">Lịch sử mốc quan trọng</div>
                    {(selectedTask.meta.milestones as Array<{ checkpointType: NovelWorkflowCheckpoint; summary: string; createdAt: string }>).map((item) => (
                      <div key={`${item.checkpointType}:${item.createdAt}`} className="rounded-md border p-2 text-muted-foreground">
                        <div className="font-medium text-foreground">{formatCheckpoint(item.checkpointType)}</div>
                        <div className="mt-1">{item.summary}</div>
                        <div className="mt-1 text-xs">Thời điểm ghi nhận: {formatDate(item.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="text-muted-foreground">Vui lòng chọn một tác vụ để xem chi tiết.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
