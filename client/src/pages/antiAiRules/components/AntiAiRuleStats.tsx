import { useTranslation } from "@/i18n";

interface StatTileProps {
  label: string;
  value: number;
  hint: string;
}

function StatTile(props: StatTileProps) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <div className="text-xs font-medium text-muted-foreground">{props.label}</div>
      <div className="mt-2 text-2xl font-semibold text-foreground">{props.value}</div>
      <div className="mt-1 text-xs leading-5 text-muted-foreground">{props.hint}</div>
    </div>
  );
}

interface AntiAiRuleStatsProps {
  total: number;
  enabled: number;
  global: number;
  autoRewrite: number;
}

export default function AntiAiRuleStats(props: AntiAiRuleStatsProps) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <StatTile label={t("antiAiRules.stats.total")} value={props.total} hint={t("antiAiRules.stats.totalHint")} />
      <StatTile label={t("antiAiRules.stats.enabled")} value={props.enabled} hint={t("antiAiRules.stats.enabledHint")} />
      <StatTile label={t("antiAiRules.stats.global")} value={props.global} hint={t("antiAiRules.stats.globalHint")} />
      <StatTile label={t("antiAiRules.stats.autoRewrite")} value={props.autoRewrite} hint={t("antiAiRules.stats.autoRewriteHint")} />
    </div>
  );
}
