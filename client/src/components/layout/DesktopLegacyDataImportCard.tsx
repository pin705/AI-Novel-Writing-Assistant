import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/i18n";
import { APP_RUNTIME, APP_RUNTIME_IS_PACKAGED } from "@/lib/constants";
import {
  getDesktopDataImportSnapshot,
  importDesktopLegacyDatabase,
  type DesktopDataImportSnapshot,
} from "@/lib/desktop";

interface DesktopLegacyDataImportCardProps {
  forceVisible?: boolean;
  compact?: boolean;
}

function shouldRenderCard(
  snapshot: DesktopDataImportSnapshot | null,
  forceVisible: boolean,
): boolean {
  if (forceVisible) {
    return true;
  }

  if (!snapshot) {
    return false;
  }

  return snapshot.currentDatabaseLikelyFresh || Boolean(snapshot.suggestedSourcePath);
}

export default function DesktopLegacyDataImportCard({
  forceVisible = false,
  compact = false,
}: DesktopLegacyDataImportCardProps) {
  const { t } = useTranslation();
  const isSupportedDesktop = APP_RUNTIME === "desktop" && APP_RUNTIME_IS_PACKAGED;
  const [snapshot, setSnapshot] = useState<DesktopDataImportSnapshot | null>(null);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (!isSupportedDesktop) {
      return;
    }

    let cancelled = false;
    setIsLoadingSnapshot(true);

    void getDesktopDataImportSnapshot()
      .then((nextSnapshot) => {
        if (!cancelled) {
          setSnapshot(nextSnapshot);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof Error
            ? error.message
            : t("components.layout.desktopLegacyImport.detectFailed"));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingSnapshot(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isSupportedDesktop, t]);

  if (!isSupportedDesktop || !shouldRenderCard(snapshot, forceVisible)) {
    return null;
  }

  const hasSuggestedSource = Boolean(snapshot?.suggestedSourcePath);
  const title = hasSuggestedSource
    ? t("components.layout.desktopLegacyImport.titleSuggested")
    : t("components.layout.desktopLegacyImport.titleManual");
  const description = hasSuggestedSource
    ? t("components.layout.desktopLegacyImport.descriptionSuggested")
    : t("components.layout.desktopLegacyImport.descriptionManual");

  const importData = async (preferSuggested: boolean) => {
    try {
      setIsImporting(true);
      const result = await importDesktopLegacyDatabase({ preferSuggested });
      if (result?.cancelled) {
        return;
      }
      if (result?.scheduled) {
        toast(t("components.layout.desktopLegacyImport.importScheduled"));
      }
    } catch (error) {
      toast.error(error instanceof Error
        ? error.message
        : t("components.layout.desktopLegacyImport.importFailed"));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card className="border-sky-200 bg-sky-50/80">
      <CardHeader className={compact ? "pb-3" : undefined}>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{title}</CardTitle>
          <Badge variant="outline">Desktop</Badge>
          {snapshot?.currentDatabaseLikelyFresh
            ? <Badge variant="outline">{t("components.layout.desktopLegacyImport.freshBadge")}</Badge>
            : null}
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {snapshot?.suggestedSourcePath ? (
          <div className="rounded-md border border-dashed bg-background/70 p-3 text-sm text-muted-foreground">
            {snapshot.suggestedSourceLabel
              ? t("components.layout.desktopLegacyImport.detectedPathWithLabel", {
                path: snapshot.suggestedSourcePath,
                label: snapshot.suggestedSourceLabel,
              })
              : t("components.layout.desktopLegacyImport.detectedPath", {
                path: snapshot.suggestedSourcePath,
              })}
          </div>
        ) : null}

        <div className="rounded-md border border-dashed bg-background/70 p-3 text-sm text-muted-foreground">
          {t("components.layout.desktopLegacyImport.backupNote", {
            path: snapshot?.backupDirectory ?? "-",
          })}
        </div>

        <div className="text-xs text-muted-foreground">
          {t("components.layout.desktopLegacyImport.closeOldProcess")}
        </div>

        <div className="flex flex-wrap gap-3">
          {hasSuggestedSource ? (
            <Button onClick={() => void importData(true)} disabled={isImporting || isLoadingSnapshot}>
              {isImporting
                ? t("components.layout.desktopLegacyImport.preparing")
                : t("components.layout.desktopLegacyImport.importDetected")}
            </Button>
          ) : null}
          <Button
            variant={hasSuggestedSource ? "outline" : "default"}
            onClick={() => void importData(false)}
            disabled={isImporting || isLoadingSnapshot}
          >
            {isImporting
              ? t("components.layout.desktopLegacyImport.preparing")
              : hasSuggestedSource
                ? t("components.layout.desktopLegacyImport.chooseAnotherDb")
                : t("components.layout.desktopLegacyImport.chooseDb")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
