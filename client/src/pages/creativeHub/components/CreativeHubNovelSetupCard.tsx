import type { CreativeHubNovelSetupStatus } from "@ai-novel/shared/types/creativeHub";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";

interface CreativeHubNovelSetupCardProps {
  setup: CreativeHubNovelSetupStatus;
  onQuickAction?: (prompt: string) => void;
}

function stageLabelKey(stage: CreativeHubNovelSetupStatus["stage"]): string {
  switch (stage) {
    case "ready_for_production":
      return "creativeHub.novelSetup.stage.readyForProduction";
    case "ready_for_planning":
      return "creativeHub.novelSetup.stage.readyForPlanning";
    default:
      return "creativeHub.novelSetup.stage.default";
  }
}

function itemTone(status: "missing" | "partial" | "ready"): string {
  switch (status) {
    case "ready":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "partial":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

export default function CreativeHubNovelSetupCard({
  setup,
  onQuickAction,
}: CreativeHubNovelSetupCardProps) {
  const { t } = useTranslation();
  const pendingItems = setup.checklist.filter((item) => item.status !== "ready");
  const pendingNames = pendingItems.slice(0, 4).map((item) => item.label).join(t("creativeHub.novelSetup.pendingNamesSeparator"));
  const pendingEnding = pendingItems.length > 4 ? t("creativeHub.novelSetup.pendingEnding") : "";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-slate-500">{t("creativeHub.novelSetup.title")}</div>
        <Badge variant="outline">{t(stageLabelKey(setup.stage))}</Badge>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-slate-900">{setup.title}</div>
            <div className="mt-1 text-xs text-slate-500">
              {t("creativeHub.novelSetup.progressLabel", {
                completed: setup.completedCount,
                total: setup.totalCount,
              })}
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-slate-900">
              {t("creativeHub.novelSetup.progressFormat", { percent: setup.completionRatio })}
            </div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
              {t("creativeHub.novelSetup.progressBadge")}
            </div>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-slate-900 transition-all"
            style={{ width: `${setup.completionRatio}%` }}
          />
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        {setup.checklist.map((item) => (
          <div
            key={item.key}
            className={cn("rounded-xl border px-3 py-2", itemTone(item.status))}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">{item.label}</div>
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em]">
                {item.requiredForProduction ? (
                  <span className="rounded-full border border-current/20 bg-white/70 px-2 py-0.5 tracking-normal">
                    {t("creativeHub.novelSetup.checklist.requiredForProduction")}
                  </span>
                ) : null}
                <span>
                  {item.status === "ready"
                    ? t("creativeHub.novelSetup.checklist.statusReady")
                    : item.status === "partial"
                      ? t("creativeHub.novelSetup.checklist.statusPartial")
                      : t("creativeHub.novelSetup.checklist.statusMissing")}
                </span>
              </div>
            </div>
            {item.currentValue ? (
              <div className="mt-1 text-[11px] text-slate-500">
                {t("creativeHub.novelSetup.checklist.currentPrefix", { value: item.currentValue })}
              </div>
            ) : null}
            <div className="mt-1 text-xs leading-5">{item.summary}</div>
            {item.status !== "ready" && (item.recommendedAction || item.optionPrompt) ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {item.recommendedAction ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onQuickAction?.(item.recommendedAction!)}
                  >
                    {t("creativeHub.novelSetup.checklist.fillThis")}
                  </Button>
                ) : null}
                {item.optionPrompt ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onQuickAction?.(item.optionPrompt!)}
                  >
                    {t("creativeHub.novelSetup.checklist.giveAlternatives")}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {pendingItems.length > 0 ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-amber-700">
            {t("creativeHub.novelSetup.pendingHeading")}
          </div>
          <div className="mt-2 text-sm leading-6 text-slate-900">
            {pendingNames}
            {pendingEnding}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => onQuickAction?.(t("creativeHub.novelSetup.generateChecklistPrompt"))}
            >
              {t("creativeHub.novelSetup.generateChecklist")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onQuickAction?.(t("creativeHub.novelSetup.batchAlternativesPrompt"))}
            >
              {t("creativeHub.novelSetup.batchAlternatives")}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-sky-700">
          {t("creativeHub.novelSetup.nextQuestionHeading")}
        </div>
        <div className="mt-2 text-sm leading-6 text-slate-900">{setup.nextQuestion}</div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => onQuickAction?.(setup.recommendedAction)}
        >
          {t("creativeHub.novelSetup.continueGuided")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onQuickAction?.(t("creativeHub.novelSetup.viewSummaryPrompt"))}
        >
          {t("creativeHub.novelSetup.viewSummary")}
        </Button>
      </div>
    </div>
  );
}
