import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AIOutputLanguage, AppLocale, AppPreferences } from "@ai-novel/shared/types/appPreferences";
import { getAppPreferences } from "@/api/settings";
import { queryKeys } from "@/api/queryKeys";

const APP_PREFERENCES_STORAGE_KEY = "ai-novel.app-preferences";

const translations = {
  "zh-CN": {
    "brand.title": "AI 小说创作工作台",
    "brand.subtitle": "AI Novel Production Engine",
    "navbar.projectNavigation": "项目导航",
    "navbar.workspaceNavigation": "创作导航",
    "sidebar.expand": "展开导航栏",
    "sidebar.collapse": "收起导航栏",
    "sidebar.group.create": "创作",
    "sidebar.group.assets": "资产",
    "sidebar.group.system": "系统",
    "nav.home": "首页",
    "nav.novels": "小说列表",
    "nav.creativeHub": "创作中枢",
    "nav.bookAnalysis": "拆书",
    "nav.tasks": "任务中心",
    "nav.genres": "题材基底库",
    "nav.storyModes": "推进模式库",
    "nav.titles": "标题工坊",
    "nav.knowledge": "知识库",
    "nav.worlds": "世界观",
    "nav.styleEngine": "写法引擎",
    "nav.baseCharacters": "基础角色库",
    "nav.modelRoutes": "模型路由",
    "nav.settings": "系统设置",
    "language.switcher.ariaLabel": "切换界面语言",
    "language.switcher.label": "界面语言",
    "language.switcher.description": "新切换的语言会立即生效，并默认同步 AI 输出语言。",
    "language.uiLocale": "界面语言",
    "language.aiOutputLanguage": "AI 输出语言",
    "language.aiOutputLanguageDescription": "决定 AI 在规划、创作和对话中的默认回复语言。",
    "language.saved": "语言设置已保存。",
    "language.saveFailed": "语言设置保存失败。",
    "language.option.zh": "简体中文",
    "language.option.en": "English",
    "language.option.vi": "Tiếng Việt",
    "home.metrics.live.title": "自动推进中",
    "home.metrics.live.hint": "当前仍在后台推进中的自动导演或自动执行项目。",
    "home.metrics.action.title": "待你处理",
    "home.metrics.action.hint": "等待审核、失败或已取消后需要你决定下一步的项目。",
    "home.metrics.ready.title": "可进入章节执行",
    "home.metrics.ready.hint": "已经准备到可开写阶段，可以直接进入章节写作。",
    "home.metrics.failed.title": "后台失败任务",
    "home.metrics.failed.hint": "来自任务中心的失败任务总数，可后续集中处理。",
    "home.beginner": "新手推荐",
    "home.lowBarrier": "低门槛开书",
    "home.hero.withProjects": "想快速开启下一本书？先交给 AI 自动导演。",
    "home.hero.withoutProjects": "第一次使用？先让 AI 自动导演带你开一本书。",
    "home.hero.description": "你只需要提供一个模糊想法，AI 会先帮你生成方向方案、标题包和开书准备，并在关键阶段停下来等你确认，不需要你一开始就把结构全部想清楚。",
    "home.hero.tip1": "适合还没想清楚题材、卖点和前 30 章承诺时使用",
    "home.hero.tip2": "也适合先快速搭起一本可继续推进的新项目",
    "home.action.autoDirector": "AI 自动导演开书",
    "home.action.manualCreate": "手动创建小说",
    "home.resume.title": "继续最近项目",
    "home.resume.description": "首页应该直接把你送回当前最值得继续的一本书。",
    "home.resume.loadError": "当前无法读取项目列表，首页没法为你推荐下一步入口。",
    "home.resume.reload": "重新加载项目",
    "home.resume.noProjects": "你还没有开始小说项目。第一次使用时，推荐直接走 AI 自动导演，它会先帮你搭好方向和开写准备。",
    "home.quickActions.title": "快捷操作",
    "home.quickActions.description": "把常用入口和新手最容易上手的开书方式放在一起。",
    "home.quickActions.bookAnalysis": "新建拆书",
    "home.quickActions.taskCenter": "打开任务中心",
    "home.recent.title": "最近项目",
    "home.recent.description": "这里不只显示标题，也直接显示当前所处阶段和恢复入口。",
    "home.recent.loadError": "当前无法加载最近项目，稍后可以重试。",
    "home.recent.empty": "暂无小说项目，先从“新建小说”开始。",
    "home.noWorkflowTask": "无自动导演任务",
    "common.progress": "进度 {value}%",
    "common.published": "已发布",
    "common.draft": "草稿",
    "common.continuation": "续写",
    "common.original": "原创",
    "common.updatedAt": "更新时间：{value}",
    "common.chapterCount": "章节数：{value}",
    "common.characterCount": "角色数：{value}",
    "common.currentStage": "当前阶段：{value}",
    "common.stage": "阶段：{value}",
    "common.lastHealthyStage": "最近健康阶段：{value}",
    "common.taskCenter": "任务中心",
    "common.openProject": "打开项目",
    "common.viewTask": "查看任务",
    "common.editNovel": "编辑小说",
    "common.enterChapterExecution": "进入章节执行",
    "common.notAvailable": "暂无",
    "settings.language.title": "语言与本地化",
    "settings.language.description": "先把界面语言和 AI 默认回复语言解耦出来，便于面向不同市场发布。",
    "settings.language.uiLabel": "界面语言",
    "settings.language.outputLabel": "AI 默认回复语言",
    "settings.language.helper": "顶部切换器默认会让 AI 跟随界面语言；这里可以单独覆盖。",
    "settings.language.save": "保存语言设置",
  },
  "en-US": {
    "brand.title": "AI Novel Studio",
    "brand.subtitle": "AI Novel Production Engine",
    "navbar.projectNavigation": "Project Nav",
    "navbar.workspaceNavigation": "Writing Nav",
    "sidebar.expand": "Expand sidebar",
    "sidebar.collapse": "Collapse sidebar",
    "sidebar.group.create": "Create",
    "sidebar.group.assets": "Assets",
    "sidebar.group.system": "System",
    "nav.home": "Home",
    "nav.novels": "Novels",
    "nav.creativeHub": "Creative Hub",
    "nav.bookAnalysis": "Book Analysis",
    "nav.tasks": "Task Center",
    "nav.genres": "Genre Library",
    "nav.storyModes": "Story Modes",
    "nav.titles": "Title Studio",
    "nav.knowledge": "Knowledge",
    "nav.worlds": "Worlds",
    "nav.styleEngine": "Style Engine",
    "nav.baseCharacters": "Base Characters",
    "nav.modelRoutes": "Model Routes",
    "nav.settings": "Settings",
    "language.switcher.ariaLabel": "Switch interface language",
    "language.switcher.label": "Interface language",
    "language.switcher.description": "The new language applies immediately and also becomes the default AI output language.",
    "language.uiLocale": "Interface language",
    "language.aiOutputLanguage": "AI output language",
    "language.aiOutputLanguageDescription": "Controls the default language used by AI for planning, drafting, and chat replies.",
    "language.saved": "Language preferences saved.",
    "language.saveFailed": "Failed to save language preferences.",
    "language.option.zh": "Simplified Chinese",
    "language.option.en": "English",
    "language.option.vi": "Tiếng Việt",
    "home.metrics.live.title": "Running",
    "home.metrics.live.hint": "Auto-director and background execution jobs that are still moving forward.",
    "home.metrics.action.title": "Needs You",
    "home.metrics.action.hint": "Projects waiting for your decision after review, failure, or cancellation.",
    "home.metrics.ready.title": "Ready for Chapters",
    "home.metrics.ready.hint": "Projects that are ready to move directly into chapter drafting.",
    "home.metrics.failed.title": "Failed Tasks",
    "home.metrics.failed.hint": "Failed background tasks collected from the task center.",
    "home.beginner": "Beginner pick",
    "home.lowBarrier": "Low-friction kickoff",
    "home.hero.withProjects": "Starting the next book fast? Let the AI Auto Director handle the setup.",
    "home.hero.withoutProjects": "First time here? Let the AI Auto Director open your first book.",
    "home.hero.description": "You can start from a fuzzy idea. The AI will propose directions, title packs, and setup materials, then pause at key checkpoints so you can confirm without planning the whole structure upfront.",
    "home.hero.tip1": "Best when you have not locked the genre, hook, or first-30-chapter promise yet",
    "home.hero.tip2": "Also useful for spinning up a new project you can keep pushing later",
    "home.action.autoDirector": "Start with AI Auto Director",
    "home.action.manualCreate": "Create Manually",
    "home.resume.title": "Resume the Best Project",
    "home.resume.description": "Home should send you straight back to the book that matters most right now.",
    "home.resume.loadError": "The project list is unavailable right now, so Home cannot recommend the next step.",
    "home.resume.reload": "Reload Projects",
    "home.resume.noProjects": "You have not started a novel project yet. For a first run, the AI Auto Director is the easiest path because it prepares direction and writing setup for you.",
    "home.quickActions.title": "Quick Actions",
    "home.quickActions.description": "Keep the most common entry points and easiest beginner flows together.",
    "home.quickActions.bookAnalysis": "New Book Analysis",
    "home.quickActions.taskCenter": "Open Task Center",
    "home.recent.title": "Recent Projects",
    "home.recent.description": "This list shows the current phase and recovery path, not just titles.",
    "home.recent.loadError": "Recent projects cannot be loaded right now. Try again in a moment.",
    "home.recent.empty": "No novel projects yet. Start with creating a new novel.",
    "home.noWorkflowTask": "No auto-director task",
    "common.progress": "Progress {value}%",
    "common.published": "Published",
    "common.draft": "Draft",
    "common.continuation": "Continuation",
    "common.original": "Original",
    "common.updatedAt": "Updated: {value}",
    "common.chapterCount": "Chapters: {value}",
    "common.characterCount": "Characters: {value}",
    "common.currentStage": "Current stage: {value}",
    "common.stage": "Stage: {value}",
    "common.lastHealthyStage": "Last healthy stage: {value}",
    "common.taskCenter": "Task Center",
    "common.openProject": "Open Project",
    "common.viewTask": "View Task",
    "common.editNovel": "Edit Novel",
    "common.enterChapterExecution": "Open Chapter Execution",
    "common.notAvailable": "N/A",
    "settings.language.title": "Language & Localization",
    "settings.language.description": "Split interface language from AI reply language so the product can ship cleanly into different markets.",
    "settings.language.uiLabel": "Interface language",
    "settings.language.outputLabel": "Default AI reply language",
    "settings.language.helper": "The top switcher makes AI follow the UI language by default. Override it here if needed.",
    "settings.language.save": "Save Language Settings",
  },
  "vi-VN": {
    "brand.title": "Xưởng Viết Tiểu Thuyết AI",
    "brand.subtitle": "AI Novel Production Engine",
    "navbar.projectNavigation": "Điều hướng dự án",
    "navbar.workspaceNavigation": "Điều hướng viết",
    "sidebar.expand": "Mở thanh điều hướng",
    "sidebar.collapse": "Thu gọn thanh điều hướng",
    "sidebar.group.create": "Sáng tác",
    "sidebar.group.assets": "Tài nguyên",
    "sidebar.group.system": "Hệ thống",
    "nav.home": "Trang chủ",
    "nav.novels": "Tiểu thuyết",
    "nav.creativeHub": "Trung tâm sáng tác",
    "nav.bookAnalysis": "Phân tích sách",
    "nav.tasks": "Trung tâm tác vụ",
    "nav.genres": "Thư viện thể loại",
    "nav.storyModes": "Thư viện nhịp truyện",
    "nav.titles": "Xưởng tiêu đề",
    "nav.knowledge": "Kho tri thức",
    "nav.worlds": "Thế giới",
    "nav.styleEngine": "Động cơ văn phong",
    "nav.baseCharacters": "Thư viện nhân vật gốc",
    "nav.modelRoutes": "Tuyến mô hình",
    "nav.settings": "Cài đặt",
    "language.switcher.ariaLabel": "Đổi ngôn ngữ giao diện",
    "language.switcher.label": "Ngôn ngữ giao diện",
    "language.switcher.description": "Ngôn ngữ mới sẽ áp dụng ngay và mặc định đồng bộ luôn ngôn ngữ trả lời của AI.",
    "language.uiLocale": "Ngôn ngữ giao diện",
    "language.aiOutputLanguage": "Ngôn ngữ trả lời của AI",
    "language.aiOutputLanguageDescription": "Quy định ngôn ngữ mặc định AI dùng khi lập kế hoạch, viết và trò chuyện.",
    "language.saved": "Đã lưu thiết lập ngôn ngữ.",
    "language.saveFailed": "Không lưu được thiết lập ngôn ngữ.",
    "language.option.zh": "Tiếng Trung giản thể",
    "language.option.en": "English",
    "language.option.vi": "Tiếng Việt",
    "home.metrics.live.title": "Đang tự động chạy",
    "home.metrics.live.hint": "Các dự án Auto Director hoặc chạy nền vẫn đang tiếp tục tiến lên.",
    "home.metrics.action.title": "Cần bạn xử lý",
    "home.metrics.action.hint": "Các dự án đang chờ bạn quyết định bước tiếp theo sau khi duyệt, lỗi hoặc hủy.",
    "home.metrics.ready.title": "Sẵn sàng viết chương",
    "home.metrics.ready.hint": "Các dự án đã chuẩn bị xong để vào viết chương ngay.",
    "home.metrics.failed.title": "Tác vụ nền lỗi",
    "home.metrics.failed.hint": "Tổng số tác vụ lỗi lấy từ trung tâm tác vụ để xử lý sau.",
    "home.beginner": "Khuyên dùng cho người mới",
    "home.lowBarrier": "Khởi tạo dễ nhất",
    "home.hero.withProjects": "Muốn mở nhanh cuốn tiếp theo? Hãy giao phần dựng khởi đầu cho AI Auto Director.",
    "home.hero.withoutProjects": "Lần đầu sử dụng? Hãy để AI Auto Director dẫn bạn mở cuốn đầu tiên.",
    "home.hero.description": "Bạn chỉ cần một ý tưởng còn mơ hồ. AI sẽ tạo hướng đi, gói tiêu đề và phần chuẩn bị mở sách, rồi dừng ở các mốc quan trọng để bạn xác nhận thay vì bắt bạn nghĩ xong toàn bộ cấu trúc ngay từ đầu.",
    "home.hero.tip1": "Phù hợp khi bạn chưa chốt được thể loại, điểm bán hay lời hứa của 30 chương đầu",
    "home.hero.tip2": "Cũng phù hợp để dựng thật nhanh một dự án mới có thể tiếp tục đẩy về sau",
    "home.action.autoDirector": "Mở sách với AI Auto Director",
    "home.action.manualCreate": "Tạo thủ công",
    "home.resume.title": "Tiếp tục dự án đáng làm nhất",
    "home.resume.description": "Trang chủ nên đưa bạn thẳng về cuốn sách đáng tiếp tục nhất ở thời điểm này.",
    "home.resume.loadError": "Hiện không đọc được danh sách dự án nên trang chủ chưa thể gợi ý bước tiếp theo.",
    "home.resume.reload": "Tải lại dự án",
    "home.resume.noProjects": "Bạn chưa bắt đầu dự án tiểu thuyết nào. Với lần đầu sử dụng, AI Auto Director là đường đi dễ nhất vì nó chuẩn bị giúp bạn cả hướng đi lẫn khâu mở viết.",
    "home.quickActions.title": "Thao tác nhanh",
    "home.quickActions.description": "Đặt các lối vào dùng nhiều nhất và các flow dễ nhất cho người mới ở cùng một chỗ.",
    "home.quickActions.bookAnalysis": "Tạo phân tích sách",
    "home.quickActions.taskCenter": "Mở trung tâm tác vụ",
    "home.recent.title": "Dự án gần đây",
    "home.recent.description": "Danh sách này hiển thị luôn giai đoạn hiện tại và lối phục hồi, không chỉ mỗi tiêu đề.",
    "home.recent.loadError": "Hiện không tải được dự án gần đây. Hãy thử lại sau.",
    "home.recent.empty": "Chưa có dự án tiểu thuyết nào. Hãy bắt đầu bằng việc tạo tiểu thuyết mới.",
    "home.noWorkflowTask": "Chưa có tác vụ Auto Director",
    "common.progress": "Tiến độ {value}%",
    "common.published": "Đã xuất bản",
    "common.draft": "Bản nháp",
    "common.continuation": "Viết tiếp",
    "common.original": "Nguyên tác",
    "common.updatedAt": "Cập nhật: {value}",
    "common.chapterCount": "Số chương: {value}",
    "common.characterCount": "Nhân vật: {value}",
    "common.currentStage": "Giai đoạn hiện tại: {value}",
    "common.stage": "Giai đoạn: {value}",
    "common.lastHealthyStage": "Giai đoạn ổn định gần nhất: {value}",
    "common.taskCenter": "Trung tâm tác vụ",
    "common.openProject": "Mở dự án",
    "common.viewTask": "Xem tác vụ",
    "common.editNovel": "Sửa tiểu thuyết",
    "common.enterChapterExecution": "Vào viết chương",
    "common.notAvailable": "Chưa có",
    "settings.language.title": "Ngôn ngữ và bản địa hóa",
    "settings.language.description": "Tách riêng ngôn ngữ giao diện và ngôn ngữ phản hồi của AI để sản phẩm có thể phát hành gọn cho nhiều thị trường.",
    "settings.language.uiLabel": "Ngôn ngữ giao diện",
    "settings.language.outputLabel": "Ngôn ngữ phản hồi mặc định của AI",
    "settings.language.helper": "Bộ chuyển trên thanh đầu mặc định sẽ cho AI đi theo ngôn ngữ giao diện; bạn có thể ghi đè riêng tại đây.",
    "settings.language.save": "Lưu thiết lập ngôn ngữ",
  },
} as const satisfies Record<AppLocale, Record<string, string>>;

export const APP_LOCALE_OPTIONS: AppLocale[] = ["zh-CN", "en-US", "vi-VN"];
export const AI_OUTPUT_LANGUAGE_OPTIONS: AIOutputLanguage[] = ["zh", "en", "vi"];

type TranslationKey = keyof typeof translations["zh-CN"];

interface I18nContextValue {
  locale: AppLocale;
  aiOutputLanguage: AIOutputLanguage;
  preferences: AppPreferences;
  setPreferences: (next: AppPreferences) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function getDefaultAiOutputLanguageForLocale(locale: AppLocale): AIOutputLanguage {
  if (locale === "vi-VN") {
    return "vi";
  }
  if (locale === "en-US") {
    return "en";
  }
  return "zh";
}

function normalizeUiLocale(value: string | undefined | null): AppLocale {
  if (value === "en-US" || value === "vi-VN" || value === "zh-CN") {
    return value;
  }
  return "zh-CN";
}

function normalizeAiOutputLanguage(value: string | undefined | null): AIOutputLanguage {
  if (value === "en" || value === "vi" || value === "zh") {
    return value;
  }
  return "zh";
}

function normalizeAppPreferences(value: Partial<AppPreferences> | null | undefined): AppPreferences {
  const uiLocale = normalizeUiLocale(value?.uiLocale);
  return {
    uiLocale,
    aiOutputLanguage: normalizeAiOutputLanguage(value?.aiOutputLanguage ?? getDefaultAiOutputLanguageForLocale(uiLocale)),
  };
}

function resolveBrowserLocale(): AppLocale {
  if (typeof window === "undefined") {
    return "zh-CN";
  }
  const browserLocale = window.navigator.language.toLowerCase();
  if (browserLocale.startsWith("vi")) {
    return "vi-VN";
  }
  if (browserLocale.startsWith("en")) {
    return "en-US";
  }
  return "zh-CN";
}

function readStoredPreferences(): AppPreferences {
  if (typeof window === "undefined") {
    return normalizeAppPreferences(undefined);
  }
  const raw = window.localStorage.getItem(APP_PREFERENCES_STORAGE_KEY);
  if (!raw) {
    const uiLocale = resolveBrowserLocale();
    return {
      uiLocale,
      aiOutputLanguage: getDefaultAiOutputLanguageForLocale(uiLocale),
    };
  }
  try {
    return normalizeAppPreferences(JSON.parse(raw) as Partial<AppPreferences>);
  } catch {
    return normalizeAppPreferences(undefined);
  }
}

function translate(
  locale: AppLocale,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  const template = translations[locale][key] ?? translations["zh-CN"][key] ?? key;
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (_match, token) => String(params[token] ?? `{${token}}`));
}

export function I18nProvider(props: { children: ReactNode }) {
  const { children } = props;
  const [preferences, setPreferences] = useState<AppPreferences>(() => readStoredPreferences());
  const [hydratedFromServer, setHydratedFromServer] = useState(false);

  const preferencesQuery = useQuery({
    queryKey: queryKeys.settings.appPreferences,
    queryFn: getAppPreferences,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const data = preferencesQuery.data?.data;
    if (!data || hydratedFromServer) {
      return;
    }
    setPreferences(normalizeAppPreferences(data));
    setHydratedFromServer(true);
  }, [hydratedFromServer, preferencesQuery.data?.data]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(APP_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
    document.documentElement.lang = preferences.uiLocale;
  }, [preferences]);

  return (
    <I18nContext.Provider
      value={{
        locale: preferences.uiLocale,
        aiOutputLanguage: preferences.aiOutputLanguage,
        preferences,
        setPreferences: (next) => setPreferences(normalizeAppPreferences(next)),
        t: (key, params) => translate(preferences.uiLocale, key, params),
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider.");
  }
  return context;
}
