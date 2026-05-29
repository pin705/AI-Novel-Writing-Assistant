import type { StyleDetectionReport, StyleProfile } from "@ai-novel/shared/types/styleEngine";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n";

interface WritingFormulaCleanPanelProps {
  selectedProfile: StyleProfile | null;
  detectInput: string;
  detectionReport: StyleDetectionReport | null;
  detectionPending: boolean;
  rewritePending: boolean;
  rewritePreview: string;
  onDetectInputChange: (value: string) => void;
  onDetect: () => void;
  onRewrite: () => void;
}

export default function WritingFormulaCleanPanel(props: WritingFormulaCleanPanelProps) {
  const { t } = useTranslation();
  const {
    selectedProfile,
    detectInput,
    detectionReport,
    detectionPending,
    rewritePending,
    rewritePreview,
    onDetectInputChange,
    onDetect,
    onRewrite,
  } = props;

  const antiAiRuleNames = selectedProfile?.antiAiRules.map((rule) => rule.name) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("writingFormula.cleanPanel.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {selectedProfile ? (
          <div className="rounded-2xl border bg-slate-50/70 px-4 py-3 text-sm leading-7 text-slate-700">
            {t("writingFormula.cleanPanel.introWithProfile", { name: selectedProfile.name })}
          </div>
        ) : (
          <div className="rounded-2xl border bg-slate-50/70 px-4 py-3 text-sm leading-7 text-slate-700">
            {t("writingFormula.cleanPanel.introEmpty")}
          </div>
        )}

        <div className="space-y-4 rounded-2xl border p-4">
          <div className="space-y-1">
            <div className="text-base font-semibold text-slate-950">{t("writingFormula.cleanPanel.antiAiHeading")}</div>
            <div className="text-sm leading-6 text-slate-500">
              {t("writingFormula.cleanPanel.antiAiHint")}
            </div>
          </div>
          {antiAiRuleNames.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {antiAiRuleNames.map((ruleName) => (
                <div key={`${selectedProfile?.id}-${ruleName}`} className="rounded-full border bg-slate-50 px-3 py-1 text-sm text-slate-700">
                  {ruleName}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed px-3 py-3 text-sm leading-6 text-slate-500">
              {t("writingFormula.cleanPanel.antiAiEmpty")}
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border p-4">
          <div className="space-y-1">
            <div className="text-base font-semibold text-slate-950">{t("writingFormula.cleanPanel.detectHeading")}</div>
            <div className="text-sm leading-6 text-slate-500">
              {t("writingFormula.cleanPanel.detectHint")}
            </div>
          </div>

          <textarea
            data-writing-formula-detect-input
            autoFocus
            className="min-h-[220px] w-full rounded-md border p-3 text-sm"
            placeholder={t("writingFormula.cleanPanel.detectPlaceholder")}
            value={detectInput}
            onChange={(event) => onDetectInputChange(event.target.value)}
          />

          <div className="flex flex-wrap gap-2">
            <Button onClick={onDetect} disabled={detectionPending || !selectedProfile || !detectInput.trim()}>
              {t("writingFormula.cleanPanel.runDetect")}
            </Button>
            <Button variant="secondary" onClick={onRewrite} disabled={rewritePending || !selectedProfile || !detectInput.trim()}>
              {t("writingFormula.cleanPanel.runRewrite")}
            </Button>
          </div>

          {detectionReport ? (
            <div className="space-y-3 rounded-2xl border p-4 text-sm">
              <div className="space-y-1">
                <div className="font-medium text-slate-900">{t("writingFormula.cleanPanel.riskScore", { score: detectionReport.riskScore })}</div>
                <div className="leading-6 text-slate-600">{detectionReport.summary}</div>
              </div>
              <div className="space-y-2">
                {detectionReport.violations.map((item, index) => (
                  <div key={`${item.ruleId}-${index}`} className="rounded-xl border p-3">
                    <div className="font-medium text-slate-900">{item.ruleName}</div>
                    <div className="mt-1 text-xs leading-6 text-slate-500">{item.reason}</div>
                    <div className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
                      {item.excerpt}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed px-3 py-3 text-sm leading-6 text-slate-500">
              {t("writingFormula.cleanPanel.detectionEmpty")}
            </div>
          )}

          {rewritePreview ? (
            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-900">{t("writingFormula.cleanPanel.rewriteResult")}</div>
              <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap rounded-xl border bg-muted/20 p-4 text-sm">
                {rewritePreview}
              </pre>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
