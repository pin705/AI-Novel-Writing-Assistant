import type { TaskKind, TaskStatus } from "@ai-novel/shared/types/task";
import {
  extractStructuredOutputErrorCategory,
} from "../../llm/structuredOutput";
import { getBackendMessage } from "../../i18n";
import { summarizeStructuredOutputFailure } from "../../llm/structuredInvoke";

export function normalizeFailureSummary(
  summary?: string | null,
  fallback = getBackendMessage("task.failureSummary.none"),
): string {
  return summary?.trim() || fallback;
}

export function resolveStructuredFailureSummary(summary?: string | null): {
  failureCode: string | null;
  failureSummary: string | null;
} {
  if (!summary?.trim()) {
    return {
      failureCode: null,
      failureSummary: null,
    };
  }
  const category = extractStructuredOutputErrorCategory(summary);
  if (!category) {
    return {
      failureCode: null,
      failureSummary: null,
    };
  }
  const details = summarizeStructuredOutputFailure({
    error: summary,
    fallbackAvailable: false,
  });
  return {
    failureCode: details.failureCode,
    failureSummary: details.summary,
  };
}

export function isArchivableTaskStatus(status: TaskStatus): boolean {
  return status === "succeeded" || status === "failed" || status === "cancelled";
}

export function buildTaskRecoveryHint(kind: TaskKind, status: TaskStatus): string {
  if (status === "failed") {
    if (kind === "knowledge_document") {
      return getBackendMessage("task.recovery.failed.knowledge_document");
    }
    if (kind === "agent_run") {
      return getBackendMessage("task.recovery.failed.agent_run");
    }
    if (kind === "novel_workflow") {
      return getBackendMessage("task.recovery.failed.novel_workflow");
    }
    if (kind === "novel_pipeline") {
      return getBackendMessage("task.recovery.failed.novel_pipeline");
    }
    if (kind === "book_analysis") {
      return getBackendMessage("task.recovery.failed.book_analysis");
    }
    return getBackendMessage("task.recovery.failed.default");
  }
  if (status === "waiting_approval") {
    if (kind === "novel_workflow") {
      return getBackendMessage("task.recovery.waiting_approval.novel_workflow");
    }
    return getBackendMessage("task.recovery.waiting_approval.default");
  }
  if (status === "running") {
    return getBackendMessage("task.recovery.running");
  }
  if (status === "queued") {
    if (kind === "knowledge_document") {
      return getBackendMessage("task.recovery.queued.knowledge_document");
    }
    return getBackendMessage("task.recovery.queued.default");
  }
  if (status === "cancelled") {
    if (kind === "knowledge_document") {
      return getBackendMessage("task.recovery.cancelled.knowledge_document");
    }
    if (kind === "novel_workflow") {
      return getBackendMessage("task.recovery.cancelled.novel_workflow");
    }
    return getBackendMessage("task.recovery.cancelled.default");
  }
  return getBackendMessage("task.recovery.none");
}
