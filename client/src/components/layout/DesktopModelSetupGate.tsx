import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import type { APIKeyStatus } from "@/api/settings";
import { getAPIKeySettings } from "@/api/settings";
import { queryKeys } from "@/api/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n";
import { APP_RUNTIME, APP_RUNTIME_IS_PACKAGED } from "@/lib/constants";
import DesktopLegacyDataImportCard from "./DesktopLegacyDataImportCard";

function hasUsableDesktopProviderConfig(providerConfigs: APIKeyStatus[]): boolean {
  return providerConfigs.some((item) => item.isConfigured && item.isActive && item.currentModel.trim().length > 0);
}

export default function DesktopModelSetupGate() {
  const location = useLocation();
  const { t } = useTranslation();
  const shouldCheckDesktopSetup = APP_RUNTIME === "desktop" && APP_RUNTIME_IS_PACKAGED;
  const settingsQuery = useQuery({
    queryKey: queryKeys.settings.apiKeys,
    queryFn: getAPIKeySettings,
    enabled: shouldCheckDesktopSetup,
  });

  const providerConfigs = useMemo(() => settingsQuery.data?.data ?? [], [settingsQuery.data?.data]);

  if (!shouldCheckDesktopSetup || settingsQuery.isLoading || settingsQuery.isError) {
    return null;
  }

  if (hasUsableDesktopProviderConfig(providerConfigs)) {
    return null;
  }

  const isSettingsRoute = location.pathname.startsWith("/settings");
  const isHelpRoute = location.pathname.startsWith("/help");
  const configuredProviderCount = providerConfigs.filter((item) => item.isConfigured && item.isActive).length;

  if (isHelpRoute) {
    return null;
  }

  if (isSettingsRoute) {
    return (
      <Card className="mb-4 border-amber-300 bg-amber-50/90">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{t("components.layout.desktopModelSetup.settingsTitle")}</CardTitle>
            <Badge variant="outline">{t("components.layout.desktopModelSetup.settingsBadge")}</Badge>
          </div>
          <CardDescription>
            {t("components.layout.desktopModelSetup.settingsDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            {t("components.layout.desktopModelSetup.settingsBody")}
          </p>
          <p>
            {t("components.layout.desktopModelSetup.usableProviders", { count: configuredProviderCount })}
          </p>
          <DesktopLegacyDataImportCard />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 px-6 py-10 backdrop-blur-sm">
      <Card className="w-full max-w-2xl border-amber-300 shadow-2xl">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{t("components.layout.desktopModelSetup.blockerTitle")}</CardTitle>
            <Badge variant="outline">{t("components.layout.desktopModelSetup.settingsBadge")}</Badge>
          </div>
          <CardDescription>
            {t("components.layout.desktopModelSetup.blockerDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
            {t("components.layout.desktopModelSetup.blockerHint")}
          </div>
          <DesktopLegacyDataImportCard />
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/settings">{t("components.layout.desktopModelSetup.openSettings")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/help">{t("components.layout.desktopModelSetup.openHelp")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
