import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StoryModeProfile } from "@ai-novel/shared/types/storyMode";
import {
  createStoryModeChildren,
  createStoryModeTree,
  deleteStoryMode,
  flattenStoryModeTreeOptions,
  generateStoryModeChild,
  generateStoryModeTree,
  getStoryModeTree,
  updateStoryMode,
  type StoryModeTreeDraft,
  type StoryModeTreeNode,
} from "@/api/storyMode";
import { queryKeys } from "@/api/queryKeys";
import LLMSelector from "@/components/common/LLMSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { useLLMStore } from "@/store/llmStore";
import StoryModeProfileFields from "./components/StoryModeProfileFields";
import StoryModeTreeCard from "./components/StoryModeTreeCard";

type StoryModeProfileDraft = StoryModeProfile;

interface StoryModeDialogState {
  name: string;
  description: string;
  template: string;
  profile: StoryModeProfileDraft;
}

function createEmptyProfile(): StoryModeProfileDraft {
  return {
    coreDrive: "",
    readerReward: "",
    progressionUnits: [],
    allowedConflictForms: [],
    forbiddenConflictForms: [],
    conflictCeiling: "medium",
    resolutionStyle: "",
    chapterUnit: "",
    volumeReward: "",
    mandatorySignals: [],
    antiSignals: [],
  };
}

function createEmptyDraft(): StoryModeTreeDraft {
  return {
    name: "",
    description: "",
    template: "",
    profile: createEmptyProfile(),
    children: [],
  };
}

function cloneDraft(draft: StoryModeTreeDraft): StoryModeTreeDraft {
  return {
    name: draft.name,
    description: draft.description ?? "",
    template: draft.template ?? "",
    profile: { ...draft.profile },
    children: draft.children.map((child) => cloneDraft(child)),
  };
}

function countStoryModes(nodes: StoryModeTreeNode[]): number {
  return nodes.reduce((total, node) => total + 1 + countStoryModes(node.children), 0);
}

function findStoryModeNode(nodes: StoryModeTreeNode[], id: string): StoryModeTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    const child = findStoryModeNode(node.children, id);
    if (child) {
      return child;
    }
  }
  return null;
}

function collectDescendantIds(node: StoryModeTreeNode): string[] {
  return node.children.flatMap((child) => [child.id, ...collectDescendantIds(child)]);
}

function normalizeProfileInput(profile: StoryModeDialogState["profile"]): StoryModeProfile {
  return {
    coreDrive: profile.coreDrive.trim(),
    readerReward: profile.readerReward.trim(),
    progressionUnits: profile.progressionUnits,
    allowedConflictForms: profile.allowedConflictForms,
    forbiddenConflictForms: profile.forbiddenConflictForms,
    conflictCeiling: profile.conflictCeiling,
    resolutionStyle: profile.resolutionStyle.trim(),
    chapterUnit: profile.chapterUnit.trim(),
    volumeReward: profile.volumeReward.trim(),
    mandatorySignals: profile.mandatorySignals,
    antiSignals: profile.antiSignals,
  };
}

function toDialogState(node?: StoryModeTreeNode | null): StoryModeDialogState {
  return {
    name: node?.name ?? "",
    description: node?.description ?? "",
    template: node?.template ?? "",
    profile: node?.profile ? { ...node.profile } : createEmptyProfile(),
  };
}

export default function StoryModeManagementPage() {
  const llm = useLLMStore();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingStoryModeId, setEditingStoryModeId] = useState("");
  const [defaultParentId, setDefaultParentId] = useState("");
  const [generationPrompt, setGenerationPrompt] = useState("");
  const [childDerivationCount, setChildDerivationCount] = useState(1);
  const [generatedChildCandidates, setGeneratedChildCandidates] = useState<StoryModeTreeDraft[]>([]);
  const [selectedGeneratedChildIndexes, setSelectedGeneratedChildIndexes] = useState<number[]>([]);
  const [activeGeneratedChildIndex, setActiveGeneratedChildIndex] = useState<number | null>(null);
  const [createDraft, setCreateDraft] = useState<StoryModeTreeDraft>(createEmptyDraft());
  const [editState, setEditState] = useState<StoryModeDialogState>(toDialogState());

  const storyModeTreeQuery = useQuery({
    queryKey: queryKeys.storyModes.all,
    queryFn: getStoryModeTree,
  });

  const storyModeTree = storyModeTreeQuery.data?.data ?? [];
  const isCreatingChild = Boolean(defaultParentId);
  const totalStoryModes = useMemo(() => countStoryModes(storyModeTree), [storyModeTree]);
  const editingStoryMode = useMemo(
    () => (editingStoryModeId ? findStoryModeNode(storyModeTree, editingStoryModeId) : null),
    [editingStoryModeId, storyModeTree],
  );
  const parentOptions = useMemo(
    () => flattenStoryModeTreeOptions(storyModeTree).filter((item) => item.level === 0),
    [storyModeTree],
  );
  const blockedParentIds = useMemo(
    () => editingStoryMode ? new Set([editingStoryMode.id, ...collectDescendantIds(editingStoryMode)]) : new Set<string>(),
    [editingStoryMode],
  );

  useEffect(() => {
    if (!createDialogOpen) {
      return;
    }
    setCreateDraft(createEmptyDraft());
    setGenerationPrompt("");
    setChildDerivationCount(1);
    setGeneratedChildCandidates([]);
    setSelectedGeneratedChildIndexes([]);
    setActiveGeneratedChildIndex(null);
  }, [createDialogOpen, defaultParentId]);

  useEffect(() => {
    if (!editingStoryMode) {
      return;
    }
    setEditState(toDialogState(editingStoryMode));
  }, [editingStoryMode]);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.storyModes.all });
  };

  const createMutation = useMutation({
    mutationFn: () => createStoryModeTree({
      name: createDraft.name.trim(),
      description: createDraft.description?.trim() || undefined,
      template: createDraft.template?.trim() || undefined,
      profile: normalizeProfileInput(createDraft.profile),
      parentId: defaultParentId || null,
      children: createDraft.children.map((child) => ({
        ...child,
        profile: normalizeProfileInput(child.profile),
      })),
    }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Đã tạo chế độ triển khai.");
      setCreateDialogOpen(false);
    },
  });

  const createSelectedChildrenMutation = useMutation({
    mutationFn: async () => {
      if (!defaultParentId) {
        throw new Error("Chế độ triển khai cha không tồn tại.");
      }

      const drafts = selectedGeneratedChildIndexes
        .map((index) => generatedChildCandidates[index])
        .filter((draft): draft is StoryModeTreeDraft => Boolean(draft))
        .map((draft) => ({
          ...cloneDraft(draft),
          profile: normalizeProfileInput(draft.profile),
          children: [],
        }));

      if (drafts.length === 0) {
        throw new Error("Vui lòng chọn ít nhất một ứng viên cấp con.");
      }

      return createStoryModeChildren({
        parentId: defaultParentId,
        drafts,
      });
    },
    onSuccess: async (response) => {
      await invalidate();
      const savedCount = response.data?.length ?? selectedGeneratedChildIndexes.length;
      toast.success(`Đã tạo hàng loạt ${savedCount} chế độ triển khai con.`);
      setCreateDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingStoryMode) {
        throw new Error("Chế độ triển khai không tồn tại.");
      }
      return updateStoryMode(editingStoryMode.id, {
        name: editState.name.trim(),
        description: editState.description.trim() || null,
        template: editState.template.trim() || null,
        profile: normalizeProfileInput(editState.profile),
      });
    },
    onSuccess: async () => {
      await invalidate();
      toast.success("Chế độ triển khai đã được cập nhật.");
      setEditingStoryModeId("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteStoryMode(id),
    onSuccess: async () => {
      await invalidate();
      toast.success("Chế độ triển khai đã được xóa.");
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (): Promise<
      | { kind: "child"; drafts: StoryModeTreeDraft[] }
      | { kind: "tree"; draft: StoryModeTreeDraft | null }
    > => {
      if (isCreatingChild) {
        const response = await generateStoryModeChild({
          parentId: defaultParentId,
          prompt: generationPrompt.trim() || undefined,
          count: childDerivationCount,
          provider: llm.provider,
          model: llm.model,
          temperature: llm.temperature,
          maxTokens: llm.maxTokens,
        });
        return {
          kind: "child",
          drafts: response.data ?? [],
        };
      }

      const response = await generateStoryModeTree({
        prompt: generationPrompt.trim(),
        provider: llm.provider,
        model: llm.model,
        temperature: llm.temperature,
        maxTokens: llm.maxTokens,
      });
      return {
        kind: "tree",
        draft: response.data ?? null,
      };
    },
    onSuccess: (result) => {
      if (result.kind === "child") {
        const candidates = result.drafts.map((item) => cloneDraft(item));
        if (candidates.length === 0) {
          return;
        }
        setGeneratedChildCandidates(candidates);
        setSelectedGeneratedChildIndexes(candidates.map((_item, index) => index));
        setActiveGeneratedChildIndex(0);
        setCreateDraft(cloneDraft(candidates[0]));
        toast.success(`AI đã tạo ${candidates.length} bản nháp chế độ triển khai con.`);
        return;
      }
      setSelectedGeneratedChildIndexes([]);
      setActiveGeneratedChildIndex(null);
      if (!result.draft) {
        return;
      }
      setGeneratedChildCandidates([]);
      setCreateDraft(cloneDraft(result.draft));
      toast.success("AI đã tạo bản nháp cây chế độ triển khai.");
    },
  });

  const handleCreateRoot = () => {
    setDefaultParentId("");
    setCreateDialogOpen(true);
  };

  const handleCreateChild = (parentId: string) => {
    setDefaultParentId(parentId);
    setCreateDialogOpen(true);
  };

  const updateCreateDraft = (updater: (draft: StoryModeTreeDraft) => StoryModeTreeDraft) => {
    setCreateDraft((prev) => {
      const next = updater(prev);
      if (isCreatingChild && activeGeneratedChildIndex !== null) {
        setGeneratedChildCandidates((prevCandidates) => prevCandidates.map((candidate, index) => (
          index === activeGeneratedChildIndex ? cloneDraft(next) : candidate
        )));
      }
      return next;
    });
  };

  const handleApplyGeneratedChild = (draft: StoryModeTreeDraft, index: number) => {
    setActiveGeneratedChildIndex(index);
    setCreateDraft(cloneDraft(draft));
  };

  const handleToggleGeneratedChildSelection = (index: number) => {
    setSelectedGeneratedChildIndexes((prev) => (
      prev.includes(index)
        ? prev.filter((item) => item !== index)
        : [...prev, index].sort((left, right) => left - right)
    ));
  };

  const handleDelete = (node: StoryModeTreeNode) => {
    const descendantCount = collectDescendantIds(node).length;
    const message = descendantCount > 0
      ? `Bạn có chắc muốn xóa chế độ triển khai “${node.name}” không? Việc này sẽ xóa luôn ${descendantCount} mục con bên dưới và không thể khôi phục.`
      : `Bạn có chắc muốn xóa chế độ triển khai “${node.name}” không? Thao tác này không thể khôi phục.`;
    const confirmed = window.confirm(message);
    if (!confirmed) {
      return;
    }
    deleteMutation.mutate(node.id);
  };

  const selectedParentLabel = useMemo(() => {
    if (!defaultParentId) {
      return "Tạo như chế độ triển khai gốc";
    }
    return parentOptions.find((item) => item.id === defaultParentId)?.path ?? "Tạo như chế độ triển khai gốc";
  }, [defaultParentId, parentOptions]);

  const editParentOptions = useMemo(
    () => parentOptions.filter((item) => !blockedParentIds.has(item.id)),
    [blockedParentIds, parentOptions],
  );

  return (
    <div className="space-y-4">
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-auto">
          <DialogHeader>
            <DialogTitle>{isCreatingChild ? "Thêm chế độ triển khai con" : "Tạo chế độ triển khai mới"}</DialogTitle>
            <DialogDescription>
              {isCreatingChild
                ? "Hệ thống sẽ thêm con dưới nút cha đã chọn. Bạn có thể nhập thủ công, hoặc để AI tạo nhiều phương án con dựa trên nút cha và các nút anh em hiện có rồi chọn nhiều mục để lưu hàng loạt."
                : "Hãy xác định vị trí gắn trước, rồi nhập profile thủ công hoặc để AI tạo bản nháp cây hai tầng."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="text-sm font-semibold text-foreground">Vị trí gắn hiện tại</div>
              <div className="mt-1 text-sm text-muted-foreground">{selectedParentLabel}</div>
            </div>

            <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-foreground">{isCreatingChild ? "AI tạo bản nháp con" : "AI tạo bản nháp"}</div>
                <div className="text-xs leading-5 text-muted-foreground">
                  {isCreatingChild
                    ? "AI sẽ dựa trên nút cha hiện tại và các nút anh em để xuất ra một hoặc nhiều bản nháp nút con, không tạo lại cả cây. Phần hướng bổ sung có thể để trống. Trước khi lưu vẫn sẽ kiểm tra cấu trúc profile."
                    : "AI sẽ tạo ra một bản nháp cây chế độ triển khai có thể chỉnh trực tiếp, và vẫn kiểm tra cấu trúc profile trước khi lưu."}
                </div>
              </div>
              <LLMSelector />
              {isCreatingChild ? (
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-foreground">Số lượng nhánh tạo ra</span>
                  <select
                    className="w-full rounded-md border bg-background p-2 text-sm"
                    value={childDerivationCount}
                    onChange={(event) => setChildDerivationCount(Number(event.target.value))}
                  >
                    <option value={1}>1 mục</option>
                    <option value={2}>2 mục</option>
                    <option value={3}>3 mục</option>
                    <option value={4}>4 mục</option>
                    <option value={5}>5 mục</option>
                  </select>
                </label>
              ) : null}
              <textarea
                rows={4}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                value={generationPrompt}
                onChange={(event) => setGenerationPrompt(event.target.value)}
                  placeholder={isCreatingChild
                  ? "Tùy chọn: bổ sung hướng bạn muốn nghiêng về cho nhánh con. Để trống thì AI sẽ dựa trực tiếp trên nút cha và các nút anh em hiện có để sinh ra."
                  : "Hãy nhập hướng bạn muốn AI tạo cho cây chế độ triển khai."}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => generateMutation.mutate()}
                  disabled={(!generationPrompt.trim() && !isCreatingChild) || generateMutation.isPending}
                >
                  {generateMutation.isPending
                    ? "Đang tạo..."
                    : isCreatingChild ? "Tạo bản nháp con" : "Tạo bản nháp chế độ triển khai"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setActiveGeneratedChildIndex(null);
                    setCreateDraft(createEmptyDraft());
                  }}
                >
                  Đặt lại bản nháp
                </Button>
              </div>
              {isCreatingChild && generatedChildCandidates.length > 0 ? (
                <div className="space-y-2 rounded-lg border border-border/70 bg-background/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-foreground">Ứng viên con đã tạo</div>
                    <div className="text-xs text-muted-foreground">
                      Đã chọn {selectedGeneratedChildIndexes.length} / {generatedChildCandidates.length}
                    </div>
                  </div>
                  <div className="text-xs leading-5 text-muted-foreground">
                    Có thể tick để lưu hàng loạt; bấm vào thẻ ứng viên sẽ chuyển xuống form bên dưới để chỉnh riêng.
                  </div>
                  <div className="grid gap-2">
                    {generatedChildCandidates.map((candidate, index) => (
                      <div
                        key={`${candidate.name}-${index}`}
                        className={`rounded-lg border bg-background px-3 py-3 transition ${
                          activeGeneratedChildIndex === index
                            ? "border-primary/60 bg-primary/5"
                            : "border-border/70"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-border"
                            checked={selectedGeneratedChildIndexes.includes(index)}
                            onChange={() => handleToggleGeneratedChildSelection(index)}
                          />
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() => handleApplyGeneratedChild(candidate, index)}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-medium text-foreground">{candidate.name}</div>
                              <span className="text-xs text-muted-foreground">
                                {activeGeneratedChildIndex === index ? "Đang chỉnh" : `Ứng viên ${index + 1}`}
                              </span>
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              {candidate.description?.trim() || candidate.profile.coreDrive}
                            </div>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Tên</span>
              <Input value={createDraft.name} onChange={(event) => updateCreateDraft((prev) => ({ ...prev, name: event.target.value }))} />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Mô tả</span>
              <textarea
                rows={3}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                value={createDraft.description ?? ""}
                onChange={(event) => updateCreateDraft((prev) => ({ ...prev, description: event.target.value }))}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Bổ sung mẫu thủ công</span>
              <textarea
                rows={3}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                value={createDraft.template ?? ""}
                onChange={(event) => updateCreateDraft((prev) => ({ ...prev, template: event.target.value }))}
              />
            </label>

            <StoryModeProfileFields
              value={createDraft.profile}
              onChange={(profile) => updateCreateDraft((prev) => ({ ...prev, profile }))}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Hủy
            </Button>
            {isCreatingChild && generatedChildCandidates.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => createSelectedChildrenMutation.mutate()}
                disabled={createSelectedChildrenMutation.isPending || selectedGeneratedChildIndexes.length === 0}
              >
                {createSelectedChildrenMutation.isPending
                  ? "Đang lưu hàng loạt..."
                  : `Lưu hàng loạt các mục con đã chọn (${selectedGeneratedChildIndexes.length})`}
              </Button>
            ) : null}
            <Button
              type="button"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || createSelectedChildrenMutation.isPending || !createDraft.name.trim()}
            >
              {createMutation.isPending ? "Đang lưu..." : isCreatingChild ? "Lưu mục con hiện tại" : "Lưu chế độ triển khai"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingStoryMode)} onOpenChange={(open) => { if (!open) setEditingStoryModeId(""); }}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-auto">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa chế độ triển khai</DialogTitle>
            <DialogDescription>
              Có thể sửa tên, mô tả, mẫu và profile. Giới hạn cây hai tầng vẫn được giữ nguyên.
            </DialogDescription>
          </DialogHeader>

          {editingStoryMode ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                Cha hiện tại: {editingStoryMode.parentId ? (editParentOptions.find((item) => item.id === editingStoryMode.parentId)?.path ?? "Không tìm thấy") : "Nút gốc"}
              </div>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Tên</span>
                <Input value={editState.name} onChange={(event) => setEditState((prev) => ({ ...prev, name: event.target.value }))} />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Mô tả</span>
                <textarea
                  rows={3}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  value={editState.description}
                  onChange={(event) => setEditState((prev) => ({ ...prev, description: event.target.value }))}
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Bổ sung mẫu thủ công</span>
                <textarea
                  rows={3}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  value={editState.template}
                  onChange={(event) => setEditState((prev) => ({ ...prev, template: event.target.value }))}
                />
              </label>
              <StoryModeProfileFields
                value={editState.profile}
                onChange={(profile) => setEditState((prev) => ({ ...prev, profile }))}
              />
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setEditingStoryModeId("")}>
              Hủy
            </Button>
            <Button type="button" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending || !editState.name.trim()}>
              {updateMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Kho chế độ triển khai</CardTitle>
            <CardDescription>
              Đây là nơi quản lý các chế độ triển khai của tác phẩm, ví dụ hệ thống lưu, vô địch lưu, nông trại lưu, chữa lành đời thường. Nó trả lời câu hỏi “cuốn sách này dựa vào đâu để tiếp tục đẩy nội dung và thực hiện lời hứa”, và sẽ được dùng làm ràng buộc cứng cho các bước lập kế hoạch và tạo nội dung phía sau.
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-sm text-muted-foreground">Số chế độ triển khai hiện có: {totalStoryModes}</div>
            <Button type="button" onClick={handleCreateRoot}>
              Tạo cây chế độ triển khai mới
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {storyModeTreeQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Đang tải cây chế độ triển khai...</div>
          ) : null}

          {!storyModeTreeQuery.isLoading && storyModeTree.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center">
              <div className="text-sm font-medium text-foreground">Chưa có chế độ triển khai nào</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Bạn có thể tự tạo một nút gốc trước, hoặc để AI tạo thẳng một bản nháp có cấu trúc.
              </div>
              <div className="mt-4">
                <Button type="button" onClick={handleCreateRoot}>
                  Bắt đầu tạo
                </Button>
              </div>
            </div>
          ) : null}

          {storyModeTree.map((node) => (
            <StoryModeTreeCard
              key={node.id}
              node={node}
              onCreateChild={handleCreateChild}
              onEdit={setEditingStoryModeId}
              onDelete={handleDelete}
              deletingId={deleteMutation.isPending ? deleteMutation.variables : undefined}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
