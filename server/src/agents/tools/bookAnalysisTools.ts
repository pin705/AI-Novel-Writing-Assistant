import { prisma } from "../../db/prisma";
import { getBackendMessage, translateBackendText } from "../../i18n";
import { resolveBookAnalysisProgressLabel } from "../../services/bookAnalysis/bookAnalysis.i18n";
import { AgentToolError, type AgentToolName } from "../types";
import type { AgentToolDefinition } from "./toolTypes";
import {
  bookAnalysisIdInputSchema,
  getBookAnalysisDetailOutputSchema,
  getBookAnalysisFailureReasonOutputSchema,
  listBookAnalysesInputSchema,
  listBookAnalysesOutputSchema,
} from "./bookAnalysisToolSchemas";

export const bookAnalysisToolDefinitions: Partial<
  Record<AgentToolName, AgentToolDefinition<Record<string, unknown>, Record<string, unknown>>>
> = {
  list_book_analyses: {
    name: "list_book_analyses",
    title: "列出拆书任务",
    description: "读取拆书分析任务列表、状态和最近错误。",
    category: "read",
    riskLevel: "low",
    domainAgent: "BookAnalysisAgent",
    resourceScopes: ["book_analysis", "knowledge_document", "task"],
    inputSchema: listBookAnalysesInputSchema,
    outputSchema: listBookAnalysesOutputSchema,
    execute: async (_context, rawInput) => {
      const input = listBookAnalysesInputSchema.parse(rawInput);
      const rows = await prisma.bookAnalysis.findMany({
        where: {
          ...(input.documentId ? { documentId: input.documentId } : {}),
          ...(input.status ? { status: input.status } : {}),
        },
        include: {
          document: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: input.limit ?? 20,
      });
      return listBookAnalysesOutputSchema.parse({
        items: rows.map((row) => ({
          id: row.id,
          title: row.title,
          documentId: row.documentId,
          documentTitle: row.document.title,
          status: row.status,
          progress: row.progress,
          currentStage: row.currentStage ?? null,
          lastError: row.lastError ? translateBackendText(row.lastError) : null,
          updatedAt: row.updatedAt.toISOString(),
        })),
        summary: `已读取 ${rows.length} 个拆书任务。`,
      });
    },
  },
  get_book_analysis_detail: {
    name: "get_book_analysis_detail",
    title: "读取拆书详情",
    description: "读取单个拆书任务的进度、章节数和最近状态。",
    category: "read",
    riskLevel: "low",
    domainAgent: "BookAnalysisAgent",
    resourceScopes: ["book_analysis", "knowledge_document"],
    inputSchema: bookAnalysisIdInputSchema,
    outputSchema: getBookAnalysisDetailOutputSchema,
    execute: async (_context, rawInput) => {
      const input = bookAnalysisIdInputSchema.parse(rawInput);
      const row = await prisma.bookAnalysis.findUnique({
        where: { id: input.analysisId },
        include: {
          document: {
            select: {
              id: true,
              title: true,
            },
          },
          sections: {
            select: { id: true },
          },
        },
      });
      if (!row) {
        throw new AgentToolError("NOT_FOUND", getBackendMessage("bookAnalysis.error.not_found"));
      }
      return getBookAnalysisDetailOutputSchema.parse({
        id: row.id,
        title: row.title,
        documentId: row.documentId,
        documentTitle: row.document.title,
        status: row.status,
        summary: row.summary ?? null,
        progress: row.progress,
        currentStage: row.currentStage ?? null,
        currentItemLabel: resolveBookAnalysisProgressLabel({
          stage: row.currentStage,
          itemKey: row.currentItemKey,
          fallbackLabel: row.currentItemLabel ? translateBackendText(row.currentItemLabel) : row.currentItemLabel,
        }),
        lastError: row.lastError ? translateBackendText(row.lastError) : null,
        sectionCount: row.sections.length,
        updatedAt: row.updatedAt.toISOString(),
      });
    },
  },
  get_book_analysis_failure_reason: {
    name: "get_book_analysis_failure_reason",
    title: "解释拆书失败原因",
    description: "解释拆书任务失败、阻塞或当前不可继续的原因。",
    category: "inspect",
    riskLevel: "low",
    domainAgent: "BookAnalysisAgent",
    resourceScopes: ["book_analysis", "task"],
    inputSchema: bookAnalysisIdInputSchema,
    outputSchema: getBookAnalysisFailureReasonOutputSchema,
    execute: async (_context, rawInput) => {
      const input = bookAnalysisIdInputSchema.parse(rawInput);
      const row = await prisma.bookAnalysis.findUnique({
        where: { id: input.analysisId },
      });
      if (!row) {
        throw new AgentToolError("NOT_FOUND", getBackendMessage("bookAnalysis.error.not_found"));
      }
      const translatedLastError = row.lastError ? translateBackendText(row.lastError) : null;
      const failureSummary = row.status === "failed"
        ? (translatedLastError?.trim() || getBackendMessage("task.bookAnalysis.failure.default"))
        : row.status === "cancelled"
          ? getBackendMessage("task.recovery.cancelled.default")
          : row.status === "running"
            ? getBackendMessage("task.recovery.running")
            : row.status === "queued"
              ? getBackendMessage("task.recovery.queued.default")
              : getBackendMessage("task.failureSummary.none");
      const recoveryHint = row.status === "failed"
        ? getBackendMessage("task.recovery.failed.book_analysis")
        : row.status === "running"
          ? getBackendMessage("task.recovery.running")
          : row.status === "queued"
            ? getBackendMessage("task.recovery.queued.default")
            : getBackendMessage("task.recovery.none");
      return getBookAnalysisFailureReasonOutputSchema.parse({
        analysisId: row.id,
        status: row.status,
        failureSummary,
        failureDetails: translatedLastError,
        recoveryHint,
        summary: failureSummary,
      });
    },
  },
};
