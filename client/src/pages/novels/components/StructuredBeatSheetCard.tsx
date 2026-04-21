import type { ReactNode } from "react";
import AiButton from "@/components/common/AiButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StructuredTabViewProps } from "./NovelEditView.types";

type StructuredVolume = StructuredTabViewProps["volumes"][number];
type StructuredChapter = StructuredVolume["chapters"][number];
type StructuredBeatSheet = StructuredTabViewProps["beatSheets"][number];
type StructuredBeat = StructuredBeatSheet["beats"][number];

interface StructuredBeatSheetCardProps {
  selectedVolume: StructuredVolume;
  selectedVolumeChapters: StructuredChapter[];
  selectedBeatSheet: StructuredBeatSheet | null;
  selectedBeat: StructuredBeat | null;
  visibleChapters: StructuredChapter[];
  refinedChapterCount: number;
  visibleRefinedChapterCount: number;
  readiness: StructuredTabViewProps["readiness"];
  isGeneratingBeatSheet: boolean;
  onGenerateBeatSheet: StructuredTabViewProps["onGenerateBeatSheet"];
  chapterListPanel?: ReactNode;
  chapterDetailPanel?: ReactNode;
}

function renderMetric(label: string, value: string) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/80 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-semibold text-foreground">{value}</div>
    </div>
  );
}

export default function StructuredBeatSheetCard(props: StructuredBeatSheetCardProps) {
  const {
    selectedVolume,
    selectedVolumeChapters,
    selectedBeatSheet,
    selectedBeat,
    visibleChapters,
    refinedChapterCount,
    visibleRefinedChapterCount,
    readiness,
    isGeneratingBeatSheet,
    onGenerateBeatSheet,
    chapterListPanel,
    chapterDetailPanel,
  } = props;

  const hasExistingBeatSheet = Boolean(selectedBeatSheet);
  const volumeTitle = selectedVolume.title?.trim() || `Tập ${selectedVolume.sortOrder}`;
  const volumeSummary = selectedVolume.mainPromise?.trim()
    || selectedVolume.summary?.trim()
    || "Hãy định vị nhịp hiện tại trong khu điều hướng chương ở phía dưới rồi tiếp tục tinh chỉnh chương tương ứng.";
  const generateButtonLabel = isGeneratingBeatSheet
    ? (hasExistingBeatSheet ? "Đang tạo lại..." : "Đang tạo...")
    : (hasExistingBeatSheet ? "Tạo lại bảng nhịp của tập này" : "Tạo bảng nhịp của tập này");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="text-base">Nhịp của tập hiện tại</CardTitle>
            <div className="text-sm text-muted-foreground">Hãy xem vùng đang tập trung trước, rồi dùng điều hướng chương bên dưới để đổi nhịp và chọn chương cần tinh chỉnh.</div>
          </div>
          <AiButton
            variant="outline"
            onClick={() => onGenerateBeatSheet(selectedVolume.id)}
            disabled={isGeneratingBeatSheet || !readiness.canGenerateBeatSheet}
          >
            {generateButtonLabel}
          </AiButton>
        </div>
      </CardHeader>
      <CardContent>
        {selectedBeatSheet ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)] xl:items-start">
            {chapterListPanel ? <div className="min-w-0">{chapterListPanel}</div> : <div />}

            <div className="min-w-0 space-y-4">
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 lg:p-5">
                {selectedBeat ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Vùng đang tập trung</div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{selectedBeat.label}</Badge>
                        <Badge variant="secondary">{selectedBeat.chapterSpanHint}</Badge>
                        <Badge variant="outline">{visibleChapters.length} chương</Badge>
                        <Badge variant="outline">{visibleRefinedChapterCount}/{Math.max(visibleChapters.length, 1)} đã tinh chỉnh</Badge>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-background/90 p-4">
                      <div className="text-sm font-medium text-foreground">Phần này đẩy câu chuyện về đâu</div>
                      <div className="mt-2 text-sm leading-7 text-foreground">{selectedBeat.summary}</div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium text-foreground">Phần này bắt buộc phải giao gì</div>
                      {selectedBeat.mustDeliver.length > 0 ? (
                        <ol className="space-y-2 rounded-xl border border-border/70 bg-background/90 p-4">
                          {selectedBeat.mustDeliver.map((item, index) => (
                            <li
                              key={`${selectedBeat.key}-deliverable-${index}`}
                              className="flex items-start gap-3 text-sm text-foreground"
                            >
                              <span className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-semibold text-primary">
                                {index + 1}
                              </span>
                              <span className="leading-6">{item}</span>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <div className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                          Phần này vẫn chưa có đầu việc giao rõ ràng, nên quay lại kết quả tạo nhịp để bổ sung mục tiêu thực hiện cụ thể hơn.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Tổng quan tập hiện tại</div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{volumeTitle}</Badge>
                        <Badge variant="outline">{selectedVolumeChapters.length} chương</Badge>
                        <Badge variant="outline">{selectedBeatSheet.beats.length} đoạn nhịp</Badge>
                        <Badge variant="outline">{refinedChapterCount}/{Math.max(selectedVolumeChapters.length, 1)} đã tinh chỉnh</Badge>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-background/90 p-4">
                      <div className="text-sm font-medium text-foreground">Cam kết cốt lõi của tập này</div>
                      <div className="mt-2 text-sm leading-7 text-foreground">{volumeSummary}</div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {renderMetric("Số chương hiện tại", `${selectedVolumeChapters.length} chương`)}
                      {renderMetric("Số đoạn nhịp", `${selectedBeatSheet.beats.length} đoạn`)}
                      {renderMetric("Chương đã tinh chỉnh", `${refinedChapterCount} chương`)}
                    </div>
                  </div>
                )}
              </div>

              {chapterDetailPanel}
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Hãy tạo bảng nhịp cho tập hiện tại trước.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
