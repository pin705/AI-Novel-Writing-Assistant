import type { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import { z } from "zod";
import { getBackendMessage } from "../i18n";
import { validate } from "../middleware/validate";
import type { NovelService } from "../services/novel/NovelService";

interface RegisterNovelChapterEditorRoutesInput {
  router: Router;
  novelService: NovelService;
  chapterParamsSchema: z.ZodType<{ id: string; chapterId: string }>;
  rewritePreviewSchema: z.ZodTypeAny;
  aiRevisionPreviewSchema: z.ZodTypeAny;
  forwardBusinessError: (error: unknown, next: (err?: unknown) => void) => boolean;
}

export function registerNovelChapterEditorRoutes(input: RegisterNovelChapterEditorRoutesInput): void {
  const {
    router,
    novelService,
    chapterParamsSchema,
    rewritePreviewSchema,
    aiRevisionPreviewSchema,
    forwardBusinessError,
  } = input;

  router.get(
    "/:id/chapters/:chapterId/editor/workspace",
    validate({ params: chapterParamsSchema }),
    async (req, res, next) => {
      try {
        const { id, chapterId } = req.params as z.infer<typeof chapterParamsSchema>;
        const data = await novelService.getChapterEditorWorkspace(id, chapterId);
        res.status(200).json({
          success: true,
          data,
          message: getBackendMessage("novel.chapter_editor.route.workspace.loaded"),
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        if (forwardBusinessError(error, next)) {
          return;
        }
        next(error);
      }
    },
  );

  router.post(
    "/:id/chapters/:chapterId/editor/ai-revision-preview",
    validate({ params: chapterParamsSchema, body: aiRevisionPreviewSchema }),
    async (req, res, next) => {
      try {
        const { id, chapterId } = req.params as z.infer<typeof chapterParamsSchema>;
        const data = await novelService.previewChapterAiRevision(id, chapterId, req.body as any);
        res.status(200).json({
          success: true,
          data,
          message: getBackendMessage("novel.chapter_editor.route.ai_revision_preview.generated"),
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        if (forwardBusinessError(error, next)) {
          return;
        }
        next(error);
      }
    },
  );

  router.post(
    "/:id/chapters/:chapterId/editor/rewrite-preview",
    validate({ params: chapterParamsSchema, body: rewritePreviewSchema }),
    async (req, res, next) => {
      try {
        const { id, chapterId } = req.params as z.infer<typeof chapterParamsSchema>;
        const data = await novelService.previewChapterRewrite(id, chapterId, req.body as any);
        res.status(200).json({
          success: true,
          data,
          message: getBackendMessage("novel.chapter_editor.route.rewrite_preview.generated"),
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        if (forwardBusinessError(error, next)) {
          return;
        }
        next(error);
      }
    },
  );
}
