import type { AutoDirectorFollowUpItem, AutoDirectorMutationActionCode } from "@ai-novel/shared/types/autoDirectorFollowUp";
import type { AutoDirectorFollowUpSection } from "@ai-novel/shared/types/autoDirectorValidation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/i18n";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";

interface AutoDirectorFollowUpBatchBarProps {
  selectedItems: AutoDirectorFollowUpItem[];
  batchActionCode: AutoDirectorMutationActionCode | null;
  loading: boolean;
  onClear: () => void;
  onExecute: () => void | Promise<void>;
}

function getSelectedSection(items: AutoDirectorFollowUpItem[]): AutoDirectorFollowUpSection | null {
  const sections = Array.from(new Set(items.map((item) => item.section)));
  return sections.length === 1 ? sections[0] : null;
}

export function AutoDirectorFollowUpBatchBar({
  selectedItems,
  batchActionCode,
  loading,
  onClear,
  onExecute,
}: AutoDirectorFollowUpBatchBarProps) {
  const { t } = useTranslation();

  const formatBatchActionLabel = (actionCode: AutoDirectorMutationActionCode | null): string => {
    if (actionCode === "continue_auto_execution") {
      return t("autoDirectorFollowUps.batchBar.continueAutoExecution");
    }
    if (actionCode === "retry_with_task_model") {
      return t("autoDirectorFollowUps.batchBar.retryWithTaskModel");
    }
    return t("autoDirectorFollowUps.batchBar.noCommonAction");
  };

  if (selectedItems.length === 0) {
    return null;
  }
  const selectedSection = getSelectedSection(selectedItems);

  return (
    <Card className={AUTO_DIRECTOR_MOBILE_CLASSES.followUpBatchBar}>
      <CardContent className="flex flex-col gap-3 pt-6 md:flex-row md:items-center md:justify-between">
        <div className={`min-w-0 text-sm ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
          {t("autoDirectorFollowUps.batchBar.selectedCount", { count: selectedItems.length })}
          <div className="text-xs text-muted-foreground">
            {selectedSection === "pending" || selectedSection === "exception"
              ? formatBatchActionLabel(batchActionCode)
              : t("autoDirectorFollowUps.batchBar.sectionNotAllowed")}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex">
          <Button variant="outline" size="sm" className="w-full md:w-auto" onClick={onClear} disabled={loading}>
            {t("autoDirectorFollowUps.batchBar.clear")}
          </Button>
          <Button size="sm" className="w-full md:w-auto" onClick={() => void onExecute()} disabled={!batchActionCode || loading}>
            {t("autoDirectorFollowUps.batchBar.execute")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
