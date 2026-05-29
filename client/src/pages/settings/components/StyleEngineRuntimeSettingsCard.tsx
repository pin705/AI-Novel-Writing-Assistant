import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getStyleEngineRuntimeSettings,
  saveStyleEngineRuntimeSettings,
} from "@/api/settings";
import { queryKeys } from "@/api/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/i18n";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";

const MS_PER_MINUTE = 60_000;

function toMinutes(value: number | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 10;
  }
  return Math.round(value / MS_PER_MINUTE);
}

export default function StyleEngineRuntimeSettingsCard() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [timeoutMinutes, setTimeoutMinutes] = useState("10");
  const [feedback, setFeedback] = useState("");

  const settingsQuery = useQuery({
    queryKey: queryKeys.settings.styleEngineRuntime,
    queryFn: getStyleEngineRuntimeSettings,
  });

  const settings = settingsQuery.data?.data;
  const limits = useMemo(() => ({
    minMinutes: toMinutes(settings?.minStyleExtractionTimeoutMs),
    maxMinutes: toMinutes(settings?.maxStyleExtractionTimeoutMs),
    effectiveMinutes: toMinutes(settings?.styleExtractionTimeoutMs),
    defaultMinutes: toMinutes(settings?.defaultStyleExtractionTimeoutMs),
  }), [settings]);

  useEffect(() => {
    if (settings) {
      setTimeoutMinutes(String(toMinutes(settings.styleExtractionTimeoutMs)));
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (minutes: number) =>
      saveStyleEngineRuntimeSettings({
        styleExtractionTimeoutMs: minutes * MS_PER_MINUTE,
      }),
    onSuccess: async (response) => {
      setFeedback(response.message ?? t("settings.styleEngine.savedSuccess"));
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings.styleEngineRuntime });
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : t("settings.styleEngine.savedFailed"));
    },
  });

  const parsedMinutes = Number(timeoutMinutes);
  const isValidTimeout = Number.isInteger(parsedMinutes)
    && parsedMinutes >= limits.minMinutes
    && parsedMinutes <= limits.maxMinutes;

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <CardTitle>{t("settings.styleEngine.title")}</CardTitle>
          <CardDescription className={AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}>
            {t("settings.styleEngine.description")}
          </CardDescription>
        </div>
        <Badge variant="outline">{t("settings.styleEngine.effectiveBadge", { minutes: limits.effectiveMinutes })}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="space-y-2">
              <div className="text-sm font-medium">{t("settings.styleEngine.timeoutLabel")}</div>
              <Input
                type="number"
                min={limits.minMinutes}
                max={limits.maxMinutes}
                step={1}
                value={timeoutMinutes}
                onChange={(event) => {
                  setFeedback("");
                  setTimeoutMinutes(event.target.value);
                }}
              />
            </div>
            <Button
              className="w-full md:w-auto"
              onClick={() => saveMutation.mutate(parsedMinutes)}
              disabled={settingsQuery.isLoading || saveMutation.isPending || !isValidTimeout}
            >
              {saveMutation.isPending ? t("settings.styleEngine.saving") : t("settings.styleEngine.save")}
            </Button>
          </div>
          <div className={`text-xs text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
            {t("settings.styleEngine.rangeHint", { min: limits.minMinutes, max: limits.maxMinutes, defaultValue: limits.defaultMinutes })}
          </div>
        </div>

        {!isValidTimeout ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {t("settings.styleEngine.invalidRange", { min: limits.minMinutes, max: limits.maxMinutes })}
          </div>
        ) : null}

        {feedback ? <div className={`text-sm text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>{feedback}</div> : null}
      </CardContent>
    </Card>
  );
}
