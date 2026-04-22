import type { BookAnalysisSectionKey, BookAnalysisStatus } from "@ai-novel/shared/types/bookAnalysis";
import { getBackendLanguage, type BackendLocale, type BackendLanguage } from "../../i18n/locale";

type BookAnalysisLocaleText = {
  sectionTitles: Record<BookAnalysisSectionKey, string>;
  sectionPrompts: Record<BookAnalysisSectionKey, string>;
  promptLabels: {
    summary: string;
    plotPoints: string;
    timelineEvents: string;
    characters: string;
    worldbuilding: string;
    themes: string;
    styleTechniques: string;
    marketHighlights: string;
    readerSignals: string;
    weaknessSignals: string;
    evidence: string;
    none: string;
  };
  progress: {
    cacheLookup: string;
    cacheHit: string;
    segment: string;
    section: string;
  };
  export: {
    emptyContent: string;
    publishDocumentTitle: string;
    publishedHeadingSuffix: string;
    publishMetadataHeading: string;
    sourceAnalysisId: string;
    sourceDocument: string;
    sourceFileName: string;
    sourceVersion: string;
    currentVersion: string;
    status: string;
    publishedAt: string;
    document: string;
    originalFile: string;
    summary: string;
    editorNotesHeading: string;
    evidenceHeading: string;
  };
  statusLabels: Record<BookAnalysisStatus, string>;
  fallbacks: {
    fragmentLabel: string;
    sourceDocumentLabel: string;
    segmentLabel: string;
    copySuffix: string;
  };
  separators: {
    value: string;
    list: string;
  };
};

const BOOK_ANALYSIS_LOCALE_TEXT: Record<BackendLanguage, BookAnalysisLocaleText> = {
  vi: {
    sectionTitles: {
      overview: "Tổng quan phân tích sách",
      plot_structure: "Cấu trúc cốt truyện",
      timeline: "Dòng thời gian câu chuyện",
      character_system: "Hệ thống nhân vật",
      worldbuilding: "Thế giới quan và thiết lập",
      themes: "Chủ đề",
      style_technique: "Văn phong và kỹ pháp",
      market_highlights: "Điểm mạnh thương mại",
    },
    sectionPrompts: {
      overview: "Hãy viết phần tổng quan phân tích sách, gồm định vị một câu, nhãn thể loại, nhãn điểm bán, độc giả mục tiêu, ưu điểm tổng thể và điểm yếu tổng thể; ưu tiên các nhận định an toàn dựa trên ghi chú toàn bộ tác phẩm.",
      plot_structure: "Hãy phân tích cấu trúc cốt truyện, gồm trục truyện chính, nhịp tiến triển theo từng giai đoạn, cách leo thang xung đột, điểm bùng nổ, nhịp độ, tổ chức chương hồi, vấn đề cấu trúc, điểm mạnh cấu trúc và mô thức có thể tái sử dụng.",
      timeline: "Hãy phân tích dòng thời gian câu chuyện, gồm các mốc quan trọng, quan hệ trước sau giữa sự kiện, các chặng chính của tuyến truyện, những điểm chuyển trạng thái nhân vật và rủi ro về độ dài thời gian hay tiết tấu.",
      character_system: "Hãy phân tích hệ thống nhân vật, gồm định vị nhân vật chính, vai trò của nhân vật phụ và phản diện, mạng lưới quan hệ, cung phát triển, các điểm sáng nhân vật và mức độ rõ ràng trong phân công chức năng.",
      worldbuilding: "Hãy phân tích thế giới quan và thiết lập, gồm khung thế giới, hệ thống quy tắc, điểm sáng của thiết lập, cách thiết lập phục vụ cốt truyện và những rủi ro hoặc điểm yếu của phần thiết lập.",
      themes: "Hãy phân tích chủ đề, gồm chủ đề cốt lõi, ý trung tâm, tông cảm xúc, hình tượng hoặc mô-típ tượng trưng, cách chủ đề được thể hiện và rủi ro khi triển khai chủ đề.",
      style_technique: "Hãy phân tích văn phong và kỹ pháp, gồm góc nhìn kể chuyện, phong cách ngôn ngữ, cách miêu tả, đặc trưng đối thoại, kiểm soát nhịp, thiết kế móc câu và những cách viết có thể tái sử dụng.",
      market_highlights: "Hãy phân tích điểm mạnh thương mại, gồm khoái cảm đọc, động lực bấm đọc, điểm bán của nhân vật, điểm bán của đề tài, mức độ khớp với độc giả mục tiêu và các rủi ro thương mại.",
    },
    promptLabels: {
      summary: "Tóm tắt",
      plotPoints: "Điểm cốt truyện",
      timelineEvents: "Mốc thời gian",
      characters: "Thông tin nhân vật",
      worldbuilding: "Thông tin thiết lập",
      themes: "Thông tin chủ đề",
      styleTechniques: "Văn phong và kỹ pháp",
      marketHighlights: "Điểm mạnh thương mại",
      readerSignals: "Tín hiệu độc giả",
      weaknessSignals: "Dấu hiệu điểm yếu",
      evidence: "Trích dẫn làm bằng chứng",
      none: "Không có",
    },
    progress: {
      cacheLookup: "Đang kiểm tra bộ nhớ đệm ghi chú nguồn",
      cacheHit: "Đã dùng lại bộ nhớ đệm phân đoạn · tổng {{segmentCount}} đoạn",
      segment: "Phân đoạn {{index}}/{{total}} · {{label}}",
      section: "Mục {{index}}/{{total}} · {{label}}",
    },
    export: {
      emptyContent: "_Chưa có nội dung_",
      publishDocumentTitle: "{{documentTitle}} | Bản phát hành phân tích sách ({{id}})",
      publishedHeadingSuffix: "(Bản phát hành)",
      publishMetadataHeading: "## Thông tin phát hành",
      sourceAnalysisId: "ID phân tích nguồn",
      sourceDocument: "Tài liệu nguồn",
      sourceFileName: "Tên tệp nguồn",
      sourceVersion: "Phiên bản nguồn",
      currentVersion: "Phiên bản đang kích hoạt",
      status: "Trạng thái",
      publishedAt: "Thời điểm phát hành",
      document: "Tài liệu",
      originalFile: "Tệp gốc",
      summary: "Tóm tắt",
      editorNotesHeading: "### Ghi chú biên tập",
      evidenceHeading: "### Trích dẫn làm bằng chứng",
    },
    statusLabels: {
      draft: "bản nháp",
      queued: "đang chờ",
      running: "đang chạy",
      succeeded: "hoàn tất",
      failed: "thất bại",
      cancelled: "đã hủy",
      archived: "đã lưu trữ",
    },
    fallbacks: {
      fragmentLabel: "Phân đoạn",
      sourceDocumentLabel: "Tài liệu nguồn",
      segmentLabel: "Phân đoạn",
      copySuffix: " - bản sao",
    },
    separators: {
      value: ": ",
      list: "; ",
    },
  },
  en: {
    sectionTitles: {
      overview: "Book Analysis Overview",
      plot_structure: "Plot Structure",
      timeline: "Story Timeline",
      character_system: "Character System",
      worldbuilding: "Worldbuilding and Setting",
      themes: "Themes",
      style_technique: "Style and Technique",
      market_highlights: "Market Highlights",
    },
    sectionPrompts: {
      overview: "Produce a high-level book analysis overview that covers the one-line positioning, genre tags, selling-point tags, target readership, overall strengths, and overall weaknesses, while preferring low-risk judgments grounded in the notes for the whole work.",
      plot_structure: "Analyze the plot structure, including the core storyline, stage-by-stage progression, conflict escalation, standout high points, pacing, chapter organization, structural issues, structural strengths, and reusable plot patterns.",
      timeline: "Analyze the story timeline, including key time markers, event ordering, major storyline phases, character-state transition points, and any risks in elapsed time or pacing.",
      character_system: "Analyze the character system, including protagonist positioning, the function of supporting characters and antagonists, the relationship network, growth arcs, standout character moments, and clarity of role assignment.",
      worldbuilding: "Analyze the worldbuilding and setting, including the world framework, rule systems, standout setting ideas, how the setting serves the plot, and any setting risks or weaknesses.",
      themes: "Analyze the thematic layer, including the core themes, thematic focus, emotional tone, symbolic motifs, how the themes are expressed, and any risks in thematic execution.",
      style_technique: "Analyze the writing style and technique, including narrative perspective, language style, description methods, dialogue traits, pacing control, hook design, and reusable writing techniques.",
      market_highlights: "Analyze the commercial highlights, including reader gratification points, click-driving hooks, character selling points, genre selling points, fit with the target readership, and commercialization risks.",
    },
    promptLabels: {
      summary: "Summary",
      plotPoints: "Plot Points",
      timelineEvents: "Timeline Events",
      characters: "Character Notes",
      worldbuilding: "Worldbuilding Notes",
      themes: "Theme Notes",
      styleTechniques: "Style and Technique",
      marketHighlights: "Market Highlights",
      readerSignals: "Reader Signals",
      weaknessSignals: "Weakness Signals",
      evidence: "Evidence Excerpts",
      none: "None",
    },
    progress: {
      cacheLookup: "Checking source-note cache",
      cacheHit: "Reused cached segments · {{segmentCount}} total",
      segment: "Segment {{index}}/{{total}} · {{label}}",
      section: "Section {{index}}/{{total}} · {{label}}",
    },
    export: {
      emptyContent: "_No content yet_",
      publishDocumentTitle: "{{documentTitle}} | Book analysis publication ({{id}})",
      publishedHeadingSuffix: "(Published)",
      publishMetadataHeading: "## Publication Metadata",
      sourceAnalysisId: "Source analysis ID",
      sourceDocument: "Source document",
      sourceFileName: "Source filename",
      sourceVersion: "Source version",
      currentVersion: "Current active version",
      status: "Status",
      publishedAt: "Published at",
      document: "Document",
      originalFile: "Original file",
      summary: "Summary",
      editorNotesHeading: "### Editorial Notes",
      evidenceHeading: "### Evidence Excerpts",
    },
    statusLabels: {
      draft: "draft",
      queued: "queued",
      running: "running",
      succeeded: "succeeded",
      failed: "failed",
      cancelled: "cancelled",
      archived: "archived",
    },
    fallbacks: {
      fragmentLabel: "Segment",
      sourceDocumentLabel: "Source document",
      segmentLabel: "Segment",
      copySuffix: " - copy",
    },
    separators: {
      value: ": ",
      list: "; ",
    },
  },
  zh: {
    sectionTitles: {
      overview: "拆书总览",
      plot_structure: "剧情结构",
      timeline: "故事时间线",
      character_system: "人物系统",
      worldbuilding: "世界观与设定",
      themes: "主题表达",
      style_technique: "文风与技法",
      market_highlights: "商业化卖点",
    },
    sectionPrompts: {
      overview: "请输出拆书总览，覆盖：一句话定位、题材标签、卖点标签、目标读者、整体优势、整体短板，并优先做基于整书笔记的低风险综合判断。",
      plot_structure: "请分析剧情结构，覆盖：主线梗概、阶段推进、冲突升级、高光设计、节奏评估、章节组织、结构问题、结构亮点、可复用套路。",
      timeline: "请分析故事时间线，覆盖：关键时间节点、事件先后关系、主线阶段划分、角色状态变化节点、时间跨度与节奏风险。",
      character_system: "请分析人物系统，覆盖：主角定位、配角与反派功能、关系网络、成长弧线、人物高光、分工清晰度。",
      worldbuilding: "请分析世界观与设定，覆盖：世界框架、规则系统、关键设定亮点、设定如何服务剧情、设定问题或风险。",
      themes: "请分析主题表达，覆盖：核心主题、题眼、情绪基调、象征母题、主题呈现方式、主题表达风险。",
      style_technique: "请分析文风与技法，覆盖：叙事视角、语言风格、描写方式、对话特征、节奏控制、钩子设计、可复用写法。",
      market_highlights: "请分析商业化卖点，覆盖：读者爽点、点击驱动、人物卖点、题材卖点、目标读者匹配点、商业化风险。",
    },
    promptLabels: {
      summary: "摘要",
      plotPoints: "剧情要点",
      timelineEvents: "时间线节点",
      characters: "人物信息",
      worldbuilding: "设定信息",
      themes: "主题信息",
      styleTechniques: "文风技法",
      marketHighlights: "商业卖点",
      readerSignals: "读者信号",
      weaknessSignals: "短板信号",
      evidence: "证据摘录",
      none: "无",
    },
    progress: {
      cacheLookup: "查找 source notes 缓存",
      cacheHit: "片段缓存命中 · 共 {{segmentCount}} 段",
      segment: "片段 {{index}}/{{total}} · {{label}}",
      section: "分节 {{index}}/{{total}} · {{label}}",
    },
    export: {
      emptyContent: "_暂无内容_",
      publishDocumentTitle: "{{documentTitle}}｜拆书发布({{id}})",
      publishedHeadingSuffix: "（发布版）",
      publishMetadataHeading: "## 发布元信息",
      sourceAnalysisId: "来源拆书ID",
      sourceDocument: "来源文档",
      sourceFileName: "来源文件名",
      sourceVersion: "来源版本",
      currentVersion: "当前激活版本",
      status: "拆书状态",
      publishedAt: "发布时间",
      document: "文档",
      originalFile: "原文件",
      summary: "摘要",
      editorNotesHeading: "### 人工备注",
      evidenceHeading: "### 证据摘录",
    },
    statusLabels: {
      draft: "草稿",
      queued: "排队中",
      running: "执行中",
      succeeded: "已完成",
      failed: "失败",
      cancelled: "已取消",
      archived: "已归档",
    },
    fallbacks: {
      fragmentLabel: "片段",
      sourceDocumentLabel: "源文档",
      segmentLabel: "片段",
      copySuffix: " - 副本",
    },
    separators: {
      value: "：",
      list: "；",
    },
  },
};

function getLocaleText(locale?: BackendLocale): BookAnalysisLocaleText {
  return BOOK_ANALYSIS_LOCALE_TEXT[getBackendLanguage(locale)];
}

function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => String(params[key] ?? ""));
}

function safeDecodeProgressLabel(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function getBookAnalysisSectionTitle(sectionKey: BookAnalysisSectionKey, locale?: BackendLocale): string {
  return getLocaleText(locale).sectionTitles[sectionKey];
}

export function getBookAnalysisSectionPrompt(sectionKey: BookAnalysisSectionKey, locale?: BackendLocale): string {
  return getLocaleText(locale).sectionPrompts[sectionKey];
}

export function getBookAnalysisFragmentLabel(locale?: BackendLocale): string {
  return getLocaleText(locale).fallbacks.fragmentLabel;
}

export function getBookAnalysisSourceDocumentLabel(locale?: BackendLocale): string {
  return getLocaleText(locale).fallbacks.sourceDocumentLabel;
}

export function buildBookAnalysisSegmentLabel(order: number, locale?: BackendLocale): string {
  return `${getLocaleText(locale).fallbacks.segmentLabel} ${order}`;
}

export function buildBookAnalysisCopyTitle(sourceTitle: string, locale?: BackendLocale): string {
  return `${sourceTitle}${getLocaleText(locale).fallbacks.copySuffix}`;
}

export function formatBookAnalysisCacheLookupLabel(locale?: BackendLocale): string {
  return getLocaleText(locale).progress.cacheLookup;
}

export function formatBookAnalysisCacheHitLabel(segmentCount: number, locale?: BackendLocale): string {
  return interpolate(getLocaleText(locale).progress.cacheHit, { segmentCount });
}

export function formatBookAnalysisSegmentProgressLabel(
  index: number,
  total: number,
  label: string,
  locale?: BackendLocale,
): string {
  return interpolate(getLocaleText(locale).progress.segment, { index, total, label });
}

export function formatBookAnalysisSectionProgressLabel(
  index: number,
  total: number,
  label: string,
  locale?: BackendLocale,
): string {
  return interpolate(getLocaleText(locale).progress.section, { index, total, label });
}

export function getBookAnalysisPromptLabels(locale?: BackendLocale): BookAnalysisLocaleText["promptLabels"] {
  return getLocaleText(locale).promptLabels;
}

export function getBookAnalysisSeparators(locale?: BackendLocale): BookAnalysisLocaleText["separators"] {
  return getLocaleText(locale).separators;
}

export function getBookAnalysisExportText(locale?: BackendLocale): BookAnalysisLocaleText["export"] {
  return getLocaleText(locale).export;
}

export function getBookAnalysisStatusLabel(status: BookAnalysisStatus, locale?: BackendLocale): string {
  return getLocaleText(locale).statusLabels[status];
}

export function buildBookAnalysisCacheLookupItemKey(): string {
  return "cache_lookup";
}

export function buildBookAnalysisCacheHitItemKey(segmentCount: number): string {
  return `cache_hit:${segmentCount}`;
}

export function buildBookAnalysisSegmentItemKey(index: number, total: number, label: string): string {
  return `segment:${index}:${total}:${encodeURIComponent(label)}`;
}

export function buildBookAnalysisSectionItemKey(
  index: number,
  total: number,
  sectionKey: BookAnalysisSectionKey,
): string {
  return `section:${index}:${total}:${sectionKey}`;
}

export function resolveBookAnalysisProgressLabel(input: {
  stage?: string | null;
  itemKey?: string | null;
  fallbackLabel?: string | null;
}): string | null {
  const itemKey = input.itemKey?.trim();
  if (!itemKey) {
    return input.fallbackLabel?.trim() || null;
  }

  if (itemKey === "cache_lookup" || itemKey === "source-notes-cache") {
    return formatBookAnalysisCacheLookupLabel();
  }

  if (itemKey.startsWith("cache_hit:")) {
    const segmentCount = Number(itemKey.slice("cache_hit:".length));
    if (Number.isFinite(segmentCount)) {
      return formatBookAnalysisCacheHitLabel(segmentCount);
    }
  }

  if (itemKey === "source-notes-cache-hit") {
    return input.fallbackLabel?.trim() || null;
  }

  if (itemKey.startsWith("segment:")) {
    const [, rawIndex, rawTotal, rawLabel = ""] = itemKey.split(":");
    const index = Number(rawIndex);
    const total = Number(rawTotal);
    if (Number.isFinite(index) && Number.isFinite(total)) {
      return formatBookAnalysisSegmentProgressLabel(index, total, safeDecodeProgressLabel(rawLabel));
    }
  }

  if (itemKey.startsWith("section:")) {
    const [, rawIndex, rawTotal, rawSectionKey] = itemKey.split(":");
    const index = Number(rawIndex);
    const total = Number(rawTotal);
    if (
      Number.isFinite(index)
      && Number.isFinite(total)
      && rawSectionKey
      && [
        "overview",
        "plot_structure",
        "timeline",
        "character_system",
        "worldbuilding",
        "themes",
        "style_technique",
        "market_highlights",
      ].includes(rawSectionKey)
    ) {
      return formatBookAnalysisSectionProgressLabel(
        index,
        total,
        getBookAnalysisSectionTitle(rawSectionKey as BookAnalysisSectionKey),
      );
    }
  }

  if (
    input.stage === "generating_sections"
    && [
      "overview",
      "plot_structure",
      "timeline",
      "character_system",
      "worldbuilding",
      "themes",
      "style_technique",
      "market_highlights",
    ].includes(itemKey)
  ) {
    return getBookAnalysisSectionTitle(itemKey as BookAnalysisSectionKey);
  }

  if (itemKey.startsWith("segment-")) {
    return input.fallbackLabel?.trim() || null;
  }

  return input.fallbackLabel?.trim() || null;
}
