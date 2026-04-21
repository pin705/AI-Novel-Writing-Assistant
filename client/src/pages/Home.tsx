import type { KeyboardEvent, MouseEvent } from "react";
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { continueNovelWorkflow } from "@/api/novelWorkflow";
import { getNovelList } from "@/api/novel";
import type { NovelListResponse } from "@/api/novel/shared";
import { queryKeys } from "@/api/queryKeys";
import { listTasks } from "@/api/tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  canContinueDirector,
  canContinueFront10AutoExecution,
  canEnterChapterExecution,
  getCandidateSelectionLink,
  getTaskCenterLink,
  getWorkflowBadge,
  getWorkflowDescription,
  isWorkflowRunningInBackground,
  isWorkflowActionRequired,
  requiresCandidateSelection,
} from "@/lib/novelWorkflowTaskUi";
import { toast } from "@/components/ui/toast";

const HOME_NOVEL_FETCH_LIMIT = 100;
const HOME_RECENT_LIMIT = 6;
const DIRECTOR_CREATE_LINK = "/novels/create?mode=director";
const MANUAL_CREATE_LINK = "/novels/create";

type HomeNovelItem = NovelListResponse["items"][number];

function formatDate(value: string | undefined): string {
  if (!value) {
    return "Không có";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Không có";
  }
  return date.toLocaleString();
}

function getNovelPriorityScore(novel: HomeNovelItem): number {
  const task = novel.latestAutoDirectorTask ?? null;
  if (canContinueFront10AutoExecution(task)) {
    return 0;
  }
  if (requiresCandidateSelection(task)) {
    return 1;
  }
  if (canContinueDirector(task)) {
    return 2;
  }
  if (task?.status === "running" || task?.status === "queued") {
    return 3;
  }
  if (canEnterChapterExecution(task)) {
    return 4;
  }
  if (task?.status === "failed" || task?.status === "cancelled") {
    return 5;
  }
  return 6;
}

function getNovelLeadSummary(novel: HomeNovelItem): string {
  const workflowDescription = getWorkflowDescription(novel.latestAutoDirectorTask ?? null);
  if (workflowDescription) {
    return workflowDescription;
  }
  if (novel.description?.trim()) {
    return novel.description.trim();
  }
  if (novel.world?.name) {
    return `Dự án hiện đã liên kết với thế giới quan “${novel.world.name}”, bạn có thể tiếp tục sáng tác ngay.`;
  }
  return "Dự án hiện chưa có phần giới thiệu, bạn có thể vào trang chỉnh sửa để tiếp tục.";
}

function MetricCard(props: {
  title: string;
  value: string | number;
  hint: string;
  pending?: boolean;
}) {
  const { title, value, hint, pending = false } = props;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{pending ? "--" : value}</CardTitle>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </CardHeader>
    </Card>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const taskQuery = useQuery({
    queryKey: queryKeys.tasks.list("home"),
    queryFn: () => listTasks({ limit: 80 }),
    refetchInterval: (query) => {
      const rows = query.state.data?.data?.items ?? [];
      return rows.some((item) => item.status === "queued" || item.status === "running") ? 4000 : false;
    },
  });

  const novelQuery = useQuery({
    queryKey: queryKeys.novels.list(1, HOME_NOVEL_FETCH_LIMIT),
    queryFn: () => getNovelList({ page: 1, limit: HOME_NOVEL_FETCH_LIMIT }),
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

  const tasks = taskQuery.data?.data?.items ?? [];
  const allNovels = novelQuery.data?.data?.items ?? [];
  const hasNovels = allNovels.length > 0;

  const liveWorkflowCount = useMemo(
    () => allNovels.filter((novel) => isWorkflowRunningInBackground(novel.latestAutoDirectorTask ?? null)).length,
    [allNovels],
  );
  const actionRequiredCount = useMemo(
    () => allNovels.filter((novel) => isWorkflowActionRequired(novel.latestAutoDirectorTask ?? null)).length,
    [allNovels],
  );
  const readyForExecutionCount = useMemo(
    () => allNovels.filter((novel) => canEnterChapterExecution(novel.latestAutoDirectorTask ?? null)).length,
    [allNovels],
  );
  const failedTaskCount = useMemo(
    () => tasks.filter((item) => item.status === "failed").length,
    [tasks],
  );
  const primaryNovel = useMemo(() => {
    if (allNovels.length === 0) {
      return null;
    }
    return allNovels.reduce<HomeNovelItem | null>((selected, current) => {
      if (!selected) {
        return current;
      }
      const selectedPriority = getNovelPriorityScore(selected);
      const currentPriority = getNovelPriorityScore(current);
      return currentPriority < selectedPriority ? current : selected;
    }, null);
  }, [allNovels]);
  const recentNovels = useMemo(
    () => allNovels.slice(0, HOME_RECENT_LIMIT),
    [allNovels],
  );

  const stopCardClick = (event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  const openNovelEditor = (novelId: string) => {
    navigate(`/novels/${novelId}/edit`);
  };

  const renderNovelPrimaryAction = (
    novel: HomeNovelItem,
    options?: {
      size?: "default" | "sm" | "lg";
      stopPropagation?: boolean;
    },
  ) => {
    const { size = "sm", stopPropagation = false } = options ?? {};
    const task = novel.latestAutoDirectorTask ?? null;
    const isWorkflowPending = continueWorkflowMutation.isPending
      && continueWorkflowMutation.variables?.taskId === task?.id;

    const handleActionClick = (event: MouseEvent<HTMLElement>) => {
      if (stopPropagation) {
        stopCardClick(event);
      }
    };

    if (canContinueFront10AutoExecution(task)) {
      return (
        <Button
          size={size}
          onClick={(event) => {
            handleActionClick(event);
            if (!task) {
              return;
            }
            continueWorkflowMutation.mutate({
              taskId: task.id,
              mode: "auto_execute_front10",
            });
          }}
          disabled={isWorkflowPending}
        >
          {isWorkflowPending ? "Đang tiếp tục..." : (task?.resumeAction ?? "Tiếp tục tự động triển khai 10 chương đầu")}
        </Button>
      );
    }

    if (canContinueDirector(task)) {
      return (
        <Button
          size={size}
          onClick={(event) => {
            handleActionClick(event);
            if (!task) {
              return;
            }
            continueWorkflowMutation.mutate({
              taskId: task.id,
            });
          }}
          disabled={isWorkflowPending}
        >
          {isWorkflowPending ? "Đang tiếp tục..." : (task?.resumeAction ?? "Tiếp tục đạo diễn")}
        </Button>
      );
    }

    if (requiresCandidateSelection(task)) {
      return (
        <Button asChild size={size}>
          <Link
            to={getCandidateSelectionLink(task!.id)}
            onClick={stopPropagation ? stopCardClick : undefined}
          >
            {task!.resumeAction ?? "Tiếp tục xác nhận hướng đi của cả cuốn"}
          </Link>
        </Button>
      );
    }

    if (canEnterChapterExecution(task)) {
      return (
        <Button asChild size={size}>
          <Link
            to={`/novels/${novel.id}/edit`}
            onClick={stopPropagation ? stopCardClick : undefined}
          >
          Vào phần triển khai chương
          </Link>
        </Button>
      );
    }

    if (task) {
      return (
        <Button asChild size={size}>
          <Link
            to={getTaskCenterLink(task.id)}
            onClick={stopPropagation ? stopCardClick : undefined}
          >
            Xem tác vụ
          </Link>
        </Button>
      );
    }

    return (
      <Button asChild size={size}>
        <Link
          to={`/novels/${novel.id}/edit`}
          onClick={stopPropagation ? stopCardClick : undefined}
        >
          Chỉnh sửa tiểu thuyết
        </Link>
      </Button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Đang tự động triển khai"
          value={liveWorkflowCount}
          hint="Các dự án tự động đạo diễn hoặc tự động triển khai vẫn đang chạy nền."
          pending={novelQuery.isPending}
        />
        <MetricCard
          title="Đang chờ bạn xử lý"
          value={actionRequiredCount}
          hint="Những dự án cần bạn quyết định bước tiếp theo sau khi chờ duyệt, thất bại hoặc bị hủy."
          pending={novelQuery.isPending}
        />
        <MetricCard
          title="Có thể vào triển khai chương"
          value={readyForExecutionCount}
          hint="Đã sẵn sàng tới giai đoạn có thể bắt đầu viết chương."
          pending={novelQuery.isPending}
        />
        <MetricCard
          title="Tác vụ nền thất bại"
          value={failedTaskCount}
          hint="Tổng số tác vụ thất bại từ trung tâm tác vụ, có thể xử lý tập trung sau."
          pending={taskQuery.isPending}
        />
      </div>

      <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-background to-primary/5 shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Gợi ý cho người mới</Badge>
            <Badge variant="outline">Khởi đầu dễ dàng</Badge>
          </div>
          <CardTitle>
            {hasNovels ? "Muốn mở nhanh cuốn tiếp theo? Hãy để AI tự động đạo diễn." : "Lần đầu sử dụng? Hãy để AI tự động đạo diễn dẫn bạn mở một cuốn sách."}
          </CardTitle>
          <CardDescription>
            Bạn chỉ cần đưa ra một ý tưởng sơ bộ, AI sẽ giúp tạo hướng đi, bộ tiêu đề và phần chuẩn bị mở sách, rồi dừng lại ở các mốc quan trọng để bạn xác nhận, không cần nghĩ rõ toàn bộ cấu trúc ngay từ đầu.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>Phù hợp khi bạn chưa chốt thể loại, điểm bán và cam kết 30 chương đầu</span>
            <span>Cũng phù hợp để dựng nhanh một dự án mới có thể tiếp tục triển khai</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="lg">
              <Link to={DIRECTOR_CREATE_LINK}>Mở sách bằng AI tự động đạo diễn</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to={MANUAL_CREATE_LINK}>Tạo tiểu thuyết thủ công</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tiếp tục dự án gần đây</CardTitle>
          <CardDescription>Trang chủ nên đưa bạn quay lại ngay cuốn đáng tiếp tục nhất hiện tại.</CardDescription>
        </CardHeader>
        <CardContent>
          {novelQuery.isPending ? (
            <div className="space-y-4">
              <div className="h-6 w-48 animate-pulse rounded bg-muted" />
              <div className="h-5 w-full animate-pulse rounded bg-muted" />
              <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
              <div className="flex gap-2">
                <div className="h-10 w-36 animate-pulse rounded bg-muted" />
                <div className="h-10 w-28 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ) : novelQuery.isError ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Hiện không đọc được danh sách dự án, nên trang chủ chưa thể gợi ý bước tiếp theo cho bạn.
              </div>
              <Button onClick={() => void novelQuery.refetch()}>Tải lại dự án</Button>
            </div>
          ) : primaryNovel ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-3">
                  <div>
                    <div className="text-2xl font-semibold">{primaryNovel.title}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {primaryNovel.latestAutoDirectorTask ? (
                        <>
                          {(() => {
                            const workflowBadge = getWorkflowBadge(primaryNovel.latestAutoDirectorTask);
                            return workflowBadge ? (
                              <Badge variant={workflowBadge.variant}>
                                {workflowBadge.label}
                              </Badge>
                            ) : null;
                          })()}
                          <Badge variant="outline">
                            Tiến độ {Math.round((primaryNovel.latestAutoDirectorTask.progress ?? 0) * 100)}%
                          </Badge>
                        </>
                      ) : null}
                      <Badge variant={primaryNovel.status === "published" ? "default" : "secondary"}>
                        {primaryNovel.status === "published" ? "Đã phát hành" : "Bản nháp"}
                      </Badge>
                      <Badge variant="outline">
                        {primaryNovel.writingMode === "continuation" ? "Viết tiếp" : "Nguyên tác"}
                      </Badge>
                    </div>
                  </div>
                  <div className="max-w-3xl text-sm text-muted-foreground">
                    {getNovelLeadSummary(primaryNovel)}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Cập nhật: {formatDate(primaryNovel.updatedAt)}</span>
                    <span>Số chương: {primaryNovel._count.chapters}</span>
                    <span>Số nhân vật: {primaryNovel._count.characters}</span>
                    {primaryNovel.latestAutoDirectorTask?.currentStage ? (
                      <span>Giai đoạn hiện tại: {primaryNovel.latestAutoDirectorTask.currentStage}</span>
                    ) : null}
                    {primaryNovel.latestAutoDirectorTask?.lastHealthyStage ? (
                      <span>Giai đoạn ổn định gần nhất: {primaryNovel.latestAutoDirectorTask.lastHealthyStage}</span>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {renderNovelPrimaryAction(primaryNovel, { size: "lg" })}
                  {primaryNovel.latestAutoDirectorTask ? (
                    <Button asChild size="lg" variant="outline">
                      <Link to={getTaskCenterLink(primaryNovel.latestAutoDirectorTask.id)}>Trung tâm tác vụ</Link>
                    </Button>
                  ) : (
                    <Button asChild size="lg" variant="outline">
                      <Link to={`/novels/${primaryNovel.id}/edit`}>Mở dự án</Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Bạn vẫn chưa bắt đầu dự án tiểu thuyết nào. Lần đầu sử dụng, mình khuyên đi thẳng bằng AI tự động đạo diễn, hệ thống sẽ giúp bạn dựng hướng đi và chuẩn bị mở viết.
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link to={DIRECTOR_CREATE_LINK}>Mở sách bằng AI tự động đạo diễn</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to={MANUAL_CREATE_LINK}>Tạo tiểu thuyết thủ công</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thao tác nhanh</CardTitle>
          <CardDescription>Đặt chung các lối vào hay dùng và cách mở sách dễ nhất cho người mới.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to={DIRECTOR_CREATE_LINK}>Mở sách bằng AI tự động đạo diễn</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={MANUAL_CREATE_LINK}>Tạo tiểu thuyết thủ công</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/book-analysis">Tạo phân tích sách mới</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/tasks">Mở trung tâm tác vụ</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dự án gần đây</CardTitle>
          <CardDescription>Ở đây không chỉ hiện tiêu đề, mà còn hiện luôn giai đoạn hiện tại và lối quay lại.</CardDescription>
        </CardHeader>
        <CardContent>
          {novelQuery.isPending ? (
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`home-loading-${index}`} className="space-y-3 rounded-xl border p-4">
                  <div className="h-6 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  <div className="h-20 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : novelQuery.isError ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Hiện không tải được dự án gần đây, bạn có thể thử lại sau.
              </div>
              <Button variant="outline" onClick={() => void novelQuery.refetch()}>Tải lại</Button>
            </div>
          ) : recentNovels.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Chưa có dự án tiểu thuyết nào, hãy bắt đầu bằng “Tạo tiểu thuyết mới”.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {recentNovels.map((novel) => {
                const workflowTask = novel.latestAutoDirectorTask ?? null;
                const workflowBadge = getWorkflowBadge(workflowTask);

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
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-2">
                          <CardTitle className="line-clamp-1 text-lg">{novel.title}</CardTitle>
                          <div className="flex flex-wrap items-center gap-2">
                            {workflowBadge ? (
                              <Badge variant={workflowBadge.variant}>{workflowBadge.label}</Badge>
                            ) : (
                              <Badge variant="outline">Không có tác vụ tự động đạo diễn</Badge>
                            )}
                            {workflowTask ? (
                              <Badge variant="outline">Tiến độ {Math.round(workflowTask.progress * 100)}%</Badge>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Badge variant={novel.status === "published" ? "default" : "secondary"}>
                            {novel.status === "published" ? "Đã phát hành" : "Bản nháp"}
                          </Badge>
                          <Badge variant="outline">
                            {novel.writingMode === "continuation" ? "Viết tiếp" : "Nguyên tác"}
                          </Badge>
                        </div>
                      </div>
                      <CardDescription className="line-clamp-3">
                        {getNovelLeadSummary(novel)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Cập nhật: {formatDate(novel.updatedAt)}</span>
                        <span>Số chương: {novel._count.chapters}</span>
                        <span>Số nhân vật: {novel._count.characters}</span>
                        {workflowTask?.currentStage ? (
                          <span>Giai đoạn: {workflowTask.currentStage}</span>
                        ) : null}
                        {workflowTask?.lastHealthyStage ? (
                          <span>Giai đoạn ổn định gần nhất: {workflowTask.lastHealthyStage}</span>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {renderNovelPrimaryAction(novel, { stopPropagation: true })}
                        {workflowTask ? (
                          <Button asChild size="sm" variant="outline">
                            <Link to={getTaskCenterLink(workflowTask.id)} onClick={stopCardClick}>Trung tâm tác vụ</Link>
                          </Button>
                        ) : (
                          <Button asChild size="sm" variant="outline">
                            <Link to={`/novels/${novel.id}/edit`} onClick={stopCardClick}>Mở dự án</Link>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
