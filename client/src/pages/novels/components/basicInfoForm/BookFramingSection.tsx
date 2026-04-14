import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n";
import { buildNovelBasicInfoI18n, type NovelBasicFormState } from "../../novelBasicInfo.shared";
import { FieldLabel } from "./BasicInfoFormPrimitives";

interface BookFramingSectionProps {
  basicForm: NovelBasicFormState;
  onFormChange: (patch: Partial<NovelBasicFormState>) => void;
  quickFill?: ReactNode;
}

export function BookFramingSection(props: BookFramingSectionProps) {
  const { basicForm, onFormChange, quickFill } = props;
  const { t } = useI18n();
  const { fieldHints } = buildNovelBasicInfoI18n(t);

  return (
    <div className="rounded-xl border border-border/70 bg-muted/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground">{t("novelCreate.framing.title")}</div>
          <div className="mt-1 text-sm leading-6 text-muted-foreground">
            {t("novelCreate.framing.description")}
          </div>
        </div>
        {quickFill ? <div className="shrink-0">{quickFill}</div> : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <FieldLabel htmlFor="basic-target-audience" hint={fieldHints.targetAudience}>
            {t("novelCreate.framing.targetAudience.label")}
          </FieldLabel>
          <Input
            id="basic-target-audience"
            value={basicForm.targetAudience}
            placeholder={t("novelCreate.framing.targetAudience.placeholder")}
            onChange={(event) => onFormChange({ targetAudience: event.target.value })}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="basic-commercial-tags" hint={fieldHints.commercialTagsText}>
            {t("novelCreate.framing.commercialTags.label")}
          </FieldLabel>
          <Input
            id="basic-commercial-tags"
            value={basicForm.commercialTagsText}
            placeholder={t("novelCreate.framing.commercialTags.placeholder")}
            onChange={(event) => onFormChange({ commercialTagsText: event.target.value })}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="basic-competing-feel" hint={fieldHints.competingFeel}>
            {t("novelCreate.framing.competingFeel.label")}
          </FieldLabel>
          <Input
            id="basic-competing-feel"
            value={basicForm.competingFeel}
            placeholder={t("novelCreate.framing.competingFeel.placeholder")}
            onChange={(event) => onFormChange({ competingFeel: event.target.value })}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="basic-book-selling-point" hint={fieldHints.bookSellingPoint}>
            {t("novelCreate.framing.bookSellingPoint.label")}
          </FieldLabel>
          <textarea
            id="basic-book-selling-point"
            rows={3}
            className="min-h-[96px] w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            value={basicForm.bookSellingPoint}
            placeholder={t("novelCreate.framing.bookSellingPoint.placeholder")}
            onChange={(event) => onFormChange({ bookSellingPoint: event.target.value })}
          />
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <FieldLabel htmlFor="basic-first30-promise" hint={fieldHints.first30ChapterPromise}>
          {t("novelCreate.framing.first30Promise.label")}
        </FieldLabel>
        <textarea
          id="basic-first30-promise"
          rows={5}
          className="min-h-[128px] w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          value={basicForm.first30ChapterPromise}
          placeholder={t("novelCreate.framing.first30Promise.placeholder")}
          onChange={(event) => onFormChange({ first30ChapterPromise: event.target.value })}
        />
      </div>
    </div>
  );
}
