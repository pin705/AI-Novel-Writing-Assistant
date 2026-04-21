import type { ModelRouteTaskType } from "@ai-novel/shared/types/novel";
import { t } from "@/i18n";


export const MODEL_ROUTE_LABELS: Record<ModelRouteTaskType, { title: string; description: string }> = {
  planner: {
    title: t("大纲策士"),
    description: t("先吃透你的要求，再安排这段创作该怎么推进。"),
  },
  writer: {
    title: t("主笔作家"),
    description: t("真正动笔写正文，把章节内容完整落下来。"),
  },
  review: {
    title: t("审稿编修"),
    description: t("专门盯剧情、节奏和文风，找出稿子里的毛病。"),
  },
  repair: {
    title: t("润稿匠人"),
    description: t("根据问题回头修文，把不顺的地方重新打磨。"),
  },
  summary: {
    title: t("剧情摘录师"),
    description: t("把长章节浓缩成回顾、摘要和重点梳理。"),
  },
  fact_extraction: {
    title: t("设定考据官"),
    description: t("整理设定、时间线和关键事实，防止写着写着前后打架。"),
  },
  chat: {
    title: t("灵感陪写"),
    description: t("负责日常对话，把结果整理成创作时能直接理解的话。"),
  },
};
