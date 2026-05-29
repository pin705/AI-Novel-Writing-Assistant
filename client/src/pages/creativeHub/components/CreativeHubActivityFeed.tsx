import type { CreativeHubStreamFrame } from "@ai-novel/shared/types/api";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/i18n";

type Translator = (key: string, values?: Record<string, string | number | undefined | null>) => string;

const STATUS_KEYS = new Set(["running", "queued", "waiting_approval", "succeeded", "failed", "cancelled", "interrupted"]);

function statusWord(status: string, t: Translator): string {
  if (STATUS_KEYS.has(status)) {
    return t(`creativeHub.activityFeed.statusLabel.${status}`);
  }
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

function renderBody(frame: CreativeHubStreamFrame, t: Translator): { title: string; summary: string; meta: string[] } {
  if (frame.event === "creative_hub/run_status") {
    return {
      title: t("creativeHub.activityFeed.runStatusTitle"),
      summary: frame.data.message
        || t("creativeHub.activityFeed.runStatusFallback", { status: statusWord(frame.data.status, t) }),
      meta: [statusWord(frame.data.status, t), frame.data.runId ? `Run ${frame.data.runId.slice(0, 8)}` : ""].filter(Boolean),
    };
  }
  if (frame.event === "creative_hub/tool_call") {
    return {
      title: t("creativeHub.activityFeed.toolCallTitle", { toolName: frame.data.toolName }),
      summary: frame.data.inputSummary || t("creativeHub.activityFeed.toolInputFallback"),
      meta: [frame.data.runId ? `Run ${frame.data.runId.slice(0, 8)}` : "", frame.data.stepId ? `Step ${frame.data.stepId.slice(0, 8)}` : ""].filter(Boolean),
    };
  }
  if (frame.event === "creative_hub/tool_result") {
    return {
      title: frame.data.success
        ? t("creativeHub.activityFeed.toolResultSuccessTitle", { toolName: frame.data.toolName })
        : t("creativeHub.activityFeed.toolResultFailedTitle", { toolName: frame.data.toolName }),
      summary: frame.data.outputSummary || t("creativeHub.activityFeed.toolOutputFallback"),
      meta: [
        frame.data.success ? t("creativeHub.common.successLabel") : t("creativeHub.common.failedLabel"),
        frame.data.runId ? `Run ${frame.data.runId.slice(0, 8)}` : "",
      ].filter(Boolean),
    };
  }
  if (frame.event === "creative_hub/interrupt") {
    return {
      title: frame.data.title || t("creativeHub.activityFeed.interruptTitleFallback"),
      summary: frame.data.summary,
      meta: [frame.data.targetType ? `${frame.data.targetType}:${frame.data.targetId ?? "-"}` : "", frame.data.runId ? `Run ${frame.data.runId.slice(0, 8)}` : ""].filter(Boolean),
    };
  }
  if (frame.event === "creative_hub/approval_resolved") {
    return {
      title: frame.data.action === "approved"
        ? t("creativeHub.activityFeed.approvedTitle")
        : t("creativeHub.activityFeed.rejectedTitle"),
      summary: frame.data.note?.trim() || t("creativeHub.activityFeed.approvalRecorded"),
      meta: [frame.data.approvalId ? `Approval ${frame.data.approvalId.slice(0, 8)}` : ""].filter(Boolean),
    };
  }
  if (frame.event === "creative_hub/error" || frame.event === "error") {
    return {
      title: t("creativeHub.activityFeed.errorTitle"),
      summary: frame.data.message,
      meta: [],
    };
  }
  if (frame.event === "metadata" && typeof frame.data.reasoning === "string") {
    return {
      title: t("creativeHub.activityFeed.reasoningTitle"),
      summary: frame.data.reasoning,
      meta: [],
    };
  }
  if (frame.event === "metadata" && typeof frame.data.planner === "object" && frame.data.planner) {
    const planner = frame.data.planner as Record<string, unknown>;
    return {
      title: t("creativeHub.activityFeed.plannerTitle"),
      summary: t("creativeHub.activityFeed.plannerSummary", {
        intent: String(planner.intent ?? t("creativeHub.common.unknown")),
        source: String(planner.source ?? t("creativeHub.common.unknown")),
      }),
      meta: [
        "confidence" in planner
          ? t("creativeHub.activityFeed.plannerConfidence", { value: String(planner.confidence ?? "-") })
          : "",
      ].filter(Boolean),
    };
  }
  if (frame.event === "metadata" && typeof frame.data.checkpointId === "string") {
    return {
      title: t("creativeHub.activityFeed.checkpointTitle"),
      summary: t("creativeHub.activityFeed.checkpointSummary", { value: frame.data.checkpointId.slice(0, 8) }),
      meta: [typeof frame.data.runId === "string" ? `Run ${frame.data.runId.slice(0, 8)}` : ""].filter(Boolean),
    };
  }
  return {
    title: t("creativeHub.activityFeed.fallbackEventTitle"),
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
}: CreativeHubActivityFeedProps) {
  const { t } = useTranslation();
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
        const body = renderBody(activity, t);
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
                <div className="mb-1 text-[11px] font-medium text-slate-500">{t("creativeHub.activityFeed.plannerTitle")}</div>
                <div>
                  {t("creativeHub.activityFeed.plannerSourceLabel")}:{" "}
                  {String((activity.data.planner as Record<string, unknown>).source ?? t("creativeHub.common.unknown"))}
                </div>
                <div>
                  {t("creativeHub.activityFeed.plannerIntentLabel")}:{" "}
                  {String((activity.data.planner as Record<string, unknown>).intent ?? t("creativeHub.common.unknown"))}
                </div>
                {"confidence" in (activity.data.planner as Record<string, unknown>) ? (
                  <div>
                    {t("creativeHub.activityFeed.plannerConfidenceLabel")}:{" "}
                    {String((activity.data.planner as Record<string, unknown>).confidence ?? "-")}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
