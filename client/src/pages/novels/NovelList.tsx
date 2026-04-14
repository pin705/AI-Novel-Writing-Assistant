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
import { useI18n } from "@/i18n";
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

function formatProgressStatus(
  status: ProjectProgressStatus | null | undefined,
  labels: {
    completed: string;
    inProgress: string;
    rework: string;
    blocked: string;
    notStarted: string;
  },
): string {
  if (status === "completed") {
    return labels.completed;
  }
  if (status === "in_progress") {
    return labels.inProgress;
  }
  if (status === "rework") {
    return labels.rework;
  }
  if (status === "blocked") {
    return labels.blocked;
  }
  return labels.notStarted;
}

function formatTokenCount(locale: string, value?: number | null): string {
  const normalized = typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : 0;
  return new Intl.NumberFormat(locale).format(normalized);
}

export default function NovelList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { locale, t } = useI18n();
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
      toast.success(t("novels.delete.success"));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("novels.delete.failure"));
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
      toast.success(t("novels.export.success"));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("novels.export.failure"));
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
      toast.success(input.mode === "auto_execute_front10"
        ? t("workflow.toast.continueFront10.success")
        : t("workflow.toast.continueDirector.success"));
    },
    onError: (error, input) => {
      toast.error(
        error instanceof Error
          ? error.message
          : input.mode === "auto_execute_front10"
            ? t("workflow.toast.continueFront10.failure")
            : t("workflow.toast.continueDirector.failure"),
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
    const confirmed = window.confirm(t("novels.delete.confirm", { title }));
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
              {t("novels.filter.all")}
            </Button>
            <Button
              variant={status === "draft" ? "default" : "secondary"}
              onClick={() => setStatus("draft")}
            >
              {t("novels.filter.draft")}
            </Button>
            <Button
              variant={status === "published" ? "default" : "secondary"}
              onClick={() => setStatus("published")}
            >
              {t("novels.filter.published")}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={writingMode === "all" ? "default" : "secondary"}
              onClick={() => setWritingMode("all")}
            >
              {t("novels.filter.writingModeAll")}
            </Button>
            <Button
              size="sm"
              variant={writingMode === "original" ? "default" : "secondary"}
              onClick={() => setWritingMode("original")}
            >
              {t("common.original")}
            </Button>
            <Button
              size="sm"
              variant={writingMode === "continuation" ? "default" : "secondary"}
              onClick={() => setWritingMode("continuation")}
            >
              {t("common.continuation")}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link to={DIRECTOR_CREATE_LINK}>{t("home.action.autoDirector")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={MANUAL_CREATE_LINK}>{t("home.action.manualCreate")}</Link>
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
            <CardTitle>{t("novels.loadError.title")}</CardTitle>
            <CardDescription>{t("novels.loadError.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void novelListQuery.refetch()}>{t("common.reload")}</Button>
          </CardContent>
        </Card>
      ) : novels.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{allNovels.length === 0 ? t("novels.empty.none.title") : t("novels.empty.filtered.title")}</CardTitle>
            <CardDescription>
              {allNovels.length === 0
                ? t("novels.empty.none.description")
                : t("novels.empty.filtered.description")}
            </CardDescription>
          </CardHeader>
          {allNovels.length === 0 ? (
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to={DIRECTOR_CREATE_LINK}>{t("home.action.autoDirector")}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={MANUAL_CREATE_LINK}>{t("home.action.manualCreate")}</Link>
              </Button>
            </CardContent>
          ) : null}
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {novels.map((novel) => {
            const workflowTask = novel.latestAutoDirectorTask ?? null;
            const workflowBadge = getWorkflowBadge(t, workflowTask);
            const workflowDescription = getWorkflowDescription(t, workflowTask);
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
                        {novel.status === "published" ? t("common.published") : t("common.draft")}
                      </Badge>
                      {novel.writingMode === "continuation" ? (
                        <Badge variant="outline">{t("common.continuation")}</Badge>
                      ) : (
                        <Badge variant="outline">{t("common.original")}</Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {novel.description || t("novels.noSummary")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    {t("novels.stats.summary", {
                      chapters: novel._count.chapters,
                      characters: novel._count.characters,
                      tokens: formatTokenCount(locale, novel.tokenUsage?.totalTokens),
                    })}
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
                        <Badge variant="outline">{t("common.progress", { value: Math.round(workflowTask.progress * 100) })}</Badge>
                        {isWorkflowRunning ? (
                          <Badge variant="outline">{t("common.backgroundRunning")}</Badge>
                        ) : null}
                      </div>
                      {workflowDescription ? (
                        <div className="mt-2 text-sm text-muted-foreground">{workflowDescription}</div>
                      ) : null}
                      {isWorkflowRunning ? (
                        <NovelWorkflowRunningIndicator
                          className="mt-3"
                          progress={workflowTask.progress}
                          label={workflowTask.currentItemLabel?.trim() || t("workflow.running.default")}
                        />
                      ) : null}
                      <div className="mt-2 text-xs text-muted-foreground">
                        {t("novels.progress.currentStage", {
                          value: workflowTask.currentStage ?? t("workflow.checkpoint.default"),
                        })}
                        {workflowTask.currentItemLabel ? ` · ${workflowTask.currentItemLabel}` : ""}
                      </div>
                      {workflowTask.lastHealthyStage ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {t("novels.progress.lastHealthyStage", { value: workflowTask.lastHealthyStage })}
                        </div>
                      ) : null}
                      {workflowTask.resumeAction ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {t("novels.progress.resumeAction", { value: workflowTask.resumeAction })}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed bg-muted/10 p-3 text-xs text-muted-foreground">
                      {t("novels.noWorkflowTask")}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{t("novels.progress.project", {
                      value: formatProgressStatus(novel.projectStatus, {
                        completed: t("common.progressStatus.completed"),
                        inProgress: t("common.progressStatus.inProgress"),
                        rework: t("common.progressStatus.rework"),
                        blocked: t("common.progressStatus.blocked"),
                        notStarted: t("common.progressStatus.notStarted"),
                      }),
                    })}</span>
                    <span>{t("novels.progress.storyline", {
                      value: formatProgressStatus(novel.storylineStatus, {
                        completed: t("common.progressStatus.completed"),
                        inProgress: t("common.progressStatus.inProgress"),
                        rework: t("common.progressStatus.rework"),
                        blocked: t("common.progressStatus.blocked"),
                        notStarted: t("common.progressStatus.notStarted"),
                      }),
                    })}</span>
                    <span>{t("novels.progress.outline", {
                      value: formatProgressStatus(novel.outlineStatus, {
                        completed: t("common.progressStatus.completed"),
                        inProgress: t("common.progressStatus.inProgress"),
                        rework: t("common.progressStatus.rework"),
                        blocked: t("common.progressStatus.blocked"),
                        notStarted: t("common.progressStatus.notStarted"),
                      }),
                    })}</span>
                    <span>{t("novels.progress.resource", { value: novel.resourceReadyScore ?? 0 })}</span>
                  </div>

                  {novel.world ? (
                    <div className="text-xs text-muted-foreground">
                      {t("novels.progress.world", { value: novel.world.name })}
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
                        {isWorkflowPending ? t("workflow.action.continueExecuting") : (workflowTask?.resumeAction ?? t("workflow.action.continueFront10"))}
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
                        {isWorkflowPending ? t("workflow.action.continuing") : (workflowTask?.resumeAction ?? t("workflow.action.continueDirector"))}
                      </Button>
                    ) : requiresCandidateSelection(workflowTask) ? (
                      <Button asChild size="sm">
                        <Link to={getCandidateSelectionLink(workflowTask!.id)} onClick={stopCardClick}>
                          {workflowTask!.resumeAction ?? t("workflow.action.confirmDirection")}
                        </Link>
                      </Button>
                    ) : canEnterChapterExecution(workflowTask) ? (
                      <Button asChild size="sm">
                        <Link to={`/novels/${novel.id}/edit`} onClick={stopCardClick}>{t("common.enterChapterExecution")}</Link>
                      </Button>
                    ) : workflowTask ? (
                      <Button asChild size="sm">
                        <Link to={getTaskCenterLink(workflowTask.id)} onClick={stopCardClick}>{t("common.viewTask")}</Link>
                      </Button>
                    ) : null}

                    {workflowTask ? (
                      <Button asChild size="sm" variant="outline">
                        <Link to={getTaskCenterLink(workflowTask.id)} onClick={stopCardClick}>{t("common.taskCenter")}</Link>
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
                      {isDownloadPending ? t("common.exporting") : t("common.export")}
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
                      {isDeletePending ? t("common.deleting") : t("common.delete")}
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
