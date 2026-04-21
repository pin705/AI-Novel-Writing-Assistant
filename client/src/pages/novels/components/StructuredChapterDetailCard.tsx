import { useEffect, useMemo, useState } from "react";
import AiButton from "@/components/common/AiButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  getChapterExecutionDetailStatus,
  type ChapterDetailBatchSelection,
} from "../chapterDetailPlanning.shared";
import type { StructuredTabViewProps } from "./NovelEditView.types";

const textareaClassName =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type StructuredVolume = StructuredTabViewProps["volumes"][number];
type StructuredChapter = StructuredVolume["chapters"][number];
type BatchMode = "count" | "visible_all" | "volume_all";

interface BatchPlan {
  count: number;
  hint: string;
  request: ChapterDetailBatchSelection;
}

function renderChapterDetailStatusBadge(
  status: ReturnType<typeof getChapterExecutionDetailStatus>,
) {
  if (status === "complete") {
    return <Badge variant="secondary">Đã tinh chỉnh</Badge>;
  }
  if (status === "partial") {
    return <Badge>Đang tinh chỉnh</Badge>;
  }
  return <Badge variant="outline">Chờ tinh chỉnh</Badge>;
}

interface StructuredChapterDetailCardProps {
  selectedVolume: StructuredVolume | undefined;
  selectedChapter: StructuredChapter | null;
  visibleChapters: StructuredChapter[];
  selectedChapterBeatLabel?: string | null;
  selectedChapterIndex: number;
  showChapterAdvanced: boolean;
  onToggleAdvanced: () => void;
  isGeneratingChapterDetail: boolean;
  isGeneratingChapterDetailBundle: boolean;
  generatingChapterDetailMode: "purpose" | "boundary" | "task_sheet" | "";
  generatingChapterDetailChapterId: string;
  onGenerateChapterDetail: StructuredTabViewProps["onGenerateChapterDetail"];
  onGenerateChapterDetailBundle: StructuredTabViewProps["onGenerateChapterDetailBundle"];
  onChapterFieldChange: StructuredTabViewProps["onChapterFieldChange"];
  onChapterNumberChange: StructuredTabViewProps["onChapterNumberChange"];
  onChapterPayoffRefsChange: StructuredTabViewProps["onChapterPayoffRefsChange"];
  onMoveChapter: StructuredTabViewProps["onMoveChapter"];
  onRemoveChapter: StructuredTabViewProps["onRemoveChapter"];
  locked: boolean;
}

export default function StructuredChapterDetailCard(props: StructuredChapterDetailCardProps) {
  const {
    selectedVolume,
    selectedChapter,
    visibleChapters,
    selectedChapterBeatLabel,
    selectedChapterIndex,
    showChapterAdvanced,
    onToggleAdvanced,
    isGeneratingChapterDetail,
    isGeneratingChapterDetailBundle,
    generatingChapterDetailMode,
    generatingChapterDetailChapterId,
    onGenerateChapterDetail,
    onGenerateChapterDetailBundle,
    onChapterFieldChange,
    onChapterNumberChange,
    onChapterPayoffRefsChange,
    onMoveChapter,
    onRemoveChapter,
    locked,
  } = props;

  const [batchMode, setBatchMode] = useState<BatchMode>("count");
  const [batchCount, setBatchCount] = useState(3);

  const volumeChapters = selectedVolume?.chapters ?? [];
  const remainingChapters = selectedChapterIndex >= 0 ? volumeChapters.slice(selectedChapterIndex) : [];
  const hasVisibleBatch = visibleChapters.length > 1 && visibleChapters.length < volumeChapters.length;
  const hasVolumeBatch = volumeChapters.length > 1;
  const hasCountBatch = remainingChapters.length > 1;
  const chapterDetailStatus = selectedChapter ? getChapterExecutionDetailStatus(selectedChapter) : "empty";

  useEffect(() => {
    if (hasCountBatch) {
      setBatchCount((current) => Math.min(Math.max(current, 2), remainingChapters.length));
      return;
    }
    setBatchCount(1);
  }, [hasCountBatch, remainingChapters.length]);

  useEffect(() => {
    if (batchMode === "count" && !hasCountBatch) {
      if (hasVisibleBatch) {
        setBatchMode("visible_all");
        return;
      }
      if (hasVolumeBatch) {
        setBatchMode("volume_all");
      }
      return;
    }
    if (batchMode === "visible_all" && !hasVisibleBatch) {
      setBatchMode(hasCountBatch ? "count" : "volume_all");
      return;
    }
    if (batchMode === "volume_all" && !hasVolumeBatch) {
      setBatchMode("count");
    }
  }, [batchMode, hasCountBatch, hasVisibleBatch, hasVolumeBatch]);

  const batchPlan = useMemo<BatchPlan | null>(() => {
    if (!selectedVolume || !selectedChapter) {
      return null;
    }
    if (batchMode === "visible_all" && hasVisibleBatch) {
      return {
        count: visibleChapters.length,
        hint: `Hệ thống sẽ lọc theo nhịp hiện tại và bổ sung một lượt cho ${visibleChapters.length} chương đang hiển thị.`,
        request: {
          chapterIds: visibleChapters.map((chapter) => chapter.id),
          label: `${visibleChapters.length} chương đang hiển thị`,
        },
      };
    }
    if (batchMode === "volume_all" && hasVolumeBatch) {
      return {
        count: volumeChapters.length,
        hint: `Hệ thống sẽ đi từ chương 1 tới chương ${volumeChapters.length}, bổ sung liên tục toàn bộ tài sản tinh chỉnh cho các chương của tập hiện tại.`,
        request: {
          chapterIds: volumeChapters.map((chapter) => chapter.id),
          label: `Toàn bộ ${volumeChapters.length} chương của tập này`,
        },
      };
    }
    if (!hasCountBatch) {
      return null;
    }
    const count = Math.min(Math.max(batchCount, 2), remainingChapters.length);
    return {
      count,
      hint: `Hệ thống sẽ bắt đầu từ chương ${selectedChapter.chapterOrder} và tinh chỉnh lần lượt ${count} chương tiếp theo.`,
      request: {
        chapterIds: remainingChapters.slice(0, count).map((chapter) => chapter.id),
        label: `Từ chương ${selectedChapter.chapterOrder}, liên tiếp ${count} chương`,
      },
    };
  }, [
    batchCount,
    batchMode,
    hasCountBatch,
    hasVisibleBatch,
    hasVolumeBatch,
    remainingChapters,
    selectedChapter,
    selectedVolume,
    visibleChapters,
    volumeChapters,
  ]);

  const currentBundleRunning = Boolean(
    selectedChapter
    && isGeneratingChapterDetailBundle
    && generatingChapterDetailChapterId === selectedChapter.id,
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base leading-none">Tinh chỉnh chương hiện tại</CardTitle>
              {selectedChapter ? (
                <>
                  <Badge variant="outline">Chương {selectedChapter.chapterOrder}</Badge>
                  {selectedChapterBeatLabel ? <Badge variant="secondary">{selectedChapterBeatLabel}</Badge> : null}
                  {renderChapterDetailStatusBadge(chapterDetailStatus)}
                </>
              ) : null}
            </div>
            <div className="text-sm text-muted-foreground">
              {selectedChapter
                ? "Hãy bổ sung tiêu đề, tóm tắt, mục tiêu và bảng việc trước; nếu lúc viết chương mà thiếu kế hoạch thực thi, hệ thống sẽ tự dựa vào đây để bổ sung kế hoạch chạy."
                : "Hãy chọn một chương trong danh sách bên trái trước rồi mới bắt đầu tinh chỉnh."}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedVolume && selectedChapter ? (
              <AiButton
                size="sm"
                onClick={() => onGenerateChapterDetailBundle(selectedVolume.id, selectedChapter.id)}
                disabled={isGeneratingChapterDetail || locked}
              >
                {currentBundleRunning ? "Đang tinh chỉnh chương này..." : "Tinh chỉnh chương hiện tại"}
              </AiButton>
            ) : null}
            <Button size="sm" variant="outline" onClick={onToggleAdvanced}>
              {showChapterAdvanced ? "Thu gọn thiết lập nâng cao" : "Mở thiết lập nâng cao"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedVolume && selectedChapter ? (
          <>
            <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-medium">Tinh chỉnh hàng loạt</div>
                  <div className="text-xs leading-6 text-muted-foreground">
                    Có thể tinh chỉnh liên tiếp theo số lượng từ chương hiện tại, hoặc bổ sung thẳng cho các chương đang hiển thị hay toàn bộ chương của tập này.
                  </div>
                </div>
                <AiButton
                  size="sm"
                  variant="secondary"
                  onClick={() => onGenerateChapterDetailBundle(selectedVolume.id, batchPlan?.request ?? { chapterIds: [] })}
                  disabled={isGeneratingChapterDetail || locked || !batchPlan}
                >
                  {isGeneratingChapterDetailBundle ? "Đang tinh chỉnh hàng loạt..." : `Tinh chỉnh hàng loạt${batchPlan ? ` ${batchPlan.count} chương` : ""}`}
                </AiButton>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
                <label className="space-y-2 text-sm">
                  <span className="text-xs text-muted-foreground">Phạm vi</span>
                  <select
                    className="w-full rounded-xl border bg-background px-3 py-2 text-sm text-foreground"
                    value={batchMode}
                    onChange={(event) => setBatchMode(event.target.value as BatchMode)}
                  >
                    <option value="count" disabled={!hasCountBatch}>Tinh chỉnh liên tiếp từ chương hiện tại</option>
                    {hasVisibleBatch ? <option value="visible_all">Các chương đang hiển thị</option> : null}
                    {hasVolumeBatch ? <option value="volume_all">Toàn bộ chương của tập này</option> : null}
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-xs text-muted-foreground">{batchMode === "count" ? "Số chương" : "Phạm vi lần này"}</span>
                  {batchMode === "count" ? (
                    <Input
                      type="number"
                      min={hasCountBatch ? 2 : 1}
                      max={Math.max(remainingChapters.length, 1)}
                      value={batchCount}
                      onChange={(event) => setBatchCount(Number(event.target.value || 0))}
                      disabled={!hasCountBatch}
                    />
                  ) : (
                    <div className="rounded-xl border border-border/70 bg-background px-3 py-2 text-sm text-foreground">
                      {batchPlan ? `${batchPlan.count} chương` : "Không khả dụng"}
                    </div>
                  )}
                </label>
              </div>

              <div className="mt-2 text-xs leading-6 text-muted-foreground">
                {locked
                  ? "Hãy tạo bảng nhịp cho tập hiện tại trước rồi mới tinh chỉnh theo cả chương hoặc hàng loạt."
                  : batchPlan?.hint ?? "Tập này mới chỉ có 1 chương, hãy tinh chỉnh chương hiện tại trước."}
              </div>
            </div>

            <label className="space-y-2 text-sm">
              <span className="text-xs text-muted-foreground">Tiêu đề chương</span>
              <Input
                value={selectedChapter.title}
                onChange={(event) => onChapterFieldChange(selectedVolume.id, selectedChapter.id, "title", event.target.value)}
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="text-xs text-muted-foreground">Tóm tắt chương</span>
              <textarea
                className={cn(textareaClassName, "min-h-[130px]")}
                value={selectedChapter.summary}
                onChange={(event) => onChapterFieldChange(selectedVolume.id, selectedChapter.id, "summary", event.target.value)}
              />
            </label>

            <label className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Mục tiêu chương</span>
                <AiButton
                  size="sm"
                  variant="outline"
                  onClick={() => onGenerateChapterDetail(selectedVolume.id, selectedChapter.id, "purpose")}
                  disabled={isGeneratingChapterDetail || locked}
                >
                  {isGeneratingChapterDetail && generatingChapterDetailMode === "purpose" && generatingChapterDetailChapterId === selectedChapter.id ? "Đang chỉnh..." : "AI chỉnh"}
                </AiButton>
              </div>
              <textarea
                className={cn(textareaClassName, "min-h-[110px]")}
                value={selectedChapter.purpose ?? ""}
                onChange={(event) => onChapterFieldChange(selectedVolume.id, selectedChapter.id, "purpose", event.target.value)}
              />
            </label>

            <label className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Bảng việc</span>
                <AiButton
                  size="sm"
                  variant="outline"
                  onClick={() => onGenerateChapterDetail(selectedVolume.id, selectedChapter.id, "task_sheet")}
                  disabled={isGeneratingChapterDetail || locked}
                >
                  {isGeneratingChapterDetail && generatingChapterDetailMode === "task_sheet" && generatingChapterDetailChapterId === selectedChapter.id ? "Đang chỉnh..." : "AI chỉnh"}
                </AiButton>
              </div>
              <textarea
                className={cn(textareaClassName, "min-h-[130px]")}
                value={selectedChapter.taskSheet ?? ""}
                onChange={(event) => onChapterFieldChange(selectedVolume.id, selectedChapter.id, "taskSheet", event.target.value)}
              />
            </label>

            {showChapterAdvanced ? (
              <div className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4">
                <div className="text-sm font-medium">Thiết lập nâng cao</div>
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="space-y-2 text-sm">
                    <span className="text-xs text-muted-foreground">Mức xung đột</span>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={selectedChapter.conflictLevel ?? ""}
                      onChange={(event) => onChapterNumberChange(selectedVolume.id, selectedChapter.id, "conflictLevel", event.target.value ? Number(event.target.value) : null)}
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="text-xs text-muted-foreground">Mức hé lộ</span>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={selectedChapter.revealLevel ?? ""}
                      onChange={(event) => onChapterNumberChange(selectedVolume.id, selectedChapter.id, "revealLevel", event.target.value ? Number(event.target.value) : null)}
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="text-xs text-muted-foreground">Số chữ mục tiêu</span>
                    <Input
                      type="number"
                      min={200}
                      step={100}
                      value={selectedChapter.targetWordCount ?? ""}
                      onChange={(event) => onChapterNumberChange(selectedVolume.id, selectedChapter.id, "targetWordCount", event.target.value ? Number(event.target.value) : null)}
                    />
                  </label>
                </div>

                <label className="space-y-2 text-sm">
                  <span className="text-xs text-muted-foreground">Điều cấm</span>
                  <textarea
                    className={cn(textareaClassName, "min-h-[100px]")}
                    value={selectedChapter.mustAvoid ?? ""}
                    onChange={(event) => onChapterFieldChange(selectedVolume.id, selectedChapter.id, "mustAvoid", event.target.value)}
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="text-xs text-muted-foreground">Liên kết hoàn trả</span>
                  <textarea
                    className={cn(textareaClassName, "min-h-[100px]")}
                    value={selectedChapter.payoffRefs.join("\n")}
                    onChange={(event) => onChapterPayoffRefsChange(selectedVolume.id, selectedChapter.id, event.target.value)}
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => onMoveChapter(selectedVolume.id, selectedChapter.id, -1)} disabled={selectedChapterIndex <= 0}>
                    Di chuyển lên
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onMoveChapter(selectedVolume.id, selectedChapter.id, 1)} disabled={selectedChapterIndex < 0 || selectedChapterIndex >= selectedVolume.chapters.length - 1}>
                    Di chuyển xuống
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onRemoveChapter(selectedVolume.id, selectedChapter.id)} disabled={selectedVolume.chapters.length <= 1}>
                    Xóa
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                Mức xung đột, mức hé lộ, số chữ, điều cấm và liên kết hoàn trả đã được gom vào phần thiết lập nâng cao để khỏi làm biểu mẫu quá dày ngay từ đầu.
              </div>
            )}
          </>
        ) : (
          <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            Hãy chọn một chương ở bên trái trước rồi mới bắt đầu tinh chỉnh.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
