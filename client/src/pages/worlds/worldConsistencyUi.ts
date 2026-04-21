import type { WorldConsistencyIssue, WorldConsistencyReport } from "@ai-novel/shared/types/world";

const ISSUE_CODE_LABELS: Record<string, string> = {
  THEMATIC_INCOHERENCE: "Khung chủ đề không nhất quán",
  REDUNDANT_AXIOM_APPLICATION: "Áp dụng công lý thế giới lặp lại",
  AXIOM_VIOLATION: "Xung đột công lý thế giới",
  GENRE_MISMATCH: "Lệch tín hiệu thể loại",
  AXIOM_MAGIC_CONFLICT: "Công lý và hệ thống sức mạnh xung đột",
  TECH_ERA_MISMATCH: "Trộn lẫn giai đoạn công nghệ",
  CONFLICT_WEAK: "Xung đột cốt lõi còn yếu",
  BASELINE_PASS: "Kiểm tra quy tắc đạt",
};

const ISSUE_MESSAGE_LABELS: Record<string, string> = {
  THEMATIC_INCOHERENCE: "Nội dung bổ sung từ truy xuất đã đưa vào một khung chủ đề không khớp với thiết lập cốt lõi.",
  REDUNDANT_AXIOM_APPLICATION: "Nội dung bổ sung chỉ lặp lại các công lý có sẵn mà không thêm ràng buộc mới nào hữu ích.",
  AXIOM_VIOLATION: "Tên thế giới hoặc khái niệm cốt lõi đang xung đột với công lý và bối cảnh có sẵn.",
  GENRE_MISMATCH: "Tín hiệu thể loại không khớp với ràng buộc của thế giới hiện tại.",
  AXIOM_MAGIC_CONFLICT: "Công lý thế giới đang xung đột với thiết lập hệ thống sức mạnh.",
  TECH_ERA_MISMATCH: "Cảm giác thời đại công nghệ đang bị trộn lẫn, thiếu giải thích đủ rõ.",
  CONFLICT_WEAK: "Thông tin xung đột cốt lõi còn mỏng, chưa đủ lực nâng.",
  BASELINE_PASS: "Mức quy tắc chưa phát hiện xung đột cứng rõ ràng.",
};

const ISSUE_DETAIL_LABELS: Record<string, string> = {
  THEMATIC_INCOHERENCE: "Ngữ cảnh bổ sung đã đưa vào một cách diễn đạt chủ đề chưa được thiết lập rõ trong nguyên tác, dễ làm trục thế giới quan bị lệch.",
  REDUNDANT_AXIOM_APPLICATION: "Phần bổ sung hiện tại chủ yếu lặp lại quy tắc cũ, nên bỏ bớt phần nhắc lại thừa và chỉ giữ ràng buộc thật sự mới.",
  AXIOM_VIOLATION: "Tên gọi, cam kết thể loại hoặc khái niệm cốt lõi hiện không khớp với quy tắc nền của thế giới, cần thống nhất lại thiết lập chính.",
  GENRE_MISMATCH: "Tên gọi hoặc từ khóa hiện đang gợi ra một kỳ vọng thể loại khác, không khớp với phong cách và quy tắc mà thế giới đang nhấn mạnh.",
  AXIOM_MAGIC_CONFLICT: "Bạn đã giới hạn nội dung siêu nhiên/phép thuật trong công lý thế giới, nhưng hệ sức mạnh hoặc văn bản liên quan lại đưa nó trở lại.",
  TECH_ERA_MISMATCH: "Phần mô tả công nghệ hiện đang trộn các tầng thời đại khác nhau mà chưa giải thích nguồn gốc, giới hạn hay logic chuyển tiếp.",
  CONFLICT_WEAK: "Nên bổ sung hai phía xung đột, sự kiện kích hoạt, lộ trình leo thang và cái giá thất bại để mâu thuẫn chính của thế giới rõ hơn.",
};

const FIELD_LABELS: Record<string, string> = {
  description: "Tổng quan thế giới",
  background: "Thiết lập nền",
  geography: "Môi trường địa lý",
  cultures: "Tập tục văn hóa",
  magicSystem: "Hệ thống sức mạnh",
  politics: "Cấu trúc chính trị",
  races: "Thiết lập chủng tộc",
  religions: "Tín ngưỡng tôn giáo",
  technology: "Hệ thống công nghệ",
  conflicts: "Xung đột cốt lõi",
  history: "Mạch lịch sử",
  economy: "Hệ thống kinh tế",
  factions: "Quan hệ thế lực",
};

function hasChinese(text: string): boolean {
  return /[\u4E00-\u9FFF]/.test(text);
}

function localizeSummary(summary: string, status: WorldConsistencyReport["status"], issues: WorldConsistencyIssue[]): string {
  if (hasChinese(summary)) {
    return summary;
  }
  if (/Consistency check passed/i.test(summary)) {
    return "Kiểm tra nhất quán đã đạt, không phát hiện xung đột cứng rõ ràng.";
  }
  const errorCount = issues.filter((item) => item.severity === "error").length;
  const warnCount = issues.filter((item) => item.severity === "warn").length;
  if (status === "error") {
    return `Phát hiện ${errorCount} xung đột nghiêm trọng và ${warnCount} mục cảnh báo.`;
  }
  if (status === "warn") {
    return `Phát hiện ${warnCount} mục cảnh báo, nên tiếp tục chỉnh sửa.`;
  }
  return "Kiểm tra nhất quán đã hoàn tất.";
}

export function parseConsistencyReport(raw: string | null | undefined, issues: WorldConsistencyIssue[]): WorldConsistencyReport | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<WorldConsistencyReport>;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const status = parsed.status === "error" || parsed.status === "warn" || parsed.status === "pass"
      ? parsed.status
      : "pass";
    return {
      worldId: typeof parsed.worldId === "string" ? parsed.worldId : "",
      score: typeof parsed.score === "number" ? parsed.score : 0,
      summary: localizeSummary(typeof parsed.summary === "string" ? parsed.summary : "", status, issues),
      status,
      generatedAt: typeof parsed.generatedAt === "string" ? parsed.generatedAt : undefined,
      issues,
    };
  } catch {
    return null;
  }
}

export function localizeConsistencySeverity(severity: WorldConsistencyIssue["severity"]): string {
  switch (severity) {
    case "error":
      return "Xung đột nghiêm trọng";
    case "warn":
      return "Cảnh báo";
    case "pass":
      return "Đạt";
    default:
      return severity;
  }
}

export function localizeConsistencyStatus(status: WorldConsistencyIssue["status"] | WorldConsistencyReport["status"]): string {
  switch (status) {
    case "open":
      return "Chờ xử lý";
    case "resolved":
      return "Đã giải quyết";
    case "ignored":
      return "Đã bỏ qua";
    case "error":
      return "Đang có xung đột nghiêm trọng";
    case "warn":
      return "Đang có cảnh báo";
    case "pass":
      return "Kiểm tra đạt";
    default:
      return status;
  }
}

export function localizeConsistencySource(source: WorldConsistencyIssue["source"]): string {
  return source === "llm" ? "Biên tập bằng mô hình" : "Kiểm tra theo quy tắc";
}

export function localizeConsistencyField(targetField?: string | null): string {
  if (!targetField) {
    return "Chưa chỉ định";
  }
  return FIELD_LABELS[targetField] ?? targetField;
}

export function localizeConsistencyIssueTitle(code: string): string {
  return ISSUE_CODE_LABELS[code] ?? code;
}

export function localizeConsistencyIssueMessage(issue: WorldConsistencyIssue): string {
  if (hasChinese(issue.message)) {
    return issue.message;
  }
  return ISSUE_MESSAGE_LABELS[issue.code]
    ?? `${localizeConsistencyField(issue.targetField)} đang có rủi ro nhất quán.`;
}

export function localizeConsistencyIssueDetail(issue: WorldConsistencyIssue): string | null {
  if (issue.detail && hasChinese(issue.detail)) {
    return issue.detail;
  }
  if (ISSUE_DETAIL_LABELS[issue.code]) {
    return ISSUE_DETAIL_LABELS[issue.code];
  }
  if (issue.detail) {
    return `Hệ thống phát hiện một vấn đề liên quan đến ${localizeConsistencyField(issue.targetField)}, hãy đối chiếu lại với thiết lập thế giới hiện tại để kiểm tra rủi ro này.`;
  }
  return null;
}
