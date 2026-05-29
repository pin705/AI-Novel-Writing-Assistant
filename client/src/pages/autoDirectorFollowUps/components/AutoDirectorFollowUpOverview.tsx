import type { AutoDirectorFollowUpListResponse, AutoDirectorFollowUpOverview } from "@ai-novel/shared/types/autoDirectorFollowUp";
import type { AutoDirectorFollowUpSection } from "@ai-novel/shared/types/autoDirectorValidation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";

interface OverviewCardConfig {
  section: AutoDirectorFollowUpSection | "";
  label: string;
  description: string;
  count: number;
}

interface AutoDirectorFollowUpOverviewCardsProps {
  overview: AutoDirectorFollowUpOverview | null;
  list: AutoDirectorFollowUpListResponse | null;
  activeSection: AutoDirectorFollowUpSection | "";
  onSectionChange: (section: AutoDirectorFollowUpSection | "") => void;
}

export function AutoDirectorFollowUpOverviewCards({
  overview,
  list,
  activeSection,
  onSectionChange,
}: AutoDirectorFollowUpOverviewCardsProps) {
  const { t } = useTranslation();
  const counters = list?.countersBySection ?? overview?.countersBySection;
  const cards: OverviewCardConfig[] = [
    {
      section: "",
      label: t("autoDirectorFollowUps.overview.all"),
      description: t("autoDirectorFollowUps.overview.allDescription"),
      count: overview?.totalCount ?? list?.pagination.total ?? 0,
    },
    {
      section: "needs_validation",
      label: t("autoDirectorFollowUps.overview.needsValidation"),
      description: t("autoDirectorFollowUps.overview.needsValidationDescription"),
      count: counters?.needs_validation ?? 0,
    },
    {
      section: "exception",
      label: t("autoDirectorFollowUps.overview.exception"),
      description: t("autoDirectorFollowUps.overview.exceptionDescription"),
      count: counters?.exception ?? 0,
    },
    {
      section: "pending",
      label: t("autoDirectorFollowUps.overview.pending"),
      description: t("autoDirectorFollowUps.overview.pendingDescription"),
      count: counters?.pending ?? 0,
    },
    {
      section: "auto_progress",
      label: t("autoDirectorFollowUps.overview.autoProgress"),
      description: t("autoDirectorFollowUps.overview.autoProgressDescription"),
      count: counters?.auto_progress ?? 0,
    },
    {
      section: "replaced",
      label: t("autoDirectorFollowUps.overview.replaced"),
      description: t("autoDirectorFollowUps.overview.replacedDescription"),
      count: counters?.replaced ?? 0,
    },
  ];

  return (
    <div className={AUTO_DIRECTOR_MOBILE_CLASSES.followUpOverviewGrid}>
      <Card className={AUTO_DIRECTOR_MOBILE_CLASSES.followUpOverviewCard}>
        <CardHeader className="pb-3">
          <div className={AUTO_DIRECTOR_MOBILE_CLASSES.followUpOverviewHeader}>
            <div className="min-w-0">
              <CardTitle className="text-base">{t("autoDirectorFollowUps.overview.title")}</CardTitle>
              <div className={`mt-1 text-xs text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
                {t("autoDirectorFollowUps.overview.summaryLine", {
                  recovered: list?.summaryCounters.recoveredToday ?? 0,
                  completed: list?.summaryCounters.completedToday ?? 0,
                })}
              </div>
            </div>
            <div className="text-2xl font-semibold leading-none">{overview?.totalCount ?? 0}</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className={AUTO_DIRECTOR_MOBILE_CLASSES.followUpOverviewSectionGrid}>
            {cards.map((card) => (
              <button
                key={card.section || "all"}
                type="button"
                onClick={() => onSectionChange(card.section)}
                className={cn(
                  "h-full min-w-0 rounded-lg border bg-background p-3 text-left transition hover:border-primary/50",
                  activeSection === card.section && "border-primary bg-primary/5",
                )}
              >
                <div className="text-sm font-medium">{card.label}</div>
                <div className="mt-1 text-xl font-semibold leading-none">{card.count}</div>
                <div className={`mt-1 text-xs text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
                  {card.description}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
