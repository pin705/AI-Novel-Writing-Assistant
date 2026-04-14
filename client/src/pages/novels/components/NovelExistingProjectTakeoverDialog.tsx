import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { normalizeCommercialTags } from "@ai-novel/shared/types/novelFraming";
import type {
  DirectorAutoExecutionPlan,
  DirectorRunMode,
  DirectorTakeoverStartPhase,
} from "@ai-novel/shared/types/novelDirector";
import { getDirectorTakeoverReadiness, startDirectorTakeover } from "@/api/novelDirector";
import { queryKeys } from "@/api/queryKeys";
import LLMSelector from "@/components/common/LLMSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { useI18n, type TranslateFn } from "@/i18n";
import { useLLMStore } from "@/store/llmStore";
import type { NovelBasicFormState } from "../novelBasicInfo.shared";
import {
  DirectorAutoExecutionPlanFields,
  buildDirectorAutoExecutionPlanFromDraft,
  buildDirectorAutoExecutionPlanLabel,
  createDefaultDirectorAutoExecutionDraftState,
} from "./directorAutoExecutionPlan.shared";

interface NovelExistingProjectTakeoverDialogProps {
  novelId: string;
  basicForm: NovelBasicFormState;
  genreOptions: Array<{ id: string; path: string; label: string }>;
  storyModeOptions: Array<{ id: string; path: string; name: string }>;
  worldOptions: Array<{ id: string; name: string }>;
}

const DEFAULT_VISIBLE_RUN_MODE: DirectorRunMode = "auto_to_ready";

function summarizeCurrentContext(
  basicForm: NovelBasicFormState,
  genreOptions: Array<{ id: string; path: string; label: string }>,
  storyModeOptions: Array<{ id: string; path: string; name: string }>,
  worldOptions: Array<{ id: string; name: string }>,
  t: TranslateFn,
): string[] {
  const commercialTags = normalizeCommercialTags(basicForm.commercialTagsText);
  const genrePath = genreOptions.find((item) => item.id === basicForm.genreId)?.path ?? basicForm.genreId;
  const primaryStoryModePath = storyModeOptions.find((item) => item.id === basicForm.primaryStoryModeId)?.path
    ?? basicForm.primaryStoryModeId;
  const secondaryStoryModePath = storyModeOptions.find((item) => item.id === basicForm.secondaryStoryModeId)?.path
    ?? basicForm.secondaryStoryModeId;
  const worldName = worldOptions.find((item) => item.id === basicForm.worldId)?.name ?? basicForm.worldId;
  return [
    basicForm.description.trim() ? t("novelTakeover.context.description", { value: basicForm.description.trim() }) : "",
    basicForm.targetAudience.trim() ? t("novelTakeover.context.targetAudience", { value: basicForm.targetAudience.trim() }) : "",
    basicForm.bookSellingPoint.trim() ? t("novelTakeover.context.bookSellingPoint", { value: basicForm.bookSellingPoint.trim() }) : "",
    basicForm.competingFeel.trim() ? t("novelTakeover.context.competingFeel", { value: basicForm.competingFeel.trim() }) : "",
    basicForm.first30ChapterPromise.trim() ? t("novelTakeover.context.first30ChapterPromise", { value: basicForm.first30ChapterPromise.trim() }) : "",
    commercialTags.length > 0 ? t("novelTakeover.context.commercialTags", { value: commercialTags.join(" / ") }) : "",
    genrePath ? t("novelTakeover.context.genre", { value: genrePath }) : "",
    primaryStoryModePath ? t("novelTakeover.context.primaryStoryMode", { value: primaryStoryModePath }) : "",
    secondaryStoryModePath ? t("novelTakeover.context.secondaryStoryMode", { value: secondaryStoryModePath }) : "",
    worldName ? t("novelTakeover.context.world", { value: worldName }) : "",
    t("novelTakeover.context.estimatedChapters", { value: basicForm.estimatedChapterCount }),
  ].filter(Boolean);
}

function buildEditRoute(input: {
  novelId: string;
  workflowTaskId: string;
  stage?: string | null;
  chapterId?: string | null;
  volumeId?: string | null;
}): string {
  const search = new URLSearchParams();
  search.set("taskId", input.workflowTaskId);
  if (input.stage) {
    search.set("stage", input.stage);
  }
  if (input.chapterId) {
    search.set("chapterId", input.chapterId);
  }
  if (input.volumeId) {
    search.set("volumeId", input.volumeId);
  }
  return `/novels/${input.novelId}/edit?${search.toString()}`;
}

export default function NovelExistingProjectTakeoverDialog({
  novelId,
  basicForm,
  genreOptions,
  storyModeOptions,
  worldOptions,
}: NovelExistingProjectTakeoverDialogProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const llm = useLLMStore();
  const [open, setOpen] = useState(false);
  const [runMode, setRunMode] = useState<DirectorRunMode>(DEFAULT_VISIBLE_RUN_MODE);
  const [selectedPhase, setSelectedPhase] = useState<DirectorTakeoverStartPhase>("story_macro");
  const [autoExecutionDraft, setAutoExecutionDraft] = useState(() => createDefaultDirectorAutoExecutionDraftState());

  const readinessQuery = useQuery({
    queryKey: queryKeys.novels.autoDirectorTakeoverReadiness(novelId),
    queryFn: () => getDirectorTakeoverReadiness(novelId),
    enabled: open && Boolean(novelId),
    retry: false,
  });

  const readiness = readinessQuery.data?.data ?? null;
  const contextLines = useMemo(
    () => summarizeCurrentContext(basicForm, genreOptions, storyModeOptions, worldOptions, t),
    [basicForm, genreOptions, storyModeOptions, worldOptions, t],
  );
  const runModeOptions: Array<{
    value: DirectorRunMode;
    label: string;
    description: string;
  }> = [
    {
      value: "auto_to_ready",
      label: t("novelCreate.autoDirector.runMode.autoToReady.label"),
      description: t("novelCreate.autoDirector.runMode.autoToReady.description"),
    },
    {
      value: "auto_to_execution",
      label: t("novelCreate.autoDirector.runMode.autoToExecution.label"),
      description: t("novelCreate.autoDirector.runMode.autoToExecution.description"),
    },
  ];
  const selectedStage = readiness?.stages.find((item) => item.phase === selectedPhase) ?? null;
  const autoExecutionPlan: DirectorAutoExecutionPlan | undefined = runMode === "auto_to_execution"
    ? buildDirectorAutoExecutionPlanFromDraft(autoExecutionDraft)
    : undefined;

  useEffect(() => {
    if (!readiness) {
      return;
    }
    const recommended = readiness.stages.find((item) => item.recommended && item.available);
    if (recommended) {
      setSelectedPhase((current) => {
        const currentStage = readiness.stages.find((item) => item.phase === current);
        return currentStage?.available ? current : recommended.phase;
      });
      return;
    }
    const firstAvailable = readiness.stages.find((item) => item.available);
    if (firstAvailable) {
      setSelectedPhase(firstAvailable.phase);
    }
  }, [readiness]);

  const startMutation = useMutation({
    mutationFn: async () => startDirectorTakeover({
      novelId,
      startPhase: selectedPhase,
      provider: llm.provider,
      model: llm.model,
      temperature: llm.temperature,
      runMode,
      autoExecutionPlan,
    }),
    onSuccess: async (response) => {
      const data = response.data;
      if (!data?.workflowTaskId) {
        toast.error(t("novelTakeover.toast.noTask"));
        return;
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.novels.autoDirectorTask(novelId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.novels.autoDirectorTakeoverReadiness(novelId) });
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setOpen(false);
      toast.success(
        runMode === "stage_review"
          ? t("novelTakeover.toast.stageReviewSuccess")
          : runMode === "auto_to_execution"
            ? t("novelTakeover.toast.autoExecutionSuccess", { value: buildDirectorAutoExecutionPlanLabel(autoExecutionPlan, t) })
            : t("novelTakeover.toast.autoToReadySuccess"),
      );
      navigate(buildEditRoute({
        novelId,
        workflowTaskId: data.workflowTaskId,
        stage: data.resumeTarget?.stage ?? "story_macro",
        chapterId: data.resumeTarget?.chapterId ?? null,
        volumeId: data.resumeTarget?.volumeId ?? null,
      }));
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : t("novelTakeover.toast.failure");
      toast.error(message);
    },
  });

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        {t("novelTakeover.trigger")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[min(90vh,860px)] w-[calc(100vw-1.5rem)] max-w-4xl flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-6 pb-4 pr-12 pt-6">
            <DialogTitle>{t("novelTakeover.title")}</DialogTitle>
            <DialogDescription>{t("novelTakeover.description")}</DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-4">
            <div className="space-y-4">
            <div className="rounded-xl border bg-muted/15 p-4">
              <div className="text-sm font-medium text-foreground">{t("novelTakeover.context.title")}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {contextLines.length > 0 ? contextLines.map((line) => (
                  <Badge key={line} variant="secondary">{line}</Badge>
                )) : (
                  <span className="text-sm text-muted-foreground">
                    {t("novelTakeover.context.empty")}
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-xl border bg-background/80 p-4">
              <div className="text-sm font-medium text-foreground">{t("novelTakeover.modelSettings")}</div>
              <div className="mt-3">
                <LLMSelector />
              </div>
            </div>

            <div className="rounded-xl border bg-background/80 p-4">
              <div className="text-sm font-medium text-foreground">{t("novelTakeover.runMode.title")}</div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {runModeOptions.map((option) => {
                  const active = option.value === runMode;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`rounded-xl border px-3 py-3 text-left transition ${
                        active
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border bg-background hover:border-primary/40"
                      }`}
                      onClick={() => setRunMode(option.value)}
                    >
                      <div className="text-sm font-medium text-foreground">{option.label}</div>
                      <div className="mt-1 text-xs leading-5 text-muted-foreground">{option.description}</div>
                    </button>
                  );
                })}
              </div>
              {runMode === "auto_to_execution" ? (
                <DirectorAutoExecutionPlanFields
                  draft={autoExecutionDraft}
                  onChange={(patch) => setAutoExecutionDraft((prev) => ({ ...prev, ...patch }))}
                />
              ) : null}
            </div>

            <div className="rounded-xl border bg-background/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-foreground">{t("novelTakeover.startPhase.title")}</div>
                {readinessQuery.isLoading ? <Badge variant="outline">{t("novelTakeover.loading")}</Badge> : null}
              </div>

              {readinessQuery.isLoading ? (
                <div className="mt-3 text-sm text-muted-foreground">{t("novelTakeover.loadingDescription")}</div>
              ) : null}

              {readinessQuery.isError ? (
                <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {readinessQuery.error instanceof Error ? readinessQuery.error.message : t("novelTakeover.loadFailed")}
                </div>
              ) : null}

              {readiness ? (
                <>
                  <div className="mt-3 grid gap-3 md:grid-cols-4">
                    <div className="rounded-lg border bg-muted/15 p-3">
                      <div className="text-xs text-muted-foreground">{t("novelTakeover.snapshot.storyMacro")}</div>
                      <div className="mt-1 text-sm font-medium text-foreground">
                        {readiness.snapshot.hasStoryMacroPlan ? t("novelTakeover.snapshot.ready") : t("novelTakeover.snapshot.notReady")}
                      </div>
                    </div>
                    <div className="rounded-lg border bg-muted/15 p-3">
                      <div className="text-xs text-muted-foreground">{t("novelTakeover.snapshot.bookContract")}</div>
                      <div className="mt-1 text-sm font-medium text-foreground">
                        {readiness.snapshot.hasBookContract ? t("novelTakeover.snapshot.ready") : t("novelTakeover.snapshot.notReady")}
                      </div>
                    </div>
                    <div className="rounded-lg border bg-muted/15 p-3">
                      <div className="text-xs text-muted-foreground">{t("novelTakeover.snapshot.characterCount")}</div>
                      <div className="mt-1 text-sm font-medium text-foreground">{readiness.snapshot.characterCount}</div>
                    </div>
                    <div className="rounded-lg border bg-muted/15 p-3">
                      <div className="text-xs text-muted-foreground">{t("novelTakeover.snapshot.volumeAndChapterCount")}</div>
                      <div className="mt-1 text-sm font-medium text-foreground">
                        {readiness.snapshot.volumeCount} / {readiness.snapshot.firstVolumeChapterCount}
                      </div>
                    </div>
                  </div>

                  {readiness.hasActiveTask ? (
                    <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                      <div className="text-sm font-medium text-foreground">{t("novelTakeover.activeTask.title")}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {t("novelTakeover.activeTask.description")}
                      </div>
                      <div className="mt-3 flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setOpen(false);
                            navigate(readiness.activeTaskId
                              ? `/tasks?kind=novel_workflow&id=${readiness.activeTaskId}`
                              : "/tasks");
                          }}
                        >
                          {t("novelTakeover.activeTask.openTaskCenter")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {readiness.stages.map((stage) => {
                          const active = stage.phase === selectedPhase;
                          return (
                            <button
                              key={stage.phase}
                              type="button"
                              disabled={!stage.available || startMutation.isPending}
                              className={`rounded-xl border px-4 py-4 text-left transition ${
                                active
                                  ? "border-primary bg-primary/10 shadow-sm"
                                  : stage.available
                                    ? "border-border bg-background hover:border-primary/40"
                                    : "border-border/60 bg-muted/20 opacity-70"
                              }`}
                              onClick={() => setSelectedPhase(stage.phase)}
                            >
                              <div className="flex items-center justify-between gap-2">
                                  <div className="text-sm font-medium text-foreground">{stage.label}</div>
                                  <div className="flex items-center gap-2">
                                  {stage.recommended ? <Badge>{t("novelTakeover.stage.recommended")}</Badge> : null}
                                  {!stage.available ? <Badge variant="outline">{t("novelTakeover.stage.unavailable")}</Badge> : null}
                                  </div>
                                </div>
                              <div className="mt-2 text-xs leading-5 text-muted-foreground">{stage.description}</div>
                              <div className="mt-3 text-xs leading-5 text-muted-foreground">{stage.reason}</div>
                            </button>
                          );
                        })}
                      </div>

                      {selectedStage ? (
                        <div className="mt-4 rounded-lg border bg-muted/15 p-3 text-sm text-muted-foreground">
                          {t("novelTakeover.selectedStage", { label: selectedStage.label, reason: selectedStage.reason })}
                        </div>
                      ) : null}

                      <div className="mt-4 flex justify-end">
                        <Button
                          type="button"
                          disabled={
                            startMutation.isPending
                            || !selectedStage
                            || !selectedStage.available
                          }
                          onClick={() => startMutation.mutate()}
                        >
                          {startMutation.isPending ? t("novelTakeover.start.loading") : t("novelTakeover.start.action")}
                        </Button>
                      </div>
                    </>
                  )}
                </>
              ) : null}
            </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
