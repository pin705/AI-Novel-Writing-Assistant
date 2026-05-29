import type { AntiAiRule, StyleProfile, StyleProfileFeature } from "@ai-novel/shared/types/styleEngine";
import { useTranslation } from "@/i18n";
import WritingFormulaEditorPanel from "./WritingFormulaEditorPanel";

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

interface WritingFormulaAdvancedWorkspaceProps {
  antiAiRules: AntiAiRule[];
  selectedProfile: StyleProfile | null;
  editor: WritingFormulaEditorState;
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

export default function WritingFormulaAdvancedWorkspace(props: WritingFormulaAdvancedWorkspaceProps) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex h-full min-h-0 max-w-[1120px] flex-col gap-4 overflow-y-auto xl:pr-1">
      <div className="rounded-2xl border bg-slate-50/70 px-4 py-3 text-sm leading-7 text-slate-700">
        {props.selectedProfile
          ? t("writingFormula.advancedWorkspace.intro", { name: props.selectedProfile.name })
          : t("writingFormula.advancedWorkspace.introEmpty")}
      </div>

      <WritingFormulaEditorPanel
        selectedProfile={props.selectedProfile}
        editor={props.editor}
        antiAiRules={props.antiAiRules}
        savePending={props.savePending}
        deletePending={props.deletePending}
        reextractPending={props.reextractPending}
        onEditorChange={props.onEditorChange}
        onToggleExtractedFeature={props.onToggleExtractedFeature}
        onReextractFeatures={props.onReextractFeatures}
        onToggleAntiAiRule={props.onToggleAntiAiRule}
        onSave={props.onSave}
        onDelete={props.onDelete}
      />
    </div>
  );
}
