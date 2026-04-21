import { useMutation, useQuery, type QueryClient } from "@tanstack/react-query";
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import {
  applySupplementalCharacter,
  checkCharacterAgainstWorld,
  createNovelCharacter,
  deleteNovelCharacter,
  evolveNovelCharacter,
  generateSupplementalCharacters,
  getCharacterTimeline,
  syncAllCharacterTimeline,
  syncCharacterTimeline,
  updateNovelCharacter,
} from "@/api/novel";
import { queryKeys } from "@/api/queryKeys";
import { buildCharacterProfileFromWizard, type QuickCharacterCreatePayload } from "../components/characterPanel.utils";
import type {
  SupplementalCharacterCandidate,
  SupplementalCharacterGenerateInput,
} from "@ai-novel/shared/types/novel";

interface LLMState {
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
}

interface PipelineFormState {
  startOrder: number;
  endOrder: number;
}

interface CharacterFormState {
  name: string;
  role: string;
  gender: "male" | "female" | "other" | "unknown";
  personality: string;
  background: string;
  development: string;
  currentState: string;
  currentGoal: string;
}

interface QuickCharacterFormState {
  name: string;
  role: string;
}

interface BaseCharacterOption {
  id: string;
  name: string;
  role: string;
  personality?: string | null;
  background?: string | null;
  development?: string | null;
}

interface UseNovelCharacterMutationsInput {
  id: string;
  selectedCharacterId: string;
  selectedBaseCharacter?: BaseCharacterOption;
  characters: Array<{ id: string }>;
  pipelineForm: PipelineFormState;
  llm: LLMState;
  characterForm: CharacterFormState;
  quickCharacterForm: QuickCharacterFormState;
  queryClient: QueryClient;
  setCharacterMessage: (message: string) => void;
  setSelectedCharacterId: (id: string) => void;
  setQuickCharacterForm: (updater: (prev: QuickCharacterFormState) => QuickCharacterFormState) => void;
}

async function invalidateCharacterViews(queryClient: QueryClient, novelId: string, selectedCharacterId?: string) {
  await queryClient.invalidateQueries({ queryKey: queryKeys.novels.detail(novelId) });
  await queryClient.invalidateQueries({ queryKey: queryKeys.novels.characterRelations(novelId) });
  await queryClient.invalidateQueries({ queryKey: queryKeys.novels.characterDynamicsOverview(novelId) });
  await queryClient.invalidateQueries({ queryKey: queryKeys.novels.characterCandidates(novelId) });
  if (selectedCharacterId) {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.novels.characterTimeline(novelId, selectedCharacterId),
    });
  }
}

export function useNovelCharacterMutations(input: UseNovelCharacterMutationsInput) {
  const {
    id,
    selectedCharacterId,
    selectedBaseCharacter,
    characters,
    pipelineForm,
    llm,
    characterForm,
    quickCharacterForm,
    queryClient,
    setCharacterMessage,
    setSelectedCharacterId,
    setQuickCharacterForm,
  } = input;

  const characterTimelineQuery = useQuery({
    queryKey: queryKeys.novels.characterTimeline(id, selectedCharacterId || "none"),
    queryFn: () => getCharacterTimeline(id, selectedCharacterId),
    enabled: Boolean(id && selectedCharacterId),
  });

  const syncTimelineMutation = useMutation({
    mutationFn: () =>
      syncCharacterTimeline(id, selectedCharacterId, {
        startOrder: pipelineForm.startOrder,
        endOrder: pipelineForm.endOrder,
      }),
    onSuccess: async (response) => {
      setCharacterMessage(response.message ?? `Đồng bộ mạch thời gian nhân vật xong, lần này thêm ${response.data?.syncedCount ?? 0} mục.`);
      await invalidateCharacterViews(queryClient, id, selectedCharacterId || "none");
    },
  });

  const syncAllTimelineMutation = useMutation({
    mutationFn: () =>
      syncAllCharacterTimeline(id, {
        startOrder: pipelineForm.startOrder,
        endOrder: pipelineForm.endOrder,
      }),
    onSuccess: async (response) => {
      setCharacterMessage(response.message ?? `Đã đồng bộ mạch thời gian của toàn bộ nhân vật, tổng cộng thêm ${response.data?.syncedCount ?? 0} sự kiện.`);
      await invalidateCharacterViews(queryClient, id, selectedCharacterId || "none");
    },
  });

  const evolveCharacterMutation = useMutation({
    mutationFn: () =>
      evolveNovelCharacter(id, selectedCharacterId, {
        provider: llm.provider,
        model: llm.model,
        temperature: 0.4,
      }),
    onSuccess: async () => {
      setCharacterMessage("Thông tin nhân vật đã được cập nhật theo tiến trình thời gian.");
      await invalidateCharacterViews(queryClient, id, selectedCharacterId || "none");
    },
  });

  const worldCheckMutation = useMutation({
    mutationFn: () =>
      checkCharacterAgainstWorld(id, selectedCharacterId, {
        provider: llm.provider,
        model: llm.model,
        temperature: 0.2,
      }),
    onSuccess: (response) => {
      const status = response.data?.status ?? "pass";
      const warningText = response.data?.warnings?.join(" | ") ?? "";
      const issueText = (response.data?.issues ?? [])
        .map((item) => `${item.severity.toUpperCase()}: ${item.message}`)
        .join(" | ");
      setCharacterMessage(`Kiểm tra quy tắc thế giới (${status}) ${warningText} ${issueText}`.trim());
    },
    onError: (error) => {
      setCharacterMessage(error instanceof Error ? error.message : "Kiểm tra quy tắc thế giới thất bại.");
    },
  });

  const saveCharacterMutation = useMutation({
    mutationFn: () =>
      updateNovelCharacter(id, selectedCharacterId, {
        name: characterForm.name,
        role: characterForm.role,
        gender: characterForm.gender,
        personality: characterForm.personality,
        background: characterForm.background,
        development: characterForm.development,
        currentState: characterForm.currentState,
        currentGoal: characterForm.currentGoal,
      }),
    onSuccess: async () => {
      setCharacterMessage("Thông tin nhân vật đã được lưu.");
      await invalidateCharacterViews(queryClient, id, selectedCharacterId || "none");
    },
  });

  const importBaseCharacterMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBaseCharacter) {
        throw new Error("Hãy chọn nhân vật cơ sở cần nhập trước.");
      }
      return createNovelCharacter(id, {
        name: selectedBaseCharacter.name,
        role: selectedBaseCharacter.role,
        personality: selectedBaseCharacter.personality ?? undefined,
        background: selectedBaseCharacter.background ?? undefined,
        development: selectedBaseCharacter.development ?? undefined,
        baseCharacterId: selectedBaseCharacter.id,
      });
    },
    onSuccess: async (response) => {
      setCharacterMessage(response.message ?? "Đã nhập nhân vật cơ sở vào truyện hiện tại.");
      if (response.data?.id) {
        setSelectedCharacterId(response.data.id);
      }
      await invalidateCharacterViews(queryClient, id, response.data?.id ?? selectedCharacterId ?? "none");
    },
    onError: (error) => {
      setCharacterMessage(error instanceof Error ? error.message : "Nhập nhân vật cơ sở thất bại.");
    },
  });

  const quickCreateCharacterMutation = useMutation({
    mutationFn: async (payload?: QuickCharacterCreatePayload) => {
      const nextName = payload?.name?.trim() || quickCharacterForm.name.trim();
      const nextRole = payload?.role?.trim() || quickCharacterForm.role.trim() || "Nhân vật chính";
      const generatedProfile = payload ? buildCharacterProfileFromWizard(payload) : {};
      return createNovelCharacter(id, {
        name: nextName,
        role: nextRole,
        relationToProtagonist: payload?.relationToProtagonist?.trim() || undefined,
        storyFunction: payload?.storyFunction?.trim() || undefined,
        ...generatedProfile,
      });
    },
    onSuccess: async (response) => {
      setCharacterMessage(response.message ?? "Tạo nhân vật thành công.");
      setQuickCharacterForm((prev) => ({ ...prev, name: "" }));
      if (response.data?.id) {
        setSelectedCharacterId(response.data.id);
      }
      await invalidateCharacterViews(queryClient, id, response.data?.id ?? selectedCharacterId ?? "none");
    },
    onError: (error) => {
      setCharacterMessage(error instanceof Error ? error.message : "Tạo nhân vật thất bại.");
    },
  });

  const deleteCharacterMutation = useMutation({
    mutationFn: (characterId: string) => deleteNovelCharacter(id, characterId),
    onSuccess: async (_response, deletedCharacterId) => {
      setCharacterMessage("Nhân vật đã được xóa.");
      if (selectedCharacterId === deletedCharacterId) {
        const fallback = characters.find((item) => item.id !== deletedCharacterId);
        setSelectedCharacterId(fallback?.id ?? "");
      }
      await invalidateCharacterViews(queryClient, id, deletedCharacterId);
    },
    onError: (error) => {
      setCharacterMessage(error instanceof Error ? error.message : "Xóa nhân vật thất bại.");
    },
  });

  const generateSupplementalCharacterMutation = useMutation({
    mutationFn: (payload: SupplementalCharacterGenerateInput) =>
      generateSupplementalCharacters(id, {
        ...payload,
        provider: payload.provider ?? llm.provider,
        model: payload.model ?? llm.model,
        temperature: payload.temperature ?? 0.55,
      }),
    onError: (error) => {
      setCharacterMessage(error instanceof Error ? error.message : "Tạo nhân vật bổ sung thất bại.");
    },
  });

  const applySupplementalCharacterMutation = useMutation({
    mutationFn: (candidate: SupplementalCharacterCandidate) => applySupplementalCharacter(id, candidate),
    onSuccess: async (response) => {
      const createdCharacterId = response.data?.character?.id ?? "";
      const relationCount = response.data?.relationCount ?? 0;
      setCharacterMessage(
        response.message
        ?? `Đã tạo nhân vật bổ sung${relationCount > 0 ? `, đồng thời đồng bộ ${relationCount} quan hệ có cấu trúc` : ""}.`,
      );
      if (createdCharacterId) {
        setSelectedCharacterId(createdCharacterId);
      }
      await invalidateCharacterViews(queryClient, id, createdCharacterId || selectedCharacterId || "none");
    },
    onError: (error) => {
      setCharacterMessage(error instanceof Error ? error.message : "Áp dụng nhân vật bổ sung thất bại.");
    },
  });

  return {
    characterTimelineQuery,
    syncTimelineMutation,
    syncAllTimelineMutation,
    evolveCharacterMutation,
    worldCheckMutation,
    saveCharacterMutation,
    importBaseCharacterMutation,
    quickCreateCharacterMutation,
    deleteCharacterMutation,
    generateSupplementalCharacterMutation,
    applySupplementalCharacterMutation,
  };
}
