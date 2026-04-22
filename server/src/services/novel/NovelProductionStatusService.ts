import type { BackendMessageKey } from "../../i18n";
import { prisma } from "../../db/prisma";
import { getBackendMessage } from "../../i18n";
import { parseStructuredOutline } from "./novelProductionHelpers";

export interface ProductionStatusStage {
  key: string;
  label: string;
  status: "pending" | "completed" | "running" | "blocked";
  detail: string | null;
}

export interface ProductionStatusResult {
  novelId: string;
  title: string;
  worldId: string | null;
  worldName: string | null;
  chapterCount: number;
  targetChapterCount: number;
  assetStages: ProductionStatusStage[];
  assetsReady: boolean;
  pipelineReady: boolean;
  pipelineJobId: string | null;
  pipelineStatus: string | null;
  failureSummary: string | null;
  recoveryHint: string | null;
  currentStage: string;
  summary: string;
}

const PRODUCTION_ASSET_LABEL_KEYS = {
  novel_workspace: "production.asset.novel_workspace",
  world: "production.asset.world",
  characters: "production.asset.characters",
  story_bible: "production.asset.story_bible",
  outline: "production.asset.outline",
  structured_outline: "production.asset.structured_outline",
  chapters: "production.asset.chapters",
  pipeline: "production.asset.pipeline",
} as const satisfies Record<string, BackendMessageKey>;

function getPipelineStatusLabel(status: string | null | undefined): string | null {
  if (status === "queued") return getBackendMessage("production.pipeline.status.queued");
  if (status === "running") return getBackendMessage("production.pipeline.status.running");
  if (status === "succeeded") return getBackendMessage("production.pipeline.status.succeeded");
  if (status === "failed") return getBackendMessage("production.pipeline.status.failed");
  if (status === "cancelled") return getBackendMessage("production.pipeline.status.cancelled");
  return status?.trim() || null;
}

export class NovelProductionStatusService {
  async getNovelProductionStatus(input: {
    novelId?: string;
    title?: string;
    targetChapterCount?: number;
  }): Promise<ProductionStatusResult> {
    const novel = input.novelId
      ? await prisma.novel.findUnique({
          where: { id: input.novelId },
          include: {
            world: { select: { id: true, name: true } },
            bible: true,
            characters: { select: { id: true } },
            chapters: { select: { id: true, order: true }, orderBy: { order: "asc" } },
            generationJobs: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        })
      : await prisma.novel.findFirst({
          where: {
            title: {
              contains: input.title?.trim() ?? "",
            },
          },
          include: {
            world: { select: { id: true, name: true } },
            bible: true,
            characters: { select: { id: true } },
            chapters: { select: { id: true, order: true }, orderBy: { order: "asc" } },
            generationJobs: { orderBy: { createdAt: "desc" }, take: 1 },
          },
          orderBy: { updatedAt: "desc" },
        });
    if (!novel) {
      throw new Error(getBackendMessage("production.error.novel_not_found"));
    }

    const structuredOutlineChapters = novel.structuredOutline?.trim()
      ? parseStructuredOutline(novel.structuredOutline).length
      : 0;
    const targetChapterCount = input.targetChapterCount
      ?? (structuredOutlineChapters > 0 ? structuredOutlineChapters : null)
      ?? (novel.chapters.length > 0 ? novel.chapters.length : null)
      ?? 20;
    const latestJob = novel.generationJobs[0] ?? null;
    const chapterCount = novel.chapters.length;

    const pipelineStatusLabel = getPipelineStatusLabel(latestJob?.status ?? null);
    const assetStages: ProductionStatusStage[] = [
      { key: "novel_workspace", label: getBackendMessage(PRODUCTION_ASSET_LABEL_KEYS.novel_workspace), status: "completed", detail: novel.title },
      { key: "world", label: getBackendMessage(PRODUCTION_ASSET_LABEL_KEYS.world), status: novel.world ? "completed" : "pending", detail: novel.world?.name ?? null },
      {
        key: "characters",
        label: getBackendMessage(PRODUCTION_ASSET_LABEL_KEYS.characters),
        status: novel.characters.length > 0 ? "completed" : "pending",
        detail: novel.characters.length > 0
          ? getBackendMessage("production.asset.characters.count", { count: novel.characters.length })
          : null,
      },
      { key: "story_bible", label: getBackendMessage(PRODUCTION_ASSET_LABEL_KEYS.story_bible), status: novel.bible ? "completed" : "pending", detail: novel.bible?.mainPromise ?? novel.bible?.coreSetting ?? null },
      {
        key: "outline",
        label: getBackendMessage(PRODUCTION_ASSET_LABEL_KEYS.outline),
        status: novel.outline?.trim() ? "completed" : "pending",
        detail: novel.outline?.trim() ? getBackendMessage("production.asset.outline.generated") : null,
      },
      {
        key: "structured_outline",
        label: getBackendMessage(PRODUCTION_ASSET_LABEL_KEYS.structured_outline),
        status: novel.structuredOutline?.trim() ? "completed" : "pending",
        detail: novel.structuredOutline?.trim()
          ? getBackendMessage("production.asset.structured_outline.chapter_count", { count: structuredOutlineChapters })
          : null,
      },
      {
        key: "chapters",
        label: getBackendMessage(PRODUCTION_ASSET_LABEL_KEYS.chapters),
        status: chapterCount > 0 ? "completed" : "pending",
        detail: chapterCount > 0
          ? getBackendMessage("production.asset.chapters.chapter_count", { chapterCount, targetChapterCount })
          : null,
      },
      {
        key: "pipeline",
        label: getBackendMessage(PRODUCTION_ASSET_LABEL_KEYS.pipeline),
        status: latestJob
          ? latestJob.status === "running" || latestJob.status === "queued"
            ? "running"
            : latestJob.status === "succeeded"
              ? "completed"
              : "blocked"
          : "pending",
        detail: latestJob && pipelineStatusLabel
          ? getBackendMessage("production.asset.pipeline.status_detail", { statusLabel: pipelineStatusLabel })
          : null,
      },
    ];

    const assetsReady = assetStages.filter((stage) => stage.key !== "pipeline").every((stage) => stage.status === "completed");
    const pipelineReady = assetsReady && chapterCount > 0;

    let currentStage = getBackendMessage("production.current.assets_pending");
    if (!novel.world) {
      currentStage = getBackendMessage("production.current.waiting_world");
    } else if (novel.characters.length === 0) {
      currentStage = getBackendMessage("production.current.waiting_characters");
    } else if (!novel.bible) {
      currentStage = getBackendMessage("production.current.waiting_story_bible");
    } else if (!novel.outline?.trim()) {
      currentStage = getBackendMessage("production.current.waiting_outline");
    } else if (!novel.structuredOutline?.trim()) {
      currentStage = getBackendMessage("production.current.waiting_structured_outline");
    } else if (chapterCount === 0) {
      currentStage = getBackendMessage("production.current.waiting_chapter_sync");
    } else if (!latestJob) {
      currentStage = getBackendMessage("production.current.waiting_pipeline_start");
    } else if (latestJob.status === "queued" || latestJob.status === "running") {
      currentStage = getBackendMessage("production.current.pipeline_running");
    } else if (latestJob.status === "succeeded") {
      currentStage = getBackendMessage("production.current.pipeline_completed");
    } else if (latestJob.status === "failed") {
      currentStage = getBackendMessage("production.current.pipeline_failed");
    } else if (latestJob.status === "cancelled") {
      currentStage = getBackendMessage("production.current.pipeline_cancelled");
    }

    const failureSummary = latestJob?.status === "failed"
      ? (latestJob.error ?? getBackendMessage("production.failure.pipeline_default"))
      : null;
    const recoveryHint = latestJob?.status === "failed"
      ? getBackendMessage("production.recovery.failed")
      : !pipelineReady
        ? getBackendMessage("production.recovery.prepare_assets")
        : latestJob
          ? null
          : getBackendMessage("production.recovery.ready_to_start");
    const summary = latestJob
      ? getBackendMessage("production.summary.current_stage", {
        title: novel.title,
        currentStage,
      })
      : pipelineReady
        ? getBackendMessage("production.summary.ready_not_started", { title: novel.title })
        : getBackendMessage("production.summary.current_stage", {
          title: novel.title,
          currentStage,
        });

    return {
      novelId: novel.id,
      title: novel.title,
      worldId: novel.world?.id ?? null,
      worldName: novel.world?.name ?? null,
      chapterCount,
      targetChapterCount,
      assetStages,
      assetsReady,
      pipelineReady,
      pipelineJobId: latestJob?.id ?? null,
      pipelineStatus: pipelineStatusLabel,
      failureSummary,
      recoveryHint,
      currentStage,
      summary,
    };
  }
}

export const novelProductionStatusService = new NovelProductionStatusService();
