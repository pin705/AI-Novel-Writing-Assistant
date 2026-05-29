import type { Dispatch, SetStateAction } from "react";
import type { APIKeyStatus } from "@/api/settings";
import SearchableSelect from "@/components/common/SearchableSelect";
import { Button } from "@/components/ui/button";
import { AppDialogContent, Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/i18n";
import ProviderRequestLimitFields from "./ProviderRequestLimitFields";

export interface ProviderFormState {
  displayName: string;
  key: string;
  model: string;
  imageModel: string;
  baseURL: string;
  concurrencyLimit: string;
  requestIntervalMs: string;
}

interface ProviderConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isCreatingCustomProvider: boolean;
  isCustomDialog: boolean;
  editingConfig?: APIKeyStatus;
  form: ProviderFormState;
  setForm: Dispatch<SetStateAction<ProviderFormState>>;
  selectableModels: string[];
  previewModelsResult: string;
  isPreviewingModels: boolean;
  onClearPreviewModels: () => void;
  onPreviewModels: () => void;
  onSubmit: () => void;
  submitDisabled: boolean;
  submitLabel: string;
  onTest: () => void;
  testDisabled: boolean;
  testResult: string;
  onDeleteCustomProvider: () => void;
  deleteDisabled: boolean;
  deleteLabel: string;
}

export default function ProviderConfigDialog({
  open,
  onOpenChange,
  isCreatingCustomProvider,
  isCustomDialog,
  editingConfig,
  form,
  setForm,
  selectableModels,
  previewModelsResult,
  isPreviewingModels,
  onClearPreviewModels,
  onPreviewModels,
  onSubmit,
  submitDisabled,
  submitLabel,
  onTest,
  testDisabled,
  testResult,
  onDeleteCustomProvider,
  deleteDisabled,
  deleteLabel,
}: ProviderConfigDialogProps) {
  const { t } = useTranslation();
  const primaryModelLabel = isCreatingCustomProvider
    ? t("settings.providerDialog.primaryModelCreate")
    : isCustomDialog
      ? t("settings.providerDialog.primaryModelCustom")
      : t("settings.providerDialog.primaryModelBuiltin");
  const canSelectListedModels = selectableModels.length > 0;
  const imageModelOptions = editingConfig?.imageModels ?? [];
  const canSelectImageModels = imageModelOptions.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent
        className="max-w-lg"
        title={isCreatingCustomProvider
          ? t("settings.providerDialog.titleCreate")
          : isCustomDialog
            ? t("settings.providerDialog.titleEditCustom")
            : t("settings.providerDialog.titleConfigure")}
        footer={(
          <>
            <Button className="w-full sm:w-auto" onClick={onSubmit} disabled={submitDisabled}>
              {submitLabel}
            </Button>

            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={onTest}
              disabled={testDisabled}
            >
              {t("settings.providers.testConnection")}
            </Button>

            {editingConfig?.kind === "custom" ? (
              <Button
                variant="destructive"
                className="w-full sm:w-auto"
                onClick={onDeleteCustomProvider}
                disabled={deleteDisabled}
              >
                {deleteLabel}
              </Button>
            ) : null}
          </>
        )}
        footerClassName="gap-2"
      >
        <div className="space-y-3">
          {isCustomDialog ? (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">{t("settings.providerDialog.providerNameLabel")}</div>
              <Input
                value={form.displayName}
                placeholder={t("settings.providerDialog.providerNamePlaceholder")}
                onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
              />
            </div>
          ) : null}

          {(isCustomDialog || editingConfig?.requiresApiKey === false) ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {t("settings.providerDialog.apiKeyOptionalNotice")}
            </div>
          ) : null}

          <Input
            type="password"
            value={form.key}
            placeholder={editingConfig?.isConfigured
              ? t("settings.providerDialog.apiKeyConfiguredPlaceholder")
              : t("settings.providerDialog.apiKeyEnterPlaceholder")}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, key: event.target.value }));
              if (isCreatingCustomProvider) {
                onClearPreviewModels();
              }
            }}
          />

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">{t("settings.providerDialog.baseUrlLabel")}</div>
            <Input
              value={form.baseURL}
              placeholder={editingConfig?.defaultBaseURL ?? t("settings.providerDialog.baseUrlPlaceholderFallback")}
              onChange={(event) => {
                setForm((prev) => ({
                  ...prev,
                  baseURL: event.target.value,
                  model: isCreatingCustomProvider ? "" : prev.model,
                }));
                if (isCreatingCustomProvider) {
                  onClearPreviewModels();
                }
              }}
            />
            <div className="text-xs text-muted-foreground">
              {isCreatingCustomProvider
                ? t("settings.providerDialog.baseUrlHintCreating")
                : t("settings.providerDialog.baseUrlHintEditing")}
            </div>
          </div>

          {isCreatingCustomProvider ? (
            <div className="space-y-2">
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={onPreviewModels}
                disabled={isPreviewingModels || !form.baseURL.trim()}
              >
                {isPreviewingModels ? t("settings.providerDialog.fetchingModels") : t("settings.providerDialog.fetchModels")}
              </Button>
              {previewModelsResult ? (
                <div className="break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
                  {previewModelsResult}
                </div>
              ) : null}
            </div>
          ) : null}

          {canSelectListedModels ? (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">{t("settings.providerDialog.availableModels")}</div>
              <SearchableSelect
                value={form.model}
                onValueChange={(value) => setForm((prev) => ({ ...prev, model: value }))}
                options={selectableModels.map((model) => ({ value: model }))}
                placeholder={t("settings.providerDialog.selectModel")}
                searchPlaceholder={t("settings.providerDialog.searchModel")}
                emptyText={t("settings.providerDialog.emptyModels")}
              />
            </div>
          ) : null}

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">{primaryModelLabel}</div>
            <div className="text-xs text-muted-foreground">
              {isCreatingCustomProvider
                ? t("settings.providerDialog.primaryModelHintCreate")
                : editingConfig?.kind === "custom" && !canSelectListedModels
                  ? t("settings.providerDialog.primaryModelHintCustomEmpty")
                  : t("settings.providerDialog.primaryModelHintBuiltin")}
            </div>
          </div>
          <Input
            value={form.model}
            placeholder={t("settings.providerDialog.modelManualPlaceholder")}
            onChange={(event) => setForm((prev) => ({ ...prev, model: event.target.value }))}
          />

          <div className="space-y-3 rounded-md border bg-muted/20 p-3">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">{t("settings.providerDialog.imageModelTitle")}</div>
              <div className="text-xs text-muted-foreground">
                {t("settings.providerDialog.imageModelHint")}
              </div>
            </div>
            {canSelectImageModels ? (
              <div className="space-y-1">
                <SearchableSelect
                  value={form.imageModel}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, imageModel: value }))}
                  options={imageModelOptions.map((model) => ({ value: model }))}
                  placeholder={t("settings.providerDialog.imageModelSelect")}
                  searchPlaceholder={t("settings.providerDialog.imageModelSearch")}
                  emptyText={t("settings.providerDialog.imageModelEmpty")}
                />
              </div>
            ) : null}
            <Input
              value={form.imageModel}
              placeholder={editingConfig?.defaultImageModel ?? t("settings.providerDialog.imageModelPlaceholderFallback")}
              onChange={(event) => setForm((prev) => ({ ...prev, imageModel: event.target.value }))}
            />
            <div className="text-xs text-muted-foreground">
              {t("settings.providerDialog.imageModelFootnote")}
            </div>
          </div>

          <ProviderRequestLimitFields
            concurrencyLimit={form.concurrencyLimit}
            requestIntervalMs={form.requestIntervalMs}
            onChange={(value) => setForm((prev) => ({ ...prev, ...value }))}
          />

          {testResult ? <div className="break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">{testResult}</div> : null}
        </div>
      </AppDialogContent>
    </Dialog>
  );
}
