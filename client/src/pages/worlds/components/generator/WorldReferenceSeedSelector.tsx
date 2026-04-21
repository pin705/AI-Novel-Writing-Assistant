import type {
  WorldReferenceSeedBundle,
  WorldReferenceSeedSelection,
} from "@ai-novel/shared/types/worldWizard";
import { Button } from "@/components/ui/button";

type GroupKey = keyof WorldReferenceSeedBundle;

const GROUP_META: Record<
  GroupKey,
  {
    title: string;
    description: string;
    selectionKey: keyof WorldReferenceSeedSelection;
  }
> = {
  rules: {
    title: "Quy tắc gốc",
    description: "Thế giới này mặc định vận hành thế nào; các bước sinh tự động phía sau sẽ dựa vào những quy tắc nền này.",
    selectionKey: "ruleIds",
  },
  factions: {
    title: "Lập trường phe phái",
    description: "Ai đứng về phía nào, tin điều gì, muốn đẩy điều gì. Phù hợp để giữ lại trục lớn của bản gốc.",
    selectionKey: "factionIds",
  },
  forces: {
    title: "Tổ chức và thế lực",
    description: "Những công ty, phòng ban, băng nhóm hay mạng lưới quan hệ có thể đưa thẳng vào truyện.",
    selectionKey: "forceIds",
  },
  locations: {
    title: "Địa điểm và bối cảnh",
    description: "Thành phố, khu phố, công ty, nơi ở... là những bối cảnh có thể dùng ngay.",
    selectionKey: "locationIds",
  },
};

function summarizeSeed(group: GroupKey, item: Record<string, unknown>): string {
  if (group === "rules") {
    return [item.summary, item.boundary, item.enforcement].filter(Boolean).join(" | ");
  }
  if (group === "factions") {
    return [item.position, item.doctrine].filter(Boolean).join(" | ");
  }
  if (group === "forces") {
    return [item.type, item.summary, item.pressure].filter(Boolean).join(" | ");
  }
  return [item.terrain, item.summary, item.narrativeFunction].filter(Boolean).join(" | ");
}

export default function WorldReferenceSeedSelector(props: {
  seeds: WorldReferenceSeedBundle;
  selectedIds: WorldReferenceSeedSelection;
  onToggle: (group: GroupKey, id: string, checked: boolean) => void;
  onToggleAll: (group: GroupKey, checked: boolean) => void;
}) {
  const { seeds, selectedIds, onToggle, onToggleAll } = props;

  const visibleGroups = (Object.keys(GROUP_META) as GroupKey[]).filter((group) => seeds[group].length > 0);
  if (visibleGroups.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        Lần này hệ thống chưa trích ổn định được tổ chức, địa điểm hoặc quy tắc nào có thể dùng lại ngay từ tác phẩm tham chiếu. Phần sau sẽ tiếp tục sinh theo hướng bạn muốn chỉnh sửa.
      </div>
    );
  }

  return (
    <div className="rounded-md border p-3 text-sm space-y-4">
      <div className="space-y-1">
        <div className="font-medium">Giữ nguyên thiết lập gốc</div>
        <div className="text-xs text-muted-foreground">
          Hệ thống đã trích ra một số thiết lập có sẵn từ tác phẩm tham chiếu và đang mặc định chọn. Giữ lại sẽ giúp bạn đỡ phải nhập tay về sau.
        </div>
      </div>

      {visibleGroups.map((group) => {
        const items = seeds[group];
        const selectionKey = GROUP_META[group].selectionKey;
        const currentSelectedIds = selectedIds[selectionKey];
        const allSelected = items.length > 0 && items.every((item) => currentSelectedIds.includes(item.id));
        return (
          <div key={group} className="rounded-md border p-3 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="font-medium">{GROUP_META[group].title}</div>
                <div className="text-xs text-muted-foreground">{GROUP_META[group].description}</div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onToggleAll(group, !allSelected)}
              >
                {allSelected ? "Bỏ chọn hết" : "Giữ hết"}
              </Button>
            </div>

            <div className="space-y-2">
              {items.map((item) => {
                const checked = currentSelectedIds.includes(item.id);
                const summary = summarizeSeed(group, item as Record<string, unknown>);
                return (
                  <label key={item.id} className="flex items-start gap-3 rounded-md border p-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={checked}
                      onChange={(event) => onToggle(group, item.id, event.target.checked)}
                    />
                    <div className="space-y-1">
                      <div className="font-medium">{item.name}</div>
                      {summary ? (
                        <div className="text-xs text-muted-foreground">{summary}</div>
                      ) : (
                        <div className="text-xs text-muted-foreground">Đã nhận diện là thiết lập gốc có thể dùng lại ngay.</div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
