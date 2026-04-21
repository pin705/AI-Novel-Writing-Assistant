import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StyleRecommendationResult } from "@ai-novel/shared/types/styleEngine";
import { createStyleBinding, getStyleBindings, recommendStyleProfilesForNovel } from "@/api/styleEngine";
import { queryKeys } from "@/api/queryKeys";
import AiButton from "@/components/common/AiButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLLMStore } from "@/store/llmStore";

interface NovelStyleRecommendationCardProps {
  novelId: string;
}

export default function NovelStyleRecommendationCard({ novelId }: NovelStyleRecommendationCardProps) {
  const llm = useLLMStore();
  const queryClient = useQueryClient();
  const [recommendation, setRecommendation] = useState<StyleRecommendationResult | null>(null);
  const [message, setMessage] = useState("");

  const novelBindingsQuery = useQuery({
    queryKey: queryKeys.styleEngine.bindings(`novel-${novelId}`),
    queryFn: () => getStyleBindings({ targetType: "novel", targetId: novelId }),
    enabled: Boolean(novelId),
  });

  const currentBindings = novelBindingsQuery.data?.data ?? [];
  const hasConfirmedBookStyle = currentBindings.length > 0;

  const recommendMutation = useMutation({
    mutationFn: () => recommendStyleProfilesForNovel(novelId, {
      provider: llm.provider,
      model: llm.model,
      temperature: 0.3,
    }),
    onSuccess: (response) => {
      setRecommendation(response.data ?? null);
      setMessage("");
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "Gợi ý viết pháp thất bại, vui lòng thử lại sau.");
    },
  });

  const applyMutation = useMutation({
    mutationFn: (styleProfileId: string) => createStyleBinding({
      styleProfileId,
      targetType: "novel",
      targetId: novelId,
      priority: 1,
      weight: 1,
      enabled: true,
    }),
    onSuccess: async () => {
      setMessage("Đã đặt viết pháp được gợi ý làm mặc định cho cuốn sách này. Các chương sau sẽ ưu tiên chạy theo bộ viết pháp này.");
      await queryClient.invalidateQueries({ queryKey: queryKeys.styleEngine.bindings(`novel-${novelId}`) });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "Liên kết viết pháp thất bại, vui lòng thử lại sau.");
    },
  });

  if (!novelId) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Xác nhận viết pháp trước khi mở viết nội dung</CardTitle>
          <div className="text-sm leading-6 text-muted-foreground">
            Không ép bạn phải chọn viết pháp ngay ở giai đoạn tạo. Khi độc giả mục tiêu, điểm bán và cam kết 30 chương đầu của cuốn sách đã dần rõ, hệ thống sẽ gợi ý tài nguyên viết pháp phù hợp hơn.
          </div>
        </div>
        <Button asChild type="button" variant="outline">
          <Link to="/writing-formula">Mở bộ máy viết pháp</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasConfirmedBookStyle ? (
          <div className="rounded-md border bg-muted/20 p-4">
            <div className="text-sm font-medium">Cuốn sách này đã xác nhận viết pháp mặc định</div>
            <div className="mt-2 space-y-2">
              {currentBindings.map((binding) => (
                <div key={binding.id} className="rounded-md border bg-background p-3 text-sm">
                  <div className="font-medium">{binding.styleProfile?.name ?? binding.styleProfileId}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Ưu tiên P{binding.priority} / cường độ W{binding.weight}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Nếu muốn đổi viết pháp mặc định cho cả cuốn, nên vào bộ máy viết pháp để liên kết lại, hoặc ghi đè cục bộ ở trang chương.
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <AiButton onClick={() => recommendMutation.mutate()} disabled={recommendMutation.isPending}>
                {recommendMutation.isPending ? "Đang gợi ý viết pháp..." : "AI gợi ý tài nguyên viết pháp"}
              </AiButton>
              {recommendation ? (
                <AiButton variant="secondary" onClick={() => recommendMutation.mutate()} disabled={recommendMutation.isPending}>
                  Gợi ý lại
                </AiButton>
              ) : null}
            </div>

            {!recommendation && !recommendMutation.isPending ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Hãy để hệ thống dựa trên độc giả mục tiêu, cam kết 30 chương đầu, thể loại, từ khóa văn phong và hướng kể của cuốn sách để gợi ý 2-3 bộ viết pháp rồi mới quyết định có dùng hay không.
              </div>
            ) : null}

            {recommendation ? (
              <div className="space-y-3">
                <div className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
                  {recommendation.summary}
                </div>
                {recommendation.candidates.length > 0 ? (
                  <div className="grid gap-3 lg:grid-cols-2">
                    {recommendation.candidates.map((candidate) => (
                      <div key={candidate.styleProfileId} className="rounded-md border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">{candidate.styleProfileName}</div>
                            {candidate.styleProfileDescription ? (
                              <div className="mt-1 text-xs text-muted-foreground">
                                {candidate.styleProfileDescription}
                              </div>
                            ) : null}
                          </div>
                          <div className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
                            Độ phù hợp {candidate.fitScore}
                          </div>
                        </div>
                        <div className="mt-3 text-sm leading-6">
                          {candidate.recommendationReason}
                        </div>
                        {candidate.caution ? (
                          <div className="mt-3 rounded-md border bg-muted/20 p-2 text-xs text-muted-foreground">
                            Lưu ý: {candidate.caution}
                          </div>
                        ) : null}
                        <div className="mt-4 flex justify-end">
                          <Button
                            onClick={() => applyMutation.mutate(candidate.styleProfileId)}
                            disabled={applyMutation.isPending}
                          >
                            {applyMutation.isPending ? "Đang xác nhận..." : "Đặt làm viết pháp mặc định"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    Hiện chưa có tài nguyên viết pháp nào để gợi ý. Bạn có thể vào bộ máy viết pháp tích lũy sẵn 1-2 bộ rồi quay lại để hệ thống đề xuất.
                  </div>
                )}
              </div>
            ) : null}
          </>
        )}

        {message ? (
          <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
            {message}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
