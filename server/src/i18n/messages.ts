import type { CreativeHubStreamFrame, SSEFrame } from "@ai-novel/shared/types/api";
import { getBackendLanguage, getRequestLocale, type BackendLanguage } from "./locale";

type LocalizedText = {
  vi: string;
  en: string;
  zh: string;
};

type SubjectTranslation = LocalizedText;

const EXACT_TRANSLATIONS = new Map<string, LocalizedText>([
  ["接口不存在。", { vi: "Không tìm thấy endpoint.", en: "Endpoint not found.", zh: "接口不存在。" }],
  ["服务运行正常。", { vi: "Dịch vụ đang hoạt động bình thường.", en: "Service is healthy.", zh: "服务运行正常。" }],
  ["请求体过大，请缩短文本或分段上传。", {
    vi: "Nội dung yêu cầu quá lớn. Hãy rút gọn văn bản hoặc tải lên theo từng phần.",
    en: "The request body is too large. Shorten the text or upload it in smaller parts.",
    zh: "请求体过大，请缩短文本或分段上传。",
  }],
  ["请求参数校验失败。", {
    vi: "Xác thực tham số yêu cầu thất bại.",
    en: "Request validation failed.",
    zh: "请求参数校验失败。",
  }],
  ["服务器发生未知错误。", {
    vi: "Máy chủ gặp lỗi không xác định.",
    en: "The server encountered an unknown error.",
    zh: "服务器发生未知错误。",
  }],
  ["连接测试失败。", { vi: "Kiểm tra kết nối thất bại.", en: "Connectivity test failed.", zh: "连接测试失败。" }],
  ["写作公式不存在。", { vi: "Không tìm thấy công thức viết.", en: "Writing formula not found.", zh: "写作公式不存在。" }],
  ["小说不存在。", { vi: "Không tìm thấy tiểu thuyết.", en: "Novel not found.", zh: "小说不存在。" }],
  ["小说不存在", { vi: "Không tìm thấy tiểu thuyết.", en: "Novel not found.", zh: "小说不存在。" }],
  ["章节不存在。", { vi: "Không tìm thấy chương.", en: "Chapter not found.", zh: "章节不存在。" }],
  ["章节不存在", { vi: "Không tìm thấy chương.", en: "Chapter not found.", zh: "章节不存在。" }],
  ["未找到当前小说。", { vi: "Không tìm thấy tiểu thuyết hiện tại.", en: "Current novel not found.", zh: "未找到当前小说。" }],
  ["故事想法不能为空。", { vi: "Ý tưởng câu chuyện không được để trống.", en: "Story idea cannot be empty.", zh: "故事想法不能为空。" }],
  ["当前草稿不能为空。", { vi: "Bản nháp hiện tại không được để trống.", en: "The current draft cannot be empty.", zh: "当前草稿不能为空。" }],
  ["当前小说还没有结构化大纲。", {
    vi: "Tiểu thuyết hiện tại chưa có dàn ý có cấu trúc.",
    en: "The current novel does not have a structured outline yet.",
    zh: "当前小说还没有结构化大纲。",
  }],
  ["当前小说还没有章节目录，无法启动整本写作。", {
    vi: "Tiểu thuyết hiện tại chưa có danh mục chương nên chưa thể bắt đầu sản xuất toàn bộ.",
    en: "The current novel does not have a chapter list yet, so full-book generation cannot start.",
    zh: "当前小说还没有章节目录，无法启动整本写作。",
  }],
  ["当前小说还没有章节，请先创建章节后再启动流水线。", {
    vi: "Tiểu thuyết hiện tại chưa có chương. Hãy tạo chương trước khi khởi động pipeline.",
    en: "The current novel has no chapters yet. Create chapters before starting the pipeline.",
    zh: "当前小说还没有章节，请先创建章节后再启动流水线。",
  }],
  ["当前小说未绑定世界设定。", {
    vi: "Tiểu thuyết hiện tại chưa liên kết với thiết lập thế giới.",
    en: "The current novel is not linked to a world setting.",
    zh: "当前小说未绑定世界设定。",
  }],
  ["选中文本不能为空。", { vi: "Đoạn văn bản đã chọn không được để trống.", en: "Selected text cannot be empty.", zh: "选中文本不能为空。" }],
  ["当前章节正文为空，无法发起 AI 修正。", {
    vi: "Nội dung chương hiện tại đang trống nên không thể chạy chỉnh sửa AI.",
    en: "The current chapter is empty, so AI revision cannot start.",
    zh: "当前章节正文为空，无法发起 AI 修正。",
  }],
  ["片段修正需要先选中正文内容。", {
    vi: "Cần chọn phần nội dung chương trước khi sửa đoạn bằng AI.",
    en: "Select body text before starting fragment revision.",
    zh: "片段修正需要先选中正文内容。",
  }],
  ["选区范围无效，请重新选择后再试。", {
    vi: "Phạm vi chọn không hợp lệ. Hãy chọn lại rồi thử lại.",
    en: "The selected range is invalid. Reselect it and try again.",
    zh: "选区范围无效，请重新选择后再试。",
  }],
  ["选中文本已发生变化，请重新选择后再试。", {
    vi: "Đoạn văn bản đã chọn đã thay đổi. Hãy chọn lại rồi thử lại.",
    en: "The selected text has changed. Reselect it and try again.",
    zh: "选中文本已发生变化，请重新选择后再试。",
  }],
  ["请先写下你希望 AI 如何修改。", {
    vi: "Hãy mô tả trước cách bạn muốn AI chỉnh sửa.",
    en: "Describe how you want the AI to revise first.",
    zh: "请先写下你希望 AI 如何修改。",
  }],
  ["AI 未返回足够的候选版本，请重试。", {
    vi: "AI chưa trả về đủ phiên bản gợi ý. Hãy thử lại.",
    en: "The AI did not return enough candidate versions. Please try again.",
    zh: "AI 未返回足够的候选版本，请重试。",
  }],
  ["请至少填写书名或一句话概述后再让 AI 帮你填写。", {
    vi: "Hãy nhập ít nhất tên sách hoặc một câu mô tả ngắn trước khi nhờ AI điền tiếp.",
    en: "Enter at least a title or a one-line summary before asking the AI to fill the rest.",
    zh: "请至少填写书名或一句话概述后再让 AI 帮你填写。",
  }],
  ["请至少填写书名或一句话概述。", {
    vi: "Hãy nhập ít nhất tên sách hoặc một câu mô tả ngắn.",
    en: "Enter at least a title or a one-line summary.",
    zh: "请至少填写书名或一句话概述。",
  }],
  ["启用结构化备用模型时，provider 和 model 不能为空。", {
    vi: "Khi bật mô hình dự phòng cho đầu ra có cấu trúc, `provider` và `model` không được để trống.",
    en: "When structured fallback is enabled, `provider` and `model` cannot be empty.",
    zh: "启用结构化备用模型时，provider 和 model 不能为空。",
  }],
  ["占星模块暂未实现。", { vi: "Mô-đun chiêm tinh hiện chưa được triển khai.", en: "The astrology module is not implemented yet.", zh: "占星模块暂未实现。" }],
  ["Provider 不能为空。", { vi: "Nhà cung cấp không được để trống.", en: "Provider cannot be empty.", zh: "Provider 不能为空。" }],
  ["API URL is invalid.", { vi: "URL API không hợp lệ.", en: "API URL is invalid.", zh: "API 地址无效。" }],
  ["Task not found.", { vi: "Không tìm thấy tác vụ.", en: "Task not found.", zh: "未找到任务。" }],
  ["Task not found after retry.", { vi: "Không tìm thấy tác vụ sau khi thử lại.", en: "Task not found after retry.", zh: "重试后仍未找到任务。" }],
  ["Task not found after cancellation.", { vi: "Không tìm thấy tác vụ sau khi hủy.", en: "Task not found after cancellation.", zh: "取消后仍未找到任务。" }],
  ["Workflow task not found.", { vi: "Không tìm thấy tác vụ quy trình.", en: "Workflow task not found.", zh: "未找到工作流任务。" }],
  ["Only completed, failed, or cancelled tasks can be archived.", {
    vi: "Chỉ có thể lưu trữ các tác vụ đã hoàn thành, thất bại hoặc đã hủy.",
    en: "Only completed, failed, or cancelled tasks can be archived.",
    zh: "只有已完成、失败或已取消的任务才能归档。",
  }],
  ["Only failed or cancelled knowledge index jobs can be retried.", {
    vi: "Chỉ có thể thử lại các tác vụ lập chỉ mục tri thức đã thất bại hoặc đã hủy.",
    en: "Only failed or cancelled knowledge index jobs can be retried.",
    zh: "只有失败或已取消的知识索引任务才能重试。",
  }],
  ["Knowledge document not found.", { vi: "Không tìm thấy tài liệu tri thức.", en: "Knowledge document not found.", zh: "未找到知识文档。" }],
  ["Book analysis not found.", { vi: "Không tìm thấy bản phân tích sách.", en: "Book analysis not found.", zh: "未找到拆书分析。" }],
  ["Book analysis section not found.", { vi: "Không tìm thấy mục phân tích sách.", en: "Book analysis section not found.", zh: "未找到拆书分析章节。" }],
  ["World not found.", { vi: "Không tìm thấy thế giới.", en: "World not found.", zh: "未找到世界设定。" }],
  ["Novel not found.", { vi: "Không tìm thấy tiểu thuyết.", en: "Novel not found.", zh: "未找到小说。" }],
  ["Agent run not found.", { vi: "Không tìm thấy lượt chạy tác tử.", en: "Agent run not found.", zh: "未找到代理运行记录。" }],
  ["Pipeline job not found.", { vi: "Không tìm thấy tác vụ pipeline.", en: "Pipeline job not found.", zh: "未找到流水线任务。" }],
  ["Custom provider not found.", { vi: "Không tìm thấy nhà cung cấp tùy chỉnh.", en: "Custom provider not found.", zh: "未找到自定义提供商。" }],
  ["RAG job not found.", { vi: "Không tìm thấy tác vụ RAG.", en: "RAG job not found.", zh: "未找到 RAG 任务。" }],
  ["Snapshot not found.", { vi: "Không tìm thấy snapshot.", en: "Snapshot not found.", zh: "未找到快照。" }],
  ["Run not found.", { vi: "Không tìm thấy lượt chạy.", en: "Run not found.", zh: "未找到运行记录。" }],
  ["Image task not found.", { vi: "Không tìm thấy tác vụ ảnh.", en: "Image task not found.", zh: "未找到图片任务。" }],
  ["Image asset not found.", { vi: "Không tìm thấy tài sản hình ảnh.", en: "Image asset not found.", zh: "未找到图片资源。" }],
  ["Base character not found.", { vi: "Không tìm thấy nhân vật cơ sở.", en: "Base character not found.", zh: "未找到基础角色。" }],
  ["Character cast option not found.", { vi: "Không tìm thấy phương án dàn nhân vật.", en: "Character cast option not found.", zh: "未找到角色阵容方案。" }],
  ["Creative decision not found.", { vi: "Không tìm thấy quyết định sáng tác.", en: "Creative decision not found.", zh: "未找到创作决策。" }],
  ["Target world not found.", { vi: "Không tìm thấy thế giới mục tiêu.", en: "Target world not found.", zh: "未找到目标世界设定。" }],
  ["Some knowledge documents are missing or archived.", {
    vi: "Một số tài liệu tri thức đang thiếu hoặc đã lưu trữ.",
    en: "Some knowledge documents are missing or archived.",
    zh: "部分知识文档不存在或已归档。",
  }],
  ["Invalid JSON object.", { vi: "Đối tượng JSON không hợp lệ.", en: "Invalid JSON object.", zh: "JSON 对象无效。" }],
  ["startOrder must be <= endOrder.", {
    vi: "`startOrder` phải nhỏ hơn hoặc bằng `endOrder`.",
    en: "startOrder must be <= endOrder.",
    zh: "`startOrder` 必须小于或等于 `endOrder`。",
  }],
  ["World wizard feature is disabled.", {
    vi: "Tính năng world wizard hiện đang bị tắt.",
    en: "World wizard feature is disabled.",
    zh: "世界向导功能当前已关闭。",
  }],
  ["World visualization feature is disabled.", {
    vi: "Tính năng trực quan hóa thế giới hiện đang bị tắt.",
    en: "World visualization feature is disabled.",
    zh: "世界可视化功能当前已关闭。",
  }],
  ["RAG health check passed.", { vi: "Kiểm tra sức khỏe RAG đã thông qua.", en: "RAG health check passed.", zh: "RAG 健康检查通过。" }],
  ["RAG health check failed.", { vi: "Kiểm tra sức khỏe RAG thất bại.", en: "RAG health check failed.", zh: "RAG 健康检查失败。" }],
  ["获取写作公式列表成功。", { vi: "Đã tải danh sách công thức viết.", en: "Writing formula list loaded.", zh: "获取写作公式列表成功。" }],
  ["获取写作公式详情成功。", { vi: "Đã tải chi tiết công thức viết.", en: "Writing formula detail loaded.", zh: "获取写作公式详情成功。" }],
  ["删除写作公式成功。", { vi: "Đã xóa công thức viết.", en: "Writing formula deleted.", zh: "删除写作公式成功。" }],
  ["必须提供 formulaId 或 formulaContent。", {
    vi: "Phải cung cấp `formulaId` hoặc `formulaContent`.",
    en: "Either `formulaId` or `formulaContent` is required.",
    zh: "必须提供 formulaId 或 formulaContent。",
  }],
  ["标题库加载成功。", { vi: "Đã tải thư viện tiêu đề.", en: "Title library loaded.", zh: "标题库加载成功。" }],
  ["标题工坊生成成功。", { vi: "Đã tạo tiêu đề từ xưởng tiêu đề.", en: "Title workshop generation completed.", zh: "标题工坊生成成功。" }],
  ["标题已加入标题库。", { vi: "Đã thêm tiêu đề vào thư viện.", en: "Title added to library.", zh: "标题已加入标题库。" }],
  ["标题已删除。", { vi: "Đã xóa tiêu đề.", en: "Title deleted.", zh: "标题已删除。" }],
  ["标题使用次数已更新。", { vi: "Đã cập nhật số lần dùng tiêu đề.", en: "Title usage count updated.", zh: "标题使用次数已更新。" }],
  ["自由标题工坊需要创作简报。", {
    vi: "Xưởng tiêu đề tự do cần brief sáng tác.",
    en: "Free-form title workshop requires a creative brief.",
    zh: "自由标题工坊需要创作简报。",
  }],
  ["改编模式需要参考标题。", {
    vi: "Chế độ chuyển thể cần một tiêu đề tham chiếu.",
    en: "Adaptation mode requires a reference title.",
    zh: "改编模式需要参考标题。",
  }],
  ["获取流派模式树成功。", { vi: "Đã tải cây chế độ thể loại.", en: "Story mode tree loaded.", zh: "获取流派模式树成功。" }],
  ["创建流派模式成功。", { vi: "Đã tạo chế độ thể loại.", en: "Story mode created.", zh: "创建流派模式成功。" }],
  ["更新流派模式成功。", { vi: "Đã cập nhật chế độ thể loại.", en: "Story mode updated.", zh: "更新流派模式成功。" }],
  ["删除流派模式成功。", { vi: "Đã xóa chế độ thể loại.", en: "Story mode deleted.", zh: "删除流派模式成功。" }],
  ["批量创建流派模式子类成功。", {
    vi: "Đã tạo hàng loạt các nhánh con của chế độ thể loại.",
    en: "Story mode child categories created in batch.",
    zh: "批量创建流派模式子类成功。",
  }],
  ["AI 流派模式树草稿生成成功。", {
    vi: "AI đã tạo bản nháp cây chế độ thể loại.",
    en: "AI story mode tree draft generated.",
    zh: "AI 流派模式树草稿生成成功。",
  }],
  ["AI 流派模式子类草稿生成成功。", {
    vi: "AI đã tạo bản nháp nhánh con của chế độ thể loại.",
    en: "AI story mode child draft generated.",
    zh: "AI 流派模式子类草稿生成成功。",
  }],
  ["获取写法资产列表成功。", { vi: "Đã tải danh sách tài sản phong cách viết.", en: "Style asset list loaded.", zh: "获取写法资产列表成功。" }],
  ["获取写法资产详情成功。", { vi: "Đã tải chi tiết tài sản phong cách viết.", en: "Style asset detail loaded.", zh: "获取写法资产详情成功。" }],
  ["获取写法绑定成功。", { vi: "Đã tải liên kết phong cách viết.", en: "Style bindings loaded.", zh: "获取写法绑定成功。" }],
  ["获取模板成功。", { vi: "Đã tải mẫu.", en: "Templates loaded.", zh: "获取模板成功。" }],
  ["获取反AI规则成功。", { vi: "Đã tải quy tắc anti-AI.", en: "Anti-AI rules loaded.", zh: "获取反AI规则成功。" }],
  ["创建写法资产成功。", { vi: "Đã tạo tài sản phong cách viết.", en: "Style asset created.", zh: "创建写法资产成功。" }],
  ["更新写法资产成功。", { vi: "Đã cập nhật tài sản phong cách viết.", en: "Style asset updated.", zh: "更新写法资产成功。" }],
  ["删除写法资产成功。", { vi: "Đã xóa tài sản phong cách viết.", en: "Style asset deleted.", zh: "删除写法资产成功。" }],
  ["创建写法绑定成功。", { vi: "Đã tạo liên kết phong cách viết.", en: "Style binding created.", zh: "创建写法绑定成功。" }],
  ["删除写法绑定成功。", { vi: "Đã xóa liên kết phong cách viết.", en: "Style binding deleted.", zh: "删除写法绑定成功。" }],
  ["创建反AI规则成功。", { vi: "Đã tạo quy tắc anti-AI.", en: "Anti-AI rule created.", zh: "创建反AI规则成功。" }],
  ["更新反AI规则成功。", { vi: "Đã cập nhật quy tắc anti-AI.", en: "Anti-AI rule updated.", zh: "更新反AI规则成功。" }],
  ["从模板创建写法成功。", { vi: "Đã tạo phong cách viết từ mẫu.", en: "Style created from template.", zh: "从模板创建写法成功。" }],
  ["从拆书生成写法成功。", { vi: "Đã tạo phong cách viết từ phân tích sách.", en: "Style generated from book analysis.", zh: "从拆书生成写法成功。" }],
  ["AI 生成写法成功。", { vi: "AI đã tạo phong cách viết thành công.", en: "AI style generation completed.", zh: "AI 生成写法成功。" }],
  ["写法推荐已生成。", { vi: "Đã tạo gợi ý phong cách viết.", en: "Style recommendation generated.", zh: "写法推荐已生成。" }],
  ["写法修正完成。", { vi: "Đã hoàn tất chỉnh sửa phong cách viết.", en: "Style revision completed.", zh: "写法修正完成。" }],
  ["写法检测完成。", { vi: "Đã hoàn tất phát hiện phong cách viết.", en: "Style detection completed.", zh: "写法检测完成。" }],
  ["试写完成。", { vi: "Đã hoàn tất đoạn viết thử.", en: "Trial writing completed.", zh: "试写完成。" }],
  ["文本写法特征提取完成。", { vi: "Đã trích xuất đặc trưng phong cách viết từ văn bản.", en: "Text style feature extraction completed.", zh: "文本写法特征提取完成。" }],
  ["从文本提取写法成功。", { vi: "Đã trích xuất phong cách viết từ văn bản.", en: "Style extracted from text.", zh: "从文本提取写法成功。" }],
  ["已按特征选择生成写法资产。", { vi: "Đã tạo tài sản phong cách viết theo đặc trưng đã chọn.", en: "Style assets generated from selected features.", zh: "已按特征选择生成写法资产。" }],
  ["约束引擎已构建。", { vi: "Đã dựng xong bộ ràng buộc.", en: "Constraint engine built.", zh: "约束引擎已构建。" }],
  ["故事引擎原型已生成。", { vi: "Đã tạo nguyên mẫu động cơ cốt truyện.", en: "Story engine prototype generated.", zh: "故事引擎原型已生成。" }],
  ["故事宏观规划状态已更新。", { vi: "Đã cập nhật trạng thái quy hoạch vĩ mô của câu chuyện.", en: "Story macro planning status updated.", zh: "故事宏观规划状态已更新。" }],
  ["故事宏观规划状态已加载。", { vi: "Đã tải trạng thái quy hoạch vĩ mô của câu chuyện.", en: "Story macro planning status loaded.", zh: "故事宏观规划状态已加载。" }],
  ["故事宏观规划已保存。", { vi: "Đã lưu quy hoạch vĩ mô của câu chuyện.", en: "Story macro plan saved.", zh: "故事宏观规划已保存。" }],
  ["字段已重生成。", { vi: "Đã tạo lại trường này.", en: "Field regenerated.", zh: "字段已重生成。" }],
  ["创作决策已更新。", { vi: "Đã cập nhật quyết định sáng tác.", en: "Creative decision updated.", zh: "创作决策已更新。" }],
  ["创作决策已批量失效。", { vi: "Đã vô hiệu hàng loạt quyết định sáng tác.", en: "Creative decisions invalidated in batch.", zh: "创作决策已批量失效。" }],
  ["创作决策已加载。", { vi: "Đã tải quyết định sáng tác.", en: "Creative decisions loaded.", zh: "创作决策已加载。" }],
  ["创作决策已删除。", { vi: "Đã xóa quyết định sáng tác.", en: "Creative decision deleted.", zh: "创作决策已删除。" }],
  ["创作决策已创建。", { vi: "Đã tạo quyết định sáng tác.", en: "Creative decision created.", zh: "创作决策已创建。" }],
  ["角色阵容方案已生成。", { vi: "Đã tạo phương án dàn nhân vật.", en: "Character cast option generated.", zh: "角色阵容方案已生成。" }],
  ["角色阵容方案已清空。", { vi: "Đã xóa sạch các phương án dàn nhân vật.", en: "Character cast options cleared.", zh: "角色阵容方案已清空。" }],
  ["角色阵容方案已应用。", { vi: "Đã áp dụng phương án dàn nhân vật.", en: "Character cast option applied.", zh: "角色阵容方案已应用。" }],
  ["角色阵容方案已加载。", { vi: "Đã tải phương án dàn nhân vật.", en: "Character cast options loaded.", zh: "角色阵容方案已加载。" }],
  ["角色阵容方案已删除。", { vi: "Đã xóa phương án dàn nhân vật.", en: "Character cast option deleted.", zh: "角色阵容方案已删除。" }],
  ["角色关系列表已加载。", { vi: "Đã tải danh sách quan hệ nhân vật.", en: "Character relation list loaded.", zh: "角色关系列表已加载。" }],
  ["补充角色已创建。", { vi: "Đã tạo nhân vật bổ sung.", en: "Supplemental character created.", zh: "补充角色已创建。" }],
  ["补充角色候选已生成。", { vi: "Đã tạo các ứng viên nhân vật bổ sung.", en: "Supplemental character candidates generated.", zh: "补充角色候选已生成。" }],
  ["章节摘要生成成功。", { vi: "Đã tạo tóm tắt chương.", en: "Chapter summary generated.", zh: "章节摘要生成成功。" }],
  ["至少提供一个更新字段。", { vi: "Hãy cung cấp ít nhất một trường cần cập nhật.", en: "Provide at least one field to update.", zh: "至少提供一个更新字段。" }],
  ["已开始分析参考作品", { vi: "Đã bắt đầu phân tích tác phẩm tham chiếu.", en: "Reference work analysis started.", zh: "已开始分析参考作品" }],
  ["已开始分析世界灵感", { vi: "Đã bắt đầu phân tích cảm hứng thế giới.", en: "World inspiration analysis started.", zh: "已开始分析世界灵感" }],
  ["原作锚点与架空方向已生成", {
    vi: "Đã tạo các neo nguyên tác và hướng phát triển thế giới hư cấu.",
    en: "Original anchors and alternate-world directions generated.",
    zh: "原作锚点与架空方向已生成",
  }],
  ["概念卡与属性选项已生成", {
    vi: "Đã tạo thẻ ý tưởng và các tùy chọn thuộc tính.",
    en: "Concept cards and attribute options generated.",
    zh: "概念卡与属性选项已生成",
  }],
  ["世界灵感分析失败。", { vi: "Phân tích cảm hứng thế giới thất bại.", en: "World inspiration analysis failed.", zh: "世界灵感分析失败。" }],
]);

const SUBJECT_TRANSLATIONS = new Map<string, SubjectTranslation>([
  ["agent run", { vi: "lượt chạy tác tử", en: "agent run", zh: "代理运行" }],
  ["all layers", { vi: "toàn bộ lớp thế giới", en: "all layers", zh: "全部层级" }],
  ["answers", { vi: "câu trả lời", en: "answers", zh: "回答" }],
  ["arc plan", { vi: "kế hoạch tuyến arc", en: "arc plan", zh: "弧线规划" }],
  ["audit issue", { vi: "vấn đề kiểm toán", en: "audit issue", zh: "审计问题" }],
  ["audit reports", { vi: "báo cáo kiểm toán", en: "audit reports", zh: "审计报告" }],
  ["axioms", { vi: "tiên đề thế giới", en: "axioms", zh: "公理" }],
  ["book analysis", { vi: "phân tích sách", en: "book analysis", zh: "拆书分析" }],
  ["book framing suggestion", { vi: "gợi ý định khung sách", en: "book framing suggestion", zh: "书级 framing 建议" }],
  ["book plan", { vi: "kế hoạch sách", en: "book plan", zh: "整书规划" }],
  ["chapter", { vi: "chương", en: "chapter", zh: "章节" }],
  ["chapter audit", { vi: "kiểm toán chương", en: "chapter audit", zh: "章节审计" }],
  ["chapter editor ai revision preview", { vi: "bản xem trước sửa AI của trình biên tập chương", en: "chapter editor AI revision preview", zh: "章节编辑器 AI 修订预览" }],
  ["chapter editor rewrite preview", { vi: "bản xem trước viết lại của trình biên tập chương", en: "chapter editor rewrite preview", zh: "章节编辑器改写预览" }],
  ["chapter editor workspace", { vi: "không gian biên tập chương", en: "chapter editor workspace", zh: "章节编辑器工作区" }],
  ["chapter execution contract", { vi: "hợp đồng thực thi chương", en: "chapter execution contract", zh: "章节执行合同" }],
  ["chapter hook", { vi: "móc chương", en: "chapter hook", zh: "章节钩子" }],
  ["chapter plan", { vi: "kế hoạch chương", en: "chapter plan", zh: "章节规划" }],
  ["chapter review", { vi: "đánh giá chương", en: "chapter review", zh: "章节审阅" }],
  ["chapter state snapshot", { vi: "ảnh chụp trạng thái chương", en: "chapter state snapshot", zh: "章节状态快照" }],
  ["chapter title repair", { vi: "sửa tiêu đề chương", en: "chapter title repair", zh: "章节标题修复" }],
  ["chapter traces", { vi: "dấu vết chương", en: "chapter traces", zh: "章节轨迹" }],
  ["chapters", { vi: "các chương", en: "chapters", zh: "章节" }],
  ["character", { vi: "nhân vật", en: "character", zh: "角色" }],
  ["character audit", { vi: "kiểm toán nhân vật", en: "character audit", zh: "角色审计" }],
  ["character candidate", { vi: "ứng viên nhân vật", en: "character candidate", zh: "角色候选" }],
  ["character candidates", { vi: "các ứng viên nhân vật", en: "character candidates", zh: "角色候选" }],
  ["character dynamic state", { vi: "trạng thái động lực nhân vật", en: "character dynamic state", zh: "角色动态状态" }],
  ["character dynamics", { vi: "động lực nhân vật", en: "character dynamics", zh: "角色动态" }],
  ["character relation stage", { vi: "giai đoạn quan hệ nhân vật", en: "character relation stage", zh: "角色关系阶段" }],
  ["character timeline", { vi: "dòng thời gian nhân vật", en: "character timeline", zh: "角色时间线" }],
  ["character timelines", { vi: "các dòng thời gian nhân vật", en: "character timelines", zh: "角色时间线" }],
  ["characters", { vi: "nhân vật", en: "characters", zh: "角色" }],
  ["consistency", { vi: "kiểm tra nhất quán", en: "consistency", zh: "一致性检查" }],
  ["continuity audit", { vi: "kiểm toán continuity", en: "continuity audit", zh: "连续性审计" }],
  ["custom provider", { vi: "nhà cung cấp tùy chỉnh", en: "custom provider", zh: "自定义提供商" }],
  ["deepening questions", { vi: "câu hỏi đào sâu", en: "deepening questions", zh: "深化问题" }],
  ["director candidate", { vi: "phương án đạo diễn", en: "director candidate", zh: "导演候选方案" }],
  ["director candidates", { vi: "các phương án đạo diễn", en: "director candidates", zh: "导演候选方案" }],
  ["director takeover", { vi: "tiếp quản đạo diễn", en: "director takeover", zh: "导演接管" }],
  ["director takeover readiness", { vi: "trạng thái sẵn sàng tiếp quản đạo diễn", en: "director takeover readiness", zh: "导演接管准备状态" }],
  ["director title options", { vi: "phương án tiêu đề của đạo diễn", en: "director title options", zh: "导演标题选项" }],
  ["embedding models", { vi: "mô hình embedding", en: "embedding models", zh: "Embedding 模型" }],
  ["export payload", { vi: "gói dữ liệu xuất", en: "export payload", zh: "导出载荷" }],
  ["full audit", { vi: "kiểm toán toàn diện", en: "full audit", zh: "完整审计" }],
  ["inspiration", { vi: "cảm hứng", en: "inspiration", zh: "灵感" }],
  ["issue status", { vi: "trạng thái vấn đề", en: "issue status", zh: "问题状态" }],
  ["knowledge document", { vi: "tài liệu tri thức", en: "knowledge document", zh: "知识文档" }],
  ["latest state snapshot", { vi: "ảnh chụp trạng thái mới nhất", en: "latest state snapshot", zh: "最新状态快照" }],
  ["layer", { vi: "lớp", en: "layer", zh: "层级" }],
  ["legacy outline", { vi: "đại纲 cũ", en: "legacy outline", zh: "旧版大纲" }],
  ["library", { vi: "thư viện", en: "library", zh: "库" }],
  ["library item", { vi: "mục thư viện", en: "library item", zh: "库项目" }],
  ["novel workflow", { vi: "quy trình tiểu thuyết", en: "novel workflow", zh: "小说工作流" }],
  ["novel workflow stage", { vi: "giai đoạn quy trình tiểu thuyết", en: "novel workflow stage", zh: "小说工作流阶段" }],
  ["novel world slice", { vi: "bản cắt thế giới của tiểu thuyết", en: "novel world slice", zh: "小说世界切片" }],
  ["novel world slice preferences", { vi: "thiết lập bản cắt thế giới của tiểu thuyết", en: "novel world slice preferences", zh: "小说世界切片偏好" }],
  ["outline optimization preview", { vi: "bản xem trước tối ưu đại纲", en: "outline optimization preview", zh: "大纲优化预览" }],
  ["overview", { vi: "tổng quan", en: "overview", zh: "概览" }],
  ["payoff ledger", { vi: "sổ theo dõi payoff", en: "payoff ledger", zh: "兑现账本" }],
  ["pipeline job", { vi: "tác vụ pipeline", en: "pipeline job", zh: "流水线任务" }],
  ["plot audit", { vi: "kiểm toán cốt truyện", en: "plot audit", zh: "剧情审计" }],
  ["provider balances", { vi: "số dư nhà cung cấp", en: "provider balances", zh: "提供商余额" }],
  ["provider models", { vi: "mô hình nhà cung cấp", en: "provider models", zh: "提供商模型" }],
  ["provider settings", { vi: "thiết lập nhà cung cấp", en: "provider settings", zh: "提供商设置" }],
  ["quality report", { vi: "báo cáo chất lượng", en: "quality report", zh: "质量报告" }],
  ["rag health check", { vi: "kiểm tra sức khỏe RAG", en: "RAG health check", zh: "RAG 健康检查" }],
  ["rag job list", { vi: "danh sách tác vụ RAG", en: "RAG job list", zh: "RAG 任务列表" }],
  ["rag reindex jobs", { vi: "các tác vụ lập chỉ mục lại RAG", en: "RAG reindex jobs", zh: "RAG 重建索引任务" }],
  ["rag settings", { vi: "thiết lập RAG", en: "RAG settings", zh: "RAG 设置" }],
  ["recovery candidate", { vi: "ứng viên khôi phục", en: "recovery candidate", zh: "恢复候选任务" }],
  ["recovery candidates", { vi: "các ứng viên khôi phục", en: "recovery candidates", zh: "恢复候选任务" }],
  ["snapshot", { vi: "ảnh chụp trạng thái", en: "snapshot", zh: "快照" }],
  ["snapshot diff", { vi: "khác biệt giữa các ảnh chụp trạng thái", en: "snapshot diff", zh: "快照差异" }],
  ["snapshots", { vi: "các ảnh chụp trạng thái", en: "snapshots", zh: "快照" }],
  ["story state", { vi: "trạng thái câu chuyện", en: "story state", zh: "故事状态" }],
  ["story state rebuild", { vi: "tái dựng trạng thái câu chuyện", en: "story state rebuild", zh: "故事状态重建" }],
  ["storyline diff", { vi: "khác biệt mạch truyện chính", en: "storyline diff", zh: "主线差异" }],
  ["storyline draft", { vi: "bản nháp mạch truyện chính", en: "storyline draft", zh: "主线草稿" }],
  ["storyline impact analysis", { vi: "phân tích tác động của mạch truyện chính", en: "storyline impact analysis", zh: "主线影响分析" }],
  ["storyline version", { vi: "phiên bản mạch truyện chính", en: "storyline version", zh: "主线版本" }],
  ["storyline versions", { vi: "các phiên bản mạch truyện chính", en: "storyline versions", zh: "主线版本" }],
  ["story macro plan", { vi: "quy hoạch vĩ mô của câu chuyện", en: "story macro plan", zh: "故事宏观规划" }],
  ["structured outline optimization preview", { vi: "bản xem trước tối ưu đại纲 có cấu trúc", en: "structured outline optimization preview", zh: "结构化大纲优化预览" }],
  ["structured world", { vi: "thế giới có cấu trúc", en: "structured world", zh: "结构化世界" }],
  ["structure section", { vi: "mục cấu trúc", en: "structure section", zh: "结构部分" }],
  ["task", { vi: "tác vụ", en: "task", zh: "任务" }],
  ["task overview", { vi: "tổng quan tác vụ", en: "task overview", zh: "任务概览" }],
  ["tasks", { vi: "các tác vụ", en: "tasks", zh: "任务" }],
  ["templates", { vi: "mẫu", en: "templates", zh: "模板" }],
  ["titles", { vi: "tiêu đề", en: "titles", zh: "标题" }],
  ["visualization", { vi: "trực quan hóa", en: "visualization", zh: "可视化" }],
  ["volume chapters", { vi: "các chương của tập", en: "volume chapters", zh: "卷章节" }],
  ["volume diff", { vi: "khác biệt tập", en: "volume diff", zh: "卷差异" }],
  ["volume draft version", { vi: "phiên bản nháp của tập", en: "volume draft version", zh: "卷草稿版本" }],
  ["volume impact analysis", { vi: "phân tích tác động của tập", en: "volume impact analysis", zh: "卷影响分析" }],
  ["volume version", { vi: "phiên bản tập", en: "volume version", zh: "卷版本" }],
  ["volume versions", { vi: "các phiên bản tập", en: "volume versions", zh: "卷版本" }],
  ["volume workspace", { vi: "không gian làm việc của tập", en: "volume workspace", zh: "卷工作区" }],
  ["world", { vi: "thế giới", en: "world", zh: "世界" }],
  ["world check", { vi: "kiểm tra thế giới", en: "world check", zh: "世界检查" }],
  ["world knowledge documents", { vi: "tài liệu tri thức của thế giới", en: "world knowledge documents", zh: "世界知识文档" }],
  ["worlds", { vi: "các thế giới", en: "worlds", zh: "世界" }],
]);

type PatternRenderer = (subject: string, language: BackendLanguage) => string;

function renderStatusAction(
  subject: string,
  language: BackendLanguage,
  action: {
    vi: string;
    en: string;
    zh: string;
  },
): string {
  if (language === "en") {
    return `${subject} ${action.en}.`;
  }
  if (language === "zh") {
    return `已${action.zh}${subject}。`;
  }
  return `Đã ${action.vi} ${subject}.`;
}

function renderReady(subject: string, language: BackendLanguage): string {
  if (language === "en") {
    return `${subject} ready.`;
  }
  if (language === "zh") {
    return `${subject}已就绪。`;
  }
  return `${subject} đã sẵn sàng.`;
}

function renderQueued(subject: string, language: BackendLanguage): string {
  if (language === "en") {
    return `${subject} queued.`;
  }
  if (language === "zh") {
    return `已将${subject}加入队列。`;
  }
  return `Đã đưa ${subject} vào hàng đợi.`;
}

function renderTranslatedSubject(subject: string, language: BackendLanguage): string {
  const normalized = subject.trim().toLowerCase();
  const translated = SUBJECT_TRANSLATIONS.get(normalized);
  if (!translated) {
    return subject;
  }
  return translated[language];
}

type EnglishStatusPattern = {
  regex: RegExp;
  render: PatternRenderer;
};

const ENGLISH_STATUS_PATTERNS: EnglishStatusPattern[] = [
  { regex: /^(.+) loaded\.$/i, render: (subject, language) => renderStatusAction(subject, language, { vi: "tải", en: "loaded", zh: "加载" }) },
  { regex: /^Loaded (.+)\.$/i, render: (subject, language) => renderStatusAction(subject, language, { vi: "tải", en: "loaded", zh: "加载" }) },
  { regex: /^(.+) created\.$/i, render: (subject, language) => renderStatusAction(subject, language, { vi: "tạo", en: "created", zh: "创建" }) },
  { regex: /^Created (.+)\.$/i, render: (subject, language) => renderStatusAction(subject, language, { vi: "tạo", en: "created", zh: "创建" }) },
  { regex: /^(.+) updated\.$/i, render: (subject, language) => renderStatusAction(subject, language, { vi: "cập nhật", en: "updated", zh: "更新" }) },
  { regex: /^Updated (.+)\.$/i, render: (subject, language) => renderStatusAction(subject, language, { vi: "cập nhật", en: "updated", zh: "更新" }) },
  { regex: /^(.+) deleted\.$/i, render: (subject, language) => renderStatusAction(subject, language, { vi: "xóa", en: "deleted", zh: "删除" }) },
  { regex: /^Deleted (.+)\.$/i, render: (subject, language) => renderStatusAction(subject, language, { vi: "xóa", en: "deleted", zh: "删除" }) },
  { regex: /^(.+) generated\.$/i, render: (subject, language) => renderStatusAction(subject, language, { vi: "tạo", en: "generated", zh: "生成" }) },
  { regex: /^(.+) completed\.$/i, render: (subject, language) => renderStatusAction(subject, language, { vi: "hoàn thành", en: "completed", zh: "完成" }) },
  { regex: /^(.+) saved\.$/i, render: (subject, language) => renderStatusAction(subject, language, { vi: "lưu", en: "saved", zh: "保存" }) },
  { regex: /^(.+) synchronized\.$/i, render: (subject, language) => renderStatusAction(subject, language, { vi: "đồng bộ", en: "synchronized", zh: "同步" }) },
  { regex: /^(.+) synced\.$/i, render: (subject, language) => renderStatusAction(subject, language, { vi: "đồng bộ", en: "synced", zh: "同步" }) },
  { regex: /^(.+) restored\.$/i, render: (subject, language) => renderStatusAction(subject, language, { vi: "khôi phục", en: "restored", zh: "恢复" }) },
  { regex: /^(.+) retried\.$/i, render: (subject, language) => renderStatusAction(subject, language, { vi: "thử lại", en: "retried", zh: "重试" }) },
  { regex: /^(.+) cancelled\.$/i, render: (subject, language) => renderStatusAction(subject, language, { vi: "hủy", en: "cancelled", zh: "取消" }) },
  { regex: /^(.+) archived\.$/i, render: (subject, language) => renderStatusAction(subject, language, { vi: "lưu trữ", en: "archived", zh: "归档" }) },
  { regex: /^(.+) resumed\.$/i, render: (subject, language) => renderStatusAction(subject, language, { vi: "tiếp tục", en: "resumed", zh: "继续" }) },
  { regex: /^(.+) continued\.$/i, render: (subject, language) => renderStatusAction(subject, language, { vi: "tiếp tục", en: "continued", zh: "继续" }) },
  { regex: /^(.+) refreshed\.$/i, render: (subject, language) => renderStatusAction(subject, language, { vi: "làm mới", en: "refreshed", zh: "刷新" }) },
  { regex: /^Refreshed (.+)\.$/i, render: (subject, language) => renderStatusAction(subject, language, { vi: "làm mới", en: "refreshed", zh: "刷新" }) },
  { regex: /^(.+) backfilled\.$/i, render: (subject, language) => renderStatusAction(subject, language, { vi: "bù dữ liệu", en: "backfilled", zh: "回填" }) },
  { regex: /^(.+) confirmed\.$/i, render: (subject, language) => renderStatusAction(subject, language, { vi: "xác nhận", en: "confirmed", zh: "确认" }) },
  { regex: /^(.+) imported\.$/i, render: (subject, language) => renderStatusAction(subject, language, { vi: "nhập", en: "imported", zh: "导入" }) },
  { regex: /^(.+) rebuilt\.$/i, render: (subject, language) => renderStatusAction(subject, language, { vi: "dựng lại", en: "rebuilt", zh: "重建" }) },
  { regex: /^(.+) started\.$/i, render: (subject, language) => renderStatusAction(subject, language, { vi: "bắt đầu", en: "started", zh: "开始" }) },
  { regex: /^(.+) ready\.$/i, render: renderReady },
  { regex: /^(.+) patched\.$/i, render: (subject, language) => renderStatusAction(subject, language, { vi: "vá", en: "patched", zh: "修补" }) },
  { regex: /^(.+) used\.$/i, render: (subject, language) => renderStatusAction(subject, language, { vi: "sử dụng", en: "used", zh: "使用" }) },
  { regex: /^(.+) frozen\.$/i, render: (subject, language) => renderStatusAction(subject, language, { vi: "đóng băng", en: "frozen", zh: "冻结" }) },
  { regex: /^(.+) activated\.$/i, render: (subject, language) => renderStatusAction(subject, language, { vi: "kích hoạt", en: "activated", zh: "激活" }) },
  { regex: /^(.+) integrated\.$/i, render: (subject, language) => renderStatusAction(subject, language, { vi: "tích hợp", en: "integrated", zh: "整合" }) },
  { regex: /^(.+) suggested\.$/i, render: (subject, language) => renderStatusAction(subject, language, { vi: "đề xuất", en: "suggested", zh: "建议" }) },
  { regex: /^(.+) analyzed\.$/i, render: (subject, language) => renderStatusAction(subject, language, { vi: "phân tích", en: "analyzed", zh: "分析" }) },
  { regex: /^(.+) queued\.$/i, render: renderQueued },
];

type RegexTranslator = {
  regex: RegExp;
  render: (match: RegExpMatchArray, language: BackendLanguage) => string;
};

const DYNAMIC_TRANSLATORS: RegexTranslator[] = [
  {
    regex: /^请先在本小说中至少添加 (\d+) 个角色后再(.+)。$/,
    render: ([, count, action], language) => {
      if (language === "en") {
        return `Add at least ${count} characters to this novel before ${action}.`;
      }
      if (language === "zh") {
        return `请先在本小说中至少添加 ${count} 个角色后再${action}。`;
      }
      return `Hãy thêm ít nhất ${count} nhân vật vào tiểu thuyết này trước khi ${action}.`;
    },
  },
  {
    regex: /^指定区间内没有可生成的章节。当前可用章节范围为第 (\d+) 章到第 (\d+) 章。$/,
    render: ([, minOrder, maxOrder], language) => {
      if (language === "en") {
        return `There are no chapters available to generate in the selected range. The current available range is chapter ${minOrder} to chapter ${maxOrder}.`;
      }
      if (language === "zh") {
        return `指定区间内没有可生成的章节。当前可用章节范围为第 ${minOrder} 章到第 ${maxOrder} 章。`;
      }
      return `Không có chương nào có thể tạo trong phạm vi đã chọn. Phạm vi hiện có là từ chương ${minOrder} đến chương ${maxOrder}.`;
    },
  },
];

function isOpaqueControlMessage(value: string): boolean {
  return /^[A-Z0-9_]+$/.test(value.trim());
}

function translateExactMessage(message: string, language: BackendLanguage): string | null {
  const translation = EXACT_TRANSLATIONS.get(message.trim());
  if (!translation) {
    return null;
  }
  return translation[language];
}

function translateDynamicMessage(message: string, language: BackendLanguage): string | null {
  for (const translator of DYNAMIC_TRANSLATORS) {
    const match = message.match(translator.regex);
    if (match) {
      return translator.render(match, language);
    }
  }
  return null;
}

function translateEnglishStatusMessage(message: string, language: BackendLanguage): string | null {
  for (const pattern of ENGLISH_STATUS_PATTERNS) {
    const match = message.match(pattern.regex);
    if (!match) {
      continue;
    }
    const subject = renderTranslatedSubject(match[1].trim(), language);
    return pattern.render(subject, language);
  }
  return null;
}

export function translateBackendText(message: string): string {
  const trimmed = message.trim();
  if (!trimmed || isOpaqueControlMessage(trimmed)) {
    return message;
  }

  const language = getBackendLanguage(getRequestLocale());
  if (language === "zh" && /[\u3400-\u9fff]/.test(trimmed) && !/[A-Za-z]/.test(trimmed)) {
    return trimmed;
  }
  if (language === "en" && /^[\x00-\x7F]+$/.test(trimmed)) {
    return trimmed;
  }

  return translateExactMessage(trimmed, language)
    ?? translateDynamicMessage(trimmed, language)
    ?? translateEnglishStatusMessage(trimmed, language)
    ?? trimmed;
}

export function localizeApiJsonPayload<T>(payload: T): T {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }

  const record = payload as Record<string, unknown>;
  const localized = { ...record };

  if (typeof localized.message === "string") {
    localized.message = translateBackendText(localized.message);
  }

  if (typeof localized.error === "string") {
    localized.error = translateBackendText(localized.error);
  }

  return localized as T;
}

export function localizeSseFrame(frame: Extract<
  SSEFrame,
  {
    type:
    | "chunk"
    | "done"
    | "error"
    | "ping"
    | "reasoning"
    | "runtime_package"
    | "tool_call"
    | "tool_result"
    | "approval_required"
    | "approval_resolved"
    | "run_status";
  }
>): typeof frame {
  switch (frame.type) {
    case "error":
      return {
        ...frame,
        error: translateBackendText(frame.error),
      };
    case "run_status":
      return {
        ...frame,
        message: typeof frame.message === "string" ? translateBackendText(frame.message) : frame.message,
      };
    case "approval_required":
      return {
        ...frame,
        summary: translateBackendText(frame.summary),
      };
    case "tool_call":
      return {
        ...frame,
        inputSummary: translateBackendText(frame.inputSummary),
      };
    case "tool_result":
      return {
        ...frame,
        outputSummary: translateBackendText(frame.outputSummary),
      };
    default:
      return frame;
  }
}

export function localizeCreativeHubFrame(frame: CreativeHubStreamFrame): CreativeHubStreamFrame {
  if (frame.event === "creative_hub/error" || frame.event === "error") {
    return {
      ...frame,
      data: {
        ...frame.data,
        message: translateBackendText(frame.data.message),
      },
    };
  }

  if (frame.event === "creative_hub/run_status") {
    return {
      ...frame,
      data: {
        ...frame.data,
        message: typeof frame.data.message === "string" ? translateBackendText(frame.data.message) : frame.data.message,
      },
    };
  }

  if (frame.event === "creative_hub/tool_call") {
    return {
      ...frame,
      data: {
        ...frame.data,
        inputSummary: translateBackendText(frame.data.inputSummary),
      },
    };
  }

  if (frame.event === "creative_hub/tool_result") {
    return {
      ...frame,
      data: {
        ...frame.data,
        outputSummary: translateBackendText(frame.data.outputSummary),
      },
    };
  }

  return frame;
}
