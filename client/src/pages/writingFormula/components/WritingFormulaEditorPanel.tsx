import {
  STYLE_ENGINE_COMPATIBILITY_FIELDS,
  type AntiAiRule,
  type StyleExtractionPreset,
  type StyleProfile,
  type StyleProfileFeature,
  type StyleRulePatch,
} from "@ai-novel/shared/types/styleEngine";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n";
import { buildReadableRuleEntries, type RuleSection, type Translator } from "../writingFormulaRulePresentation";
import { parseJsonInput } from "../writingFormula.utils";
import { isStarterStyleProfile } from "../writingFormulaV2.shared";

interface WritingFormulaEditorState {
  name: string;
  description: string;
  category: string;
  tags: string;
  applicableGenres: string;
  sourceContent: string;
  extractedFeatures: StyleProfileFeature[];
  analysisMarkdown: string;
  narrativeRules: string;
  characterRules: string;
  languageRules: string;
  rhythmRules: string;
  antiAiRuleIds: string[];
}

interface WritingFormulaEditorPanelProps {
  selectedProfile: StyleProfile | null;
  editor: WritingFormulaEditorState;
  antiAiRules: AntiAiRule[];
  savePending: boolean;
  deletePending: boolean;
  reextractPending: boolean;
  onEditorChange: (patch: Partial<WritingFormulaEditorState>) => void;
  onToggleExtractedFeature: (featureId: string, checked: boolean) => void;
  onReextractFeatures: () => void;
  onToggleAntiAiRule: (ruleId: string, checked: boolean) => void;
  onSave: () => void;
  onDelete: () => void;
}

function FieldBlock(props: {
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-2">
      <div className="space-y-1">
        <div className="text-sm font-medium text-slate-900">{props.label}</div>
        <div className="text-xs leading-6 text-slate-500">{props.hint}</div>
      </div>
      {props.children}
    </label>
  );
}

const FEATURE_DECISION_CLASS: Record<NonNullable<StyleProfileFeature["selectedDecision"]>, string> = {
  keep: "border-emerald-200 bg-emerald-50 text-emerald-700",
  weaken: "border-amber-200 bg-amber-50 text-amber-700",
  remove: "border-rose-200 bg-rose-50 text-rose-700",
};

const RULE_PATCH_SECTION_I18N_KEYS: Record<keyof StyleRulePatch, string> = {
  narrativeRules: "writingFormula.editorPanel.rulePatchLabels.narrativeRules",
  characterRules: "writingFormula.editorPanel.rulePatchLabels.characterRules",
  languageRules: "writingFormula.editorPanel.rulePatchLabels.languageRules",
  rhythmRules: "writingFormula.editorPanel.rulePatchLabels.rhythmRules",
};

function formatScorePercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function countPresetDecisions(
  preset: StyleExtractionPreset,
): Record<NonNullable<StyleProfileFeature["selectedDecision"]>, number> {
  return preset.decisions.reduce<Record<NonNullable<StyleProfileFeature["selectedDecision"]>, number>>((result, item) => {
    result[item.decision] += 1;
    return result;
  }, {
    keep: 0,
    weaken: 0,
    remove: 0,
  });
}

function listRulePatchSections(t: Translator, patch: StyleRulePatch | undefined): string[] {
  if (!patch) {
    return [];
  }

  return (Object.entries(RULE_PATCH_SECTION_I18N_KEYS) as Array<[keyof StyleRulePatch, string]>)
    .filter(([key]) => {
      const section = patch[key];
      return Boolean(section && typeof section === "object" && !Array.isArray(section) && Object.keys(section).length > 0);
    })
    .map(([, labelKey]) => t(labelKey));
}

function RuleFieldCard(props: {
  t: Translator;
  title: string;
  hint: string;
  section: RuleSection;
  value: string;
  onChange: (value: string) => void;
}) {
  let parseError = false;
  let parsedRules: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(props.value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      parsedRules = parsed as Record<string, unknown>;
    } else {
      parseError = true;
    }
  } catch {
    parsedRules = parseJsonInput(props.value);
    parseError = props.value.trim() !== "" && Object.keys(parsedRules).length === 0 && props.value.trim() !== "{}";
  }

  const entries = buildReadableRuleEntries(props.t, props.section, parsedRules);

  return (
    <div className="space-y-2 rounded-2xl border bg-slate-50/70 p-4">
      <div className="space-y-1">
        <div className="text-sm font-medium text-slate-900">{props.title}</div>
        <div className="text-xs leading-6 text-slate-500">{props.hint}</div>
      </div>

      {entries.length > 0 ? (
        <div className="grid gap-2">
          {entries.map((entry) => (
            <div key={`${props.section}-${entry.key}`} className="rounded-xl border bg-white px-3 py-3">
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{entry.label}</div>
              <div className="mt-1 text-sm leading-6 text-slate-700">{entry.value}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed bg-white px-3 py-3 text-sm leading-6 text-slate-500">
          {props.t("writingFormula.editorPanel.rules.card.empty")}
        </div>
      )}

      <details className="rounded-xl border bg-white">
        <summary className="cursor-pointer list-none px-3 py-3 text-sm font-medium text-slate-700">
          {props.t("writingFormula.editorPanel.rules.card.showAdvanced")}
        </summary>
        <div className="space-y-3 border-t px-3 py-3">
          <div className="text-xs leading-6 text-slate-500">
            {props.t("writingFormula.editorPanel.rules.card.advancedHint")}
          </div>
          {parseError ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-900">
              {props.t("writingFormula.editorPanel.rules.card.parseError")}
            </div>
          ) : null}
          <textarea
            className="min-h-[190px] w-full rounded-xl border bg-slate-50 p-3 font-mono text-xs"
            value={props.value}
            onChange={(event) => props.onChange(event.target.value)}
          />
        </div>
      </details>
    </div>
  );
}

export default function WritingFormulaEditorPanel(props: WritingFormulaEditorPanelProps) {
  const { t } = useTranslation();
  const {
    selectedProfile,
    editor,
    antiAiRules,
    savePending,
    deletePending,
    reextractPending,
    onEditorChange,
    onToggleExtractedFeature,
    onReextractFeatures,
    onToggleAntiAiRule,
    onSave,
    onDelete,
  } = props;
  const compatibilityFields = STYLE_ENGINE_COMPATIBILITY_FIELDS.narrativeRules.join(" / ");
  const extractionPresets = selectedProfile?.extractionPresets ?? [];
  const selectedPresetKey = selectedProfile?.selectedExtractionPresetKey ?? null;
  const antiAiRuleByKey = new Map(antiAiRules.map((rule) => [rule.key, rule]));

  return (
    <Card data-writing-formula-editor-panel tabIndex={-1}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{t("writingFormula.editorPanel.title")}</CardTitle>
          {selectedProfile ? (
            <Button size="sm" variant="destructive" onClick={onDelete} disabled={deletePending}>
              {t("writingFormula.editorPanel.delete")}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {!selectedProfile ? (
          <div className="text-sm text-muted-foreground">{t("writingFormula.editorPanel.emptyPrompt")}</div>
        ) : (
          <>
            {isStarterStyleProfile(selectedProfile) ? (
              <div className="rounded-2xl border bg-muted/20 px-4 py-3 text-sm leading-7 text-muted-foreground">
                {t("writingFormula.editorPanel.starterNotice")}
              </div>
            ) : null}

            <div className="rounded-2xl border bg-slate-50/70 px-4 py-4 text-sm leading-7 text-slate-700">
              {t("writingFormula.editorPanel.primaryGuide")}
            </div>

            <div className="space-y-4 rounded-2xl border p-4">
              <div className="space-y-1">
                <div className="text-base font-semibold text-slate-950">{t("writingFormula.editorPanel.basics.title")}</div>
                <div className="text-sm leading-6 text-slate-500">
                  {t("writingFormula.editorPanel.basics.hint")}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FieldBlock label={t("writingFormula.editorPanel.basics.name.label")} hint={t("writingFormula.editorPanel.basics.name.hint")}>
                  <input
                    data-writing-formula-primary-input
                    className="w-full rounded-md border p-2 text-sm"
                    value={editor.name}
                    onChange={(event) => onEditorChange({ name: event.target.value })}
                  />
                </FieldBlock>
                <FieldBlock label={t("writingFormula.editorPanel.basics.category.label")} hint={t("writingFormula.editorPanel.basics.category.hint")}>
                  <input
                    className="w-full rounded-md border p-2 text-sm"
                    placeholder={t("writingFormula.editorPanel.basics.category.placeholder")}
                    value={editor.category}
                    onChange={(event) => onEditorChange({ category: event.target.value })}
                  />
                </FieldBlock>
              </div>

              <FieldBlock
                label={t("writingFormula.editorPanel.basics.description.label")}
                hint={t("writingFormula.editorPanel.basics.description.hint")}
              >
                <textarea
                  className="min-h-[96px] w-full rounded-md border p-2 text-sm"
                  placeholder={t("writingFormula.editorPanel.basics.description.placeholder")}
                  value={editor.description}
                  onChange={(event) => onEditorChange({ description: event.target.value })}
                />
              </FieldBlock>

              <div className="grid gap-4 md:grid-cols-2">
                <FieldBlock label={t("writingFormula.editorPanel.basics.tags.label")} hint={t("writingFormula.editorPanel.basics.tags.hint")}>
                  <input
                    className="w-full rounded-md border p-2 text-sm"
                    placeholder={t("writingFormula.editorPanel.basics.tags.placeholder")}
                    value={editor.tags}
                    onChange={(event) => onEditorChange({ tags: event.target.value })}
                  />
                </FieldBlock>
                <FieldBlock label={t("writingFormula.editorPanel.basics.applicableGenres.label")} hint={t("writingFormula.editorPanel.basics.applicableGenres.hint")}>
                  <input
                    className="w-full rounded-md border p-2 text-sm"
                    placeholder={t("writingFormula.editorPanel.basics.applicableGenres.placeholder")}
                    value={editor.applicableGenres}
                    onChange={(event) => onEditorChange({ applicableGenres: event.target.value })}
                  />
                </FieldBlock>
              </div>
            </div>

            {selectedProfile.sourceType === "from_text"
            || selectedProfile.sourceType === "from_knowledge_document"
            || editor.sourceContent.trim() ? (
              <div className="space-y-4 rounded-2xl border p-4">
                <div className="space-y-1">
                  <div className="text-base font-semibold text-slate-950">{t("writingFormula.editorPanel.source.title")}</div>
                  <div className="text-sm leading-6 text-slate-500">
                    {t("writingFormula.editorPanel.source.hint")}
                  </div>
                </div>

                <FieldBlock
                  label={t("writingFormula.editorPanel.source.sourceContent.label")}
                  hint={t("writingFormula.editorPanel.source.sourceContent.hint")}
                >
                  <textarea
                    className="min-h-[160px] w-full rounded-md border p-2 text-sm"
                    placeholder={t("writingFormula.editorPanel.source.sourceContent.placeholder")}
                    value={editor.sourceContent}
                    onChange={(event) => onEditorChange({ sourceContent: event.target.value })}
                  />
                </FieldBlock>

                <div className="rounded-2xl border p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{t("writingFormula.editorPanel.source.featuresTitle")}</div>
                      <div className="text-xs leading-6 text-slate-500">
                        {t("writingFormula.editorPanel.source.featuresHint")}
                        {editor.extractedFeatures.length > 0 ? t("writingFormula.editorPanel.source.featuresCount", { count: editor.extractedFeatures.length }) : ""}
                      </div>
                    </div>
                    {editor.sourceContent.trim() ? (
                      <Button size="sm" variant="outline" onClick={onReextractFeatures} disabled={reextractPending}>
                        {reextractPending ? t("writingFormula.editorPanel.source.reextracting") : t("writingFormula.editorPanel.source.reextract")}
                      </Button>
                    ) : null}
                  </div>

                  {editor.extractedFeatures.length > 0 ? (
                    <div className="space-y-3">
                      <div className="grid gap-2 md:grid-cols-2">
                      {editor.extractedFeatures.map((feature) => (
                        <label key={feature.id} className="flex items-start gap-2 rounded-md border p-3 text-sm">
                          <input
                            type="checkbox"
                            checked={feature.enabled}
                            onChange={(event) => onToggleExtractedFeature(feature.id, event.target.checked)}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{feature.label}</span>
                              <span className="text-xs text-muted-foreground">[{feature.group}]</span>
                              {feature.selectedDecision ? (
                                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${FEATURE_DECISION_CLASS[feature.selectedDecision]}`}>
                                  {t(`writingFormula.editorPanel.decisions.${feature.selectedDecision}`)}
                                </span>
                              ) : null}
                            </span>
                            <span className="mt-1 block text-xs leading-6 text-muted-foreground">{feature.description}</span>
                            <span className="mt-1 block text-xs leading-6 text-muted-foreground">{t("writingFormula.editorPanel.source.evidence", { value: feature.evidence })}</span>
                            <span className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                              <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                                {t("writingFormula.editorPanel.source.importance", { value: formatScorePercent(feature.importance) })}
                              </span>
                              <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                                {t("writingFormula.editorPanel.source.imitationValue", { value: formatScorePercent(feature.imitationValue) })}
                              </span>
                              <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                                {t("writingFormula.editorPanel.source.transferability", { value: formatScorePercent(feature.transferability) })}
                              </span>
                              <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                                {t("writingFormula.editorPanel.source.fingerprintRisk", { value: formatScorePercent(feature.fingerprintRisk) })}
                              </span>
                            </span>
                            <span className="mt-2 flex flex-wrap gap-2">
                              {listRulePatchSections(t, feature.keepRulePatch).length > 0 ? (
                                listRulePatchSections(t, feature.keepRulePatch).map((label) => (
                                  <span key={`${feature.id}-${label}`} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
                                    {t("writingFormula.editorPanel.source.rulePatchLabel", { label })}
                                  </span>
                                ))
                              ) : (
                                <span className="rounded-full border border-dashed border-slate-200 px-2 py-0.5 text-[11px] text-slate-500">
                                  {t("writingFormula.editorPanel.source.summaryOnlyRules")}
                                </span>
                              )}
                            </span>
                          </span>
                        </label>
                      ))}
                      </div>

                      {extractionPresets.length > 0 ? (
                        <div className="rounded-2xl border bg-slate-50/70 p-3">
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-slate-900">{t("writingFormula.editorPanel.source.presetSuggestionTitle")}</div>
                            <div className="text-xs leading-6 text-slate-500">
                              {t("writingFormula.editorPanel.source.presetSuggestionHint")}
                            </div>
                          </div>
                          <div className="mt-3 grid gap-3 lg:grid-cols-3">
                            {extractionPresets.map((preset) => {
                              const counts = countPresetDecisions(preset);
                              const isSelected = preset.key === selectedPresetKey;
                              return (
                                <div
                                  key={preset.key}
                                  className={`rounded-xl border bg-white p-3 ${isSelected ? "border-primary ring-1 ring-primary/20" : ""}`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-sm font-medium text-slate-900">{preset.label}</div>
                                    {isSelected ? (
                                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                                        {t("writingFormula.editorPanel.source.presetCurrent")}
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="mt-1 text-xs leading-6 text-slate-500">{preset.summary}</div>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">
                                      {t("writingFormula.editorPanel.source.presetCountKeep", { count: counts.keep })}
                                    </span>
                                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">
                                      {t("writingFormula.editorPanel.source.presetCountWeaken", { count: counts.weaken })}
                                    </span>
                                    <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] text-rose-700">
                                      {t("writingFormula.editorPanel.source.presetCountRemove", { count: counts.remove })}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}

                      {selectedProfile.extractionAntiAiRuleKeys.length > 0 ? (
                        <div className="rounded-2xl border bg-slate-50/70 p-3">
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-slate-900">{t("writingFormula.editorPanel.source.antiAiSuggestionTitle")}</div>
                            <div className="text-xs leading-6 text-slate-500">
                              {t("writingFormula.editorPanel.source.antiAiSuggestionHint")}
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {selectedProfile.extractionAntiAiRuleKeys.map((ruleKey) => {
                              const matchedRule = antiAiRuleByKey.get(ruleKey);
                              const isBound = Boolean(matchedRule && editor.antiAiRuleIds.includes(matchedRule.id));
                              return (
                                <span
                                  key={ruleKey}
                                  className={`rounded-full border px-2 py-1 text-xs ${
                                    isBound
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : "border-slate-200 bg-white text-slate-600"
                                  }`}
                                >
                                  {matchedRule?.name ?? ruleKey}
                                  {isBound
                                    ? t("writingFormula.editorPanel.source.antiAiBound")
                                    : matchedRule
                                      ? t("writingFormula.editorPanel.source.antiAiRecommended")
                                      : t("writingFormula.editorPanel.source.antiAiOriginal")}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      {t("writingFormula.editorPanel.source.noExtractedFeatures")}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <div className="space-y-4 rounded-2xl border p-4">
              <div className="space-y-1">
                <div className="text-base font-semibold text-slate-950">{t("writingFormula.editorPanel.analysis.title")}</div>
                <div className="text-sm leading-6 text-slate-500">
                  {t("writingFormula.editorPanel.analysis.hint")}
                </div>
              </div>
              <textarea
                className="min-h-[110px] w-full rounded-md border p-2 text-sm"
                placeholder={t("writingFormula.editorPanel.analysis.placeholder")}
                value={editor.analysisMarkdown}
                onChange={(event) => onEditorChange({ analysisMarkdown: event.target.value })}
              />
            </div>

            <div className="space-y-4 rounded-2xl border p-4">
              <div className="space-y-1">
                <div className="text-base font-semibold text-slate-950">{t("writingFormula.editorPanel.rules.title")}</div>
                <div className="text-sm leading-6 text-slate-500">
                  {t("writingFormula.editorPanel.rules.hint")}
                </div>
              </div>

              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-900">
                {t("writingFormula.editorPanel.rules.compatibilityNotice", { fields: compatibilityFields })}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <RuleFieldCard
                  t={t}
                  title={t("writingFormula.editorPanel.rules.narrative.title")}
                  hint={t("writingFormula.editorPanel.rules.narrative.hint")}
                  section="narrativeRules"
                  value={editor.narrativeRules}
                  onChange={(value) => onEditorChange({ narrativeRules: value })}
                />
                <RuleFieldCard
                  t={t}
                  title={t("writingFormula.editorPanel.rules.character.title")}
                  hint={t("writingFormula.editorPanel.rules.character.hint")}
                  section="characterRules"
                  value={editor.characterRules}
                  onChange={(value) => onEditorChange({ characterRules: value })}
                />
                <RuleFieldCard
                  t={t}
                  title={t("writingFormula.editorPanel.rules.language.title")}
                  hint={t("writingFormula.editorPanel.rules.language.hint")}
                  section="languageRules"
                  value={editor.languageRules}
                  onChange={(value) => onEditorChange({ languageRules: value })}
                />
                <RuleFieldCard
                  t={t}
                  title={t("writingFormula.editorPanel.rules.rhythm.title")}
                  hint={t("writingFormula.editorPanel.rules.rhythm.hint")}
                  section="rhythmRules"
                  value={editor.rhythmRules}
                  onChange={(value) => onEditorChange({ rhythmRules: value })}
                />
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border p-4">
              <div className="space-y-1">
                <div className="text-base font-semibold text-slate-950">{t("writingFormula.editorPanel.antiAi.title")}</div>
                <div className="text-sm leading-6 text-slate-500">
                  {t("writingFormula.editorPanel.antiAi.hint")}
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {antiAiRules.map((rule) => (
                  <label key={rule.id} className="flex items-start gap-2 rounded-md border p-3 text-sm">
                    <input
                      type="checkbox"
                      checked={editor.antiAiRuleIds.includes(rule.id)}
                      onChange={(event) => onToggleAntiAiRule(rule.id, event.target.checked)}
                    />
                    <span>
                      <span className="font-medium">{rule.name}</span>
                      <span className="mt-1 block text-xs leading-6 text-muted-foreground">{rule.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-slate-50/70 px-4 py-3">
              <div className="text-sm leading-6 text-slate-600">
                {t("writingFormula.editorPanel.saveFooter")}
              </div>
              <Button onClick={onSave} disabled={savePending || !editor.name.trim()}>
                {t("writingFormula.editorPanel.save")}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
