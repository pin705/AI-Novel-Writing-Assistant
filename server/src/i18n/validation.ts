import type { ZodIssue } from "zod";
import { getBackendLanguage, getRequestLocale, type BackendLanguage } from "./locale";
import { translateBackendText } from "./messages";

type ValidationFieldLabel = {
  vi: string;
  en: string;
  zh: string;
};

const VALIDATION_FIELD_LABELS: Record<string, ValidationFieldLabel> = {
  id: { vi: "ID mục", en: "Item ID", zh: "项目 ID" },
  field: { vi: "trường", en: "field", zh: "字段" },
  provider: { vi: "nhà cung cấp", en: "provider", zh: "模型提供商" },
  model: { vi: "mô hình", en: "model", zh: "模型" },
  temperature: { vi: "nhiệt độ", en: "temperature", zh: "温度" },
  baseURL: { vi: "URL API", en: "API URL", zh: "API 地址" },
  limit: { vi: "giới hạn", en: "limit", zh: "限制" },
  cursor: { vi: "con trỏ", en: "cursor", zh: "游标" },
  keyword: { vi: "từ khóa", en: "keyword", zh: "关键词" },
  title: { vi: "tiêu đề", en: "title", zh: "标题" },
  name: { vi: "tên", en: "name", zh: "名称" },
  role: { vi: "vai trò", en: "role", zh: "角色定位" },
  note: { vi: "ghi chú", en: "note", zh: "备注" },
  action: { vi: "hành động", en: "action", zh: "动作" },
  checkpointId: { vi: "ID checkpoint", en: "checkpoint ID", zh: "检查点 ID" },
  threadId: { vi: "ID luồng", en: "thread ID", zh: "线程 ID" },
  chapterId: { vi: "ID chương", en: "chapter ID", zh: "章节 ID" },
  compareVersion: { vi: "phiên bản so sánh", en: "compare version", zh: "比较版本" },
  startOrder: { vi: "thứ tự bắt đầu", en: "start order", zh: "起始章节" },
  endOrder: { vi: "thứ tự kết thúc", en: "end order", zh: "结束章节" },
  storyInput: { vi: "ý tưởng câu chuyện", en: "story input", zh: "故事想法输入" },
  expansion: { vi: "nguyên mẫu story engine", en: "story engine prototype", zh: "故事引擎原型" },
  decomposition: { vi: "tóm tắt推进与兑现", en: "progression and payoff summary", zh: "推进与兑现摘要" },
  constraints: { vi: "quy tắc tự sự", en: "narrative rules", zh: "叙事规则" },
  lockedFields: { vi: "trường đã khóa", en: "locked fields", zh: "锁定字段" },
  state: { vi: "trạng thái câu chuyện", en: "story state", zh: "故事状态" },
  expanded_premise: { vi: "tiền đề mở rộng", en: "expanded premise", zh: "扩展前提" },
  protagonist_core: { vi: "lõi nhân vật chính", en: "protagonist core", zh: "主角核心" },
  conflict_engine: { vi: "động cơ xung đột", en: "conflict engine", zh: "冲突引擎" },
  conflict_layers: { vi: "tầng xung đột", en: "conflict layers", zh: "冲突层" },
  external: { vi: "áp lực bên ngoài", en: "external pressure", zh: "外部压迫" },
  internal: { vi: "sụp đổ nội tâm", en: "internal collapse", zh: "内部崩塌" },
  relational: { vi: "áp lực quan hệ", en: "relational pressure", zh: "关系压力" },
  mystery_box: { vi: "ẩn số cốt lõi", en: "core unknown", zh: "核心未知" },
  emotional_line: { vi: "đường cảm xúc", en: "emotional line", zh: "情绪线" },
  setpiece_seeds: { vi: "hạt giống set-piece", en: "set-piece seeds", zh: "高张力场面种子" },
  tone_reference: { vi: "tham chiếu không khí", en: "tone reference", zh: "氛围参考" },
  selling_point: { vi: "điểm bán", en: "selling point", zh: "卖点" },
  core_conflict: { vi: "xung đột cốt lõi", en: "core conflict", zh: "核心冲突" },
  main_hook: { vi: "hook chính", en: "main hook", zh: "主钩子" },
  progression_loop: { vi: "vòng lặp推进", en: "progression loop", zh: "推进循环" },
  growth_path: { vi: "lộ trình trưởng thành", en: "growth path", zh: "成长路径" },
  major_payoffs: { vi: "payoff chính", en: "major payoffs", zh: "关键兑现点" },
  ending_flavor: { vi: "hương vị kết thúc", en: "ending flavor", zh: "结局风味" },
  currentPhase: { vi: "giai đoạn hiện tại", en: "current phase", zh: "当前阶段" },
  progress: { vi: "tiến độ", en: "progress", zh: "进度" },
  protagonistState: { vi: "trạng thái hiện tại của nhân vật chính", en: "protagonist state", zh: "主角当前处境" },
};

function humanizeSegment(segment: string, language: BackendLanguage): string {
  const knownLabel = VALIDATION_FIELD_LABELS[segment];
  if (knownLabel) {
    return knownLabel[language];
  }

  if (language === "zh") {
    return segment;
  }

  return segment
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
}

function getIndexedItemLabel(index: number, language: BackendLanguage): string {
  if (language === "en") {
    return `Item ${index + 1}`;
  }
  if (language === "zh") {
    return `第 ${index + 1} 项`;
  }
  return `Mục ${index + 1}`;
}

function getSeparator(language: BackendLanguage): string {
  return language === "zh" ? "：" : ": ";
}

function formatExpectedType(expected: unknown, language: BackendLanguage): string {
  switch (expected) {
    case "string":
      return language === "en" ? "text" : language === "zh" ? "文本" : "văn bản";
    case "number":
      return language === "en" ? "a number" : language === "zh" ? "数字" : "một số";
    case "boolean":
      return language === "en" ? "a boolean" : language === "zh" ? "布尔值" : "giá trị boolean";
    default:
      return String(expected ?? "");
  }
}

export function formatValidationPath(path: PropertyKey[]): string {
  const language = getBackendLanguage(getRequestLocale());
  return path
    .map((segment) => {
      if (typeof segment === "number") {
        return getIndexedItemLabel(segment, language);
      }
      if (typeof segment === "symbol") {
        return segment.toString();
      }
      return humanizeSegment(segment, language);
    })
    .filter(Boolean)
    .join(" / ");
}

export function formatZodIssueMessage(issue: ZodIssue): string {
  const language = getBackendLanguage(getRequestLocale());
  const issueRecord = issue as ZodIssue & Record<string, unknown>;
  const code = String(issue.code);
  const origin = typeof issueRecord.origin === "string" ? issueRecord.origin : undefined;

  switch (code) {
    case "invalid_type":
      if (issueRecord.input === undefined) {
        return language === "en" ? "is required." : language === "zh" ? "不能为空。" : "không được để trống.";
      }
      if (issueRecord.expected) {
        const expectedLabel = formatExpectedType(issueRecord.expected, language);
        if (language === "en") {
          return `must be ${expectedLabel}.`;
        }
        if (language === "zh") {
          return `必须是${expectedLabel}。`;
        }
        return `phải là ${expectedLabel}.`;
      }
      return translateBackendText(issue.message || (language === "en" ? "has an invalid type." : language === "zh" ? "类型不正确。" : "kiểu dữ liệu không hợp lệ."));
    case "invalid_value":
      return translateBackendText(issue.message || (language === "en" ? "contains an invalid value." : language === "zh" ? "取值不合法。" : "giá trị không hợp lệ."));
    case "too_small":
      if (origin === "array") {
        if (language === "en") return `must contain at least ${issueRecord.minimum} items.`;
        if (language === "zh") return `至少需要 ${issueRecord.minimum} 项。`;
        return `phải có ít nhất ${issueRecord.minimum} mục.`;
      }
      if (origin === "string") {
        if (issueRecord.minimum === 1) {
          return language === "en" ? "is required." : language === "zh" ? "不能为空。" : "không được để trống.";
        }
        if (language === "en") return `must be at least ${issueRecord.minimum} characters.`;
        if (language === "zh") return `至少 ${issueRecord.minimum} 个字符。`;
        return `phải có ít nhất ${issueRecord.minimum} ký tự.`;
      }
      if (origin === "number") {
        if (language === "en") return `must be at least ${issueRecord.minimum}.`;
        if (language === "zh") return `不能小于 ${issueRecord.minimum}。`;
        return `không được nhỏ hơn ${issueRecord.minimum}.`;
      }
      return translateBackendText(issue.message || (language === "en" ? "is too short." : language === "zh" ? "内容过短。" : "nội dung quá ngắn."));
    case "too_big":
      if (origin === "array") {
        if (language === "en") return `must contain at most ${issueRecord.maximum} items.`;
        if (language === "zh") return `最多只能填写 ${issueRecord.maximum} 项。`;
        return `chỉ được có tối đa ${issueRecord.maximum} mục.`;
      }
      if (origin === "string") {
        if (language === "en") return `cannot exceed ${issueRecord.maximum} characters.`;
        if (language === "zh") return `不能超过 ${issueRecord.maximum} 个字符。`;
        return `không được vượt quá ${issueRecord.maximum} ký tự.`;
      }
      if (origin === "number") {
        if (language === "en") return `cannot be greater than ${issueRecord.maximum}.`;
        if (language === "zh") return `不能大于 ${issueRecord.maximum}。`;
        return `không được lớn hơn ${issueRecord.maximum}.`;
      }
      return translateBackendText(issue.message || (language === "en" ? "is too long." : language === "zh" ? "内容过长。" : "nội dung quá dài."));
    default:
      return translateBackendText(issue.message || (language === "en" ? "has an invalid format." : language === "zh" ? "格式不正确。" : "định dạng không hợp lệ."));
  }
}

export function formatValidationIssue(issue: ZodIssue): string {
  const language = getBackendLanguage(getRequestLocale());
  const path = formatValidationPath(issue.path);
  const message = formatZodIssueMessage(issue);
  return path ? `${path}${getSeparator(language)}${message}` : message;
}
