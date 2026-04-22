import type { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import { z } from "zod";
import { getBackendMessage } from "../i18n";
import { validate } from "../middleware/validate";
import type { NovelService } from "../services/novel/NovelService";

interface RegisterNovelPlanningRoutesInput {
  router: Router;
  novelService: NovelService;
  idParamsSchema: z.ZodType<{ id: string }>;
  chapterParamsSchema: z.ZodType<{ id: string; chapterId: string }>;
  arcPlanParamsSchema: z.ZodType<{ id: string; arcId: string }>;
  llmGenerateSchema: z.ZodTypeAny;
  replanSchema: z.ZodTypeAny;
}

export function registerNovelPlanningRoutes(input: RegisterNovelPlanningRoutesInput): void {
  const {
    router,
    novelService,
    idParamsSchema,
    chapterParamsSchema,
    arcPlanParamsSchema,
    llmGenerateSchema,
    replanSchema,
  } = input;
  const payoffLedgerQuerySchema = z.object({
    chapterOrder: z.coerce.number().int().positive().optional(),
  });

  router.get("/:id/state", validate({ params: idParamsSchema }), async (req, res, next) => {
    try {
      const { id } = req.params as z.infer<typeof idParamsSchema>;
      const data = await novelService.getNovelState(id);
      res.status(200).json({
        success: true,
        data,
        message: getBackendMessage("novel.planning.route.state.loaded"),
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id/state-snapshots/latest", validate({ params: idParamsSchema }), async (req, res, next) => {
    try {
      const { id } = req.params as z.infer<typeof idParamsSchema>;
      const data = await novelService.getLatestStateSnapshot(id);
      res.status(200).json({
        success: true,
        data,
        message: getBackendMessage("novel.planning.route.state_snapshot.latest.loaded"),
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  });

  router.get(
    "/:id/payoff-ledger",
    validate({ params: idParamsSchema, query: payoffLedgerQuerySchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const { chapterOrder } = req.query as z.infer<typeof payoffLedgerQuerySchema>;
        const data = await novelService.getPayoffLedger(id, chapterOrder);
        res.status(200).json({
          success: true,
          data,
          message: getBackendMessage("novel.planning.route.payoff_ledger.loaded"),
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/:id/chapters/:chapterId/state-snapshot",
    validate({ params: chapterParamsSchema }),
    async (req, res, next) => {
      try {
        const { id, chapterId } = req.params as z.infer<typeof chapterParamsSchema>;
        const data = await novelService.getChapterStateSnapshot(id, chapterId);
        res.status(200).json({
          success: true,
          data,
          message: getBackendMessage("novel.planning.route.chapter_state_snapshot.loaded"),
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/state/rebuild",
    validate({ params: idParamsSchema, body: llmGenerateSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const data = await novelService.rebuildNovelState(id, req.body as any);
        res.status(200).json({
          success: true,
          data,
          message: getBackendMessage("novel.planning.route.state.rebuilt"),
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/plans/book/generate",
    validate({ params: idParamsSchema, body: llmGenerateSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const data = await novelService.generateBookPlan(id, req.body as any);
        res.status(200).json({
          success: true,
          data,
          message: getBackendMessage("novel.planning.route.book_plan.generated"),
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/plans/arcs/:arcId/generate",
    validate({ params: arcPlanParamsSchema, body: llmGenerateSchema }),
    async (req, res, next) => {
      try {
        const { id, arcId } = req.params as z.infer<typeof arcPlanParamsSchema>;
        const data = await novelService.generateArcPlan(id, arcId, req.body as any);
        res.status(200).json({
          success: true,
          data,
          message: getBackendMessage("novel.planning.route.arc_plan.generated"),
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/chapters/:chapterId/plan/generate",
    validate({ params: chapterParamsSchema, body: llmGenerateSchema }),
    async (req, res, next) => {
      try {
        const { id, chapterId } = req.params as z.infer<typeof chapterParamsSchema>;
        const data = await novelService.generateChapterPlan(
          id,
          chapterId,
          req.body as any,
        );
        res.status(200).json({
          success: true,
          data,
          message: getBackendMessage("novel.planning.route.chapter_plan.generated"),
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/:id/chapters/:chapterId/plan",
    validate({ params: chapterParamsSchema }),
    async (req, res, next) => {
      try {
        const { id, chapterId } = req.params as z.infer<typeof chapterParamsSchema>;
        const data = await novelService.getChapterPlan(id, chapterId);
        res.status(200).json({
          success: true,
          data,
          message: getBackendMessage("novel.planning.route.chapter_plan.loaded"),
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/replan",
    validate({ params: idParamsSchema, body: replanSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const data = await novelService.replanNovel(id, req.body as any);
        res.status(200).json({
          success: true,
          data,
          message: getBackendMessage("novel.planning.route.replan.completed"),
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );
}
