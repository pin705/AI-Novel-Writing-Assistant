import type { CreativeHubStreamFrame, SSEFrame } from "@ai-novel/shared/types/api";
import { getBackendLanguage, getRequestLocale, type BackendLanguage } from "./locale";

type LocalizedText = {
  vi: string;
  en: string;
  zh: string;
};

type SubjectTranslation = LocalizedText;
export type BackendMessageParams = Record<string, string | number | boolean | null | undefined>;

const BACKEND_MESSAGE_CATALOG = {
  "task.failureSummary.none": {
    vi: "Hiện chưa có bản ghi lỗi rõ ràng.",
    en: "There is no explicit failure record yet.",
    zh: "当前没有明确失败记录。",
  },
  "task.recovery.failed.knowledge_document": {
    vi: "Nên kiểm tra phiên bản tài liệu tri thức, cấu trúc phân mảnh, mô hình vector và mức chiếm dụng hàng đợi RAG dùng chung rồi hãy thử lại.",
    en: "Check the knowledge document version, chunk structure, embedding model, and shared RAG queue occupancy before retrying.",
    zh: "建议检查知识文档版本、分块结构、向量模型和共享 RAG 队列占用情况后再重试。",
  },
  "task.recovery.failed.agent_run": {
    vi: "Nên xem bước thất bại cuối cùng, trạng thái duyệt liên quan và ngữ cảnh tài nguyên tương ứng rồi hãy thử lại.",
    en: "Inspect the last failed step, related approval state, and resource context before retrying.",
    zh: "建议查看最后失败步骤、相关审批状态和对应资源上下文后再重试。",
  },
  "task.recovery.failed.novel_workflow": {
    vi: "Nên khôi phục từ điểm kiểm tra gần nhất, ưu tiên kiểm tra tài sản giai đoạn hiện tại có đầy đủ không, mô hình có quá thời gian không và trang đích khôi phục có thể mở lại hay không.",
    en: "Recover from the latest checkpoint and first verify stage assets, model timeouts, and whether the recovery target page can be reopened.",
    zh: "建议从最近检查点恢复，优先检查当前阶段资产是否完整、模型是否超时以及恢复目标页是否可重新打开。",
  },
  "task.recovery.failed.novel_pipeline": {
    vi: "Nên kiểm tra cấu hình mô hình, ngữ cảnh chương và nhật ký tạo gần nhất rồi hãy thử lại.",
    en: "Check the model configuration, chapter context, and latest generation logs before retrying.",
    zh: "建议检查模型配置、章节上下文和最近一次生成日志后再重试。",
  },
  "task.recovery.failed.book_analysis": {
    vi: "Nên kiểm tra chất lượng tài liệu gốc, khả năng sẵn sàng của mô hình và kết quả chia đoạn sách rồi hãy thử lại.",
    en: "Check the source document quality, model availability, and book chunking result before retrying.",
    zh: "建议检查原始文档质量、模型可用性和拆书分段结果后再重试。",
  },
  "task.recovery.failed.default": {
    vi: "Nên kiểm tra prompt, cấu hình mô hình và trạng thái tài nguyên mục tiêu rồi hãy thử lại.",
    en: "Check the prompt, model configuration, and target resource state before retrying.",
    zh: "建议检查提示词、模型配置和目标资源状态后再重试。",
  },
  "task.recovery.waiting_approval.novel_workflow": {
    vi: "Quy trình chính của tiểu thuyết đã đi tới điểm kiểm tra an toàn, bấm tiếp tục là có thể quay lại trang giai đoạn tương ứng để khôi phục sáng tác.",
    en: "The novel workflow has reached a safe checkpoint. Continue to return to the corresponding stage page and resume writing.",
    zh: "当前小说主流程已推进到安全检查点，点击继续即可回到对应阶段页恢复创作。",
  },
  "task.recovery.waiting_approval.default": {
    vi: "Tác vụ hiện đang chờ duyệt, hãy xử lý duyệt trước rồi mới có thể tiếp tục thực thi.",
    en: "This task is waiting for approval. Handle the approval before continuing.",
    zh: "当前任务在等待审批，先处理审批后才能继续执行。",
  },
  "task.recovery.running": {
    vi: "Tác vụ hiện vẫn đang chạy, nên chờ hoàn tất hoặc xem lộ trình thời gian thực.",
    en: "This task is still running. Wait for completion or inspect the live trace.",
    zh: "当前任务仍在执行中，建议先等待完成或查看实时轨迹。",
  },
  "task.recovery.queued.knowledge_document": {
    vi: "Chỉ mục kho tri thức hiện vẫn nằm trong hàng đợi RAG dùng chung, nên kiểm tra xem worker có đang bị các tác vụ trước chiếm hết không.",
    en: "The knowledge index job is still in the shared RAG queue. Check whether earlier jobs are saturating the workers.",
    zh: "当前知识库索引仍在共享 RAG 队列中，建议确认 worker 是否被更早的任务占满。",
  },
  "task.recovery.queued.default": {
    vi: "Tác vụ hiện vẫn đang xếp hàng, nên kiểm tra worker và dịch vụ mô hình có sẵn sàng hay không.",
    en: "This task is still queued. Check whether workers and model services are available.",
    zh: "当前任务仍在排队，建议确认工作线程和模型服务是否可用。",
  },
  "task.recovery.cancelled.knowledge_document": {
    vi: "Chỉ mục kho tri thức hiện đã bị hủy, nếu muốn tiếp tục thì hãy gửi lại tác vụ lập chỉ mục.",
    en: "The knowledge index job was cancelled. Submit it again if you still need to continue.",
    zh: "当前知识库索引已取消，如需继续可重新提交索引任务。",
  },
  "task.recovery.cancelled.novel_workflow": {
    vi: "Quy trình chính của tiểu thuyết hiện đã bị hủy, nếu muốn tiếp tục có thể khôi phục từ điểm kiểm tra gần nhất.",
    en: "The novel workflow was cancelled. Recover from the latest checkpoint to continue.",
    zh: "当前小说主流程已取消，如需继续，可从最近检查点恢复。",
  },
  "task.recovery.cancelled.default": {
    vi: "Tác vụ hiện đã bị hủy, nếu vẫn cần tiếp tục thì có thể khởi chạy lại hoặc thử lại.",
    en: "This task was cancelled. Restart or retry it if you still need to continue.",
    zh: "当前任务已取消，如仍需继续，可重新发起或执行重试。",
  },
  "task.recovery.none": {
    vi: "Hiện không cần thao tác khôi phục.",
    en: "No recovery action is needed right now.",
    zh: "当前无需恢复操作。",
  },
  "workflow.scope.front10": {
    vi: "10 chương đầu",
    en: "the first 10 chapters",
    zh: "前 10 章",
  },
  "workflow.display.candidate_selection_required": {
    vi: "Chờ xác nhận hướng cấp sách",
    en: "Waiting for book-level direction confirmation",
    zh: "等待确认书级方向",
  },
  "workflow.display.book_contract_ready": {
    vi: "Book Contract đã sẵn sàng",
    en: "Book Contract is ready",
    zh: "Book Contract 已就绪",
  },
  "workflow.display.character_setup_required": {
    vi: "Chuẩn bị nhân vật chờ duyệt",
    en: "Character setup awaiting review",
    zh: "角色准备待审核",
  },
  "workflow.display.volume_strategy_ready": {
    vi: "Chiến lược tập chờ duyệt",
    en: "Volume strategy awaiting review",
    zh: "卷战略待审核",
  },
  "workflow.display.front10_ready": {
    vi: "10 chương đầu đã có thể vào thực thi chương",
    en: "The first 10 chapters are ready for chapter execution",
    zh: "前 10 章已可进入章节执行",
  },
  "workflow.display.chapter_batch_ready": {
    vi: "Tự động thực thi 10 chương đầu đã tạm dừng",
    en: "Automatic execution for the first 10 chapters is paused",
    zh: "前 10 章自动执行已暂停",
  },
  "workflow.display.replan_required": {
    vi: "Chờ xử lý lập lại kế hoạch",
    en: "Waiting for replanning",
    zh: "等待处理重规划",
  },
  "workflow.display.workflow_completed": {
    vi: "Đạo diễn tự động đã hoàn tất",
    en: "Auto-director completed",
    zh: "自动导演已完成",
  },
  "workflow.reason.candidate_selection_required": {
    vi: "Cần xác nhận hướng cấp sách trước thì đạo diễn tự động mới có thể tiếp tục đẩy các nhánh sau.",
    en: "Book-level direction must be confirmed before auto-director can continue the downstream flow.",
    zh: "需要先确认书级方向，自动导演才能继续推进后续主链。",
  },
  "workflow.reason.book_contract_ready": {
    vi: "Book Contract đã được tạo, cần xác nhận cam kết cốt lõi trước khi tiếp tục lập kế hoạch sau.",
    en: "Book Contract has been generated. Confirm the core promise before continuing planning.",
    zh: "Book Contract 已生成，需先确认核心承诺后再继续后续规划。",
  },
  "workflow.reason.character_setup_required": {
    vi: "Chuẩn bị nhân vật đã được tạo, cần duyệt dàn nhân vật trước khi tiếp tục.",
    en: "Character setup has been generated. Review the cast before continuing.",
    zh: "角色准备已生成，需先审核角色阵容后再继续推进。",
  },
  "workflow.reason.volume_strategy_ready": {
    vi: "Chiến lược tập và khung tập đã sẵn sàng, cần xác nhận phương án triển khai theo tập trước khi tiếp tục.",
    en: "Volume strategy and skeleton are ready. Confirm the volume-level plan before continuing.",
    zh: "卷战略与卷骨架已就绪，需先确认卷级推进方案后再继续。",
  },
  "workflow.reason.front10_ready": {
    vi: "Phần tinh chỉnh 10 chương đầu đã sẵn sàng, bạn có thể vào thực thi chương hoặc để hệ thống tự chạy tiếp 10 chương đầu.",
    en: "The first 10 chapters are prepared. You can enter chapter execution or let the system continue running them automatically.",
    zh: "前 10 章细化已准备完成，你可以进入章节执行，或继续让系统自动执行前 10 章。",
  },
  "workflow.reason.chapter_batch_ready": {
    vi: "Tự động thực thi 10 chương đầu đã dừng ở giai đoạn hàng loạt, nên xem kết quả trước rồi quyết định có tiếp tục tự chạy phần còn lại hay không.",
    en: "Automatic execution for the first 10 chapters paused during the batch phase. Review the results before deciding whether to continue.",
    zh: "前 10 章自动执行在批量阶段暂停了，建议先看结果，再决定是否继续自动执行剩余章节。",
  },
  "workflow.reason.replan_required": {
    vi: "Kết quả kiểm tra yêu cầu xử lý lập lại kế hoạch trước, các chương sau mới có thể tiếp tục.",
    en: "Audit results require replanning before later chapters can continue.",
    zh: "审计结果要求先处理重规划，后续章节才能继续推进。",
  },
  "workflow.reason.workflow_completed": {
    vi: "Quy trình chính mặc định đã chạy xong, bạn có thể vào thực thi chương để viết tiếp.",
    en: "The default main workflow has completed. You can enter chapter execution to continue writing.",
    zh: "默认主流程已跑通，你可以直接进入章节执行继续写作。",
  },
  "workflow.status.prepared": {
    vi: "{{scopeLabel}} đã có thể vào thực thi chương",
    en: "{{scopeLabel}} is ready for chapter execution",
    zh: "{{scopeLabel}}已可进入章节执行",
  },
  "workflow.status.running": {
    vi: "{{scopeLabel}} đang tự động thực thi",
    en: "{{scopeLabel}} is auto-executing",
    zh: "{{scopeLabel}}自动执行中",
  },
  "workflow.status.paused": {
    vi: "{{scopeLabel}} đã tạm dừng tự động thực thi",
    en: "{{scopeLabel}} auto-execution is paused",
    zh: "{{scopeLabel}}自动执行已暂停",
  },
  "workflow.status.cancelled": {
    vi: "{{scopeLabel}} đã hủy tự động thực thi",
    en: "{{scopeLabel}} auto-execution was cancelled",
    zh: "{{scopeLabel}}自动执行已取消",
  },
  "workflow.action.resume_auto_execution": {
    vi: "Tiếp tục tự động thực thi {{scopeLabel}}",
    en: "Continue auto-executing {{scopeLabel}}",
    zh: "继续自动执行{{scopeLabel}}",
  },
  "workflow.reason.prepared_scope": {
    vi: "{{scopeLabel}} đã sẵn sàng tinh chỉnh xong, bạn có thể vào thực thi chương hoặc để hệ thống tiếp tục tự động thực thi {{scopeLabel}}.",
    en: "{{scopeLabel}} has been prepared. You can enter chapter execution or let the system continue auto-executing {{scopeLabel}}.",
    zh: "{{scopeLabel}}细化已准备完成，你可以进入章节执行，或继续让系统自动执行{{scopeLabel}}。",
  },
  "workflow.reason.paused_scope": {
    vi: "{{scopeLabel}} đã tạm dừng ở giai đoạn hàng loạt, nên xem kết quả trước rồi quyết định có tiếp tục tự động thực thi phạm vi hiện tại hay không.",
    en: "{{scopeLabel}} paused during the batch phase. Review the results before deciding whether to continue auto-execution.",
    zh: "{{scopeLabel}}自动执行在批量阶段暂停了，建议先看结果，再决定是否继续自动执行当前范围。",
  },
  "workflow.action.candidate_selection_required": {
    vi: "Tiếp tục xác nhận hướng cấp sách",
    en: "Continue confirming book-level direction",
    zh: "继续确认书级方向",
  },
  "workflow.action.book_contract_ready": {
    vi: "Xem Book Contract",
    en: "View Book Contract",
    zh: "查看 Book Contract",
  },
  "workflow.action.character_setup_required": {
    vi: "Đi duyệt chuẩn bị nhân vật",
    en: "Review character setup",
    zh: "去审核角色准备",
  },
  "workflow.action.volume_strategy_ready": {
    vi: "Xem chiến lược tập",
    en: "View volume strategy",
    zh: "查看卷战略",
  },
  "workflow.action.replan_required": {
    vi: "Xử lý lập lại kế hoạch",
    en: "Handle replanning",
    zh: "处理重规划",
  },
  "workflow.action.enter_chapter_execution": {
    vi: "Vào thực thi chương",
    en: "Enter chapter execution",
    zh: "进入章节执行",
  },
  "workflow.action.continue_main_flow": {
    vi: "Tiếp tục quy trình chính của tiểu thuyết",
    en: "Continue the main novel workflow",
    zh: "继续小说主流程",
  },
  "workflow.action.recover_from_checkpoint": {
    vi: "Khôi phục từ điểm kiểm tra gần nhất",
    en: "Recover from the latest checkpoint",
    zh: "从最近检查点恢复",
  },
  "workflow.action.view_progress": {
    vi: "Xem tiến độ hiện tại",
    en: "View current progress",
    zh: "查看当前进度",
  },
  "workflow.display.recovery_in_progress": {
    vi: "{{stageLabel}} đang khôi phục",
    en: "{{stageLabel}} recovering",
    zh: "{{stageLabel}}恢复中",
  },
  "workflow.display.auto_director_recovering": {
    vi: "Đang khôi phục đạo diễn tự động",
    en: "Auto-director recovering",
    zh: "自动导演恢复中",
  },
  "workflow.display.waiting_continue": {
    vi: "Chờ tiếp tục quy trình chính của tiểu thuyết",
    en: "Waiting to continue the main novel workflow",
    zh: "等待继续小说主流程",
  },
  "workflow.display.stage_running": {
    vi: "{{stageLabel}} đang chạy",
    en: "{{stageLabel}} running",
    zh: "{{stageLabel}}进行中",
  },
  "workflow.display.auto_director_running": {
    vi: "Đạo diễn tự động đang chạy",
    en: "Auto-director running",
    zh: "自动导演进行中",
  },
  "workflow.display.auto_director_queued": {
    vi: "Đạo diễn tự động đang xếp hàng",
    en: "Auto-director queued",
    zh: "自动导演排队中",
  },
  "workflow.display.auto_director_failed": {
    vi: "Đạo diễn tự động thực thi thất bại",
    en: "Auto-director execution failed",
    zh: "自动导演执行失败",
  },
  "workflow.display.auto_director_cancelled": {
    vi: "Đạo diễn tự động đã hủy",
    en: "Auto-director cancelled",
    zh: "自动导演已取消",
  },
  "workflow.display.auto_director_completed": {
    vi: "Đạo diễn tự động đã hoàn tất",
    en: "Auto-director completed",
    zh: "自动导演已完成",
  },
  "workflow.display.main_flow_completed": {
    vi: "Quy trình chính của tiểu thuyết đã hoàn tất",
    en: "Main novel workflow completed",
    zh: "小说主流程已完成",
  },
  "workflow.blocking.recovering": {
    vi: "Nhiệm vụ đạo diễn tự động đang khôi phục sau khi dịch vụ khởi động lại.",
    en: "The auto-director task is recovering after a service restart.",
    zh: "自动导演任务正在从服务重启中恢复。",
  },
  "workflow.blocking.queued": {
    vi: "Tác vụ đã vào hàng đợi, đang chờ worker và tài nguyên mô hình sẵn sàng.",
    en: "The task is queued and waiting for worker and model resources to become available.",
    zh: "任务已进入队列，正在等待工作线程和模型资源可用。",
  },
  "workflow.blocking.safe_checkpoint": {
    vi: "Quy trình hiện đã dừng ở điểm kiểm tra an toàn, chỉ sau khi xử lý xong giai đoạn hiện tại mới có thể tiếp tục.",
    en: "The workflow is currently stopped at a safe checkpoint. Finish the current stage before continuing.",
    zh: "当前流程已停在安全检查点，处理完当前阶段后才能继续。",
  },
  "workflow.blocking.failed_batch": {
    vi: "{{scopeLabel}} đã bị gián đoạn ở giai đoạn hàng loạt, nên khôi phục từ giai đoạn ổn định gần nhất.",
    en: "{{scopeLabel}} was interrupted during the batch phase. Recover from the latest healthy stage.",
    zh: "{{scopeLabel}}自动执行在批量阶段中断了，建议从最近健康阶段继续恢复。",
  },
  "workflow.blocking.failed_default": {
    vi: "Giai đoạn hiện tại thất bại, nên khôi phục từ điểm kiểm tra gần nhất.",
    en: "The current stage failed. Recover from the latest checkpoint.",
    zh: "当前阶段执行失败，建议从最近检查点恢复。",
  },
  "workflow.blocking.cancelled_batch": {
    vi: "{{scopeLabel}} đã hủy tự động thực thi, nếu cần tiếp tục có thể khôi phục từ giai đoạn ổn định gần nhất.",
    en: "{{scopeLabel}} auto-execution was cancelled. Recover from the latest healthy stage to continue.",
    zh: "{{scopeLabel}}自动执行已取消，如需继续可从最近健康阶段恢复。",
  },
  "workflow.blocking.cancelled_default": {
    vi: "Tác vụ đã bị hủy, nếu vẫn cần tiếp tục có thể khôi phục từ điểm kiểm tra gần nhất.",
    en: "The task was cancelled. Recover from the latest checkpoint to continue.",
    zh: "任务已取消，如仍需继续，可从最近检查点恢复。",
  },
  "workflow.next_action.enter_prepared_chapters": {
    vi: "Vào các chương đã sẵn sàng",
    en: "Enter prepared chapters",
    zh: "进入已准备章节",
  },
  "writingFormula.heading.style": {
    vi: "Định vị phong cách tổng thể",
    en: "Overall style positioning",
    zh: "整体风格定位",
  },
  "writingFormula.heading.coreTechniques": {
    vi: "Kỹ thuật viết cốt lõi (kèm ví dụ nguyên văn)",
    en: "Core writing techniques (with original examples)",
    zh: "核心写作技巧（含原文例句）",
  },
  "writingFormula.heading.formula": {
    vi: "Công thức viết có thể tái tạo",
    en: "Reproducible writing formula",
    zh: "可复现的写作公式",
  },
  "writingFormula.heading.application": {
    vi: "Hướng dẫn áp dụng (cách dùng công thức này để viết văn bản mới)",
    en: "Application guide (how to use this formula to write new text)",
    zh: "应用指南（如何用这个公式写新文本）",
  },
  "writingFormula.error.formulaContentMissing": {
    vi: "Không tìm thấy nội dung công thức viết khả dụng.",
    en: "No usable writing formula content was found.",
    zh: "未找到可用写作公式内容。",
  },
  "writingFormula.error.rewriteRequiresSourceText": {
    vi: "Chế độ rewrite cần sourceText.",
    en: "Rewrite mode requires sourceText.",
    zh: "rewrite 模式需要 sourceText。",
  },
  "writingFormula.error.generateRequiresTopic": {
    vi: "Chế độ generate cần topic.",
    en: "Generate mode requires topic.",
    zh: "generate 模式需要 topic。",
  },
  "writingFormula.prompt.extract.system": {
    vi: "Bạn là chuyên gia phân tích phong cách viết, có khả năng mổ xẻ sâu các kỹ thuật sáng tác trong tác phẩm văn học.\nHãy phân tích văn bản ở mức {{extractLevel}}, tập trung vào: {{focusAreas}}.\nĐịnh dạng đầu ra (Markdown):\n## {{styleHeading}}\n## {{coreTechniquesHeading}}\n## {{formulaHeading}}\n## {{applicationHeading}}",
    en: "You are an expert in writing-style analysis, capable of deeply unpacking the craft techniques used in literary works.\nAnalyze the text at the {{extractLevel}} level and focus on: {{focusAreas}}.\nOutput format (Markdown):\n## {{styleHeading}}\n## {{coreTechniquesHeading}}\n## {{formulaHeading}}\n## {{applicationHeading}}",
    zh: "你是一个专业的写作风格分析专家，能够深度解析文学作品的创作技巧。\n请对文本进行 {{extractLevel}} 级别分析，重点关注：{{focusAreas}}。\n输出格式（Markdown）：\n## {{styleHeading}}\n## {{coreTechniquesHeading}}\n## {{formulaHeading}}\n## {{applicationHeading}}",
  },
  "writingFormula.prompt.rewrite.system": {
    vi: "Bạn là trợ lý viết chuyên nghiệp. Hãy viết lại văn bản đã cho theo đúng công thức viết bên dưới. Yêu cầu: giữ nguyên ý chính của nguyên văn, nhưng tái tạo văn phong, nhịp điệu và cấu trúc câu theo công thức.",
    en: "You are a professional writing assistant. Rewrite the given text strictly according to the writing formula below. Keep the core meaning intact while reshaping the style, rhythm, and sentence patterns to match the formula.",
    zh: "你是一位专业的写作助手。请严格按照以下写作公式，对给定文本进行改写。要求：保持原文核心意思不变，但文风、节奏、句式按照公式重塑。",
  },
  "writingFormula.prompt.rewrite.human": {
    vi: "Công thức viết:\n{{formulaContent}}\n\nNguyên văn:\n{{sourceText}}",
    en: "Writing formula:\n{{formulaContent}}\n\nSource text:\n{{sourceText}}",
    zh: "写作公式：\n{{formulaContent}}\n\n原文：\n{{sourceText}}",
  },
  "writingFormula.prompt.generate.system": {
    vi: "Bạn là trợ lý viết chuyên nghiệp. Hãy sáng tác nội dung mới xoay quanh chủ đề được cho, theo đúng công thức viết bên dưới.\nYêu cầu: độ dài khoảng {{targetLength}} chữ, mỗi đoạn đều phải thể hiện đặc trưng cốt lõi của công thức.",
    en: "You are a professional writing assistant. Create new content around the given topic while strictly following the writing formula below.\nRequirement: target around {{targetLength}} words, and make every paragraph reflect the core traits of the formula.",
    zh: "你是一位专业的写作助手。请严格按照以下写作公式，围绕给定主题创作新内容。\n要求：字数控制在 {{targetLength}} 字左右，每个段落都体现公式核心特征。",
  },
  "writingFormula.prompt.generate.human": {
    vi: "Công thức viết:\n{{formulaContent}}\n\nChủ đề sáng tác:\n{{topic}}",
    en: "Writing formula:\n{{formulaContent}}\n\nTopic:\n{{topic}}",
    zh: "写作公式：\n{{formulaContent}}\n\n创作主题：\n{{topic}}",
  },
  "workflow.stage.project_setup": {
    vi: "Thiết lập dự án",
    en: "Project setup",
    zh: "项目设定",
  },
  "workflow.stage.auto_director": {
    vi: "Đạo diễn tự động",
    en: "Auto-director",
    zh: "自动导演",
  },
  "workflow.stage.story_macro": {
    vi: "Quy hoạch vĩ mô cốt truyện",
    en: "Story macro planning",
    zh: "故事宏观规划",
  },
  "workflow.stage.character_setup": {
    vi: "Chuẩn bị nhân vật",
    en: "Character setup",
    zh: "角色准备",
  },
  "workflow.stage.volume_strategy": {
    vi: "Chiến lược tập / khung tập",
    en: "Volume strategy / skeleton",
    zh: "卷战略 / 卷骨架",
  },
  "workflow.stage.structured_outline": {
    vi: "Nhịp truyện / tách chương",
    en: "Beat sheet / chapter breakdown",
    zh: "节奏 / 拆章",
  },
  "workflow.stage.chapter_execution": {
    vi: "Thực thi chương",
    en: "Chapter execution",
    zh: "章节执行",
  },
  "workflow.stage.quality_repair": {
    vi: "Sửa chất lượng",
    en: "Quality repair",
    zh: "质量修复",
  },
  "workflow.title.auto_director_novel": {
    vi: "Tiểu thuyết do đạo diễn tự động điều phối",
    en: "Auto-directed novel",
    zh: "AI 自动导演小说",
  },
  "workflow.title.novel_task": {
    vi: "Tác vụ quy trình tiểu thuyết",
    en: "Novel workflow task",
    zh: "小说流程任务",
  },
  "workflow.owner.default": {
    vi: "Tác vụ chính của tiểu thuyết",
    en: "Main novel task",
    zh: "小说主任务",
  },
  "workflow.notice.action.open_structured_outline": {
    vi: "Mở phần tách chương của tập hiện tại",
    en: "Open the current volume breakdown",
    zh: "打开当前卷拆章",
  },
  "workflow.notice.action.quick_fix_chapter_titles": {
    vi: "Sửa nhanh độ đa dạng tiêu đề chương",
    en: "Quick-fix chapter title diversity",
    zh: "快速修复章节标题",
  },
  "director.error.recovery_not_needed": {
    vi: "Sản phẩm director hiện tại đã đầy đủ, không cần tiếp tục tự động director nữa.",
    en: "The current director output is already complete, so auto-director does not need to continue.",
    zh: "当前导演产物已经完整，无需继续自动导演。",
  },
  "director.error.task_cancelled": {
    vi: "Tác vụ auto-director hiện tại đã bị hủy.",
    en: "The current auto-director task has been cancelled.",
    zh: "当前自动导演任务已取消。",
  },
  "director.default.current_project": {
    vi: "dự án hiện tại",
    en: "current project",
    zh: "当前项目",
  },
  "director.scope.chapter_single": {
    vi: "chương {{chapterOrder}}",
    en: "chapter {{chapterOrder}}",
    zh: "第 {{chapterOrder}} 章",
  },
  "director.scope.chapter_range": {
    vi: "chương {{startOrder}}-{{endOrder}}",
    en: "chapters {{startOrder}}-{{endOrder}}",
    zh: "第 {{startOrder}}-{{endOrder}} 章",
  },
  "director.scope.volume": {
    vi: "tập {{volumeOrder}}{{volumeLabel}}",
    en: "volume {{volumeOrder}}{{volumeLabel}}",
    zh: "第 {{volumeOrder}} 卷{{volumeLabel}}",
  },
  "director.scope.front_chapters": {
    vi: "{{chapterCount}} chương đầu",
    en: "the first {{chapterCount}} chapters",
    zh: "前 {{chapterCount}} 章",
  },
  "director.auto_execution.remaining_count": {
    vi: "Hiện vẫn còn {{remainingChapterCount}} chương chờ tiếp tục",
    en: "{{remainingChapterCount}} chapters are still waiting to continue",
    zh: "当前仍有 {{remainingChapterCount}} 章待继续",
  },
  "director.auto_execution.remaining_none": {
    vi: "Lô hiện tại không còn chương nào chờ tiếp tục",
    en: "There are no chapters left to continue in the current batch",
    zh: "当前批次已无待继续章节",
  },
  "director.auto_execution.next_chapter": {
    vi: ", nên tiếp tục từ chương {{nextChapterOrder}}",
    en: ", and it should continue from chapter {{nextChapterOrder}}",
    zh: "，建议从第 {{nextChapterOrder}} 章继续",
  },
  "director.auto_execution.paused_summary": {
    vi: "{{scopeLabel}} đã vào chế độ tự động thực thi, nhưng batch hiện tại chưa hoàn tất: {{failureMessage}} {{remainingSummary}}{{nextSummary}}.",
    en: "{{scopeLabel}} entered auto-execution, but the current batch did not complete: {{failureMessage}} {{remainingSummary}}{{nextSummary}}.",
    zh: "{{scopeLabel}}已进入自动执行，但当前批量任务未完全完成：{{failureMessage}} {{remainingSummary}}{{nextSummary}}。",
  },
  "director.auto_execution.completed": {
    vi: "{{scopeLabel}} đã hoàn tất tự động thực thi",
    en: "{{scopeLabel}} auto-execution is complete",
    zh: "{{scopeLabel}}自动执行完成",
  },
  "director.auto_execution.completed_summary.no_review": {
    vi: "\"{{title}}\" đã tự động hoàn tất phần thực thi chương cho {{scopeLabel}}, và sau khi tạo nội dung không chạy thêm bước duyệt hay sửa tự động.",
    en: "\"{{title}}\" automatically completed chapter execution for {{scopeLabel}}, without running automatic review or auto-repair afterward.",
    zh: "《{{title}}》已自动完成{{scopeLabel}}的章节执行，正文生成后未额外执行自动审核或修复。",
  },
  "director.auto_execution.completed_summary.review_only": {
    vi: "\"{{title}}\" đã tự động hoàn tất phần thực thi chương và tự duyệt cho {{scopeLabel}}, nhưng chưa bật tự sửa.",
    en: "\"{{title}}\" automatically completed chapter execution and review for {{scopeLabel}}, without auto-repair enabled.",
    zh: "《{{title}}》已自动完成{{scopeLabel}}的章节执行与自动审核，未开启自动修复。",
  },
  "director.auto_execution.completed_summary.review_and_repair": {
    vi: "\"{{title}}\" đã tự động hoàn tất thực thi chương, tự duyệt và tự sửa cho {{scopeLabel}}.",
    en: "\"{{title}}\" automatically completed chapter execution, review, and repair for {{scopeLabel}}.",
    zh: "《{{title}}》已自动完成{{scopeLabel}}的章节执行、自动审核与修复。",
  },
  "director.auto_execution.item.reviewing": {
    vi: "Đang tự duyệt {{scopeLabel}}{{chapterLabel}}{{activityLabel}}",
    en: "Auto-reviewing {{scopeLabel}}{{chapterLabel}}{{activityLabel}}",
    zh: "正在自动审校{{scopeLabel}}{{chapterLabel}}{{activityLabel}}",
  },
  "director.auto_execution.item.repairing": {
    vi: "Đang tự sửa {{scopeLabel}}{{chapterLabel}}{{activityLabel}}",
    en: "Auto-repairing {{scopeLabel}}{{chapterLabel}}{{activityLabel}}",
    zh: "正在自动修复{{scopeLabel}}{{chapterLabel}}{{activityLabel}}",
  },
  "director.auto_execution.item.executing": {
    vi: "Đang tự thực thi {{scopeLabel}}{{chapterLabel}}{{activityLabel}}",
    en: "Auto-executing {{scopeLabel}}{{chapterLabel}}{{activityLabel}}",
    zh: "正在自动执行{{scopeLabel}}{{chapterLabel}}{{activityLabel}}",
  },
  "director.chapter_title_repair.error.target_volume_not_found": {
    vi: "Không tìm thấy tập mục tiêu của tác vụ hiện tại, nên không thể tiếp tục AI sửa tiêu đề chương.",
    en: "The target volume for the current task is missing, so AI chapter-title repair cannot continue.",
    zh: "当前任务对应的目标卷不存在，无法继续 AI 修复章节标题。",
  },
  "director.chapter_title_repair.error.repaired_volume_missing": {
    vi: "AI đã trả về kết quả tiêu đề chương mới, nhưng sau khi lưu thì tập hiện tại bị mất nên không thể hoàn tất việc sửa.",
    en: "The AI returned repaired chapter titles, but the current volume disappeared after saving, so the repair cannot be completed.",
    zh: "AI 已返回新的章节标题结果，但保存后的当前卷丢失，无法完成修复。",
  },
  "director.chapter_title_repair.item.load_context": {
    vi: "Đang gom ngữ cảnh tách chương cho tập {{volumeOrder}}",
    en: "Preparing chapter-breakdown context for volume {{volumeOrder}}",
    zh: "正在整理第 {{volumeOrder}} 卷拆章上下文",
  },
  "director.chapter_title_repair.item.repairing": {
    vi: "Đang dùng AI sửa tiêu đề chương của tập {{volumeOrder}}",
    en: "AI is repairing chapter titles for volume {{volumeOrder}}",
    zh: "正在 AI 修复第 {{volumeOrder}} 卷章节标题",
  },
  "director.chapter_title_repair.item.backfill_beat_sheet": {
    vi: "Đang bổ sung beat sheet cho tập {{volumeOrder}}",
    en: "Backfilling the beat sheet for volume {{volumeOrder}}",
    zh: "正在补齐第 {{volumeOrder}} 卷节奏板",
  },
  "director.chapter_title_repair.item.diversity_still_needed": {
    vi: "Tiêu đề chương của tập {{volumeOrder}} đã được viết lại, nhưng cấu trúc vẫn nên phân tán hơn nữa",
    en: "Volume {{volumeOrder}} chapter titles were rewritten, but the title structure still needs more diversity",
    zh: "第 {{volumeOrder}} 卷章节标题已重写，但结构仍建议继续分散",
  },
  "director.chapter_title_repair.item.repaired": {
    vi: "AI đã sửa xong tiêu đề chương của tập {{volumeOrder}}",
    en: "AI chapter-title repair is complete for volume {{volumeOrder}}",
    zh: "第 {{volumeOrder}} 卷章节标题已完成 AI 修复",
  },
  "workflow.target.pipeline": {
    vi: "Pipeline chương",
    en: "Chapter pipeline",
    zh: "章节流水线",
  },
  "workflow.failure.default": {
    vi: "Quy trình tiểu thuyết đã dừng nhưng không có bản ghi lỗi rõ ràng.",
    en: "The novel workflow stopped without a recorded error.",
    zh: "小说流程已停止，但没有记录明确错误。",
  },
  "workflow.error.missing_llm_context": {
    vi: "Tác vụ đạo diễn tự động hiện không có ngữ cảnh mô hình để ghi đè.",
    en: "The current auto-director task has no model context available for override.",
    zh: "当前自动导演任务缺少可覆盖的模型上下文。",
  },
  "workflow.review_skip.action.default": {
    vi: "tiếp tục tự động thực thi phạm vi hiện tại",
    en: "continue auto-executing the current scope",
    zh: "继续自动执行当前范围",
  },
  "workflow.review_skip.action.with_scope": {
    vi: "tiếp tục tự động thực thi {{scopeLabel}}",
    en: "continue auto-executing {{scopeLabel}}",
    zh: "继续自动执行{{scopeLabel}}",
  },
  "workflow.review_skip.continuation.remaining_with_next": {
    vi: "Hiện còn {{remainingChapterCount}} chương chờ tiếp tục, hệ thống sẽ chạy từ chương {{nextChapterOrder}}.",
    en: "{{remainingChapterCount}} chapters remain, and the system will continue from chapter {{nextChapterOrder}}.",
    zh: "当前仍有 {{remainingChapterCount}} 章待继续，系统会从第 {{nextChapterOrder}} 章继续。",
  },
  "workflow.review_skip.continuation.remaining_without_next": {
    vi: "Hiện còn {{remainingChapterCount}} chương chờ tiếp tục, hệ thống sẽ chạy từ chương tiếp theo.",
    en: "{{remainingChapterCount}} chapters remain, and the system will continue from the next chapter.",
    zh: "当前仍有 {{remainingChapterCount}} 章待继续，系统会从下一章继续。",
  },
  "workflow.review_skip.continuation.none_with_next": {
    vi: "Hiện không còn chương nào chờ tiếp tục, hệ thống sẽ chạy từ chương {{nextChapterOrder}}.",
    en: "No chapters remain, and the system will continue from chapter {{nextChapterOrder}}.",
    zh: "当前已无待继续章节，系统会从第 {{nextChapterOrder}} 章继续。",
  },
  "workflow.review_skip.continuation.none_without_next": {
    vi: "Hiện không còn chương nào chờ tiếp tục, hệ thống sẽ chạy từ chương tiếp theo.",
    en: "No chapters remain, and the system will continue from the next chapter.",
    zh: "当前已无待继续章节，系统会从下一章继续。",
  },
  "workflow.review_skip.continuation.unknown_with_next": {
    vi: "Hiện vẫn còn chương chờ tiếp tục, hệ thống sẽ chạy từ chương {{nextChapterOrder}}.",
    en: "There are still chapters remaining, and the system will continue from chapter {{nextChapterOrder}}.",
    zh: "当前仍有待继续章节，系统会从第 {{nextChapterOrder}} 章继续。",
  },
  "workflow.review_skip.continuation.unknown_without_next": {
    vi: "Hiện vẫn còn chương chờ tiếp tục, hệ thống sẽ chạy từ chương tiếp theo.",
    en: "There are still chapters remaining, and the system will continue from the next chapter.",
    zh: "当前仍有待继续章节，系统会从下一章继续。",
  },
  "workflow.review_skip.failure_summary": {
    vi: "Chương hiện tại đang tạm dừng vì bị chặn ở bước duyệt, nhưng loại lỗi này cho phép bỏ qua chương hiện tại để tiếp tục. Hãy bấm “{{actionLabel}}”. {{continuation}}",
    en: "The current chapter is paused by a review gate, but this failure type can skip the current chapter and continue. Click “{{actionLabel}}”. {{continuation}}",
    zh: "当前章因审核阻断而暂停，但这类问题允许跳过当前章继续执行。点击“{{actionLabel}}”。{{continuation}}",
  },
  "workflow.review_skip.checkpoint_summary": {
    vi: "{{scopeLabel}} đang chạy tự động nhưng chương hiện tại tạm dừng vì bị chặn ở bước duyệt. Loại lỗi này cho phép bỏ qua chương hiện tại để tiếp tục. {{continuation}}",
    en: "{{scopeLabel}} is auto-running, but the current chapter is paused by a review gate. This failure type can skip the current chapter and continue. {{continuation}}",
    zh: "{{scopeLabel}}已进入自动执行，但当前章因审核阻断而暂停。这类问题允许跳过当前章继续执行。{{continuation}}",
  },
  "workflow.review_skip.blocking_reason.with_next": {
    vi: "Chương hiện tại đang tạm dừng vì bị chặn ở bước duyệt, nhưng loại lỗi này cho phép bỏ qua chương hiện tại để tiếp tục. Sau khi bấm “{{actionLabel}}”, hệ thống sẽ chạy từ chương {{nextChapterOrder}}.",
    en: "The current chapter is paused by a review gate, but this failure type can skip the current chapter and continue. After you click “{{actionLabel}}”, the system will continue from chapter {{nextChapterOrder}}.",
    zh: "当前章因审核阻断而暂停，但这类问题允许跳过当前章继续执行。点击“{{actionLabel}}”后，系统会从第 {{nextChapterOrder}} 章继续。",
  },
  "workflow.review_skip.blocking_reason.without_next": {
    vi: "Chương hiện tại đang tạm dừng vì bị chặn ở bước duyệt, nhưng loại lỗi này cho phép bỏ qua chương hiện tại để tiếp tục. Sau khi bấm “{{actionLabel}}”, hệ thống sẽ chạy từ chương tiếp theo.",
    en: "The current chapter is paused by a review gate, but this failure type can skip the current chapter and continue. After you click “{{actionLabel}}”, the system will continue from the next chapter.",
    zh: "当前章因审核阻断而暂停，但这类问题允许跳过当前章继续执行。点击“{{actionLabel}}”后，系统会从下一章继续。",
  },
  "workflow.review_skip.recovery_hint.with_next": {
    vi: "Bạn có thể bấm “{{actionLabel}}” để bỏ qua chương đang bị chặn và chạy tiếp từ chương {{nextChapterOrder}}. Nếu muốn sửa chương hiện tại trước, hãy quay lại thực thi chương hoặc sửa chất lượng.",
    en: "You can click “{{actionLabel}}” to skip the blocked chapter and continue from chapter {{nextChapterOrder}}. If you want to fix the current chapter first, return to chapter execution or quality repair.",
    zh: "可直接点击“{{actionLabel}}”，系统会跳过当前审核阻断章并从第 {{nextChapterOrder}} 章继续；如需先修复当前章，再回到章节执行或质量修复处理。",
  },
  "workflow.review_skip.recovery_hint.without_next": {
    vi: "Bạn có thể bấm “{{actionLabel}}” để bỏ qua chương đang bị chặn và chạy tiếp từ chương tiếp theo. Nếu muốn sửa chương hiện tại trước, hãy quay lại thực thi chương hoặc sửa chất lượng.",
    en: "You can click “{{actionLabel}}” to skip the blocked chapter and continue from the next chapter. If you want to fix the current chapter first, return to chapter execution or quality repair.",
    zh: "可直接点击“{{actionLabel}}”，系统会跳过当前审核阻断章并从下一章继续；如需先修复当前章，再回到章节执行或质量修复处理。",
  },
  "workflow.recovery.cursor.volume_beat_sheet": {
    vi: "Đang tạo beat sheet cho tập {{volumeOrder}}",
    en: "Generating the beat sheet for volume {{volumeOrder}}",
    zh: "正在生成第 {{volumeOrder}} 卷节奏板",
  },
  "workflow.recovery.cursor.volume_beat": {
    vi: "Đang tạo nhịp truyện cho tập {{volumeOrder}}: {{beatLabel}}",
    en: "Generating the beat for volume {{volumeOrder}}: {{beatLabel}}",
    zh: "正在生成第 {{volumeOrder}} 卷节奏段：{{beatLabel}}",
  },
  "workflow.recovery.cursor.chapter_list": {
    vi: "Đang tạo danh sách chương cho tập {{volumeOrder}}",
    en: "Generating the chapter list for volume {{volumeOrder}}",
    zh: "正在生成第 {{volumeOrder}} 卷章节列表",
  },
  "workflow.recovery.front10_sync": {
    vi: "{{scopeLabel}} đã tinh chỉnh xong, đang đồng bộ tài nguyên thực thi chương",
    en: "{{scopeLabel}} is prepared, syncing chapter execution resources",
    zh: "{{scopeLabel}}细化已完成，正在同步章节执行资源",
  },
  "workflow.checkpoint.restored_candidate": {
    vi: "Phương án ứng viên đã được khôi phục, hãy xác nhận lại hoặc tiếp tục tinh chỉnh.",
    en: "Candidate options have been restored. Confirm them again or continue refining.",
    zh: "候选方案已恢复，请重新确认或继续微调。",
  },
  "workflow.item.structured_outline_title_needs_diversity": {
    vi: "Danh sách chương đã tạo nhưng cấu trúc tiêu đề vẫn cần đa dạng hơn",
    en: "The chapter list is ready, but the title structure still needs more diversity",
    zh: "章节列表已生成，但标题结构仍需分散",
  },
  "workflow.item.waiting_candidate_generation": {
    vi: "Đang chờ tạo hướng ứng viên",
    en: "Waiting to generate candidate directions",
    zh: "等待生成候选方向",
  },
  "workflow.item.waiting_project_creation": {
    vi: "Đang chờ tạo dự án",
    en: "Waiting to create the project",
    zh: "等待创建项目",
  },
  "workflow.item.creating_project": {
    vi: "Đang tạo dự án tiểu thuyết",
    en: "Creating the novel project",
    zh: "正在创建小说项目",
  },
  "workflow.item.project_created": {
    vi: "Dự án tiểu thuyết đã được tạo",
    en: "The novel project has been created",
    zh: "小说项目已创建",
  },
  "workflow.item.workflow_restored": {
    vi: "Tác vụ chính của tiểu thuyết đã được khôi phục",
    en: "The main novel workflow has been restored",
    zh: "已恢复小说主任务",
  },
  "workflow.auto_execution.quality_not_passed": {
    vi: "{{scopeLabel}} tự động thực thi nhưng chưa vượt qua toàn bộ yêu cầu chất lượng.",
    en: "{{scopeLabel}} auto-execution did not pass all quality requirements.",
    zh: "{{scopeLabel}}自动执行未能全部通过质量要求。",
  },
  "production.error.novel_not_found": {
    vi: "Không tìm thấy tiểu thuyết hiện tại.",
    en: "Current novel not found.",
    zh: "未找到当前小说。",
  },
  "production.asset.novel_workspace": {
    vi: "Không gian làm việc tiểu thuyết",
    en: "Novel workspace",
    zh: "小说工作区",
  },
  "production.asset.world": {
    vi: "Thế giới quan",
    en: "World setting",
    zh: "世界观",
  },
  "production.asset.characters": {
    vi: "Nhân vật cốt lõi",
    en: "Core characters",
    zh: "核心角色",
  },
  "production.asset.story_bible": {
    vi: "Kinh thánh tiểu thuyết",
    en: "Story bible",
    zh: "小说圣经",
  },
  "production.asset.outline": {
    vi: "Hướng phát triển cốt truyện",
    en: "Story direction",
    zh: "发展走向",
  },
  "production.asset.structured_outline": {
    vi: "Dàn ý có cấu trúc",
    en: "Structured outline",
    zh: "结构化大纲",
  },
  "production.asset.chapters": {
    vi: "Mục lục chương",
    en: "Chapter list",
    zh: "章节目录",
  },
  "production.asset.pipeline": {
    vi: "Tác vụ sản xuất toàn truyện",
    en: "Full-book production task",
    zh: "整本写作任务",
  },
  "production.asset.characters.count": {
    vi: "{{count}} nhân vật",
    en: "{{count}} characters",
    zh: "{{count}} 个角色",
  },
  "production.asset.outline.generated": {
    vi: "Đã tạo hướng phát triển",
    en: "Story direction generated",
    zh: "已生成发展走向",
  },
  "production.asset.structured_outline.chapter_count": {
    vi: "{{count}} chương đã lên kế hoạch",
    en: "{{count}} chapters planned",
    zh: "{{count}} 章规划",
  },
  "production.asset.chapters.chapter_count": {
    vi: "{{chapterCount}}/{{targetChapterCount}} chương",
    en: "{{chapterCount}}/{{targetChapterCount}} chapters",
    zh: "{{chapterCount}}/{{targetChapterCount}} 章",
  },
  "production.asset.pipeline.status_detail": {
    vi: "Trạng thái: {{statusLabel}}",
    en: "Status: {{statusLabel}}",
    zh: "状态：{{statusLabel}}",
  },
  "production.pipeline.status.queued": {
    vi: "Đang xếp hàng",
    en: "Queued",
    zh: "排队中",
  },
  "production.pipeline.status.running": {
    vi: "Đang chạy",
    en: "Running",
    zh: "进行中",
  },
  "production.pipeline.status.succeeded": {
    vi: "Đã hoàn tất",
    en: "Completed",
    zh: "已完成",
  },
  "production.pipeline.status.failed": {
    vi: "Đã thất bại",
    en: "Failed",
    zh: "失败",
  },
  "production.pipeline.status.cancelled": {
    vi: "Đã hủy",
    en: "Cancelled",
    zh: "已取消",
  },
  "production.current.assets_pending": {
    vi: "Tài nguyên còn thiếu",
    en: "Assets pending",
    zh: "资产待准备",
  },
  "production.current.waiting_world": {
    vi: "Chờ tạo thế giới quan",
    en: "Waiting for world generation",
    zh: "等待生成世界观",
  },
  "production.current.waiting_characters": {
    vi: "Chờ tạo nhân vật cốt lõi",
    en: "Waiting for core characters",
    zh: "等待生成核心角色",
  },
  "production.current.waiting_story_bible": {
    vi: "Chờ tạo kinh thánh tiểu thuyết",
    en: "Waiting for the story bible",
    zh: "等待生成小说圣经",
  },
  "production.current.waiting_outline": {
    vi: "Chờ tạo hướng phát triển cốt truyện",
    en: "Waiting for story direction",
    zh: "等待生成发展走向",
  },
  "production.current.waiting_structured_outline": {
    vi: "Chờ tạo dàn ý có cấu trúc",
    en: "Waiting for the structured outline",
    zh: "等待生成结构化大纲",
  },
  "production.current.waiting_chapter_sync": {
    vi: "Chờ đồng bộ mục lục chương",
    en: "Waiting to sync the chapter list",
    zh: "等待同步章节目录",
  },
  "production.current.waiting_pipeline_start": {
    vi: "Chờ khởi động sản xuất toàn truyện",
    en: "Waiting to start full-book production",
    zh: "等待启动整本写作",
  },
  "production.current.pipeline_running": {
    vi: "Sản xuất toàn truyện đang chạy",
    en: "Full-book production is running",
    zh: "整本写作进行中",
  },
  "production.current.pipeline_completed": {
    vi: "Sản xuất toàn truyện đã hoàn tất",
    en: "Full-book production completed",
    zh: "整本写作已完成",
  },
  "production.current.pipeline_failed": {
    vi: "Sản xuất toàn truyện thất bại",
    en: "Full-book production failed",
    zh: "整本写作失败",
  },
  "production.current.pipeline_cancelled": {
    vi: "Sản xuất toàn truyện đã bị hủy",
    en: "Full-book production was cancelled",
    zh: "整本写作已取消",
  },
  "production.failure.pipeline_default": {
    vi: "Tác vụ sản xuất toàn truyện đã thất bại.",
    en: "The full-book production task failed.",
    zh: "整本写作任务失败。",
  },
  "production.recovery.failed": {
    vi: "Hãy kiểm tra mục lục chương và cấu hình mô hình, rồi khởi chạy lại tác vụ sản xuất toàn truyện nếu cần.",
    en: "Check the chapter list and model configuration, then restart full-book production if needed.",
    zh: "请检查章节目录和模型配置，必要时重新发起整本写作。",
  },
  "production.recovery.prepare_assets": {
    vi: "Hãy hoàn tất thế giới quan, nhân vật, kinh thánh truyện, dàn ý và mục lục chương trước.",
    en: "Finish the world, characters, story bible, outline, and chapter list first.",
    zh: "请先完成世界观、角色、圣经、大纲和章节目录准备。",
  },
  "production.recovery.ready_to_start": {
    vi: "Tài nguyên đã sẵn sàng, có thể khởi động sản xuất toàn truyện sau khi duyệt xong.",
    en: "Assets are ready. Start full-book production after approval.",
    zh: "当前资产已准备完成，可在审批通过后启动整本写作。",
  },
  "production.summary.current_stage": {
    vi: "\"{{title}}\" hiện ở giai đoạn: {{currentStage}}.",
    en: "\"{{title}}\" is currently at: {{currentStage}}.",
    zh: "《{{title}}》当前阶段：{{currentStage}}。",
  },
  "production.summary.ready_not_started": {
    vi: "\"{{title}}\" đã chuẩn bị xong tài nguyên nhưng chưa khởi động sản xuất toàn truyện.",
    en: "\"{{title}}\" has all assets ready but full-book production has not started yet.",
    zh: "《{{title}}》资产已准备完成，尚未启动整本写作。",
  },
  "production.world.reused": {
    vi: "Đã dùng lại thế giới quan \"{{worldName}}\" đang gắn với tiểu thuyết.",
    en: "Reused the world setting \"{{worldName}}\" already linked to the novel.",
    zh: "已复用当前小说绑定的世界观《{{worldName}}》。",
  },
  "production.world.generate_description_fallback": {
    vi: "Tạo thế giới quan cho tiểu thuyết \"{{title}}\"",
    en: "Generate a world setting for the novel \"{{title}}\"",
    zh: "为小说《{{title}}》生成世界观设定",
  },
  "production.world.generated_result_missing": {
    vi: "Đã tạo xong thế giới quan nhưng không tìm được kết quả đầu ra.",
    en: "World generation completed, but the generated result could not be located.",
    zh: "世界观生成已完成，但未能定位生成结果。",
  },
  "production.world.generated": {
    vi: "Đã tạo thế giới quan \"{{worldName}}\" cho \"{{title}}\".",
    en: "Generated the world setting \"{{worldName}}\" for \"{{title}}\".",
    zh: "已为《{{title}}》生成世界观《{{worldName}}》。",
  },
  "production.characters.reused": {
    vi: "Đã dùng lại {{characterCount}} nhân vật hiện có của \"{{title}}\".",
    en: "Reused the existing {{characterCount}} characters for \"{{title}}\".",
    zh: "已复用《{{title}}》现有的 {{characterCount}} 个角色。",
  },
  "production.characters.prompt.no_description": {
    vi: "Chưa có mô tả",
    en: "No description yet",
    zh: "暂无",
  },
  "production.characters.prompt.unspecified": {
    vi: "Chưa chỉ định",
    en: "Unspecified",
    zh: "未指定",
  },
  "production.characters.prompt.no_world": {
    vi: "Chưa gắn thế giới quan",
    en: "No world setting bound yet",
    zh: "暂无已绑定世界观",
  },
  "production.characters.empty_result": {
    vi: "Không có kết quả tạo nhân vật nào đủ điều kiện để lưu.",
    en: "Character generation did not return any savable results.",
    zh: "角色生成未返回可保存的结果。",
  },
  "production.characters.generated": {
    vi: "Đã tạo {{characterCount}} nhân vật cốt lõi cho \"{{title}}\".",
    en: "Generated {{characterCount}} core characters for \"{{title}}\".",
    zh: "已为《{{title}}》生成 {{characterCount}} 个核心角色。",
  },
  "production.story_bible.generated": {
    vi: "Đã tạo kinh thánh tiểu thuyết cho \"{{title}}\".",
    en: "Generated the story bible for \"{{title}}\".",
    zh: "已生成《{{title}}》的小说圣经。",
  },
  "production.outline.generated": {
    vi: "Đã tạo hướng phát triển cốt truyện.",
    en: "Generated the story direction.",
    zh: "已生成小说发展走向。",
  },
  "production.structured_outline.generated": {
    vi: "Đã tạo dàn ý có cấu trúc cho {{targetChapterCount}} chương.",
    en: "Generated a structured outline for {{targetChapterCount}} chapters.",
    zh: "已生成 {{targetChapterCount}} 章结构化大纲。",
  },
  "production.error.structured_outline_missing": {
    vi: "Tiểu thuyết hiện chưa có dàn ý có cấu trúc.",
    en: "The current novel does not have a structured outline yet.",
    zh: "当前小说还没有结构化大纲。",
  },
  "production.error.structured_outline_empty": {
    vi: "Dàn ý có cấu trúc hiện không có chương nào để đồng bộ.",
    en: "The structured outline has no chapters to sync.",
    zh: "结构化大纲中没有可同步的章节。",
  },
  "production.sync_chapters.generated": {
    vi: "Đã đồng bộ {{chapterCount}} chương vào mục lục.",
    en: "Synced {{chapterCount}} chapters into the chapter list.",
    zh: "已同步 {{chapterCount}} 个章节目录。",
  },
  "production.error.chapter_directory_missing": {
    vi: "Tiểu thuyết hiện chưa có mục lục chương nên chưa thể khởi động sản xuất toàn truyện.",
    en: "The novel has no chapter list yet, so full-book production cannot start.",
    zh: "当前小说还没有章节目录，无法启动整本写作。",
  },
  "production.pipeline.started": {
    vi: "Đã khởi động tác vụ sản xuất toàn truyện từ chương {{startOrder}} đến chương {{endOrder}}.",
    en: "Started full-book production from chapter {{startOrder}} to chapter {{endOrder}}.",
    zh: "已启动第{{startOrder}}到第{{endOrder}}章的整本写作任务。",
  },
  "agent.production.status.unavailable": {
    vi: "Chưa lấy được trạng thái sản xuất toàn truyện.",
    en: "The full-book production status is unavailable.",
    zh: "未获取到整本生产状态。",
  },
  "agent.production.status.no_context": {
    vi: "Hiện không có ngữ cảnh tiểu thuyết để đọc trạng thái sản xuất toàn truyện.",
    en: "There is no current novel context to read the full-book production status.",
    zh: "没有当前小说上下文，无法读取整本生产状态。",
  },
  "agent.production.current_novel": {
    vi: "tiểu thuyết hiện tại",
    en: "the current novel",
    zh: "当前小说",
  },
  "agent.production.unknown_stage": {
    vi: "giai đoạn chưa xác định",
    en: "an unknown stage",
    zh: "未知阶段",
  },
  "agent.production.status.stage": {
    vi: "\"{{title}}\" hiện ở giai đoạn: {{currentStage}}.",
    en: "\"{{title}}\" is currently at: {{currentStage}}.",
    zh: "《{{title}}》当前阶段：{{currentStage}}。",
  },
  "agent.production.status.chapters.with_target": {
    vi: "Mục lục chương: {{chapterCount}}/{{targetChapterCount}} chương.",
    en: "Chapter list: {{chapterCount}}/{{targetChapterCount}} chapters.",
    zh: "章节目录：{{chapterCount}}/{{targetChapterCount}} 章。",
  },
  "agent.production.status.chapters.without_target": {
    vi: "Mục lục chương: {{chapterCount}} chương.",
    en: "Chapter list: {{chapterCount}} chapters.",
    zh: "章节目录：{{chapterCount}} 章。",
  },
  "agent.production.status.pipeline": {
    vi: "Trạng thái tác vụ sản xuất toàn truyện: {{pipelineStatus}}.",
    en: "Full-book production task status: {{pipelineStatus}}.",
    zh: "整本写作任务状态：{{pipelineStatus}}。",
  },
  "agent.production.status.failure": {
    vi: "Lý do lỗi: {{failureSummary}}",
    en: "Failure reason: {{failureSummary}}",
    zh: "失败原因：{{failureSummary}}",
  },
  "agent.production.status.recovery": {
    vi: "Gợi ý: {{recoveryHint}}",
    en: "Suggestion: {{recoveryHint}}",
    zh: "建议：{{recoveryHint}}",
  },
  "agent.production.asset.world.named": {
    vi: "thế giới quan \"{{worldName}}\"",
    en: "the world setting \"{{worldName}}\"",
    zh: "世界观《{{worldName}}》",
  },
  "agent.production.asset.world.generic": {
    vi: "thế giới quan",
    en: "the world setting",
    zh: "世界观",
  },
  "agent.production.asset.characters": {
    vi: "{{characterCount}} nhân vật cốt lõi",
    en: "{{characterCount}} core characters",
    zh: "{{characterCount}} 个核心角色",
  },
  "agent.production.asset.story_bible": {
    vi: "kinh thánh tiểu thuyết",
    en: "the story bible",
    zh: "小说圣经",
  },
  "agent.production.asset.outline": {
    vi: "hướng phát triển cốt truyện",
    en: "the story direction",
    zh: "发展走向",
  },
  "agent.production.asset.structured_outline.count": {
    vi: "dàn ý có cấu trúc {{targetChapterCount}} chương",
    en: "a {{targetChapterCount}}-chapter structured outline",
    zh: "{{targetChapterCount}} 章结构化大纲",
  },
  "agent.production.asset.structured_outline.generic": {
    vi: "dàn ý có cấu trúc",
    en: "the structured outline",
    zh: "结构化大纲",
  },
  "agent.production.asset.chapter_list.count": {
    vi: "{{chapterCount}} chương trong mục lục",
    en: "{{chapterCount}} chapters in the chapter list",
    zh: "{{chapterCount}} 个章节目录",
  },
  "agent.production.asset.chapter_list.generic": {
    vi: "mục lục chương",
    en: "the chapter list",
    zh: "章节目录",
  },
  "agent.production.assets_ready": {
    vi: "Các tài nguyên cốt lõi của \"{{title}}\" đã sẵn sàng{{assetList}}.",
    en: "The core assets for \"{{title}}\" are ready{{assetList}}.",
    zh: "《{{title}}》的核心资产已生成完成{{assetList}}。",
  },
  "agent.production.asset_list.with_items": {
    vi: ": {{assetList}}",
    en: ": {{assetList}}",
    zh: "：{{assetList}}",
  },
  "agent.production.preview_waiting": {
    vi: "Bản xem trước sản xuất toàn truyện đã hoàn tất và hiện đang chờ duyệt.",
    en: "The full-book production preview is complete and waiting for approval.",
    zh: "整本写作预览已完成，当前等待审批。",
  },
  "agent.production.pipeline_started": {
    vi: "Tác vụ sản xuất toàn truyện đã khởi động{{jobSuffix}}.",
    en: "The full-book production task has started{{jobSuffix}}.",
    zh: "整本写作任务已启动{{jobSuffix}}。",
  },
  "agent.production.pipeline_not_started": {
    vi: "Tác vụ sản xuất toàn truyện vẫn chưa khởi động.",
    en: "Full-book production has not started yet.",
    zh: "整本写作未启动。",
  },
  "agent.production.job_suffix": {
    vi: " (tác vụ {{jobId}})",
    en: " (job {{jobId}})",
    zh: "（任务 {{jobId}}）",
  },
  "agent.common.insufficient_info": {
    vi: "Thông tin hiện tại chưa đủ để tiếp tục.",
    en: "There is not enough information to continue.",
    zh: "当前信息不足，无法继续。",
  },
  "agent.common.title_missing": {
    vi: "Chưa lấy được tiêu đề.",
    en: "The title is unavailable.",
    zh: "未获取到标题。",
  },
  "agent.common.chapter_content_missing": {
    vi: "Chưa lấy được nội dung chương.",
    en: "Chapter content is unavailable.",
    zh: "未获取到章节正文。",
  },
  "agent.common.executable_range_missing": {
    vi: "Chưa lấy được phạm vi có thể thực thi.",
    en: "No executable range is available.",
    zh: "未获取到可执行范围。",
  },
  "agent.collab.question.produce": {
    vi: "Bạn muốn chốt một câu premise trước, hay để mình đề xuất luôn 3 hướng khả thi?",
    en: "Do you want to lock a one-line premise first, or should I give you three viable directions?",
    zh: "你想先把一句话设定钉牢，还是让我直接给你三套可选方向？",
  },
  "agent.collab.question.write": {
    vi: "Ở chương này, bạn muốn xử lý trước phần diễn biến, cảm xúc nhân vật hay nhịp văn?",
    en: "For this chapter, do you want to solve plot movement, character emotion, or prose rhythm first?",
    zh: "这章你最想先解决的是剧情推进、人物情绪，还是文风节奏？",
  },
  "agent.collab.question.ideate": {
    vi: "Bạn muốn xem trước phần thiết lập cốt lõi, lời hứa câu chuyện hay các phương án thể loại và phong cách?",
    en: "Do you want to see the core setup, the story promise, or genre-and-style options first?",
    zh: "你更想先看核心设定、故事承诺，还是题材风格的备选方案？",
  },
  "agent.collab.question.default": {
    vi: "Lúc này bạn muốn giải quyết trước vấn đề sáng tác nào?",
    en: "Which creative problem do you want to solve first right now?",
    zh: "你现在最想先解决哪一个创作问题？",
  },
  "agent.collab.option.produce.1": {
    vi: "Mình đề xuất trước 3 hướng thiết lập cốt lõi dựa trên thông tin hiện có.",
    en: "I can propose three core setup directions based on the current information.",
    zh: "我先基于当前信息给你 3 套核心设定方向。",
  },
  "agent.collab.option.produce.2": {
    vi: "Bạn bổ sung một câu về nhân vật chính, xung đột và mục tiêu, rồi mình sẽ chốt thành thiết lập có thể triển khai.",
    en: "Give me one line about the protagonist, conflict, and goal, and I will turn it into an executable setup.",
    zh: "你补一句主角、冲突和目标，我帮你收敛成可执行设定。",
  },
  "agent.collab.option.produce.3": {
    vi: "Nếu bạn đã chốt hướng, có thể nói luôn là muốn khởi động sản xuất toàn truyện ngay.",
    en: "If you already know the direction, you can tell me to start full-book production right away.",
    zh: "如果你已经想清楚，也可以直接说“现在启动整本生产”。",
  },
  "agent.collab.option.write.1": {
    vi: "Mình phân tích trước xem vấn đề nằm ở diễn biến, nhân vật hay nhịp chương.",
    en: "I can diagnose first whether the issue is plot, character, or pacing.",
    zh: "我先帮你判断这一章的问题出在情节、人物还是节奏。",
  },
  "agent.collab.option.write.2": {
    vi: "Bạn nói mục tiêu của chương và phần muốn giữ lại, mình sẽ đề xuất phương án viết lại.",
    en: "Tell me the chapter goal and what you want to keep, and I will propose a rewrite plan.",
    zh: "你告诉我这章的目标和想保留的部分，我给你重写方案。",
  },
  "agent.collab.option.write.3": {
    vi: "Nếu đã rõ phạm vi, bạn có thể nói thẳng muốn sửa chương nào và theo hướng nào.",
    en: "If the scope is already clear, you can say which chapter to revise and in what direction.",
    zh: "如果你已经确定范围，也可以直接说要改哪一章、往哪个方向改。",
  },
  "agent.collab.option.ideate.1": {
    vi: "Mình đưa trước 3 phương án thiết lập cốt lõi.",
    en: "I can give you three core setup options first.",
    zh: "先给你 3 套核心设定备选。",
  },
  "agent.collab.option.ideate.2": {
    vi: "Mình đưa trước 3 hướng lời hứa câu chuyện và điểm bán.",
    en: "I can give you three story-promise and hook directions first.",
    zh: "先给你 3 套故事承诺和卖点方向。",
  },
  "agent.collab.option.ideate.3": {
    vi: "Mình đưa trước 3 tổ hợp thể loại, phong cách và cấu hình tự sự.",
    en: "I can give you three genre, style, and narrative-configuration mixes first.",
    zh: "先给你 3 套题材风格与叙事配置组合。",
  },
  "agent.collab.option.default.1": {
    vi: "Mình tách rõ vấn đề này trước.",
    en: "I can break this problem down first.",
    zh: "我先帮你拆清楚这个问题。",
  },
  "agent.collab.option.default.2": {
    vi: "Mình đề xuất vài hướng khả thi trước.",
    en: "I can offer a few viable directions first.",
    zh: "我先给你几个可选方向。",
  },
  "agent.collab.option.default.3": {
    vi: "Bạn bổ sung giúp mình ràng buộc quan trọng nhất, rồi mình đẩy tiếp.",
    en: "Give me the most important constraint, and I will continue from there.",
    zh: "你补充最关键的限制条件，我再继续推进。",
  },
  "agent.collab.lead.general": {
    vi: "Mình chưa coi đây là lệnh thực thi ngay; trước tiên mình muốn làm rõ cùng bạn: {{goal}}",
    en: "I am not treating this as an execution command yet. First I want to clarify it with you: {{goal}}",
    zh: "我先不把它当成命令执行，先和你一起把问题说清楚：{{goal}}",
  },
  "agent.collab.lead.intent": {
    vi: "Mình hiểu lúc này bạn muốn đẩy tiếp phần này: {{goal}}",
    en: "My understanding is that you want to move this forward now: {{goal}}",
    zh: "我理解你现在想推进的是：{{goal}}",
  },
  "agent.collab.mode.review": {
    vi: "Vòng này phù hợp để chẩn đoán và phán đoán trước.",
    en: "This round is better suited for diagnosis and judgment first.",
    zh: "这轮更适合先一起诊断和判断。",
  },
  "agent.collab.mode.cocreate": {
    vi: "Vòng này phù hợp để cùng làm rõ trước rồi mới quyết định có chuyển sang thực thi hay không.",
    en: "This round is better suited for co-creation and clarification before deciding whether to execute.",
    zh: "这轮更适合先共创澄清，再决定是否进入执行。",
  },
  "agent.collab.missing.offer_options": {
    vi: "Trước khi đi tiếp, mình cần bổ sung các điểm này: {{missingInfo}}.\n",
    en: "Before we continue, I need these points filled in: {{missingInfo}}.\n",
    zh: "在继续之前，我还想补齐这几个点：{{missingInfo}}。\n",
  },
  "agent.collab.choose_direction": {
    vi: "Bạn có thể chọn một hướng để tiếp tục:\n{{options}}",
    en: "You can choose one direction to continue:\n{{options}}",
    zh: "你可以直接选一个方向继续：\n{{options}}",
  },
  "agent.collab.missing.default": {
    vi: "Trước khi đi tiếp, mình còn thiếu các thông tin quan trọng này: {{missingInfo}}.",
    en: "Before we continue, I am still missing these critical details: {{missingInfo}}.",
    zh: "在继续之前，我还缺这几个关键信息：{{missingInfo}}。",
  },
  "agent.social.with_novel": {
    vi: "Xin chào. Mình có thể tiếp tục cùng bạn làm kỹ phần thiết lập, dàn ý, nhân vật, chương truyện, hoặc chẩn đoán điểm đang vướng. Bạn muốn đẩy phần nào trước?",
    en: "Hello. I can keep working with you on the setup, outline, characters, chapters, or diagnose the current blocker. Which part do you want to move first?",
    zh: "你好。我可以继续陪你打磨这本书的设定、大纲、人物、章节，或者先帮你判断当前卡点。你现在想先推进哪一块？",
  },
  "agent.social.default": {
    vi: "Xin chào. Mình có thể cùng bạn làm phần thiết lập, dàn ý, nhân vật, chương truyện, hoặc chẩn đoán điểm đang vướng. Bạn muốn đẩy phần nào trước?",
    en: "Hello. I can work with you on the setup, outline, characters, chapters, or diagnose the current blocker. Which part do you want to move first?",
    zh: "你好。我可以帮你一起打磨设定、大纲、人物、章节，或者帮你诊断当前卡点。你现在想先推进哪一块？",
  },
  "agent.list.novels.empty": {
    vi: "Hiện chưa có tiểu thuyết nào.",
    en: "There are no novels yet.",
    zh: "当前还没有小说。",
  },
  "agent.list.novels.untitled": {
    vi: "Tiểu thuyết chưa đặt tên",
    en: "Untitled novel",
    zh: "未命名小说",
  },
  "agent.list.novels.item.with_count": {
    vi: "{{index}}. \"{{title}}\" ({{chapterCount}} chương)",
    en: "{{index}}. \"{{title}}\" ({{chapterCount}} chapters)",
    zh: "{{index}}. 《{{title}}》 （{{chapterCount}}章）",
  },
  "agent.list.novels.item.without_count": {
    vi: "{{index}}. \"{{title}}\"",
    en: "{{index}}. \"{{title}}\"",
    zh: "{{index}}. 《{{title}}》",
  },
  "agent.list.novels.summary": {
    vi: "Hiện có {{total}} tiểu thuyết:\n{{lines}}",
    en: "There are {{total}} novels right now:\n{{lines}}",
    zh: "当前共有 {{total}} 本小说：\n{{lines}}",
  },
  "agent.list.base_characters.empty": {
    vi: "Kho nhân vật nền hiện vẫn trống.",
    en: "The base character library is still empty.",
    zh: "当前基础角色库还是空的。",
  },
  "agent.list.base_characters.unnamed": {
    vi: "Nhân vật chưa đặt tên",
    en: "Unnamed character",
    zh: "未命名角色",
  },
  "agent.list.base_characters.item.with_suffix": {
    vi: "{{index}}. {{name}} ({{suffix}})",
    en: "{{index}}. {{name}} ({{suffix}})",
    zh: "{{index}}. {{name}}（{{suffix}}）",
  },
  "agent.list.base_characters.item.without_suffix": {
    vi: "{{index}}. {{name}}",
    en: "{{index}}. {{name}}",
    zh: "{{index}}. {{name}}",
  },
  "agent.list.base_characters.summary": {
    vi: "Kho nhân vật nền hiện có {{count}} mẫu nhân vật:\n{{lines}}",
    en: "The base character library currently has {{count}} character templates:\n{{lines}}",
    zh: "当前基础角色库共有 {{count}} 个角色模板：\n{{lines}}",
  },
  "agent.list.worlds.empty": {
    vi: "Hiện chưa có thế giới quan nào.",
    en: "There are no world settings yet.",
    zh: "当前还没有世界观。",
  },
  "agent.list.worlds.unnamed": {
    vi: "Thế giới quan chưa đặt tên",
    en: "Unnamed world setting",
    zh: "未命名世界观",
  },
  "agent.list.worlds.item.with_status": {
    vi: "{{index}}. {{name}} ({{status}})",
    en: "{{index}}. {{name}} ({{status}})",
    zh: "{{index}}. {{name}}（{{status}}）",
  },
  "agent.list.worlds.item.without_status": {
    vi: "{{index}}. {{name}}",
    en: "{{index}}. {{name}}",
    zh: "{{index}}. {{name}}",
  },
  "agent.list.worlds.summary": {
    vi: "Hiện có {{count}} thế giới quan:\n{{lines}}",
    en: "There are {{count}} world settings right now:\n{{lines}}",
    zh: "当前共有 {{count}} 个世界观：\n{{lines}}",
  },
  "agent.list.tasks.empty": {
    vi: "Hiện không có tác vụ hệ thống nào.",
    en: "There are no system tasks right now.",
    zh: "当前没有系统任务。",
  },
  "agent.list.tasks.unnamed": {
    vi: "Tác vụ chưa đặt tên",
    en: "Unnamed task",
    zh: "未命名任务",
  },
  "agent.list.tasks.item.with_kind": {
    vi: "{{index}}. {{title}} ({{kind}}) - {{status}}",
    en: "{{index}}. {{title}} ({{kind}}) - {{status}}",
    zh: "{{index}}. {{title}}（{{kind}}） - {{status}}",
  },
  "agent.list.tasks.item.without_kind": {
    vi: "{{index}}. {{title}} - {{status}}",
    en: "{{index}}. {{title}} - {{status}}",
    zh: "{{index}}. {{title}} - {{status}}",
  },
  "agent.list.tasks.summary": {
    vi: "Hiện có {{count}} tác vụ hệ thống:\n{{lines}}",
    en: "There are {{count}} system tasks right now:\n{{lines}}",
    zh: "当前共有 {{count}} 个系统任务：\n{{lines}}",
  },
  "agent.bind_world.bound": {
    vi: "Đã gắn thế giới quan \"{{worldName}}\" vào tiểu thuyết \"{{novelTitle}}\".",
    en: "Bound the world setting \"{{worldName}}\" to the novel \"{{novelTitle}}\".",
    zh: "已将世界观《{{worldName}}》绑定到小说《{{novelTitle}}》。",
  },
  "agent.bind_world.completed": {
    vi: "Đã hoàn tất gắn thế giới quan.",
    en: "World binding completed.",
    zh: "已完成世界观绑定。",
  },
  "agent.bind_world.no_context": {
    vi: "Hiện không có ngữ cảnh tiểu thuyết để gắn thế giới quan.",
    en: "There is no current novel context to bind a world setting.",
    zh: "没有当前小说上下文，无法设置世界观。",
  },
  "agent.bind_world.not_found": {
    vi: "Không tìm thấy thế giới quan cần gắn.",
    en: "The world setting to bind could not be found.",
    zh: "未找到要绑定的世界观。",
  },
  "agent.bind_world.incomplete": {
    vi: "Chưa hoàn tất gắn thế giới quan.",
    en: "World binding did not complete.",
    zh: "未完成世界观绑定。",
  },
  "agent.unbind_world.unbound": {
    vi: "Đã gỡ thế giới quan \"{{worldName}}\" khỏi tiểu thuyết \"{{novelTitle}}\".",
    en: "Unbound the world setting \"{{worldName}}\" from the novel \"{{novelTitle}}\".",
    zh: "已将世界观《{{worldName}}》从小说《{{novelTitle}}》解绑。",
  },
  "agent.unbind_world.updated": {
    vi: "Đã cập nhật trạng thái gắn thế giới quan của tiểu thuyết \"{{novelTitle}}\".",
    en: "Updated the world-binding state for the novel \"{{novelTitle}}\".",
    zh: "已更新小说《{{novelTitle}}》的世界观绑定状态。",
  },
  "agent.unbind_world.completed": {
    vi: "Đã hoàn tất gỡ thế giới quan.",
    en: "World unbinding completed.",
    zh: "已完成世界观解绑。",
  },
  "agent.unbind_world.no_context": {
    vi: "Hiện không có ngữ cảnh tiểu thuyết để gỡ thế giới quan.",
    en: "There is no current novel context to unbind a world setting.",
    zh: "没有当前小说上下文，无法解除世界观绑定。",
  },
  "agent.unbind_world.incomplete": {
    vi: "Chưa hoàn tất gỡ thế giới quan.",
    en: "World unbinding did not complete.",
    zh: "未完成世界观解绑。",
  },
  "agent.progress.completed.with_total": {
    vi: "Hiện đã hoàn tất {{completedChapterCount}} / {{chapterCount}} chương.",
    en: "{{completedChapterCount}} / {{chapterCount}} chapters are complete.",
    zh: "当前已完成 {{completedChapterCount}} / {{chapterCount}} 章。",
  },
  "agent.progress.completed.without_total": {
    vi: "Hiện đã hoàn tất {{completedChapterCount}} chương.",
    en: "{{completedChapterCount}} chapters are complete.",
    zh: "当前已完成 {{completedChapterCount}} 章。",
  },
  "agent.progress.latest_completed": {
    vi: "Gần nhất đã hoàn tất tới chương {{chapterOrder}}.",
    en: "The latest completed chapter is chapter {{chapterOrder}}.",
    zh: "最近完成到第{{chapterOrder}}章。",
  },
  "agent.progress.none_written": {
    vi: "Hiện chưa phát hiện chương nào đã có nội dung chính văn.",
    en: "No written chapter body has been detected yet.",
    zh: "当前还没有检测到已写入正文的章节。",
  },
  "agent.character.status_missing": {
    vi: "Chưa lấy được trạng thái nhân vật.",
    en: "Character status is unavailable.",
    zh: "未获取到角色状态信息",
  },
  "agent.character.none_planned": {
    vi: "Tiểu thuyết hiện chưa có nhân vật nào đã quy hoạch.",
    en: "The current novel does not have planned characters yet.",
    zh: "当前小说还没有已规划角色。",
  },
  "agent.character.unnamed": {
    vi: "Nhân vật chưa đặt tên",
    en: "Unnamed character",
    zh: "未命名角色",
  },
  "agent.character.item.with_role": {
    vi: "{{index}}. {{name}} ({{role}})",
    en: "{{index}}. {{name}} ({{role}})",
    zh: "{{index}}. {{name}}（{{role}}）",
  },
  "agent.character.item.without_role": {
    vi: "{{index}}. {{name}}",
    en: "{{index}}. {{name}}",
    zh: "{{index}}. {{name}}",
  },
  "agent.character.summary": {
    vi: "Tiểu thuyết hiện đã quy hoạch {{count}} nhân vật:\n{{lines}}",
    en: "The current novel has {{count}} planned characters:\n{{lines}}",
    zh: "当前小说已规划 {{count}} 个角色：\n{{lines}}",
  },
  "agent.chapter.empty_body": {
    vi: "Nội dung chương đang trống.",
    en: "The chapter body is empty.",
    zh: "正文为空",
  },
  "agent.chapter.item.with_title": {
    vi: "Chương {{order}} \"{{title}}\": {{content}}",
    en: "Chapter {{order}} \"{{title}}\": {{content}}",
    zh: "第{{order}}章《{{title}}》：{{content}}",
  },
  "agent.chapter.item.without_title": {
    vi: "Chương {{order}}: {{content}}",
    en: "Chapter {{order}}: {{content}}",
    zh: "第{{order}}章：{{content}}",
  },
  "agent.write.preview.single": {
    vi: "Đã hoàn tất bản xem trước thực thi cho chương {{startOrder}} và hiện đang chờ duyệt.",
    en: "The execution preview for chapter {{startOrder}} is complete and waiting for approval.",
    zh: "已完成第{{startOrder}}章执行预览，当前等待审批。",
  },
  "agent.write.preview.range": {
    vi: "Đã hoàn tất bản xem trước thực thi từ chương {{startOrder}} đến chương {{endOrder}} và hiện đang chờ duyệt.",
    en: "The execution preview from chapter {{startOrder}} to chapter {{endOrder}} is complete and waiting for approval.",
    zh: "已完成第{{startOrder}}到第{{endOrder}}章执行预览，当前等待审批。",
  },
  "agent.write.task_scope.single": {
    vi: "chương {{startOrder}}",
    en: "chapter {{startOrder}}",
    zh: "第{{startOrder}}章",
  },
  "agent.write.task_scope.range": {
    vi: "từ chương {{startOrder}} đến chương {{endOrder}}",
    en: "chapters {{startOrder}} to {{endOrder}}",
    zh: "第{{startOrder}}到第{{endOrder}}章",
  },
  "agent.write.task_created.with_job": {
    vi: "Đã tạo tác vụ viết cho {{scope}}{{jobSuffix}}.",
    en: "Created a writing task for {{scope}}{{jobSuffix}}.",
    zh: "已创建 {{scope}} 的写作任务{{jobSuffix}}。",
  },
  "agent.write.task_created.without_job": {
    vi: "Đã tạo tác vụ viết cho {{scope}}.",
    en: "Created a writing task for {{scope}}.",
    zh: "已创建 {{scope}} 的写作任务。",
  },
  "agent.failure.none": {
    vi: "Hiện chưa có thông tin chẩn đoán lỗi khả dụng.",
    en: "There is no usable failure diagnosis right now.",
    zh: "当前没有可用的失败诊断信息",
  },
  "agent.failure.detail": {
    vi: "Chi tiết: {{detail}}",
    en: "Details: {{detail}}",
    zh: "详情：{{detail}}",
  },
  "agent.failure.recovery": {
    vi: "Gợi ý: {{recoveryHint}}",
    en: "Suggestion: {{recoveryHint}}",
    zh: "建议：{{recoveryHint}}",
  },
  "agent.failure.last_failed_step": {
    vi: "Bước lỗi gần nhất: {{lastFailedStep}}",
    en: "Last failed step: {{lastFailedStep}}",
    zh: "失败步骤：{{lastFailedStep}}",
  },
  "production.world.generated_name": {
    vi: "Thế giới quan của {{title}}",
    en: "{{title}} World",
    zh: "{{title}}世界观",
  },
  "agent.setup.fact.label_value": {
    vi: "{{label}}: {{value}}",
    en: "{{label}}: {{value}}",
    zh: "{{label}}：{{value}}",
  },
  "agent.setup.stage.ready_for_production": {
    vi: "Đã đủ nền tảng để khởi động sản xuất toàn truyện",
    en: "Ready to start full-book production",
    zh: "已具备启动整本生产的基础",
  },
  "agent.setup.stage.ready_for_planning": {
    vi: "Đã đủ nền tảng để vào giai đoạn lập dàn ý",
    en: "Ready to enter outline planning",
    zh: "已具备进入大纲规划的基础",
  },
  "agent.setup.stage.initializing": {
    vi: "Vẫn đang ở giai đoạn khởi tạo",
    en: "Still in the initialization stage",
    zh: "仍在初始化阶段",
  },
  "agent.setup.common.none": {
    vi: "Chưa có",
    en: "None yet",
    zh: "暂无",
  },
  "agent.setup.fact.title": {
    vi: "Tiêu đề tiểu thuyết",
    en: "Novel title",
    zh: "小说标题",
  },
  "agent.setup.fact.current_stage": {
    vi: "Giai đoạn hiện tại",
    en: "Current stage",
    zh: "当前阶段",
  },
  "agent.setup.fact.progress": {
    vi: "Tiến độ",
    en: "Progress",
    zh: "完成度",
  },
  "agent.setup.fact.progress_value": {
    vi: "{{completedCount}}/{{totalCount}} ({{completionRatio}}%)",
    en: "{{completedCount}}/{{totalCount}} ({{completionRatio}}%)",
    zh: "{{completedCount}}/{{totalCount}}（{{completionRatio}}%）",
  },
  "agent.setup.fact.missing_items": {
    vi: "Mục còn thiếu",
    en: "Missing items",
    zh: "待补项目",
  },
  "agent.setup.fact.priority_item": {
    vi: "Ưu tiên bổ sung",
    en: "Priority item",
    zh: "优先补充",
  },
  "agent.setup.fact.next_question": {
    vi: "Câu hỏi hệ thống gợi ý",
    en: "Suggested system question",
    zh: "系统建议提问",
  },
  "agent.setup.fact.recommended_action": {
    vi: "Hành động hệ thống gợi ý",
    en: "Suggested system action",
    zh: "系统建议动作",
  },
  "agent.setup.fact.current_value": {
    vi: "Thông tin hiện có của mục này",
    en: "Current value for this item",
    zh: "该项当前已有信息",
  },
  "agent.setup.guidance.current_status": {
    vi: "Trạng thái hiện tại: {{stageLabel}} ({{completedCount}}/{{totalCount}} mục đã sẵn sàng).",
    en: "Current status: {{stageLabel}} ({{completedCount}}/{{totalCount}} items ready).",
    zh: "当前状态：{{stageLabel}}（{{completedCount}}/{{totalCount}} 项已就绪）。",
  },
  "agent.setup.guidance.remaining_items": {
    vi: "Tiếp theo vẫn cần bổ sung {{missingItems}}{{moreSuffix}}.",
    en: "Next, you still need to complete {{missingItems}}{{moreSuffix}}.",
    zh: "接下来还需要补齐 {{missingItems}}{{moreSuffix}}。",
  },
  "agent.setup.guidance.remaining_items_more_suffix": {
    vi: " và các mục khác",
    en: " and more",
    zh: " 等",
  },
  "agent.setup.guidance.discuss_question": {
    vi: "Mình bắt đầu từ câu này nhé: {{question}}",
    en: "Let's start with this question: {{question}}",
    zh: "我们先聊这个：{{question}}",
  },
  "agent.setup.guidance.offer_options": {
    vi: "Nếu bạn chưa chốt, mình cũng có thể đưa trước vài hướng để chọn.",
    en: "If you have not decided yet, I can also offer a few directions first.",
    zh: "如果你暂时没想好，我也可以先给你几组备选方向。",
  },
  "agent.setup.intent.none": {
    vi: "Hiện chưa có thêm manh mối sáng tác có cấu trúc nào.",
    en: "There are no additional structured creative clues yet.",
    zh: "当前没有额外的结构化创作线索。",
  },
  "agent.setup.intent.title_known": {
    vi: "Người dùng đã nhắc tới tiêu đề: {{value}}",
    en: "The user already mentioned a title: {{value}}",
    zh: "用户已提到标题：{{value}}",
  },
  "agent.setup.intent.title_missing": {
    vi: "Người dùng vẫn chưa chốt tiêu đề.",
    en: "The user has not settled on a title yet.",
    zh: "用户还没有明确标题。",
  },
  "agent.setup.intent.genre_known": {
    vi: "Thể loại người dùng nhắc tới: {{value}}",
    en: "Genre mentioned by the user: {{value}}",
    zh: "用户提到的题材：{{value}}",
  },
  "agent.setup.intent.description_known": {
    vi: "Thiết lập người dùng nhắc tới: {{value}}",
    en: "Setup mentioned by the user: {{value}}",
    zh: "用户提到的设定：{{value}}",
  },
  "agent.setup.intent.style_known": {
    vi: "Phong cách người dùng nhắc tới: {{value}}",
    en: "Style mentioned by the user: {{value}}",
    zh: "用户提到的风格：{{value}}",
  },
  "agent.setup.fallback.missing_title.produce": {
    vi: "Được, mình chốt điểm xuất phát của cuốn này trước. Bạn muốn đặt một tiêu đề tạm, hay nói luôn về thể loại, nhân vật chính và xung đột trung tâm?",
    en: "Okay. Let's lock the starting point for this book first. Do you want to set a temporary title, or tell me the genre, protagonist, and central conflict first?",
    zh: "可以，我们先把这本书的起点定下来。你想先给它一个暂定标题，还是先说说题材、主角和核心冲突？",
  },
  "agent.setup.fallback.missing_title.create": {
    vi: "Được, mình dựng khung ban đầu cho cuốn này trước. Bạn muốn đặt một tiêu đề tạm, hay nói luôn bạn muốn viết thể loại gì và ai là nhân vật chính?",
    en: "Okay. Let's shape the initial frame of this book first. Do you want to set a temporary title, or tell me the genre and protagonist first?",
    zh: "可以，我们先把这本书的雏形定下来。你想先给它一个暂定标题，还是先告诉我你想写什么类型、谁是主角？",
  },
  "agent.setup.prompt.scene.create_missing_title": {
    vi: "Người dùng vừa bày tỏ muốn viết một cuốn tiểu thuyết, nhưng vẫn chưa hình thành được tiêu đề có thể dùng để tạo.",
    en: "The user just expressed the intent to write a novel, but there is no usable title yet.",
    zh: "用户刚表达想写一本小说，但还没有形成可创建的标题。",
  },
  "agent.setup.prompt.scene.produce_missing_title": {
    vi: "Người dùng muốn bắt đầu sản xuất toàn truyện ngay, nhưng hiện chưa có tiêu đề khả dụng hoặc ngữ cảnh tiểu thuyết hiện tại.",
    en: "The user wants to start full-book production immediately, but there is no usable title or current novel context.",
    zh: "用户想直接开始整本生产，但当前没有可用的小说标题或小说上下文。",
  },
  "agent.setup.prompt.scene.create_setup": {
    vi: "Tiểu thuyết đã được tạo thành công. Bây giờ cần tiếp tục dẫn dắt giai đoạn mở truyện.",
    en: "The novel has been created successfully. Continue the opening setup guidance.",
    zh: "小说已经创建成功，现在要继续做开书初始化引导。",
  },
  "agent.setup.prompt.scene.select_setup": {
    vi: "Người dùng vừa chuyển lại vào workspace của một tiểu thuyết và cần tiếp tục phần khởi tạo còn dang dở.",
    en: "The user just switched back into a novel workspace and needs to continue the unfinished setup.",
    zh: "用户刚切换回一部小说的工作区，需要继续未完成的初始化。",
  },
  "agent.setup.facts.no_created_novel": {
    vi: "Hiện vẫn chưa tạo thành công tiểu thuyết nào, và cũng chưa có tiêu đề ổn định.",
    en: "No novel has been created successfully yet, and there is no stable title.",
    zh: "当前还没有创建成功的小说，也没有稳定的小说标题。",
  },
  "agent.setup.facts.no_novel_context": {
    vi: "Hiện không có ngữ cảnh tiểu thuyết khả dụng.",
    en: "There is no usable novel context right now.",
    zh: "当前没有可用的小说上下文。",
  },
  "agent.setup.facts.title_clue": {
    vi: "Manh mối tiêu đề hiện có: {{value}}",
    en: "Current title clue: {{value}}",
    zh: "当前已有标题线索：{{value}}",
  },
  "agent.setup.facts.no_reliable_title": {
    vi: "Hiện vẫn chưa có tiêu đề đủ tin cậy.",
    en: "There is no reliable title yet.",
    zh: "当前还没有可靠标题。",
  },
  "agent.setup.guidance.create_prefix": {
    vi: "Đã tạo tiểu thuyết \"{{title}}\". Giờ mình bổ sung nốt các thiết lập quan trọng nhất.",
    en: "The novel \"{{title}}\" has been created. Now let's fill in the most important setup pieces.",
    zh: "已创建小说《{{title}}》，我们先把最关键的设定补齐。",
  },
  "agent.setup.guidance.select_prefix": {
    vi: "Đã chuyển vào workspace của \"{{title}}\". Mình tiếp tục hoàn thiện phần thiết lập còn thiếu.",
    en: "Switched into the workspace for \"{{title}}\". Let's continue filling in the missing setup.",
    zh: "已切换到小说《{{title}}》的工作区，我们继续把设定补完整。",
  },
  "agent.setup.result.created_titled": {
    vi: "Đã tạo tiểu thuyết \"{{title}}\".",
    en: "Created the novel \"{{title}}\".",
    zh: "已创建小说《{{title}}》。",
  },
  "agent.setup.result.created_generic": {
    vi: "Đã tạo tiểu thuyết.",
    en: "Novel created.",
    zh: "已创建小说。",
  },
  "agent.setup.result.select_prompt": {
    vi: "Bạn nói mình biết muốn chuyển sang cuốn nào, mình sẽ nối tiếp phần thiết lập của nó.",
    en: "Tell me which novel you want to switch to, and I will continue its setup from there.",
    zh: "告诉我你想切到哪本小说，我就继续接着它的设定往下推进。",
  },
  "agent.setup.result.switched_titled": {
    vi: "Đã chuyển workspace hiện tại sang \"{{title}}\".",
    en: "Switched the current workspace to \"{{title}}\".",
    zh: "已将当前工作区切换到《{{title}}》。",
  },
  "agent.setup.result.switched_generic": {
    vi: "Đã chuyển workspace hiện tại.",
    en: "Current workspace switched.",
    zh: "已切换当前工作区。",
  },
  "agent.ideation.no_facts": {
    vi: "Hiện chưa có ngữ cảnh tiểu thuyết nào khả dụng.",
    en: "There is no usable novel context yet.",
    zh: "当前还没有可用的小说上下文事实。",
  },
  "agent.ideation.fallback.with_title": {
    vi: "Mình có thể dựng ngay vài phương án quanh \"{{title}}\", nhưng để bám sát hướng bạn muốn hơn, bạn nên cho mình biết một yếu tố cốt lõi muốn giữ lại, như thể loại, thân phận nhân vật chính, hoặc xung đột bạn muốn viết nhất.",
    en: "I can draft a few options around \"{{title}}\" right away, but to aim closer to your intent, tell me one core element you want to preserve, such as the genre, the protagonist identity, or the conflict you most want to write.",
    zh: "我可以直接围绕《{{title}}》给你做几套备选，不过为了更贴近你要的方向，最好再告诉我你最想保留的一个核心元素，比如题材、主角身份，或者最想写的冲突。",
  },
  "agent.ideation.fallback.without_title": {
    vi: "Mình có thể dựng ngay vài phương án, nhưng bạn hãy cho mình ít nhất một điểm neo: tiêu đề tạm, thể loại, hoặc một xung đột bạn muốn viết nhất.",
    en: "I can draft a few options right away, but give me at least one anchor first: a temporary title, a genre, or a conflict you most want to write.",
    zh: "我可以直接给你做几套备选，不过先告诉我这本书至少要保留什么：暂定标题、题材，或者一个你最想写的冲突点。",
  },
  "agent.ideation.label.novel_title": {
    vi: "Tiêu đề hiện có",
    en: "Current title",
    zh: "小说标题",
  },
  "agent.ideation.label.novel_description": {
    vi: "Tóm tắt hiện có",
    en: "Current description",
    zh: "已有简介",
  },
  "agent.ideation.label.novel_genre": {
    vi: "Thể loại",
    en: "Genre",
    zh: "题材",
  },
  "agent.ideation.label.novel_style_tone": {
    vi: "Phong cách và khí chất",
    en: "Style and tone",
    zh: "风格气质",
  },
  "agent.ideation.label.novel_narrative_pov": {
    vi: "Ngôi kể",
    en: "Narrative POV",
    zh: "叙事视角",
  },
  "agent.ideation.label.novel_pace_preference": {
    vi: "Nhịp độ mong muốn",
    en: "Preferred pace",
    zh: "推进节奏",
  },
  "agent.ideation.label.novel_project_mode": {
    vi: "Chế độ cộng tác",
    en: "Project mode",
    zh: "协作模式",
  },
  "agent.ideation.label.novel_emotion_intensity": {
    vi: "Cường độ cảm xúc",
    en: "Emotion intensity",
    zh: "情绪强度",
  },
  "agent.ideation.label.novel_ai_freedom": {
    vi: "Mức tự do của AI",
    en: "AI freedom",
    zh: "AI 自由度",
  },
  "agent.ideation.label.novel_default_chapter_length": {
    vi: "Độ dài chương mặc định",
    en: "Default chapter length",
    zh: "默认章长",
  },
  "agent.ideation.label.novel_world_name": {
    vi: "Thế giới quan đã gắn",
    en: "Bound world setting",
    zh: "绑定世界观",
  },
  "agent.ideation.label.novel_outline": {
    vi: "Dàn ý hiện có",
    en: "Existing outline",
    zh: "已有大纲",
  },
  "agent.ideation.label.novel_structured_outline": {
    vi: "Dàn ý có cấu trúc",
    en: "Structured outline",
    zh: "结构化大纲",
  },
  "agent.ideation.label.novel_chapter_count": {
    vi: "Số chương",
    en: "Chapter count",
    zh: "章节数",
  },
  "agent.ideation.label.novel_completed_chapter_count": {
    vi: "Số chương đã hoàn tất",
    en: "Completed chapter count",
    zh: "已完成章节数",
  },
  "agent.ideation.label.bible_core_setting": {
    vi: "Bản nháp thiết lập cốt lõi",
    en: "Core setting draft",
    zh: "核心设定草稿",
  },
  "agent.ideation.label.bible_main_promise": {
    vi: "Lời hứa câu chuyện",
    en: "Story promise",
    zh: "故事承诺",
  },
  "agent.ideation.label.bible_character_arcs": {
    vi: "Cung phát triển nhân vật",
    en: "Character arcs",
    zh: "角色弧线",
  },
  "agent.ideation.label.bible_world_rules": {
    vi: "Luật thế giới",
    en: "World rules",
    zh: "世界规则",
  },
  "agent.ideation.label.bible_forbidden_rules": {
    vi: "Quy tắc cấm",
    en: "Forbidden rules",
    zh: "禁用规则",
  },
  "agent.ideation.label.world_name": {
    vi: "Tên thế giới quan",
    en: "World name",
    zh: "世界观名称",
  },
  "agent.ideation.label.world_axioms": {
    vi: "Tiên đề thế giới",
    en: "World axioms",
    zh: "世界公理",
  },
  "agent.ideation.label.world_magic_system": {
    vi: "Hệ sức mạnh",
    en: "Power system",
    zh: "力量体系",
  },
  "agent.ideation.label.world_conflicts": {
    vi: "Bối cảnh xung đột cốt lõi",
    en: "Core conflict environment",
    zh: "核心冲突环境",
  },
  "agent.ideation.label.world_consistency_report": {
    vi: "Ghi chú nhất quán",
    en: "Consistency notes",
    zh: "一致性备注",
  },
  "agent.ideation.label.knowledge_hit_count": {
    vi: "Số lần khớp tri thức",
    en: "Knowledge hit count",
    zh: "知识库命中数",
  },
  "agent.ideation.label.knowledge_context_block": {
    vi: "Ngữ cảnh từ kho tri thức",
    en: "Knowledge context",
    zh: "知识库上下文",
  },
  "agent.ideation.label.intent_title": {
    vi: "Tiêu đề người dùng nêu rõ",
    en: "Explicit user title",
    zh: "用户显式标题",
  },
  "agent.ideation.label.intent_genre": {
    vi: "Thể loại người dùng nêu rõ",
    en: "Explicit user genre",
    zh: "用户显式题材",
  },
  "agent.ideation.label.intent_description": {
    vi: "Thiết lập người dùng nêu rõ",
    en: "Explicit user setup",
    zh: "用户显式设定",
  },
  "agent.ideation.label.intent_style": {
    vi: "Phong cách người dùng nêu rõ",
    en: "Explicit user style",
    zh: "用户显式风格",
  },
  "agent.runtime.summary.list_novels": {
    vi: "Đã đọc {{count}} tiểu thuyết.",
    en: "Read {{count}} novels.",
    zh: "已读取 {{count}} 本小说。",
  },
  "agent.runtime.summary.create_novel.ready": {
    vi: "Đã tạo tiểu thuyết \"{{title}}\" và hoàn tất khởi tạo.",
    en: "Created the novel \"{{title}}\" and completed setup.",
    zh: "已创建小说《{{title}}》，初始化已完成。",
  },
  "agent.runtime.summary.create_novel.setup": {
    vi: "Đã tạo tiểu thuyết \"{{title}}\" và chuyển sang hướng dẫn khởi tạo.",
    en: "Created the novel \"{{title}}\" and entered setup guidance.",
    zh: "已创建小说《{{title}}》，并进入初始化引导。",
  },
  "agent.runtime.summary.create_novel.generic": {
    vi: "Đã tạo tiểu thuyết.",
    en: "Novel created.",
    zh: "已创建小说。",
  },
  "agent.runtime.summary.select_workspace.setup": {
    vi: "Đã chuyển sang tiểu thuyết \"{{title}}\" và tiếp tục khởi tạo.",
    en: "Switched to the novel \"{{title}}\" and continued setup.",
    zh: "已切换到小说《{{title}}》，当前继续初始化。",
  },
  "agent.runtime.summary.select_workspace.ready": {
    vi: "Đã chuyển sang tiểu thuyết \"{{title}}\".",
    en: "Switched to the novel \"{{title}}\".",
    zh: "已切换到小说《{{title}}》。",
  },
  "agent.runtime.summary.select_workspace.generic": {
    vi: "Đã chuyển sang tiểu thuyết mục tiêu.",
    en: "Switched to the target novel.",
    zh: "已切换到目标小说。",
  },
  "agent.runtime.summary.bind_world.with_novel": {
    vi: "Đã gắn thế giới quan \"{{worldName}}\" vào tiểu thuyết \"{{novelTitle}}\".",
    en: "Bound the world setting \"{{worldName}}\" to the novel \"{{novelTitle}}\".",
    zh: "已将世界观《{{worldName}}》绑定到小说《{{novelTitle}}》。",
  },
  "agent.runtime.summary.bind_world.with_world": {
    vi: "Đã gắn thế giới quan \"{{worldName}}\".",
    en: "Bound the world setting \"{{worldName}}\".",
    zh: "已绑定世界观《{{worldName}}》。",
  },
  "agent.runtime.summary.bind_world.generic": {
    vi: "Đã hoàn tất gắn thế giới quan.",
    en: "World binding completed.",
    zh: "已完成世界观绑定。",
  },
  "agent.runtime.summary.unbind_world.with_novel_and_world": {
    vi: "Đã gỡ thế giới quan \"{{worldName}}\" khỏi tiểu thuyết \"{{novelTitle}}\".",
    en: "Unbound the world setting \"{{worldName}}\" from the novel \"{{novelTitle}}\".",
    zh: "已将世界观《{{worldName}}》从小说《{{novelTitle}}》解绑。",
  },
  "agent.runtime.summary.unbind_world.no_world_bound": {
    vi: "Tiểu thuyết \"{{novelTitle}}\" hiện không gắn thế giới quan nào.",
    en: "The novel \"{{novelTitle}}\" does not currently have a bound world setting.",
    zh: "小说《{{novelTitle}}》当前没有绑定世界观。",
  },
  "agent.runtime.summary.unbind_world.generic": {
    vi: "Đã xử lý việc gỡ thế giới quan.",
    en: "Processed world unbinding.",
    zh: "已处理世界观解绑。",
  },
  "agent.runtime.summary.generate_world.named": {
    vi: "Đã tạo thế giới quan \"{{worldName}}\".",
    en: "Generated the world setting \"{{worldName}}\".",
    zh: "已生成世界观《{{worldName}}》。",
  },
  "agent.runtime.summary.generate_world.generic": {
    vi: "Đã tạo thế giới quan cho tiểu thuyết.",
    en: "Generated the novel world setting.",
    zh: "已生成小说世界观。",
  },
  "agent.runtime.summary.generate_characters": {
    vi: "Đã tạo {{count}} nhân vật cốt lõi.",
    en: "Generated {{count}} core characters.",
    zh: "已生成 {{count}} 个核心角色。",
  },
  "agent.runtime.summary.generate_story_bible": {
    vi: "Đã tạo kinh thánh tiểu thuyết.",
    en: "Generated the story bible.",
    zh: "已生成小说圣经。",
  },
  "agent.runtime.summary.generate_outline": {
    vi: "Đã tạo hướng phát triển cốt truyện.",
    en: "Generated the story direction.",
    zh: "已生成小说发展走向。",
  },
  "agent.runtime.summary.generate_structured_outline": {
    vi: "Đã tạo dàn ý có cấu trúc cho {{count}} chương.",
    en: "Generated a structured outline for {{count}} chapters.",
    zh: "已生成 {{count}} 章结构化大纲。",
  },
  "agent.runtime.summary.sync_chapters": {
    vi: "Đã đồng bộ {{count}} chương vào mục lục.",
    en: "Synced {{count}} chapters into the chapter list.",
    zh: "已同步 {{count}} 个章节目录。",
  },
  "agent.runtime.summary.tool_completed": {
    vi: "{{tool}} đã hoàn tất.",
    en: "{{tool}} completed.",
    zh: "{{tool}} 执行完成。",
  },
  "agent.runtime.summary.novel_context.with_chapters": {
    vi: "Đã đọc tổng quan tiểu thuyết \"{{title}}\" ({{chapterCount}} chương).",
    en: "Read the novel overview for \"{{title}}\" ({{chapterCount}} chapters).",
    zh: "已读取小说总览：《{{title}}》 （共 {{chapterCount}} 章）。",
  },
  "agent.runtime.summary.novel_context.with_title": {
    vi: "Đã đọc tổng quan tiểu thuyết \"{{title}}\".",
    en: "Read the novel overview for \"{{title}}\".",
    zh: "已读取小说总览：《{{title}}》。",
  },
  "agent.runtime.summary.novel_context.generic": {
    vi: "Đã đọc tổng quan tiểu thuyết.",
    en: "Read the novel overview.",
    zh: "已读取小说总览。",
  },
  "agent.runtime.summary.story_bible.exists": {
    vi: "Đã đọc kinh thánh tiểu thuyết.",
    en: "Read the story bible.",
    zh: "已读取小说圣经设定。",
  },
  "agent.runtime.summary.story_bible.missing": {
    vi: "Tiểu thuyết hiện chưa có kinh thánh đã lưu.",
    en: "The current novel does not have a saved story bible yet.",
    zh: "当前小说还没有已保存的小说圣经。",
  },
  "agent.runtime.summary.world_constraints.with_name": {
    vi: "Đã đọc ràng buộc thế giới quan: {{worldName}}.",
    en: "Read world constraints: {{worldName}}.",
    zh: "已读取世界观约束：{{worldName}}。",
  },
  "agent.runtime.summary.world_constraints.missing": {
    vi: "Tiểu thuyết hiện chưa gắn ràng buộc thế giới quan.",
    en: "The current novel does not have bound world constraints yet.",
    zh: "当前小说尚未绑定世界观约束。",
  },
  "agent.runtime.summary.list_chapters": {
    vi: "Đã đọc {{count}} mục chương.",
    en: "Read {{count}} chapter entries.",
    zh: "已读取 {{count}} 个章节元信息。",
  },
  "agent.runtime.summary.chapter.with_order_and_title": {
    vi: "Đã đọc chương {{order}} \"{{title}}\".",
    en: "Read chapter {{order}} \"{{title}}\".",
    zh: "已读取第{{order}}章《{{title}}》。",
  },
  "agent.runtime.summary.chapter.with_order": {
    vi: "Đã đọc chương {{order}}.",
    en: "Read chapter {{order}}.",
    zh: "已读取第{{order}}章。",
  },
  "agent.runtime.summary.chapter.generic": {
    vi: "Đã đọc nội dung chương.",
    en: "Read chapter content.",
    zh: "已读取章节内容。",
  },
  "agent.runtime.summary.summarize_range.with_bounds": {
    vi: "Đã tóm tắt từ chương {{startOrder}} đến chương {{endOrder}}.",
    en: "Summarized chapters {{startOrder}} to {{endOrder}}.",
    zh: "已总结第{{startOrder}}到第{{endOrder}}章。",
  },
  "agent.runtime.summary.summarize_range.generic": {
    vi: "Đã hoàn tất tóm tắt phạm vi chương.",
    en: "Completed the chapter-range summary.",
    zh: "已完成章节范围总结。",
  },
  "agent.runtime.summary.search_knowledge": {
    vi: "Đã khớp {{hitCount}} mẩu tri thức.",
    en: "Matched {{hitCount}} knowledge snippets.",
    zh: "命中 {{hitCount}} 条知识片段。",
  },
  "agent.runtime.summary.list_book_analyses": {
    vi: "Đã đọc {{count}} tác vụ phân tích sách.",
    en: "Read {{count}} book-analysis tasks.",
    zh: "已读取 {{count}} 个拆书任务。",
  },
  "agent.runtime.summary.book_analysis_detail.with_title": {
    vi: "Đã đọc chi tiết phân tích sách: {{title}}.",
    en: "Read the book-analysis detail: {{title}}.",
    zh: "已读取拆书详情：{{title}}。",
  },
  "agent.runtime.summary.book_analysis_detail.generic": {
    vi: "Đã đọc chi tiết phân tích sách.",
    en: "Read the book-analysis detail.",
    zh: "已读取拆书详情。",
  },
  "agent.runtime.summary.diagnosis.generic": {
    vi: "{{tool}} đã trả về thông tin chẩn đoán.",
    en: "{{tool}} returned diagnostic information.",
    zh: "{{tool}} 已返回诊断信息。",
  },
  "agent.runtime.summary.list_knowledge_documents": {
    vi: "Đã đọc {{count}} tài liệu tri thức.",
    en: "Read {{count}} knowledge documents.",
    zh: "已读取 {{count}} 个知识文档。",
  },
  "agent.runtime.summary.knowledge_document_detail.with_title": {
    vi: "Đã đọc tài liệu tri thức \"{{title}}\".",
    en: "Read the knowledge document \"{{title}}\".",
    zh: "已读取知识文档《{{title}}》。",
  },
  "agent.runtime.summary.knowledge_document_detail.generic": {
    vi: "Đã đọc chi tiết tài liệu tri thức.",
    en: "Read the knowledge document detail.",
    zh: "已读取知识文档详情。",
  },
  "agent.runtime.summary.list_worlds": {
    vi: "Đã đọc {{count}} thế giới quan.",
    en: "Read {{count}} world settings.",
    zh: "已读取 {{count}} 个世界观。",
  },
  "agent.runtime.summary.world_detail.with_name": {
    vi: "Đã đọc thế giới quan \"{{name}}\".",
    en: "Read the world setting \"{{name}}\".",
    zh: "已读取世界观《{{name}}》。",
  },
  "agent.runtime.summary.world_detail.generic": {
    vi: "Đã đọc chi tiết thế giới quan.",
    en: "Read the world-setting detail.",
    zh: "已读取世界观详情。",
  },
  "agent.runtime.summary.blocker.generic": {
    vi: "{{tool}} đã trả về mô tả xung đột hoặc chặn nghẽn.",
    en: "{{tool}} returned a conflict or blocker explanation.",
    zh: "{{tool}} 已返回冲突/阻塞说明。",
  },
  "agent.runtime.summary.list_writing_formulas": {
    vi: "Đã đọc {{count}} công thức viết.",
    en: "Read {{count}} writing formulas.",
    zh: "已读取 {{count}} 条写作公式。",
  },
  "agent.runtime.summary.writing_formula_detail.with_name": {
    vi: "Đã đọc công thức viết \"{{name}}\".",
    en: "Read the writing formula \"{{name}}\".",
    zh: "已读取写作公式《{{name}}》。",
  },
  "agent.runtime.summary.writing_formula_detail.generic": {
    vi: "Đã đọc chi tiết công thức viết.",
    en: "Read the writing-formula detail.",
    zh: "已读取写作公式详情。",
  },
  "agent.runtime.summary.formula_match.generic": {
    vi: "Đã hoàn tất phân tích mức khớp của công thức viết.",
    en: "Completed the writing-formula match analysis.",
    zh: "已完成写作公式适配分析。",
  },
  "agent.runtime.summary.list_base_characters": {
    vi: "Đã đọc {{count}} mẫu nhân vật nền.",
    en: "Read {{count}} base character templates.",
    zh: "已读取 {{count}} 个基础角色模板。",
  },
  "agent.runtime.summary.base_character_detail.with_name": {
    vi: "Đã đọc mẫu nhân vật \"{{name}}\".",
    en: "Read the character template \"{{name}}\".",
    zh: "已读取角色模板《{{name}}》。",
  },
  "agent.runtime.summary.base_character_detail.generic": {
    vi: "Đã đọc chi tiết mẫu nhân vật.",
    en: "Read the character-template detail.",
    zh: "已读取角色模板详情。",
  },
  "agent.runtime.summary.list_tasks": {
    vi: "Đã đọc {{count}} tác vụ hệ thống.",
    en: "Read {{count}} system tasks.",
    zh: "已读取 {{count}} 个系统任务。",
  },
  "agent.runtime.summary.task_detail.with_title": {
    vi: "Đã đọc chi tiết tác vụ: {{title}}.",
    en: "Read the task detail: {{title}}.",
    zh: "已读取任务详情：{{title}}。",
  },
  "agent.runtime.summary.task_detail.generic": {
    vi: "Đã đọc chi tiết tác vụ.",
    en: "Read the task detail.",
    zh: "已读取任务详情。",
  },
  "agent.runtime.summary.preview_pipeline_run": {
    vi: "Đã xem trước {{count}} chương.",
    en: "Previewed {{count}} chapters.",
    zh: "已预览 {{count}} 个章节。",
  },
  "agent.runtime.summary.queue_pipeline_run": {
    vi: "Đã xử lý tác vụ pipeline: {{value}}.",
    en: "Processed the pipeline task: {{value}}.",
    zh: "流水线任务已处理：{{value}}",
  },
  "agent.runtime.summary.chapter_write_processed": {
    vi: "Đã xử lý ghi chương, độ dài {{contentLength}} ký tự.",
    en: "Processed chapter writing, length {{contentLength}} characters.",
    zh: "章节写入已处理，字数 {{contentLength}}。",
  },
  "agent.runtime.unknown_error": {
    vi: "lỗi không xác định",
    en: "unknown error",
    zh: "unknown error",
  },
  "agent.runtime.summary.tool_failed": {
    vi: "{{tool}} thất bại: {{message}}",
    en: "{{tool}} failed: {{message}}",
    zh: "{{tool}} 执行失败：{{message}}",
  },
  "agent.runtime.final.completed_steps": {
    vi: "Đã hoàn tất các bước sau:",
    en: "Completed the following steps:",
    zh: "已完成以下步骤：",
  },
  "agent.runtime.final.waiting_approval": {
    vi: "Hiện có thao tác ghi có tác động cao đang chờ duyệt.",
    en: "A high-impact write is currently waiting for approval.",
    zh: "当前存在高影响写入，已暂停等待审批。",
  },
  "agent.runtime.final.completed": {
    vi: "Đã thực thi xong.",
    en: "Execution completed.",
    zh: "执行完成。",
  },
  "agent.runtime.final.no_steps": {
    vi: "Không có bước công cụ nào để thực thi.",
    en: "There are no tool steps to execute.",
    zh: "没有可执行的工具步骤。",
  },
  "agent.runtime.error.requires_novel_id": {
    vi: "Chế độ tiểu thuyết bắt buộc phải có `novelId`.",
    en: "Novel mode requires `novelId`.",
    zh: "小说模式必须提供 `novelId`。",
  },
  "agent.runtime.error.run_not_found": {
    vi: "Không tìm thấy lượt chạy.",
    en: "Run not found.",
    zh: "未找到运行记录。",
  },
  "agent.runtime.error.run_cancelled": {
    vi: "Lượt chạy này đã bị hủy.",
    en: "This run has been cancelled.",
    zh: "该运行已取消。",
  },
  "agent.runtime.error.approval_not_found": {
    vi: "Không tìm thấy mục duyệt.",
    en: "Approval not found.",
    zh: "未找到审批项。",
  },
  "agent.runtime.error.approval_already_resolved": {
    vi: "Mục duyệt này đã ở trạng thái {{status}}.",
    en: "This approval is already {{status}}.",
    zh: "该审批已处于{{status}}状态。",
  },
  "agent.runtime.error.approval_expired_stopped": {
    vi: "Mục duyệt đã hết hạn, lượt chạy đã dừng.",
    en: "The approval expired, and the run was stopped.",
    zh: "审批已过期，运行已停止。",
  },
  "agent.runtime.error.approval_inconsistent_stopped": {
    vi: "Trạng thái duyệt không nhất quán, lượt chạy đã dừng.",
    en: "Approval state is inconsistent, and the run was stopped.",
    zh: "审批状态异常，运行已停止。",
  },
  "agent.runtime.error.approval_payload_invalid": {
    vi: "Dữ liệu tiếp tục chạy sau duyệt đã hỏng, không thể tiếp tục thực thi.",
    en: "The approval continuation payload is corrupted and execution cannot continue.",
    zh: "审批续跑数据已损坏，无法继续执行。",
  },
  "agent.runtime.error.approval_payload_terminated": {
    vi: "Dữ liệu tiếp tục chạy sau duyệt đã hỏng, lượt chạy đã bị chấm dứt.",
    en: "The approval continuation payload is corrupted, and the run was terminated.",
    zh: "审批续跑数据已损坏，运行已终止。",
  },
  "agent.runtime.error.rejected_no_alternative": {
    vi: "Người dùng đã từ chối thao tác ghi tác động cao và hiện không còn nhánh thay thế nào có thể chạy.",
    en: "The user rejected the high-impact write, and there is no executable fallback path.",
    zh: "用户拒绝了高影响写入，且当前没有可执行的替代路径。",
  },
  "agent.runtime.error.rejected_stopped": {
    vi: "Đã từ chối thao tác ghi tác động cao, lượt chạy đã dừng.",
    en: "The high-impact write was rejected, and the run was stopped.",
    zh: "已拒绝该高影响写入，运行已停止。",
  },
  "agent.runtime.error.blocking_run_waiting_approval": {
    vi: "Hiện đã có một lượt chạy khác đang chờ duyệt, cần xử lý duyệt trước.",
    en: "Another run is already waiting for approval. Handle that approval first.",
    zh: "当前已有其他运行在等待审批，请先处理审批。",
  },
  "agent.runtime.error.blocking_run_running": {
    vi: "Hiện đã có một lượt chạy khác vẫn đang thực thi.",
    en: "Another run is already executing.",
    zh: "当前已有其他运行仍在执行中。",
  },
  "agent.runtime.error.current_run_waiting_approval": {
    vi: "Lượt chạy hiện tại đang chờ duyệt, cần xử lý duyệt trước.",
    en: "The current run is waiting for approval. Handle the approval first.",
    zh: "当前运行正等待审批，请先处理审批。",
  },
  "agent.runtime.error.current_run_running": {
    vi: "Lượt chạy hiện tại vẫn đang thực thi.",
    en: "The current run is still executing.",
    zh: "当前运行仍在执行中。",
  },
  "agent.runtime.error.plan_failed": {
    vi: "AI không thể hoàn tất bước nhận diện ý định và lập kế hoạch.",
    en: "The AI could not complete intent recognition and planning.",
    zh: "AI 未能完成意图识别与规划。",
  },
  "agent.runtime.error.replay_source_step_not_found": {
    vi: "Không tìm thấy bước nguồn để phát lại.",
    en: "Replay source step not found.",
    zh: "未找到可重放的源步骤。",
  },
  "agent.runtime.error.replay_no_steps": {
    vi: "Không có bước công cụ nào phía sau bước nguồn để phát lại.",
    en: "There are no replayable tool steps after the source step.",
    zh: "源步骤之后没有可重放的工具步骤。",
  },
  "agent.runtime.error.permission_denied": {
    vi: "Từ chối quyền: {{agent}} không được phép gọi {{tool}}.",
    en: "Permission denied: {{agent}} is not allowed to call {{tool}}.",
    zh: "权限拒绝：{{agent}} 不允许调用 {{tool}}。",
  },
  "agent.runtime.error.run_not_found_after_execution": {
    vi: "Không tìm thấy lượt chạy sau khi thực thi xong.",
    en: "Run not found after execution.",
    zh: "执行完成后未找到运行记录。",
  },
  "agent.runtime.status.run_created": {
    vi: "Đã tạo lượt chạy.",
    en: "Run created.",
    zh: "已创建运行。",
  },
  "agent.runtime.status.planning_started": {
    vi: "Bắt đầu lập kế hoạch.",
    en: "Planning started.",
    zh: "开始规划。",
  },
  "agent.runtime.status.approval_rejected_alternative": {
    vi: "Duyệt đã bị từ chối, hệ thống chuyển sang nhánh thay thế.",
    en: "Approval was rejected, and the system switched to a fallback path.",
    zh: "审批已拒绝，系统改走替代路径。",
  },
  "agent.runtime.status.approval_approved_resume": {
    vi: "Duyệt đã được chấp nhận, tiếp tục thực thi.",
    en: "Approval accepted. Resuming execution.",
    zh: "审批已通过，继续执行。",
  },
  "agent.runtime.reason.retry_tool": {
    vi: "Công cụ {{tool}} thất bại ở lần thử {{attempt}}, chuẩn bị thử lại.",
    en: "Tool {{tool}} failed on attempt {{attempt}} and will be retried.",
    zh: "工具 {{tool}} 在第 {{attempt}} 次尝试失败，准备重试。",
  },
  "agent.runtime.approval.default_reason": {
    vi: "gọi công cụ",
    en: "tool call",
    zh: "工具调用",
  },
  "agent.runtime.approval.status.approved": {
    vi: "đã duyệt",
    en: "approved",
    zh: "已通过",
  },
  "agent.runtime.approval.status.rejected": {
    vi: "đã từ chối",
    en: "rejected",
    zh: "已拒绝",
  },
  "agent.runtime.approval.status.expired": {
    vi: "đã hết hạn",
    en: "expired",
    zh: "已过期",
  },
  "agent.runtime.approval.default_reasoning": {
    vi: "tiếp tục thực thi",
    en: "continue execution",
    zh: "继续执行",
  },
  "agent.runtime.approval.default_diff_summary": {
    vi: "Một thao tác ghi có tác động cao đang chờ bạn xác nhận.",
    en: "A high-impact write is waiting for your confirmation.",
    zh: "高影响写入操作待确认。",
  },
  "agent.runtime.approval.continuation_reasoning": {
    vi: "Sau khi được duyệt, tiếp tục thực thi nhiệm vụ của {{agent}}",
    en: "Continue the {{agent}} task after approval",
    zh: "审批通过后继续执行 {{agent}} 任务",
  },
  "agent.runtime.approval.replay_reasoning": {
    vi: "phát lại từ lịch sử bước",
    en: "replay from step history",
    zh: "从历史步骤重放",
  },
  "agent.runtime.approval.fallback_draft.reasoning": {
    vi: "Sau khi bị từ chối duyệt, hệ thống chuyển sang lưu bản nháp để tránh ghi đè trực tiếp.",
    en: "After approval was rejected, switch to saving a draft to avoid overwriting content directly.",
    zh: "审批拒绝后改为草稿保存，避免直接覆盖正文。",
  },
  "agent.runtime.approval.fallback_draft.reason.with_note": {
    vi: "Duyệt bị từ chối, chuyển sang lưu bản nháp. Ghi chú: {{note}}",
    en: "Approval rejected, switched to draft save. Note: {{note}}",
    zh: "审批拒绝，转草稿保存。备注: {{note}}",
  },
  "agent.runtime.approval.fallback_draft.reason.without_note": {
    vi: "Duyệt bị từ chối, chuyển sang lưu bản nháp.",
    en: "Approval rejected, switched to draft save.",
    zh: "审批拒绝，转草稿保存。",
  },
  "agent.runtime.approval.fallback_preview.reasoning": {
    vi: "Sau khi bị từ chối duyệt, hệ thống chỉ giữ lại bản xem trước và không khởi động pipeline thật.",
    en: "After approval was rejected, keep only the preview and do not start the live pipeline.",
    zh: "审批拒绝后保留预览，不实际启动流水线。",
  },
  "agent.runtime.approval.fallback_preview.reason": {
    vi: "Duyệt bị từ chối, chuyển sang xem trước phạm vi.",
    en: "Approval rejected, switched to range preview.",
    zh: "审批拒绝，改为范围预览。",
  },
  "agent.runtime.chapter.goal": {
    vi: "Tạo chương {{chapterOrder}}",
    en: "Generate chapter {{chapterOrder}}",
    zh: "生成第 {{chapterOrder}} 章",
  },
  "agentRun.route.list.loaded": {
    vi: "Đã tải danh sách lượt chạy tác tử.",
    en: "Agent runs loaded.",
    zh: "Agent 运行列表已加载。",
  },
  "agentRun.route.detail.loaded": {
    vi: "Đã tải chi tiết lượt chạy tác tử.",
    en: "Agent run loaded.",
    zh: "Agent 运行详情已加载。",
  },
  "agentRun.route.not_found": {
    vi: "Không tìm thấy lượt chạy tác tử.",
    en: "Agent run not found.",
    zh: "未找到 Agent 运行。",
  },
  "agentRun.route.approval.approved": {
    vi: "Đã chấp nhận yêu cầu duyệt.",
    en: "Approval accepted.",
    zh: "审批已通过。",
  },
  "agentRun.route.approval.rejected": {
    vi: "Đã từ chối yêu cầu duyệt.",
    en: "Approval rejected.",
    zh: "审批已拒绝。",
  },
  "agentRun.route.replay.started": {
    vi: "Đã bắt đầu phát lại.",
    en: "Replay started.",
    zh: "重放已开始。",
  },
  "novel.chapter.route.list.loaded": {
    vi: "Đã tải danh sách chương.",
    en: "Chapters loaded.",
    zh: "章节列表已加载。",
  },
  "novel.chapter.route.created": {
    vi: "Đã tạo chương.",
    en: "Chapter created.",
    zh: "章节已创建。",
  },
  "novel.chapter.route.updated": {
    vi: "Đã cập nhật chương.",
    en: "Chapter updated.",
    zh: "章节已更新。",
  },
  "novel.chapter.route.deleted": {
    vi: "Đã xóa chương.",
    en: "Chapter deleted.",
    zh: "章节已删除。",
  },
  "novel.chapter.route.traces.loaded": {
    vi: "Đã tải lịch sử chạy của chương.",
    en: "Chapter traces loaded.",
    zh: "章节轨迹已加载。",
  },
  "novel.chapter.route.execution_contract.generated": {
    vi: "Đã tạo hợp đồng thực thi chương.",
    en: "Chapter execution contract generated.",
    zh: "章节执行合同已生成。",
  },
  "creativeHub.turn.intent.social_opening": {
    vi: "Mở lời nhẹ",
    en: "Light opening",
    zh: "轻度开场",
  },
  "creativeHub.turn.intent.list_novels": {
    vi: "Xem workspace tiểu thuyết",
    en: "Inspect novel workspace",
    zh: "查看小说工作区",
  },
  "creativeHub.turn.intent.create_novel": {
    vi: "Tạo tiểu thuyết mới",
    en: "Create a new novel",
    zh: "创建新小说",
  },
  "creativeHub.turn.intent.select_novel_workspace": {
    vi: "Chuyển workspace hiện tại",
    en: "Switch current workspace",
    zh: "切换当前工作区",
  },
  "creativeHub.turn.intent.unbind_world_from_novel": {
    vi: "Gỡ thế giới quan hiện tại",
    en: "Unbind the current world setting",
    zh: "解除当前世界观绑定",
  },
  "creativeHub.turn.intent.produce_novel": {
    vi: "Đẩy sản xuất toàn truyện",
    en: "Advance full-book production",
    zh: "推进整本创作",
  },
  "creativeHub.turn.intent.query_novel_production_status": {
    vi: "Xem tiến độ sản xuất toàn truyện",
    en: "Check full-book production progress",
    zh: "查看整本生产进度",
  },
  "creativeHub.turn.intent.query_chapter_content": {
    vi: "Xem nội dung chương",
    en: "Read chapter content",
    zh: "查看章节内容",
  },
  "creativeHub.turn.intent.inspect_failure_reason": {
    vi: "Chẩn đoán điểm nghẽn hiện tại",
    en: "Diagnose the current blocker",
    zh: "诊断当前阻塞",
  },
  "creativeHub.turn.intent.write_chapter": {
    vi: "Tiếp tục viết chương",
    en: "Continue chapter writing",
    zh: "推进章节创作",
  },
  "creativeHub.turn.intent.rewrite_chapter": {
    vi: "Viết lại chương hiện tại",
    en: "Rewrite the current chapter",
    zh: "重写当前章节",
  },
  "creativeHub.turn.intent.search_knowledge": {
    vi: "Tra cứu tri thức",
    en: "Search knowledge",
    zh: "查阅知识资料",
  },
  "creativeHub.turn.intent.ideate_novel_setup": {
    vi: "Tạo phương án thiết lập",
    en: "Generate setup options",
    zh: "生成设定备选",
  },
  "creativeHub.turn.intent.inspect_world": {
    vi: "Kiểm tra ràng buộc thế giới quan",
    en: "Inspect world constraints",
    zh: "检查世界观约束",
  },
  "creativeHub.turn.intent.inspect_characters": {
    vi: "Xem trạng thái nhân vật",
    en: "Inspect character status",
    zh: "查看角色状态",
  },
  "creativeHub.turn.intent.general_chat": {
    vi: "Trao đổi sáng tác",
    en: "Creative discussion",
    zh: "创作讨论",
  },
  "creativeHub.turn.intent.default": {
    vi: "Tiếp tục công việc hiện tại",
    en: "Advance the current work",
    zh: "推进当前创作",
  },
  "creativeHub.turn.intent_summary.with_goal": {
    vi: "{{label}}: {{goal}}",
    en: "{{label}}: {{goal}}",
    zh: "{{label}}：{{goal}}",
  },
  "creativeHub.turn.intent_summary.label_only": {
    vi: "{{label}}",
    en: "{{label}}",
    zh: "{{label}}",
  },
  "creativeHub.turn.action.with_more": {
    vi: "{{preview}} Còn {{remainingCount}} hành động nữa.",
    en: "{{preview}} {{remainingCount}} more actions remain.",
    zh: "{{preview}} 另外还有 {{remainingCount}} 项动作。",
  },
  "creativeHub.turn.action.planned.interrupted": {
    vi: "Đã lên kế hoạch {{count}} hành động và hiện đang dừng ở bước chờ duyệt hoặc xác nhận.",
    en: "Planned {{count}} actions and is currently paused at an approval or confirmation step.",
    zh: "已规划 {{count}} 项动作，当前停在审批或确认环节。",
  },
  "creativeHub.turn.action.planned.default": {
    vi: "Đã lên kế hoạch {{count}} hành động; trọng tâm lượt này là phối hợp sáng tác và sắp xếp trạng thái.",
    en: "Planned {{count}} actions; this turn focused on creative coordination and workspace state alignment.",
    zh: "已规划 {{count}} 项动作，本轮以创作协同与状态整理为主。",
  },
  "creativeHub.turn.action.none": {
    vi: "Lượt này không kích hoạt công cụ rõ ràng; trọng tâm là đối thoại sáng tác và hiểu ngữ cảnh workspace.",
    en: "This turn did not trigger explicit tools; it focused on creative dialogue and workspace understanding.",
    zh: "本轮未触发显式工具动作，以创作对话与工作区理解为主。",
  },
  "creativeHub.turn.impact.pending_approval": {
    vi: "Hiện có một thao tác tác động cao đang chờ xác nhận.",
    en: "A high-impact action is currently waiting for confirmation.",
    zh: "当前存在待确认的高影响操作。",
  },
  "creativeHub.turn.impact.default": {
    vi: "Trạng thái workspace đã được cập nhật và có thể tiếp tục theo hướng sáng tác hiện tại.",
    en: "The workspace state was updated and can continue along the current creative direction.",
    zh: "工作区状态已更新，可继续沿当前创作方向推进。",
  },
  "creativeHub.turn.next.interrupted": {
    vi: "Xử lý mục duyệt hiện tại trước, rồi mới tiếp tục các bước sáng tác tiếp theo.",
    en: "Handle the current approval first, then continue the downstream creative steps.",
    zh: "先处理当前审批卡，再继续推进后续创作。",
  },
  "creativeHub.turn.next.failure_default": {
    vi: "Xem chẩn đoán lỗi và nguyên nhân chặn nghẽn trước, rồi mới quyết định tiếp tục tạo hay điều chỉnh ngữ cảnh.",
    en: "Inspect the failure diagnosis and blocker first, then decide whether to continue generating or adjust the context.",
    zh: "先查看失败诊断与阻塞原因，再决定继续生成还是调整上下文。",
  },
  "creativeHub.turn.next.create_novel": {
    vi: "Tiếp tục bổ sung thế giới quan, nhân vật hoặc tham số sản xuất để cuốn này đi vào workspace ổn định.",
    en: "Continue filling in the world, characters, or production parameters so this novel can enter a stable workspace.",
    zh: "继续补齐世界观、角色或整本生产参数，让这本书进入稳定工作区。",
  },
  "creativeHub.turn.next.unbind_world_from_novel": {
    vi: "Nếu vẫn cần nền thế giới quan, hãy gắn một bộ phù hợp hơn; nếu không thì tiếp tục bổ sung thiết lập cốt lõi.",
    en: "If the novel still needs world support, bind a more suitable one; otherwise continue filling in the core setup.",
    zh: "如果还需要世界观支撑，就重新选择一套更合适的世界观；否则继续补核心设定。",
  },
  "creativeHub.turn.next.produce_novel": {
    vi: "Tiếp tục đẩy sản xuất toàn truyện cho cuốn hiện tại, và kiểm tra điểm nghẽn nếu cần.",
    en: "Continue advancing full-book production for the current novel, checking blockers if needed.",
    zh: "继续围绕当前小说推进整本生产，必要时先检查关键阻塞。",
  },
  "creativeHub.turn.next.query_novel_production_status": {
    vi: "Dựa trên tiến độ hiện tại để quyết định nên tiếp tục tạo, bổ sung tài nguyên, hay xử lý lỗi trước.",
    en: "Use the current progress to decide whether to continue generation, fill in missing assets, or address failures first.",
    zh: "结合当前进度决定是继续生成、补资源，还是先处理失败点。",
  },
  "creativeHub.turn.next.write_chapter": {
    vi: "Tiếp tục đẩy chương hiện tại, sửa vấn đề đang có, hoặc kiểm tra lại tính nhất quán ngữ cảnh.",
    en: "Continue the current chapter, fix active issues, or re-check contextual consistency.",
    zh: "继续围绕当前章节推进正文、修复问题或检查上下文一致性。",
  },
  "creativeHub.turn.next.search_knowledge": {
    vi: "Tiếp tục truy vấn từ các tư liệu đã tìm thấy, hoặc gắn tài liệu quan trọng vào workspace hiện tại.",
    en: "Continue querying from the retrieved material, or bind key references into the current workspace.",
    zh: "根据已找到的资料继续追问，或将关键材料绑定到当前工作区。",
  },
  "creativeHub.turn.next.ideate_novel_setup": {
    vi: "Chọn phương án gần nhất trong các bản nháp hiện có, rồi tiếp tục làm rõ nhân vật chính, xung đột và lời hứa truyện.",
    en: "Pick the closest option from the current drafts, then keep refining the protagonist, conflict, and story promise.",
    zh: "从当前备选里挑出最接近的一版，再继续细化主角、冲突和故事承诺。",
  },
  "creativeHub.turn.next.default": {
    vi: "Tiếp tục đẩy bước tiếp theo trong workspace hiện tại.",
    en: "Continue with the next step in the current workspace.",
    zh: "继续围绕当前工作区推进下一步创作。",
  },
  "creativeHub.runtime.goal.default": {
    vi: "Tiếp tục công việc hiện tại trong Creative Hub.",
    en: "Continue the current Creative Hub task.",
    zh: "继续当前创作中枢任务。",
  },
  "creativeHub.runtime.binding.label.novel_id": {
    vi: "ID tiểu thuyết",
    en: "Novel ID",
    zh: "小说ID",
  },
  "creativeHub.runtime.binding.label.chapter_id": {
    vi: "ID chương",
    en: "Chapter ID",
    zh: "章节ID",
  },
  "creativeHub.runtime.binding.label.world_id": {
    vi: "ID thế giới quan",
    en: "World ID",
    zh: "世界观ID",
  },
  "creativeHub.runtime.binding.label.task_id": {
    vi: "ID tác vụ",
    en: "Task ID",
    zh: "任务ID",
  },
  "creativeHub.runtime.binding.label.book_analysis_id": {
    vi: "ID phân tích sách",
    en: "Book analysis ID",
    zh: "拆书分析ID",
  },
  "creativeHub.runtime.binding.label.formula_id": {
    vi: "ID công thức viết",
    en: "Writing formula ID",
    zh: "写作公式ID",
  },
  "creativeHub.runtime.binding.label.style_profile_id": {
    vi: "ID hồ sơ phong cách",
    en: "Style profile ID",
    zh: "写法资产ID",
  },
  "creativeHub.runtime.binding.label.base_character_id": {
    vi: "ID nhân vật nền",
    en: "Base character ID",
    zh: "基础角色ID",
  },
  "creativeHub.runtime.binding.label.knowledge_document_ids": {
    vi: "ID tài liệu tri thức",
    en: "Knowledge document IDs",
    zh: "知识文档ID",
  },
  "creativeHub.runtime.binding.entry": {
    vi: "{{label}}={{value}}",
    en: "{{label}}={{value}}",
    zh: "{{label}}={{value}}",
  },
  "creativeHub.runtime.binding.system_message": {
    vi: "Các tài nguyên đang được gắn vào workspace Creative Hub hiện tại: {{summary}}. Khi cần truy vấn, chẩn đoán hoặc điều khiển, hãy ưu tiên hiểu ý định của người dùng dựa trên các tài nguyên này.",
    en: "The current Creative Hub workspace is bound to these resources: {{summary}}. When querying, diagnosing, or controlling the workspace, prioritize interpreting user intent through these bindings.",
    zh: "当前创作中枢绑定的工作区资源如下：{{summary}}。如需查询、诊断或控制，请优先围绕这些资源理解用户意图。",
  },
  "creativeHub.runtime.interrupt.title.approval": {
    vi: "Xác nhận duyệt",
    en: "Approval confirmation",
    zh: "审批确认",
  },
  "creativeHub.runtime.graph.error.invocation_missing": {
    vi: "Không tìm thấy ngữ cảnh gọi đồ thị Creative Hub.",
    en: "Creative Hub graph invocation context is missing.",
    zh: "创作中枢图调用上下文不存在。",
  },
  "creativeHub.runtime.graph.error.missing_run_or_planner": {
    vi: "Đồ thị Creative Hub đang thiếu `runId` hoặc kết quả planner.",
    en: "The Creative Hub graph is missing `runId` or the planner result.",
    zh: "创作中枢图缺少 runId 或 plannerResult。",
  },
  "creativeHub.runtime.graph.error.run_failed": {
    vi: "Lượt chạy Creative Hub đã thất bại.",
    en: "The Creative Hub run failed.",
    zh: "创作中枢运行失败。",
  },
  "creativeHub.runtime.graph.error.missing_execution_result": {
    vi: "Đồ thị Creative Hub đang thiếu kết quả thực thi.",
    en: "The Creative Hub graph is missing the execution result.",
    zh: "创作中枢图缺少 executionResult。",
  },
  "creativeHub.runtime.interrupt.error.invocation_missing": {
    vi: "Không tìm thấy ngữ cảnh khôi phục ngắt quãng của Creative Hub.",
    en: "Creative Hub interrupt-resume invocation context is missing.",
    zh: "创作中枢中断恢复上下文不存在。",
  },
  "creativeHub.runtime.interrupt.error.no_resumable_run": {
    vi: "Thread hiện tại không có lượt chạy nào để khôi phục.",
    en: "The current thread has no run to resume.",
    zh: "当前线程没有可恢复的运行。",
  },
  "creativeHub.runtime.interrupt.error.missing_run_id": {
    vi: "Creative Hub đang thiếu `runId` cần khôi phục.",
    en: "Creative Hub is missing the `runId` to resume.",
    zh: "创作中枢缺少待恢复的 runId。",
  },
  "creativeHub.runtime.interrupt.error.execution_failed": {
    vi: "Luồng tiếp tục sau duyệt của Creative Hub đã thất bại.",
    en: "Creative Hub post-approval execution failed.",
    zh: "审批后续执行失败。",
  },
  "creativeHub.runtime.interrupt.error.missing_execution_result": {
    vi: "Creative Hub đang thiếu kết quả thực thi sau khi khôi phục duyệt.",
    en: "Creative Hub is missing the execution result after approval recovery.",
    zh: "创作中枢审批恢复缺少执行结果。",
  },
  "creativeHub.service.thread.default_title": {
    vi: "Cuộc trò chuyện mới",
    en: "New chat",
    zh: "新对话",
  },
  "creativeHub.service.thread.not_found": {
    vi: "Không tìm thấy thread Creative Hub.",
    en: "Creative Hub thread not found.",
    zh: "线程不存在。",
  },
  "creativeHub.service.diagnostic.recovery_hint": {
    vi: "Hãy xem bước thất bại gần nhất; nếu cần thì khởi chạy lại hoặc phát lại từ Creative Hub.",
    en: "Inspect the latest failed step, then restart or replay from Creative Hub if needed.",
    zh: "请查看最近一次失败步骤，必要时从创作中枢重新发起或重放。",
  },
  "creativeHub.route.threads.loaded": {
    vi: "Đã tải danh sách thread Creative Hub.",
    en: "Creative Hub thread list loaded.",
    zh: "创作中枢线程列表加载成功。",
  },
  "creativeHub.route.thread.created": {
    vi: "Đã tạo thread Creative Hub.",
    en: "Creative Hub thread created.",
    zh: "创作中枢线程已创建。",
  },
  "creativeHub.route.thread.updated": {
    vi: "Đã cập nhật thread Creative Hub.",
    en: "Creative Hub thread updated.",
    zh: "创作中枢线程已更新。",
  },
  "creativeHub.route.thread.deleted": {
    vi: "Đã xóa thread Creative Hub.",
    en: "Creative Hub thread deleted.",
    zh: "创作中枢线程已删除。",
  },
  "creativeHub.route.thread.state.loaded": {
    vi: "Đã tải trạng thái thread Creative Hub.",
    en: "Creative Hub thread state loaded.",
    zh: "创作中枢线程状态加载成功。",
  },
  "creativeHub.route.thread.history.loaded": {
    vi: "Đã tải lịch sử thread Creative Hub.",
    en: "Creative Hub thread history loaded.",
    zh: "创作中枢线程历史加载成功。",
  },
  "creativeHub.route.thread.title.generated": {
    vi: "Đã tạo tiêu đề thread Creative Hub.",
    en: "Creative Hub thread title generated.",
    zh: "创作中枢线程标题已生成。",
  },
  "creativeHub.route.run.failed": {
    vi: "Lượt chạy Creative Hub thất bại.",
    en: "Creative Hub run failed.",
    zh: "创作中枢运行失败。",
  },
  "creativeHub.route.interrupt.approved": {
    vi: "Đã duyệt yêu cầu và cập nhật thread.",
    en: "Approval accepted and thread updated.",
    zh: "审批已通过，线程已更新。",
  },
  "creativeHub.route.interrupt.rejected": {
    vi: "Đã từ chối yêu cầu và cập nhật thread.",
    en: "Approval rejected and thread updated.",
    zh: "审批已拒绝，线程已更新。",
  },
  "task.route.overview.loaded": {
    vi: "Đã tải tổng quan tác vụ.",
    en: "Task overview loaded.",
    zh: "任务总览已加载。",
  },
  "task.route.recovery_candidates.loaded": {
    vi: "Đã tải danh sách tác vụ có thể khôi phục.",
    en: "Recovery candidates loaded.",
    zh: "恢复候选任务已加载。",
  },
  "task.route.recovery_candidates.resumed": {
    vi: "Đã tiếp tục toàn bộ tác vụ có thể khôi phục.",
    en: "Recovery candidates resumed.",
    zh: "恢复候选任务已继续执行。",
  },
  "task.route.recovery_candidate.resumed": {
    vi: "Đã tiếp tục tác vụ khôi phục đã chọn.",
    en: "Recovery candidate resumed.",
    zh: "恢复候选任务已继续执行。",
  },
  "task.route.list.loaded": {
    vi: "Đã tải danh sách tác vụ.",
    en: "Tasks loaded.",
    zh: "任务列表已加载。",
  },
  "task.route.detail.loaded": {
    vi: "Đã tải chi tiết tác vụ.",
    en: "Task loaded.",
    zh: "任务详情已加载。",
  },
  "task.route.retried": {
    vi: "Đã gửi lệnh thử lại tác vụ.",
    en: "Task retried.",
    zh: "任务已重试。",
  },
  "task.route.cancelled": {
    vi: "Đã hủy tác vụ.",
    en: "Task cancelled.",
    zh: "任务已取消。",
  },
  "task.route.archived": {
    vi: "Đã lưu trữ tác vụ.",
    en: "Task archived.",
    zh: "任务已归档。",
  },
  "novel.route.list.loaded": {
    vi: "Đã tải danh sách tiểu thuyết.",
    en: "Novel list loaded.",
    zh: "小说列表已加载。",
  },
  "novel.route.created": {
    vi: "Đã tạo tiểu thuyết.",
    en: "Novel created.",
    zh: "创建小说成功。",
  },
  "novel.route.resource_recommendation.generated": {
    vi: "AI đã tạo gợi ý tài nguyên mở truyện.",
    en: "AI resource recommendations for starting the novel have been generated.",
    zh: "AI 已生成开书资源推荐。",
  },
  "novel.route.not_found": {
    vi: "Không tìm thấy tiểu thuyết.",
    en: "Novel not found.",
    zh: "小说不存在。",
  },
  "novel.route.detail.loaded": {
    vi: "Đã tải chi tiết tiểu thuyết.",
    en: "Novel detail loaded.",
    zh: "获取小说详情成功。",
  },
  "novel.route.updated": {
    vi: "Đã cập nhật tiểu thuyết.",
    en: "Novel updated.",
    zh: "更新小说成功。",
  },
  "novel.route.deleted": {
    vi: "Đã xóa tiểu thuyết.",
    en: "Novel deleted.",
    zh: "删除小说成功。",
  },
  "novel.production.route.pipeline_job.created": {
    vi: "Đã tạo job pipeline.",
    en: "Pipeline job created.",
    zh: "Pipeline 作业已创建。",
  },
  "novel.production.route.pipeline_job.not_found": {
    vi: "Không tìm thấy job pipeline.",
    en: "Pipeline job not found.",
    zh: "未找到 Pipeline 作业。",
  },
  "novel.production.route.pipeline_job.loaded": {
    vi: "Đã tải job pipeline.",
    en: "Pipeline job loaded.",
    zh: "Pipeline 作业已加载。",
  },
  "novel.production.route.chapter_hook.generated": {
    vi: "Đã tạo hook chương.",
    en: "Chapter hook generated.",
    zh: "章节钩子已生成。",
  },
  "novel.production.route.outline.optimize_preview.generated": {
    vi: "Đã tạo bản xem trước tối ưu dàn ý.",
    en: "Outline optimization preview generated.",
    zh: "大纲优化预览已生成。",
  },
  "novel.production.route.structured_outline.optimize_preview.generated": {
    vi: "Đã tạo bản xem trước tối ưu dàn ý có cấu trúc.",
    en: "Structured outline optimization preview generated.",
    zh: "结构化大纲优化预览已生成。",
  },
  "novel.production.route.titles.generated": {
    vi: "Đã tạo danh sách tiêu đề.",
    en: "Titles generated.",
    zh: "标题已生成。",
  },
  "novel.volume.route.workspace.loaded": {
    vi: "Đã tải không gian làm việc theo tập.",
    en: "Volume workspace loaded.",
    zh: "卷工作区已加载。",
  },
  "novel.volume.route.workspace.updated": {
    vi: "Đã cập nhật không gian làm việc theo tập.",
    en: "Volume workspace updated.",
    zh: "卷工作区已更新。",
  },
  "novel.volume.route.workspace.generated": {
    vi: "Đã tạo không gian làm việc theo tập.",
    en: "Volume workspace generated.",
    zh: "卷工作区已生成。",
  },
  "novel.volume.route.draft_version.created": {
    vi: "Đã tạo bản nháp phiên bản theo tập.",
    en: "Volume draft version created.",
    zh: "卷草稿版本已创建。",
  },
  "novel.volume.route.version.activated": {
    vi: "Đã kích hoạt phiên bản theo tập.",
    en: "Volume version activated.",
    zh: "卷版本已激活。",
  },
  "novel.volume.route.version.frozen": {
    vi: "Đã khóa phiên bản theo tập.",
    en: "Volume version frozen.",
    zh: "卷版本已冻结。",
  },
  "novel.volume.route.versions.loaded": {
    vi: "Đã tải danh sách phiên bản theo tập.",
    en: "Volume versions loaded.",
    zh: "卷版本列表已加载。",
  },
  "novel.volume.route.diff.loaded": {
    vi: "Đã tải phần so sánh khác biệt theo tập.",
    en: "Volume diff loaded.",
    zh: "卷差异已加载。",
  },
  "novel.volume.route.impact_analysis.completed": {
    vi: "Đã hoàn tất phân tích tác động theo tập.",
    en: "Volume impact analysis completed.",
    zh: "卷影响分析已完成。",
  },
  "novel.volume.route.chapters.synchronized": {
    vi: "Đã đồng bộ chương vào cấu trúc theo tập.",
    en: "Volume chapters synchronized.",
    zh: "卷章节已同步。",
  },
  "novel.volume.route.legacy_outline.migrated": {
    vi: "Đã chuyển dàn ý cũ sang không gian làm việc theo tập.",
    en: "Legacy outline migrated to volume workspace.",
    zh: "旧版大纲已迁移到卷工作区。",
  },
  "novel.planning.route.state.loaded": {
    vi: "Đã tải trạng thái cốt truyện.",
    en: "Story state loaded.",
    zh: "故事状态已加载。",
  },
  "novel.planning.route.state_snapshot.latest.loaded": {
    vi: "Đã tải ảnh chụp trạng thái mới nhất.",
    en: "Latest state snapshot loaded.",
    zh: "最新状态快照已加载。",
  },
  "novel.planning.route.payoff_ledger.loaded": {
    vi: "Đã tải sổ theo dõi payoff.",
    en: "Payoff ledger loaded.",
    zh: "伏笔回收账本已加载。",
  },
  "novel.planning.route.chapter_state_snapshot.loaded": {
    vi: "Đã tải ảnh chụp trạng thái chương.",
    en: "Chapter state snapshot loaded.",
    zh: "章节状态快照已加载。",
  },
  "novel.planning.route.state.rebuilt": {
    vi: "Đã dựng lại trạng thái cốt truyện.",
    en: "Story state rebuild completed.",
    zh: "故事状态重建已完成。",
  },
  "novel.planning.route.book_plan.generated": {
    vi: "Đã tạo kế hoạch toàn bộ truyện.",
    en: "Book plan generated.",
    zh: "全书规划已生成。",
  },
  "novel.planning.route.arc_plan.generated": {
    vi: "Đã tạo kế hoạch tuyến truyện.",
    en: "Arc plan generated.",
    zh: "故事弧规划已生成。",
  },
  "novel.planning.route.chapter_plan.generated": {
    vi: "Đã tạo kế hoạch chương.",
    en: "Chapter plan generated.",
    zh: "章节规划已生成。",
  },
  "novel.planning.route.chapter_plan.loaded": {
    vi: "Đã tải kế hoạch chương.",
    en: "Chapter plan loaded.",
    zh: "章节规划已加载。",
  },
  "novel.planning.route.replan.completed": {
    vi: "Đã hoàn tất tái lập kế hoạch truyện.",
    en: "Replan completed.",
    zh: "重新规划已完成。",
  },
  "novel.storyline.route.versions.loaded": {
    vi: "Đã tải danh sách phiên bản tuyến truyện.",
    en: "Storyline versions loaded.",
    zh: "故事线版本列表已加载。",
  },
  "novel.storyline.route.draft.created": {
    vi: "Đã tạo bản nháp tuyến truyện.",
    en: "Storyline draft created.",
    zh: "故事线草稿已创建。",
  },
  "novel.storyline.route.version.activated": {
    vi: "Đã kích hoạt phiên bản tuyến truyện.",
    en: "Storyline version activated.",
    zh: "故事线版本已激活。",
  },
  "novel.storyline.route.version.frozen": {
    vi: "Đã khóa phiên bản tuyến truyện.",
    en: "Storyline version frozen.",
    zh: "故事线版本已冻结。",
  },
  "novel.storyline.route.diff.loaded": {
    vi: "Đã tải phần so sánh khác biệt tuyến truyện.",
    en: "Storyline diff loaded.",
    zh: "故事线差异已加载。",
  },
  "novel.storyline.route.impact_analysis.completed": {
    vi: "Đã hoàn tất phân tích tác động tuyến truyện.",
    en: "Storyline impact analysis completed.",
    zh: "故事线影响分析已完成。",
  },
  "novel.review.route.chapter.completed": {
    vi: "Đã hoàn tất đánh giá chương.",
    en: "Chapter review completed.",
    zh: "章节评审已完成。",
  },
  "novel.review.route.audit.continuity.completed": {
    vi: "Đã hoàn tất kiểm tra tính liên tục.",
    en: "Continuity audit completed.",
    zh: "连续性审计已完成。",
  },
  "novel.review.route.audit.character.completed": {
    vi: "Đã hoàn tất kiểm tra nhân vật.",
    en: "Character audit completed.",
    zh: "角色审计已完成。",
  },
  "novel.review.route.audit.plot.completed": {
    vi: "Đã hoàn tất kiểm tra cốt truyện.",
    en: "Plot audit completed.",
    zh: "情节审计已完成。",
  },
  "novel.review.route.audit.full.completed": {
    vi: "Đã hoàn tất kiểm tra toàn diện.",
    en: "Full audit completed.",
    zh: "完整审计已完成。",
  },
  "novel.review.route.audit_reports.loaded": {
    vi: "Đã tải các báo cáo kiểm tra.",
    en: "Audit reports loaded.",
    zh: "审计报告已加载。",
  },
  "novel.review.route.audit_issue.resolved": {
    vi: "Đã đánh dấu xử lý xong vấn đề kiểm tra.",
    en: "Audit issue resolved.",
    zh: "审计问题已处理。",
  },
  "novel.review.route.quality_report.loaded": {
    vi: "Đã tải báo cáo chất lượng.",
    en: "Quality report loaded.",
    zh: "质量报告已加载。",
  },
  "novel.world_slice.route.loaded": {
    vi: "Đã tải lát cắt thế giới của truyện.",
    en: "Novel world slice loaded.",
    zh: "小说世界切片已加载。",
  },
  "novel.world_slice.route.refreshed": {
    vi: "Đã làm mới lát cắt thế giới của truyện.",
    en: "Novel world slice refreshed.",
    zh: "小说世界切片已刷新。",
  },
  "novel.world_slice.route.preferences.updated": {
    vi: "Đã cập nhật tuỳ chọn lát cắt thế giới.",
    en: "Novel world slice preferences updated.",
    zh: "小说世界切片偏好已更新。",
  },
  "novel.director.route.candidates.generated": {
    vi: "Đã tạo các phương án đạo diễn truyện.",
    en: "Director candidates generated.",
    zh: "导演候选方案已生成。",
  },
  "novel.director.route.candidates.regenerated": {
    vi: "Đã tạo lại các phương án đạo diễn truyện.",
    en: "Director candidates regenerated.",
    zh: "导演候选方案已重新生成。",
  },
  "novel.director.route.candidate.patched": {
    vi: "Đã chỉnh sửa phương án đạo diễn truyện.",
    en: "Director candidate patched.",
    zh: "导演候选方案已修补。",
  },
  "novel.director.route.title_options.regenerated": {
    vi: "Đã tạo lại các phương án tiêu đề đạo diễn truyện.",
    en: "Director title options regenerated.",
    zh: "导演标题方案已重新生成。",
  },
  "novel.director.route.candidate.confirmed": {
    vi: "Đã xác nhận phương án đạo diễn truyện.",
    en: "Director candidate confirmed.",
    zh: "导演候选方案已确认。",
  },
  "novel.director.route.takeover_readiness.loaded": {
    vi: "Đã tải trạng thái sẵn sàng takeover của director.",
    en: "Director takeover readiness loaded.",
    zh: "导演接管准备状态已加载。",
  },
  "novel.director.route.takeover.started": {
    vi: "Đã bắt đầu luồng takeover của director.",
    en: "Director takeover started.",
    zh: "导演接管已启动。",
  },
  "novel.workflow.route.ready": {
    vi: "Luồng workflow của truyện đã sẵn sàng.",
    en: "Novel workflow ready.",
    zh: "小说工作流已就绪。",
  },
  "novel.workflow.route.auto_director.latest.loaded": {
    vi: "Đã tải tác vụ auto director mới nhất.",
    en: "Latest auto director task loaded.",
    zh: "最新自动导演任务已加载。",
  },
  "novel.workflow.route.auto_director.not_found": {
    vi: "Chưa có tác vụ auto director nào.",
    en: "No auto director task found.",
    zh: "未找到自动导演任务。",
  },
  "novel.workflow.route.continued": {
    vi: "Đã tiếp tục workflow của truyện.",
    en: "Novel workflow continued.",
    zh: "小说工作流已继续执行。",
  },
  "novel.workflow.route.chapter_title_repair.started": {
    vi: "Đã bắt đầu sửa tiêu đề chương.",
    en: "Chapter title repair started.",
    zh: "章节标题修复已启动。",
  },
  "novel.workflow.route.stage.synced": {
    vi: "Đã đồng bộ giai đoạn workflow của truyện.",
    en: "Novel workflow stage synced.",
    zh: "小说工作流阶段已同步。",
  },
  "novel.chapter_editor.route.workspace.loaded": {
    vi: "Đã tải không gian biên tập chương.",
    en: "Chapter editor workspace loaded.",
    zh: "章节编辑器工作区已加载。",
  },
  "novel.chapter_editor.route.ai_revision_preview.generated": {
    vi: "Đã tạo bản xem trước chỉnh sửa AI cho chương.",
    en: "Chapter editor AI revision preview generated.",
    zh: "章节编辑器 AI 修订预览已生成。",
  },
  "novel.chapter_editor.route.rewrite_preview.generated": {
    vi: "Đã tạo bản xem trước viết lại chương.",
    en: "Chapter editor rewrite preview generated.",
    zh: "章节编辑器改写预览已生成。",
  },
  "novel.chapter_editor.error.novel_not_found": {
    vi: "Không tìm thấy tiểu thuyết.",
    en: "Novel not found.",
    zh: "小说不存在。",
  },
  "novel.chapter_editor.error.chapter_not_found": {
    vi: "Không tìm thấy chương.",
    en: "Chapter not found.",
    zh: "章节不存在。",
  },
  "novel.chapter_editor.error.selection_required": {
    vi: "Cần chọn phần nội dung trước khi sửa đoạn bằng AI.",
    en: "Select body text before starting fragment revision.",
    zh: "片段修正需要先选中正文内容。",
  },
  "novel.chapter_editor.error.invalid_selection_range": {
    vi: "Phạm vi chọn không hợp lệ. Hãy chọn lại rồi thử lại.",
    en: "The selected range is invalid. Reselect it and try again.",
    zh: "选区范围无效，请重新选择后再试。",
  },
  "novel.chapter_editor.error.selection_text_empty": {
    vi: "Đoạn văn bản đã chọn không được để trống.",
    en: "Selected text cannot be empty.",
    zh: "选中文本不能为空。",
  },
  "novel.chapter_editor.error.selection_text_changed": {
    vi: "Đoạn văn bản đã chọn đã thay đổi. Hãy chọn lại rồi thử lại.",
    en: "The selected text has changed. Reselect it and try again.",
    zh: "选中文本已发生变化，请重新选择后再试。",
  },
  "novel.chapter_editor.error.chapter_content_empty": {
    vi: "Nội dung chương hiện đang trống nên chưa thể chạy sửa bằng AI.",
    en: "The current chapter is empty, so AI revision cannot start.",
    zh: "当前章节正文为空，无法发起 AI 修正。",
  },
  "novel.chapter_editor.error.full_chapter_revision_limit": {
    vi: "Chế độ sửa toàn chương hiện chỉ hỗ trợ tối đa {{limit}} ký tự không phải khoảng trắng. Hãy chuyển sang sửa theo đoạn.",
    en: "Whole-chapter revision currently supports at most {{limit}} non-whitespace characters. Switch to selection revision instead.",
    zh: "整章修正当前限制为 {{limit}} 个非空白字符以内，请改为片段修正。",
  },
  "novel.chapter_editor.error.candidate_versions_insufficient": {
    vi: "AI chưa trả về đủ phiên bản gợi ý. Hãy thử lại.",
    en: "The AI did not return enough candidate versions. Please try again.",
    zh: "AI 未返回足够的候选版本，请重试。",
  },
  "novel.chapter_editor.error.instruction_required": {
    vi: "Hãy mô tả trước cách bạn muốn AI chỉnh sửa.",
    en: "Describe how you want the AI to revise first.",
    zh: "请先写下你希望 AI 如何修改。",
  },
  "novel.chapter_editor.workspace.chapter_mission.default": {
    vi: "Trọng tâm hiện tại là bảo đảm chương này vẫn phục vụ tiến độ chung của tập.",
    en: "The current priority is to ensure this chapter still serves the volume's progression.",
    zh: "当前重点是保证本章继续服务卷内推进。",
  },
  "novel.chapter_editor.workspace.chapter_role.default": {
    vi: "Chương này chịu trách nhiệm tiếp nối vai trò thúc đẩy tiến độ trong tập.",
    en: "This chapter is responsible for carrying the volume's progression forward.",
    zh: "负责承接本章在卷内的推进职责。",
  },
  "novel.chapter_editor.workspace.volume.unrecognized": {
    vi: "Chưa xác định tập tương ứng",
    en: "Unrecognized volume",
    zh: "未识别所属卷",
  },
  "novel.chapter_editor.workspace.bridge.previous.missing": {
    vi: "Chưa có tóm tắt chương trước để nối tiếp.",
    en: "There is no previous chapter summary to carry forward.",
    zh: "本章前没有可承接的上一章摘要。",
  },
  "novel.chapter_editor.workspace.bridge.next.missing": {
    vi: "Chưa có tóm tắt chương sau để tham chiếu.",
    en: "There is no next chapter summary available for reference.",
    zh: "本章后没有可参考的下一章摘要。",
  },
  "novel.chapter_editor.workspace.plot_threads.none": {
    vi: "Hiện chưa trích xuất được nhắc nhở tuyến cốt truyện rõ ràng.",
    en: "No explicit plot-thread reminders were extracted yet.",
    zh: "当前没有明确抽取出的主线提醒。",
  },
  "novel.chapter_editor.workspace.chapter.untitled": {
    vi: "Chương chưa đặt tên",
    en: "Untitled chapter",
    zh: "未命名章节",
  },
  "novel.chapter_editor.workspace.refresh_reason.empty_content": {
    vi: "Chương hiện đang trống. Hãy bổ sung nội dung trước rồi mới để AI gợi ý chỉnh sửa.",
    en: "The chapter is currently empty. Add content first, then let the AI suggest revisions.",
    zh: "当前章节正文为空，先补正文后再由 AI 生成修文建议。",
  },
  "novel.chapter_editor.workspace.refresh_reason.generated": {
    vi: "Đã tạo gợi ý chỉnh sửa theo nội dung chương, vị trí trong tập và các vấn đề đang mở.",
    en: "Revision suggestions were generated from the chapter content, volume position, and open issues.",
    zh: "已基于本章内容、卷内定位与开放问题实时生成修文建议。",
  },
  "novel.chapter_editor.workspace.refresh_reason.fallback": {
    vi: "AI chưa hoàn tất chẩn đoán cho chương này. Bạn vẫn có thể tự chọn đoạn hoặc nói trực tiếp muốn sửa gì.",
    en: "The AI has not finished diagnosing this chapter yet. You can still pick a passage manually or tell the AI what to change.",
    zh: "AI 暂未完成本章诊断，你仍可先手动定位片段或直接告诉 AI 怎么改。",
  },
  "novel.snapshot.route.snapshots.loaded": {
    vi: "Đã tải danh sách snapshot.",
    en: "Snapshots loaded.",
    zh: "快照列表已加载。",
  },
  "novel.snapshot.route.snapshot.created": {
    vi: "Đã tạo snapshot.",
    en: "Snapshot created.",
    zh: "快照已创建。",
  },
  "novel.snapshot.route.snapshot.restored": {
    vi: "Đã khôi phục từ snapshot.",
    en: "Snapshot restored.",
    zh: "快照已恢复。",
  },
  "novel.snapshot.route.characters.loaded": {
    vi: "Đã tải danh sách nhân vật.",
    en: "Characters loaded.",
    zh: "角色列表已加载。",
  },
  "novel.snapshot.route.character.created": {
    vi: "Đã tạo nhân vật.",
    en: "Character created.",
    zh: "角色已创建。",
  },
  "novel.snapshot.route.character.updated": {
    vi: "Đã cập nhật nhân vật.",
    en: "Character updated.",
    zh: "角色已更新。",
  },
  "novel.snapshot.route.character.deleted": {
    vi: "Đã xóa nhân vật.",
    en: "Character deleted.",
    zh: "角色已删除。",
  },
  "novel.snapshot.route.character_timeline.loaded": {
    vi: "Đã tải dòng thời gian nhân vật.",
    en: "Character timeline loaded.",
    zh: "角色时间线已加载。",
  },
  "novel.snapshot.route.character_timelines.synced": {
    vi: "Đã đồng bộ toàn bộ dòng thời gian nhân vật.",
    en: "Character timelines synced.",
    zh: "角色时间线已同步。",
  },
  "novel.snapshot.route.character_timeline.synced": {
    vi: "Đã đồng bộ dòng thời gian nhân vật.",
    en: "Character timeline synced.",
    zh: "角色时间线已同步。",
  },
  "novel.snapshot.route.character.evolved": {
    vi: "Đã cập nhật tiến hóa nhân vật.",
    en: "Character evolved.",
    zh: "角色演化已完成。",
  },
  "novel.snapshot.route.world_check.completed": {
    vi: "Đã hoàn tất kiểm tra nhân vật với thế giới.",
    en: "World check completed.",
    zh: "世界检查已完成。",
  },
  "novel.character_dynamics.route.overview.loaded": {
    vi: "Đã tải tổng quan động lực nhân vật.",
    en: "Character dynamics overview loaded.",
    zh: "角色动态总览已加载。",
  },
  "novel.character_dynamics.route.candidates.loaded": {
    vi: "Đã tải danh sách ứng viên nhân vật.",
    en: "Character candidates loaded.",
    zh: "角色候选已加载。",
  },
  "novel.character_dynamics.route.candidate.confirmed": {
    vi: "Đã xác nhận ứng viên nhân vật.",
    en: "Character candidate confirmed.",
    zh: "角色候选已确认。",
  },
  "novel.character_dynamics.route.candidate.merged": {
    vi: "Đã gộp ứng viên nhân vật.",
    en: "Character candidate merged.",
    zh: "角色候选已合并。",
  },
  "novel.character_dynamics.route.dynamic_state.updated": {
    vi: "Đã cập nhật trạng thái động của nhân vật.",
    en: "Character dynamic state updated.",
    zh: "角色动态状态已更新。",
  },
  "novel.character_dynamics.route.relation_stage.updated": {
    vi: "Đã cập nhật giai đoạn quan hệ nhân vật.",
    en: "Character relation stage updated.",
    zh: "角色关系阶段已更新。",
  },
  "novel.character_dynamics.route.rebuilt": {
    vi: "Đã dựng lại động lực nhân vật.",
    en: "Character dynamics rebuilt.",
    zh: "角色动态已重建。",
  },
  "title.route.library.loaded": {
    vi: "Đã tải thư viện tiêu đề.",
    en: "Title library loaded.",
    zh: "标题库加载成功。",
  },
  "title.route.created": {
    vi: "Đã thêm tiêu đề vào thư viện.",
    en: "Title added to library.",
    zh: "标题已加入标题库。",
  },
  "title.route.generated": {
    vi: "Đã tạo tiêu đề từ xưởng tiêu đề.",
    en: "Title workshop generation completed.",
    zh: "标题工坊生成成功。",
  },
  "title.route.usage.updated": {
    vi: "Đã cập nhật số lần dùng tiêu đề.",
    en: "Title usage count updated.",
    zh: "标题使用次数已更新。",
  },
  "title.route.deleted": {
    vi: "Đã xóa tiêu đề.",
    en: "Title deleted.",
    zh: "标题已删除。",
  },
  "bookAnalysis.route.list.loaded": {
    vi: "Đã tải danh sách phân tích sách.",
    en: "Book analyses loaded.",
    zh: "拆书分析列表已加载。",
  },
  "bookAnalysis.route.created": {
    vi: "Đã tạo bản phân tích sách.",
    en: "Book analysis created.",
    zh: "拆书分析已创建。",
  },
  "bookAnalysis.route.not_found": {
    vi: "Không tìm thấy bản phân tích sách.",
    en: "Book analysis not found.",
    zh: "未找到拆书分析。",
  },
  "bookAnalysis.route.loaded": {
    vi: "Đã tải bản phân tích sách.",
    en: "Book analysis loaded.",
    zh: "拆书分析已加载。",
  },
  "bookAnalysis.route.rebuild.queued": {
    vi: "Đã đưa tác vụ dựng lại phân tích sách vào hàng đợi.",
    en: "Book analysis rebuild queued.",
    zh: "拆书分析重建任务已入队。",
  },
  "bookAnalysis.route.copied": {
    vi: "Đã sao chép bản phân tích sách.",
    en: "Book analysis copied.",
    zh: "拆书分析已复制。",
  },
  "bookAnalysis.route.published": {
    vi: "Đã phát hành phân tích sách sang kho tri thức của truyện.",
    en: "Book analysis published to novel knowledge.",
    zh: "拆书分析已发布到小说知识库。",
  },
  "bookAnalysis.route.section.optimize_preview.generated": {
    vi: "Đã tạo bản xem trước tối ưu cho mục phân tích sách.",
    en: "Book analysis section optimize preview generated.",
    zh: "拆书分析分节优化预览已生成。",
  },
  "bookAnalysis.route.section.regeneration.queued": {
    vi: "Đã đưa tác vụ tạo lại mục phân tích sách vào hàng đợi.",
    en: "Book analysis section regeneration queued.",
    zh: "拆书分析分节重生成任务已入队。",
  },
  "bookAnalysis.route.section.updated": {
    vi: "Đã cập nhật mục phân tích sách.",
    en: "Book analysis section updated.",
    zh: "拆书分析分节已更新。",
  },
  "bookAnalysis.route.updated": {
    vi: "Đã cập nhật bản phân tích sách.",
    en: "Book analysis updated.",
    zh: "拆书分析已更新。",
  },
  "bookAnalysis.error.not_found": {
    vi: "Không tìm thấy bản phân tích sách.",
    en: "Book analysis not found.",
    zh: "未找到拆书分析。",
  },
  "bookAnalysis.error.section_not_found": {
    vi: "Không tìm thấy mục phân tích sách.",
    en: "Book analysis section not found.",
    zh: "未找到拆书分析分节。",
  },
  "bookAnalysis.error.not_found_after_resume": {
    vi: "Không tìm thấy bản phân tích sách sau khi tiếp tục.",
    en: "Book analysis not found after resume.",
    zh: "恢复后仍未找到拆书分析。",
  },
  "bookAnalysis.error.not_found_after_creation": {
    vi: "Không tìm thấy bản phân tích sách sau khi tạo.",
    en: "Book analysis not found after creation.",
    zh: "创建后仍未找到拆书分析。",
  },
  "bookAnalysis.error.not_found_after_copy": {
    vi: "Không tìm thấy bản phân tích sách sau khi sao chép.",
    en: "Book analysis not found after copy.",
    zh: "复制后仍未找到拆书分析。",
  },
  "bookAnalysis.error.not_found_after_rebuild": {
    vi: "Không tìm thấy bản phân tích sách sau khi dựng lại.",
    en: "Book analysis not found after rebuild.",
    zh: "重建后仍未找到拆书分析。",
  },
  "bookAnalysis.error.not_found_after_cancel": {
    vi: "Không tìm thấy bản phân tích sách sau khi hủy.",
    en: "Book analysis not found after cancel.",
    zh: "取消后仍未找到拆书分析。",
  },
  "bookAnalysis.error.not_found_after_section_regeneration": {
    vi: "Không tìm thấy bản phân tích sách sau khi tạo lại mục.",
    en: "Book analysis not found after section regeneration.",
    zh: "分节重生成后仍未找到拆书分析。",
  },
  "bookAnalysis.error.not_found_after_section_update": {
    vi: "Không tìm thấy bản phân tích sách sau khi cập nhật mục.",
    en: "Book analysis not found after section update.",
    zh: "分节更新后仍未找到拆书分析。",
  },
  "bookAnalysis.error.not_found_after_status_update": {
    vi: "Không tìm thấy bản phân tích sách sau khi cập nhật trạng thái.",
    en: "Book analysis not found after status update.",
    zh: "状态更新后仍未找到拆书分析。",
  },
  "bookAnalysis.error.resume_requires_queued_or_running": {
    vi: "Chỉ có thể tiếp tục các bản phân tích sách đang chờ hoặc đang chạy.",
    en: "Only queued or running analyses can be resumed.",
    zh: "只有排队中或运行中的拆书分析才能继续。",
  },
  "bookAnalysis.error.retry_requires_failed_or_cancelled": {
    vi: "Chỉ có thể thử lại các bản phân tích sách đã thất bại hoặc đã hủy.",
    en: "Only failed or cancelled analyses can be retried.",
    zh: "只有失败或已取消的拆书分析才能重试。",
  },
  "bookAnalysis.error.cancel_archived_forbidden": {
    vi: "Không thể hủy bản phân tích sách đã lưu trữ.",
    en: "Archived book analysis cannot be cancelled.",
    zh: "已归档的拆书分析不能取消。",
  },
  "bookAnalysis.error.cancel_requires_queued_or_running": {
    vi: "Chỉ có thể hủy các bản phân tích sách đang chờ hoặc đang chạy.",
    en: "Only queued or running analyses can be cancelled.",
    zh: "只有排队中或运行中的拆书分析才能取消。",
  },
  "bookAnalysis.error.copy_archived_forbidden": {
    vi: "Không thể sao chép bản phân tích sách đã lưu trữ.",
    en: "Archived book analysis cannot be copied.",
    zh: "已归档的拆书分析不能复制。",
  },
  "bookAnalysis.error.rebuild_archived_forbidden": {
    vi: "Không thể dựng lại bản phân tích sách đã lưu trữ.",
    en: "Archived book analysis cannot be rebuilt.",
    zh: "已归档的拆书分析不能重建。",
  },
  "bookAnalysis.error.regenerate_archived_forbidden": {
    vi: "Không thể tạo lại mục của bản phân tích sách đã lưu trữ.",
    en: "Archived book analysis cannot be regenerated.",
    zh: "已归档的拆书分析分节不能重生成。",
  },
  "bookAnalysis.error.regenerate_frozen_forbidden": {
    vi: "Hãy bỏ khóa mục này trước khi tạo lại.",
    en: "Frozen sections cannot be regenerated until unfrozen.",
    zh: "冻结分节需先解冻后才能重生成。",
  },
  "bookAnalysis.error.optimize_archived_forbidden": {
    vi: "Không thể tối ưu mục của bản phân tích sách đã lưu trữ.",
    en: "Archived book analysis cannot be optimized.",
    zh: "已归档的拆书分析分节不能优化。",
  },
  "bookAnalysis.error.optimize_frozen_forbidden": {
    vi: "Hãy bỏ khóa mục này trước khi tối ưu.",
    en: "Frozen sections cannot be optimized until unfrozen.",
    zh: "冻结分节需先解冻后才能优化。",
  },
  "bookAnalysis.error.publish_archived_forbidden": {
    vi: "Không thể phát hành bản phân tích sách đã lưu trữ.",
    en: "Archived book analysis cannot be published.",
    zh: "已归档的拆书分析不能发布。",
  },
  "bookAnalysis.error.publishable_content_required": {
    vi: "Bản phân tích sách hiện chưa có nội dung có thể phát hành.",
    en: "Book analysis has no publishable content.",
    zh: "当前拆书分析没有可发布内容。",
  },
  "bookAnalysis.error.knowledge_document_not_found": {
    vi: "Không tìm thấy tài liệu tri thức nguồn cho bản phân tích sách.",
    en: "Knowledge document not found.",
    zh: "未找到知识文档。",
  },
  "bookAnalysis.error.knowledge_document_archived_forbidden": {
    vi: "Không thể phân tích tài liệu tri thức đã lưu trữ.",
    en: "Archived knowledge documents cannot be analyzed.",
    zh: "已归档的知识文档不能用于拆书分析。",
  },
  "bookAnalysis.error.knowledge_document_version_not_found": {
    vi: "Không tìm thấy phiên bản tài liệu tri thức cho bản phân tích sách.",
    en: "Knowledge document version not found.",
    zh: "未找到知识文档版本。",
  },
  "bookAnalysis.error.document_version_content_empty": {
    vi: "Phiên bản tài liệu tri thức hiện chưa có nội dung để phân tích.",
    en: "Knowledge document version content is empty.",
    zh: "知识文档版本内容为空。",
  },
  "bookAnalysis.error.custom_provider_model_required": {
    vi: "Nhà cung cấp tùy chỉnh cần chỉ rõ model cho phân tích sách.",
    en: "Custom provider requires an explicit model for book analysis.",
    zh: "自定义提供商在拆书分析中必须显式指定模型。",
  },
  "bookAnalysis.error.invalid_json_object": {
    vi: "Không phát hiện được đối tượng JSON hợp lệ.",
    en: "No valid JSON object was detected.",
    zh: "未检测到有效的 JSON 对象。",
  },
  "bookAnalysis.error.section_generation_failed": {
    vi: "Ít nhất một mục phân tích sách đã tạo thất bại.",
    en: "At least one book analysis section failed.",
    zh: "至少有一个拆书分析分节生成失败。",
  },
  "bookAnalysis.error.run_failed": {
    vi: "Bản phân tích sách đã thất bại khi chạy.",
    en: "Book analysis failed.",
    zh: "拆书分析执行失败。",
  },
  "bookAnalysis.error.section_regeneration_failed": {
    vi: "Tạo lại mục phân tích sách thất bại.",
    en: "Section regeneration failed.",
    zh: "拆书分析分节重生成失败。",
  },
  "bookAnalysis.watchdog.manual_recovery_required": {
    vi: "Tác vụ đã tạm dừng sau khi dịch vụ khởi động lại, hãy tiếp tục thủ công nếu vẫn muốn chạy tiếp.",
    en: "The task paused after the service restarted. Resume it manually if you still want to continue.",
    zh: "服务重启后任务已暂停，如仍需继续，请手动恢复。",
  },
  "bookAnalysis.watchdog.heartbeat_timeout": {
    vi: "Tác vụ phân tích sách đã quá thời gian heartbeat.",
    en: "The book analysis task timed out on heartbeat.",
    zh: "拆书分析任务心跳超时。",
  },
  "novel.chapter_summary.route.generated": {
    vi: "Đã tạo tóm tắt chương.",
    en: "Chapter summary generated.",
    zh: "章节摘要生成成功。",
  },
  "novel.chapter_summary.error.chapter_not_found": {
    vi: "Không tìm thấy chương.",
    en: "Chapter not found.",
    zh: "章节不存在。",
  },
  "novel.chapter_summary.fallback.empty_content": {
    vi: "Hiện chưa có nội dung để tóm tắt.",
    en: "There is no content to summarize yet.",
    zh: "暂无可总结正文。",
  },
  "novel.framing.route.suggestion.generated": {
    vi: "Đã tạo gợi ý framing cấp sách.",
    en: "Book framing suggestion generated.",
    zh: "书级 framing 建议已生成。",
  },
  "validation.title_library_brief_required": {
    vi: "Xưởng tiêu đề tự do cần brief sáng tác.",
    en: "Free-form title workshop requires a creative brief.",
    zh: "自由标题工坊需要创作简报。",
  },
  "validation.title_library_reference_title_required": {
    vi: "Chế độ chuyển thể cần một tiêu đề tham chiếu.",
    en: "Adaptation mode requires a reference title.",
    zh: "改编模式需要参考标题。",
  },
  "validation.book_analysis_section_update_requires_field": {
    vi: "Hãy cung cấp ít nhất một trường cần cập nhật.",
    en: "Provide at least one field to update.",
    zh: "至少提供一个更新字段。",
  },
  "validation.book_framing_requires_title_or_description": {
    vi: "Hãy nhập ít nhất tên sách hoặc một câu mô tả ngắn.",
    en: "Enter at least a title or a one-line summary.",
    zh: "请至少填写书名或一句话概述。",
  },
  "character.route.list.loaded": {
    vi: "Đã tải danh sách nhân vật cơ sở.",
    en: "Base character list loaded.",
    zh: "基础角色列表已加载。",
  },
  "character.route.created": {
    vi: "Đã tạo nhân vật cơ sở.",
    en: "Base character created.",
    zh: "基础角色已创建。",
  },
  "character.route.not_found": {
    vi: "Không tìm thấy nhân vật.",
    en: "Character not found.",
    zh: "角色不存在。",
  },
  "character.route.detail.loaded": {
    vi: "Đã tải chi tiết nhân vật.",
    en: "Character detail loaded.",
    zh: "角色详情已加载。",
  },
  "character.route.updated": {
    vi: "Đã cập nhật nhân vật.",
    en: "Character updated.",
    zh: "角色已更新。",
  },
  "character.route.deleted": {
    vi: "Đã xóa nhân vật.",
    en: "Character deleted.",
    zh: "角色已删除。",
  },
  "character.route.generated": {
    vi: "AI đã tạo nhân vật thành công.",
    en: "AI character generation completed.",
    zh: "AI 角色生成成功。",
  },
  "character.route.generated_with_fallback": {
    vi: "AI đã tạo nhân vật xong, nhưng đã dùng cơ chế tự phục hồi vì đầu ra mô hình có lỗi.",
    en: "AI character generation completed with automatic fallback due to malformed model output.",
    zh: "AI 角色生成完成（模型输出异常，已自动回退）。",
  },
  "character.error.constraint_story_function_category_conflict": {
    vi: "Ràng buộc bị xung đột: loại vai trò \"{{category}}\" không khớp với chức năng cốt truyện \"{{storyFunction}}\".",
    en: "Constraint conflict: role category \"{{category}}\" does not match story function \"{{storyFunction}}\".",
    zh: "约束冲突：角色类别“{{category}}”与故事功能位“{{storyFunction}}”不一致。",
  },
  "character.generate.default_genre": {
    vi: "chung",
    en: "general",
    zh: "通用",
  },
  "character.generate.story_function.protagonist": {
    vi: "Nhân vật chính",
    en: "Protagonist",
    zh: "主角",
  },
  "character.generate.story_function.antagonist": {
    vi: "Phản diện",
    en: "Antagonist",
    zh: "反派",
  },
  "character.generate.story_function.mentor": {
    vi: "Người dẫn dắt",
    en: "Mentor",
    zh: "导师",
  },
  "character.generate.story_function.foil": {
    vi: "Nhóm đối chiếu",
    en: "Foil",
    zh: "对照组",
  },
  "character.generate.story_function.supporting": {
    vi: "Nhân vật phụ",
    en: "Supporting character",
    zh: "配角",
  },
  "character.generate.growth_stage.start": {
    vi: "Khởi điểm",
    en: "Starting point",
    zh: "起点",
  },
  "character.generate.growth_stage.setback": {
    vi: "Giai đoạn vấp ngã",
    en: "Setback",
    zh: "受挫",
  },
  "character.generate.growth_stage.turning_point": {
    vi: "Bước ngoặt",
    en: "Turning point",
    zh: "转折",
  },
  "character.generate.growth_stage.awakening": {
    vi: "Thức tỉnh",
    en: "Awakening",
    zh: "觉醒",
  },
  "character.generate.growth_stage.resolution": {
    vi: "Khép lại",
    en: "Resolution",
    zh: "收束",
  },
  "character.generate.stage.skeleton": {
    vi: "khung nhân vật",
    en: "character skeleton",
    zh: "角色骨架",
  },
  "character.generate.stage.final": {
    vi: "nhân vật hoàn chỉnh",
    en: "final character",
    zh: "最终角色",
  },
  "character.generate.error.parse_failed": {
    vi: "Đầu ra mô hình có lỗi: không thể phân tích ở bước {{stageLabel}}.",
    en: "Model output was malformed: unable to parse the {{stageLabel}} step.",
    zh: "模型输出异常：无法解析 {{stageLabel}} 阶段。",
  },
  "character.generate.constraints.none": {
    vi: "Chưa có",
    en: "None",
    zh: "无",
  },
  "character.generate.constraints.label.story_function": {
    vi: "Chức năng cốt truyện",
    en: "Story function",
    zh: "角色功能位",
  },
  "character.generate.constraints.label.external_goal": {
    vi: "Mục tiêu bề mặt",
    en: "External goal",
    zh: "外显目标",
  },
  "character.generate.constraints.label.internal_need": {
    vi: "Nhu cầu bên trong",
    en: "Internal need",
    zh: "内在需求",
  },
  "character.generate.constraints.label.core_fear": {
    vi: "Nỗi sợ cốt lõi",
    en: "Core fear",
    zh: "核心恐惧",
  },
  "character.generate.constraints.label.moral_bottom_line": {
    vi: "Giới hạn đạo đức",
    en: "Moral bottom line",
    zh: "道德底线",
  },
  "character.generate.constraints.label.secret": {
    vi: "Bí mật",
    en: "Secret",
    zh: "秘密",
  },
  "character.generate.constraints.label.core_flaw": {
    vi: "Khuyết điểm cốt lõi",
    en: "Core flaw",
    zh: "核心缺陷",
  },
  "character.generate.constraints.label.relationship_hooks": {
    vi: "Móc nối quan hệ",
    en: "Relationship hooks",
    zh: "关系钩子",
  },
  "character.generate.constraints.label.growth_stage": {
    vi: "Chặng phát triển",
    en: "Growth stage",
    zh: "成长阶段",
  },
  "character.generate.constraints.label.tone_style": {
    vi: "Tông giọng",
    en: "Tone style",
    zh: "风格语气",
  },
  "character.generate.final.label.core_persona": {
    vi: "Hạt nhân tính cách",
    en: "Core persona",
    zh: "核心人格",
  },
  "character.generate.final.label.surface_temperament": {
    vi: "Khí chất bề mặt",
    en: "Surface temperament",
    zh: "外显气质",
  },
  "character.generate.final.label.core_drive": {
    vi: "Động lực cốt lõi",
    en: "Core drive",
    zh: "核心驱动力",
  },
  "character.generate.final.label.behavior_patterns": {
    vi: "Mẫu hành vi",
    en: "Behavior patterns",
    zh: "行为模式",
  },
  "character.generate.final.label.emotional_triggers": {
    vi: "Điểm kích hoạt cảm xúc",
    en: "Emotional triggers",
    zh: "情绪触发点",
  },
  "character.generate.final.label.social_mask": {
    vi: "Mặt nạ xã hội",
    en: "Social mask",
    zh: "社会伪装",
  },
  "character.generate.final.label.origin": {
    vi: "Xuất phát điểm",
    en: "Origin",
    zh: "出身起点",
  },
  "character.generate.final.label.relationship_network": {
    vi: "Mạng lưới quan hệ",
    en: "Relationship network",
    zh: "关系网络",
  },
  "character.generate.final.label.secret": {
    vi: "Bí mật",
    en: "Secret",
    zh: "秘密",
  },
  "character.generate.final.label.core_flaw": {
    vi: "Khuyết điểm cốt lõi",
    en: "Core flaw",
    zh: "核心缺陷",
  },
  "character.generate.final.label.cost": {
    vi: "Cái giá phải trả",
    en: "Cost",
    zh: "代价",
  },
  "character.generate.final.label.body": {
    vi: "Thể hình",
    en: "Body",
    zh: "体态",
  },
  "character.generate.final.label.facial_features": {
    vi: "Nét nhận diện",
    en: "Facial features",
    zh: "面部识别点",
  },
  "character.generate.final.label.style_signature": {
    vi: "Dấu ấn phong cách",
    en: "Style signature",
    zh: "风格标记",
  },
  "character.generate.final.label.aura_voice": {
    vi: "Khí chất và giọng điệu",
    en: "Aura and voice",
    zh: "气场与声音",
  },
  "character.generate.final.label.daily_anchors": {
    vi: "Neo sinh hoạt",
    en: "Daily anchors",
    zh: "日常锚点",
  },
  "character.generate.final.label.habitual_actions": {
    vi: "Thói quen hành động",
    en: "Habitual actions",
    zh: "习惯动作",
  },
  "character.generate.final.label.speech_style": {
    vi: "Cách nói chuyện",
    en: "Speech style",
    zh: "说话风格",
  },
  "character.generate.final.label.talents": {
    vi: "Năng lực nổi bật",
    en: "Talents",
    zh: "能力优势",
  },
  "character.generate.final.default_name": {
    vi: "Nhân vật chưa đặt tên",
    en: "Unnamed character",
    zh: "未命名角色",
  },
  "character.generate.final.default.core_persona": {
    vi: "phức hợp nhưng biết kiềm chế",
    en: "complex yet restrained",
    zh: "复杂但克制",
  },
  "character.generate.final.default.surface_temperament": {
    vi: "điềm tĩnh và biết kiểm soát",
    en: "calm and controlled",
    zh: "冷静克制",
  },
  "character.generate.final.default.core_drive": {
    vi: "mong được thấu hiểu và có chỗ thuộc về",
    en: "needs understanding and belonging",
    zh: "渴望被理解与被接纳",
  },
  "character.generate.final.default.social_mask": {
    vi: "giữ vẻ ổn định trước người khác nhưng tự siết mình khi ở một mình",
    en: "appears steady in public but tightens inward when alone",
    zh: "在人前保持稳定，在独处时不断自我收紧",
  },
  "character.generate.final.default.origin_from_description": {
    vi: "được rút ra từ mô tả ban đầu: {{description}}",
    en: "derived from the original description: {{description}}",
    zh: "基于原始描述推导：{{description}}",
  },
  "character.generate.final.default.relationship_network": {
    vi: "gắn chặt với tuyến nhân vật nòng cốt và dễ bị quan hệ chi phối",
    en: "tied closely to the core cast and strongly shaped by relationships",
    zh: "与核心角色群绑定紧密，容易被关系牵动",
  },
  "character.generate.final.default.secret": {
    vi: "giấu một sự thật đủ sức làm thay đổi thế cân bằng hiện tại",
    en: "hides a truth capable of reshaping the current balance",
    zh: "藏着足以改写现有平衡的一段真相",
  },
  "character.generate.final.default.development": {
    vi: "trục trưởng thành còn cần tiếp tục mở rộng",
    en: "the growth arc still needs to be expanded",
    zh: "成长弧线仍需继续展开",
  },
  "character.generate.final.default.core_flaw": {
    vi: "càng bị ép càng dễ tự siết mình và đưa ra quyết định quá tay",
    en: "tends to over-tighten and overreact under pressure",
    zh: "越被压迫越容易把自己逼得过紧并做出过度决策",
  },
  "character.generate.final.default.cost": {
    vi: "nếu đi sai một bước có thể đánh mất người quan trọng hoặc vị thế đang giữ",
    en: "one wrong step could cost them key relationships or their current footing",
    zh: "一步走错就可能失去重要之人或当前立足点",
  },
  "character.generate.final.default.body": {
    vi: "thân hình gọn nhưng luôn căng như đang sẵn sàng phản ứng",
    en: "a compact build that always looks ready to react",
    zh: "身形利落，始终带着随时应变的紧绷感",
  },
  "character.generate.final.default.facial_features": {
    vi: "ánh mắt sắc và đường nét đủ rõ để người khác khó quên",
    en: "sharp eyes and memorable facial definition",
    zh: "目光锐利，五官辨识度高",
  },
  "character.generate.final.default.style_signature": {
    vi: "ăn mặc thiên về công năng nhưng luôn giữ một dấu ấn nhận diện cố định",
    en: "dresses for utility while keeping one recurring signature detail",
    zh: "穿着偏功能化，但始终保留一个固定识别标记",
  },
  "character.generate.final.default.aura_voice": {
    vi: "giọng trầm, tiết chế và tạo cảm giác áp lực ngay khi xuất hiện",
    en: "a restrained low voice with immediate pressure on arrival",
    zh: "声音偏低而克制，出场就带压迫感",
  },
  "character.generate.final.default.interests": {
    vi: "Giữ nhịp sống bằng những thói quen cố định, phản ứng có tính kỷ luật và ưu tiên các kỹ năng thực dụng có thể dùng ngay khi tình hình căng lên.",
    en: "Maintains rhythm through fixed routines, disciplined reactions, and practical skills that can be applied the moment pressure rises.",
    zh: "靠固定习惯维持生活节奏，反应有纪律性，并优先依赖一上压力就能立刻调用的实用能力。",
  },
  "character.generate.final.default.key_events": {
    vi: "bị kéo vào áp lực chính; một bí mật hoặc quan hệ trọng yếu bị lật ra; buộc phải đưa ra lựa chọn mang tính bước ngoặt",
    en: "pulled into the main pressure; a secret or key relationship is exposed; forced into a decisive turning choice",
    zh: "被卷入主压力场；秘密或关键关系被掀开；被迫做出决定性选择",
  },
  "character.generate.final.default.tag.inner_tension": {
    vi: "căng thẳng nội tại",
    en: "inner tension",
    zh: "内在张力",
  },
  "character.generate.final.default.tag.relationship_pressure": {
    vi: "áp lực quan hệ",
    en: "relationship pressure",
    zh: "关系压力",
  },
  "genre.route.tree.loaded": {
    vi: "Đã tải cây thể loại.",
    en: "Genre tree loaded.",
    zh: "类型树已加载。",
  },
  "genre.route.created": {
    vi: "Đã tạo thể loại.",
    en: "Genre created.",
    zh: "类型已创建。",
  },
  "genre.route.generated": {
    vi: "AI đã tạo bản nháp cây thể loại.",
    en: "AI genre tree draft generated.",
    zh: "AI 类型树生成成功。",
  },
  "genre.route.updated": {
    vi: "Đã cập nhật thể loại.",
    en: "Genre updated.",
    zh: "类型已更新。",
  },
  "genre.route.deleted": {
    vi: "Đã xóa thể loại.",
    en: "Genre deleted.",
    zh: "类型已删除。",
  },
  "genre.error.name_required": {
    vi: "Tên thể loại không được để trống.",
    en: "Genre name cannot be empty.",
    zh: "类型名称不能为空。",
  },
  "genre.error.max_depth_exceeded": {
    vi: "Cây thể loại chỉ hỗ trợ tối đa 3 cấp.",
    en: "The genre tree supports at most 3 levels.",
    zh: "类型树最多支持 3 级结构。",
  },
  "genre.error.duplicate_name_same_level": {
    vi: "Có tên thể loại bị trùng ở cùng một cấp: {{name}}.",
    en: "Duplicate genre name exists on the same level: {{name}}.",
    zh: "同一级下存在重复的类型名称：{{name}}。",
  },
  "genre.error.not_found": {
    vi: "Không tìm thấy thể loại.",
    en: "Genre not found.",
    zh: "类型不存在。",
  },
  "genre.error.bound_novels_prevent_delete": {
    vi: "Cây thể loại này đang được tiểu thuyết sử dụng; hãy gỡ liên kết trước khi xóa.",
    en: "This genre tree is still bound to novels. Unbind them before deleting.",
    zh: "当前题材基底树已绑定小说，请先解绑相关小说后再删除。",
  },
  "genre.error.parent_not_found": {
    vi: "Không tìm thấy thể loại cha.",
    en: "Parent genre not found.",
    zh: "父级类型不存在。",
  },
  "genre.error.duplicate_name_same_parent": {
    vi: "Đã có thể loại trùng tên dưới cùng một thể loại cha.",
    en: "A genre with the same name already exists under the same parent.",
    zh: "同一父级下已存在相同名称的类型。",
  },
  "genre.error.cannot_move_to_descendant": {
    vi: "Không thể chuyển thể loại vào chính cây con của nó.",
    en: "A genre cannot be moved into its own subtree.",
    zh: "不能把类型移动到自己的子树下。",
  },
  "storyMode.route.tree.loaded": {
    vi: "Đã tải cây chế độ truyện.",
    en: "Story mode tree loaded.",
    zh: "流派模式树已加载。",
  },
  "storyMode.route.created": {
    vi: "Đã tạo chế độ truyện.",
    en: "Story mode created.",
    zh: "流派模式已创建。",
  },
  "storyMode.route.children.created": {
    vi: "Đã tạo hàng loạt nhánh con của chế độ truyện.",
    en: "Story mode child nodes created in batch.",
    zh: "批量创建流派模式子类成功。",
  },
  "storyMode.route.generated": {
    vi: "AI đã tạo bản nháp cây chế độ truyện.",
    en: "AI story mode tree draft generated.",
    zh: "AI 流派模式树草稿生成成功。",
  },
  "storyMode.route.children.generated": {
    vi: "AI đã tạo bản nháp nhánh con của chế độ truyện.",
    en: "AI story mode child drafts generated.",
    zh: "AI 流派模式子类草稿生成成功。",
  },
  "storyMode.route.updated": {
    vi: "Đã cập nhật chế độ truyện.",
    en: "Story mode updated.",
    zh: "流派模式已更新。",
  },
  "storyMode.route.deleted": {
    vi: "Đã xóa chế độ truyện.",
    en: "Story mode deleted.",
    zh: "流派模式已删除。",
  },
  "storyMode.error.name_required": {
    vi: "Tên chế độ truyện không được để trống.",
    en: "Story mode name cannot be empty.",
    zh: "流派模式名称不能为空。",
  },
  "storyMode.error.max_depth_exceeded": {
    vi: "Cây chế độ truyện chỉ hỗ trợ tối đa 2 cấp.",
    en: "The story mode tree supports at most 2 levels.",
    zh: "流派模式树最多只支持两级结构。",
  },
  "storyMode.error.duplicate_name_same_level": {
    vi: "Có tên chế độ truyện bị trùng ở cùng một cấp: {{name}}.",
    en: "Duplicate story mode name exists on the same level: {{name}}.",
    zh: "同一层下存在重复的流派模式名称：{{name}}。",
  },
  "storyMode.error.parent_required": {
    vi: "Bắt buộc phải chỉ định chế độ truyện cha.",
    en: "A parent story mode is required.",
    zh: "父级流派模式不能为空。",
  },
  "storyMode.error.children_required": {
    vi: "Cần ít nhất một nhánh con chế độ truyện để tạo.",
    en: "At least one story mode child is required.",
    zh: "至少需要一个待创建的流派模式子类。",
  },
  "storyMode.error.duplicate_child_name_in_batch": {
    vi: "Có tên nhánh con bị trùng trong lô tạo: {{name}}.",
    en: "Duplicate child story mode name exists in the batch: {{name}}.",
    zh: "待创建子类中存在重复名称：{{name}}。",
  },
  "storyMode.error.duplicate_name_same_parent_with_name": {
    vi: "Đã có chế độ truyện trùng tên dưới cùng một nút cha: {{name}}.",
    en: "A story mode with the same name already exists under the same parent: {{name}}.",
    zh: "同一父级下已存在相同名称的流派模式：{{name}}。",
  },
  "storyMode.error.not_found": {
    vi: "Không tìm thấy chế độ truyện.",
    en: "Story mode not found.",
    zh: "流派模式不存在。",
  },
  "storyMode.error.cannot_move_branch_to_other_parent": {
    vi: "Không thể chuyển một nhánh có con sang cha khác vì sẽ vượt quá giới hạn cấp.",
    en: "A branch with children cannot be moved to another parent because it would exceed the depth limit.",
    zh: "带子节点的流派模式不能移动到其他父类下，否则会超过两级结构。",
  },
  "storyMode.error.bound_novels_prevent_delete": {
    vi: "Cây chế độ truyện này đang được tiểu thuyết sử dụng; hãy gỡ liên kết trước khi xóa.",
    en: "This story mode tree is still referenced by novels. Unbind them before deleting.",
    zh: "当前推进模式树已被小说引用，请先解绑相关小说后再删除。",
  },
  "storyMode.error.novel_not_found": {
    vi: "Không tìm thấy tiểu thuyết.",
    en: "Novel not found.",
    zh: "小说不存在。",
  },
  "storyMode.error.parent_not_found": {
    vi: "Không tìm thấy chế độ truyện cha.",
    en: "Parent story mode not found.",
    zh: "父级流派模式不存在。",
  },
  "storyMode.error.only_root_accepts_children": {
    vi: "Cây chế độ truyện chỉ hỗ trợ 2 cấp, nên chỉ nút gốc mới được nhận nhánh con.",
    en: "The story mode tree supports only 2 levels, so only root nodes can accept children.",
    zh: "流派模式树最多两级，只能挂在根节点下面。",
  },
  "storyMode.error.duplicate_name_same_parent": {
    vi: "Đã có chế độ truyện trùng tên dưới cùng một nút cha.",
    en: "A story mode with the same name already exists under the same parent.",
    zh: "同一父级下已存在相同名称的流派模式。",
  },
  "storyMode.error.cannot_move_to_descendant": {
    vi: "Không thể chuyển chế độ truyện vào chính cây con của nó.",
    en: "A story mode cannot be moved into its own subtree.",
    zh: "不能把流派模式移动到自己的子树下。",
  },
  "writingFormula.route.list.loaded": {
    vi: "Đã tải danh sách công thức viết.",
    en: "Writing formula list loaded.",
    zh: "获取写作公式列表成功。",
  },
  "writingFormula.route.not_found": {
    vi: "Không tìm thấy công thức viết.",
    en: "Writing formula not found.",
    zh: "写作公式不存在。",
  },
  "writingFormula.route.detail.loaded": {
    vi: "Đã tải chi tiết công thức viết.",
    en: "Writing formula detail loaded.",
    zh: "获取写作公式详情成功。",
  },
  "writingFormula.route.deleted": {
    vi: "Đã xóa công thức viết.",
    en: "Writing formula deleted.",
    zh: "删除写作公式成功。",
  },
  "novel.decision.route.list.loaded": {
    vi: "Đã tải danh sách quyết định sáng tác.",
    en: "Creative decisions loaded.",
    zh: "创作决策已加载。",
  },
  "novel.decision.route.created": {
    vi: "Đã tạo quyết định sáng tác.",
    en: "Creative decision created.",
    zh: "创作决策已创建。",
  },
  "novel.decision.route.updated": {
    vi: "Đã cập nhật quyết định sáng tác.",
    en: "Creative decision updated.",
    zh: "创作决策已更新。",
  },
  "novel.decision.route.deleted": {
    vi: "Đã xóa quyết định sáng tác.",
    en: "Creative decision deleted.",
    zh: "创作决策已删除。",
  },
  "novel.decision.route.batch_invalidated": {
    vi: "Đã vô hiệu hàng loạt quyết định sáng tác.",
    en: "Creative decisions invalidated in batch.",
    zh: "创作决策已批量失效。",
  },
  "novel.decision.error.not_found": {
    vi: "Không tìm thấy quyết định sáng tác.",
    en: "Creative decision not found.",
    zh: "未找到创作决策。",
  },
  "health.route.ok": {
    vi: "Dịch vụ đang hoạt động bình thường.",
    en: "Service is healthy.",
    zh: "服务运行正常。",
  },
  "agentCatalog.route.loaded": {
    vi: "Đã tải danh mục năng lực.",
    en: "Agent capability catalog loaded.",
    zh: "能力目录加载成功。",
  },
  "astrology.route.not_implemented": {
    vi: "Mô-đun chiêm tinh hiện chưa được triển khai.",
    en: "The astrology module is not implemented yet.",
    zh: "占星模块暂未实现。",
  },
  "validation.writing_formula_requires_formula_source": {
    vi: "Phải cung cấp `formulaId` hoặc `formulaContent`.",
    en: "Either `formulaId` or `formulaContent` is required.",
    zh: "必须提供 formulaId 或 formulaContent。",
  },
  "novel.character_preparation.route.relations.loaded": {
    vi: "Đã tải danh sách quan hệ nhân vật.",
    en: "Character relation list loaded.",
    zh: "角色关系列表已加载。",
  },
  "novel.character_preparation.route.cast_options.loaded": {
    vi: "Đã tải các phương án dàn nhân vật.",
    en: "Character cast options loaded.",
    zh: "角色阵容方案已加载。",
  },
  "novel.character_preparation.route.cast_options.generated": {
    vi: "Đã tạo các phương án dàn nhân vật.",
    en: "Character cast options generated.",
    zh: "角色阵容方案已生成。",
  },
  "novel.character_preparation.route.cast_option.applied": {
    vi: "Đã áp dụng phương án dàn nhân vật.",
    en: "Character cast option applied.",
    zh: "角色阵容方案已应用。",
  },
  "novel.character_preparation.route.supplemental_candidates.generated": {
    vi: "Đã tạo các ứng viên nhân vật bổ sung.",
    en: "Supplemental character candidates generated.",
    zh: "补充角色候选已生成。",
  },
  "novel.character_preparation.route.supplemental_character.created": {
    vi: "Đã tạo nhân vật bổ sung.",
    en: "Supplemental character created.",
    zh: "补充角色已创建。",
  },
  "novel.character_preparation.route.cast_option.deleted": {
    vi: "Đã xóa phương án dàn nhân vật.",
    en: "Character cast option deleted.",
    zh: "角色阵容方案已删除。",
  },
  "novel.character_preparation.route.cast_options.cleared": {
    vi: "Đã xóa toàn bộ phương án dàn nhân vật.",
    en: "Character cast options cleared.",
    zh: "角色阵容方案已清空。",
  },
  "styleEngine.route.profiles.loaded": {
    vi: "Đã tải danh sách tài sản phong cách viết.",
    en: "Style profile list loaded.",
    zh: "获取写法资产列表成功。",
  },
  "styleEngine.route.profile.created": {
    vi: "Đã tạo tài sản phong cách viết.",
    en: "Style profile created.",
    zh: "创建写法资产成功。",
  },
  "styleEngine.route.profile.created_from_book_analysis": {
    vi: "Đã tạo phong cách viết từ phân tích sách.",
    en: "Style profile created from book analysis.",
    zh: "从拆书生成写法成功。",
  },
  "styleEngine.route.profile.created_from_template": {
    vi: "Đã tạo phong cách viết từ mẫu.",
    en: "Style profile created from template.",
    zh: "从模板创建写法成功。",
  },
  "styleEngine.route.profile.created_from_brief": {
    vi: "AI đã tạo phong cách viết từ brief.",
    en: "AI style profile created from brief.",
    zh: "AI 生成写法成功。",
  },
  "styleEngine.route.profile.not_found": {
    vi: "Không tìm thấy tài sản phong cách viết.",
    en: "Style profile not found.",
    zh: "写法资产不存在。",
  },
  "styleEngine.route.profile.loaded": {
    vi: "Đã tải chi tiết tài sản phong cách viết.",
    en: "Style profile detail loaded.",
    zh: "获取写法资产详情成功。",
  },
  "styleEngine.route.profile.updated": {
    vi: "Đã cập nhật tài sản phong cách viết.",
    en: "Style profile updated.",
    zh: "更新写法资产成功。",
  },
  "styleEngine.route.profile.deleted": {
    vi: "Đã xóa tài sản phong cách viết.",
    en: "Style profile deleted.",
    zh: "删除写法资产成功。",
  },
  "styleEngine.route.test_write.completed": {
    vi: "Đã hoàn tất đoạn viết thử.",
    en: "Trial writing completed.",
    zh: "试写完成。",
  },
  "styleEngine.route.templates.loaded": {
    vi: "Đã tải các mẫu phong cách viết.",
    en: "Style templates loaded.",
    zh: "获取模板成功。",
  },
  "styleEngine.route.anti_ai_rules.loaded": {
    vi: "Đã tải các quy tắc anti-AI.",
    en: "Anti-AI rules loaded.",
    zh: "获取反AI规则成功。",
  },
  "styleEngine.route.anti_ai_rule.created": {
    vi: "Đã tạo quy tắc anti-AI.",
    en: "Anti-AI rule created.",
    zh: "创建反AI规则成功。",
  },
  "styleEngine.route.anti_ai_rule.updated": {
    vi: "Đã cập nhật quy tắc anti-AI.",
    en: "Anti-AI rule updated.",
    zh: "更新反AI规则成功。",
  },
  "styleEngine.route.bindings.loaded": {
    vi: "Đã tải các liên kết phong cách viết.",
    en: "Style bindings loaded.",
    zh: "获取写法绑定成功。",
  },
  "styleEngine.route.binding.created": {
    vi: "Đã tạo liên kết phong cách viết.",
    en: "Style binding created.",
    zh: "创建写法绑定成功。",
  },
  "styleEngine.route.binding.deleted": {
    vi: "Đã xóa liên kết phong cách viết.",
    en: "Style binding deleted.",
    zh: "删除写法绑定成功。",
  },
  "styleEngine.route.recommendation.generated": {
    vi: "Đã tạo gợi ý phong cách viết.",
    en: "Style recommendation generated.",
    zh: "写法推荐已生成。",
  },
  "styleEngine.route.detection.completed": {
    vi: "Đã hoàn tất kiểm tra phong cách viết.",
    en: "Style detection completed.",
    zh: "写法检测完成。",
  },
  "styleEngine.route.rewrite.completed": {
    vi: "Đã hoàn tất sửa phong cách viết.",
    en: "Style rewrite completed.",
    zh: "写法修正完成。",
  },
  "styleEngineExtraction.route.extraction.completed": {
    vi: "Đã trích xuất đặc trưng phong cách viết từ văn bản.",
    en: "Text style feature extraction completed.",
    zh: "文本写法特征提取完成。",
  },
  "styleEngineExtraction.route.profile.created_from_text": {
    vi: "Đã tạo phong cách viết từ văn bản.",
    en: "Style profile created from text.",
    zh: "从文本提取写法成功。",
  },
  "styleEngineExtraction.route.profile.created_from_extraction": {
    vi: "Đã tạo tài sản phong cách viết từ bộ đặc trưng đã chọn.",
    en: "Style profile created from selected extraction features.",
    zh: "已按特征选择生成写法资产。",
  },
  "validation.style_engine_update_requires_field": {
    vi: "Hãy cung cấp ít nhất một trường cần cập nhật.",
    en: "Provide at least one field to update.",
    zh: "至少提供一个更新字段。",
  },
  "validation.api_url_invalid": {
    vi: "URL API không hợp lệ.",
    en: "API URL is invalid.",
    zh: "API 地址无效。",
  },
  "validation.structured_fallback_requires_provider_model": {
    vi: "Khi bật mô hình dự phòng cho đầu ra có cấu trúc, `provider` và `model` không được để trống.",
    en: "When structured fallback is enabled, `provider` and `model` cannot be empty.",
    zh: "启用结构化备用模型时，provider 和 model 不能为空。",
  },
  "rag.route.reindex.queued": {
    vi: "Đã đưa các tác vụ lập chỉ mục lại RAG vào hàng đợi.",
    en: "RAG reindex jobs queued.",
    zh: "RAG 重建索引任务已加入队列。",
  },
  "rag.route.jobs.loaded": {
    vi: "Đã tải danh sách tác vụ RAG.",
    en: "RAG job list loaded.",
    zh: "RAG 任务列表已加载。",
  },
  "rag.route.health.ok": {
    vi: "Kiểm tra sức khỏe RAG đã thông qua.",
    en: "RAG health check passed.",
    zh: "RAG 健康检查通过。",
  },
  "rag.route.health.failed": {
    vi: "Kiểm tra sức khỏe RAG thất bại.",
    en: "RAG health check failed.",
    zh: "RAG 健康检查失败。",
  },
  "image.route.generation_task.queued": {
    vi: "Đã đưa tác vụ tạo ảnh vào hàng đợi.",
    en: "Image generation task queued.",
    zh: "图片生成任务已加入队列。",
  },
  "image.route.prompt.optimized": {
    vi: "Đã tối ưu prompt tạo ảnh.",
    en: "Image prompt optimized.",
    zh: "图片提示词已优化。",
  },
  "image.route.task.loaded": {
    vi: "Đã tải tác vụ ảnh.",
    en: "Image task loaded.",
    zh: "图片任务已加载。",
  },
  "image.route.assets.loaded": {
    vi: "Đã tải tài sản ảnh.",
    en: "Image assets loaded.",
    zh: "图片资源已加载。",
  },
  "image.route.asset.deleted": {
    vi: "Đã xóa tài sản ảnh.",
    en: "Image asset deleted.",
    zh: "图片资源已删除。",
  },
  "image.route.asset.primary_updated": {
    vi: "Đã cập nhật ảnh chính.",
    en: "Primary image updated.",
    zh: "主图片已更新。",
  },
  "image.error.character_only_supported_phase_one": {
    vi: "Giai đoạn hiện tại chỉ hỗ trợ tạo ảnh nhân vật.",
    en: "Only character image generation is supported in the current phase.",
    zh: "当前阶段仅支持角色图片生成。",
  },
  "image.error.provider_not_supported_yet": {
    vi: "Nhà cung cấp `{{provider}}` hiện chưa hỗ trợ tạo ảnh.",
    en: "Provider `{{provider}}` is not supported for image generation yet.",
    zh: "提供商 `{{provider}}` 暂不支持图片生成。",
  },
  "image.error.base_character_not_found": {
    vi: "Không tìm thấy nhân vật cơ sở.",
    en: "Base character not found.",
    zh: "未找到基础角色。",
  },
  "image.error.task_not_found": {
    vi: "Không tìm thấy tác vụ ảnh.",
    en: "Image task not found.",
    zh: "未找到图片任务。",
  },
  "image.error.retry_only_failed_or_cancelled": {
    vi: "Chỉ có thể thử lại tác vụ ảnh đã thất bại hoặc đã hủy.",
    en: "Only failed or cancelled image tasks can be retried.",
    zh: "只有失败或已取消的图片任务才能重试。",
  },
  "image.error.cancel_only_queued_or_running": {
    vi: "Chỉ có thể hủy tác vụ ảnh đang xếp hàng hoặc đang chạy.",
    en: "Only queued or running image tasks can be cancelled.",
    zh: "只有排队中或运行中的图片任务可以取消。",
  },
  "image.error.asset_not_found": {
    vi: "Không tìm thấy tài sản ảnh.",
    en: "Image asset not found.",
    zh: "未找到图片资源。",
  },
  "image.error.asset_missing_base_character_id": {
    vi: "Tài sản ảnh này đang thiếu `baseCharacterId`.",
    en: "This image asset is missing `baseCharacterId`.",
    zh: "该图片资源缺少 `baseCharacterId`。",
  },
  "image.error.paused_after_restart": {
    vi: "Tác vụ đã tạm dừng sau khi dịch vụ khởi động lại và đang chờ khôi phục thủ công.",
    en: "The task was paused after a service restart and is waiting for manual recovery.",
    zh: "服务重启后任务已暂停，等待手动恢复。",
  },
  "image.error.resume_only_queued_or_running": {
    vi: "Chỉ có thể tiếp tục tác vụ ảnh đang xếp hàng hoặc đang chạy.",
    en: "Only queued or running image tasks can be resumed.",
    zh: "只有排队中或运行中的图片任务可以恢复。",
  },
  "image.error.unknown_generation_failed": {
    vi: "Tạo ảnh thất bại do lỗi không xác định.",
    en: "Image generation failed due to an unknown error.",
    zh: "图片生成因未知错误失败。",
  },
  "llm.route.providers.loaded": {
    vi: "Đã tải cấu hình mô hình.",
    en: "Model configuration loaded.",
    zh: "模型配置已加载。",
  },
  "llm.route.model_routes.loaded": {
    vi: "Đã tải cấu hình định tuyến mô hình.",
    en: "Model route configuration loaded.",
    zh: "模型路由配置已加载。",
  },
  "llm.route.model_routes.connectivity_completed": {
    vi: "Đã hoàn tất kiểm tra kết nối định tuyến mô hình.",
    en: "Model route connectivity check completed.",
    zh: "模型路由连通性检测完成。",
  },
  "llm.route.structured_fallback.loaded": {
    vi: "Đã tải cấu hình mô hình dự phòng cho đầu ra có cấu trúc.",
    en: "Structured fallback model configuration loaded.",
    zh: "结构化备用模型配置已加载。",
  },
  "llm.route.structured_fallback.updated": {
    vi: "Đã cập nhật cấu hình mô hình dự phòng cho đầu ra có cấu trúc.",
    en: "Structured fallback model configuration updated.",
    zh: "结构化备用模型配置已更新。",
  },
  "llm.route.model_routes.updated": {
    vi: "Đã cập nhật định tuyến mô hình.",
    en: "Model routes updated.",
    zh: "模型路由已更新。",
  },
  "llm.route.connectivity_test.completed": {
    vi: "Đã hoàn tất kiểm tra kết nối mô hình và khả năng xuất dữ liệu có cấu trúc.",
    en: "Model connectivity and structured-output compatibility test completed.",
    zh: "模型连通性与结构化兼容性测试已完成。",
  },
  "llm.error.provider_api_key_missing": {
    vi: "Nhà cung cấp mô hình hiện chưa được cấu hình API key.",
    en: "The model provider does not have an API key configured.",
    zh: "该模型提供商尚未配置 API Key。",
  },
  "llm.error.provider_model_missing": {
    vi: "Nhà cung cấp mô hình hiện chưa được cấu hình mô hình mặc định.",
    en: "The model provider does not have a default model configured.",
    zh: "该模型提供商尚未配置默认模型。",
  },
  "llm.error.provider_base_url_missing": {
    vi: "Nhà cung cấp mô hình hiện chưa được cấu hình API URL.",
    en: "The model provider does not have an API URL configured.",
    zh: "该模型提供商尚未配置 API URL。",
  },
  "llm.error.connectivity_test_failed": {
    vi: "Kiểm tra kết nối mô hình thất bại.",
    en: "Model connectivity test failed.",
    zh: "模型连通性测试失败。",
  },
  "settings.route.rag.loaded": {
    vi: "Đã tải thiết lập RAG.",
    en: "RAG settings loaded.",
    zh: "RAG 设置已加载。",
  },
  "settings.route.rag.saved": {
    vi: "Đã lưu thiết lập RAG.",
    en: "RAG settings saved.",
    zh: "RAG 设置已保存。",
  },
  "settings.route.rag.saved_and_reindex_queued": {
    vi: "Đã lưu thiết lập RAG và đưa {{count}} tác vụ lập chỉ mục lại vào hàng đợi.",
    en: "RAG settings saved and {{count}} reindex job(s) queued.",
    zh: "RAG 设置已保存，并已加入 {{count}} 个重建索引任务。",
  },
  "settings.route.rag.saved_reindex_skipped_disabled": {
    vi: "Đã lưu thiết lập RAG. Hệ thống bỏ qua lập chỉ mục lại vì RAG hiện đang tắt.",
    en: "RAG settings saved. Reindex was skipped because RAG is currently disabled.",
    zh: "RAG 设置已保存。由于 RAG 当前已禁用，系统跳过了重建索引。",
  },
  "settings.route.rag.embedding_models.loaded": {
    vi: "Đã tải các mô hình embedding.",
    en: "Embedding models loaded.",
    zh: "Embedding 模型已加载。",
  },
  "settings.route.providers.loaded": {
    vi: "Đã tải thiết lập nhà cung cấp.",
    en: "Provider settings loaded.",
    zh: "提供商设置已加载。",
  },
  "settings.route.custom_provider.created": {
    vi: "Đã tạo nhà cung cấp tùy chỉnh.",
    en: "Custom provider created.",
    zh: "自定义提供商已创建。",
  },
  "settings.route.custom_provider.created_model_refresh_failed": {
    vi: "Đã tạo nhà cung cấp tùy chỉnh, nhưng làm mới danh sách mô hình thất bại. Bạn có thể thử lại sau.",
    en: "Custom provider created, but refreshing models failed. You can retry later.",
    zh: "自定义提供商已创建，但刷新模型列表失败。你可以稍后再试。",
  },
  "settings.route.custom_provider.deleted": {
    vi: "Đã xóa nhà cung cấp tùy chỉnh.",
    en: "Custom provider deleted.",
    zh: "自定义提供商已删除。",
  },
  "settings.route.provider_balances.loaded": {
    vi: "Đã tải số dư của nhà cung cấp.",
    en: "Provider balances loaded.",
    zh: "提供商余额已加载。",
  },
  "settings.route.provider.saved": {
    vi: "Đã lưu thiết lập nhà cung cấp.",
    en: "Provider settings saved.",
    zh: "提供商设置已保存。",
  },
  "settings.route.provider.saved_model_refresh_failed": {
    vi: "Đã lưu thiết lập nhà cung cấp, nhưng làm mới danh sách mô hình thất bại. Bạn có thể thử lại sau.",
    en: "Provider settings saved, but refreshing models failed. You can retry later.",
    zh: "提供商设置已保存，但刷新模型列表失败。你可以稍后再试。",
  },
  "settings.route.provider_balance.refreshed": {
    vi: "Đã làm mới số dư của nhà cung cấp.",
    en: "Provider balance refreshed.",
    zh: "提供商余额已刷新。",
  },
  "settings.route.provider_models.refreshed": {
    vi: "Đã làm mới danh sách mô hình của nhà cung cấp.",
    en: "Provider models refreshed.",
    zh: "提供商模型已刷新。",
  },
  "settings.error.builtin_provider_delete_forbidden": {
    vi: "Không thể xóa nhà cung cấp có sẵn trong hệ thống.",
    en: "Built-in providers cannot be deleted.",
    zh: "内置提供商不能删除。",
  },
  "settings.error.custom_provider_not_found": {
    vi: "Không tìm thấy nhà cung cấp tùy chỉnh.",
    en: "Custom provider not found.",
    zh: "未找到自定义提供商。",
  },
  "settings.error.reassign_model_route_before_delete": {
    vi: "Hãy gán lại tuyến mô hình `{{taskType}}` trước khi xóa nhà cung cấp này.",
    en: "Reassign model route `{{taskType}}` before deleting this provider.",
    zh: "删除该提供商前，请先重新分配模型路由 `{{taskType}}`。",
  },
  "settings.error.api_key_required": {
    vi: "Cần cung cấp API key.",
    en: "API key is required.",
    zh: "必须提供 API Key。",
  },
  "settings.error.custom_provider_model_required": {
    vi: "Nhà cung cấp tùy chỉnh phải có mô hình mặc định.",
    en: "A default model is required for custom providers.",
    zh: "自定义提供商必须配置默认模型。",
  },
  "settings.error.provider_base_url_required": {
    vi: "Cần cung cấp API URL cho nhà cung cấp hiện tại.",
    en: "An API URL is required for the current provider.",
    zh: "当前提供商必须配置 API URL。",
  },
  "settings.error.custom_provider_base_url_required": {
    vi: "Nhà cung cấp tùy chỉnh phải có API URL.",
    en: "An API URL is required for custom providers.",
    zh: "自定义提供商必须配置 API URL。",
  },
  "settings.error.custom_provider_balance_refresh_unsupported": {
    vi: "Nhà cung cấp tùy chỉnh hiện không hỗ trợ làm mới số dư.",
    en: "Balance refresh is not supported for custom providers.",
    zh: "自定义提供商暂不支持刷新余额。",
  },
  "settings.error.configure_api_key_before_refresh_models": {
    vi: "Hãy cấu hình API key trước khi làm mới danh sách mô hình.",
    en: "Configure an API key before refreshing models.",
    zh: "刷新模型前请先配置 API Key。",
  },
  "settings.error.provider_models_fetch_failed": {
    vi: "Không thể tải danh sách mô hình từ nhà cung cấp hiện tại.",
    en: "Failed to fetch models from the current provider.",
    zh: "无法从当前提供商拉取模型列表。",
  },
  "settings.error.provider_models_empty": {
    vi: "Nhà cung cấp hiện không trả về mô hình nào khả dụng.",
    en: "The current provider did not return any available models.",
    zh: "当前提供商未返回可用模型。",
  },
  "settings.balance.missing_api_key": {
    vi: "Hãy cấu hình API key trước khi kiểm tra số dư.",
    en: "Configure an API key before checking the balance.",
    zh: "请先配置 API Key，再查询余额。",
  },
  "settings.balance.error.request_failed_with_status": {
    vi: "Yêu cầu kiểm tra số dư thất bại (HTTP {{status}}).",
    en: "Balance check request failed (HTTP {{status}}).",
    zh: "余额查询请求失败（HTTP {{status}}）。",
  },
  "settings.balance.error.deepseek_missing_balance": {
    vi: "DeepSeek không trả về thông tin số dư khả dụng.",
    en: "DeepSeek did not return an available balance.",
    zh: "DeepSeek 未返回可用余额信息。",
  },
  "settings.balance.error.siliconflow_missing_balance": {
    vi: "SiliconFlow không trả về thông tin số dư khả dụng.",
    en: "SiliconFlow did not return an available balance.",
    zh: "SiliconFlow 未返回可用余额信息。",
  },
  "settings.balance.error.kimi_missing_balance": {
    vi: "Kimi không trả về thông tin số dư khả dụng.",
    en: "Kimi did not return an available balance.",
    zh: "Kimi 未返回可用余额信息。",
  },
  "settings.balance.deepseek_refreshed": {
    vi: "Đã làm mới số dư từ API chính thức của DeepSeek.",
    en: "Balance refreshed from the official DeepSeek API.",
    zh: "余额已从 DeepSeek 官方接口刷新。",
  },
  "settings.balance.siliconflow_refreshed": {
    vi: "Đã làm mới số dư từ API chính thức của SiliconFlow.",
    en: "Balance refreshed from the official SiliconFlow API.",
    zh: "余额已从 SiliconFlow 官方接口刷新。",
  },
  "settings.balance.kimi_refreshed": {
    vi: "Đã làm mới số dư từ API chính thức của Kimi.",
    en: "Balance refreshed from the official Kimi API.",
    zh: "余额已从 Kimi 官方接口刷新。",
  },
  "settings.balance.unsupported_qwen": {
    vi: "Hệ thống hiện chỉ lưu DashScope API key; tra số dư tài khoản Aliyun cần thêm chứng thực cấp tài khoản nên chưa hỗ trợ đọc trực tiếp.",
    en: "The system currently stores only the DashScope API key. Aliyun balance lookup needs additional account-level credentials and is not supported yet.",
    zh: "当前系统只保存 DashScope API Key；阿里云账户余额查询需要额外的账户级凭证，暂不支持直接读取。",
  },
  "settings.balance.unsupported_provider": {
    vi: "Nhà cung cấp này hiện chưa hỗ trợ truy vấn số dư bằng chương trình.",
    en: "This provider does not support programmatic balance lookup yet.",
    zh: "当前厂商暂未接入可程序化余额查询。",
  },
  "settings.balance.query_failed": {
    vi: "Kiểm tra số dư thất bại.",
    en: "Balance check failed.",
    zh: "余额查询失败。",
  },
  "settings.balance.query_failed_retry_later": {
    vi: "Kiểm tra số dư thất bại, hãy thử lại sau.",
    en: "Balance check failed. Please try again later.",
    zh: "余额查询失败，请稍后重试。",
  },
  "novel.story_macro.route.plan.loaded": {
    vi: "Đã tải quy hoạch vĩ mô của câu chuyện.",
    en: "Story macro plan loaded.",
    zh: "故事宏观规划已加载。",
  },
  "novel.story_macro.route.decomposition.generated": {
    vi: "Đã tạo nguyên mẫu động cơ cốt truyện.",
    en: "Story engine prototype generated.",
    zh: "故事引擎原型已生成。",
  },
  "novel.story_macro.route.constraint_engine.built": {
    vi: "Đã dựng xong bộ ràng buộc.",
    en: "Constraint engine built.",
    zh: "约束引擎已构建。",
  },
  "novel.story_macro.route.plan.saved": {
    vi: "Đã lưu quy hoạch vĩ mô của câu chuyện.",
    en: "Story macro plan saved.",
    zh: "故事宏观规划已保存。",
  },
  "novel.story_macro.route.field.regenerated": {
    vi: "Đã tạo lại trường này.",
    en: "Field regenerated.",
    zh: "字段已重生成。",
  },
  "novel.story_macro.route.state.loaded": {
    vi: "Đã tải trạng thái quy hoạch vĩ mô của câu chuyện.",
    en: "Story macro planning status loaded.",
    zh: "故事宏观规划状态已加载。",
  },
  "novel.story_macro.route.state.updated": {
    vi: "Đã cập nhật trạng thái quy hoạch vĩ mô của câu chuyện.",
    en: "Story macro planning status updated.",
    zh: "故事宏观规划状态已更新。",
  },
  "story_macro.prompt.project_context.title": {
    vi: "Tên dự án",
    en: "Project title",
    zh: "项目标题",
  },
  "story_macro.prompt.project_context.genre": {
    vi: "Thể loại định trước",
    en: "Preset genre",
    zh: "预设题材",
  },
  "story_macro.prompt.project_context.framing": {
    vi: "Framing cấp sách",
    en: "Book framing",
    zh: "书级 framing",
  },
  "story_macro.prompt.project_context.style": {
    vi: "Xu hướng văn phong",
    en: "Style tendency",
    zh: "风格倾向",
  },
  "story_macro.prompt.project_context.pov": {
    vi: "Điểm nhìn trần thuật",
    en: "Narrative POV",
    zh: "叙事人称",
  },
  "story_macro.prompt.project_context.pace": {
    vi: "Ưu tiên nhịp độ",
    en: "Pacing preference",
    zh: "节奏偏好",
  },
  "story_macro.prompt.project_context.emotion": {
    vi: "Cường độ cảm xúc",
    en: "Emotional intensity",
    zh: "情绪强度",
  },
  "story_macro.prompt.project_context.chapter_count": {
    vi: "Số chương ước tính",
    en: "Estimated chapter count",
    zh: "预计章节数",
  },
  "chat.route.agent.goal_fallback": {
    vi: "Hãy đưa ra gợi ý sáng tác dựa trên ngữ cảnh hiện tại.",
    en: "Give writing guidance based on the current context.",
    zh: "请根据当前上下文给出写作建议。",
  },
  "chat.route.history.empty": {
    vi: "Lịch sử hiện được lưu ở IndexedDB phía client, nên API này tạm thời trả về mảng rỗng.",
    en: "History is currently stored in the client IndexedDB, so this API temporarily returns an empty array.",
    zh: "当前历史记录由前端 IndexedDB 保存，此接口暂时返回空数组。",
  },
  "chat.error.novel_context_requires_novel_id": {
    vi: "Chế độ ngữ cảnh tiểu thuyết bắt buộc phải có `novelId`.",
    en: "Novel context mode requires `novelId`.",
    zh: "小说上下文模式必须提供 `novelId`。",
  },
  "chat.error.approval_requires_run_id": {
    vi: "Khi xử lý phê duyệt, bắt buộc phải có `runId`.",
    en: "Processing approvals requires `runId`.",
    zh: "处理审批时必须提供 `runId`。",
  },
  "chat.error.agent_run_failed": {
    vi: "Lượt chạy của tác tử thất bại.",
    en: "Agent run failed.",
    zh: "代理运行失败。",
  },
  "chat.error.stream_failed": {
    vi: "Tạo luồng hội thoại thất bại.",
    en: "Chat streaming failed.",
    zh: "对话流式生成失败。",
  },
  "validation.chapter_title_required": {
    vi: "Tiêu đề chương không được để trống.",
    en: "Chapter title cannot be empty.",
    zh: "章节标题不能为空。",
  },
  "validation.character_name_required": {
    vi: "Tên nhân vật không được để trống.",
    en: "Character name cannot be empty.",
    zh: "角色名称不能为空。",
  },
  "validation.character_role_required": {
    vi: "Vai trò nhân vật không được để trống.",
    en: "Character role cannot be empty.",
    zh: "角色定位不能为空。",
  },
  "validation.chapter_range_invalid": {
    vi: "Chương bắt đầu phải nhỏ hơn hoặc bằng chương kết thúc.",
    en: "The starting chapter must be less than or equal to the ending chapter.",
    zh: "起始章节必须小于或等于结束章节。",
  },
  "validation.volume_generation_requires_target_volume": {
    vi: "Khi tạo theo từng tập, bắt buộc phải có tập mục tiêu.",
    en: "Target volume is required for volume-scoped generation.",
    zh: "按卷生成时必须提供目标卷。",
  },
  "validation.single_beat_requires_target_beat_key": {
    vi: "Khi tạo lại danh sách chương theo một nhịp, bắt buộc phải có nhịp mục tiêu.",
    en: "Target beat is required when regenerating chapter titles for a single beat.",
    zh: "按节奏段重生章节标题时必须提供目标节奏段。",
  },
  "validation.chapter_detail_requires_target_volume": {
    vi: "Khi tạo chi tiết chương, bắt buộc phải có tập mục tiêu.",
    en: "Target volume is required for chapter-detail generation.",
    zh: "生成章节细化时必须提供目标卷。",
  },
  "validation.chapter_detail_requires_target_chapter": {
    vi: "Khi tạo chi tiết chương, bắt buộc phải có chương mục tiêu.",
    en: "Target chapter is required for chapter-detail generation.",
    zh: "生成章节细化时必须提供目标章节。",
  },
  "validation.chapter_detail_requires_detail_mode": {
    vi: "Khi tạo chi tiết chương, bắt buộc phải có loại nội dung cần tạo.",
    en: "Detail mode is required for chapter-detail generation.",
    zh: "生成章节细化时必须提供生成类型。",
  },
  "validation.selection_range_invalid": {
    vi: "Vị trí kết thúc vùng chọn phải lớn hơn vị trí bắt đầu.",
    en: "The selection end must be greater than the selection start.",
    zh: "选区结束位置必须大于开始位置。",
  },
  "validation.ai_revision_preset_requires_operation": {
    vi: "Chế độ thao tác dựng sẵn bắt buộc phải có `presetOperation`.",
    en: "Preset revision mode requires `presetOperation`.",
    zh: "预设操作模式必须提供 presetOperation。",
  },
  "validation.ai_revision_freeform_requires_instruction": {
    vi: "Chế độ sửa bằng ngôn ngữ tự nhiên bắt buộc phải có `instruction`.",
    en: "Freeform revision mode requires `instruction`.",
    zh: "自然语言修正模式必须提供 instruction。",
  },
  "validation.ai_revision_selection_required": {
    vi: "Sửa theo đoạn bắt buộc phải có `selection`.",
    en: "Selection-based revision requires `selection`.",
    zh: "片段修正必须提供 selection。",
  },
  "validation.ai_revision_context_required": {
    vi: "Sửa theo đoạn bắt buộc phải có cửa sổ ngữ cảnh.",
    en: "Selection-based revision requires a context window.",
    zh: "片段修正必须提供上下文窗口。",
  },
  "novel.action.generate_structured_outline": {
    vi: "tạo dàn ý có cấu trúc",
    en: "generating a structured outline",
    zh: "生成结构化大纲",
  },
  "novel.action.generate_novel_bible": {
    vi: "tạo bible tiểu thuyết",
    en: "generating the novel bible",
    zh: "生成作品圣经",
  },
  "novel.action.generate_story_beats": {
    vi: "tạo các nhịp cốt truyện",
    en: "generating story beats",
    zh: "生成剧情拍点",
  },
  "novel.action.start_pipeline": {
    vi: "khởi động pipeline chương",
    en: "starting the chapter pipeline",
    zh: "启动批量章节流水",
  },
  "novel.action.run_chapter_pipeline": {
    vi: "chạy pipeline chương",
    en: "running the chapter pipeline",
    zh: "运行章节流水线",
  },
  "novel.action.generate_chapter_content": {
    vi: "tạo nội dung chương",
    en: "generating chapter content",
    zh: "生成章节正文",
  },
  "novel.error.characters_required": {
    vi: "Hãy thêm ít nhất {{minCount}} nhân vật vào tiểu thuyết này trước khi {{action}}.",
    en: "Add at least {{minCount}} characters to this novel before {{action}}.",
    zh: "请先在本小说中至少添加 {{minCount}} 个角色后再{{action}}。",
  },
  "novel.error.base_character_not_found": {
    vi: "Không tìm thấy nhân vật cơ sở.",
    en: "Base character not found.",
    zh: "基础角色不存在。",
  },
  "novel.error.character_not_found": {
    vi: "Không tìm thấy nhân vật.",
    en: "Character not found.",
    zh: "角色不存在。",
  },
  "novel.error.novel_or_character_not_found": {
    vi: "Không tìm thấy tiểu thuyết hoặc nhân vật.",
    en: "Novel or character not found.",
    zh: "小说或角色不存在。",
  },
  "novel.error.not_found": {
    vi: "Không tìm thấy tiểu thuyết.",
    en: "Novel not found.",
    zh: "小说不存在。",
  },
  "novel.error.outline_required_before_structured_outline": {
    vi: "Hãy tạo hướng phát triển của truyện trước khi tạo dàn ý có cấu trúc.",
    en: "Generate the story direction before creating a structured outline.",
    zh: "请先生成小说发展走向。",
  },
  "novel.error.no_chapters_for_pipeline": {
    vi: "Tiểu thuyết hiện chưa có chương. Hãy tạo chương trước khi khởi động pipeline.",
    en: "The current novel has no chapters yet. Create chapters before starting the pipeline.",
    zh: "当前小说还没有章节，请先创建章节后再启动流水线。",
  },
  "novel.error.no_chapters_in_range": {
    vi: "Không có chương nào có thể tạo trong phạm vi đã chọn. Phạm vi hiện có là từ chương {{minOrder}} đến chương {{maxOrder}}.",
    en: "There are no chapters available to generate in the selected range. The current available range is chapter {{minOrder}} to chapter {{maxOrder}}.",
    zh: "指定区间内没有可生成的章节。当前可用章节范围为第 {{minOrder}} 章到第 {{maxOrder}} 章。",
  },
  "novel.error.chapter_for_hook_not_found": {
    vi: "Không tìm thấy chương để tạo hook.",
    en: "No chapter is available for hook generation.",
    zh: "未找到可生成钩子的章节。",
  },
  "novel.export.error.novel_not_found": {
    vi: "Không tìm thấy tiểu thuyết.",
    en: "Novel not found.",
    zh: "小说不存在。",
  },
  "novel.export.error.txt_scope_full_only": {
    vi: "Xuất `TXT` chỉ hỗ trợ xuất toàn bộ nội dung của cả tiểu thuyết.",
    en: "`TXT` export only supports exporting the full novel text.",
    zh: "TXT 导出仅支持整本书正文导出。",
  },
  "novel.export.scope.full": {
    vi: "Toàn bộ tiểu thuyết",
    en: "Full novel",
    zh: "整本书",
  },
  "novel.export.scope.basic": {
    vi: "Thiết lập dự án",
    en: "Project setup",
    zh: "项目设定",
  },
  "novel.export.scope.story_macro": {
    vi: "Quy hoạch vĩ mô câu chuyện",
    en: "Story macro plan",
    zh: "故事宏观规划",
  },
  "novel.export.scope.character": {
    vi: "Chuẩn bị nhân vật",
    en: "Character setup",
    zh: "角色准备",
  },
  "novel.export.scope.outline": {
    vi: "Chiến lược tập / khung tập",
    en: "Volume strategy / skeleton",
    zh: "卷战略 / 卷骨架",
  },
  "novel.export.scope.structured": {
    vi: "Nhịp truyện / tách chương",
    en: "Beat sheets / chapter breakdown",
    zh: "节奏 / 拆章",
  },
  "novel.export.scope.chapter": {
    vi: "Thực thi chương",
    en: "Chapter execution",
    zh: "章节执行",
  },
  "novel.export.scope.pipeline": {
    vi: "Sửa chất lượng",
    en: "Quality repair",
    zh: "质量修复",
  },
  "novel.export.txt.title_line": {
    vi: "{{title}}",
    en: "{{title}}",
    zh: "《{{title}}》",
  },
  "novel.export.txt.description_heading": {
    vi: "Tóm tắt",
    en: "Summary",
    zh: "【简介】",
  },
  "novel.export.txt.empty_chapters": {
    vi: "(Chưa có nội dung chương)",
    en: "(No chapter content yet)",
    zh: "（暂无章节内容）",
  },
  "novel.export.txt.chapter_heading": {
    vi: "Chương {{order}}: {{title}}",
    en: "Chapter {{order}}: {{title}}",
    zh: "第{{order}}章 {{title}}",
  },
  "novel.export.txt.chapter_empty": {
    vi: "(Chương này hiện chưa có nội dung)",
    en: "(This chapter has no content yet)",
    zh: "（本章暂无内容）",
  },
  "novel.export.markdown.title": {
    vi: "Bản xuất: {{title}}",
    en: "Export: {{title}}",
    zh: "{{title}} 导出",
  },
  "novel.export.markdown.scope": {
    vi: "Phạm vi xuất",
    en: "Export scope",
    zh: "导出范围",
  },
  "novel.export.markdown.exported_at": {
    vi: "Thời gian xuất",
    en: "Exported at",
    zh: "导出时间",
  },
  "novel.export.markdown.novel_id": {
    vi: "ID tiểu thuyết",
    en: "Novel ID",
    zh: "小说 ID",
  },
  "novel.export.markdown.empty_summary": {
    vi: "(Hiện chưa có nội dung cấu trúc để tóm tắt)",
    en: "(There is no structured content to summarize yet)",
    zh: "（当前没有可总结的结构化内容）",
  },
  "novel.export.markdown.full_data": {
    vi: "Dữ liệu đầy đủ",
    en: "Full data",
    zh: "完整数据",
  },
  "novel.export.summary.basic.title": {
    vi: "Tiêu đề",
    en: "Title",
    zh: "标题",
  },
  "novel.export.summary.basic.writing_mode": {
    vi: "Chế độ viết",
    en: "Writing mode",
    zh: "写作模式",
  },
  "novel.export.summary.basic.project_mode": {
    vi: "Chế độ dự án",
    en: "Project mode",
    zh: "项目模式",
  },
  "novel.export.summary.basic.genre": {
    vi: "Thể loại",
    en: "Genre",
    zh: "题材",
  },
  "novel.export.summary.basic.primary_story_mode": {
    vi: "Luồng truyện chính",
    en: "Primary story mode",
    zh: "主流派",
  },
  "novel.export.summary.basic.secondary_story_mode": {
    vi: "Luồng truyện phụ",
    en: "Secondary story mode",
    zh: "副流派",
  },
  "novel.export.summary.basic.bound_world": {
    vi: "Thế giới liên kết",
    en: "Bound world",
    zh: "绑定世界",
  },
  "novel.export.summary.basic.estimated_chapter_count": {
    vi: "Số chương dự kiến",
    en: "Estimated chapter count",
    zh: "预计章节数",
  },
  "novel.export.summary.basic.commercial_tags": {
    vi: "Nhãn thương mại",
    en: "Commercial tags",
    zh: "商业标签",
  },
  "novel.export.summary.basic.one_line_description": {
    vi: "Giới thiệu một câu",
    en: "One-line summary",
    zh: "一句话简介",
  },
  "novel.export.summary.basic.target_audience": {
    vi: "Độc giả mục tiêu",
    en: "Target audience",
    zh: "目标读者",
  },
  "novel.export.summary.basic.core_selling_point": {
    vi: "Điểm bán cốt lõi",
    en: "Core selling point",
    zh: "核心卖点",
  },
  "novel.export.summary.basic.competing_feel": {
    vi: "Cảm giác đối sánh",
    en: "Comparable feel",
    zh: "对标感受",
  },
  "novel.export.summary.basic.first30_chapter_promise": {
    vi: "Cam kết 30 chương đầu",
    en: "First 30-chapter promise",
    zh: "前 30 章承诺",
  },
  "novel.export.summary.basic.world_slice_core_frame": {
    vi: "Khung lõi lát cắt thế giới",
    en: "Core world-slice frame",
    zh: "世界切片核心框架",
  },
  "novel.export.summary.story_macro.story_input": {
    vi: "Đầu vào ý tưởng truyện",
    en: "Story input",
    zh: "故事输入",
  },
  "novel.export.summary.story_macro.expanded_premise": {
    vi: "Tiền đề mở rộng",
    en: "Expanded premise",
    zh: "展开前提",
  },
  "novel.export.summary.story_macro.protagonist_core": {
    vi: "Lõi nhân vật chính",
    en: "Protagonist core",
    zh: "主角核心",
  },
  "novel.export.summary.story_macro.conflict_engine": {
    vi: "Động cơ xung đột",
    en: "Conflict engine",
    zh: "冲突引擎",
  },
  "novel.export.summary.story_macro.core_conflict": {
    vi: "Xung đột cốt lõi",
    en: "Core conflict",
    zh: "核心冲突",
  },
  "novel.export.summary.story_macro.main_hook": {
    vi: "Hook chính",
    en: "Main hook",
    zh: "主钩子",
  },
  "novel.export.summary.story_macro.progression_loop": {
    vi: "Vòng lặp phát triển",
    en: "Progression loop",
    zh: "推进循环",
  },
  "novel.export.summary.story_macro.reading_promise": {
    vi: "Cam kết trải nghiệm đọc cấp sách",
    en: "Book-level reading promise",
    zh: "书级阅读承诺",
  },
  "novel.export.summary.story_macro.core_selling_point": {
    vi: "Điểm bán cốt lõi",
    en: "Core selling point",
    zh: "核心售卖点",
  },
  "novel.export.summary.story_macro.escalation_ladder": {
    vi: "Thang leo thang",
    en: "Escalation ladder",
    zh: "升级阶梯",
  },
  "novel.export.summary.story_macro.absolute_red_lines": {
    vi: "Ranh giới cấm tuyệt đối",
    en: "Absolute red lines",
    zh: "绝对红线",
  },
  "novel.export.summary.character.character_count": {
    vi: "Số nhân vật",
    en: "Character count",
    zh: "角色数",
  },
  "novel.export.summary.character.relation_count": {
    vi: "Số quan hệ",
    en: "Relation count",
    zh: "关系数",
  },
  "novel.export.summary.character.cast_option_count": {
    vi: "Số phương án dàn nhân vật",
    en: "Cast option count",
    zh: "候选阵容数",
  },
  "novel.export.summary.character.current_characters": {
    vi: "Nhân vật hiện có",
    en: "Current characters",
    zh: "当前角色",
  },
  "novel.export.summary.outline.source": {
    vi: "Nguồn khung tập",
    en: "Outline source",
    zh: "卷来源",
  },
  "novel.export.summary.outline.volume_count": {
    vi: "Số tập",
    en: "Volume count",
    zh: "卷数",
  },
  "novel.export.summary.outline.recommended_volume_count": {
    vi: "Số tập đề xuất",
    en: "Recommended volume count",
    zh: "推荐卷数",
  },
  "novel.export.summary.outline.derived_outline": {
    vi: "Dàn ý xuất theo tập",
    en: "Derived volume outline",
    zh: "卷级导出大纲",
  },
  "novel.export.summary.outline.reader_reward_ladder": {
    vi: "Thang phần thưởng độc giả",
    en: "Reader reward ladder",
    zh: "读者奖励阶梯",
  },
  "novel.export.summary.outline.escalation_ladder": {
    vi: "Thang leo thang",
    en: "Escalation ladder",
    zh: "升级阶梯",
  },
  "novel.export.summary.outline.strategy_notes": {
    vi: "Ghi chú chiến lược",
    en: "Strategy notes",
    zh: "策略备注",
  },
  "novel.export.summary.outline.critique_summary": {
    vi: "Tóm tắt phản biện",
    en: "Critique summary",
    zh: "批判总结",
  },
  "novel.export.summary.structured.beat_sheet_count": {
    vi: "Số phiếu nhịp truyện",
    en: "Beat sheet count",
    zh: "节拍卡数量",
  },
  "novel.export.summary.structured.chapter_plan_count": {
    vi: "Số kế hoạch chương",
    en: "Chapter plan count",
    zh: "章节规划数",
  },
  "novel.export.summary.structured.rebalance_decision_count": {
    vi: "Số quyết định tái cân bằng",
    en: "Rebalance decision count",
    zh: "重平衡决策数",
  },
  "novel.export.summary.structured.structured_outline": {
    vi: "Dàn ý có cấu trúc",
    en: "Structured outline",
    zh: "结构化大纲",
  },
  "novel.export.summary.chapter.chapter_count": {
    vi: "Tổng số chương",
    en: "Chapter count",
    zh: "章节总数",
  },
  "novel.export.summary.chapter.generated_chapter_count": {
    vi: "Số chương đã có nội dung",
    en: "Generated chapter count",
    zh: "已有正文章节",
  },
  "novel.export.summary.chapter.chapter_plan_count": {
    vi: "Số kế hoạch chương",
    en: "Chapter plan count",
    zh: "章节计划数",
  },
  "novel.export.summary.chapter.chapter_list": {
    vi: "Danh sách chương",
    en: "Chapter list",
    zh: "章节列表",
  },
  "novel.export.summary.chapter.chapter_list_item": {
    vi: "Chương {{order}}: {{title}}",
    en: "Chapter {{order}}: {{title}}",
    zh: "第 {{order}} 章：{{title}}",
  },
  "novel.export.summary.pipeline.overall_quality_score": {
    vi: "Điểm chất lượng tổng thể",
    en: "Overall quality score",
    zh: "总体质量分",
  },
  "novel.export.summary.pipeline.quality_report_count": {
    vi: "Số báo cáo chất lượng",
    en: "Quality report count",
    zh: "质量报告数",
  },
  "novel.export.summary.pipeline.audit_report_count": {
    vi: "Số báo cáo kiểm toán",
    en: "Audit report count",
    zh: "审计报告数",
  },
  "novel.export.summary.pipeline.plot_beat_count": {
    vi: "Số nhịp cốt truyện",
    en: "Plot beat count",
    zh: "情节点数",
  },
  "novel.export.summary.pipeline.payoff_ledger_item_count": {
    vi: "Số mục sổ payoff",
    en: "Payoff ledger item count",
    zh: "伏笔账本项数",
  },
  "novel.export.summary.pipeline.latest_pipeline_status": {
    vi: "Trạng thái pipeline gần nhất",
    en: "Latest pipeline status",
    zh: "最近流水线状态",
  },
  "novel.export.summary.pipeline.bible_raw_content": {
    vi: "Nội dung thô của Bible truyện",
    en: "Raw story bible content",
    zh: "小说圣经原始内容",
  },
  "story_macro.error.novel_not_found": {
    vi: "Không tìm thấy tiểu thuyết.",
    en: "Novel not found.",
    zh: "小说不存在。",
  },
  "story_macro.error.story_input_required": {
    vi: "Ý tưởng truyện không được để trống.",
    en: "Story idea cannot be empty.",
    zh: "故事想法不能为空。",
  },
  "story_macro.error.decomposition_required": {
    vi: "Hãy hoàn tất bước tách rã động cơ truyện trước.",
    en: "Complete the story-engine decomposition first.",
    zh: "请先完成故事引擎拆解。",
  },
  "story_macro.error.field_locked": {
    vi: "Trường này đang bị khóa. Hãy mở khóa trước khi tạo lại.",
    en: "This field is locked. Unlock it before regenerating.",
    zh: "该字段已锁定，请先解锁后再重生成。",
  },
  "story_macro.error.constraint_engine_requires_decomposition": {
    vi: "Hãy hoàn tất bước tách rã động cơ truyện trước khi dựng bộ ràng buộc.",
    en: "Complete the story-engine decomposition before building the constraint engine.",
    zh: "请先完成故事引擎拆解，再构建约束引擎。",
  },
  "story_macro.error.invalid_conflict_layers": {
    vi: "AI chưa trả về đủ các lớp xung đột.",
    en: "The AI did not return a complete set of conflict layers.",
    zh: "AI 未返回完整的冲突层。",
  },
  "story_macro.error.invalid_field_list": {
    vi: "AI chưa trả về danh sách hợp lệ cho trường `{{field}}`.",
    en: "The AI did not return a valid list for `{{field}}`.",
    zh: "AI 未返回有效的 `{{field}}` 列表。",
  },
  "story_macro.error.invalid_field_value": {
    vi: "AI chưa trả về giá trị hợp lệ cho trường `{{field}}`.",
    en: "The AI did not return a valid value for `{{field}}`.",
    zh: "AI 未返回有效的 `{{field}}`。",
  },
  "novel.draft_optimize.error.invalid_json_array": {
    vi: "Không phát hiện được mảng JSON hợp lệ.",
    en: "No valid JSON array was detected.",
    zh: "未检测到有效 JSON 数组。",
  },
  "novel.draft_optimize.error.selected_text_not_found": {
    vi: "Không tìm thấy đoạn đã chọn trong bản nháp hiện tại. Hãy chọn lại rồi thử lại.",
    en: "The selected text could not be found in the current draft. Reselect it and try again.",
    zh: "选中的文本未在当前草稿中找到，请重新选择后再试。",
  },
  "novel.draft_optimize.error.novel_not_found": {
    vi: "Không tìm thấy tiểu thuyết.",
    en: "Novel not found.",
    zh: "小说不存在。",
  },
  "novel.draft_optimize.error.current_draft_required": {
    vi: "Bản nháp hiện tại không được để trống.",
    en: "The current draft cannot be empty.",
    zh: "当前草稿不能为空。",
  },
  "novel.draft_optimize.error.selected_text_required": {
    vi: "Ở chế độ tối ưu theo vùng chọn, bắt buộc phải có `selectedText`.",
    en: "Selection optimization mode requires `selectedText`.",
    zh: "选区优化模式下必须提供 selectedText。",
  },
  "novel.draft_optimize.world_context.section_title": {
    vi: "Ngữ cảnh thế giới",
    en: "World context",
    zh: "世界上下文",
  },
  "novel.draft_optimize.world_context.empty": {
    vi: "Ngữ cảnh thế giới: chưa có",
    en: "World context: none",
    zh: "世界上下文：暂无",
  },
  "novel.draft_optimize.world_context.name": {
    vi: "Tên thế giới",
    en: "World name",
    zh: "世界名称",
  },
  "novel.draft_optimize.world_context.type": {
    vi: "Loại thế giới",
    en: "World type",
    zh: "世界类型",
  },
  "novel.draft_optimize.world_context.summary": {
    vi: "Tóm tắt thế giới",
    en: "World summary",
    zh: "世界简介",
  },
  "novel.draft_optimize.world_context.axioms": {
    vi: "Tiên đề cốt lõi",
    en: "Core axioms",
    zh: "核心公理",
  },
  "novel.draft_optimize.world_context.background": {
    vi: "Bối cảnh",
    en: "Background",
    zh: "背景",
  },
  "novel.draft_optimize.world_context.geography": {
    vi: "Địa lý",
    en: "Geography",
    zh: "地理",
  },
  "novel.draft_optimize.world_context.power_system": {
    vi: "Hệ thống sức mạnh",
    en: "Power system",
    zh: "力量体系",
  },
  "novel.draft_optimize.world_context.politics": {
    vi: "Xã hội và chính trị",
    en: "Society and politics",
    zh: "社会政治",
  },
  "novel.draft_optimize.world_context.races": {
    vi: "Chủng tộc",
    en: "Races",
    zh: "种族",
  },
  "novel.draft_optimize.world_context.religions": {
    vi: "Tôn giáo",
    en: "Religions",
    zh: "宗教",
  },
  "novel.draft_optimize.world_context.technology": {
    vi: "Công nghệ",
    en: "Technology",
    zh: "科技",
  },
  "novel.draft_optimize.world_context.history": {
    vi: "Lịch sử",
    en: "History",
    zh: "历史",
  },
  "novel.draft_optimize.world_context.economy": {
    vi: "Kinh tế",
    en: "Economy",
    zh: "经济",
  },
  "novel.draft_optimize.world_context.factions": {
    vi: "Quan hệ phe phái",
    en: "Faction relations",
    zh: "势力关系",
  },
  "novel.draft_optimize.world_context.conflicts": {
    vi: "Xung đột cốt lõi",
    en: "Core conflicts",
    zh: "核心冲突",
  },
  "novel.draft_optimize.world_context.unspecified": {
    vi: "Chưa chỉ định",
    en: "Not specified",
    zh: "未指定",
  },
  "novel.draft_optimize.world_context.none": {
    vi: "Không có",
    en: "None",
    zh: "无",
  },
  "novel.draft_optimize.character_context.none": {
    vi: "Chưa có",
    en: "None yet",
    zh: "暂无",
  },
  "character_dynamics.error.candidate_not_found": {
    vi: "Không tìm thấy ứng viên nhân vật.",
    en: "Character candidate not found.",
    zh: "角色候选不存在。",
  },
  "character_dynamics.error.merge_target_character_not_found": {
    vi: "Không tìm thấy nhân vật đích để gộp vào.",
    en: "The target character to merge into was not found.",
    zh: "要合并到的角色不存在。",
  },
  "character_dynamics.error.character_not_found": {
    vi: "Không tìm thấy nhân vật.",
    en: "Character not found.",
    zh: "角色不存在。",
  },
  "character_dynamics.error.relation_not_found": {
    vi: "Không tìm thấy quan hệ nhân vật.",
    en: "Character relation not found.",
    zh: "角色关系不存在。",
  },
  "character_dynamics.default_role.new_character": {
    vi: "Nhân vật mới",
    en: "New character",
    zh: "新角色",
  },
  "character_dynamics.decision.confirm_candidate": {
    vi: "Đã xác nhận nhân vật mới: {{characterName}}. Ứng viên nguồn: {{candidateName}}. {{summary}}",
    en: "Confirmed new character: {{characterName}}. Source candidate: {{candidateName}}. {{summary}}",
    zh: "确认新角色：{{characterName}}。来源候选：{{candidateName}}。{{summary}}",
  },
  "character_dynamics.decision.merge_candidate": {
    vi: "Đã gộp ứng viên {{candidateName}} vào {{characterName}}. {{summary}}",
    en: "Merged candidate {{candidateName}} into {{characterName}}. {{summary}}",
    zh: "候选角色 {{candidateName}} 已并入 {{characterName}}。{{summary}}",
  },
  "character_dynamics.decision_segment.current_state": {
    vi: "trạng thái={{value}}",
    en: "state={{value}}",
    zh: "状态={{value}}",
  },
  "character_dynamics.decision_segment.current_goal": {
    vi: "mục tiêu={{value}}",
    en: "goal={{value}}",
    zh: "目标={{value}}",
  },
  "character_dynamics.decision_segment.faction_label": {
    vi: "phe={{value}}",
    en: "faction={{value}}",
    zh: "阵营={{value}}",
  },
  "character_dynamics.decision_segment.role_label": {
    vi: "vai trò theo tập={{value}}",
    en: "volume role={{value}}",
    zh: "卷级身份={{value}}",
  },
  "character_dynamics.decision_segment.responsibility": {
    vi: "trách nhiệm={{value}}",
    en: "responsibility={{value}}",
    zh: "职责={{value}}",
  },
  "character_dynamics.decision.segment_separator": {
    vi: " | ",
    en: " | ",
    zh: "；",
  },
  "character_dynamics.decision.manual_update": {
    vi: "Cập nhật trạng thái động của {{characterName}}: {{segments}}",
    en: "Dynamic state updated for {{characterName}}: {{segments}}",
    zh: "{{characterName}} 动态状态更新：{{segments}}",
  },
  "character_dynamics.decision.relation_stage_updated": {
    vi: "Đã cập nhật giai đoạn quan hệ từ {{sourceName}} sang {{targetName}} thành {{stageLabel}}. {{summary}}",
    en: "Updated the relation stage from {{sourceName}} to {{targetName}} to {{stageLabel}}. {{summary}}",
    zh: "{{sourceName}} -> {{targetName}} 关系阶段更新为 {{stageLabel}}。{{summary}}",
  },
  "world.route.wizard_disabled": {
    vi: "Tính năng world wizard hiện đang tắt.",
    en: "World wizard feature is disabled.",
    zh: "世界向导功能当前已关闭。",
  },
  "world.route.visualization_disabled": {
    vi: "Tính năng trực quan hóa thế giới hiện đang tắt.",
    en: "World visualization feature is disabled.",
    zh: "世界可视化功能当前已关闭。",
  },
  "world.route.templates.loaded": {
    vi: "Đã tải các mẫu thế giới.",
    en: "Templates loaded.",
    zh: "模板已加载。",
  },
  "world.route.inspiration.analyzed": {
    vi: "Đã phân tích cảm hứng thế giới.",
    en: "Inspiration analyzed.",
    zh: "灵感已分析。",
  },
  "world.route.library.loaded": {
    vi: "Đã tải thư viện thế giới.",
    en: "Library loaded.",
    zh: "世界库已加载。",
  },
  "world.route.library_item.created": {
    vi: "Đã tạo mục thư viện thế giới.",
    en: "Library item created.",
    zh: "世界库项目已创建。",
  },
  "world.route.library_item.used": {
    vi: "Đã áp dụng mục thư viện thế giới.",
    en: "Library item used.",
    zh: "世界库项目已使用。",
  },
  "world.route.imported": {
    vi: "Đã nhập thế giới.",
    en: "World imported.",
    zh: "世界设定已导入。",
  },
  "world.route.list.loaded": {
    vi: "Đã tải danh sách thế giới.",
    en: "World list loaded.",
    zh: "世界列表已加载。",
  },
  "world.route.created": {
    vi: "Đã tạo thế giới.",
    en: "World created.",
    zh: "世界设定已创建。",
  },
  "world.route.not_found": {
    vi: "Không tìm thấy thế giới.",
    en: "World not found.",
    zh: "未找到世界设定。",
  },
  "world.route.loaded": {
    vi: "Đã tải chi tiết thế giới.",
    en: "World loaded.",
    zh: "世界设定详情已加载。",
  },
  "world.route.axioms.suggested": {
    vi: "Đã gợi ý các tiên đề thế giới.",
    en: "Axioms suggested.",
    zh: "世界公理建议已生成。",
  },
  "world.route.axioms.updated": {
    vi: "Đã cập nhật các tiên đề thế giới.",
    en: "Axioms updated.",
    zh: "世界公理已更新。",
  },
  "world.route.layers.generated_all": {
    vi: "Đã tạo toàn bộ các lớp thế giới.",
    en: "All layers generated.",
    zh: "全部层级已生成。",
  },
  "world.route.layer.generated": {
    vi: "Đã tạo lớp thế giới.",
    en: "Layer generated.",
    zh: "层级已生成。",
  },
  "world.route.layer.updated": {
    vi: "Đã cập nhật lớp thế giới.",
    en: "Layer updated.",
    zh: "层级已更新。",
  },
  "world.route.layer.confirmed": {
    vi: "Đã xác nhận lớp thế giới.",
    en: "Layer confirmed.",
    zh: "层级已确认。",
  },
  "world.route.deepening.questions.generated": {
    vi: "Đã tạo các câu hỏi đào sâu.",
    en: "Deepening questions generated.",
    zh: "深化问题已生成。",
  },
  "world.route.deepening.answers.integrated": {
    vi: "Đã tích hợp các câu trả lời đào sâu.",
    en: "Answers integrated.",
    zh: "答案已整合。",
  },
  "world.route.consistency.checked": {
    vi: "Đã kiểm tra tính nhất quán.",
    en: "Consistency checked.",
    zh: "一致性检查已完成。",
  },
  "world.route.consistency.issue_status.updated": {
    vi: "Đã cập nhật trạng thái vấn đề nhất quán.",
    en: "Issue status updated.",
    zh: "问题状态已更新。",
  },
  "world.route.overview.loaded": {
    vi: "Đã tải tổng quan thế giới.",
    en: "Overview loaded.",
    zh: "概览已加载。",
  },
  "world.route.visualization.loaded": {
    vi: "Đã tải phần trực quan hóa thế giới.",
    en: "Visualization loaded.",
    zh: "可视化已加载。",
  },
  "world.route.snapshots.loaded": {
    vi: "Đã tải danh sách snapshot.",
    en: "Snapshots loaded.",
    zh: "快照列表已加载。",
  },
  "world.route.snapshot.created": {
    vi: "Đã tạo snapshot.",
    en: "Snapshot created.",
    zh: "快照已创建。",
  },
  "world.route.snapshot.restored": {
    vi: "Đã khôi phục snapshot.",
    en: "Snapshot restored.",
    zh: "快照已恢复。",
  },
  "world.route.snapshot_diff.generated": {
    vi: "Đã tạo diff giữa các snapshot.",
    en: "Snapshot diff generated.",
    zh: "快照差异已生成。",
  },
  "world.route.export.prepared": {
    vi: "Đã chuẩn bị gói dữ liệu xuất.",
    en: "Export payload prepared.",
    zh: "导出载荷已准备。",
  },
  "world.route.knowledge_documents.loaded": {
    vi: "Đã tải tài liệu tri thức của thế giới.",
    en: "World knowledge documents loaded.",
    zh: "世界关联知识文档已加载。",
  },
  "world.route.knowledge_documents.updated": {
    vi: "Đã cập nhật tài liệu tri thức của thế giới.",
    en: "World knowledge documents updated.",
    zh: "世界关联知识文档已更新。",
  },
  "world.route.inspiration.analysis_started.reference": {
    vi: "Đã bắt đầu phân tích tác phẩm tham chiếu.",
    en: "Reference work analysis started.",
    zh: "已开始分析参考作品",
  },
  "world.route.inspiration.analysis_started.inspiration": {
    vi: "Đã bắt đầu phân tích cảm hứng thế giới.",
    en: "World inspiration analysis started.",
    zh: "已开始分析世界灵感",
  },
  "world.route.inspiration.analysis_succeeded.reference": {
    vi: "Đã tạo các neo nguyên tác và hướng phát triển thế giới hư cấu.",
    en: "Original anchors and alternate-world directions generated.",
    zh: "原作锚点与架空方向已生成",
  },
  "world.route.inspiration.analysis_succeeded.inspiration": {
    vi: "Đã tạo thẻ ý tưởng và các tùy chọn thuộc tính.",
    en: "Concept cards and attribute options generated.",
    zh: "概念卡与属性选项已生成",
  },
  "world.route.inspiration.analysis_failed": {
    vi: "Phân tích cảm hứng thế giới thất bại.",
    en: "World inspiration analysis failed.",
    zh: "世界灵感分析失败。",
  },
  "world.route.structure.loaded": {
    vi: "Đã tải thế giới có cấu trúc.",
    en: "Structured world loaded.",
    zh: "结构化世界已加载。",
  },
  "world.route.structure.saved": {
    vi: "Đã lưu thế giới có cấu trúc.",
    en: "Structured world saved.",
    zh: "结构化世界已保存。",
  },
  "world.route.structure.backfilled": {
    vi: "Đã bù dữ liệu cho thế giới có cấu trúc.",
    en: "Structured world backfilled.",
    zh: "结构化世界已回填。",
  },
  "world.route.structure.section_generated": {
    vi: "Đã tạo mục cấu trúc.",
    en: "Structure section generated.",
    zh: "结构部分已生成。",
  },
  "world.route.updated": {
    vi: "Đã cập nhật thế giới.",
    en: "World updated.",
    zh: "世界设定已更新。",
  },
  "world.route.deleted": {
    vi: "Đã xóa thế giới.",
    en: "World deleted.",
    zh: "世界设定已删除。",
  },
  "knowledge.index.failure.check_tasks": {
    vi: "Lập chỉ mục thất bại. Hãy vào danh sách tác vụ để xem chi tiết.",
    en: "Indexing failed. Open the task list for details.",
    zh: "索引任务失败。请到任务列表查看详情。",
  },
  "knowledge.error.target_novel_not_found": {
    vi: "Không tìm thấy tiểu thuyết.",
    en: "Novel not found.",
    zh: "未找到小说。",
  },
  "knowledge.error.target_world_not_found": {
    vi: "Không tìm thấy thế giới.",
    en: "World not found.",
    zh: "未找到世界设定。",
  },
  "knowledge.error.document_not_found_after_creation": {
    vi: "Không tìm thấy tài liệu tri thức sau khi tạo.",
    en: "Knowledge document not found after creation.",
    zh: "创建后未找到知识文档。",
  },
  "knowledge.error.archived_no_new_versions": {
    vi: "Tài liệu tri thức đã lưu trữ thì không thể thêm phiên bản mới.",
    en: "Archived knowledge documents cannot accept new versions.",
    zh: "已归档的知识文档不能新增版本。",
  },
  "knowledge.error.document_not_found_after_version_creation": {
    vi: "Không tìm thấy tài liệu tri thức sau khi tạo phiên bản mới.",
    en: "Knowledge document not found after version creation.",
    zh: "创建版本后未找到知识文档。",
  },
  "knowledge.error.version_not_found": {
    vi: "Không tìm thấy phiên bản tài liệu tri thức.",
    en: "Knowledge document version not found.",
    zh: "未找到知识文档版本。",
  },
  "knowledge.error.document_not_found_after_version_activation": {
    vi: "Không tìm thấy tài liệu tri thức sau khi kích hoạt phiên bản.",
    en: "Knowledge document not found after version activation.",
    zh: "激活版本后未找到知识文档。",
  },
  "knowledge.error.no_active_version": {
    vi: "Tài liệu tri thức hiện chưa có phiên bản đang hoạt động.",
    en: "Knowledge document has no active version.",
    zh: "知识文档没有激活版本。",
  },
  "knowledge.error.archived_no_recall_test": {
    vi: "Tài liệu tri thức đã lưu trữ thì không thể chạy kiểm tra truy hồi.",
    en: "Archived knowledge documents cannot be recall tested.",
    zh: "已归档的知识文档不能执行召回测试。",
  },
  "knowledge.error.recall_requires_index_success": {
    vi: "Chỉ có thể kiểm tra truy hồi sau khi lập chỉ mục thành công.",
    en: "Knowledge document recall test is only available after indexing succeeds.",
    zh: "知识文档召回测试仅在索引成功后可用。",
  },
  "knowledge.error.some_documents_missing_or_archived": {
    vi: "Một số tài liệu tri thức không tồn tại hoặc đã lưu trữ.",
    en: "Some knowledge documents are missing or archived.",
    zh: "部分知识文档不存在或已归档。",
  },
  "knowledge.route.documents.loaded": {
    vi: "Đã tải danh sách tài liệu tri thức.",
    en: "Knowledge documents loaded.",
    zh: "知识文档列表已加载。",
  },
  "knowledge.route.document.created": {
    vi: "Đã tạo tài liệu tri thức.",
    en: "Knowledge document created.",
    zh: "知识文档已创建。",
  },
  "knowledge.route.document.loaded": {
    vi: "Đã tải tài liệu tri thức.",
    en: "Knowledge document loaded.",
    zh: "知识文档已加载。",
  },
  "knowledge.route.version.created": {
    vi: "Đã tạo phiên bản tài liệu tri thức.",
    en: "Knowledge document version created.",
    zh: "知识文档版本已创建。",
  },
  "knowledge.route.version.activated": {
    vi: "Đã kích hoạt phiên bản tài liệu tri thức.",
    en: "Knowledge document version activated.",
    zh: "知识文档版本已激活。",
  },
  "knowledge.route.reindex.queued": {
    vi: "Đã xếp hàng tác vụ lập chỉ mục tài liệu tri thức.",
    en: "Knowledge document reindex queued.",
    zh: "知识文档重建索引任务已入队。",
  },
  "knowledge.route.recall.completed": {
    vi: "Đã hoàn tất kiểm tra truy hồi tài liệu tri thức.",
    en: "Knowledge document recall test completed.",
    zh: "知识文档召回测试已完成。",
  },
  "knowledge.route.document.updated": {
    vi: "Đã cập nhật tài liệu tri thức.",
    en: "Knowledge document updated.",
    zh: "知识文档已更新。",
  },
  "novel.route.knowledge_documents.loaded": {
    vi: "Đã tải tài liệu tri thức của tiểu thuyết.",
    en: "Novel knowledge documents loaded.",
    zh: "小说关联知识文档已加载。",
  },
  "novel.route.knowledge_documents.updated": {
    vi: "Đã cập nhật tài liệu tri thức của tiểu thuyết.",
    en: "Novel knowledge documents updated.",
    zh: "小说关联知识文档已更新。",
  },
  "task.error.not_found": {
    vi: "Không tìm thấy tác vụ.",
    en: "Task not found.",
    zh: "未找到任务。",
  },
  "task.error.not_found_after_retry": {
    vi: "Không tìm thấy tác vụ sau khi thử lại.",
    en: "Task not found after retry.",
    zh: "重试后未找到任务。",
  },
  "task.error.not_found_after_cancellation": {
    vi: "Không tìm thấy tác vụ sau khi hủy.",
    en: "Task not found after cancellation.",
    zh: "取消后未找到任务。",
  },
  "task.error.archive_requires_terminal_status": {
    vi: "Chỉ có thể lưu trữ tác vụ đã hoàn tất, thất bại hoặc đã hủy.",
    en: "Only completed, failed, or cancelled tasks can be archived.",
    zh: "只有已完成、失败或已取消的任务才能归档。",
  },
  "task.bookAnalysis.failure.default": {
    vi: "Tác vụ phân tích sách thất bại nhưng không có bản ghi lỗi rõ ràng.",
    en: "The book analysis task failed without a recorded error.",
    zh: "拆书任务失败，但没有记录明确错误。",
  },
  "task.pipeline.title.range": {
    vi: "{{title}} (chương {{startOrder}}-{{endOrder}})",
    en: "{{title}} (chapters {{startOrder}}-{{endOrder}})",
    zh: "{{title}}（第 {{startOrder}}-{{endOrder}} 章）",
  },
  "task.pipeline.target.range": {
    vi: "Pipeline chương {{startOrder}}-{{endOrder}}",
    en: "Chapter pipeline {{startOrder}}-{{endOrder}}",
    zh: "{{startOrder}}-{{endOrder}}章流水线",
  },
  "task.pipeline.failure.default": {
    vi: "Pipeline chương thất bại nhưng không có bản ghi lỗi rõ ràng.",
    en: "The chapter pipeline failed without a recorded error.",
    zh: "章节流水线失败，但没有记录明确错误。",
  },
  "task.pipeline.notice.quality.display": {
    vi: "Đã hoàn tất nhưng còn cảnh báo chất lượng",
    en: "Completed with quality alerts",
    zh: "已完成，但存在质量预警",
  },
  "task.pipeline.notice.quality.summary": {
    vi: "Một số chương vẫn thấp hơn ngưỡng chất lượng đã cấu hình: {{details}}",
    en: "Some chapters finished below the configured quality threshold: {{details}}",
    zh: "部分章节低于配置的质量阈值：{{details}}",
  },
  "task.pipeline.notice.replan.display": {
    vi: "Đã hoàn tất nhưng cần lập lại kế hoạch",
    en: "Completed with replan required",
    zh: "已完成，但需要重规划",
  },
  "task.pipeline.notice.replan.summary": {
    vi: "Cần lập lại kế hoạch theo trạng thái trước khi tiếp tục: {{details}}",
    en: "State-driven replan is required before continuing: {{details}}",
    zh: "继续前需要先根据当前状态进行重规划：{{details}}",
  },
  "task.pipeline.background.character_dynamics": {
    vi: "Đồng bộ động lực nhân vật",
    en: "Character dynamics syncing",
    zh: "角色动力同步中",
  },
  "task.pipeline.background.state_snapshot": {
    vi: "Đồng bộ ảnh chụp trạng thái",
    en: "State snapshot syncing",
    zh: "状态快照同步中",
  },
  "task.pipeline.background.payoff_ledger": {
    vi: "Đồng bộ sổ payoff",
    en: "Payoff ledger syncing",
    zh: "回收账本同步中",
  },
  "task.pipeline.background.canonical_state": {
    vi: "Đồng bộ trạng thái chuẩn tắc",
    en: "Canonical state syncing",
    zh: "规范状态同步中",
  },
  "task.pipeline.background.with_chapter": {
    vi: "{{label}} (chương {{chapterOrder}})",
    en: "{{label}} (chapter {{chapterOrder}})",
    zh: "{{label}}（第 {{chapterOrder}} 章）",
  },
  "task.pipeline.current_item.with_chapter_order": {
    vi: "Chương {{chapterOrder}} · {{title}} · Lượt {{currentIndex}}/{{totalCount}}",
    en: "Chapter {{chapterOrder}} · {{title}} · Batch {{currentIndex}}/{{totalCount}}",
    zh: "第{{chapterOrder}}章 · {{title}} · 批次 {{currentIndex}}/{{totalCount}}",
  },
  "task.pipeline.current_item.without_chapter_order": {
    vi: "Chương {{currentIndex}}/{{totalCount}} · {{title}}",
    en: "Chapter {{currentIndex}}/{{totalCount}} · {{title}}",
    zh: "第 {{currentIndex}}/{{totalCount}} 章 · {{title}}",
  },
  "task.knowledge.title.delete": {
    vi: "Xóa chỉ mục kho tri thức: {{documentTitle}}",
    en: "Delete knowledge index: {{documentTitle}}",
    zh: "知识库删除：{{documentTitle}}",
  },
  "task.knowledge.title.update": {
    vi: "Cập nhật chỉ mục kho tri thức: {{documentTitle}}",
    en: "Update knowledge index: {{documentTitle}}",
    zh: "知识库更新：{{documentTitle}}",
  },
  "task.knowledge.title.rebuild": {
    vi: "Lập lại chỉ mục kho tri thức: {{documentTitle}}",
    en: "Rebuild knowledge index: {{documentTitle}}",
    zh: "知识库重建：{{documentTitle}}",
  },
  "task.knowledge.document.untitled": {
    vi: "Tài liệu tri thức chưa đặt tên",
    en: "Untitled knowledge document",
    zh: "未命名知识文档",
  },
  "task.knowledge.failure.default": {
    vi: "Lập chỉ mục kho tri thức thất bại nhưng không có bản ghi lỗi rõ ràng.",
    en: "Knowledge indexing failed without a recorded error.",
    zh: "知识库索引失败，但没有记录明确错误。",
  },
  "task.knowledge.failure.cancelled": {
    vi: "Lập chỉ mục kho tri thức đã bị hủy.",
    en: "Knowledge indexing was cancelled.",
    zh: "知识库索引已取消。",
  },
  "task.error.knowledge.retry_requires_terminal_status": {
    vi: "Chỉ có thể thử lại tác vụ chỉ mục tri thức đã thất bại hoặc đã hủy.",
    en: "Only failed or cancelled knowledge index jobs can be retried.",
    zh: "只有失败或已取消的知识索引任务才能重试。",
  },
  "task.error.knowledge.cancel_requires_active_status": {
    vi: "Chỉ có thể hủy tác vụ chỉ mục tri thức đang chờ hoặc đang chạy.",
    en: "Only queued or running knowledge index jobs can be cancelled.",
    zh: "只有排队中或运行中的知识索引任务才能取消。",
  },
  "task.error.knowledge.document_not_found": {
    vi: "Không tìm thấy tài liệu tri thức.",
    en: "Knowledge document not found.",
    zh: "未找到知识文档。",
  },
  "task.image.title.character": {
    vi: "Ảnh nhân vật: {{name}}",
    en: "Character image: {{name}}",
    zh: "角色图像：{{name}}",
  },
  "task.image.title.generic": {
    vi: "Tác vụ hình ảnh {{shortId}}",
    en: "Image task {{shortId}}",
    zh: "图像任务 {{shortId}}",
  },
  "task.image.owner.unlinked": {
    vi: "Chưa liên kết nhân vật",
    en: "No linked character",
    zh: "未关联角色",
  },
  "task.image.failure.default": {
    vi: "Tác vụ hình ảnh thất bại nhưng không có bản ghi lỗi rõ ràng.",
    en: "The image task failed without a recorded error.",
    zh: "图像任务失败，但没有记录明确错误。",
  },
  "task.image.source.base_character": {
    vi: "Nhân vật gốc",
    en: "Base character",
    zh: "基础角色",
  },
  "task.agentRun.title.default": {
    vi: "Lượt chạy tác tử",
    en: "Agent run",
    zh: "Agent run",
  },
  "task.agentRun.owner.novel": {
    vi: "Tiểu thuyết {{novelId}}",
    en: "Novel {{novelId}}",
    zh: "小说 {{novelId}}",
  },
  "task.agentRun.owner.global": {
    vi: "Trò chuyện toàn cục",
    en: "Global chat",
    zh: "全局聊天",
  },
  "task.agentRun.failure.default": {
    vi: "Lượt chạy thất bại nhưng không có bản ghi lỗi rõ ràng.",
    en: "The run failed without a recorded error.",
    zh: "运行失败，但没有记录明确错误。",
  },
  "task.agentRun.failure.waiting_approval": {
    vi: "Lượt chạy hiện đang chờ duyệt.",
    en: "The run is currently waiting for approval.",
    zh: "当前运行在等待审批。",
  },
  "task.agentRun.source.global": {
    vi: "Lượt chạy toàn cục",
    en: "Global run",
    zh: "全局运行",
  },
  "task.agentRun.target.chapter_goal": {
    vi: "Mục tiêu chương",
    en: "Chapter goal",
    zh: "章节目标",
  },
  "task.agentRun.currentStep.planning": {
    vi: "Lập kế hoạch",
    en: "Planning",
    zh: "规划中",
  },
  "task.agentRun.currentStep.executing": {
    vi: "Đang thực thi",
    en: "Executing",
    zh: "执行中",
  },
  "task.agentRun.currentStep.waiting_approval": {
    vi: "Chờ duyệt",
    en: "Waiting for approval",
    zh: "等待审批",
  },
  "task.agentRun.currentStep.completed": {
    vi: "Đã hoàn tất",
    en: "Completed",
    zh: "已完成",
  },
  "task.agentRun.currentStep.failed": {
    vi: "Thất bại",
    en: "Failed",
    zh: "失败",
  },
  "task.agentRun.currentStep.cancelled": {
    vi: "Đã hủy",
    en: "Cancelled",
    zh: "已取消",
  },
  "task.agentRun.currentStep.approval_expired": {
    vi: "Duyệt đã hết hạn",
    en: "Approval expired",
    zh: "审批已过期",
  },
  "task.agentRun.currentStep.approval_inconsistent": {
    vi: "Trạng thái duyệt bất thường",
    en: "Approval state inconsistent",
    zh: "审批状态异常",
  },
  "task.agentRun.currentStep.chapter_generation_completed": {
    vi: "Đã tạo chương xong",
    en: "Chapter generation completed",
    zh: "章节生成完成",
  },
  "taskCenter.bookAnalysis.step.queued": {
    vi: "Đang xếp hàng",
    en: "Queued",
    zh: "排队",
  },
  "taskCenter.bookAnalysis.step.preparing_notes": {
    vi: "Trích xuất ghi chú",
    en: "Extracting notes",
    zh: "提取笔记",
  },
  "taskCenter.bookAnalysis.step.generating_sections": {
    vi: "Tạo từng phần",
    en: "Generating sections",
    zh: "生成章节",
  },
  "taskCenter.bookAnalysis.step.finalizing": {
    vi: "Hoàn tất",
    en: "Finalizing",
    zh: "收尾",
  },
  "taskCenter.novelPipeline.step.queued": {
    vi: "Đang xếp hàng",
    en: "Queued",
    zh: "排队",
  },
  "taskCenter.novelPipeline.step.generating_chapters": {
    vi: "Tạo chương",
    en: "Generating chapters",
    zh: "生成章节",
  },
  "taskCenter.novelPipeline.step.reviewing": {
    vi: "Rà soát",
    en: "Reviewing",
    zh: "审校",
  },
  "taskCenter.novelPipeline.step.repairing": {
    vi: "Sửa lỗi",
    en: "Repairing",
    zh: "修复",
  },
  "taskCenter.novelPipeline.step.finalizing": {
    vi: "Hoàn tất",
    en: "Finalizing",
    zh: "收尾",
  },
  "taskCenter.knowledge.step.queued": {
    vi: "Đang xếp hàng",
    en: "Queued",
    zh: "排队",
  },
  "taskCenter.knowledge.step.loading_source": {
    vi: "Đọc tài liệu",
    en: "Loading source",
    zh: "读取文档",
  },
  "taskCenter.knowledge.step.chunking": {
    vi: "Tách đoạn",
    en: "Chunking",
    zh: "切分分块",
  },
  "taskCenter.knowledge.step.embedding": {
    vi: "Tạo vector",
    en: "Embedding",
    zh: "生成向量",
  },
  "taskCenter.knowledge.step.ensuring_collection": {
    vi: "Kiểm tra collection",
    en: "Ensuring collection",
    zh: "校验集合",
  },
  "taskCenter.knowledge.step.deleting_existing": {
    vi: "Xóa chỉ mục cũ",
    en: "Deleting previous index",
    zh: "清理旧索引",
  },
  "taskCenter.knowledge.step.upserting_vectors": {
    vi: "Ghi vector",
    en: "Upserting vectors",
    zh: "写入向量库",
  },
  "taskCenter.knowledge.step.writing_metadata": {
    vi: "Ghi metadata",
    en: "Writing metadata",
    zh: "写入元数据",
  },
  "taskCenter.knowledge.step.completed": {
    vi: "Hoàn tất",
    en: "Completed",
    zh: "完成",
  },
  "taskCenter.image.step.queued": {
    vi: "Đang xếp hàng",
    en: "Queued",
    zh: "排队",
  },
  "taskCenter.image.step.submitting": {
    vi: "Gửi yêu cầu",
    en: "Submitting request",
    zh: "提交请求",
  },
  "taskCenter.image.step.generating": {
    vi: "Tạo ảnh",
    en: "Generating image",
    zh: "生成图片",
  },
  "taskCenter.image.step.saving_assets": {
    vi: "Lưu tài nguyên",
    en: "Saving assets",
    zh: "保存素材",
  },
  "taskCenter.image.step.finalizing": {
    vi: "Hoàn tất",
    en: "Finalizing",
    zh: "收尾",
  },
} as const satisfies Record<string, LocalizedText>;

export type BackendMessageKey = keyof typeof BACKEND_MESSAGE_CATALOG;

function interpolateLocalizedTemplate(template: string, params?: BackendMessageParams): string {
  if (!params) {
    return template;
  }
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const value = params[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

export function getBackendMessage(
  key: BackendMessageKey,
  params?: BackendMessageParams,
  locale = getRequestLocale(),
): string {
  const language = getBackendLanguage(locale);
  return interpolateLocalizedTemplate(BACKEND_MESSAGE_CATALOG[key][language], params);
}

export function resolveBackendMessageKey(
  key: string,
  params?: BackendMessageParams,
  locale = getRequestLocale(),
): string | null {
  if (!isBackendMessageKey(key)) {
    return null;
  }
  return getBackendMessage(key, params, locale);
}

function isBackendMessageKey(value: string): value is BackendMessageKey {
  return Object.prototype.hasOwnProperty.call(BACKEND_MESSAGE_CATALOG, value);
}

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
  ["validation.title_required", { vi: "Tiêu đề không được để trống.", en: "Title cannot be empty.", zh: "标题不能为空。" }],
  ["标题不能为空。", { vi: "Tiêu đề không được để trống.", en: "Title cannot be empty.", zh: "标题不能为空。" }],
  ["故事想法不能为空。", { vi: "Ý tưởng câu chuyện không được để trống.", en: "Story idea cannot be empty.", zh: "故事想法不能为空。" }],
  ["validation.novel_resource_recommendation_requires_brief", {
    vi: "Cần cung cấp ít nhất một câu mô tả ngắn, điểm bán, chân dung độc giả hoặc thông tin mở truyện tương tự thì hệ thống mới có thể gợi ý tổ hợp tài nguyên.",
    en: "Provide at least a one-line summary, selling point, reader positioning, or similar kickoff information so the system can recommend a resource mix.",
    zh: "至少提供一句话概述、卖点、读者定位或类似开书信息，系统才能推荐资源组合。",
  }],
  ["至少提供一句话概述、卖点、读者定位或类似开书信息，系统才能推荐资源组合。", {
    vi: "Cần cung cấp ít nhất một câu mô tả ngắn, điểm bán, chân dung độc giả hoặc thông tin mở truyện tương tự thì hệ thống mới có thể gợi ý tổ hợp tài nguyên.",
    en: "Provide at least a one-line summary, selling point, reader positioning, or similar kickoff information so the system can recommend a resource mix.",
    zh: "至少提供一句话概述、卖点、读者定位或类似开书信息，系统才能推荐资源组合。",
  }],
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
  ["服务重启后任务已暂停，等待手动恢复。", {
    vi: "Tác vụ đã tạm dừng sau khi dịch vụ khởi động lại, hãy tiếp tục thủ công nếu vẫn muốn chạy tiếp.",
    en: "The task paused after the service restarted. Resume it manually if you still want to continue.",
    zh: "服务重启后任务已暂停，等待手动恢复。",
  }],
  ["任务心跳超时", {
    vi: "Tác vụ phân tích sách đã quá thời gian heartbeat.",
    en: "The book analysis task timed out on heartbeat.",
    zh: "任务心跳超时",
  }],
  ["Book analysis failed.", {
    vi: "Bản phân tích sách đã thất bại khi chạy.",
    en: "Book analysis failed.",
    zh: "拆书分析执行失败。",
  }],
  ["Section regeneration failed.", {
    vi: "Tạo lại mục phân tích sách thất bại.",
    en: "Section regeneration failed.",
    zh: "拆书分析分节重生成失败。",
  }],
  ["Custom provider requires an explicit model for book analysis.", {
    vi: "Nhà cung cấp tùy chỉnh cần chỉ rõ model cho phân tích sách.",
    en: "Custom provider requires an explicit model for book analysis.",
    zh: "自定义提供商在拆书分析中必须显式指定模型。",
  }],
  ["Invalid JSON object.", {
    vi: "Không phát hiện được đối tượng JSON hợp lệ.",
    en: "No valid JSON object was detected.",
    zh: "未检测到有效的 JSON 对象。",
  }],
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
  if (isBackendMessageKey(trimmed)) {
    return getBackendMessage(trimmed, undefined, getRequestLocale());
  }
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
