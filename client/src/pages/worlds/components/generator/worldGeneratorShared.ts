import type {
  WorldOptionRefinementLevel,
  WorldPropertyOption,
  WorldReferenceMode,
  WorldReferenceSeedBundle,
  WorldReferenceSeedSelection,
} from "@ai-novel/shared/types/worldWizard";

export type InspirationMode = "free" | "reference" | "random";

export interface WorldGeneratorConceptCard {
  worldType: string;
  templateKey: string;
  coreImagery: string[];
  tone: string;
  keywords: string[];
  summary: string;
}

export interface GeneratorGenreOption {
  id: string;
  name: string;
  path: string;
  description?: string | null;
  template?: string | null;
}

export interface WorldGeneratorTemplateOption {
  key: string;
  name: string;
  description: string;
  worldType: string;
  classicElements: string[];
  pitfalls: string[];
}

export const REFERENCE_MODE_OPTIONS: Array<{
  value: WorldReferenceMode;
  label: string;
  description: string;
}> = [
  {
    value: "adapt_world",
    label: "Dựa trên nguyên tác để cải biên",
    description: "Giữ nền thế giới gốc rồi quyết định những quy tắc, thế lực và cấu trúc địa điểm nào có thể cải biến.",
  },
  {
    value: "extract_base",
    label: "Trích xuất nền thế giới gốc",
    description: "Trước tiên trích ra bộ khung thế giới gốc cho ổn định, các phần mở rộng sau sẽ bám sát sự thật nguyên tác.",
  },
  {
    value: "tone_rebuild",
    label: "Chỉ mượn khí chất và cấu trúc để tái dựng",
    description: "Giữ bầu không khí, cấu trúc quan hệ và cảm giác đời sống, nhưng cho phép dựng lại thực tế thế giới ở mức rộng hơn.",
  },
];

export const DEFAULT_DIMENSIONS: Record<string, boolean> = {
  foundation: true,
  power: true,
  society: true,
  culture: true,
  history: true,
  conflict: true,
};

const DIMENSION_LABELS: Record<string, string> = {
  foundation: "Nền tảng",
  power: "Sức mạnh",
  society: "Xã hội",
  culture: "Văn hóa",
  history: "Lịch sử",
  conflict: "Xung đột",
};

export const REFERENCE_SEED_SELECTION_KEYS: Record<
  keyof WorldReferenceSeedBundle,
  keyof WorldReferenceSeedSelection
> = {
  rules: "ruleIds",
  factions: "factionIds",
  forces: "forceIds",
  locations: "locationIds",
};

export function getDimensionLabel(key: string): string {
  return DIMENSION_LABELS[key] ?? key;
}

export function normalizeAxiomTexts(items: unknown): string[] {
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .map((item) => (typeof item === "string" ? item.trim() : String(item ?? "").trim()))
    .filter(Boolean);
}

export function clampOptionsCount(value: number): number {
  return Math.max(4, Math.min(8, Math.floor(value)));
}

export function parseReferenceControlText(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[\n,，;；]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export function getReferenceModeLabel(mode: WorldReferenceMode): string {
  return REFERENCE_MODE_OPTIONS.find((item) => item.value === mode)?.label ?? "Dựa trên nguyên tác để cải biên";
}

export function buildDefaultPropertySelectionState(options: WorldPropertyOption[]) {
  return {
    selectedIds: options.map((option) => option.id),
    selectedChoiceIds: options.reduce<Record<string, string>>((acc, option) => {
      const firstChoiceId = option.choices?.[0]?.id;
      if (firstChoiceId) {
        acc[option.id] = firstChoiceId;
      }
      return acc;
    }, {}),
  };
}

export function buildDefaultReferenceSeedSelection(seeds: WorldReferenceSeedBundle): WorldReferenceSeedSelection {
  return {
    ruleIds: seeds.rules.map((item) => item.id),
    factionIds: seeds.factions.map((item) => item.id),
    forceIds: seeds.forces.map((item) => item.id),
    locationIds: seeds.locations.map((item) => item.id),
  };
}

export function isWorldGeneratorTemplateOption(
  value: unknown,
): value is WorldGeneratorTemplateOption {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.key === "string" && typeof record.name === "string";
}

export type GeneratorOptionRefinementLevel = WorldOptionRefinementLevel;
