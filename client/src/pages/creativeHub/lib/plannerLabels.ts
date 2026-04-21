const INTENT_LABELS: Record<string, string> = {
  social_opening: "Mở đầu nhẹ",
  list_novels: "Liệt kê tiểu thuyết",
  list_worlds: "Liệt kê thế giới quan",
  query_task_status: "Xem trạng thái tác vụ",
  create_novel: "Tạo tiểu thuyết",
  select_novel_workspace: "Chuyển không gian tiểu thuyết",
  bind_world_to_novel: "Liên kết thế giới quan với tiểu thuyết",
  unbind_world_from_novel: "Gỡ liên kết thế giới quan của tiểu thuyết",
  produce_novel: "Sản xuất toàn cuốn",
  query_novel_production_status: "Xem trạng thái sản xuất toàn cuốn",
  query_novel_title: "Xem tiêu đề tiểu thuyết",
  query_chapter_content: "Xem nội dung chương",
  query_progress: "Xem tiến độ sáng tác",
  inspect_failure_reason: "Chẩn đoán lý do thất bại",
  write_chapter: "Viết chương",
  rewrite_chapter: "Viết lại chương",
  save_chapter_draft: "Lưu bản nháp chương",
  start_pipeline: "Khởi động dây chuyền",
  inspect_characters: "Xem quy hoạch nhân vật",
  inspect_timeline: "Xem dòng thời gian",
  inspect_world: "Xem thế giới quan",
  search_knowledge: "Tra cứu tri thức",
  ideate_novel_setup: "Tạo phương án thiết lập",
  general_chat: "Trò chuyện chung",
  unknown: "Ý định chưa nhận diện",
};

const PLANNER_SOURCE_LABELS: Record<string, string> = {
  llm: "Nhận diện từ mô hình lớn",
  unknown: "Nguồn không rõ",
};

function formatBilingualLabel(label: string, rawValue: string) {
  return `${label}（${rawValue}）`;
}

export function getIntentDisplayLabel(intent: unknown): string {
  const rawValue = typeof intent === "string" && intent.trim() ? intent.trim() : "unknown";
  const label = INTENT_LABELS[rawValue] ?? "Ý định chưa ánh xạ";
  return formatBilingualLabel(label, rawValue);
}

export function getPlannerSourceDisplayLabel(source: unknown): string {
  const rawValue = typeof source === "string" && source.trim() ? source.trim() : "unknown";
  const label = PLANNER_SOURCE_LABELS[rawValue] ?? "Nguồn chưa ánh xạ";
  return formatBilingualLabel(label, rawValue);
}
