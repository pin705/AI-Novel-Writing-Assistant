import type { StoryModeProfile } from "@ai-novel/shared/types/storyMode";

function linesToList(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function listToLines(value: string[]): string {
  return value.join("\n");
}

interface StoryModeProfileFieldsProps {
  value: StoryModeProfile;
  onChange: (value: StoryModeProfile) => void;
}

export default function StoryModeProfileFields({
  value,
  onChange,
}: StoryModeProfileFieldsProps) {
  const updateList = (field: keyof Pick<
    StoryModeProfile,
    "progressionUnits" | "allowedConflictForms" | "forbiddenConflictForms" | "mandatorySignals" | "antiSignals"
  >, text: string) => {
    onChange({
      ...value,
      [field]: linesToList(text),
    });
  };

  return (
    <div className="grid gap-3">
      <label className="space-y-2 text-sm">
        <span className="font-medium text-foreground">Động lực cốt lõi</span>
        <textarea
          rows={2}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          value={value.coreDrive}
          onChange={(event) => onChange({ ...value, coreDrive: event.target.value })}
        />
      </label>
      <label className="space-y-2 text-sm">
        <span className="font-medium text-foreground">Phần thưởng cho độc giả</span>
        <textarea
          rows={2}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          value={value.readerReward}
          onChange={(event) => onChange({ ...value, readerReward: event.target.value })}
        />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">Đơn vị thúc đẩy chương</span>
          <textarea
            rows={4}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            value={listToLines(value.progressionUnits)}
            onChange={(event) => updateList("progressionUnits", event.target.value)}
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">Hình thức xung đột cho phép</span>
          <textarea
            rows={4}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            value={listToLines(value.allowedConflictForms)}
            onChange={(event) => updateList("allowedConflictForms", event.target.value)}
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">Hình thức xung đột cấm dùng</span>
          <textarea
            rows={4}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            value={listToLines(value.forbiddenConflictForms)}
            onChange={(event) => updateList("forbiddenConflictForms", event.target.value)}
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">Trần xung đột</span>
          <select
            className="w-full rounded-md border bg-background p-2 text-sm"
            value={value.conflictCeiling}
            onChange={(event) => onChange({ ...value, conflictCeiling: event.target.value as StoryModeProfile["conflictCeiling"] })}
          >
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">Cách hóa giải</span>
          <textarea
            rows={2}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            value={value.resolutionStyle}
            onChange={(event) => onChange({ ...value, resolutionStyle: event.target.value })}
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">Độ hạt của chương</span>
          <textarea
            rows={2}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            value={value.chapterUnit}
            onChange={(event) => onChange({ ...value, chapterUnit: event.target.value })}
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">Phần thưởng cuối quyển</span>
          <textarea
            rows={2}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            value={value.volumeReward}
            onChange={(event) => onChange({ ...value, volumeReward: event.target.value })}
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">Tín hiệu bắt buộc phải xuất hiện</span>
          <textarea
            rows={4}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            value={listToLines(value.mandatorySignals)}
            onChange={(event) => updateList("mandatorySignals", event.target.value)}
          />
        </label>
      </div>
      <label className="space-y-2 text-sm">
        <span className="font-medium text-foreground">Tín hiệu lệch hướng cần tránh</span>
        <textarea
          rows={4}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          value={listToLines(value.antiSignals)}
          onChange={(event) => updateList("antiSignals", event.target.value)}
        />
      </label>
    </div>
  );
}
