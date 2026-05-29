import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/i18n";
import {
  AUTO_DIRECTOR_EVENT_OPTIONS,
  type AutoDirectorChannelDraft,
  summarizeSelectedAutoDirectorEvents,
} from "./autoDirectorEventOptions";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";

function AutoDirectorEventMultiSelect(props: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const { t } = useTranslation();
  const { value, onChange } = props;
  const [open, setOpen] = useState(false);

  return (
    <div className="min-w-0 space-y-2">
      <button
        type="button"
        className="flex min-h-10 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={`min-w-0 ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>{summarizeSelectedAutoDirectorEvents(value, t)}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{open ? t("settings.autoDirectorChannel.collapse") : t("settings.autoDirectorChannel.expand")}</span>
      </button>
      {open ? (
        <div className="min-w-0 space-y-2 rounded-md border bg-background p-3">
          {AUTO_DIRECTOR_EVENT_OPTIONS.map((item) => {
            const checked = value.includes(item.code);
            return (
              <label key={item.code} className="flex min-w-0 items-start gap-3 rounded-md border p-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={checked}
                  onChange={(event) => {
                    if (event.target.checked) {
                      onChange([...value, item.code]);
                      return;
                    }
                    onChange(value.filter((code) => code !== item.code));
                  }}
                />
                <div className="min-w-0 space-y-1">
                  <div className={`${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText} text-sm font-medium`}>{t(item.labelKey)}</div>
                  <div className={`${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText} text-xs text-muted-foreground`}>{t(item.descriptionKey)}</div>
                </div>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function AutoDirectorChannelSettingsCard(props: {
  channelDraft: AutoDirectorChannelDraft;
  onBaseUrlChange: (value: string) => void;
  onPatchChannelDraft: (
    channelType: "dingtalk" | "wecom",
    patch: Partial<AutoDirectorChannelDraft["dingtalk"]>,
  ) => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  const { t } = useTranslation();
  const {
    channelDraft,
    onBaseUrlChange,
    onPatchChannelDraft,
    onSave,
    isSaving,
  } = props;

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle>{t("settings.autoDirectorChannel.title")}</CardTitle>
        <CardDescription className={AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}>
          {t("settings.autoDirectorChannel.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">{t("settings.autoDirectorChannel.siteBaseUrlLabel")}</div>
          <Input
            value={channelDraft.baseUrl}
            placeholder={t("settings.autoDirectorChannel.siteBaseUrlPlaceholder")}
            onChange={(event) => onBaseUrlChange(event.target.value)}
          />
          <div className={`${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText} text-xs text-muted-foreground`}>
            {t("settings.autoDirectorChannel.siteBaseUrlHint")}
          </div>
        </div>

        {(["dingtalk", "wecom"] as const).map((channelType) => (
          <div key={channelType} className="min-w-0 space-y-3 rounded-lg border p-3 sm:p-4">
            <div className="font-medium">{channelType === "dingtalk" ? t("settings.autoDirectorChannel.dingtalk") : t("settings.autoDirectorChannel.wecom")}</div>
            <div className="grid min-w-0 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">{t("settings.autoDirectorChannel.webhookLabel")}</div>
                <Input
                  value={channelDraft[channelType].webhookUrl}
                  placeholder={t("settings.autoDirectorChannel.webhookPlaceholder")}
                  onChange={(event) => onPatchChannelDraft(channelType, { webhookUrl: event.target.value })}
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">{t("settings.autoDirectorChannel.callbackTokenLabel")}</div>
                <Input
                  value={channelDraft[channelType].callbackToken}
                  placeholder={t("settings.autoDirectorChannel.callbackTokenPlaceholder")}
                  onChange={(event) => onPatchChannelDraft(channelType, { callbackToken: event.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">{t("settings.autoDirectorChannel.operatorMapLabel")}</div>
              <Input
                value={channelDraft[channelType].operatorMapJson}
                placeholder={t("settings.autoDirectorChannel.operatorMapPlaceholder")}
                onChange={(event) => onPatchChannelDraft(channelType, { operatorMapJson: event.target.value })}
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">{t("settings.autoDirectorChannel.subscribedEventsLabel")}</div>
              <AutoDirectorEventMultiSelect
                value={channelDraft[channelType].eventTypes}
                onChange={(eventTypes) => onPatchChannelDraft(channelType, { eventTypes })}
              />
            </div>
          </div>
        ))}

        <div className={AUTO_DIRECTOR_MOBILE_CLASSES.channelSettingsActionRow}>
          <Button variant="outline" asChild className={AUTO_DIRECTOR_MOBILE_CLASSES.fullWidthAction}>
            <Link to="/settings/model-routes">{t("settings.autoDirectorChannel.openModelRoutes")}</Link>
          </Button>
          <Button className={AUTO_DIRECTOR_MOBILE_CLASSES.fullWidthAction} onClick={onSave} disabled={isSaving}>
            {isSaving ? t("settings.autoDirectorChannel.saving") : t("settings.autoDirectorChannel.save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
