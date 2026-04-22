import type {
  TaskStatus,
  UnifiedTaskStep,
  UnifiedTaskSummary,
} from "@ai-novel/shared/types/task";
import { getBackendMessage, type BackendMessageKey } from "../../i18n";

export interface ListTasksFilters {
  kind?: "book_analysis" | "novel_pipeline" | "knowledge_document" | "image_generation" | "agent_run" | "novel_workflow";
  status?: TaskStatus;
  keyword?: string;
  limit?: number;
  cursor?: string;
}

export interface CursorPayload {
  status: TaskStatus;
  updatedAt: string;
  id: string;
}

export const STATUS_RANK: Record<TaskStatus, number> = {
  running: 0,
  waiting_approval: 1,
  queued: 2,
  failed: 3,
  cancelled: 4,
  succeeded: 5,
};

export interface LocalizedTaskStepDefinition {
  key: string;
  label: string;
}

type StepDefinitionSeed = {
  key: string;
  labelKey: BackendMessageKey;
};

const BOOK_ANALYSIS_STEP_SEEDS: readonly StepDefinitionSeed[] = [
  { key: "queued", labelKey: "taskCenter.bookAnalysis.step.queued" },
  { key: "preparing_notes", labelKey: "taskCenter.bookAnalysis.step.preparing_notes" },
  { key: "generating_sections", labelKey: "taskCenter.bookAnalysis.step.generating_sections" },
  { key: "finalizing", labelKey: "taskCenter.bookAnalysis.step.finalizing" },
];

const NOVEL_PIPELINE_STEP_SEEDS: readonly StepDefinitionSeed[] = [
  { key: "queued", labelKey: "taskCenter.novelPipeline.step.queued" },
  { key: "generating_chapters", labelKey: "taskCenter.novelPipeline.step.generating_chapters" },
  { key: "reviewing", labelKey: "taskCenter.novelPipeline.step.reviewing" },
  { key: "repairing", labelKey: "taskCenter.novelPipeline.step.repairing" },
  { key: "finalizing", labelKey: "taskCenter.novelPipeline.step.finalizing" },
];

const KNOWLEDGE_DOCUMENT_STEP_SEEDS: readonly StepDefinitionSeed[] = [
  { key: "queued", labelKey: "taskCenter.knowledge.step.queued" },
  { key: "loading_source", labelKey: "taskCenter.knowledge.step.loading_source" },
  { key: "chunking", labelKey: "taskCenter.knowledge.step.chunking" },
  { key: "embedding", labelKey: "taskCenter.knowledge.step.embedding" },
  { key: "ensuring_collection", labelKey: "taskCenter.knowledge.step.ensuring_collection" },
  { key: "deleting_existing", labelKey: "taskCenter.knowledge.step.deleting_existing" },
  { key: "upserting_vectors", labelKey: "taskCenter.knowledge.step.upserting_vectors" },
  { key: "writing_metadata", labelKey: "taskCenter.knowledge.step.writing_metadata" },
  { key: "completed", labelKey: "taskCenter.knowledge.step.completed" },
];

const IMAGE_TASK_STEP_SEEDS: readonly StepDefinitionSeed[] = [
  { key: "queued", labelKey: "taskCenter.image.step.queued" },
  { key: "submitting", labelKey: "taskCenter.image.step.submitting" },
  { key: "generating", labelKey: "taskCenter.image.step.generating" },
  { key: "saving_assets", labelKey: "taskCenter.image.step.saving_assets" },
  { key: "finalizing", labelKey: "taskCenter.image.step.finalizing" },
];

function buildLocalizedStepDefinitions(seeds: readonly StepDefinitionSeed[]): LocalizedTaskStepDefinition[] {
  return seeds.map((item) => ({
    key: item.key,
    label: getBackendMessage(item.labelKey),
  }));
}

export function getBookAnalysisSteps(): LocalizedTaskStepDefinition[] {
  return buildLocalizedStepDefinitions(BOOK_ANALYSIS_STEP_SEEDS);
}

export function getNovelPipelineSteps(): LocalizedTaskStepDefinition[] {
  return buildLocalizedStepDefinitions(NOVEL_PIPELINE_STEP_SEEDS);
}

export function getKnowledgeDocumentSteps(): LocalizedTaskStepDefinition[] {
  return buildLocalizedStepDefinitions(KNOWLEDGE_DOCUMENT_STEP_SEEDS);
}

export function getImageTaskSteps(): LocalizedTaskStepDefinition[] {
  return buildLocalizedStepDefinitions(IMAGE_TASK_STEP_SEEDS);
}

export function normalizeKeyword(value: string | undefined): string | undefined {
  const keyword = value?.trim();
  return keyword ? keyword : undefined;
}

export function normalizeLimit(value: number | undefined): number {
  if (!value || Number.isNaN(value)) {
    return 30;
  }
  return Math.max(1, Math.min(100, Math.floor(value)));
}

export function statusRank(status: TaskStatus): number {
  return STATUS_RANK[status] ?? 99;
}

export function toCursor(summary: UnifiedTaskSummary): string {
  const payload: CursorPayload = {
    status: summary.status,
    updatedAt: summary.updatedAt,
    id: summary.id,
  };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function parseCursor(cursor: string | undefined): CursorPayload | null {
  if (!cursor?.trim()) {
    return null;
  }
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(raw) as CursorPayload;
    if (!parsed?.status || !parsed.updatedAt || !parsed.id) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function compareTaskSummary(left: UnifiedTaskSummary, right: UnifiedTaskSummary): number {
  const leftRank = statusRank(left.status);
  const rightRank = statusRank(right.status);
  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }
  if (left.updatedAt !== right.updatedAt) {
    return right.updatedAt.localeCompare(left.updatedAt);
  }
  return right.id.localeCompare(left.id);
}

export function isAfterCursor(summary: UnifiedTaskSummary, cursor: CursorPayload): boolean {
  const rankDiff = statusRank(summary.status) - statusRank(cursor.status);
  if (rankDiff !== 0) {
    return rankDiff > 0;
  }
  if (summary.updatedAt !== cursor.updatedAt) {
    return summary.updatedAt < cursor.updatedAt;
  }
  return summary.id < cursor.id;
}

function resolveStageIndex(
  definitions: ReadonlyArray<{ key: string; label: string }>,
  currentStage: string | null | undefined,
): number {
  if (!currentStage) {
    return 0;
  }
  const index = definitions.findIndex((item) => item.key === currentStage);
  return index >= 0 ? index : 0;
}

export function localizeTaskStageLabel(
  definitions: ReadonlyArray<{ key: string; label: string }>,
  currentStage: string | null | undefined,
): string | null {
  if (!currentStage?.trim()) {
    return null;
  }
  return definitions.find((item) => item.key === currentStage)?.label ?? currentStage;
}

export function buildSteps(
  definitions: ReadonlyArray<{ key: string; label: string }>,
  status: TaskStatus,
  currentStage: string | null | undefined,
  createdAt: string,
  updatedAt: string,
): UnifiedTaskStep[] {
  const stageIndex = resolveStageIndex(definitions, currentStage);
  return definitions.map((item, index) => {
    let stepStatus: UnifiedTaskStep["status"] = "idle";
    if (status === "queued") {
      stepStatus = index === 0 ? "running" : "idle";
    } else if (status === "running" || status === "waiting_approval") {
      if (index < stageIndex) {
        stepStatus = "succeeded";
      } else if (index === stageIndex) {
        stepStatus = status === "waiting_approval" ? "cancelled" : "running";
      }
    } else if (status === "succeeded") {
      stepStatus = "succeeded";
    } else if (status === "failed") {
      if (index < stageIndex) {
        stepStatus = "succeeded";
      } else if (index === stageIndex) {
        stepStatus = "failed";
      }
    } else if (status === "cancelled") {
      if (index < stageIndex) {
        stepStatus = "succeeded";
      } else if (index === stageIndex) {
        stepStatus = "cancelled";
      }
    }

    return {
      key: item.key,
      label: item.label,
      status: stepStatus,
      startedAt: stepStatus === "idle" ? null : createdAt,
      updatedAt: stepStatus === "idle" ? null : updatedAt,
    };
  });
}

export function toLegacyTaskStatus(
  status: TaskStatus | undefined,
): "queued" | "running" | "succeeded" | "failed" | "cancelled" | undefined {
  if (!status || status === "waiting_approval") {
    return undefined;
  }
  return status;
}

export function mapBookStatusToTaskStatus(status: string): TaskStatus | null {
  if (status === "queued" || status === "running" || status === "succeeded" || status === "failed" || status === "cancelled") {
    return status;
  }
  return null;
}
