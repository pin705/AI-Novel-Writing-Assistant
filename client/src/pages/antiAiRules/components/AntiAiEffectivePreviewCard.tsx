import type { AntiAiEffectiveRulesResult, StyleProfile } from "@ai-novel/shared/types/styleEngine";
import { SlidersHorizontal } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "@/i18n";
import EffectiveRuleList from "./EffectiveRuleList";

interface AntiAiEffectivePreviewCardProps {
  profiles: StyleProfile[];
  styleProfileId: string;
  effective?: AntiAiEffectiveRulesResult;
  loading: boolean;
  onStyleProfileChange: (styleProfileId: string) => void;
}

export default function AntiAiEffectivePreviewCard(props: AntiAiEffectivePreviewCardProps) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <SlidersHorizontal className="h-5 w-5" />
          {t("antiAiRules.effectivePreview.title")}
        </CardTitle>
        <CardDescription>
          {t("antiAiRules.effectivePreview.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select
          value={props.styleProfileId || "__global__"}
          onValueChange={(value) => props.onStyleProfileChange(value === "__global__" ? "" : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("antiAiRules.effectivePreview.contextPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__global__">{t("antiAiRules.effectivePreview.globalOnly")}</SelectItem>
            {props.profiles.map((profile) => (
              <SelectItem key={profile.id} value={profile.id}>{profile.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {props.loading ? (
          <div className="text-sm text-muted-foreground">{t("antiAiRules.effectivePreview.calculating")}</div>
        ) : null}

        {props.effective ? (
          <div className="space-y-4">
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-md border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">{t("antiAiRules.effectivePreview.globalBaseline")}</div>
                <div className="mt-1 font-semibold">{props.effective.usesGlobalAntiAiBaseline ? t("antiAiRules.effectivePreview.applied") : t("antiAiRules.effectivePreview.notApplied")}</div>
              </div>
              <div className="rounded-md border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">{t("antiAiRules.effectivePreview.effectiveCount")}</div>
                <div className="mt-1 font-semibold">{props.effective.effectiveRules.length}</div>
              </div>
            </div>
            <EffectiveRuleList
              title={t("antiAiRules.effectivePreview.globalRulesTitle")}
              rules={props.effective.globalBaselineRules}
              empty={t("antiAiRules.effectivePreview.globalRulesEmpty")}
            />
            <EffectiveRuleList
              title={t("antiAiRules.effectivePreview.styleRulesTitle")}
              rules={props.effective.styleSpecificRules}
              empty={t("antiAiRules.effectivePreview.styleRulesEmpty")}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
