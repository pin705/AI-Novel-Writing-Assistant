import type { RagJobSummary } from "@/api/knowledge";
import { t } from "@/i18n";


export function formatStatus(status: string): string {
  switch (status) {
    case "enabled":
      return t("已启用");
    case "disabled":
      return t("已停用");
    case "archived":
      return t("已归档");
    case "queued":
      return t("排队中");
    case "running":
      return t("执行中");
    case "succeeded":
      return t("成功");
    case "failed":
      return t("失败");
    default:
      return status;
  }
}

export function getRagJobProgressPercent(job: RagJobSummary): number {
  const raw = job.progress?.percent ?? (job.status === "succeeded" ? 1 : 0);
  return Math.max(0, Math.min(100, Math.round(raw * 100)));
}

export function getRagJobProgressWidth(job: RagJobSummary): string {
  const percent = getRagJobProgressPercent(job);
  if (job.status === "queued" || job.status === "running") {
    return `${Math.max(percent, 6)}%`;
  }
  return `${percent}%`;
}

export function formatRagJobMeta(job: RagJobSummary): string {
  const parts = [job.jobType, t("尝试 {{attempts}}/{{maxAttempts}}", { attempts: job.attempts, maxAttempts: job.maxAttempts })];
  if (job.progress?.current !== undefined && job.progress?.total !== undefined && job.progress.total > 0) {
    parts.push(`${job.progress.current}/${job.progress.total}`);
  }
  if (job.progress?.chunks) {
    parts.push(t("{{chunks}} 分块", { chunks: job.progress.chunks }));
  }
  if (job.progress?.documents) {
    parts.push(t("{{documents}} 文档", { documents: job.progress.documents }));
  }
  return parts.join(" | ");
}
