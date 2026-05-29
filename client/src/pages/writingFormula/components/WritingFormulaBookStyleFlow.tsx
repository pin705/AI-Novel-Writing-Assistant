import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n";

interface WritingFormulaBookStyleFlowProps {
  novelId: string;
  novelTitle?: string;
  onOpenAdvanced: () => void;
  onOpenCreate: () => void;
}

export default function WritingFormulaBookStyleFlow(props: WritingFormulaBookStyleFlowProps) {
  const { t } = useTranslation();
  const {
    novelId,
    novelTitle,
    onOpenAdvanced,
    onOpenCreate,
  } = props;
  const novelRoute = novelId ? `/novels/${novelId}/edit` : "/novels";

  return (
    <Card className="border-slate-200/80 bg-white/90 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <CardHeader>
        <CardTitle>{t("writingFormula.bookStyle.title")}</CardTitle>
        <div className="text-sm leading-7 text-muted-foreground">
          {t("writingFormula.bookStyle.description")}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="space-y-4 rounded-2xl border bg-slate-50/70 p-4">
            <div className="text-sm font-medium text-slate-900">{t("writingFormula.bookStyle.entryHeading")}</div>
            <div className="rounded-2xl border bg-white p-4 text-sm leading-7 text-slate-700">
              {novelId
                ? t("writingFormula.bookStyle.entryWithNovel", {
                    novelLabel: novelTitle ? t("writingFormula.bookStyle.novelLabel", { title: novelTitle }) : "",
                  })
                : t("writingFormula.bookStyle.entryWithoutNovel")}
            </div>
            <div className="rounded-2xl border bg-slate-950 p-4 text-white">
              <div className="text-sm font-medium">{t("writingFormula.bookStyle.splitTitle")}</div>
              <div className="mt-3 space-y-2 text-sm leading-7 text-slate-200">
                <div>{t("writingFormula.bookStyle.splitNovelPage")}</div>
                <div>{t("writingFormula.bookStyle.splitEngine")}</div>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border bg-white p-4">
            <div className="text-sm font-medium text-slate-900">{t("writingFormula.bookStyle.nextHeading")}</div>
            <div className="rounded-2xl border bg-slate-50/70 p-4 text-sm leading-7 text-slate-700">
              {t("writingFormula.bookStyle.nextDescription")}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild type="button">
                <Link to={novelRoute}>{t("writingFormula.bookStyle.goToNovelPage")}</Link>
              </Button>
              <Button type="button" variant="outline" onClick={onOpenAdvanced}>
                {t("writingFormula.bookStyle.editCurrent")}
              </Button>
              <Button type="button" variant="outline" onClick={onOpenCreate}>
                {t("writingFormula.bookStyle.createNew")}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
