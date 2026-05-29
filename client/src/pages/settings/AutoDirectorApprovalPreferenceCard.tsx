import type { DirectorAutoApprovalPreferenceSettings } from "@ai-novel/shared/types/autoDirectorApproval";
import AutoDirectorApprovalPointMultiSelect, {
  summarizeDirectorAutoApprovalPoints,
} from "@/components/autoDirector/AutoDirectorApprovalPointMultiSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";

export function AutoDirectorApprovalPreferenceCard(props: {
  settings?: DirectorAutoApprovalPreferenceSettings | null;
  draftCodes: string[];
  onDraftCodesChange: (next: string[]) => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  const { t } = useTranslation();
  const {
    settings,
    draftCodes,
    onDraftCodesChange,
    onSave,
    isSaving,
  } = props;

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle>{t("settings.autoDirectorApproval.title")}</CardTitle>
        <CardDescription className={AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}>
          {t("settings.autoDirectorApproval.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`rounded-md border bg-muted/15 p-3 text-sm text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
          {t("settings.autoDirectorApproval.currentDefault", { value: summarizeDirectorAutoApprovalPoints(draftCodes, t) })}
        </div>
        <AutoDirectorApprovalPointMultiSelect
          value={draftCodes}
          onChange={onDraftCodesChange}
          groups={settings?.groups}
          approvalPoints={settings?.approvalPoints}
        />
        <div className={AUTO_DIRECTOR_MOBILE_CLASSES.settingsActionRow}>
          <Button className={AUTO_DIRECTOR_MOBILE_CLASSES.fullWidthAction} onClick={onSave} disabled={isSaving}>
            {isSaving ? t("settings.autoDirectorApproval.saving") : t("settings.autoDirectorApproval.save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
