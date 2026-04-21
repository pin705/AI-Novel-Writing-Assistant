import type { BookAnalysisSectionKey } from "@ai-novel/shared/types/bookAnalysis";
import { formatCommercialTagsInput, normalizeCommercialTags } from "@ai-novel/shared/types/novelFraming";

export interface NovelBasicFormState {
  title: string;
  description: string;
  targetAudience: string;
  bookSellingPoint: string;
  competingFeel: string;
  first30ChapterPromise: string;
  commercialTagsText: string;
  genreId: string;
  primaryStoryModeId: string;
  secondaryStoryModeId: string;
  worldId: string;
  status: "draft" | "published";
  writingMode: "original" | "continuation";
  projectMode: "ai_led" | "co_pilot" | "draft_mode" | "auto_pipeline";
  narrativePov: "first_person" | "third_person" | "mixed";
  pacePreference: "slow" | "balanced" | "fast";
  styleTone: string;
  emotionIntensity: "low" | "medium" | "high";
  aiFreedom: "low" | "medium" | "high";
  defaultChapterLength: number;
  estimatedChapterCount: number;
  projectStatus: "not_started" | "in_progress" | "completed" | "rework" | "blocked";
  storylineStatus: "not_started" | "in_progress" | "completed" | "rework" | "blocked";
  outlineStatus: "not_started" | "in_progress" | "completed" | "rework" | "blocked";
  resourceReadyScore: number;
  continuationSourceType: "novel" | "knowledge_document";
  sourceNovelId: string;
  sourceKnowledgeDocumentId: string;
  continuationBookAnalysisId: string;
  continuationBookAnalysisSections: BookAnalysisSectionKey[];
}

export interface BasicInfoOption<T extends string> {
  value: T;
  label: string;
  summary: string;
  recommended?: boolean;
}

export const DEFAULT_ESTIMATED_CHAPTER_COUNT = 80;

export const WRITING_MODE_OPTIONS: BasicInfoOption<NovelBasicFormState["writingMode"]>[] = [
  {
    value: "original",
    label: "Nguyên tác",
    summary: "Tạo thế giới, nhân vật và tuyến chính từ đầu, phù hợp với hầu hết dự án mới.",
    recommended: true,
  },
  {
    value: "continuation",
    label: "Viết tiếp",
    summary: "Dựa trên tiểu thuyết hoặc tài liệu tri thức có sẵn để tiếp tục sáng tác, về sau hệ thống sẽ ưu tiên nạp thiết lập và nội dung phân tích sách hiện có.",
  },
];

export const PROJECT_MODE_OPTIONS: BasicInfoOption<NovelBasicFormState["projectMode"]>[] = [
  {
    value: "co_pilot",
    label: "AI đồng hành",
    summary: "Bạn quyết định hướng đi, AI sẽ đưa phương án và bản nháp, rất hợp cho giai đoạn đầu và khi cần quyết định thường xuyên.",
    recommended: true,
  },
  {
    value: "ai_led",
    label: "AI dẫn dắt",
    summary: "AI phụ trách tiến triển chính, bạn duyệt ở các mốc quan trọng, phù hợp khi dự án đã có mục tiêu rõ ràng.",
  },
  {
    value: "draft_mode",
    label: "Ưu tiên bản nháp",
    summary: "Tạo văn bản và hướng đi nhanh trước, ràng buộc cấu trúc nhẹ hơn, hợp để thử truyện và tìm cảm hứng.",
  },
  {
    value: "auto_pipeline",
    label: "Ưu tiên dây chuyền",
    summary: "Phù hợp khi thiết lập đã khá đầy đủ và muốn tiến hành liên tục theo quy hoạch, tạo, kiểm tra và sửa lỗi.",
  },
];

export const POV_OPTIONS: BasicInfoOption<NovelBasicFormState["narrativePov"]>[] = [
  {
    value: "third_person",
    label: "Ngôi thứ ba",
    summary: "Ổn định nhất, hợp với nhiều nhân vật và tuyến chính phức tạp.",
    recommended: true,
  },
  {
    value: "first_person",
    label: "Ngôi thứ nhất",
    summary: "Tăng độ nhập vai nhưng giới hạn thông tin, hợp với kiểu kể bám sát nhân vật chính.",
  },
  {
    value: "mixed",
    label: "Góc nhìn hỗn hợp",
    summary: "Linh hoạt hơn nhưng cũng dễ lệch, phù hợp với dự án đã trưởng thành.",
  },
];

export const PACE_OPTIONS: BasicInfoOption<NovelBasicFormState["pacePreference"]>[] = [
  {
    value: "balanced",
    label: "Cân bằng",
    summary: "Cân bằng giữa đẩy tiến độ và tạo nền, thích hợp làm mặc định.",
    recommended: true,
  },
  {
    value: "slow",
    label: "Nhịp chậm",
    summary: "Ưu tiên dẫn dắt, không khí và sự tích tụ cảm xúc.",
  },
  {
    value: "fast",
    label: "Nhịp nhanh",
    summary: "Ưu tiên sự kiện, móc câu và nhịp tiến liên tục.",
  },
];

export const EMOTION_OPTIONS: BasicInfoOption<NovelBasicFormState["emotionIntensity"]>[] = [
  {
    value: "medium",
    label: "Cường độ cảm xúc trung bình",
    summary: "Giữ độ lên xuống nhưng không quá tải, hợp làm mặc định.",
    recommended: true,
  },
  {
    value: "low",
    label: "Cường độ cảm xúc thấp",
    summary: "Tiết chế hơn, hợp với lối kể bình tĩnh hoặc thiên lý tính.",
  },
  {
    value: "high",
    label: "Cường độ cảm xúc cao",
    summary: "Nhấn mạnh bùng nổ, xung đột và các cảnh kích thích mạnh.",
  },
];

export const AI_FREEDOM_OPTIONS: BasicInfoOption<NovelBasicFormState["aiFreedom"]>[] = [
  {
    value: "medium",
    label: "Tự do trung bình",
    summary: "Cho phép AI bổ sung chi tiết và đẩy một phần trong khuôn khổ thiết lập, hợp làm mặc định.",
    recommended: true,
  },
  {
    value: "low",
    label: "Tự do thấp",
    summary: "Bám chặt thiết lập và kế hoạch, hợp cho giai đoạn đầu cần kiểm soát.",
  },
  {
    value: "high",
    label: "Tự do cao",
    summary: "Cho phép AI chủ động mở rộng cốt truyện và chi tiết, hợp với dự án đã ổn định ở giai đoạn giữa hoặc sau.",
  },
];

export const PUBLICATION_STATUS_OPTIONS: BasicInfoOption<NovelBasicFormState["status"]>[] = [
  {
    value: "draft",
    label: "Bản nháp",
    summary: "Vẫn đang trong giai đoạn phát triển và tinh chỉnh, phù hợp với đa số dự án.",
    recommended: true,
  },
  {
    value: "published",
    label: "Đã phát hành",
    summary: "Dùng để đánh dấu tác phẩm đã hoàn thiện hoặc đã công bố ra ngoài.",
  },
];

export const PROJECT_STATUS_OPTIONS: Array<{ value: NovelBasicFormState["projectStatus"]; label: string }> = [
  { value: "not_started", label: "Chưa bắt đầu" },
  { value: "in_progress", label: "Đang làm" },
  { value: "completed", label: "Hoàn thành" },
  { value: "rework", label: "Làm lại" },
  { value: "blocked", label: "Bị chặn" },
];

export const BASIC_INFO_FIELD_HINTS = {
  writingMode: "Quyết định dự án bắt đầu từ đầu hay tiếp tục từ tác phẩm có sẵn. Nó ảnh hưởng trực tiếp đến nguồn ngữ cảnh được ưu tiên dùng về sau.",
  targetAudience: "Nói rõ cuốn sách này viết chủ yếu cho ai đọc. Không cần mô tả chân dung người đọc quá chuyên sâu, cứ theo trực giác là được.",
  bookSellingPoint: "Làm rõ điểm hút nhất của cuốn sách, ví dụ: kéo co quan hệ, cảm giác lật kèo, móc treo hồi hộp hoặc thiết lập mới lạ.",
  competingFeel: "Mô tả bằng cảm giác đọc mà độc giả có thể liên tưởng, không phải yêu cầu bạn sao chép một tác phẩm cụ thể.",
  first30ChapterPromise: "Nói rõ trong 30 chương đầu, độc giả nhất định phải nhìn thấy gì, đã gì và tin vào điều gì.",
  commercialTagsText: "Chỉ cần dùng dấu phẩy để ngăn cách 3-6 thẻ, ví dụ: lật kèo, xung đột mạnh, hồi hộp dồn dập, đấu trí công sở.",
  projectMode: "Quyết định cách bạn cộng tác với AI. Nó ảnh hưởng đến bước nào sẽ tự chạy tiếp và bước nào cần bạn xác nhận nhiều hơn.",
  narrativePov: "Quyết định mặc định sẽ dùng góc nhìn kể nào khi sinh chương, đồng thời ảnh hưởng đến cách phân phối thông tin.",
  pacePreference: "Quyết định khi lập chương thì nghiêng về dẫn dắt hay đẩy tiến, sẽ ảnh hưởng đến mật độ cảnh và độ mạnh của móc câu.",
  emotionIntensity: "Quyết định tần suất bùng nổ cảm xúc và xung đột khi sinh nội dung về sau, không phải cứ cao là tốt hơn.",
  aiFreedom: "Quyết định mức độ AI có thể lệch khỏi kế hoạch và thiết lập sẵn. Giai đoạn đầu nên để thấp hoặc trung bình.",
  defaultChapterLength: "Đây là số chữ tham chiếu khi lập và sinh chương, không phải giới hạn cứng. Mức khuyến nghị thường gặp là 2500 đến 3500.",
  estimatedChapterCount: "Đây là tổng số chương ước lượng của dự án, dùng làm tham chiếu cho dàn ý cấu trúc, nhịp cao trào và phạm vi mặc định của dây chuyền, không phải giới hạn cứng.",
  resourceReadyScore: "Dùng để đánh dấu thiết lập, nhân vật và tư liệu tuyến chính đã đủ hay chưa. Điểm càng cao thì càng phù hợp vào giai đoạn sản xuất tự động.",
  styleTone: "Chỉ cần vài từ khóa, ví dụ: lạnh lùng, tiết chế, hài đen. Nó sẽ ảnh hưởng đến giọng văn sinh ra.",
  genreId: "Nền tảng đề tài trả lời câu hỏi “đây là cuốn gì”, ví dụ tiên hiệp, đô thị, lịch sử hư cấu. Nó ảnh hưởng đến lập kế hoạch, tiêu đề và hướng bán hàng tổng thể, nên xác định càng sớm càng tốt.",
  primaryStoryModeId: "Chế độ đẩy chính trả lời câu hỏi “cuốn này dựa vào gì để tiếp tục đẩy và hoàn tiền”, ví dụ hệ thống, vô địch, điền văn. Phần lập kế hoạch và sinh nội dung về sau sẽ ưu tiên bám theo nó.",
  secondaryStoryModeId: "Chế độ đẩy phụ chỉ bổ sung hương vị, ví dụ trong truyện chữa lành thường nhật thêm cảm giác kinh doanh cửa hàng, hoặc trong truyện vô địch thêm cảm giác nhiều lớp danh tính; nó không được lấn át ranh giới của chế độ chính.",
  worldId: "Nếu gắn thế giới quan, phần lập kế hoạch và sinh chương về sau sẽ tự động nạp thiết lập của thế giới đó.",
  status: "Chỉ là cờ trạng thái vòng đời tác phẩm, không ảnh hưởng năng lực sáng tác cơ bản nhưng sẽ ảnh hưởng đến danh sách và trạng thái quản lý dự án.",
  continuationSourceType: "Khi viết tiếp, chọn là tham chiếu tiểu thuyết trong hệ thống hay phiên bản tài liệu trong kho tri thức.",
  continuationBookAnalysis: "Nội dung phân tích sách sẽ được dùng như ngữ cảnh có trọng số cao, rất phù hợp để dự án viết tiếp giữ nguyên phong cách và thiết lập.",
} satisfies Record<string, string>;

export function createDefaultNovelBasicFormState(): NovelBasicFormState {
  return {
    title: "",
    description: "",
    targetAudience: "",
    bookSellingPoint: "",
    competingFeel: "",
    first30ChapterPromise: "",
    commercialTagsText: "",
    genreId: "",
    primaryStoryModeId: "",
    secondaryStoryModeId: "",
    worldId: "",
    status: "draft",
    writingMode: "original",
    projectMode: "co_pilot",
    narrativePov: "third_person",
    pacePreference: "balanced",
    styleTone: "",
    emotionIntensity: "medium",
    aiFreedom: "medium",
    defaultChapterLength: 2800,
    estimatedChapterCount: DEFAULT_ESTIMATED_CHAPTER_COUNT,
    projectStatus: "not_started",
    storylineStatus: "not_started",
    outlineStatus: "not_started",
    resourceReadyScore: 0,
    continuationSourceType: "novel",
    sourceNovelId: "",
    sourceKnowledgeDocumentId: "",
    continuationBookAnalysisId: "",
    continuationBookAnalysisSections: [],
  };
}

export function patchNovelBasicForm(
  previous: NovelBasicFormState,
  patch: Partial<NovelBasicFormState>,
): NovelBasicFormState {
  const next = { ...previous, ...patch };
  if (
    next.primaryStoryModeId
    && next.secondaryStoryModeId
    && next.primaryStoryModeId === next.secondaryStoryModeId
  ) {
    next.secondaryStoryModeId = "";
  }
  if (next.writingMode === "original") {
    next.sourceNovelId = "";
    next.sourceKnowledgeDocumentId = "";
    next.continuationBookAnalysisId = "";
    next.continuationBookAnalysisSections = [];
  } else if (next.continuationSourceType === "novel") {
    next.sourceKnowledgeDocumentId = "";
  } else if (next.continuationSourceType === "knowledge_document") {
    next.sourceNovelId = "";
  }
  if (
    patch.continuationSourceType !== undefined
    && patch.continuationSourceType !== previous.continuationSourceType
  ) {
    next.continuationBookAnalysisId = "";
    next.continuationBookAnalysisSections = [];
  }
  if (
    next.continuationSourceType === "novel"
    && patch.sourceNovelId !== undefined
    && patch.sourceNovelId !== previous.sourceNovelId
  ) {
    next.continuationBookAnalysisId = "";
    next.continuationBookAnalysisSections = [];
  }
  if (
    next.continuationSourceType === "knowledge_document"
    && patch.sourceKnowledgeDocumentId !== undefined
    && patch.sourceKnowledgeDocumentId !== previous.sourceKnowledgeDocumentId
  ) {
    next.continuationBookAnalysisId = "";
    next.continuationBookAnalysisSections = [];
  }
  if (patch.continuationBookAnalysisId !== undefined && !patch.continuationBookAnalysisId) {
    next.continuationBookAnalysisSections = [];
  }
  return next;
}

export function buildNovelCreatePayload(basicForm: NovelBasicFormState) {
  const commercialTags = normalizeCommercialTags(basicForm.commercialTagsText);
  return {
    title: basicForm.title.trim(),
    description: basicForm.description.trim() || undefined,
    targetAudience: basicForm.targetAudience.trim() || undefined,
    bookSellingPoint: basicForm.bookSellingPoint.trim() || undefined,
    competingFeel: basicForm.competingFeel.trim() || undefined,
    first30ChapterPromise: basicForm.first30ChapterPromise.trim() || undefined,
    commercialTags: commercialTags.length > 0 ? commercialTags : undefined,
    genreId: basicForm.genreId || undefined,
    primaryStoryModeId: basicForm.primaryStoryModeId || undefined,
    secondaryStoryModeId: basicForm.secondaryStoryModeId || undefined,
    worldId: basicForm.worldId || undefined,
    writingMode: basicForm.writingMode,
    projectMode: basicForm.projectMode,
    narrativePov: basicForm.narrativePov,
    pacePreference: basicForm.pacePreference,
    styleTone: basicForm.styleTone.trim() || undefined,
    emotionIntensity: basicForm.emotionIntensity,
    aiFreedom: basicForm.aiFreedom,
    defaultChapterLength: basicForm.defaultChapterLength,
    estimatedChapterCount: basicForm.estimatedChapterCount,
    projectStatus: basicForm.projectStatus,
    storylineStatus: basicForm.storylineStatus,
    outlineStatus: basicForm.outlineStatus,
    resourceReadyScore: basicForm.resourceReadyScore,
    sourceNovelId: basicForm.writingMode === "continuation" && basicForm.continuationSourceType === "novel"
      ? (basicForm.sourceNovelId || undefined)
      : undefined,
    sourceKnowledgeDocumentId: basicForm.writingMode === "continuation" && basicForm.continuationSourceType === "knowledge_document"
      ? (basicForm.sourceKnowledgeDocumentId || undefined)
      : undefined,
    continuationBookAnalysisId: basicForm.writingMode === "continuation"
      && (
        (basicForm.continuationSourceType === "novel" && Boolean(basicForm.sourceNovelId))
        || (basicForm.continuationSourceType === "knowledge_document" && Boolean(basicForm.sourceKnowledgeDocumentId))
      )
      ? (basicForm.continuationBookAnalysisId || undefined)
      : undefined,
    continuationBookAnalysisSections:
      basicForm.writingMode === "continuation"
        && (
          (basicForm.continuationSourceType === "novel" && Boolean(basicForm.sourceNovelId))
          || (basicForm.continuationSourceType === "knowledge_document" && Boolean(basicForm.sourceKnowledgeDocumentId))
        )
        && basicForm.continuationBookAnalysisId
        ? (basicForm.continuationBookAnalysisSections.length > 0 ? basicForm.continuationBookAnalysisSections : undefined)
        : undefined,
  };
}

export function buildNovelUpdatePayload(basicForm: NovelBasicFormState) {
  const commercialTags = normalizeCommercialTags(basicForm.commercialTagsText);
  return {
    title: basicForm.title,
    description: basicForm.description,
    targetAudience: basicForm.targetAudience.trim() || null,
    bookSellingPoint: basicForm.bookSellingPoint.trim() || null,
    competingFeel: basicForm.competingFeel.trim() || null,
    first30ChapterPromise: basicForm.first30ChapterPromise.trim() || null,
    commercialTags: commercialTags.length > 0 ? commercialTags : null,
    genreId: basicForm.genreId || null,
    primaryStoryModeId: basicForm.primaryStoryModeId || null,
    secondaryStoryModeId: basicForm.secondaryStoryModeId || null,
    worldId: basicForm.worldId || null,
    status: basicForm.status,
    writingMode: basicForm.writingMode,
    projectMode: basicForm.projectMode,
    narrativePov: basicForm.narrativePov,
    pacePreference: basicForm.pacePreference,
    styleTone: basicForm.styleTone || null,
    emotionIntensity: basicForm.emotionIntensity,
    aiFreedom: basicForm.aiFreedom,
    defaultChapterLength: basicForm.defaultChapterLength,
    estimatedChapterCount: basicForm.estimatedChapterCount,
    projectStatus: basicForm.projectStatus,
    storylineStatus: basicForm.storylineStatus,
    outlineStatus: basicForm.outlineStatus,
    resourceReadyScore: basicForm.resourceReadyScore,
    sourceNovelId: basicForm.writingMode === "continuation" && basicForm.continuationSourceType === "novel"
      ? (basicForm.sourceNovelId || null)
      : null,
    sourceKnowledgeDocumentId: basicForm.writingMode === "continuation" && basicForm.continuationSourceType === "knowledge_document"
      ? (basicForm.sourceKnowledgeDocumentId || null)
      : null,
    continuationBookAnalysisId: basicForm.writingMode === "continuation"
      && (
        (basicForm.continuationSourceType === "novel" && Boolean(basicForm.sourceNovelId))
        || (basicForm.continuationSourceType === "knowledge_document" && Boolean(basicForm.sourceKnowledgeDocumentId))
      )
      ? (basicForm.continuationBookAnalysisId || null)
      : null,
    continuationBookAnalysisSections:
      basicForm.writingMode === "continuation"
        && (
          (basicForm.continuationSourceType === "novel" && Boolean(basicForm.sourceNovelId))
          || (basicForm.continuationSourceType === "knowledge_document" && Boolean(basicForm.sourceKnowledgeDocumentId))
        )
        && basicForm.continuationBookAnalysisId
        ? (basicForm.continuationBookAnalysisSections.length > 0 ? basicForm.continuationBookAnalysisSections : null)
        : null,
  };
}

export { formatCommercialTagsInput };
