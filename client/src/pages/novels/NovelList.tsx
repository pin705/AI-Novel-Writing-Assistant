import type { KeyboardEvent, MouseEvent } from "react";
import { useMemo, useState } from "react";
import type { ProjectProgressStatus } from "@ai-novel/shared/types/novel";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { continueNovelWorkflow } from "@/api/novelWorkflow";
import { deleteNovel, downloadNovelExport, getNovelList } from "@/api/novel";
import { queryKeys } from "@/api/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  canContinueDirector,
  canContinueFront10AutoExecution,
  canEnterChapterExecution,
  getCandidateSelectionLink,
  getTaskCenterLink,
  getWorkflowBadge,
  getWorkflowDescription,
  isWorkflowRunningInBackground,
  requiresCandidateSelection,
} from "@/lib/novelWorkflowTaskUi";
import { toast } from "@/components/ui/toast";
import NovelWorkflowRunningIndicator from "./components/NovelWorkflowRunningIndicator";

type StatusFilter = "all" | "draft" | "published";
type WritingModeFilter = "all" | "original" | "continuation";
const DIRECTOR_CREATE_LINK = "/novels/create?mode=director";
const MANUAL_CREATE_LINK = "/novels/create";

function createDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function formatProgressStatus(status?: ProjectProgressStatus | null): string {
  if (status === "completed") {
    return "Hoàn thành";
  }
  if (status === "in_progress") {
    return "Đang làm";
  }
  if (status === "rework") {
    return "Cần làm lại";
  }
  if (status === "blocked") {
    return "Bị chặn";
  }
  return "Chưa bắt đầu";
}

function formatTokenCount(value?: number | null): string {
  const normalized = typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : 0;
  return new Intl.NumberFormat("vi-VN").format(normalized);
}

export default function NovelList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [writingMode, setWritingMode] = useState<WritingModeFilter>("all");

  const novelListQuery = useQuery({
    queryKey: queryKeys.novels.list(1, 100),
    queryFn: () => getNovelList({ page: 1, limit: 100 }),
  });

  const deleteNovelMutation = useMutation({
    mutationFn: (id: string) => deleteNovel(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.novels.all });
      toast.success("Đã xóa tiểu thuyết.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Xóa tiểu thuyết thất bại.");
    },
  });

  const downloadNovelMutation = useMutation({
    mutationFn: (input: { novelId: string; novelTitle: string }) => downloadNovelExport(
      input.novelId,
      "txt",
      input.novelTitle,
    ),
    onSuccess: ({ blob, fileName }) => {
      createDownload(blob, fileName);
      toast.success("Đã bắt đầu xuất file.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Xuất tiểu thuyết thất bại.");
    },
  });

  const continueWorkflowMutation = useMutation({
    mutationFn: async (input: {
      taskId: string;
      mode?: "auto_execute_front10";
    }) => continueNovelWorkflow(input.taskId, input.mode ? { continuationMode: input.mode } : undefined),
    onSuccess: async (_response, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.novels.all }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      ]);
      toast.success(input.mode === "auto_execute_front10" ? "Đã tiếp tục tự động triển khai 10 chương đầu." : "Tự động đạo diễn đã tiếp tục triển khai.");
    },
    onError: (error, input) => {
      toast.error(
        error instanceof Error
          ? error.message
          : input.mode === "auto_execute_front10"
            ? "Tiếp tục tự động triển khai 10 chương đầu thất bại."
            : "Tiếp tục tự động đạo diễn thất bại.",
      );
    },
  });

  const allNovels = novelListQuery.data?.data?.items ?? [];

  const novels = useMemo(() => {
    return allNovels.filter((item) => {
      if (status !== "all" && item.status !== status) {
        return false;
      }
      if (writingMode !== "all" && item.writingMode !== writingMode) {
        return false;
      }
      return true;
    });
  }, [allNovels, status, writingMode]);

  const handleDelete = (novelId: string, title: string) => {
    const confirmed = window.confirm(`Bạn có chắc muốn xóa “${title}” không? Thao tác này sẽ xóa trực tiếp tiểu thuyết hiện tại.`);
    if (!confirmed) {
      return;
    }
    deleteNovelMutation.mutate(novelId);
  };

  const stopCardClick = (event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  const openNovelEditor = (novelId: string) => {
    navigate(`/novels/${novelId}/edit`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button
              variant={status === "all" ? "default" : "secondary"}
              onClick={() => setStatus("all")}
            >
              Tất cả
            </Button>
            <Button
              variant={status === "draft" ? "default" : "secondary"}
              onClick={() => setStatus("draft")}
            >
              Bản nháp
            </Button>
            <Button
              variant={status === "published" ? "default" : "secondary"}
              onClick={() => setStatus("published")}
            >
              Đã phát hành
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={writingMode === "all" ? "default" : "secondary"}
              onClick={() => setWritingMode("all")}
            >
              Loại sáng tác: Tất cả
            </Button>
            <Button
              size="sm"
              variant={writingMode === "original" ? "default" : "secondary"}
              onClick={() => setWritingMode("original")}
            >
              Nguyên tác
            </Button>
            <Button
              size="sm"
              variant={writingMode === "continuation" ? "default" : "secondary"}
              onClick={() => setWritingMode("continuation")}
            >
              Viết tiếp
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link to={DIRECTOR_CREATE_LINK}>Khởi tạo sách bằng AI đạo diễn</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={MANUAL_CREATE_LINK}>Tạo tiểu thuyết thủ công</Link>
          </Button>
        </div>
      </div>

      {novelListQuery.isPending ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={`loading-${index}`} className="animate-pulse">
              <CardHeader>
                <div className="h-6 w-2/3 rounded bg-muted" />
                <div className="h-4 w-full rounded bg-muted" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-4 w-1/2 rounded bg-muted" />
                <div className="h-20 rounded bg-muted" />
                <div className="flex gap-2">
                  <div className="h-9 w-24 rounded bg-muted" />
                  <div className="h-9 w-20 rounded bg-muted" />
                  <div className="h-9 w-20 rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : novelListQuery.isError ? (
        <Card>
          <CardHeader>
            <CardTitle>Tải danh sách tiểu thuyết thất bại</CardTitle>
            <CardDescription>Hiện không đọc được danh sách dự án, bạn có thể thử lại một lần nữa.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void novelListQuery.refetch()}>Tải lại</Button>
          </CardContent>
        </Card>
      ) : novels.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{allNovels.length === 0 ? "Chưa có tiểu thuyết nào" : "Không có tiểu thuyết nào khớp bộ lọc"}</CardTitle>
            <CardDescription>
              {allNovels.length === 0
                ? "Nếu đây là lần đầu dùng, mình khuyên bấm thẳng “Khởi tạo sách bằng AI đạo diễn” ở góc trên bên phải để hệ thống giúp bạn dựng hướng đi và chuẩn bị mở viết."
                : "Bạn có thể chỉnh bộ lọc phía trên, hoặc tạo một dự án tiểu thuyết mới."}
            </CardDescription>
          </CardHeader>
          {allNovels.length === 0 ? (
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to={DIRECTOR_CREATE_LINK}>Khởi tạo sách bằng AI đạo diễn</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={MANUAL_CREATE_LINK}>Tạo tiểu thuyết thủ công</Link>
              </Button>
            </CardContent>
          ) : null}
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {novels.map((novel) => {
            const workflowTask = novel.latestAutoDirectorTask ?? null;
            const workflowBadge = getWorkflowBadge(workflowTask);
            const workflowDescription = getWorkflowDescription(workflowTask);
            const isWorkflowRunning = isWorkflowRunningInBackground(workflowTask);
            const isWorkflowPending = continueWorkflowMutation.isPending
              && continueWorkflowMutation.variables?.taskId === workflowTask?.id;
            const isDownloadPending = downloadNovelMutation.isPending
              && downloadNovelMutation.variables?.novelId === novel.id;
            const isDeletePending = deleteNovelMutation.isPending
              && deleteNovelMutation.variables === novel.id;

            return (
              <Card
                key={novel.id}
                role="link"
                tabIndex={0}
                className="cursor-pointer transition hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
                onClick={() => openNovelEditor(novel.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openNovelEditor(novel.id);
                  }
                }}
              >
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="line-clamp-1 text-lg transition hover:text-primary">
                      {novel.title}
                    </CardTitle>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Badge variant={novel.status === "published" ? "default" : "secondary"}>
                        {novel.status === "published" ? "Đã phát hành" : "Bản nháp"}
                      </Badge>
                      {novel.writingMode === "continuation" ? (
                        <Badge variant="outline">Viết tiếp</Badge>
                      ) : (
                        <Badge variant="outline">Nguyên tác</Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {novel.description || "Chưa có phần giới thiệu"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    Số chương: {novel._count.chapters}, Số nhân vật: {novel._count.characters}, Tổng token: {formatTokenCount(
                      novel.tokenUsage?.totalTokens,
                    )}
                  </div>

                  {workflowTask ? (
                    <div
                      className={cn(
                        "rounded-xl border p-3 transition-colors",
                        isWorkflowRunning
                          ? "border-primary/20 bg-primary/[0.04] shadow-sm"
                          : "bg-muted/20",
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        {workflowBadge ? (
                          <Badge variant={workflowBadge.variant}>{workflowBadge.label}</Badge>
                        ) : null}
                        <Badge variant="outline">Tiến độ {Math.round(workflowTask.progress * 100)}%</Badge>
                        {isWorkflowRunning ? (
                          <Badge variant="outline">Đang chạy nền</Badge>
                        ) : null}
                      </div>
                      {workflowDescription ? (
                        <div className="mt-2 text-sm text-muted-foreground">{workflowDescription}</div>
                      ) : null}
                      {isWorkflowRunning ? (
                        <NovelWorkflowRunningIndicator
                          className="mt-3"
                          progress={workflowTask.progress}
                          label={workflowTask.currentItemLabel?.trim() || "AI đang tiếp tục triển khai ở nền"}
                        />
                      ) : null}
                      <div className="mt-2 text-xs text-muted-foreground">
                        Giai đoạn hiện tại: {workflowTask.currentStage ?? "Tự động đạo diễn"}{workflowTask.currentItemLabel ? ` · ${workflowTask.currentItemLabel}` : ""}
                      </div>
                      {workflowTask.lastHealthyStage ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Giai đoạn ổn định gần nhất: {workflowTask.lastHealthyStage}
                        </div>
                      ) : null}
                      {workflowTask.resumeAction ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Đề xuất tiếp tục: {workflowTask.resumeAction}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed bg-muted/10 p-3 text-xs text-muted-foreground">
                      Hiện chưa phát hiện tác vụ tự động đạo diễn, danh sách đang hiển thị theo tài sản cơ bản của tiểu thuyết.
                    </div>
                  )}

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Dự án: {formatProgressStatus(novel.projectStatus)}</span>
                    <span>Trục chính: {formatProgressStatus(novel.storylineStatus)}</span>
                    <span>Dàn ý: {formatProgressStatus(novel.outlineStatus)}</span>
                    <span>Tài nguyên: {novel.resourceReadyScore ?? 0}/100</span>
                  </div>

                  {novel.world ? (
                    <div className="text-xs text-muted-foreground">
                      Thế giới quan: {novel.world.name}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    {canContinueFront10AutoExecution(workflowTask) ? (
                      <Button
                        size="sm"
                        onClick={(event) => {
                          stopCardClick(event);
                          if (!workflowTask) {
                            return;
                          }
                          continueWorkflowMutation.mutate({
                            taskId: workflowTask.id,
                            mode: "auto_execute_front10",
                          });
                        }}
                        disabled={isWorkflowPending}
                      >
                        {isWorkflowPending ? "Đang tiếp tục..." : (workflowTask?.resumeAction ?? "Tiếp tục tự động triển khai 10 chương đầu")}
                      </Button>
                    ) : canContinueDirector(workflowTask) ? (
                      <Button
                        size="sm"
                        onClick={(event) => {
                          stopCardClick(event);
                          if (!workflowTask) {
                            return;
                          }
                          continueWorkflowMutation.mutate({
                            taskId: workflowTask.id,
                          });
                        }}
                        disabled={isWorkflowPending}
                      >
                        {isWorkflowPending ? "Đang tiếp tục..." : (workflowTask?.resumeAction ?? "Tiếp tục đạo diễn")}
                      </Button>
                    ) : requiresCandidateSelection(workflowTask) ? (
                      <Button asChild size="sm">
                        <Link to={getCandidateSelectionLink(workflowTask!.id)} onClick={stopCardClick}>
                          {workflowTask!.resumeAction ?? "Tiếp tục xác nhận hướng đi của cả cuốn"}
                        </Link>
                      </Button>
                    ) : canEnterChapterExecution(workflowTask) ? (
                      <Button asChild size="sm">
                        <Link to={`/novels/${novel.id}/edit`} onClick={stopCardClick}>Vào triển khai chương</Link>
                      </Button>
                    ) : workflowTask ? (
                      <Button asChild size="sm">
                        <Link to={getTaskCenterLink(workflowTask.id)} onClick={stopCardClick}>Xem tác vụ</Link>
                      </Button>
                    ) : null}

                    {workflowTask ? (
                      <Button asChild size="sm" variant="outline">
                        <Link to={getTaskCenterLink(workflowTask.id)} onClick={stopCardClick}>Trung tâm tác vụ</Link>
                      </Button>
                    ) : null}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(event) => {
                        stopCardClick(event);
                        downloadNovelMutation.mutate({
                          novelId: novel.id,
                          novelTitle: novel.title,
                        });
                      }}
                      disabled={isDownloadPending}
                    >
                      {isDownloadPending ? "Đang xuất..." : "Xuất"}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(event) => {
                        stopCardClick(event);
                        handleDelete(novel.id, novel.title);
                      }}
                      disabled={isDeletePending}
                    >
                      {isDeletePending ? "Đang xóa..." : "Xóa"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
