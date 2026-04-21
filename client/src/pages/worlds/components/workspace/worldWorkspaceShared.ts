import type { World } from "@ai-novel/shared/types/world";

export const LAYERS = [
  { key: "foundation", label: "L1 Nền tảng", primaryField: "background" },
  { key: "power", label: "L2 Sức mạnh", primaryField: "magicSystem" },
  { key: "society", label: "L3 Xã hội", primaryField: "politics" },
  { key: "culture", label: "L4 Văn hóa", primaryField: "cultures" },
  { key: "history", label: "L5 Lịch sử", primaryField: "history" },
  { key: "conflict", label: "L6 Xung đột", primaryField: "conflicts" },
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
  pending: "Chờ tạo",
  generated: "Đã tạo",
  confirmed: "Đã xác nhận",
  stale: "Chờ dựng lại",
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
  { value: "background", label: "Bối cảnh nền" },
  { value: "geography", label: "Địa lý môi trường" },
  { value: "cultures", label: "Tập tục văn hóa" },
  { value: "magicSystem", label: "Hệ thống sức mạnh" },
  { value: "politics", label: "Cấu trúc chính trị" },
  { value: "races", label: "Thiết lập chủng tộc" },
  { value: "religions", label: "Tôn giáo tín ngưỡng" },
  { value: "technology", label: "Hệ thống công nghệ" },
  { value: "history", label: "Mạch lịch sử" },
  { value: "economy", label: "Hệ thống kinh tế" },
  { value: "conflicts", label: "Xung đột cốt lõi" },
  { value: "description", label: "Tổng quan thế giới" },
  { value: "factions", label: "Quan hệ thế lực" },
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
