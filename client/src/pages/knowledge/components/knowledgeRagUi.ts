import type { RagJobSummary } from "@/api/knowledge";

export function formatStatus(status: string): string {
  switch (status) {
    case "enabled":
      return "Đã bật";
    case "disabled":
      return "Đã tắt";
    case "archived":
      return "Đã lưu trữ";
    case "queued":
      return "Đang xếp hàng";
    case "running":
      return "Đang chạy";
    case "succeeded":
      return "Thành công";
    case "failed":
      return "Thất bại";
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
  const parts = [job.jobType, `Lần thử ${job.attempts}/${job.maxAttempts}`];
  if (job.progress?.current !== undefined && job.progress?.total !== undefined && job.progress.total > 0) {
    parts.push(`${job.progress.current}/${job.progress.total}`);
  }
  if (job.progress?.chunks) {
    parts.push(`${job.progress.chunks} phân đoạn`);
  }
  if (job.progress?.documents) {
    parts.push(`${job.progress.documents} tài liệu`);
  }
  return parts.join(" | ");
}
