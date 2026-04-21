import type { UnifiedTaskDetail } from "@ai-novel/shared/types/task";
import type { DirectorLockScope } from "@ai-novel/shared/types/novelDirector";
import type { NovelEditTakeoverState } from "./components/NovelEditView.types";

export function resolveAutoExecutionScopeLabel(task: UnifiedTaskDetail | null): string {
  const seedPayload = (task?.meta.seedPayload ?? null) as {
    autoExecution?: {
      scopeLabel?: string | null;
      totalChapterCount?: number | null;
    } | null;
  } | null;
  const scopeLabel = seedPayload?.autoExecution?.scopeLabel?.trim();
  if (scopeLabel) {
    return scopeLabel;
  }
  const fallbackCount = Math.max(1, Math.round(seedPayload?.autoExecution?.totalChapterCount ?? 10));
  return `${fallbackCount} chương đầu`;
}

export function formatTakeoverCheckpoint(
  checkpoint: string | null | undefined,
  task: UnifiedTaskDetail | null,
): string {
  if (checkpoint === "candidate_selection_required") {
    return "Chờ xác nhận hướng cấp sách";
  }
  if (checkpoint === "book_contract_ready") {
    return "Book Contract đã sẵn sàng";
  }
  if (checkpoint === "character_setup_required") {
    return "Chuẩn bị nhân vật chờ duyệt";
  }
  if (checkpoint === "volume_strategy_ready") {
    return "Chiến lược tập / khung tập chờ duyệt";
  }
  if (checkpoint === "front10_ready") {
    return `${resolveAutoExecutionScopeLabel(task)} đã sẵn sàng để viết`;
  }
  if (checkpoint === "chapter_batch_ready") {
    return `${resolveAutoExecutionScopeLabel(task)} đã tạm dừng tự động triển khai`;
  }
  if (checkpoint === "workflow_completed") {
    return "Luồng chính đã hoàn thành";
  }
  return "Đang chạy luồng đạo diễn";
}

export function buildTakeoverTitle(input: {
  mode: NovelEditTakeoverState["mode"];
  novelTitle: string;
  checkpointType: string | null | undefined;
  scopeLabel: string;
}): string {
  if (
    input.mode === "running"
    && (input.checkpointType === "front10_ready" || input.checkpointType === "chapter_batch_ready")
  ) {
    return `“${input.novelTitle}” đang tự động triển khai ${input.scopeLabel}`;
  }
  if (input.mode === "waiting") {
    if (input.checkpointType === "candidate_selection_required") {
      return `“${input.novelTitle}” đang chờ xác nhận hướng cấp sách`;
    }
    if (input.checkpointType === "character_setup_required") {
      return `“${input.novelTitle}” đang chờ duyệt phần chuẩn bị nhân vật`;
    }
    if (input.checkpointType === "volume_strategy_ready") {
      return `“${input.novelTitle}” đang chờ duyệt chiến lược tập / khung tập`;
    }
    if (input.checkpointType === "front10_ready") {
      return `“${input.novelTitle}” đã hoàn tất bàn giao cho đạo diễn tự động`;
    }
  }
  if (input.mode === "failed") {
    if (input.checkpointType === "chapter_batch_ready") {
      return `“${input.novelTitle}” ${input.scopeLabel} đã tạm dừng tự động triển khai`;
    }
    return `“${input.novelTitle}” đã bị gián đoạn ở chế độ đạo diễn tự động`;
  }
  if (input.mode === "loading") {
    return `Đang đồng bộ trạng thái đạo diễn tự động của “${input.novelTitle}”`;
  }
  return `Đang đạo diễn tự động “${input.novelTitle}”`;
}

export function buildTakeoverDescription(input: {
  mode: NovelEditTakeoverState["mode"];
  checkpointType: string | null | undefined;
  reviewScope: DirectorLockScope | null | undefined;
  scopeLabel: string;
}): string {
  if (
    input.mode === "running"
    && (input.checkpointType === "front10_ready" || input.checkpointType === "chapter_batch_ready")
  ) {
    return `AI đang âm thầm tự động triển khai ${input.scopeLabel} và sẽ tiếp tục chạy phần rà soát, sửa lỗi. Bạn vẫn có thể xem và chỉnh tay; nếu cùng lúc sửa chương hiện tại, kết quả tự động sau đó có thể ghi đè một phần nội dung.`;
  }
  if (input.mode === "waiting") {
    if (input.checkpointType === "candidate_selection_required") {
      return "Đã sinh xong các phương án hướng cấp sách. Hãy quay lại trang xác nhận để chọn hoặc chỉnh phương án, rồi đạo diễn tự động mới có thể đi tiếp.";
    }
    if (input.checkpointType === "character_setup_required") {
      return "Phần chuẩn bị nhân vật đã xong. Hãy kiểm tra nhân vật cốt lõi, quan hệ và mục tiêu hiện tại rồi hãy tiếp tục đạo diễn tự động.";
    }
    if (input.checkpointType === "volume_strategy_ready") {
      return "Hiện đã có thể duyệt và tinh chỉnh chiến lược tập / khung tập. Xác nhận xong rồi hãy tiếp tục sinh nhịp độ, tách chương và tài nguyên chi tiết cho các chương đã chọn.";
    }
    if (input.checkpointType === "front10_ready") {
      return `Đạo diễn tự động đã hoàn tất khâu chuẩn bị viết cho ${input.scopeLabel}. Bạn có thể vào triển khai chương ngay, hoặc để AI tiếp tục chạy tự động lo phần này.`;
    }
    if (input.reviewScope) {
      return "Đạo diễn tự động đã tới mốc duyệt. Hãy kiểm tra sản phẩm của giai đoạn hiện tại trước khi quyết định đi tiếp.";
    }
  }
  if (input.mode === "failed") {
    if (input.checkpointType === "chapter_batch_ready") {
      return `Đã tạm dừng tự động triển khai ${input.scopeLabel}. Bạn nên xem trung tâm tác vụ hoặc khu sửa chất lượng trước khi quyết định chạy tiếp.`;
    }
    return "Luồng đạo diễn nền đã bị gián đoạn. Nên xem lý do lỗi trong trung tâm tác vụ rồi hãy quyết định có khôi phục từ điểm gần nhất hay không.";
  }
  if (input.mode === "loading") {
    return "Đang đồng bộ trạng thái đạo diễn tự động hiện tại.";
  }
  return "AI đang âm thầm tiếp quản quy trình mở sách của dự án này. Bạn vẫn có thể thao tác thủ công; nếu cùng lúc sửa cùng một phần với đạo diễn tự động, kết quả ghi sau cùng sẽ được ưu tiên.";
}

export function buildContinueAutoExecutionActionLabel(scopeLabel: string, isPending: boolean): string {
  return isPending ? "Đang tiếp tục triển khai..." : `Tiếp tục tự động triển khai ${scopeLabel}`;
}

export function buildContinueAutoExecutionToast(scopeLabel: string): string {
  return `Đạo diễn tự động đã tiếp tục triển khai ${scopeLabel} và sẽ tự động rà soát, sửa lỗi ở nền.`;
}
