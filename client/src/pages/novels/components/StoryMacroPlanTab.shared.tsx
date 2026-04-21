import type { StoryMacroField } from "@ai-novel/shared/types/storyMacro";
import AiButton from "@/components/common/AiButton";
import { Button } from "@/components/ui/button";

export const ENGINE_TEXT_FIELDS: Array<{
  field: StoryMacroField;
  label: string;
  placeholder: string;
  multiline?: boolean;
}> = [
  { field: "expanded_premise", label: "Gia cố tiền đề", placeholder: "Viết lại tiền đề câu chuyện sau khi được gia cố, để sức ép và sự treo móc có chỗ đứng.", multiline: true },
  { field: "protagonist_core", label: "Tình thế cốt lõi của nhân vật chính", placeholder: "Viết tình thế bị kẹt, vết nứt và khoảng có thể thay đổi của nhân vật chính.", multiline: true },
  { field: "conflict_engine", label: "Động cơ xung đột", placeholder: "Viết rõ vì sao câu chuyện có thể liên tục leo thang, chứ không chỉ là một xung đột đơn lẻ.", multiline: true },
  { field: "mystery_box", label: "Ẩn số cốt lõi", placeholder: "Viết ra câu hỏi mà độc giả muốn biết nhất nhưng tạm thời chưa có đáp án.", multiline: true },
  { field: "emotional_line", label: "Đường cảm xúc", placeholder: "Viết cảm xúc sẽ sâu dần như thế nào thay vì chỉ mạnh lên đơn thuần.", multiline: true },
  { field: "tone_reference", label: "Khí chất tự sự", placeholder: "Văn phong, tư thế kể chuyện và cách kiểm soát nhịp kể.", multiline: true },
];

export const SUMMARY_FIELDS: Array<{
  field: StoryMacroField;
  label: string;
  placeholder: string;
  multiline?: boolean;
}> = [
  { field: "selling_point", label: "Điểm bán một câu", placeholder: "Một câu nói rõ điểm hút nhất của tác phẩm." },
  { field: "core_conflict", label: "Đối lập dài hạn", placeholder: "Viết đối lập dài hạn không thể hòa giải." },
  { field: "main_hook", label: "Móc câu chính", placeholder: "Viết câu hỏi chính của tuyến truyện có chứa ẩn số." },
  { field: "progression_loop", label: "Vòng lặp đẩy tiến", placeholder: "Viết rõ vòng lặp phát hiện -> nâng cấp -> đảo chiều diễn ra thế nào.", multiline: true },
  { field: "growth_path", label: "Lộ trình trưởng thành", placeholder: "Viết nhận thức của nhân vật chính thay đổi theo từng giai đoạn ra sao.", multiline: true },
  { field: "ending_flavor", label: "Hương vị kết cục", placeholder: "Ví dụ sụp đổ, bỏ lửng, đảo chiều, lạnh và nặng." },
];

export function listToText(value: string[]): string {
  return value.join("\n");
}

export function textareaClassName(minHeight = "min-h-28") {
  return `${minHeight} w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring`;
}

export function FieldActions(props: {
  field: StoryMacroField;
  lockedFields: Partial<Record<StoryMacroField, boolean>>;
  regeneratingField: StoryMacroField | "";
  storyInput: string;
  onToggleLock: (field: StoryMacroField) => void;
  onRegenerateField: (field: StoryMacroField) => void;
}) {
  const isLocked = Boolean(props.lockedFields[props.field]);
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant={isLocked ? "secondary" : "outline"}
        onClick={() => props.onToggleLock(props.field)}
      >
        {isLocked ? "Đã khóa" : "Khóa"}
      </Button>
      <AiButton
        size="sm"
        variant="outline"
        onClick={() => props.onRegenerateField(props.field)}
        disabled={props.regeneratingField === props.field || isLocked || !props.storyInput.trim()}
      >
        {props.regeneratingField === props.field ? "Đang sinh lại..." : "Sinh lại"}
      </AiButton>
    </div>
  );
}
