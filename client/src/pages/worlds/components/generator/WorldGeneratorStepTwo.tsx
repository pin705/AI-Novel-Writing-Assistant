import type {
  WorldPropertyOption,
  WorldReferenceAnchor,
  WorldReferenceMode,
  WorldReferenceSeedBundle,
  WorldReferenceSeedSelection,
} from "@ai-novel/shared/types/worldWizard";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";
import WorldLibraryQuickPick from "./WorldLibraryQuickPick";
import WorldPropertyOptionSelector from "./WorldPropertyOptionSelector";
import WorldReferenceSeedSelector from "./WorldReferenceSeedSelector";
import type { WorldGeneratorTemplateOption } from "./worldGeneratorShared";
import { getDimensionLabel, getReferenceModeLabel } from "./worldGeneratorShared";

interface WorldGeneratorStepTwoProps {
  isReferenceMode: boolean;
  referenceMode: WorldReferenceMode;
  referenceAnchors: WorldReferenceAnchor[];
  preserveElements: string[];
  allowedChanges: string[];
  forbiddenElements: string[];
  referenceSeeds: WorldReferenceSeedBundle;
  selectedReferenceSeedIds: WorldReferenceSeedSelection;
  filteredTemplates: Array<Pick<WorldGeneratorTemplateOption, "key" | "name">>;
  templateSelectValue: string;
  selectedTemplate?: WorldGeneratorTemplateOption;
  selectedDimensions: Record<string, boolean>;
  selectedClassicElements: string[];
  propertyOptions: WorldPropertyOption[];
  selectedPropertyIds: string[];
  propertyDetails: Record<string, string>;
  selectedPropertyChoices: Record<string, string>;
  existingPropertyOptionIds: string[];
  currentTypeLabel: string;
  libraryQuickPickWorldType?: string;
  createDraftPending: boolean;
  onTemplateChange: (value: string) => void;
  onToggleDimension: (key: string, checked: boolean) => void;
  onToggleClassicElement: (element: string, checked: boolean) => void;
  onToggleReferenceSeed: (group: keyof WorldReferenceSeedBundle, id: string, checked: boolean) => void;
  onToggleAllReferenceSeeds: (group: keyof WorldReferenceSeedBundle, checked: boolean) => void;
  onTogglePropertyOption: (optionId: string, checked: boolean) => void;
  onPropertyChoiceSelect: (optionId: string, choiceId: string) => void;
  onPropertyDetailChange: (optionId: string, detail: string) => void;
  onAddLibraryOption: (item: {
    id: string;
    name: string;
    description?: string | null;
    category: string;
  }) => void;
  onCreateDraft: () => void;
}

export default function WorldGeneratorStepTwo(props: WorldGeneratorStepTwoProps) {
  const {
    isReferenceMode,
    referenceMode,
    referenceAnchors,
    preserveElements,
    allowedChanges,
    forbiddenElements,
    referenceSeeds,
    selectedReferenceSeedIds,
    filteredTemplates,
    templateSelectValue,
    selectedTemplate,
    selectedDimensions,
    selectedClassicElements,
    propertyOptions,
    selectedPropertyIds,
    propertyDetails,
    selectedPropertyChoices,
    existingPropertyOptionIds,
    currentTypeLabel,
    libraryQuickPickWorldType,
    createDraftPending,
    onTemplateChange,
    onToggleDimension,
    onToggleClassicElement,
    onToggleReferenceSeed,
    onToggleAllReferenceSeeds,
    onTogglePropertyOption,
    onPropertyChoiceSelect,
    onPropertyDetailChange,
    onAddLibraryOption,
    onCreateDraft,
  } = props;

  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      {isReferenceMode ? (
        <div className="rounded-md border p-3 text-sm space-y-3">
          <div className="font-medium">{t("worlds.generator.stepTwo.blueprintTitle")}</div>
          <div className="text-xs text-muted-foreground">{t("worlds.generator.stepTwo.currentMode", { value: getReferenceModeLabel(referenceMode, t) })}</div>
          {referenceAnchors.length > 0 ? (
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">{t("worlds.generator.stepTwo.anchorsTitle")}</div>
              {referenceAnchors.map((anchor) => (
                <div key={anchor.id} className="text-xs text-muted-foreground">
                  {t("worlds.generator.stepTwo.anchorLine", { label: anchor.label, content: anchor.content })}
                </div>
              ))}
            </div>
          ) : null}
          {preserveElements.length > 0 ? (
            <div className="text-xs text-muted-foreground">{t("worlds.generator.stepTwo.preserveLine", { value: preserveElements.join("、") })}</div>
          ) : null}
          {allowedChanges.length > 0 ? (
            <div className="text-xs text-muted-foreground">{t("worlds.generator.stepTwo.allowedLine", { value: allowedChanges.join("、") })}</div>
          ) : null}
          {forbiddenElements.length > 0 ? (
            <div className="text-xs text-muted-foreground">{t("worlds.generator.stepTwo.forbiddenLine", { value: forbiddenElements.join("、") })}</div>
          ) : null}
        </div>
      ) : null}

      {isReferenceMode ? (
        <WorldReferenceSeedSelector
          seeds={referenceSeeds}
          selectedIds={selectedReferenceSeedIds}
          onToggle={onToggleReferenceSeed}
          onToggleAll={onToggleAllReferenceSeeds}
        />
      ) : null}

      <select
        className="w-full rounded-md border bg-background p-2 text-sm"
        value={templateSelectValue}
        onChange={(event) => onTemplateChange(event.target.value)}
      >
        {filteredTemplates.map((template) => (
          <option key={template.key} value={template.key}>
            {template.name}
          </option>
        ))}
      </select>

      <div className="rounded-md border p-3 text-sm space-y-2">
        <div className="font-medium">{selectedTemplate?.description ?? t("worlds.generator.stepTwo.templatePlaceholder")}</div>
        <div className="text-xs text-muted-foreground">{t("worlds.generator.stepTwo.currentTypeLine", { value: currentTypeLabel })}</div>
        <div className="text-xs text-muted-foreground">
          {t("worlds.generator.stepTwo.pitfallsLine", { value: selectedTemplate?.pitfalls.join(" | ") || "-" })}
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          {Object.keys(selectedDimensions).map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(selectedDimensions[key])}
                onChange={(event) => onToggleDimension(key, event.target.checked)}
              />
              {getDimensionLabel(key, t)}
            </label>
          ))}
        </div>
      </div>

      {!isReferenceMode ? (
        <div className="rounded-md border p-3 text-sm">
          <div className="font-medium mb-2">{t("worlds.generator.stepTwo.classicElements")}</div>
          <div className="grid gap-2 md:grid-cols-2">
            {(selectedTemplate?.classicElements ?? []).map((element) => (
              <label key={element} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedClassicElements.includes(element)}
                  onChange={(event) => onToggleClassicElement(element, event.target.checked)}
                />
                {element}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="font-medium text-sm">{t("worlds.generator.stepTwo.propertiesTitle")}</div>
        <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          {t("worlds.generator.stepTwo.propertiesHint")}
        </div>
        <WorldPropertyOptionSelector
          options={propertyOptions}
          selectedIds={selectedPropertyIds}
          details={propertyDetails}
          selectedChoiceIds={selectedPropertyChoices}
          onToggle={onTogglePropertyOption}
          onChoiceSelect={onPropertyChoiceSelect}
          onDetailChange={onPropertyDetailChange}
        />
      </div>

      {!isReferenceMode ? (
        <WorldLibraryQuickPick
          worldType={libraryQuickPickWorldType}
          existingOptionIds={existingPropertyOptionIds}
          onAdd={onAddLibraryOption}
        />
      ) : null}

      <Button onClick={onCreateDraft} disabled={createDraftPending}>
        {createDraftPending ? t("worlds.generator.stepTwo.creatingDraft") : t("worlds.generator.stepTwo.createDraft")}
      </Button>
    </div>
  );
}
