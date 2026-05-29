import type { ModelRouteTaskType } from "@ai-novel/shared/types/novel";

export const MODEL_ROUTE_LABEL_KEYS: Record<ModelRouteTaskType, { titleKey: string; descriptionKey: string }> = {
  planner: {
    titleKey: "settings.modelRoutes.taskLabels.planner.title",
    descriptionKey: "settings.modelRoutes.taskLabels.planner.description",
  },
  writer: {
    titleKey: "settings.modelRoutes.taskLabels.writer.title",
    descriptionKey: "settings.modelRoutes.taskLabels.writer.description",
  },
  review: {
    titleKey: "settings.modelRoutes.taskLabels.review.title",
    descriptionKey: "settings.modelRoutes.taskLabels.review.description",
  },
  light_review: {
    titleKey: "settings.modelRoutes.taskLabels.light_review.title",
    descriptionKey: "settings.modelRoutes.taskLabels.light_review.description",
  },
  critical_review: {
    titleKey: "settings.modelRoutes.taskLabels.critical_review.title",
    descriptionKey: "settings.modelRoutes.taskLabels.critical_review.description",
  },
  repair: {
    titleKey: "settings.modelRoutes.taskLabels.repair.title",
    descriptionKey: "settings.modelRoutes.taskLabels.repair.description",
  },
  replan: {
    titleKey: "settings.modelRoutes.taskLabels.replan.title",
    descriptionKey: "settings.modelRoutes.taskLabels.replan.description",
  },
  state_resolution: {
    titleKey: "settings.modelRoutes.taskLabels.state_resolution.title",
    descriptionKey: "settings.modelRoutes.taskLabels.state_resolution.description",
  },
  summary: {
    titleKey: "settings.modelRoutes.taskLabels.summary.title",
    descriptionKey: "settings.modelRoutes.taskLabels.summary.description",
  },
  fact_extraction: {
    titleKey: "settings.modelRoutes.taskLabels.fact_extraction.title",
    descriptionKey: "settings.modelRoutes.taskLabels.fact_extraction.description",
  },
  chat: {
    titleKey: "settings.modelRoutes.taskLabels.chat.title",
    descriptionKey: "settings.modelRoutes.taskLabels.chat.description",
  },
};
