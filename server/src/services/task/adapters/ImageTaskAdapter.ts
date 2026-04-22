import type { TaskStatus, UnifiedTaskDetail, UnifiedTaskSummary } from "@ai-novel/shared/types/task";
import { getBackendMessage } from "../../../i18n";
import { prisma } from "../../../db/prisma";
import { AppError } from "../../../middleware/errorHandler";
import { imageGenerationService } from "../../image/ImageGenerationService";
import {
  buildSteps,
  getImageTaskSteps,
  localizeTaskStageLabel,
  toLegacyTaskStatus,
} from "../taskCenter.shared";
import {
  buildTaskRecoveryHint,
  isArchivableTaskStatus,
  normalizeFailureSummary,
} from "../taskSupport";
import {
  archiveTask as recordTaskArchive,
  getArchivedTaskIds,
  isTaskArchived,
} from "../taskArchive";

export class ImageTaskAdapter {
  private getStepDefinitions() {
    return getImageTaskSteps();
  }

  async list(input: {
    status?: TaskStatus;
    keyword?: string;
    take: number;
  }): Promise<UnifiedTaskSummary[]> {
    if (input.status === "waiting_approval") {
      return [];
    }
    const status = toLegacyTaskStatus(input.status);
    const archivedIds = await getArchivedTaskIds("image_generation");
    const rows = await prisma.imageGenerationTask.findMany({
      where: {
        ...(archivedIds.length
          ? {
            id: {
              notIn: archivedIds,
            },
          }
          : {}),
        ...(status ? { status } : {}),
        ...(input.keyword
          ? {
            OR: [
              { prompt: { contains: input.keyword } },
              { baseCharacter: { name: { contains: input.keyword } } },
            ],
          }
          : {}),
      },
      include: {
        baseCharacter: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: input.take,
    });

    return rows.map((row) => {
      const stepDefinitions = this.getStepDefinitions();
      return {
        id: row.id,
        kind: "image_generation",
        title: row.baseCharacter?.name
          ? getBackendMessage("task.image.title.character", { name: row.baseCharacter.name })
          : getBackendMessage("task.image.title.generic", { shortId: row.id.slice(0, 8) }),
        status: row.status as TaskStatus,
        progress: row.progress,
        currentStage: localizeTaskStageLabel(stepDefinitions, row.currentStage),
        currentItemLabel: row.currentItemLabel,
        attemptCount: row.retryCount,
        maxAttempts: row.maxRetries,
        lastError: row.error,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        heartbeatAt: row.heartbeatAt?.toISOString() ?? null,
        ownerId: row.baseCharacterId ?? row.id,
        ownerLabel: row.baseCharacter?.name ?? getBackendMessage("task.image.owner.unlinked"),
        sourceRoute: row.baseCharacterId ? `/base-characters?id=${row.baseCharacterId}` : "/base-characters",
        failureCode: row.status === "failed" ? "IMAGE_GENERATION_FAILED" : null,
        failureSummary: row.status === "failed"
          ? normalizeFailureSummary(row.error, getBackendMessage("task.image.failure.default"))
          : row.error,
        recoveryHint: buildTaskRecoveryHint("image_generation", row.status as TaskStatus),
        sourceResource: row.baseCharacterId
          ? {
            type: "base_character",
            id: row.baseCharacterId,
            label: row.baseCharacter?.name ?? getBackendMessage("task.image.source.base_character"),
            route: `/base-characters?id=${row.baseCharacterId}`,
          }
          : {
            type: "task",
            id: row.id,
            label: getBackendMessage("task.image.title.generic", { shortId: row.id.slice(0, 8) }),
            route: "/tasks",
          },
        targetResources: [],
      };
    });
  }

  async detail(id: string): Promise<UnifiedTaskDetail | null> {
    if (await isTaskArchived("image_generation", id)) {
      return null;
    }

    const row = await prisma.imageGenerationTask.findUnique({
      where: { id },
      include: {
        baseCharacter: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    if (!row) {
      return null;
    }

    const stepDefinitions = this.getStepDefinitions();
    const summary: UnifiedTaskSummary = {
      id: row.id,
      kind: "image_generation",
      title: row.baseCharacter?.name
        ? getBackendMessage("task.image.title.character", { name: row.baseCharacter.name })
        : getBackendMessage("task.image.title.generic", { shortId: row.id.slice(0, 8) }),
      status: row.status as TaskStatus,
      progress: row.progress,
      currentStage: localizeTaskStageLabel(stepDefinitions, row.currentStage),
      currentItemLabel: row.currentItemLabel,
      attemptCount: row.retryCount,
      maxAttempts: row.maxRetries,
      lastError: row.error,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      heartbeatAt: row.heartbeatAt?.toISOString() ?? null,
      ownerId: row.baseCharacterId ?? row.id,
      ownerLabel: row.baseCharacter?.name ?? getBackendMessage("task.image.owner.unlinked"),
      sourceRoute: row.baseCharacterId ? `/base-characters?id=${row.baseCharacterId}` : "/base-characters",
      failureCode: row.status === "failed" ? "IMAGE_GENERATION_FAILED" : null,
      failureSummary: row.status === "failed"
        ? normalizeFailureSummary(row.error, getBackendMessage("task.image.failure.default"))
        : row.error,
      recoveryHint: buildTaskRecoveryHint("image_generation", row.status as TaskStatus),
      sourceResource: row.baseCharacterId
        ? {
          type: "base_character",
          id: row.baseCharacterId,
          label: row.baseCharacter?.name ?? getBackendMessage("task.image.source.base_character"),
          route: `/base-characters?id=${row.baseCharacterId}`,
        }
        : {
          type: "task",
          id: row.id,
          label: getBackendMessage("task.image.title.generic", { shortId: row.id.slice(0, 8) }),
          route: "/tasks",
        },
      targetResources: [],
    };

    return {
      ...summary,
      provider: row.provider,
      model: row.model,
      startedAt: row.startedAt?.toISOString() ?? null,
      finishedAt: row.finishedAt?.toISOString() ?? null,
      retryCountLabel: `${row.retryCount}/${row.maxRetries}`,
      meta: {
        sceneType: row.sceneType,
        baseCharacterId: row.baseCharacterId,
        prompt: row.prompt,
        negativePrompt: row.negativePrompt,
        size: row.size,
        imageCount: row.imageCount,
        cancelRequestedAt: row.cancelRequestedAt?.toISOString() ?? null,
      },
      steps: buildSteps(
        stepDefinitions,
        summary.status,
        row.currentStage,
        summary.createdAt,
        summary.updatedAt,
      ),
      failureDetails: row.error,
    };
  }

  async retry(id: string): Promise<UnifiedTaskDetail> {
    if (await isTaskArchived("image_generation", id)) {
      throw new AppError(getBackendMessage("task.error.not_found"), 404);
    }

    const task = await imageGenerationService.retryTask(id);
    const detail = await this.detail(task.id);
    if (!detail) {
      throw new AppError(getBackendMessage("task.error.not_found_after_retry"), 404);
    }
    return detail;
  }

  async cancel(id: string): Promise<UnifiedTaskDetail> {
    if (await isTaskArchived("image_generation", id)) {
      throw new AppError(getBackendMessage("task.error.not_found"), 404);
    }

    const task = await imageGenerationService.cancelTask(id);
    const detail = await this.detail(task.id);
    if (!detail) {
      throw new AppError(getBackendMessage("task.error.not_found_after_cancellation"), 404);
    }
    return detail;
  }

  async archive(id: string): Promise<UnifiedTaskDetail | null> {
    if (await isTaskArchived("image_generation", id)) {
      return null;
    }

    const task = await prisma.imageGenerationTask.findUnique({
      where: { id },
    });
    if (!task) {
      throw new AppError(getBackendMessage("task.error.not_found"), 404);
    }
    if (!isArchivableTaskStatus(task.status as TaskStatus)) {
      throw new AppError(getBackendMessage("task.error.archive_requires_terminal_status"), 400);
    }

    await recordTaskArchive("image_generation", id);
    return null;
  }
}
