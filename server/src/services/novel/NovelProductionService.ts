import type { LLMProvider } from "@ai-novel/shared/types/llm";
import { prisma } from "../../db/prisma";
import { getBackendMessage } from "../../i18n";
import { runStructuredPrompt } from "../../prompting/core/promptRunner";
import { novelProductionCharactersPrompt } from "../../prompting/prompts/novel/production.prompts";
import { WorldService } from "../world/WorldService";
import { NovelService } from "./NovelService";
import { collectStream, extractJsonArray, parseStructuredOutline } from "./novelProductionHelpers";
import { novelProductionStatusService, type ProductionStatusResult } from "./NovelProductionStatusService";

interface NovelLlmOptions {
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
}

export class NovelProductionService {
  private readonly novelService = new NovelService();

  private readonly worldService = new WorldService();

  async generateWorldForNovel(input: {
    novelId: string;
    description?: string;
    worldType?: string;
  } & NovelLlmOptions) {
    const novel = await prisma.novel.findUnique({
      where: { id: input.novelId },
      include: {
        world: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    if (!novel) {
      throw new Error(getBackendMessage("production.error.novel_not_found"));
    }
    if (novel.world) {
      return {
        novelId: novel.id,
        worldId: novel.world.id,
        worldName: novel.world.name,
        reused: true,
        summary: getBackendMessage("production.world.reused", { worldName: novel.world.name }),
      };
    }

    const worldName = getBackendMessage("production.world.generated_name", { title: novel.title });
    const generatedAt = new Date();
    const { stream, onDone } = await this.worldService.createWorldGenerateStream({
      name: worldName,
      description: input.description?.trim()
        || novel.description?.trim()
        || getBackendMessage("production.world.generate_description_fallback", { title: novel.title }),
      worldType: input.worldType?.trim() || "custom",
      complexity: "standard",
      dimensions: {
        geography: true,
        culture: true,
        magicSystem: true,
        technology: true,
        history: true,
      },
      provider: input.provider,
      model: input.model,
    });
    const fullContent = await collectStream(stream);
    await onDone(fullContent);

    const world = await prisma.world.findFirst({
      where: {
        name: worldName,
        createdAt: {
          gte: generatedAt,
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
      },
    });
    if (!world) {
      throw new Error(getBackendMessage("production.world.generated_result_missing"));
    }
    return {
      novelId: novel.id,
      worldId: world.id,
      worldName: world.name,
      reused: false,
      summary: getBackendMessage("production.world.generated", {
        title: novel.title,
        worldName: world.name,
      }),
    };
  }

  async generateNovelCharacters(input: {
    novelId: string;
    description?: string;
    genre?: string;
    styleTone?: string;
    narrativePov?: "first_person" | "third_person" | "mixed";
    count?: number;
  } & NovelLlmOptions) {
    const novel = await prisma.novel.findUnique({
      where: { id: input.novelId },
      include: {
        world: {
          select: {
            id: true,
            name: true,
            description: true,
            background: true,
            conflicts: true,
            magicSystem: true,
          },
        },
        characters: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });
    if (!novel) {
      throw new Error(getBackendMessage("production.error.novel_not_found"));
    }
    if (novel.characters.length > 0) {
      return {
        novelId: novel.id,
        reused: true,
        characterCount: novel.characters.length,
        items: novel.characters,
        summary: getBackendMessage("production.characters.reused", {
          title: novel.title,
          characterCount: novel.characters.length,
        }),
      };
    }

    const desiredCount = Math.min(Math.max(input.count ?? 5, 3), 6);
    const result = await runStructuredPrompt({
      asset: novelProductionCharactersPrompt,
      promptInput: {
        desiredCount,
        title: novel.title,
        description: input.description?.trim()
          || novel.description?.trim()
          || getBackendMessage("production.characters.prompt.no_description"),
        genre: input.genre?.trim() || getBackendMessage("production.characters.prompt.unspecified"),
        narrativePov: input.narrativePov ?? getBackendMessage("production.characters.prompt.unspecified"),
        styleTone: input.styleTone?.trim() || getBackendMessage("production.characters.prompt.unspecified"),
        worldContext: novel.world
          ? `${novel.world.name}\n${novel.world.description ?? novel.world.background ?? ""}\n${novel.world.conflicts ?? ""}\n${novel.world.magicSystem ?? ""}`
          : getBackendMessage("production.characters.prompt.no_world"),
      },
      options: {
        provider: input.provider ?? "deepseek",
        model: input.model,
        temperature: input.temperature ?? 0.6,
      },
    });

    const parsed = result.output as Array<Record<string, unknown>>;
    const uniqueNames = new Set<string>();
    const created: Array<{ id: string; name: string; role: string }> = [];
    for (const item of parsed) {
      const name = typeof item.name === "string" ? item.name.trim() : "";
      const role = typeof item.role === "string" ? item.role.trim() : "";
      if (!name || !role || uniqueNames.has(name)) {
        continue;
      }
      uniqueNames.add(name);
      const character = await this.novelService.createCharacter(novel.id, {
        name,
        role,
        personality: typeof item.personality === "string" ? item.personality.trim() : undefined,
        background: typeof item.background === "string" ? item.background.trim() : undefined,
        development: typeof item.development === "string" ? item.development.trim() : undefined,
        currentState: typeof item.currentState === "string" ? item.currentState.trim() : undefined,
        currentGoal: typeof item.currentGoal === "string" ? item.currentGoal.trim() : undefined,
      });
      created.push({
        id: character.id,
        name: character.name,
        role: character.role,
      });
    }
    if (created.length === 0) {
      throw new Error(getBackendMessage("production.characters.empty_result"));
    }
    return {
      novelId: novel.id,
      reused: false,
      characterCount: created.length,
      items: created,
      summary: getBackendMessage("production.characters.generated", {
        title: novel.title,
        characterCount: created.length,
      }),
    };
  }

  async generateStoryBible(input: {
    novelId: string;
  } & NovelLlmOptions) {
    const { stream, onDone } = await this.novelService.createBibleStream(input.novelId, {
      provider: input.provider,
      model: input.model,
      temperature: input.temperature,
    });
    const fullContent = await collectStream(stream);
    await onDone(fullContent);
    const novel = await prisma.novel.findUnique({
      where: { id: input.novelId },
      include: {
        bible: true,
      },
    });
    if (!novel) {
      throw new Error(getBackendMessage("production.error.novel_not_found"));
    }
    return {
      novelId: novel.id,
      exists: Boolean(novel.bible),
      coreSetting: novel.bible?.coreSetting ?? null,
      mainPromise: novel.bible?.mainPromise ?? null,
      summary: getBackendMessage("production.story_bible.generated", { title: novel.title }),
    };
  }

  async generateNovelOutline(input: {
    novelId: string;
    description?: string;
  } & NovelLlmOptions) {
    const { stream, onDone } = await this.novelService.createOutlineStream(input.novelId, {
      provider: input.provider,
      model: input.model,
      temperature: input.temperature,
      initialPrompt: input.description,
    });
    const outline = await collectStream(stream);
    await onDone(outline);
    return {
      novelId: input.novelId,
      outline,
      outlineLength: outline.length,
      summary: getBackendMessage("production.outline.generated"),
    };
  }

  async generateStructuredOutline(input: {
    novelId: string;
    targetChapterCount?: number;
  } & NovelLlmOptions) {
    const targetChapterCount = input.targetChapterCount ?? 20;
    const { stream, onDone } = await this.novelService.createStructuredOutlineStream(input.novelId, {
      provider: input.provider,
      model: input.model,
      temperature: input.temperature,
      totalChapters: targetChapterCount,
    });
    const structuredOutline = await collectStream(stream);
    await onDone(structuredOutline);
    const chapterCount = await prisma.chapter.count({
      where: { novelId: input.novelId },
    });
    const novel = await prisma.novel.findUnique({
      where: { id: input.novelId },
      select: { structuredOutline: true },
    });
    return {
      novelId: input.novelId,
      chapterCount,
      targetChapterCount,
      structuredOutline: novel?.structuredOutline ?? structuredOutline,
      summary: getBackendMessage("production.structured_outline.generated", { targetChapterCount }),
    };
  }

  async syncChaptersFromStructuredOutline(novelId: string) {
    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
      select: {
        id: true,
        structuredOutline: true,
      },
    });
    if (!novel) {
      throw new Error(getBackendMessage("production.error.novel_not_found"));
    }
    if (!novel.structuredOutline?.trim()) {
      throw new Error(getBackendMessage("production.error.structured_outline_missing"));
    }
    const chapters = parseStructuredOutline(novel.structuredOutline);
    if (chapters.length === 0) {
      throw new Error(getBackendMessage("production.error.structured_outline_empty"));
    }

    const existing = await prisma.chapter.findMany({
      where: { novelId },
      select: { id: true, order: true },
    });
    const existingByOrder = new Map(existing.map((item) => [item.order, item.id]));
    let createdCount = 0;
    let updatedCount = 0;

    for (const chapter of chapters) {
      const existingId = existingByOrder.get(chapter.order);
      if (existingId) {
        await prisma.chapter.update({
          where: { id: existingId },
          data: {
            title: chapter.title,
            expectation: chapter.summary,
          },
        });
        updatedCount += 1;
      } else {
        await prisma.chapter.create({
          data: {
            novelId,
            title: chapter.title,
            order: chapter.order,
            content: "",
            expectation: chapter.summary,
            generationState: "planned",
          },
        });
        createdCount += 1;
      }
    }

    return {
      novelId,
      chapterCount: chapters.length,
      createdCount,
      updatedCount,
      summary: getBackendMessage("production.sync_chapters.generated", { chapterCount: chapters.length }),
    };
  }

  async startFullNovelPipeline(input: {
    novelId: string;
    startOrder?: number;
    endOrder?: number;
    maxRetries?: number;
    targetChapterCount?: number;
  } & NovelLlmOptions) {
    const chapterCount = await prisma.chapter.count({
      where: { novelId: input.novelId },
    });
    if (chapterCount === 0) {
      throw new Error(getBackendMessage("production.error.chapter_directory_missing"));
    }
    const startOrder = input.startOrder ?? 1;
    const endOrder = input.endOrder ?? Math.max(chapterCount, input.targetChapterCount ?? chapterCount);
    const job = await this.novelService.startPipelineJob(input.novelId, {
      startOrder,
      endOrder,
      maxRetries: input.maxRetries,
      provider: input.provider,
      model: input.model,
      temperature: input.temperature,
    });
    return {
      novelId: input.novelId,
      jobId: job.id,
      status: job.status,
      startOrder: job.startOrder,
      endOrder: job.endOrder,
      summary: getBackendMessage("production.pipeline.started", {
        startOrder: job.startOrder,
        endOrder: job.endOrder,
      }),
    };
  }

  getNovelProductionStatus(input: {
    novelId?: string;
    title?: string;
    targetChapterCount?: number;
  }): Promise<ProductionStatusResult> {
    return novelProductionStatusService.getNovelProductionStatus(input);
  }
}

export const novelProductionService = new NovelProductionService();
