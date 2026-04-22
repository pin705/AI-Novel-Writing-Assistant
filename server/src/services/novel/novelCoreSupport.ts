import { prisma } from "../../db/prisma";
import { getBackendMessage, type BackendMessageKey } from "../../i18n";
import { AppError } from "../../middleware/errorHandler";
import { ragServices } from "../rag";
import type { RagOwnerType } from "../rag/types";
import { buildLegacyWorldContextFromWorld } from "./storyWorldSlice/storyWorldSliceFormatting";

export interface NovelWorldContextInput {
  world?: {
    name: string;
    worldType?: string | null;
    description?: string | null;
    axioms?: string | null;
    background?: string | null;
    geography?: string | null;
    magicSystem?: string | null;
    politics?: string | null;
    races?: string | null;
    religions?: string | null;
    technology?: string | null;
    conflicts?: string | null;
    history?: string | null;
    economy?: string | null;
    factions?: string | null;
  } | null;
}

export type NovelCharacterRequirementActionKey =
  | "generate_structured_outline"
  | "generate_novel_bible"
  | "generate_story_beats"
  | "start_pipeline"
  | "run_chapter_pipeline"
  | "generate_chapter_content";

const NOVEL_CHARACTER_ACTION_LABEL_KEYS: Record<NovelCharacterRequirementActionKey, BackendMessageKey> = {
  generate_structured_outline: "novel.action.generate_structured_outline",
  generate_novel_bible: "novel.action.generate_novel_bible",
  generate_story_beats: "novel.action.generate_story_beats",
  start_pipeline: "novel.action.start_pipeline",
  run_chapter_pipeline: "novel.action.run_chapter_pipeline",
  generate_chapter_content: "novel.action.generate_chapter_content",
};

export function queueRagUpsert(ownerType: RagOwnerType, ownerId: string): void {
  void ragServices.ragIndexService.enqueueUpsert(ownerType, ownerId).catch(() => {
    // keep primary workflow resilient even when rag queueing fails
  });
}

export function queueRagDelete(ownerType: RagOwnerType, ownerId: string): void {
  void ragServices.ragIndexService.enqueueDelete(ownerType, ownerId).catch(() => {
    // keep primary workflow resilient even when rag queueing fails
  });
}

export function buildWorldContextFromNovel(novel: NovelWorldContextInput | null | undefined): string {
  return buildLegacyWorldContextFromWorld(novel?.world ?? null);
}

export async function ensureNovelCharacters(
  novelId: string,
  actionKey: NovelCharacterRequirementActionKey,
  minCount = 1,
) {
  const count = await prisma.character.count({ where: { novelId } });
  if (count < minCount) {
    throw new AppError("novel.error.characters_required", 400, {
      minCount,
      action: getBackendMessage(NOVEL_CHARACTER_ACTION_LABEL_KEYS[actionKey]),
    });
  }
}
