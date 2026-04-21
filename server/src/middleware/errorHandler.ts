import type { NextFunction, Request, Response } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import { ZodError } from "zod";
import { formatValidationIssue, getBackendLanguage, translateBackendText } from "../i18n";

export class AppError extends Error {
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

function joinErrorParts(parts: Array<string | undefined>): string {
  return parts.map((part) => part?.trim() ?? "").filter(Boolean).join(" | ");
}

function setRequestErrorMessage(
  res: Response<ApiResponse<null>>,
  error: string,
  detail?: string,
): void {
  res.locals.requestErrorMessage = joinErrorParts([
    translateBackendText(error),
    detail ? translateBackendText(detail) : undefined,
  ]);
}

function logServerError(req: Request, error: unknown): void {
  console.error(`[error] ${req.method} ${req.originalUrl}`, error);
}

function collectErrorMessages(error: unknown, depth = 0): string[] {
  if (!error || depth > 4) {
    return [];
  }
  if (error instanceof Error) {
    return [
      error.message,
      ...collectErrorMessages((error as Error & { cause?: unknown }).cause, depth + 1),
    ].filter(Boolean);
  }
  if (typeof error === "object") {
    const record = error as {
      message?: unknown;
      cause?: unknown;
    };
    return [
      typeof record.message === "string" ? record.message : "",
      ...collectErrorMessages(record.cause, depth + 1),
    ].filter(Boolean);
  }
  return [];
}

function findConnectionCause(error: unknown, depth = 0): {
  code?: string;
  host?: string;
  port?: number | string;
} | null {
  if (!error || depth > 6 || typeof error !== "object") {
    return null;
  }
  const record = error as {
    code?: unknown;
    host?: unknown;
    port?: unknown;
    cause?: unknown;
  };
  if (
    (typeof record.code === "string" && record.code.trim())
    || (typeof record.host === "string" && record.host.trim())
  ) {
    return {
      code: typeof record.code === "string" ? record.code : undefined,
      host: typeof record.host === "string" ? record.host : undefined,
      port: typeof record.port === "number" || typeof record.port === "string" ? record.port : undefined,
    };
  }
  return findConnectionCause(record.cause, depth + 1);
}

function formatUpstreamConnectionError(error: unknown): string | null {
  const joinedMessage = collectErrorMessages(error).join(" | ").trim();
  const isNetworkLike = /connection error|fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|tls/i
    .test(joinedMessage);
  if (!isNetworkLike) {
    return null;
  }
  const cause = findConnectionCause(error);
  const target = cause?.host
    ? `${cause.host}${cause.port ? `:${cause.port}` : ""}`
    : "上游模型服务";
  const code = cause?.code ? `（${cause.code}）` : "";
  const language = getBackendLanguage();
  if (language === "en") {
    return `Upstream model service connection failed: this server cannot reach ${target}${code}. Check that provider's network connectivity or switch to another available provider.`;
  }
  if (language === "zh") {
    return `上游模型服务连接失败：当前服务器无法连接到 ${target}${code}。请检查该提供商的网络连通性，或切换到其它可用模型提供商。`;
  }
  return `Kết nối tới dịch vụ mô hình phía trên thất bại: máy chủ hiện không thể kết nối tới ${target}${code}. Hãy kiểm tra kết nối mạng của nhà cung cấp này hoặc chuyển sang nhà cung cấp mô hình khác đang khả dụng.`;
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response<ApiResponse<null>>,
  _next: NextFunction,
): void {
  if (
    error
    && typeof error === "object"
    && "type" in error
    && (error as { type?: string }).type === "entity.too.large"
  ) {
    const localizedError = translateBackendText("请求体过大，请缩短文本或分段上传。");
    setRequestErrorMessage(res, localizedError);
    res.status(413).json({
      success: false,
      error: localizedError,
    });
    return;
  }

  if (error instanceof ZodError) {
    const detail = error.issues.map((issue) => formatValidationIssue(issue)).join(" ");
    const localizedError = translateBackendText("请求参数校验失败。");
    setRequestErrorMessage(res, localizedError, detail);
    res.status(400).json({
      success: false,
      error: localizedError,
      message: detail,
    });
    return;
  }

  if (error instanceof AppError) {
    const localizedError = translateBackendText(error.message);
    const detail = typeof error.details === "string" ? translateBackendText(error.details) : undefined;
    setRequestErrorMessage(res, localizedError, detail);
    if (error.statusCode >= 500) {
      logServerError(req, error);
    }
    res.status(error.statusCode).json({
      success: false,
      error: localizedError,
      message: detail,
    });
    return;
  }

  const message = translateBackendText(error instanceof Error ? error.message : "服务器发生未知错误。");
  const upstreamConnectionMessage = formatUpstreamConnectionError(error);
  if (upstreamConnectionMessage) {
    setRequestErrorMessage(res, upstreamConnectionMessage);
    logServerError(req, error);
    res.status(502).json({
      success: false,
      error: upstreamConnectionMessage,
    });
    return;
  }

  setRequestErrorMessage(res, message);
  logServerError(req, error);
  res.status(500).json({
    success: false,
    error: message,
  });
}
