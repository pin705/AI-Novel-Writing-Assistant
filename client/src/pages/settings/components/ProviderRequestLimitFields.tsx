import { Input } from "@/components/ui/input";
import { useTranslation } from "@/i18n";

interface ProviderRequestLimitFieldsProps {
  concurrencyLimit: string;
  requestIntervalMs: string;
  onChange: (value: {
    concurrencyLimit?: string;
    requestIntervalMs?: string;
  }) => void;
}

export default function ProviderRequestLimitFields({
  concurrencyLimit,
  requestIntervalMs,
  onChange,
}: ProviderRequestLimitFieldsProps) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-3 rounded-md border bg-muted/20 p-3 sm:grid-cols-2">
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">{t("settings.providerDialog.requestLimitConcurrencyLabel")}</div>
        <Input
          type="number"
          min={0}
          step={1}
          value={concurrencyLimit}
          placeholder="0"
          onChange={(event) => onChange({ concurrencyLimit: event.target.value })}
        />
        <div className="break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
          {t("settings.providerDialog.requestLimitConcurrencyHint")}
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">{t("settings.providerDialog.requestLimitIntervalLabel")}</div>
        <Input
          type="number"
          min={0}
          step={100}
          value={requestIntervalMs}
          placeholder="0"
          onChange={(event) => onChange({ requestIntervalMs: event.target.value })}
        />
        <div className="break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
          {t("settings.providerDialog.requestLimitIntervalHint")}
        </div>
      </div>
    </div>
  );
}

export function ProviderRequestLimitSummary({
  concurrencyLimit,
  requestIntervalMs,
}: {
  concurrencyLimit: number;
  requestIntervalMs: number;
}) {
  const { t } = useTranslation();
  const concurrencyText = concurrencyLimit
    ? String(concurrencyLimit)
    : t("settings.providers.requestLimitConcurrencyUnlimited");
  const intervalText = requestIntervalMs
    ? t("settings.providers.requestLimitIntervalValue", { value: requestIntervalMs })
    : t("settings.providers.requestLimitIntervalUnlimited");
  return (
    <div className="mb-2 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
      {t("settings.providers.requestLimitSummary", { concurrency: concurrencyText, interval: intervalText })}
    </div>
  );
}
