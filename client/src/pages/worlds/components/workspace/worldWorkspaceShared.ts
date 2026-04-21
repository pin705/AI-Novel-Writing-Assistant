import type { World } from "@ai-novel/shared/types/world";
import { t } from "@/i18n";


export const LAYERS = [
  { key: "foundation", label: t("L1 基础层"), primaryField: "background" },
  { key: "power", label: t("L2 力量层"), primaryField: "magicSystem" },
  { key: "society", label: t("L3 社会层"), primaryField: "politics" },
  { key: "culture", label: t("L4 文化层"), primaryField: "cultures" },
  { key: "history", label: t("L5 历史层"), primaryField: "history" },
  { key: "conflict", label: t("L6 冲突层"), primaryField: "conflicts" },
] as const;

export type LayerKey = (typeof LAYERS)[number]["key"];

export type LayerField =
  | "description"
  | "background"
  | "geography"
  | "cultures"
  | "magicSystem"
  | "politics"
  | "races"
  | "religions"
  | "technology"
  | "conflicts"
  | "history"
  | "economy"
  | "factions";

export const LAYER_STATUS_LABELS: Record<string, string> = {
  pending: "待生成",
  generated: "已生成",
  confirmed: "已确认",
  stale: "待重建",
};

export const LAYER_FIELDS_BY_KEY: Record<LayerKey, LayerField[]> = {
  foundation: ["background", "geography"],
  power: ["magicSystem", "technology"],
  society: ["politics", "races", "factions"],
  culture: ["cultures", "religions", "economy"],
  history: ["history"],
  conflict: ["conflicts", "description"],
};

export type RefineAttribute =
  | "description"
  | "background"
  | "geography"
  | "cultures"
  | "magicSystem"
  | "politics"
  | "races"
  | "religions"
  | "technology"
  | "conflicts"
  | "history"
  | "economy"
  | "factions";

export const REFINE_ATTRIBUTE_OPTIONS: Array<{ value: RefineAttribute; label: string }> = [
  { value: "background", label: t("基础背景") },
  { value: "geography", label: t("地理环境") },
  { value: "cultures", label: t("文化习俗") },
  { value: "magicSystem", label: t("力量体系") },
  { value: "politics", label: t("政治结构") },
  { value: "races", label: t("种族设定") },
  { value: "religions", label: t("宗教信仰") },
  { value: "technology", label: t("技术体系") },
  { value: "history", label: t("历史脉络") },
  { value: "economy", label: t("经济系统") },
  { value: "conflicts", label: t("核心冲突") },
  { value: "description", label: t("世界概述") },
  { value: "factions", label: t("势力关系") },
];

export function normalizeLayerText(raw: unknown): string {
  if (typeof raw === "string") {
    return raw;
  }
  if (raw === null || raw === undefined) {
    return "";
  }
  if (typeof raw === "object") {
    try {
      return JSON.stringify(raw, null, 2);
    } catch {
      return "";
    }
  }
  return String(raw);
}

export function pickLayerFieldText(layerKey: LayerKey, source: Record<string, unknown> | undefined): string {
  if (!source) {
    return "";
  }
  for (const field of LAYER_FIELDS_BY_KEY[layerKey]) {
    const text = normalizeLayerText(source[field]).trim();
    if (text) {
      return text;
    }
  }
  return "";
}

export function parseLayerStates(raw: string | null | undefined) {
  try {
    return JSON.parse(raw ?? "{}") as Record<string, { status: string; updatedAt: string }>;
  } catch {
    return {};
  }
}

export function getWorldField(world: World | undefined, field: keyof World): string {
  const value = world?.[field];
  return typeof value === "string" ? value : "";
}
