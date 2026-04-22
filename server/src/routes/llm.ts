import { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { getBackendMessage } from "../i18n";
import { llmConnectivityService } from "../llm/connectivity";
import { getStructuredFallbackSettings, saveStructuredFallbackSettings } from "../llm/structuredFallbackSettings";
import { getProviderModels } from "../llm/modelCatalog";
import { listModelRouteConfigs, MODEL_ROUTE_TASK_TYPES, upsertModelRouteConfig } from "../llm/modelRouter";
import { llmProviderSchema } from "../llm/providerSchema";
import { getProviderEnvApiKey, getProviderEnvModel, isBuiltInProvider, PROVIDERS } from "../llm/providers";
import { authMiddleware } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { validate } from "../middleware/validate";

const router = Router();

const llmTestSchema = z.object({
  provider: llmProviderSchema,
  apiKey: z.string().trim().optional(),
  model: z.string().trim().optional(),
  baseURL: z.string().trim().url("validation.api_url_invalid").optional(),
  probeMode: z.enum(["plain", "structured", "both"]).optional(),
});

const structuredFallbackSchema = z.object({
  enabled: z.boolean().optional(),
  provider: z.string().trim().min(1).optional(),
  model: z.string().trim().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.union([z.number().int().min(64).max(32768), z.null()]).optional(),
});

router.use(authMiddleware);

router.get("/providers", async (_req, res, next) => {
  try {
    const keys = await prisma.aPIKey.findMany({
      orderBy: [{ createdAt: "asc" }],
    });
    const keyMap = new Map(keys.map((item) => [item.provider, item]));

    const builtInEntries = await Promise.all(
      Object.entries(PROVIDERS).map(async ([provider, config]) => {
        const keyConfig = keyMap.get(provider);
        const currentModel = keyConfig?.model?.trim()
          || getProviderEnvModel(provider)
          || config.defaultModel;
        const models = await getProviderModels(provider, {
          apiKey: keyConfig?.key ?? getProviderEnvApiKey(provider),
          baseURL: keyConfig?.baseURL ?? undefined,
          fallbackModel: currentModel,
          fallbackModels: [...config.models, currentModel],
        });
        return [provider, {
          name: config.name,
          defaultModel: currentModel,
          models,
        }] as const;
      }),
    );

    const customEntries = await Promise.all(
      keys
        .filter((item) => !isBuiltInProvider(item.provider))
        .map(async (item) => {
          const currentModel = item.model?.trim() || "";
          const models = await getProviderModels(item.provider, {
            apiKey: item.key ?? undefined,
            baseURL: item.baseURL ?? undefined,
            fallbackModel: currentModel,
            fallbackModels: [currentModel],
          });
          return [item.provider, {
            name: item.displayName?.trim() || item.provider,
            defaultModel: currentModel,
            models,
          }] as const;
        }),
    );

    const data = Object.fromEntries([...builtInEntries, ...customEntries]);
    const response: ApiResponse<typeof data> = {
      success: true,
      data,
      message: getBackendMessage("llm.route.providers.loaded"),
    };
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

router.get("/model-routes", async (_req, res, next) => {
  try {
    const data = {
      taskTypes: MODEL_ROUTE_TASK_TYPES,
      routes: await listModelRouteConfigs(),
    };
    res.status(200).json({
      success: true,
      data,
      message: getBackendMessage("llm.route.model_routes.loaded"),
    } satisfies ApiResponse<typeof data>);
  } catch (error) {
    next(error);
  }
});

router.post("/model-routes/connectivity", async (_req, res, next) => {
  try {
    const data = await llmConnectivityService.testModelRoutes();
    res.status(200).json({
      success: true,
      data,
      message: getBackendMessage("llm.route.model_routes.connectivity_completed"),
    } satisfies ApiResponse<typeof data>);
  } catch (error) {
    next(error);
  }
});

router.get("/structured-fallback", async (_req, res, next) => {
  try {
    const data = await getStructuredFallbackSettings();
    res.status(200).json({
      success: true,
      data,
      message: getBackendMessage("llm.route.structured_fallback.loaded"),
    } satisfies ApiResponse<typeof data>);
  } catch (error) {
    next(error);
  }
});

router.put(
  "/structured-fallback",
  validate({ body: structuredFallbackSchema }),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof structuredFallbackSchema>;
      if ((body.enabled ?? false) && (!body.provider || !body.model)) {
        throw new AppError("validation.structured_fallback_requires_provider_model", 400);
      }
      const data = await saveStructuredFallbackSettings(body);
      res.status(200).json({
        success: true,
        data,
        message: getBackendMessage("llm.route.structured_fallback.updated"),
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  },
);

const modelRouteUpsertSchema = z.object({
  taskType: z.string().trim().min(1),
  provider: z.string().trim().min(1),
  model: z.string().trim().min(1),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.union([z.number().int().min(64).max(16384), z.null()]).optional(),
});

router.put(
  "/model-routes",
  validate({ body: modelRouteUpsertSchema }),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof modelRouteUpsertSchema>;
      await upsertModelRouteConfig(body.taskType, {
        provider: body.provider,
        model: body.model,
        temperature: body.temperature,
        maxTokens: body.maxTokens ?? null,
      });
      res.status(200).json({
        success: true,
        message: getBackendMessage("llm.route.model_routes.updated"),
      } satisfies ApiResponse<null>);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/test",
  validate({ body: llmTestSchema }),
  async (req, res, next) => {
    try {
      const { provider, apiKey, model, baseURL, probeMode } = req.body as z.infer<typeof llmTestSchema>;
      const result = await llmConnectivityService.testConnection({ provider, apiKey, model, baseURL, probeMode });
      const shouldFail =
        probeMode === "structured"
          ? result.structured?.ok === false
          : probeMode === "plain"
            ? result.plain?.ok === false
            : result.plain?.ok === false && result.structured?.ok === false;
      if (shouldFail) {
        if (result.errorCode && result.errorCode !== "PROBE_FAILED") {
          next(new AppError(result.error ?? "llm.error.provider_api_key_missing", 400));
          return;
        }
        next(new AppError("llm.error.connectivity_test_failed", 400, result.error ?? undefined));
        return;
      }
      const response: ApiResponse<{
        success: boolean;
        model: string;
        latency: number;
        plain: typeof result.plain;
        structured: typeof result.structured;
      }> = {
        success: true,
        data: {
          success: result.ok || result.structured?.ok === true,
          model: result.model,
          latency: result.latency ?? 0,
          plain: result.plain,
          structured: result.structured,
        },
        message: getBackendMessage("llm.route.connectivity_test.completed"),
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
