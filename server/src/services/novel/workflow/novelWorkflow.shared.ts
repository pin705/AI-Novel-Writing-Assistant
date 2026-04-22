import type {
  NovelWorkflowCheckpoint,
  NovelWorkflowLane,
  NovelWorkflowResumeTarget,
  NovelWorkflowStage,
} from "@ai-novel/shared/types/novelWorkflow";
import { getBackendMessage, type BackendMessageKey } from "../../../i18n";

export interface NovelWorkflowMilestone {
  checkpointType: NovelWorkflowCheckpoint;
  summary: string;
  createdAt: string;
}

export const NOVEL_WORKFLOW_STAGE_LABEL_KEYS: Record<NovelWorkflowStage, BackendMessageKey> = {
  project_setup: "workflow.stage.project_setup",
  auto_director: "workflow.stage.auto_director",
  story_macro: "workflow.stage.story_macro",
  character_setup: "workflow.stage.character_setup",
  volume_strategy: "workflow.stage.volume_strategy",
  structured_outline: "workflow.stage.structured_outline",
  chapter_execution: "workflow.stage.chapter_execution",
  quality_repair: "workflow.stage.quality_repair",
};

export const NOVEL_WORKFLOW_STAGE_PROGRESS: Record<NovelWorkflowStage, number> = {
  project_setup: 0.08,
  auto_director: 0.15,
  story_macro: 0.26,
  character_setup: 0.34,
  volume_strategy: 0.5,
  structured_outline: 0.68,
  chapter_execution: 0.84,
  quality_repair: 0.94,
};

const NOVEL_WORKFLOW_STAGE_ALIASES: Record<NovelWorkflowStage, readonly string[]> = {
  project_setup: ["项目设定", "Thiết lập dự án", "Project setup"],
  auto_director: ["AI 自动导演", "自动导演", "Đạo diễn tự động", "Auto-director"],
  story_macro: ["故事宏观规划", "Quy hoạch vĩ mô cốt truyện", "Story macro planning"],
  character_setup: ["角色准备", "Chuẩn bị nhân vật", "Character setup"],
  volume_strategy: ["卷战略 / 卷骨架", "Chiến lược tập / khung tập", "Volume strategy / skeleton"],
  structured_outline: ["节奏 / 拆章", "Nhịp truyện / tách chương", "Beat sheet / chapter breakdown"],
  chapter_execution: ["章节执行", "Thực thi chương", "Chapter execution"],
  quality_repair: ["质量修复", "Sửa chất lượng", "Quality repair"],
};

export function getNovelWorkflowStageLabel(stage: NovelWorkflowStage): string {
  return getBackendMessage(NOVEL_WORKFLOW_STAGE_LABEL_KEYS[stage]);
}

export function normalizeNovelWorkflowStage(value: string | null | undefined): NovelWorkflowStage | null {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }
  if (normalized in NOVEL_WORKFLOW_STAGE_LABEL_KEYS) {
    return normalized as NovelWorkflowStage;
  }
  return (Object.entries(NOVEL_WORKFLOW_STAGE_ALIASES).find(([, aliases]) => aliases.includes(normalized))?.[0] as NovelWorkflowStage | undefined) ?? null;
}

export function getNovelWorkflowStageSteps(): Array<{ key: NovelWorkflowStage; label: string }> {
  return (Object.keys(NOVEL_WORKFLOW_STAGE_LABEL_KEYS) as NovelWorkflowStage[]).map((key) => ({
    key,
    label: getNovelWorkflowStageLabel(key),
  }));
}

export function buildNovelCreateResumeTarget(taskId: string, mode: "director" | null = null): NovelWorkflowResumeTarget {
  return {
    route: "/novels/create",
    taskId,
    mode,
  };
}

export function buildNovelEditResumeTarget(params: {
  novelId: string;
  taskId?: string | null;
  stage: NovelWorkflowResumeTarget["stage"];
  chapterId?: string | null;
  volumeId?: string | null;
}): NovelWorkflowResumeTarget {
  return {
    route: "/novels/:id/edit",
    novelId: params.novelId,
    taskId: params.taskId ?? null,
    stage: params.stage,
    chapterId: params.chapterId ?? null,
    volumeId: params.volumeId ?? null,
  };
}

export function resumeTargetToRoute(target: NovelWorkflowResumeTarget | null | undefined): string {
  if (!target) {
    return "/tasks";
  }
  if (target.route === "/novels/create") {
    const searchParams = new URLSearchParams();
    if (target.taskId) {
      searchParams.set("workflowTaskId", target.taskId);
    }
    if (target.mode) {
      searchParams.set("mode", target.mode);
    }
    const query = searchParams.toString();
    return query ? `/novels/create?${query}` : "/novels/create";
  }

  if (!target.novelId) {
    return "/tasks";
  }

  const searchParams = new URLSearchParams();
  if (target.stage) {
    searchParams.set("stage", target.stage);
  }
  if (target.taskId) {
    searchParams.set("taskId", target.taskId);
  }
  if (target.chapterId) {
    searchParams.set("chapterId", target.chapterId);
  }
  if (target.volumeId) {
    searchParams.set("volumeId", target.volumeId);
  }
  const query = searchParams.toString();
  return query ? `/novels/${target.novelId}/edit?${query}` : `/novels/${target.novelId}/edit`;
}

export function parseMilestones(value: string | null | undefined): NovelWorkflowMilestone[] {
  if (!value?.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((item): item is NovelWorkflowMilestone => (
        Boolean(item)
        && typeof item === "object"
        && typeof (item as NovelWorkflowMilestone).checkpointType === "string"
        && typeof (item as NovelWorkflowMilestone).summary === "string"
        && typeof (item as NovelWorkflowMilestone).createdAt === "string"
      ));
  } catch {
    return [];
  }
}

export function appendMilestone(
  existing: string | null | undefined,
  checkpointType: NovelWorkflowCheckpoint,
  summary: string,
): string {
  const next = [
    ...parseMilestones(existing).filter((item) => item.checkpointType !== checkpointType),
    {
      checkpointType,
      summary,
      createdAt: new Date().toISOString(),
    },
  ];
  return JSON.stringify(next);
}

export function parseResumeTarget(value: string | null | undefined): NovelWorkflowResumeTarget | null {
  if (!value?.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(value) as NovelWorkflowResumeTarget;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function stringifyResumeTarget(value: NovelWorkflowResumeTarget | null | undefined): string | null {
  return value ? JSON.stringify(value) : null;
}

export function parseSeedPayload<T>(value: string | null | undefined): T | null {
  if (!value?.trim()) {
    return null;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function mergeSeedPayload<T extends Record<string, unknown>>(
  existing: string | null | undefined,
  patch: Partial<T>,
): string {
  const current = parseSeedPayload<T>(existing) ?? {} as T;
  return JSON.stringify({
    ...current,
    ...patch,
  });
}

export function defaultWorkflowTitle(input: {
  lane: NovelWorkflowLane;
  title?: string | null;
  novelTitle?: string | null;
}): string {
  const novelTitle = input.novelTitle?.trim() || input.title?.trim();
  if (novelTitle) {
    return novelTitle;
  }
  return input.lane === "auto_director"
    ? getBackendMessage("workflow.title.auto_director_novel")
    : getBackendMessage("workflow.title.novel_task");
}
