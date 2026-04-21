import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { Chapter, ReviewIssue } from "@ai-novel/shared/types/novel";
import { updateNovelChapter } from "@/api/novel";
import { generateChapterExecutionContract } from "@/api/novel/chapters";
import { generateNovelChapterSummary } from "@/api/novelChapterSummary";
import {
  buildRepairIssue,
  resolveTargetWordCount,
  type ChapterExecutionStrategy,
} from "../chapterExecution.utils";
import { syncNovelWorkflowStageSilently } from "../novelWorkflow.client";

interface UseChapterExecutionActionsArgs {
  novelId: string;
  selectedChapterId: string;
  selectedChapter?: Chapter;
  strategy: ChapterExecutionStrategy;
  reviewIssues: ReviewIssue[];
  onGenerateChapter: () => void;
  onReviewChapter: (kind: "continuity" | "character_consistency" | "pacing") => void;
  onStartRepair: (issues: ReviewIssue[]) => void;
  onMessage: (message: string) => void;
  isGeneratingChapter: boolean;
  isRepairingChapter: boolean;
  invalidateNovelDetail: () => Promise<void>;
}

type ExecutionContractActionKind = "taskSheet" | "sceneCards" | null;
type RepairActionKind =
  | "autoRepair"
  | "expand"
  | "compress"
  | "strengthenConflict"
  | "enhanceEmotion"
  | "unifyStyle"
  | "addDialogue"
  | "addDescription"
  | null;
type GenerationActionKind = "rewrite" | null;

export function useChapterExecutionActions({
  novelId,
  selectedChapterId,
  selectedChapter,
  strategy,
  reviewIssues,
  onGenerateChapter,
  onReviewChapter,
  onStartRepair,
  onMessage,
  isGeneratingChapter,
  isRepairingChapter,
  invalidateNovelDetail,
}: UseChapterExecutionActionsArgs) {
  const [executionContractActionKind, setExecutionContractActionKind] = useState<ExecutionContractActionKind>(null);
  const [repairActionKind, setRepairActionKind] = useState<RepairActionKind>(null);
  const [generationActionKind, setGenerationActionKind] = useState<GenerationActionKind>(null);

  const patchChapterMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateNovelChapter>[2]) => updateNovelChapter(novelId, selectedChapterId, payload),
    onSuccess: async () => {
      await invalidateNovelDetail();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Cập nhật chương thất bại.";
      onMessage(message);
    },
  });

  const summarizeChapterMutation = useMutation({
    mutationFn: () => generateNovelChapterSummary(novelId, selectedChapterId),
    onSuccess: async () => {
      await invalidateNovelDetail();
      await syncNovelWorkflowStageSilently({
        novelId,
        stage: "chapter_execution",
        itemLabel: "Đã sinh tóm tắt chương",
        chapterId: selectedChapterId || undefined,
        status: "waiting_approval",
      });
      onMessage("AI đã sinh tóm tắt cho chương này.");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Sinh tóm tắt chương thất bại.";
      onMessage(message);
    },
  });

  const generateExecutionContractMutation = useMutation({
    mutationFn: () => generateChapterExecutionContract(novelId, selectedChapterId),
    onSuccess: async () => {
      await invalidateNovelDetail();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Sinh hợp đồng triển khai chương thất bại.";
      onMessage(message);
    },
    onSettled: () => {
      setExecutionContractActionKind(null);
    },
  });

  useEffect(() => {
    if (!isRepairingChapter) {
      setRepairActionKind(null);
    }
  }, [isRepairingChapter]);

  useEffect(() => {
    if (!isGeneratingChapter) {
      setGenerationActionKind(null);
    }
  }, [isGeneratingChapter]);

  const ensureChapter = (): Chapter | null => {
    if (!selectedChapterId || !selectedChapter) {
      onMessage("Hãy chọn chương trước.");
      return null;
    }
    return selectedChapter;
  };

  const applyStrategy = () => {
    const chapter = ensureChapter();
    if (!chapter) {
      return;
    }
    const targetWordCount = resolveTargetWordCount(strategy);
    const revealLevel = Math.max(0, Math.min(100, Math.round(strategy.conflictLevel * 0.75)));
    patchChapterMutation.mutate({
      targetWordCount,
      conflictLevel: strategy.conflictLevel,
      revealLevel,
      chapterStatus: "pending_generation",
    });
    void syncNovelWorkflowStageSilently({
      novelId,
      stage: "chapter_execution",
      itemLabel: "Đã áp dụng chiến lược triển khai chương",
      chapterId: chapter.id,
      status: "waiting_approval",
    });
    onMessage("Chiến lược sinh đã được áp dụng vào chương hiện tại.");
  };

  const rewriteChapter = () => {
    const chapter = ensureChapter();
    if (!chapter) {
      return;
    }
    setGenerationActionKind("rewrite");
    patchChapterMutation.mutate({
      content: "",
      chapterStatus: "pending_generation",
      repairHistory: `${chapter.repairHistory ?? ""}\n[rewrite] ${new Date().toISOString()}`.trim(),
    });
    void syncNovelWorkflowStageSilently({
      novelId,
      stage: "chapter_execution",
      itemLabel: "Chương này đã được đặt lại và sẵn sàng viết lại",
      chapterId: chapter.id,
      status: "waiting_approval",
    });
    onGenerateChapter();
    onMessage("Đã kích hoạt luồng viết lại.");
  };

  const expandChapter = () => {
    if (!ensureChapter()) {
      return;
    }
    setRepairActionKind("expand");
    onStartRepair([
      buildRepairIssue("engagement", "Mở rộng chi tiết cảnh và phản ứng cảm xúc mà không đổi sự kiện chính, kéo dài văn bản ở mức vừa phải.", "Người dùng yêu cầu mở rộng chương"),
    ]);
    onMessage("Đã gửi yêu cầu mở rộng.");
  };

  const compressChapter = () => {
    if (!ensureChapter()) {
      return;
    }
    setRepairActionKind("compress");
    onStartRepair([
      buildRepairIssue("repetition", "Rút gọn chỗ lặp, giữ sự kiện quan trọng và điểm xung đột, làm chương gọn hơn.", "Người dùng yêu cầu rút ngắn chương"),
    ]);
    onMessage("Đã gửi yêu cầu rút gọn.");
  };

  const summarizeChapter = () => {
    if (!ensureChapter()) {
      return;
    }
    summarizeChapterMutation.mutate();
  };

  const generateTaskSheet = () => {
    if (!ensureChapter()) {
      return;
    }
    setExecutionContractActionKind("taskSheet");
    generateExecutionContractMutation.mutate(undefined, {
      onSuccess: async (response) => {
        await invalidateNovelDetail();
        const chapterId = response.data?.id ?? selectedChapterId;
        void syncNovelWorkflowStageSilently({
          novelId,
          stage: "chapter_execution",
          itemLabel: "Bảng nhiệm vụ chương đã được làm mới",
          chapterId,
          status: "waiting_approval",
        });
        onMessage("Backend AI đã làm mới bảng nhiệm vụ của chương này.");
      },
    });
  };

  const generateSceneCards = () => {
    if (!ensureChapter()) {
      return;
    }
    setExecutionContractActionKind("sceneCards");
    generateExecutionContractMutation.mutate(undefined, {
      onSuccess: async (response) => {
        await invalidateNovelDetail();
        const chapterId = response.data?.id ?? selectedChapterId;
        void syncNovelWorkflowStageSilently({
          novelId,
          stage: "chapter_execution",
          itemLabel: "Đã sinh phân rã cảnh",
          chapterId,
          status: "waiting_approval",
        });
        onMessage("Backend AI đã sinh phần phân rã cảnh.");
      },
    });
  };

  const checkContinuity = () => {
    if (!ensureChapter()) {
      return;
    }
    onReviewChapter("continuity");
    onMessage("Đã chạy kiểm tra tính liên tục.");
  };

  const checkCharacterConsistency = () => {
    if (!ensureChapter()) {
      return;
    }
    onReviewChapter("character_consistency");
    onMessage("Đã chạy kiểm tra nhất quán nhân vật.");
  };

  const checkPacing = () => {
    if (!ensureChapter()) {
      return;
    }
    onReviewChapter("pacing");
    onMessage("Đã chạy kiểm tra nhịp độ.");
  };

  const autoRepair = () => {
    if (!ensureChapter()) {
      return;
    }
    setRepairActionKind("autoRepair");
    const issues = reviewIssues.length > 0
      ? reviewIssues
      : [buildRepairIssue("coherence", "Sửa lỗi logic chương và liên kết tường thuật, bổ sung động cơ cùng quan hệ nhân quả quan trọng.", "Quy tắc sửa tự động mặc định")];
    onStartRepair(issues);
    onMessage("Đã kích hoạt tự động sửa.");
  };

  const strengthenConflict = () => {
    if (!ensureChapter()) {
      return;
    }
    setRepairActionKind("strengthenConflict");
    onStartRepair([
      buildRepairIssue("pacing", "Tăng mật độ đối kháng để xung đột xuất hiện sớm hơn và đè áp lực liên tục.", "Người dùng yêu cầu tăng cường xung đột"),
    ]);
    onMessage("Đã kích hoạt tăng cường xung đột.");
  };

  const enhanceEmotion = () => {
    if (!ensureChapter()) {
      return;
    }
    setRepairActionKind("enhanceEmotion");
    onStartRepair([
      buildRepairIssue("engagement", "Tăng tầng cảm xúc và độ căng của nhân vật, làm nổi bật biến chuyển cảm xúc bên trong lẫn bên ngoài.", "Người dùng yêu cầu tăng cường cảm xúc"),
    ]);
    onMessage("Đã kích hoạt tăng cường cảm xúc.");
  };

  const unifyStyle = () => {
    if (!ensureChapter()) {
      return;
    }
    setRepairActionKind("unifyStyle");
    onStartRepair([
      buildRepairIssue("voice", "Đồng bộ giọng kể và cách dùng từ để giữ văn phong ổn định.", "Người dùng yêu cầu tăng tính nhất quán văn phong"),
    ]);
    onMessage("Đã kích hoạt đồng bộ văn phong.");
  };

  const addDialogue = () => {
    if (!ensureChapter()) {
      return;
    }
    setRepairActionKind("addDialogue");
    onStartRepair([
      buildRepairIssue("voice", "Thêm đối thoại có tác dụng đẩy tình tiết, giảm lối kể lan man.", "Người dùng yêu cầu tăng đối thoại đẩy truyện"),
    ]);
    onMessage("Đã kích hoạt tăng cường đối thoại.");
  };

  const addDescription = () => {
    if (!ensureChapter()) {
      return;
    }
    setRepairActionKind("addDescription");
    onStartRepair([
      buildRepairIssue("engagement", "Bổ sung miêu tả môi trường và hành động để tăng cảm giác hình ảnh và độ nhập cảnh.", "Người dùng yêu cầu tăng miêu tả"),
    ]);
    onMessage("Đã kích hoạt tăng cường miêu tả.");
  };

  return {
    isPatchingChapter: patchChapterMutation.isPending,
    isGeneratingExecutionContract: generateExecutionContractMutation.isPending,
    isGeneratingTaskSheet: generateExecutionContractMutation.isPending && executionContractActionKind === "taskSheet",
    isGeneratingSceneCards: generateExecutionContractMutation.isPending && executionContractActionKind === "sceneCards",
    isSummarizingChapter: summarizeChapterMutation.isPending,
    repairActionKind,
    generationActionKind,
    applyStrategy,
    rewriteChapter,
    expandChapter,
    compressChapter,
    summarizeChapter,
    generateTaskSheet,
    generateSceneCards,
    checkContinuity,
    checkCharacterConsistency,
    checkPacing,
    autoRepair,
    strengthenConflict,
    enhanceEmotion,
    unifyStyle,
    addDialogue,
    addDescription,
  };
}
