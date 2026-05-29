import type { KeyboardEvent, MouseEvent } from "react";
import { useMemo, useState } from "react";
import type { ProjectProgressStatus } from "@ai-novel/shared/types/novel";
import type { DirectorContinuationMode } from "@ai-novel/shared/types/novelDirector";
import type {
  DirectorBookAutomationAction,
  DirectorBookAutomationProjection,
} from "@ai-novel/shared/types/directorRuntime";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Gauge, RotateCcw } from "lucide-react";
import { getDirectorBookAutomationProjection } from "@/api/novelDirector";
import { continueNovelWorkflow } from "@/api/novelWorkflow";
import { deleteNovel, downloadNovelExport, getNovelList } from "@/api/novel";
import { queryKeys } from "@/api/queryKeys";
import AICockpit from "@/components/autoDirector/AICockpit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AppDialogContent,
  Dialog,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  canContinueDirector,
  canContinueChapterBatchAutoExecution,
  canEnterChapterExecution,
  getCandidateSelectionLink,
  getWorkflowBadge,
  getWorkflowDescription,
  isWorkflowRunningInBackground,
  requiresCandidateSelection,
} from "@/lib/novelWorkflowTaskUi";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/i18n";
import { resolveWorkflowContinuationFeedback } from "@/lib/novelWorkflowContinuation";
import {
  getDirectorCockpitActionHref,
  getDirectorCockpitContinuationMode,
  isDirectorCockpitContinuationAction,
} from "@/lib/directorCockpitActions";
import { useTaskRecovery } from "@/components/layout/TaskRecoveryContext";
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

function formatTokenCount(value?: number | null): string {
  const normalized = typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : 0;
  return new Intl.NumberFormat("zh-CN").format(normalized);
}

export default function NovelList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [writingMode, setWritingMode] = useState<WritingModeFilter>("all");
  const [cockpitNovelId, setCockpitNovelId] = useState<string | null>(null);
  const { candidateCount: recoveryCandidateCount, openDialog: openRecoveryDialog } = useTaskRecovery();

  const formatProgressStatus = (statusValue?: ProjectProgressStatus | null): string => {
    if (statusValue === "completed") {
      return t("novels.progressStatus.completed");
    }
    if (statusValue === "in_progress") {
      return t("novels.progressStatus.inProgress");
    }
    if (statusValue === "rework") {
      return t("novels.progressStatus.rework");
    }
    if (statusValue === "blocked") {
      return t("novels.progressStatus.blocked");
    }
    return t("novels.progressStatus.notStarted");
  };

  const novelListQuery = useQuery({
    queryKey: queryKeys.novels.list(1, 100),
    queryFn: () => getNovelList({ page: 1, limit: 100 }),
    staleTime: 30_000,
    refetchInterval: (query) => {
      const items = query.state.data?.data?.items ?? [];
      return items.some((novel) => {
        const task = novel.latestAutoDirectorTask;
        return task?.status === "queued" || task?.status === "running" || task?.status === "waiting_approval";
      })
        ? 4000
        : false;
    },
  });

  const cockpitProjectionQuery = useQuery({
    queryKey: cockpitNovelId
      ? queryKeys.novels.directorBookAutomation(cockpitNovelId)
      : ["novels", "director-book-automation", "idle"],
    queryFn: () => getDirectorBookAutomationProjection(cockpitNovelId ?? ""),
    enabled: Boolean(cockpitNovelId),
    staleTime: 10_000,
    refetchInterval: (query) => {
      return query.state.data?.data?.projection.displayState === "processing" ? 4000 : false;
    },
  });

  const deleteNovelMutation = useMutation({
    mutationFn: (id: string) => deleteNovel(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.novels.all });
      toast.success(t("novels.list.deleteSuccess"));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("novels.list.deleteFailed"));
    },
  });

  const downloadNovelMutation = useMutation({
    mutationFn: (input: { novelId: string; novelTitle: string }) => downloadNovelExport(
      input.novelId,
      "txt",
      "full",
      input.novelTitle,
    ),
    onSuccess: ({ blob, fileName }) => {
      createDownload(blob, fileName);
      toast.success(t("novels.list.exportStarted"));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("novels.list.exportFailed"));
    },
  });

  const continueWorkflowMutation = useMutation({
    mutationFn: async (input: {
      taskId: string;
      mode?: DirectorContinuationMode;
    }) => continueNovelWorkflow(input.taskId, input.mode ? { continuationMode: input.mode } : undefined),
    onSuccess: async (response, input) => {
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: queryKeys.novels.all }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      ];
      if (cockpitNovelId) {
        invalidations.push(
          queryClient.invalidateQueries({ queryKey: queryKeys.novels.directorBookAutomation(cockpitNovelId) }),
        );
      }
      await Promise.all(invalidations);
      const feedback = resolveWorkflowContinuationFeedback(response.data, {
        mode: input.mode,
      });
      if (feedback.tone === "error") {
        toast.error(feedback.message);
        return;
      }
      toast.success(feedback.message);
    },
    onError: (error, input) => {
      toast.error(
        error instanceof Error
          ? error.message
          : input.mode === "auto_execute_range"
            ? t("novels.actions.continueAutoExecuteFailed")
            : t("novels.actions.continueDirectorFailed"),
      );
    },
  });

  const allNovels = novelListQuery.data?.data?.items ?? [];
  const selectedCockpitNovel = allNovels.find((item) => item.id === cockpitNovelId) ?? null;
  const cockpitProjection = cockpitProjectionQuery.data?.data?.projection ?? null;

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
    const confirmed = window.confirm(t("novels.list.confirmDelete", { title }));
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

  const handleCockpitAction = (
    projection: DirectorBookAutomationProjection,
    action: DirectorBookAutomationAction,
  ) => {
    const taskId = action.commandPayload?.taskId ?? action.target.taskId ?? projection.latestTask?.id;
    if (taskId && isDirectorCockpitContinuationAction(action)) {
      continueWorkflowMutation.mutate({
        taskId,
        mode: getDirectorCockpitContinuationMode(action),
      });
      return;
    }
    setCockpitNovelId(null);
    navigate(getDirectorCockpitActionHref(projection, action));
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
              {t("novels.filters.all")}
            </Button>
            <Button
              variant={status === "draft" ? "default" : "secondary"}
              onClick={() => setStatus("draft")}
            >
              {t("novels.filters.draft")}
            </Button>
            <Button
              variant={status === "published" ? "default" : "secondary"}
              onClick={() => setStatus("published")}
            >
              {t("novels.filters.published")}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={writingMode === "all" ? "default" : "secondary"}
              onClick={() => setWritingMode("all")}
            >
              {t("novels.filters.writingModeAll")}
            </Button>
            <Button
              size="sm"
              variant={writingMode === "original" ? "default" : "secondary"}
              onClick={() => setWritingMode("original")}
            >
              {t("novels.filters.original")}
            </Button>
            <Button
              size="sm"
              variant={writingMode === "continuation" ? "default" : "secondary"}
              onClick={() => setWritingMode("continuation")}
            >
              {t("novels.filters.continuation")}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {recoveryCandidateCount > 0 ? (
            <Button variant="outline" onClick={openRecoveryDialog}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {t("novels.actions.recoveryPending")}
              <Badge variant="secondary">{recoveryCandidateCount}</Badge>
            </Button>
          ) : null}
          <Button asChild>
            <Link to={DIRECTOR_CREATE_LINK}>{t("novels.actions.directorCreate")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={MANUAL_CREATE_LINK}>{t("novels.actions.manualCreate")}</Link>
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
            <CardTitle>{t("novels.list.loadErrorTitle")}</CardTitle>
            <CardDescription>{t("novels.list.loadErrorDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void novelListQuery.refetch()}>{t("novels.actions.reload")}</Button>
          </CardContent>
        </Card>
      ) : novels.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{allNovels.length === 0 ? t("novels.list.emptyTitle") : t("novels.list.emptyFilteredTitle")}</CardTitle>
            <CardDescription>
              {allNovels.length === 0
                ? t("novels.list.emptyDescription")
                : t("novels.list.emptyFilteredDescription")}
            </CardDescription>
          </CardHeader>
          {allNovels.length === 0 ? (
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to={DIRECTOR_CREATE_LINK}>{t("novels.actions.directorCreate")}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={MANUAL_CREATE_LINK}>{t("novels.actions.manualCreate")}</Link>
              </Button>
            </CardContent>
          ) : null}
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {novels.map((novel) => {
            const workflowTask = novel.latestAutoDirectorTask ?? null;
            const workflowCurrentAction = workflowTask?.currentItemLabel?.trim() || "";
            const workflowBadge = getWorkflowBadge(workflowTask, t);
            const workflowDescription = getWorkflowDescription(workflowTask, t);
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
                    {novel.description || t("novels.common.noIntro")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    {t("novels.common.stats", {
                      chapters: novel._count.chapters,
                      characters: novel._count.characters,
                      tokens: formatTokenCount(novel.tokenUsage?.totalTokens),
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
                        <Badge variant="outline">{t("novels.common.progress", { percent: Math.round(workflowTask.progress * 100) })}</Badge>
                        {isWorkflowRunning ? (
                          <Badge variant="outline">{t("novels.common.backgroundRunning")}</Badge>
                        ) : null}
                      </div>
                      {workflowDescription ? (
                        <div className="mt-2 text-sm text-muted-foreground">{workflowDescription}</div>
                      ) : null}
                      {isWorkflowRunning ? (
                        <NovelWorkflowRunningIndicator
                          className="mt-3"
                          progress={workflowTask.progress}
                          label={workflowCurrentAction || t("novels.common.autoDirectorRunning")}
                        />
                      ) : null}
                      <div className="mt-2 text-xs text-muted-foreground">
                        {t("novels.common.currentStageWithAction", {
                          stage: workflowTask.currentStage ?? t("novels.common.directorStageDefault"),
                          action: workflowCurrentAction ? ` · ${workflowCurrentAction}` : "",
                        })}
                      </div>
                      {workflowTask.lastHealthyStage ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {t("novels.common.lastHealthyStage", { stage: workflowTask.lastHealthyStage })}
                        </div>
                      ) : null}
                      {workflowTask.resumeAction ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {t("novels.common.suggestedContinue", { action: workflowTask.resumeAction })}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed bg-muted/10 p-3 text-xs text-muted-foreground">
                      {t("novels.common.noAutoDirectorTask")}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{t("novels.common.project", { value: formatProgressStatus(novel.projectStatus) })}</span>
                    <span>{t("novels.common.storyline", { value: formatProgressStatus(novel.storylineStatus) })}</span>
                    <span>{t("novels.common.outline", { value: formatProgressStatus(novel.outlineStatus) })}</span>
                    <span>{t("novels.common.resource", { value: `${novel.resourceReadyScore ?? 0}/100` })}</span>
                  </div>

                  {novel.world ? (
                    <div className="text-xs text-muted-foreground">
                      {t("novels.common.world", { name: novel.world.name })}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(event) => {
                        stopCardClick(event);
                        setCockpitNovelId(novel.id);
                      }}
                    >
                      <Gauge className="h-4 w-4" aria-hidden="true" />
                      {t("novels.actions.aiCockpit")}
                    </Button>

                    {canContinueChapterBatchAutoExecution(workflowTask) ? (
                      <Button
                        size="sm"
                        onClick={(event) => {
                          stopCardClick(event);
                          if (!workflowTask) {
                            return;
                          }
                          continueWorkflowMutation.mutate({
                            taskId: workflowTask.id,
                            mode: "auto_execute_range",
                          });
                        }}
                        disabled={isWorkflowPending}
                      >
                        {isWorkflowPending
                          ? t("novels.actions.continueExecuting")
                          : (workflowTask?.resumeAction ?? t("novels.actions.continueAutoExecute", { scope: workflowTask?.executionScopeLabel ?? t("novels.actions.defaultScope") }))}
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
                        {isWorkflowPending ? t("novels.actions.continuing") : (workflowTask?.resumeAction ?? t("novels.actions.continueDirector"))}
                      </Button>
                    ) : requiresCandidateSelection(workflowTask) ? (
                      <Button asChild size="sm">
                        <Link to={getCandidateSelectionLink(workflowTask!.id)} onClick={stopCardClick}>
                          {workflowTask!.resumeAction ?? t("novels.actions.confirmDirection")}
                        </Link>
                      </Button>
                    ) : canEnterChapterExecution(workflowTask) ? (
                      <Button asChild size="sm">
                        <Link to={`/novels/${novel.id}/edit`} onClick={stopCardClick}>{t("novels.actions.enterChapterExecution")}</Link>
                      </Button>
                    ) : workflowTask ? (
                      <Button asChild size="sm">
                        <Link to={`/novels/${novel.id}/edit?directorTaskId=${workflowTask.id}`} onClick={stopCardClick}>{t("novels.actions.viewProgress")}</Link>
                      </Button>
                    ) : null}

                    {workflowTask ? (
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/novels/${novel.id}/edit?directorTaskId=${workflowTask.id}&taskPanel=1`} onClick={stopCardClick}>{t("novels.actions.executionDetails")}</Link>
                      </Button>
                    ) : null}

                    <Button asChild size="sm" variant="outline">
                      <Link to={`/novels/${novel.id}/preview`} onClick={stopCardClick}>
                        <BookOpen className="h-4 w-4" aria-hidden="true" />
                        {t("novels.actions.preview")}
                      </Link>
                    </Button>

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
                      {isDownloadPending ? t("novels.actions.exporting") : t("novels.actions.export")}
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
                      {isDeletePending ? t("novels.actions.deleting") : t("novels.actions.delete")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={Boolean(cockpitNovelId)}
        onOpenChange={(open) => {
          if (!open) {
            setCockpitNovelId(null);
          }
        }}
      >
        <AppDialogContent
          className="max-w-2xl"
          title={t("novels.list.cockpitTitle")}
          description={
            selectedCockpitNovel?.title
              ? t("novels.list.cockpitDescription", { title: selectedCockpitNovel.title })
              : t("novels.list.cockpitDescriptionGeneric")
          }
        >
          {cockpitProjectionQuery.isPending ? (
            <div className="rounded-lg border p-3 text-sm text-muted-foreground">
              {t("novels.list.cockpitLoading")}
            </div>
          ) : cockpitProjectionQuery.isError ? (
            <div className="rounded-lg border p-3">
              <div className="text-sm text-muted-foreground">{t("novels.list.cockpitError")}</div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => void cockpitProjectionQuery.refetch()}
              >
                {t("novels.actions.reread")}
              </Button>
            </div>
          ) : cockpitProjection ? (
            <AICockpit
              projection={cockpitProjection}
              mode="focusedNovel"
              isActionPending={continueWorkflowMutation.isPending}
              onAction={handleCockpitAction}
              onOpenNovel={(projection) => {
                setCockpitNovelId(null);
                navigate(projection.focusNovel.href);
              }}
            />
          ) : (
            <AICockpit fallbackSummary={t("novels.list.cockpitFallback")} />
          )}
        </AppDialogContent>
      </Dialog>
    </div>
  );
}
