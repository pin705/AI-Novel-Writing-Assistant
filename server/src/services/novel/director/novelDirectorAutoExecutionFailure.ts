import type { DirectorAutoExecutionState } from "@ai-novel/shared/types/novelDirector";
import { getBackendMessage, type BackendMessageKey } from "../../../i18n";

export function isSkippableAutoExecutionReviewFailure(message: string | null | undefined): boolean {
  const normalized = message?.trim() ?? "";
  return normalized.startsWith("Chapter generation is blocked until review is resolved.");
}

function formatAutoExecutionContinuation(input: Pick<
  DirectorAutoExecutionState,
  "remainingChapterCount" | "nextChapterOrder"
>): string {
  let key: BackendMessageKey;
  if (typeof input.remainingChapterCount === "number") {
    if (input.remainingChapterCount > 0) {
      key = typeof input.nextChapterOrder === "number"
        ? "workflow.review_skip.continuation.remaining_with_next"
        : "workflow.review_skip.continuation.remaining_without_next";
    } else {
      key = typeof input.nextChapterOrder === "number"
        ? "workflow.review_skip.continuation.none_with_next"
        : "workflow.review_skip.continuation.none_without_next";
    }
  } else {
    key = typeof input.nextChapterOrder === "number"
      ? "workflow.review_skip.continuation.unknown_with_next"
      : "workflow.review_skip.continuation.unknown_without_next";
  }
  return getBackendMessage(key, {
    remainingChapterCount: input.remainingChapterCount,
    nextChapterOrder: input.nextChapterOrder,
  });
}

function formatAutoExecutionActionLabel(
  autoExecution?: Pick<DirectorAutoExecutionState, "scopeLabel"> | null,
): string {
  const scopeLabel = autoExecution?.scopeLabel?.trim();
  return scopeLabel
    ? getBackendMessage("workflow.review_skip.action.with_scope", { scopeLabel })
    : getBackendMessage("workflow.review_skip.action.default");
}

export function buildSkippableAutoExecutionReviewFailureSummary(
  autoExecution?: Pick<DirectorAutoExecutionState, "remainingChapterCount" | "nextChapterOrder" | "scopeLabel"> | null,
): string {
  return getBackendMessage("workflow.review_skip.failure_summary", {
    actionLabel: formatAutoExecutionActionLabel(autoExecution),
    continuation: formatAutoExecutionContinuation({
      remainingChapterCount: autoExecution?.remainingChapterCount,
      nextChapterOrder: autoExecution?.nextChapterOrder,
    }),
  });
}

export function buildSkippableAutoExecutionReviewCheckpointSummary(input: {
  scopeLabel: string;
  autoExecution?: Pick<DirectorAutoExecutionState, "remainingChapterCount" | "nextChapterOrder"> | null;
}): string {
  return getBackendMessage("workflow.review_skip.checkpoint_summary", {
    scopeLabel: input.scopeLabel,
    continuation: formatAutoExecutionContinuation({
      remainingChapterCount: input.autoExecution?.remainingChapterCount,
      nextChapterOrder: input.autoExecution?.nextChapterOrder,
    }),
  });
}

export function buildSkippableAutoExecutionReviewBlockingReason(
  autoExecution?: Pick<DirectorAutoExecutionState, "nextChapterOrder" | "scopeLabel"> | null,
): string {
  const actionLabel = formatAutoExecutionActionLabel(autoExecution);
  if (typeof autoExecution?.nextChapterOrder === "number") {
    return getBackendMessage("workflow.review_skip.blocking_reason.with_next", {
      actionLabel,
      nextChapterOrder: autoExecution.nextChapterOrder,
    });
  }
  return getBackendMessage("workflow.review_skip.blocking_reason.without_next", {
    actionLabel,
  });
}

export function buildSkippableAutoExecutionReviewRecoveryHint(
  autoExecution?: Pick<DirectorAutoExecutionState, "nextChapterOrder" | "scopeLabel"> | null,
): string {
  const actionLabel = formatAutoExecutionActionLabel(autoExecution);
  if (typeof autoExecution?.nextChapterOrder === "number") {
    return getBackendMessage("workflow.review_skip.recovery_hint.with_next", {
      actionLabel,
      nextChapterOrder: autoExecution.nextChapterOrder,
    });
  }
  return getBackendMessage("workflow.review_skip.recovery_hint.without_next", {
    actionLabel,
  });
}
