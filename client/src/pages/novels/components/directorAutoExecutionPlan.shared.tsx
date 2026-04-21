import type {
  DirectorAutoExecutionMode,
  DirectorAutoExecutionPlan,
} from "@ai-novel/shared/types/novelDirector";
import { Input } from "@/components/ui/input";

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

const AUTO_EXECUTION_SCOPE_OPTIONS: Array<{
  value: DirectorAutoExecutionMode;
  label: string;
  description: string;
}> = [
  {
    value: "front10",
    label: "Mặc định 10 chương đầu",
    description: "Hợp với sách mới bắt đầu, AI sẽ tự chạy luôn 10 chương đầu qua viết, rà soát và sửa lỗi.",
  },
  {
    value: "chapter_range",
    label: "Phạm vi chương chỉ định",
    description: "Hợp khi bạn chỉ muốn AI tiếp quản một đoạn nhất định, ví dụ từ chương 11 đến 20.",
  },
  {
    value: "volume",
    label: "Chạy theo tập",
    description: "Hợp khi bạn muốn AI ôm trọn một loạt chương trong cùng một tập.",
  },
];

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
): string {
  if (plan?.mode === "chapter_range") {
    const startOrder = normalizePositiveInteger(plan.startOrder, 1);
    const endOrder = Math.max(startOrder, normalizePositiveInteger(plan.endOrder, startOrder));
    if (startOrder === endOrder) {
      return `Chương ${startOrder}`;
    }
    return `Chương ${startOrder}-${endOrder}`;
  }
  if (plan?.mode === "volume") {
    return `Tập ${normalizePositiveInteger(plan.volumeOrder, 1)}`;
  }
  return "10 chương đầu";
}

interface DirectorAutoExecutionPlanFieldsProps {
  draft: DirectorAutoExecutionDraftState;
  onChange: (patch: Partial<DirectorAutoExecutionDraftState>) => void;
}

export function DirectorAutoExecutionPlanFields({
  draft,
  onChange,
}: DirectorAutoExecutionPlanFieldsProps) {
  const plan = buildDirectorAutoExecutionPlanFromDraft(draft);
  const scopeLabel = buildDirectorAutoExecutionPlanLabel(plan);

  return (
    <div className="mt-3 rounded-md border border-primary/15 bg-primary/5 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-medium text-foreground">Phạm vi tự động triển khai</div>
        <div className="text-xs text-muted-foreground">Sẽ chạy hiện tại: {scopeLabel}</div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {AUTO_EXECUTION_SCOPE_OPTIONS.map((option) => {
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
            <div className="text-xs font-medium text-foreground">Chương bắt đầu</div>
              <Input
                className="mt-2"
                type="number"
                min={1}
                value={draft.startOrder}
                onChange={(event) => onChange({ startOrder: event.target.value })}
                placeholder="Ví dụ 11"
              />
          </div>
          <div>
            <div className="text-xs font-medium text-foreground">Chương kết thúc</div>
              <Input
                className="mt-2"
                type="number"
                min={1}
                value={draft.endOrder}
                onChange={(event) => onChange({ endOrder: event.target.value })}
                placeholder="Ví dụ 20"
              />
          </div>
        </div>
      ) : null}

      {draft.mode === "volume" ? (
        <div className="mt-4 max-w-xs">
          <div className="text-xs font-medium text-foreground">Số tập</div>
          <Input
            className="mt-2"
            type="number"
            min={1}
            value={draft.volumeOrder}
            onChange={(event) => onChange({ volumeOrder: event.target.value })}
            placeholder="Ví dụ 2"
          />
        </div>
      ) : null}

      <div className="mt-3 text-xs leading-5 text-muted-foreground">
        Hệ thống sẽ tự chuẩn bị bảng nhịp, tách chương và tài nguyên triển khai chương theo phạm vi hoặc tập bạn chọn, rồi mới tiếp tục viết, rà soát và sửa lỗi.
      </div>
    </div>
  );
}
