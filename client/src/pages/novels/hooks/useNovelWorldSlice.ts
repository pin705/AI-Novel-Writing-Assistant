import { useState } from "react";
import { useMutation, useQuery, type QueryClient } from "@tanstack/react-query";
import type { StoryWorldSliceOverrides } from "@ai-novel/shared/types/storyWorldSlice";
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import { queryKeys } from "@/api/queryKeys";
import {
  getNovelWorldSlice,
  refreshNovelWorldSlice,
  updateNovelWorldSliceOverrides,
} from "@/api/novelWorldSlice";

interface UseNovelWorldSliceOptions {
  novelId: string;
  llm: {
    provider: LLMProvider;
    model: string;
    temperature: number;
  };
  queryClient: QueryClient;
}

export function useNovelWorldSlice({ novelId, llm, queryClient }: UseNovelWorldSliceOptions) {
  const [worldSliceMessage, setWorldSliceMessage] = useState("");

  const worldSliceQuery = useQuery({
    queryKey: queryKeys.novels.worldSlice(novelId),
    queryFn: () => getNovelWorldSlice(novelId),
    enabled: Boolean(novelId),
  });

  const refreshWorldSliceMutation = useMutation({
    mutationFn: () => refreshNovelWorldSlice(novelId, {
      builderMode: "manual_refresh",
      provider: llm.provider,
      model: llm.model,
      temperature: llm.temperature,
    }),
    onSuccess: async () => {
      setWorldSliceMessage("Đã sắp xếp lại phần thiết lập thế giới mà cuốn sách này sẽ dùng.");
      await queryClient.invalidateQueries({ queryKey: queryKeys.novels.worldSlice(novelId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.novels.detail(novelId) });
    },
  });

  const saveWorldSliceOverridesMutation = useMutation({
    mutationFn: (payload: StoryWorldSliceOverrides) => updateNovelWorldSliceOverrides(novelId, payload),
    onSuccess: async () => {
      setWorldSliceMessage("Đã lưu các mục thế giới cần giữ lại cho cuốn sách này.");
      await queryClient.invalidateQueries({ queryKey: queryKeys.novels.worldSlice(novelId) });
    },
  });

  return {
    worldSliceMessage,
    setWorldSliceMessage,
    worldSliceView: worldSliceQuery.data?.data ?? null,
    isRefreshingWorldSlice: refreshWorldSliceMutation.isPending || worldSliceQuery.isFetching,
    isSavingWorldSliceOverrides: saveWorldSliceOverridesMutation.isPending,
    refreshWorldSlice: () => refreshWorldSliceMutation.mutate(),
    saveWorldSliceOverrides: (patch: StoryWorldSliceOverrides) => saveWorldSliceOverridesMutation.mutate(patch),
  };
}
