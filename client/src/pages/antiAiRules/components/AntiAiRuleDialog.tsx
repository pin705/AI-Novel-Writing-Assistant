import { FormEvent } from "react";
import type { AntiAiRule } from "@ai-novel/shared/types/styleEngine";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppDialogContent, Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "@/i18n";
import type { RuleFormState } from "../antiAiRulesPage.shared";
import AntiAiToggleLine from "./AntiAiToggleLine";

interface AntiAiRuleDialogProps {
  open: boolean;
  editingRule: AntiAiRule | null;
  form: RuleFormState;
  aiInstruction: string;
  isSaving: boolean;
  isAiDrafting: boolean;
  onOpenChange: (open: boolean) => void;
  onFormChange: (patch: Partial<RuleFormState>) => void;
  onAiInstructionChange: (value: string) => void;
  onGenerateDraft: () => void;
  onSubmit: (event: FormEvent) => void;
}

export default function AntiAiRuleDialog(props: AntiAiRuleDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <AppDialogContent
        className="max-w-4xl"
        title={props.editingRule ? t("antiAiRules.dialog.titleEdit") : t("antiAiRules.dialog.titleCreate")}
        description={t("antiAiRules.dialog.description")}
        footer={(
          <>
            <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>{t("antiAiRules.dialog.cancel")}</Button>
            <Button type="submit" form="anti-ai-rule-form" disabled={props.isSaving}>
              {props.isSaving ? t("antiAiRules.dialog.saving") : t("antiAiRules.dialog.save")}
            </Button>
          </>
        )}
      >
        <form id="anti-ai-rule-form" className="space-y-4" onSubmit={props.onSubmit}>
          <div className="rounded-lg border bg-muted/20 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Sparkles className="h-4 w-4" />
                  {t("antiAiRules.dialog.aiAssist")}
                </div>
                <div className="text-sm leading-6 text-muted-foreground">
                  {props.editingRule
                    ? t("antiAiRules.dialog.aiHintEdit")
                    : t("antiAiRules.dialog.aiHintCreate")}
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={!props.aiInstruction.trim() || props.isAiDrafting}
                onClick={props.onGenerateDraft}
              >
                <Sparkles className="h-4 w-4" />
                {props.isAiDrafting ? t("antiAiRules.dialog.aiGenerating") : props.editingRule ? t("antiAiRules.dialog.aiImprove") : t("antiAiRules.dialog.aiGenerate")}
              </Button>
            </div>
            <textarea
              className="mt-3 min-h-[84px] w-full rounded-md border bg-background p-3 text-sm"
              value={props.aiInstruction}
              placeholder={props.editingRule
                ? t("antiAiRules.dialog.aiPlaceholderEdit")
                : t("antiAiRules.dialog.aiPlaceholderCreate")}
              onChange={(event) => props.onAiInstructionChange(event.target.value)}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">{t("antiAiRules.dialog.keyLabel")}</span>
              <Input
                value={props.form.key}
                placeholder={t("antiAiRules.dialog.keyPlaceholder")}
                onChange={(event) => props.onFormChange({ key: event.target.value })}
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">{t("antiAiRules.dialog.nameLabel")}</span>
              <Input
                value={props.form.name}
                placeholder={t("antiAiRules.dialog.namePlaceholder")}
                onChange={(event) => props.onFormChange({ name: event.target.value })}
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">{t("antiAiRules.dialog.typeLabel")}</span>
              <Select value={props.form.type} onValueChange={(value) => props.onFormChange({ type: value as AntiAiRule["type"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="forbidden">{t("antiAiRules.ruleTypes.forbidden")}</SelectItem>
                  <SelectItem value="risk">{t("antiAiRules.ruleTypes.risk")}</SelectItem>
                  <SelectItem value="encourage">{t("antiAiRules.ruleTypes.encourage")}</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">{t("antiAiRules.dialog.severityLabel")}</span>
              <Select value={props.form.severity} onValueChange={(value) => props.onFormChange({ severity: value as AntiAiRule["severity"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t("antiAiRules.ruleSeverities.low")}</SelectItem>
                  <SelectItem value="medium">{t("antiAiRules.ruleSeverities.medium")}</SelectItem>
                  <SelectItem value="high">{t("antiAiRules.ruleSeverities.high")}</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>

          <label className="space-y-1.5 text-sm">
            <span className="font-medium">{t("antiAiRules.dialog.descriptionLabel")}</span>
            <textarea
              className="min-h-[76px] w-full rounded-md border bg-background p-3 text-sm"
              value={props.form.description}
              placeholder={t("antiAiRules.dialog.descriptionPlaceholder")}
              onChange={(event) => props.onFormChange({ description: event.target.value })}
            />
          </label>

          <label className="space-y-1.5 text-sm">
            <span className="font-medium">{t("antiAiRules.dialog.patternsLabel")}</span>
            <textarea
              className="min-h-[80px] w-full rounded-md border bg-background p-3 text-sm"
              value={props.form.detectPatternsText}
              placeholder={t("antiAiRules.dialog.patternsPlaceholder")}
              onChange={(event) => props.onFormChange({ detectPatternsText: event.target.value })}
            />
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">{t("antiAiRules.dialog.promptInstructionLabel")}</span>
              <textarea
                className="min-h-[120px] w-full rounded-md border bg-background p-3 text-sm"
                value={props.form.promptInstruction}
                placeholder={t("antiAiRules.dialog.promptInstructionPlaceholder")}
                onChange={(event) => props.onFormChange({ promptInstruction: event.target.value })}
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">{t("antiAiRules.dialog.rewriteSuggestionLabel")}</span>
              <textarea
                className="min-h-[120px] w-full rounded-md border bg-background p-3 text-sm"
                value={props.form.rewriteSuggestion}
                placeholder={t("antiAiRules.dialog.rewriteSuggestionPlaceholder")}
                onChange={(event) => props.onFormChange({ rewriteSuggestion: event.target.value })}
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <AntiAiToggleLine
              label={t("antiAiRules.dialog.toggleEnabled")}
              checked={props.form.enabled}
              onCheckedChange={(checked) => props.onFormChange({ enabled: checked })}
            />
            <AntiAiToggleLine
              label={t("antiAiRules.dialog.toggleGlobal")}
              checked={props.form.globalBaselineEnabled}
              onCheckedChange={(checked) => props.onFormChange({ globalBaselineEnabled: checked })}
            />
            <AntiAiToggleLine
              label={t("antiAiRules.dialog.toggleAutoRewrite")}
              checked={props.form.autoRewrite}
              onCheckedChange={(checked) => props.onFormChange({ autoRewrite: checked })}
            />
          </div>
        </form>
      </AppDialogContent>
    </Dialog>
  );
}
