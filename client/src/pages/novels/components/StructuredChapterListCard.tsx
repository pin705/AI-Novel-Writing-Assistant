import AiButton from "@/components/common/AiButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getChapterExecutionDetailStatus,
  hasChapterExecutionDetail,
} from "../chapterDetailPlanning.shared";
import { chapterMatchesBeat } from "./structuredOutlineWorkspace.shared";
import type { StructuredTabViewProps } from "./NovelEditView.types";

type StructuredVolume = StructuredTabViewProps["volumes"][number];
type StructuredChapter = StructuredVolume["chapters"][number];
type StructuredBeatSheet = StructuredTabViewProps["beatSheets"][number];
type StructuredBeat = StructuredBeatSheet["beats"][number];

interface StructuredChapterListCardProps {
  selectedVolume: StructuredVolume;
  selectedBeat: StructuredBeat | null;
  selectedBeatKey: string;
  selectedBeatSheet: StructuredBeatSheet | null;
  selectedVolumeChapters: StructuredChapter[];
  visibleChapters: StructuredChapter[];
  selectedChapter: StructuredChapter | null;
  visibleRefinedChapterCount: number;
  selectedVolumeRequiredChapterCount: number;
  selectedVolumeNeedsChapterExpansion: boolean;
  isGeneratingChapterList: boolean;
  locked: boolean;
  onGenerateChapterList: StructuredTabViewProps["onGenerateChapterList"];
  onAddChapter: StructuredTabViewProps["onAddChapter"];
  onSelectBeatKey: (beatKey: string) => void;
  onSelectChapter: (chapterId: string) => void;
}

function renderChapterDetailStatusBadge(chapter: StructuredChapter) {
  const status = getChapterExecutionDetailStatus(chapter);
  if (status === "complete") {
    return <Badge variant="secondary">Đã tinh chỉnh</Badge>;
  }
  if (status === "partial") {
    return <Badge>Đang tinh chỉnh</Badge>;
  }
  return <Badge variant="outline">Chờ tinh chỉnh</Badge>;
}

export default function StructuredChapterListCard(props: StructuredChapterListCardProps) {
  const {
    selectedVolume,
    selectedBeat,
    selectedBeatKey,
    selectedBeatSheet,
    selectedVolumeChapters,
    visibleChapters,
    selectedChapter,
    visibleRefinedChapterCount,
    selectedVolumeRequiredChapterCount,
    selectedVolumeNeedsChapterExpansion,
    isGeneratingChapterList,
    locked,
    onGenerateChapterList,
    onAddChapter,
    onSelectBeatKey,
    onSelectChapter,
  } = props;

  const matchedChapterIds = new Set<string>();
  const beatGroups = (selectedBeatSheet?.beats ?? []).map((beat) => {
    const chapters = selectedVolumeChapters.filter((chapter) => {
      const matches = chapterMatchesBeat(chapter, beat);
      if (matches) {
        matchedChapterIds.add(chapter.id);
      }
      return matches;
    });
    return {
      key: beat.key,
      label: beat.label,
      chapterSpanHint: beat.chapterSpanHint,
      chapters,
      refinedCount: chapters.filter((chapter) => hasChapterExecutionDetail(chapter)).length,
    };
  });
  const unmatchedChapters = selectedVolumeChapters.filter((chapter) => !matchedChapterIds.has(chapter.id));

  return (
    <Card className="border-border/70 bg-background/90">
      <CardHeader className="pb-3">
        <div className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-base leading-none">Nhịp truyện / Điều hướng chương</CardTitle>
              <div className="mt-1 text-sm text-muted-foreground">
                {selectedBeat
                  ? `Đang tập trung vào “${selectedBeat.label}”. Bấm vào tiêu đề nhóm để đổi nhịp, bấm vào chương để tiếp tục tinh chỉnh ở bên phải.`
                  : "Các chương được chia theo nhịp truyện. Bấm vào tiêu đề nhóm để tập trung vào nhịp đó, bấm vào chương để tiếp tục tinh chỉnh ở bên phải."}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <AiButton
                onClick={() => onGenerateChapterList(selectedVolume.id)}
                disabled={isGeneratingChapterList || locked}
              >
                {isGeneratingChapterList ? "Đang tạo..." : "Tạo danh sách chương của tập này"}
              </AiButton>
              <Button size="sm" variant="outline" onClick={() => onAddChapter(selectedVolume.id)}>
                Thêm chương
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => onSelectBeatKey("all")}
              className={cn(
                "rounded-full border px-3 py-1.5 transition-colors",
                selectedBeatKey === "all" ? "border-primary/50 bg-primary/5 text-foreground" : "border-border/70 hover:border-primary/30",
              )}
            >
              Tất cả nhịp
            </button>
            <Badge variant="outline">Hiển thị {visibleChapters.length}/{selectedVolumeChapters.length} chương</Badge>
            <Badge variant="outline">{visibleRefinedChapterCount}/{Math.max(visibleChapters.length, 1)} đã tinh chỉnh</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {selectedVolumeNeedsChapterExpansion ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-800">
            Tập hiện tại mới có {selectedVolumeChapters.length} chương, nhưng bảng nhịp đã sắp tới {selectedVolumeRequiredChapterCount} chương. Cần tạo lại danh sách chương của tập này trước, thì nửa sau của nhịp mới thật sự khớp vào các chương.
          </div>
        ) : null}

        {selectedVolumeChapters.length > 0 ? (
          <>
            <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1 xl:max-h-[calc(100vh-12rem)]">
              {beatGroups.map((group) => {
                const active = selectedBeatKey === group.key;
                const expanded = selectedBeatKey === "all" || active;
                return (
                  <div key={group.key} className="rounded-xl border border-border/70 bg-background/80 p-3">
                    <button
                      type="button"
                      onClick={() => onSelectBeatKey(active ? "all" : group.key)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={active ? "default" : "outline"}>{group.label}</Badge>
                          <Badge variant="secondary">{group.chapterSpanHint}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {group.chapters.length} chương · {group.refinedCount} chương đã tinh chỉnh
                        </span>
                      </div>
                    </button>

                    {expanded ? (
                      <div className="mt-3 space-y-2 border-l border-border/70 pl-3">
                        {group.chapters.length > 0 ? group.chapters.map((chapter) => {
                          const isSelected = selectedChapter?.id === chapter.id;
                          return (
                            <button
                              key={chapter.id}
                              type="button"
                              onClick={() => {
                                onSelectBeatKey(group.key);
                                onSelectChapter(chapter.id);
                              }}
                              className={cn(
                                "w-full rounded-xl border p-3 text-left transition-colors",
                                isSelected ? "border-primary/50 bg-primary/5 shadow-sm" : "border-border/70 hover:border-primary/30",
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <Badge variant={isSelected ? "default" : "outline"}>Chương {chapter.chapterOrder}</Badge>
                                {renderChapterDetailStatusBadge(chapter)}
                              </div>
                              <div className="mt-2 text-sm font-medium">{chapter.title || `Chương ${chapter.chapterOrder}`}</div>
                            </button>
                          );
                        }) : (
                          <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                            Nhịp này tạm thời chưa khớp với chương nào.
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {unmatchedChapters.length > 0 ? (
                <div className="rounded-xl border border-dashed p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">Chưa vào nhịp nào</Badge>
                      <Badge variant="secondary">{unmatchedChapters.length} chương</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">Những chương này tạm thời chưa nằm trong nhịp nào</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {unmatchedChapters.map((chapter) => {
                      const isSelected = selectedChapter?.id === chapter.id;
                      return (
                        <button
                          key={chapter.id}
                          type="button"
                          onClick={() => onSelectChapter(chapter.id)}
                          className={cn(
                            "w-full rounded-xl border p-3 text-left transition-colors",
                            isSelected ? "border-primary/50 bg-primary/5 shadow-sm" : "border-border/70 hover:border-primary/30",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant={isSelected ? "default" : "outline"}>Chương {chapter.chapterOrder}</Badge>
                            {renderChapterDetailStatusBadge(chapter)}
                          </div>
                          <div className="mt-2 text-sm font-medium">{chapter.title || `Chương ${chapter.chapterOrder}`}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            {visibleChapters.length === 0 && selectedBeat ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                {selectedVolumeNeedsChapterExpansion ? (
                  <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-800">
                    Nhịp hiện tại là {selectedBeat.chapterSpanHint}, nhưng tập này mới được tạo đến chương {selectedVolumeChapters.length}. Hãy tạo lại danh sách chương của tập này trước, để bổ sung tập này lên ít nhất {selectedVolumeRequiredChapterCount} chương.
                  </div>
                ) : null}
                Nhịp hiện tại vẫn chưa khớp với chương nào, hãy quay lại chế độ tất cả nhịp hoặc chỉnh lại bảng nhịp.
              </div>
            ) : null}
          </>
        ) : (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            {selectedVolumeRequiredChapterCount > 0 ? (
              <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-800">
                Theo bảng nhịp hiện tại, tập này cần ít nhất {selectedVolumeRequiredChapterCount} chương thì các nhịp mới khớp đầy đủ vào từng chương.
              </div>
            ) : null}
            Tập này chưa có danh sách chương. Hãy tạo danh sách chương của tập này trước.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
