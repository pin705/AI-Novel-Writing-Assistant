import type {
  DirectorAutoExecutionMode,
  DirectorAutoExecutionPlan,
} from "@ai-novel/shared/types/novelDirector";
import { Input } from "@/components/ui/input";
import { useI18n, type TranslateFn } from "@/i18n";

export interface DirectorAutoExecutionDraftState {
  mode: DirectorAutoExecutionMode;
  startOrder: string;
  endOrder: string;
  volumeOrder: string;
}

const DEFAULT_DIRECTOR_AUTO_EXECUTION_DRAFT: DirectorAutoExecutionDraftState = {
  mode: "front10",
  startOrder: "1",
  endOrder: "10",
  volumeOrder: "1",
};

function getAutoExecutionScopeOptions(t: TranslateFn): Array<{
  value: DirectorAutoExecutionMode;
  label: string;
  description: string;
}> {
  return [
    {
      value: "front10",
      label: t("novelCreate.autoDirector.autoExecution.option.front10.label"),
      description: t("novelCreate.autoDirector.autoExecution.option.front10.description"),
    },
    {
      value: "chapter_range",
      label: t("novelCreate.autoDirector.autoExecution.option.chapterRange.label"),
      description: t("novelCreate.autoDirector.autoExecution.option.chapterRange.description"),
    },
    {
      value: "volume",
      label: t("novelCreate.autoDirector.autoExecution.option.volume.label"),
      description: t("novelCreate.autoDirector.autoExecution.option.volume.description"),
    },
  ];
}

function normalizePositiveInteger(value: string | number | undefined, fallback: number): number {
  const numericValue = typeof value === "number" ? value : Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(numericValue) || numericValue < 1) {
    return fallback;
  }
  return Math.max(1, Math.round(numericValue));
}

export function createDefaultDirectorAutoExecutionDraftState(): DirectorAutoExecutionDraftState {
  return { ...DEFAULT_DIRECTOR_AUTO_EXECUTION_DRAFT };
}

export function normalizeDirectorAutoExecutionDraftState(
  plan: DirectorAutoExecutionPlan | null | undefined,
): DirectorAutoExecutionDraftState {
  if (plan?.mode === "chapter_range") {
    const startOrder = normalizePositiveInteger(plan.startOrder, 1);
    const endOrder = normalizePositiveInteger(plan.endOrder, Math.max(startOrder, 10));
    return {
      mode: "chapter_range",
      startOrder: String(startOrder),
      endOrder: String(Math.max(startOrder, endOrder)),
      volumeOrder: DEFAULT_DIRECTOR_AUTO_EXECUTION_DRAFT.volumeOrder,
    };
  }
  if (plan?.mode === "volume") {
    return {
      mode: "volume",
      startOrder: DEFAULT_DIRECTOR_AUTO_EXECUTION_DRAFT.startOrder,
      endOrder: DEFAULT_DIRECTOR_AUTO_EXECUTION_DRAFT.endOrder,
      volumeOrder: String(normalizePositiveInteger(plan.volumeOrder, 1)),
    };
  }
  return createDefaultDirectorAutoExecutionDraftState();
}

export function buildDirectorAutoExecutionPlanFromDraft(
  draft: DirectorAutoExecutionDraftState,
): DirectorAutoExecutionPlan {
  if (draft.mode === "chapter_range") {
    const startOrder = normalizePositiveInteger(draft.startOrder, 1);
    const endOrder = Math.max(startOrder, normalizePositiveInteger(draft.endOrder, 10));
    return {
      mode: "chapter_range",
      startOrder,
      endOrder,
    };
  }
  if (draft.mode === "volume") {
    return {
      mode: "volume",
      volumeOrder: normalizePositiveInteger(draft.volumeOrder, 1),
    };
  }
  return {
    mode: "front10",
  };
}

export function buildDirectorAutoExecutionPlanLabel(
  plan: DirectorAutoExecutionPlan | null | undefined,
  t?: TranslateFn,
): string {
  if (plan?.mode === "chapter_range") {
    const startOrder = normalizePositiveInteger(plan.startOrder, 1);
    const endOrder = Math.max(startOrder, normalizePositiveInteger(plan.endOrder, startOrder));
    if (startOrder === endOrder) {
      return t
        ? t("novelCreate.autoDirector.autoExecution.scope.singleChapter", { start: startOrder })
        : `第 ${startOrder} 章`;
    }
    return t
      ? t("novelCreate.autoDirector.autoExecution.scope.chapterRange", { start: startOrder, end: endOrder })
      : `第 ${startOrder}-${endOrder} 章`;
  }
  if (plan?.mode === "volume") {
    const volume = normalizePositiveInteger(plan.volumeOrder, 1);
    return t
      ? t("novelCreate.autoDirector.autoExecution.scope.volume", { value: volume })
      : `第 ${volume} 卷`;
  }
  return t ? t("novelCreate.autoDirector.autoExecution.scope.front10") : "前 10 章";
}

interface DirectorAutoExecutionPlanFieldsProps {
  draft: DirectorAutoExecutionDraftState;
  onChange: (patch: Partial<DirectorAutoExecutionDraftState>) => void;
}

export function DirectorAutoExecutionPlanFields({
  draft,
  onChange,
}: DirectorAutoExecutionPlanFieldsProps) {
  const { t } = useI18n();
  const plan = buildDirectorAutoExecutionPlanFromDraft(draft);
  const scopeLabel = buildDirectorAutoExecutionPlanLabel(plan, t);
  const scopeOptions = getAutoExecutionScopeOptions(t);

  return (
    <div className="mt-3 rounded-md border border-primary/15 bg-primary/5 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-medium text-foreground">{t("novelCreate.autoDirector.autoExecution.title")}</div>
        <div className="text-xs text-muted-foreground">{t("novelCreate.autoDirector.autoExecution.current", { value: scopeLabel })}</div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {scopeOptions.map((option) => {
          const active = option.value === draft.mode;
          return (
            <button
              key={option.value}
              type="button"
              className={`rounded-xl border px-3 py-3 text-left transition ${
                active
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border bg-background hover:border-primary/40"
              }`}
              onClick={() => onChange({ mode: option.value })}
            >
              <div className="text-sm font-medium text-foreground">{option.label}</div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">{option.description}</div>
            </button>
          );
        })}
      </div>

      {draft.mode === "chapter_range" ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs font-medium text-foreground">{t("novelCreate.autoDirector.autoExecution.startChapter.label")}</div>
            <Input
              className="mt-2"
              type="number"
              min={1}
              value={draft.startOrder}
              onChange={(event) => onChange({ startOrder: event.target.value })}
              placeholder={t("novelCreate.autoDirector.autoExecution.startChapter.placeholder")}
            />
          </div>
          <div>
            <div className="text-xs font-medium text-foreground">{t("novelCreate.autoDirector.autoExecution.endChapter.label")}</div>
            <Input
              className="mt-2"
              type="number"
              min={1}
              value={draft.endOrder}
              onChange={(event) => onChange({ endOrder: event.target.value })}
              placeholder={t("novelCreate.autoDirector.autoExecution.endChapter.placeholder")}
            />
          </div>
        </div>
      ) : null}

      {draft.mode === "volume" ? (
        <div className="mt-4 max-w-xs">
          <div className="text-xs font-medium text-foreground">{t("novelCreate.autoDirector.autoExecution.volumeOrder.label")}</div>
          <Input
            className="mt-2"
            type="number"
            min={1}
            value={draft.volumeOrder}
            onChange={(event) => onChange({ volumeOrder: event.target.value })}
            placeholder={t("novelCreate.autoDirector.autoExecution.volumeOrder.placeholder")}
          />
        </div>
      ) : null}

      <div className="mt-3 text-xs leading-5 text-muted-foreground">
        {t("novelCreate.autoDirector.autoExecution.helper")}
      </div>
    </div>
  );
}
