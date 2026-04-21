import type { RequestHandler } from "express";
import { localizeApiJsonPayload } from "../i18n";

export const responseLocalizationMiddleware: RequestHandler = (_req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = ((body: unknown) => originalJson(localizeApiJsonPayload(body))) as typeof res.json;
  next();
};
