import type {
  AuditReport,
  QualityScore,
  ReplanRecommendation,
  ReviewIssue,
} from "@ai-novel/shared/types/novel";

export interface ChapterReviewResult {
  score: QualityScore;
  issues: ReviewIssue[];
  auditReports?: AuditReport[];
  replanRecommendation?: ReplanRecommendation;
}

export function buildReplanRecommendationFromAuditReports(
  auditReports: AuditReport[] | null | undefined,
): ReplanRecommendation | null {
  if (!auditReports || auditReports.length === 0) {
    return null;
  }

  const blockingIssueIds = auditReports
    .flatMap((report) => report.issues)
    .filter((issue) => issue.status === "open" && (issue.severity === "high" || issue.severity === "critical"))
    .map((issue) => issue.id);

  return {
    recommended: blockingIssueIds.length > 0,
    reason: blockingIssueIds.length > 0
      ? "Vẫn còn vấn đề kiểm tra mức ưu tiên cao chưa xử lý, nên quy hoạch lại các chương tiếp theo."
      : "Hiện không có vấn đề kiểm tra mang tính chặn, chưa cần quy hoạch lại các chương tiếp theo.",
    blockingIssueIds,
  };
}
