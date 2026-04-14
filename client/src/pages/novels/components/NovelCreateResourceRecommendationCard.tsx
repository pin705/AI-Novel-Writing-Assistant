import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { NovelCreateResourceRecommendation } from "@ai-novel/shared/types/novelResourceRecommendation";
import { recommendNovelCreateResources } from "@/api/novel";
import { useI18n } from "@/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLLMStore } from "@/store/llmStore";
import type { NovelBasicFormState } from "../novelBasicInfo.shared";

interface NovelCreateResourceRecommendationCardProps {
  basicForm: NovelBasicFormState;
  onApplySuggestion: (patch: Partial<NovelBasicFormState>) => void;
  contextHint?: string;
}

function buildRecommendationSignature(basicForm: NovelBasicFormState, contextHint?: string): string {
  return JSON.stringify({
    title: basicForm.title.trim(),
    description: basicForm.description.trim(),
    contextHint: contextHint?.trim() ?? "",
    targetAudience: basicForm.targetAudience.trim(),
    bookSellingPoint: basicForm.bookSellingPoint.trim(),
    competingFeel: basicForm.competingFeel.trim(),
    first30ChapterPromise: basicForm.first30ChapterPromise.trim(),
    commercialTagsText: basicForm.commercialTagsText.trim(),
    styleTone: basicForm.styleTone.trim(),
    writingMode: basicForm.writingMode,
    projectMode: basicForm.projectMode,
    narrativePov: basicForm.narrativePov,
    pacePreference: basicForm.pacePreference,
    emotionIntensity: basicForm.emotionIntensity,
    aiFreedom: basicForm.aiFreedom,
    genreId: basicForm.genreId,
    primaryStoryModeId: basicForm.primaryStoryModeId,
    secondaryStoryModeId: basicForm.secondaryStoryModeId,
  });
}

function hasRecommendationContext(basicForm: NovelBasicFormState, contextHint?: string): boolean {
  return [
    contextHint ?? "",
    basicForm.title,
    basicForm.description,
    basicForm.targetAudience,
    basicForm.bookSellingPoint,
    basicForm.competingFeel,
    basicForm.first30ChapterPromise,
    basicForm.commercialTagsText,
    basicForm.styleTone,
  ].some((item) => item.trim().length > 0);
}

function matchesRecommendation(
  basicForm: NovelBasicFormState,
  recommendation: NovelCreateResourceRecommendation | null,
): boolean {
  if (!recommendation) {
    return false;
  }
  return (
    basicForm.genreId === recommendation.genre.id
    && basicForm.primaryStoryModeId === recommendation.primaryStoryMode.id
    && basicForm.secondaryStoryModeId === (recommendation.secondaryStoryMode?.id ?? "")
  );
}

export default function NovelCreateResourceRecommendationCard(
  props: NovelCreateResourceRecommendationCardProps,
) {
  const { basicForm, onApplySuggestion, contextHint = "" } = props;
  const llm = useLLMStore();
  const { t } = useI18n();
  const [recommendation, setRecommendation] = useState<NovelCreateResourceRecommendation | null>(null);
  const [message, setMessage] = useState("");
  const [recommendedSignature, setRecommendedSignature] = useState("");

  const trimmedContextHint = contextHint.trim();
  const currentSignature = buildRecommendationSignature(basicForm, trimmedContextHint);
  const canRecommend = hasRecommendationContext(basicForm, trimmedContextHint);
  const hasAppliedRecommendation = matchesRecommendation(basicForm, recommendation);
  const recommendationIsStale = Boolean(recommendation && recommendedSignature && recommendedSignature !== currentSignature);

  const recommendMutation = useMutation({
    mutationFn: () => recommendNovelCreateResources({
      title: basicForm.title || undefined,
      description: basicForm.description || trimmedContextHint || undefined,
      targetAudience: basicForm.targetAudience || undefined,
      bookSellingPoint: basicForm.bookSellingPoint || undefined,
      competingFeel: basicForm.competingFeel || undefined,
      first30ChapterPromise: basicForm.first30ChapterPromise || undefined,
      commercialTags: basicForm.commercialTagsText
        .split(/[，,]/)
        .map((item) => item.trim())
        .filter(Boolean),
      genreId: basicForm.genreId || undefined,
      primaryStoryModeId: basicForm.primaryStoryModeId || undefined,
      secondaryStoryModeId: basicForm.secondaryStoryModeId || undefined,
      writingMode: basicForm.writingMode,
      projectMode: basicForm.projectMode,
      narrativePov: basicForm.narrativePov,
      pacePreference: basicForm.pacePreference,
      styleTone: basicForm.styleTone || undefined,
      emotionIntensity: basicForm.emotionIntensity,
      aiFreedom: basicForm.aiFreedom,
      provider: llm.provider,
      model: llm.model,
      temperature: 0.3,
    }),
    onSuccess: (response) => {
      setRecommendation(response.data ?? null);
      setRecommendedSignature(currentSignature);
      setMessage("");
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : t("novelCreate.resourceRecommendation.failure"));
    },
  });

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-foreground">{t("novelCreate.resourceRecommendation.title")}</div>
          <div className="text-sm leading-6 text-muted-foreground">
            {t("novelCreate.resourceRecommendation.description")}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => recommendMutation.mutate()}
            disabled={!canRecommend || recommendMutation.isPending}
          >
            {recommendMutation.isPending
              ? t("novelCreate.resourceRecommendation.loading")
              : recommendation
                ? t("novelCreate.resourceRecommendation.retry")
                : t("novelCreate.resourceRecommendation.action")}
          </Button>
          {hasAppliedRecommendation ? (
            <Badge variant="outline">{t("novelCreate.resourceRecommendation.appliedBadge")}</Badge>
          ) : null}
        </div>
      </div>

      {!canRecommend ? (
        <div className="mt-3 rounded-md border border-dashed bg-background/70 p-3 text-sm text-muted-foreground">
          {t("novelCreate.resourceRecommendation.empty")}
        </div>
      ) : null}

      {recommendation ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-md border bg-background/80 p-3 text-sm leading-6 text-muted-foreground">
            {recommendation.summary}
          </div>

          {recommendationIsStale ? (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
              {t("novelCreate.resourceRecommendation.stale")}
            </div>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-lg border bg-background/80 p-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("novelCreate.resourceRecommendation.genre.title")}</div>
              <div className="mt-1 text-sm font-semibold text-foreground">{recommendation.genre.path}</div>
              <div className="mt-2 text-xs leading-5 text-muted-foreground">{recommendation.genre.reason}</div>
            </div>

            <div className="rounded-lg border bg-background/80 p-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("novelCreate.resourceRecommendation.primaryStoryMode.title")}</div>
              <div className="mt-1 text-sm font-semibold text-foreground">{recommendation.primaryStoryMode.path}</div>
              <div className="mt-2 text-xs leading-5 text-muted-foreground">{recommendation.primaryStoryMode.reason}</div>
            </div>

            <div className="rounded-lg border bg-background/80 p-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("novelCreate.resourceRecommendation.secondaryStoryMode.title")}</div>
              {recommendation.secondaryStoryMode ? (
                <>
                  <div className="mt-1 text-sm font-semibold text-foreground">{recommendation.secondaryStoryMode.path}</div>
                  <div className="mt-2 text-xs leading-5 text-muted-foreground">{recommendation.secondaryStoryMode.reason}</div>
                </>
              ) : (
                <div className="mt-2 text-xs leading-5 text-muted-foreground">
                  {t("novelCreate.resourceRecommendation.secondaryStoryMode.none")}
                </div>
              )}
            </div>
          </div>

          {recommendation.caution ? (
            <div className="rounded-md border bg-background/80 px-3 py-2 text-sm text-muted-foreground">
              {t("novelCreate.resourceRecommendation.caution", { value: recommendation.caution })}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant={hasAppliedRecommendation ? "secondary" : "default"}
              onClick={() => {
                onApplySuggestion({
                  genreId: recommendation.genre.id,
                  primaryStoryModeId: recommendation.primaryStoryMode.id,
                  secondaryStoryModeId: recommendation.secondaryStoryMode?.id ?? "",
                });
                setMessage(t("novelCreate.resourceRecommendation.applySuccess"));
              }}
            >
              {hasAppliedRecommendation
                ? t("novelCreate.resourceRecommendation.appliedAction")
                : t("novelCreate.resourceRecommendation.applyAction")}
            </Button>
          </div>
        </div>
      ) : null}

      {message ? (
        <div className="mt-3 rounded-md border bg-background/80 px-3 py-2 text-sm">
          {message}
        </div>
      ) : null}
    </div>
  );
}
