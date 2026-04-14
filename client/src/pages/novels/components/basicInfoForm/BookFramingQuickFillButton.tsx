import { useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { formatCommercialTagsInput, type NovelBasicFormState } from "../../novelBasicInfo.shared";
import { suggestBookFraming } from "@/api/novelFraming";
import AiButton from "@/components/common/AiButton";
import { useI18n } from "@/i18n";
import { toast } from "@/components/ui/toast";
import { useLLMStore } from "@/store/llmStore";

interface GenreOption {
  id: string;
  label: string;
  path: string;
}

interface BookFramingQuickFillButtonProps {
  basicForm: NovelBasicFormState;
  genreOptions: GenreOption[];
  onApplySuggestion: (patch: Partial<NovelBasicFormState>) => void;
  descriptionOverride?: string;
}

function hasExistingFramingContent(basicForm: NovelBasicFormState): boolean {
  return Boolean(
    basicForm.targetAudience.trim()
    || basicForm.commercialTagsText.trim()
    || basicForm.competingFeel.trim()
    || basicForm.bookSellingPoint.trim()
    || basicForm.first30ChapterPromise.trim(),
  );
}

export function BookFramingQuickFillButton(props: BookFramingQuickFillButtonProps) {
  const { basicForm, genreOptions, onApplySuggestion, descriptionOverride } = props;
  const llm = useLLMStore();
  const { t } = useI18n();
  const effectiveDescription = basicForm.description.trim() || descriptionOverride?.trim() || "";
  const selectedGenreLabel = useMemo(
    () => genreOptions.find((item) => item.id === basicForm.genreId)?.path
      ?? genreOptions.find((item) => item.id === basicForm.genreId)?.label
      ?? "",
    [basicForm.genreId, genreOptions],
  );

  const suggestionMutation = useMutation({
    mutationFn: () => suggestBookFraming({
      title: basicForm.title.trim() || undefined,
      description: effectiveDescription || undefined,
      genreLabel: selectedGenreLabel || undefined,
      styleTone: basicForm.styleTone.trim() || undefined,
      provider: llm.provider,
      model: llm.model,
      temperature: llm.temperature,
    }),
    onSuccess: (response) => {
      const suggestion = response.data;
      if (!suggestion) {
        toast.error(t("novelCreate.quickFill.framing.noSuggestion"));
        return;
      }
      onApplySuggestion({
        targetAudience: suggestion.targetAudience,
        commercialTagsText: formatCommercialTagsInput(suggestion.commercialTags),
        competingFeel: suggestion.competingFeel,
        bookSellingPoint: suggestion.bookSellingPoint,
        first30ChapterPromise: suggestion.first30ChapterPromise,
      });
      toast.success(t("novelCreate.quickFill.framing.success"));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("novelCreate.quickFill.framing.failure"));
    },
  });

  const handleGenerate = () => {
    if (!basicForm.title.trim() && !effectiveDescription) {
      toast.error(t("novelCreate.quickFill.framing.missingContext"));
      return;
    }
    if (hasExistingFramingContent(basicForm)) {
      const confirmed = window.confirm(t("novelCreate.quickFill.framing.confirmOverwrite"));
      if (!confirmed) {
        return;
      }
    }
    suggestionMutation.mutate();
  };

  return (
    <AiButton
      type="button"
      variant="outline"
      size="sm"
      onClick={handleGenerate}
      disabled={suggestionMutation.isPending}
    >
      {suggestionMutation.isPending ? t("novelCreate.quickFill.framing.loading") : t("novelCreate.quickFill.framing.action")}
    </AiButton>
  );
}
