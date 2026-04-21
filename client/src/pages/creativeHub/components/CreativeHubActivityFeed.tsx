import type { CreativeHubStreamFrame } from "@ai-novel/shared/types/api";
import { Badge } from "@/components/ui/badge";

function toStatusLabel(status: string): string {
  if (status === "running") return "Đang chạy";
  if (status === "queued") return "Đang xếp hàng";
  if (status === "waiting_approval") return "Chờ duyệt";
  if (status === "succeeded") return "Đã hoàn tất";
  if (status === "failed") return "Thất bại";
  if (status === "cancelled") return "Đã hủy";
  return status;
}

function toVariant(frame: CreativeHubStreamFrame): "default" | "secondary" | "outline" | "destructive" {
  if (frame.event === "creative_hub/error" || frame.event === "error") {
    return "destructive";
  }
  if (frame.event === "creative_hub/interrupt") {
    return "secondary";
  }
  if (frame.event === "creative_hub/run_status" && frame.data.status === "failed") {
    return "destructive";
  }
  if (frame.event === "creative_hub/run_status" && frame.data.status === "waiting_approval") {
    return "secondary";
  }
  return "outline";
}

export function getActivityRunId(frame: CreativeHubStreamFrame): string | null {
  if (
    frame.event === "creative_hub/run_status"
    || frame.event === "creative_hub/tool_call"
    || frame.event === "creative_hub/tool_result"
  ) {
    return typeof frame.data.runId === "string" && frame.data.runId.trim()
      ? frame.data.runId
      : null;
  }
  if (frame.event === "creative_hub/interrupt") {
    return typeof frame.data.runId === "string" && frame.data.runId.trim()
      ? frame.data.runId
      : null;
  }
  return null;
}

function renderBody(frame: CreativeHubStreamFrame): { title: string; summary: string; meta: string[] } {
  if (frame.event === "creative_hub/run_status") {
    return {
      title: "Trạng thái chạy",
      summary: frame.data.message || `Trạng thái hiện tại: ${toStatusLabel(frame.data.status)}`,
      meta: [toStatusLabel(frame.data.status), frame.data.runId ? `Run ${frame.data.runId.slice(0, 8)}` : ""].filter(Boolean),
    };
  }
  if (frame.event === "creative_hub/tool_call") {
    return {
      title: `Gọi công cụ · ${frame.data.toolName}`,
      summary: frame.data.inputSummary || "Đang chuẩn bị đầu vào cho công cụ.",
      meta: [frame.data.runId ? `Run ${frame.data.runId.slice(0, 8)}` : "", frame.data.stepId ? `Step ${frame.data.stepId.slice(0, 8)}` : ""].filter(Boolean),
    };
  }
  if (frame.event === "creative_hub/tool_result") {
    return {
      title: `${frame.data.toolName} ${frame.data.success ? "thực thi thành công" : "thực thi thất bại"}`,
      summary: frame.data.outputSummary || "Công cụ trả về kết quả rỗng.",
      meta: [frame.data.success ? "Thành công" : "Thất bại", frame.data.runId ? `Run ${frame.data.runId.slice(0, 8)}` : ""].filter(Boolean),
    };
  }
  if (frame.event === "creative_hub/interrupt") {
    return {
      title: frame.data.title || "Chờ duyệt",
      summary: frame.data.summary,
      meta: [frame.data.targetType ? `${frame.data.targetType}:${frame.data.targetId ?? "-"}` : "", frame.data.runId ? `Run ${frame.data.runId.slice(0, 8)}` : ""].filter(Boolean),
    };
  }
  if (frame.event === "creative_hub/approval_resolved") {
    return {
      title: frame.data.action === "approved" ? "Đã duyệt" : "Đã từ chối duyệt",
      summary: frame.data.note?.trim() || "Hành động duyệt hiện đã được ghi lại.",
      meta: [frame.data.approvalId ? `Approval ${frame.data.approvalId.slice(0, 8)}` : ""].filter(Boolean),
    };
  }
  if (frame.event === "creative_hub/error" || frame.event === "error") {
    return {
      title: "Lỗi chạy",
      summary: frame.data.message,
      meta: [],
    };
  }
  if (frame.event === "metadata" && typeof frame.data.reasoning === "string") {
    return {
      title: "Cập nhật suy luận",
      summary: frame.data.reasoning,
      meta: [],
    };
  }
  if (frame.event === "metadata" && typeof frame.data.planner === "object" && frame.data.planner) {
    const planner = frame.data.planner as Record<string, unknown>;
    return {
      title: "Nhận diện ý định",
      summary: `Yêu cầu này được nhận diện là ${String(planner.intent ?? "unknown")}, nguồn ${String(planner.source ?? "unknown")}`,
      meta: [
        "confidence" in planner ? `Độ tin cậy ${String(planner.confidence ?? "-")}` : "",
      ].filter(Boolean),
    };
  }
  if (frame.event === "metadata" && typeof frame.data.checkpointId === "string") {
    return {
      title: "Đã lưu checkpoint",
      summary: `Checkpoint ${frame.data.checkpointId.slice(0, 8)} đã được ghi lại vào lịch sử luồng.`,
      meta: [typeof frame.data.runId === "string" ? `Run ${frame.data.runId.slice(0, 8)}` : ""].filter(Boolean),
    };
  }
  return {
    title: "Sự kiện hệ thống",
    summary: "",
    meta: [],
  };
}

export function isRenderableActivity(frame: CreativeHubStreamFrame): boolean {
  if (
    frame.event === "creative_hub/run_status"
    || frame.event === "creative_hub/approval_resolved"
    || frame.event === "creative_hub/error"
    || frame.event === "error"
  ) {
    return true;
  }
  if (frame.event === "metadata") {
    return typeof frame.data.reasoning === "string"
      || typeof frame.data.checkpointId === "string"
      || (typeof frame.data.planner === "object" && frame.data.planner !== null);
  }
  return false;
}

interface CreativeHubActivityFeedProps {
  activities: CreativeHubStreamFrame[];
  onQuickAction?: (prompt: string) => void;
}

export default function CreativeHubActivityFeed({
  activities,
  onQuickAction,
}: CreativeHubActivityFeedProps) {
  if (activities.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {activities.slice(-8).map((activity, index) => {
        if (
          activity.event === "creative_hub/tool_call"
          || activity.event === "creative_hub/tool_result"
          || activity.event === "creative_hub/interrupt"
        ) {
          return null;
        }
        const body = renderBody(activity);
        if (!body.summary && !body.meta.length) {
          return null;
        }
        return (
          <div
            key={`${activity.event}-${index}`}
            className="mr-auto max-w-[92%] rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium text-slate-900">{body.title}</div>
              <Badge variant={toVariant(activity)}>{activity.event.replace("creative_hub/", "")}</Badge>
            </div>
            <div className="mt-2 text-xs leading-5 text-slate-700">{body.summary}</div>
            {body.meta.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {body.meta.map((item) => (
                  <span key={item} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
            {activity.event === "metadata"
            && typeof activity.data === "object"
            && activity.data
            && "planner" in activity.data
            && activity.data.planner
            && typeof activity.data.planner === "object" ? (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                <div className="mb-1 text-[11px] font-medium text-slate-500">Nhận diện ý định</div>
                <div>Nguồn: {String((activity.data.planner as Record<string, unknown>).source ?? "unknown")}</div>
                <div>Ý định: {String((activity.data.planner as Record<string, unknown>).intent ?? "unknown")}</div>
                {"confidence" in (activity.data.planner as Record<string, unknown>) ? (
                  <div>Độ tin cậy: {String((activity.data.planner as Record<string, unknown>).confidence ?? "-")}</div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
