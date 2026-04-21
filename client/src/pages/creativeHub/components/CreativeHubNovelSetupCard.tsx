import type { CreativeHubNovelSetupStatus } from "@ai-novel/shared/types/creativeHub";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CreativeHubNovelSetupCardProps {
  setup: CreativeHubNovelSetupStatus;
  onQuickAction?: (prompt: string) => void;
}

function stageLabel(stage: CreativeHubNovelSetupStatus["stage"]): string {
  switch (stage) {
    case "ready_for_production":
      return "Có thể vào sản xuất";
    case "ready_for_planning":
      return "Có thể vào lập kế hoạch";
    default:
      return "Đang khởi tạo";
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
  const pendingItems = setup.checklist.filter((item) => item.status !== "ready");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-slate-500">Khởi tạo sách mới</div>
        <Badge variant="outline">{stageLabel(setup.stage)}</Badge>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-slate-900">{setup.title}</div>
            <div className="mt-1 text-xs text-slate-500">
              Đã sẵn sàng {setup.completedCount}/{setup.totalCount} mục
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-slate-900">{setup.completionRatio}%</div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">progress</div>
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
                    Xác nhận trước sản xuất
                  </span>
                ) : null}
                <span>
                  {item.status === "ready" ? "đã sẵn sàng" : item.status === "partial" ? "một phần" : "thiếu"}
                </span>
              </div>
            </div>
            {item.currentValue ? (
              <div className="mt-1 text-[11px] text-slate-500">Hiện tại: {item.currentValue}</div>
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
                    Bổ sung mục này
                  </Button>
                ) : null}
                {item.optionPrompt ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onQuickAction?.(item.optionPrompt!)}
                  >
                    Gợi ý phương án
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {pendingItems.length > 0 ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-amber-700">Chờ xác nhận trước sản xuất</div>
          <div className="mt-2 text-sm leading-6 text-slate-900">
            {pendingItems.slice(0, 4).map((item) => item.label).join("、")}
            {pendingItems.length > 4 ? "..." : ""}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => onQuickAction?.("Tóm tắt những điều kiện còn cần xác nhận trước khi sản xuất toàn cuốn và cho thứ tự bổ sung theo mức ưu tiên.")}
            >
              Tạo danh sách xác nhận
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onQuickAction?.("Dựa trên thông tin hiện tại của tiểu thuyết, hãy cho 3 phương án cho từng điều kiện quan trọng còn thiếu trước khi sản xuất, để tôi chọn từng mục.")}
            >
              Gợi ý hàng loạt
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-sky-700">Câu hỏi tiếp theo</div>
        <div className="mt-2 text-sm leading-6 text-slate-900">{setup.nextQuestion}</div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => onQuickAction?.(setup.recommendedAction)}
        >
          Tiếp tục theo gợi ý
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onQuickAction?.("Tóm tắt mức độ hoàn thiện khởi tạo của cuốn sách này và nói rõ còn thiếu thông tin quan trọng nào.")}
        >
          Xem tóm tắt khởi tạo
        </Button>
      </div>
    </div>
  );
}
