import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getRagSettings } from "@/api/settings";
import { queryKeys } from "@/api/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";

export default function SettingsNavigationCards() {
  const { t } = useTranslation();
  const ragSettingsQuery = useQuery({
    queryKey: queryKeys.settings.rag,
    queryFn: getRagSettings,
  });
  const ragSettings = ragSettingsQuery.data?.data;
  const ragProvider = useMemo(
    () => ragSettings?.providers.find((item) => item.provider === ragSettings.embeddingProvider),
    [ragSettings],
  );

  return (
    <>
      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle>{t("settings.navigation.ragTitle")}</CardTitle>
          <CardDescription className={AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}>{t("settings.navigation.ragDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid min-w-0 gap-3 md:grid-cols-2">
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">{t("settings.navigation.ragProviderLabel")}</div>
              <div className={`mt-1 font-medium ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>{ragProvider?.name ?? ragSettings?.embeddingProvider ?? "-"}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">{t("settings.navigation.ragModelLabel")}</div>
              <div className={`mt-1 font-medium ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>{ragSettings?.embeddingModel ?? "-"}</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{t("settings.navigation.ragConnectionStatus")}</span>
            <Badge variant={ragProvider?.isConfigured ? "default" : "outline"}>
              {ragProvider?.isConfigured ? t("settings.navigation.ragApiKeyAvailable") : t("settings.navigation.ragApiKeyMissing")}
            </Badge>
            <Badge variant={ragProvider?.isActive ? "default" : "outline"}>
              {ragProvider?.isActive ? t("settings.navigation.ragActive") : t("settings.navigation.ragInactive")}
            </Badge>
          </div>
          <Button asChild className={AUTO_DIRECTOR_MOBILE_CLASSES.fullWidthAction}>
            <Link to="/knowledge?tab=settings">{t("settings.navigation.ragOpenSettings")}</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle>{t("settings.navigation.modelRouteTitle")}</CardTitle>
          <CardDescription className={AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}>{t("settings.navigation.modelRouteDescription")}</CardDescription>
        </CardHeader>
        <CardContent className={AUTO_DIRECTOR_MOBILE_CLASSES.settingsEntryActionRow}>
          <div className={`min-w-0 text-sm text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
            {t("settings.navigation.modelRouteSummary")}
          </div>
          <Button asChild className={AUTO_DIRECTOR_MOBILE_CLASSES.fullWidthAction}>
            <Link to="/settings/model-routes">{t("settings.navigation.modelRouteEnter")}</Link>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
