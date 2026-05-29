import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import {
  createCustomProvider,
  deleteCustomProvider,
  getAPIKeySettings,
  getProviderBalances,
  previewCustomProviderModels,
  refreshProviderBalance,
  refreshProviderModelList,
  saveAPIKeySetting,
  testLLMConnection,
} from "@/api/settings";
import { queryKeys } from "@/api/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import DesktopLegacyDataImportCard from "@/components/layout/DesktopLegacyDataImportCard";
import DesktopUpdateCard from "@/components/layout/DesktopUpdateCard";
import { useTranslation } from "@/i18n";
import AutoDirectorSettingsSection from "./AutoDirectorSettingsSection";
import { ProviderRequestLimitSummary } from "./components/ProviderRequestLimitFields";
import SettingsNavigationCards from "./components/SettingsNavigationCards";
import ProviderConfigDialog, { type ProviderFormState } from "./components/ProviderConfigDialog";
import StyleEngineRuntimeSettingsCard from "./components/StyleEngineRuntimeSettingsCard";
import SettingsActionResult from "./SettingsActionResult";
import { formatBalanceAmount, formatBalanceTime } from "./settingsFormatters";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";

const MODEL_BADGE_COLLAPSE_COUNT = 8;

export default function SettingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editingProvider, setEditingProvider] = useState("");
  const [isCreatingCustomProvider, setIsCreatingCustomProvider] = useState(false);
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState<ProviderFormState>({
    displayName: "",
    key: "",
    model: "",
    imageModel: "",
    baseURL: "",
    concurrencyLimit: "0",
    requestIntervalMs: "0",
  });
  const [testResult, setTestResult] = useState("");
  const [actionResult, setActionResult] = useState("");
  const [previewModels, setPreviewModels] = useState<string[]>([]);
  const [previewModelsResult, setPreviewModelsResult] = useState("");

  const apiKeySettingsQuery = useQuery({
    queryKey: queryKeys.settings.apiKeys,
    queryFn: getAPIKeySettings,
  });

  const providerBalancesQuery = useQuery({
    queryKey: queryKeys.settings.apiKeyBalances,
    queryFn: getProviderBalances,
  });

  const providerConfigs = useMemo(() => apiKeySettingsQuery.data?.data ?? [], [apiKeySettingsQuery.data?.data]);
  const editingConfig = useMemo(
    () => providerConfigs.find((item) => item.provider === editingProvider),
    [editingProvider, providerConfigs],
  );
  const isDialogOpen = isCreatingCustomProvider || Boolean(editingProvider);
  const isCustomDialog = isCreatingCustomProvider || editingConfig?.kind === "custom";

  const resetDialogState = () => {
    setEditingProvider("");
    setIsCreatingCustomProvider(false);
    setForm({
      displayName: "",
      key: "",
      model: "",
      imageModel: "",
      baseURL: "",
      concurrencyLimit: "0",
      requestIntervalMs: "0",
    });
    setTestResult("");
    setPreviewModels([]);
    setPreviewModelsResult("");
  };

  const invalidateProviderQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.apiKeys }),
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.apiKeyBalances }),
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.rag }),
      queryClient.invalidateQueries({ queryKey: queryKeys.llm.providers }),
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.modelRoutes }),
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.modelRouteConnectivity }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: (payload: {
      provider: LLMProvider;
      displayName?: string;
      key?: string;
      model?: string;
      imageModel?: string;
      baseURL?: string;
      concurrencyLimit?: number;
      requestIntervalMs?: number;
    }) =>
      saveAPIKeySetting(payload.provider, {
        displayName: payload.displayName,
        key: payload.key,
        model: payload.model,
        imageModel: payload.imageModel,
        baseURL: payload.baseURL,
        concurrencyLimit: payload.concurrencyLimit,
        requestIntervalMs: payload.requestIntervalMs,
      }),
    onSuccess: async (response) => {
      resetDialogState();
      setActionResult(response.message ?? t("settings.providers.providerSaved"));
      await invalidateProviderQueries();
    },
    onError: (error) => {
      setActionResult(error instanceof Error ? error.message : t("settings.providers.providerSaveFailed"));
    },
  });

  const createCustomProviderMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      key?: string;
      model?: string;
      imageModel?: string;
      baseURL: string;
      concurrencyLimit?: number;
      requestIntervalMs?: number;
    }) =>
      createCustomProvider(payload),
    onSuccess: async (response) => {
      resetDialogState();
      setActionResult(response.message ?? t("settings.providers.customProviderCreated"));
      await invalidateProviderQueries();
    },
    onError: (error) => {
      setActionResult(error instanceof Error ? error.message : t("settings.providers.customProviderCreateFailed"));
    },
  });

  const previewCustomProviderModelsMutation = useMutation({
    mutationFn: (payload: { key?: string; baseURL: string }) => previewCustomProviderModels(payload),
    onSuccess: (response) => {
      const models = response.data?.models ?? [];
      setPreviewModels(models);
      setPreviewModelsResult(response.message ?? t("settings.providers.modelsFetched", { count: models.length }));
      setForm((prev) => ({
        ...prev,
        model: prev.model.trim() || models[0] || "",
      }));
    },
    onError: (error) => {
      setPreviewModels([]);
      setPreviewModelsResult(error instanceof Error ? error.message : t("settings.providers.modelsFetchFailed"));
    },
  });

  const deleteCustomProviderMutation = useMutation({
    mutationFn: (provider: LLMProvider) => deleteCustomProvider(provider),
    onSuccess: async (response) => {
      resetDialogState();
      setActionResult(response.message ?? t("settings.providers.customProviderDeleted"));
      await invalidateProviderQueries();
    },
    onError: (error) => {
      setActionResult(error instanceof Error ? error.message : t("settings.providers.customProviderDeleteFailed"));
    },
  });

  const testMutation = useMutation({
    mutationFn: (payload: {
      provider: LLMProvider;
      apiKey?: string;
      model?: string;
      baseURL?: string;
      probeMode?: "plain" | "structured" | "both";
    }) => testLLMConnection(payload),
    onSuccess: (response) => {
      const latency = response.data?.latency ?? 0;
      const plain = response.data?.plain;
      const structured = response.data?.structured;
      const plainText = plain
        ? plain.ok
          ? plain.latency != null
            ? t("settings.providers.plainOkWithLatency", { value: plain.latency })
            : t("settings.providers.plainOk")
          : plain.error
            ? t("settings.providers.plainFailWithError", { error: plain.error })
            : t("settings.providers.plainFail")
        : t("settings.providers.plainNotTested");
      const structuredText = structured
        ? structured.ok
          ? `${structured.strategy ? t("settings.providers.structuredOkWithStrategy", { strategy: structured.strategy }) : t("settings.providers.structuredOk")}${structured.reasoningForcedOff ? t("settings.providers.structuredOkReasoningOff") : ""}`
          : `${structured.errorCategory ? t("settings.providers.structuredFailCategory", { category: structured.errorCategory }) : t("settings.providers.structuredFail")}${structured.error ? t("settings.providers.structuredFailError", { error: structured.error }) : ""}`
        : t("settings.providers.structuredNotTested");
      setTestResult(t("settings.providers.connectionSuccess", { latency, plain: plainText, structured: structuredText }));
    },
    onError: (error) => {
      setTestResult(error instanceof Error ? error.message : t("settings.providers.connectionTestFailed"));
    },
  });

  const refreshModelsMutation = useMutation({
    mutationFn: (provider: LLMProvider) => refreshProviderModelList(provider),
    onSuccess: async (response, provider) => {
      const count = response.data?.models?.length ?? 0;
      const providerName = providerConfigs.find((item) => item.provider === provider)?.name ?? provider;
      setActionResult(t("settings.providers.modelRefreshedSuccess", { provider: providerName, count }));
      await invalidateProviderQueries();
    },
    onError: (error) => {
      setActionResult(error instanceof Error ? error.message : t("settings.providers.modelRefreshedFailed"));
    },
  });

  const toggleReasoningMutation = useMutation({
    mutationFn: (payload: { provider: LLMProvider; reasoningEnabled: boolean }) =>
      saveAPIKeySetting(payload.provider, {
        reasoningEnabled: payload.reasoningEnabled,
      }),
    onSuccess: async (_response, variables) => {
      const providerName = providerConfigs.find((item) => item.provider === variables.provider)?.name ?? variables.provider;
      const state = variables.reasoningEnabled
        ? t("settings.providers.reasoningEnabled")
        : t("settings.providers.reasoningDisabled");
      setActionResult(t("settings.providers.reasoningUpdated", { provider: providerName, state }));
      await invalidateProviderQueries();
    },
    onError: (error) => {
      setActionResult(error instanceof Error ? error.message : t("settings.providers.reasoningUpdateFailed"));
    },
  });

  const refreshBalanceMutation = useMutation({
    mutationFn: (provider: LLMProvider) => refreshProviderBalance(provider),
    onSuccess: async (response, provider) => {
      const providerName = providerConfigs.find((item) => item.provider === provider)?.name ?? provider;
      setActionResult(response.message ?? t("settings.providers.balanceRefreshed", { provider: providerName }));
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings.apiKeyBalances });
    },
    onError: (error) => {
      setActionResult(error instanceof Error ? error.message : t("settings.providers.balanceRefreshFailed"));
    },
  });

  const providerBalanceMap = useMemo(
    () => new Map((providerBalancesQuery.data?.data ?? []).map((item) => [item.provider, item])),
    [providerBalancesQuery.data?.data],
  );
  const modelOptions = editingConfig?.models ?? [];
  const selectableModels = isCreatingCustomProvider ? previewModels : modelOptions;

  const isProviderExpanded = (provider: string) => expandedProviders[provider] === true;
  const toggleProviderExpanded = (provider: string) => {
    setExpandedProviders((prev) => ({
      ...prev,
      [provider]: !prev[provider],
    }));
  };

  const openBuiltInDialog = (provider: LLMProvider) => {
    const config = providerConfigs.find((item) => item.provider === provider);
    if (!config) {
      return;
    }
    setIsCreatingCustomProvider(false);
    setEditingProvider(provider);
    setForm({
      displayName: config.displayName ?? config.name,
      key: "",
      model: config.currentModel,
      imageModel: config.currentImageModel ?? config.defaultImageModel ?? "",
      baseURL: config.currentBaseURL,
      concurrencyLimit: String(config.concurrencyLimit ?? 0),
      requestIntervalMs: String(config.requestIntervalMs ?? 0),
    });
    setTestResult("");
    setActionResult("");
    setPreviewModels([]);
    setPreviewModelsResult("");
  };

  const openCreateCustomDialog = () => {
    setEditingProvider("");
    setIsCreatingCustomProvider(true);
    setForm({
      displayName: "",
      key: "",
      model: "",
      imageModel: "",
      baseURL: "",
      concurrencyLimit: "0",
      requestIntervalMs: "0",
    });
    setTestResult("");
    setActionResult("");
    setPreviewModels([]);
    setPreviewModelsResult("");
  };

  const canRefreshBalance = (provider: LLMProvider, kind: "builtin" | "custom", isConfigured: boolean) => {
    if (kind === "custom" || !isConfigured) {
      return false;
    }
    const balance = providerBalanceMap.get(provider);
    return Boolean(balance?.canRefresh ?? (provider === "deepseek" || provider === "siliconflow" || provider === "kimi"));
  };

  const clearPreviewModels = () => {
    setPreviewModels([]);
    setPreviewModelsResult("");
  };

  const handlePreviewCustomModels = () => {
    setPreviewModelsResult("");
    previewCustomProviderModelsMutation.mutate({
      key: form.key.trim() ? form.key : undefined,
      baseURL: form.baseURL.trim(),
    });
  };

  const handleSubmitProviderDialog = () => {
    if (isCreatingCustomProvider) {
      createCustomProviderMutation.mutate({
        name: form.displayName.trim(),
        key: form.key.trim() ? form.key : undefined,
        model: form.model.trim() || undefined,
        imageModel: form.imageModel.trim(),
        baseURL: form.baseURL.trim(),
        concurrencyLimit: Number.parseInt(form.concurrencyLimit, 10) || 0,
        requestIntervalMs: Number.parseInt(form.requestIntervalMs, 10) || 0,
      });
      return;
    }
    if (!editingProvider) {
      return;
    }
    saveMutation.mutate({
      provider: editingProvider,
      displayName: isCustomDialog ? form.displayName.trim() || undefined : undefined,
      key: form.key.trim() ? form.key : undefined,
      model: form.model.trim() || undefined,
      imageModel: form.imageModel.trim(),
      baseURL: form.baseURL,
      concurrencyLimit: Number.parseInt(form.concurrencyLimit, 10) || 0,
      requestIntervalMs: Number.parseInt(form.requestIntervalMs, 10) || 0,
    });
  };

  const handleTestProviderDialog = () => {
    testMutation.mutate({
      provider: editingProvider || "custom_preview",
      apiKey: form.key.trim() ? form.key : undefined,
      model: form.model.trim() || undefined,
      baseURL: form.baseURL.trim() ? form.baseURL : undefined,
      probeMode: "both",
    });
  };

  const handleDeleteCustomProvider = () => {
    if (!editingProvider || !editingConfig) {
      return;
    }
    if (!window.confirm(t("settings.providers.deleteCustomConfirm", { name: editingConfig.name }))) {
      return;
    }
    deleteCustomProviderMutation.mutate(editingProvider);
  };

  const isSavingProvider = saveMutation.isPending || createCustomProviderMutation.isPending;
  const providerSubmitDisabled = isSavingProvider
    || previewCustomProviderModelsMutation.isPending
    || (!isCreatingCustomProvider && !form.model.trim())
    || (isCustomDialog && !form.displayName.trim())
    || (isCreatingCustomProvider && !form.baseURL.trim())
    || (!isCustomDialog && editingConfig?.requiresApiKey !== false && !form.key.trim() && !editingConfig?.isConfigured);
  const providerSubmitLabel = isSavingProvider
    ? t("settings.providers.saving")
    : isCreatingCustomProvider
      ? t("settings.providers.createProvider")
      : t("settings.providers.save");

  return (
    <div className={AUTO_DIRECTOR_MOBILE_CLASSES.settingsPageRoot}>
      <DesktopUpdateCard />
      <DesktopLegacyDataImportCard forceVisible />

      <SettingsNavigationCards />
      <StyleEngineRuntimeSettingsCard />

      <AutoDirectorSettingsSection onActionResult={setActionResult} />

      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <CardTitle>{t("settings.providers.title")}</CardTitle>
            <CardDescription className="break-words [overflow-wrap:anywhere]">
              {t("settings.providers.description")}
            </CardDescription>
          </div>
          <Button className="w-full sm:w-auto" onClick={openCreateCustomDialog}>{t("settings.providers.addCustom")}</Button>
        </CardHeader>
        <CardContent className="grid min-w-0 gap-3 md:grid-cols-2">
          {providerConfigs.map((item) => {
            const balance = providerBalanceMap.get(item.provider);
            const isBalanceRefreshing = refreshBalanceMutation.isPending && refreshBalanceMutation.variables === item.provider;
            const isBalanceLoading = providerBalancesQuery.isLoading && !balance;
            const refreshBalanceEnabled = canRefreshBalance(item.provider, item.kind, item.isConfigured);
            const isReasoningUpdating = toggleReasoningMutation.isPending
              && toggleReasoningMutation.variables?.provider === item.provider;
            return (
              <div
                key={item.provider}
                className={`min-w-0 rounded-md border p-3 transition-colors ${
                  item.isConfigured
                    ? "border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20"
                    : "border-border"
                }`}
              >
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <div className="break-words font-medium [overflow-wrap:anywhere]">{item.name}</div>
                    {item.kind === "custom" ? <Badge variant="outline">{t("settings.providers.customBadge")}</Badge> : null}
                  </div>
                  <Badge
                    variant={item.isConfigured ? "default" : "outline"}
                    className={item.isConfigured ? "bg-emerald-600 text-white hover:bg-emerald-600" : ""}
                  >
                    {item.isConfigured ? t("settings.providers.configured") : t("settings.providers.notConfigured")}
                  </Badge>
                </div>
                <div className="mb-2 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">{t("settings.providers.modelLabel", { value: item.currentModel || "-" })}</div>
                {item.supportsImageGeneration ? (
                  <div className="mb-2 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
                    {t("settings.providers.imageModelLabel", { value: item.currentImageModel || item.defaultImageModel || "-" })}
                  </div>
                ) : null}
                <div className="mb-2 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">{t("settings.providers.apiUrlLabel", { value: item.currentBaseURL || "-" })}</div>
                <ProviderRequestLimitSummary
                  concurrencyLimit={item.concurrencyLimit}
                  requestIntervalMs={item.requestIntervalMs}
                />
                <div className="mb-3 flex flex-col gap-3 rounded-md border bg-background/60 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">{t("settings.providers.reasoningTitle")}</div>
                    <div className="break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
                      {item.reasoningEnabled
                        ? t("settings.providers.reasoningOn")
                        : t("settings.providers.reasoningOff")}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground">{item.reasoningEnabled ? t("settings.providers.reasoningEnabled") : t("settings.providers.reasoningDisabled")}</span>
                    <Switch
                      checked={item.reasoningEnabled}
                      disabled={isReasoningUpdating}
                      onCheckedChange={(checked) => {
                        setActionResult("");
                        toggleReasoningMutation.mutate({
                          provider: item.provider,
                          reasoningEnabled: checked,
                        });
                      }}
                    />
                  </div>
                </div>
                <div className="mb-3 rounded-md border border-dashed bg-background/60 p-3">
                  {item.kind === "custom" ? (
                    <div className="space-y-1 break-words [overflow-wrap:anywhere]">
                      <div className="text-xs font-medium text-muted-foreground">{t("settings.providers.balanceTitle")}</div>
                      <div className="text-sm text-muted-foreground">
                        {t("settings.providers.balanceCustomNotice")}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-medium text-muted-foreground">{t("settings.providers.balanceTitle")}</div>
                        {balance?.status === "available" ? (
                          <Badge variant="outline">{t("settings.providers.balanceLastRefreshed", { value: formatBalanceTime(balance.fetchedAt) })}</Badge>
                        ) : null}
                      </div>
                      {isBalanceLoading ? (
                        <div className="text-sm text-muted-foreground">{t("settings.providers.balanceLoading")}</div>
                      ) : balance?.status === "available" ? (
                        <div className="space-y-2">
                          <div className="text-lg font-semibold">
                            {formatBalanceAmount(balance.availableBalance, balance.currency)}
                          </div>
                          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 break-words [overflow-wrap:anywhere]">
                            {balance.cashBalance !== null ? <div>{t("settings.providers.balanceCash", { value: formatBalanceAmount(balance.cashBalance, balance.currency) })}</div> : null}
                            {balance.voucherBalance !== null ? <div>{t("settings.providers.balanceVoucher", { value: formatBalanceAmount(balance.voucherBalance, balance.currency) })}</div> : null}
                            {balance.chargeBalance !== null ? <div>{t("settings.providers.balanceCharge", { value: formatBalanceAmount(balance.chargeBalance, balance.currency) })}</div> : null}
                            {balance.toppedUpBalance !== null ? <div>{t("settings.providers.balanceToppedUp", { value: formatBalanceAmount(balance.toppedUpBalance, balance.currency) })}</div> : null}
                            {balance.grantedBalance !== null ? <div>{t("settings.providers.balanceGranted", { value: formatBalanceAmount(balance.grantedBalance, balance.currency) })}</div> : null}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
                            {balance?.error ?? balance?.message ?? (item.isConfigured ? t("settings.providers.balanceEmpty") : t("settings.providers.balanceNeedApiKey"))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="mb-3 space-y-2">
                  <div className="flex min-w-0 flex-wrap gap-1">
                    {(isProviderExpanded(item.provider)
                      ? item.models
                      : item.models.slice(0, MODEL_BADGE_COLLAPSE_COUNT)
                    ).map((model) => (
                      <Badge
                        key={model}
                        variant={model === item.currentModel ? "default" : "outline"}
                        className={model === item.currentModel
                          ? "max-w-full whitespace-normal break-words bg-primary text-left [overflow-wrap:anywhere]"
                          : "max-w-full whitespace-normal break-words text-left [overflow-wrap:anywhere]"}
                      >
                        {model}
                      </Badge>
                    ))}
                  </div>
                  {item.models.length > MODEL_BADGE_COLLAPSE_COUNT ? (
                    <button
                      type="button"
                      className="text-xs font-medium text-primary transition-opacity hover:opacity-80"
                      onClick={() => toggleProviderExpanded(item.provider)}
                    >
                      {isProviderExpanded(item.provider)
                        ? t("settings.providers.collapseModels")
                        : t("settings.providers.expandModels", { count: item.models.length })}
                    </button>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <Button size="sm" className="w-full sm:w-auto" onClick={() => openBuiltInDialog(item.provider)}>
                    {item.kind === "custom" ? t("settings.providers.edit") : t("settings.providers.configure")}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      setTestResult("");
                      testMutation.mutate({
                        provider: item.provider,
                        model: item.currentModel || undefined,
                        baseURL: item.currentBaseURL || undefined,
                      });
                    }}
                    disabled={testMutation.isPending}
                  >
                    {t("settings.providers.testConnection")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      setActionResult("");
                      refreshModelsMutation.mutate(item.provider);
                    }}
                    disabled={!item.isConfigured || refreshModelsMutation.isPending}
                  >
                    {refreshModelsMutation.isPending && refreshModelsMutation.variables === item.provider
                      ? t("settings.providers.refreshingModels")
                      : t("settings.providers.refreshModels")}
                  </Button>
                  {item.kind === "builtin" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        setActionResult("");
                        refreshBalanceMutation.mutate(item.provider);
                      }}
                      disabled={!refreshBalanceEnabled || isBalanceRefreshing}
                    >
                      {isBalanceRefreshing ? t("settings.providers.refreshingBalance") : t("settings.providers.refreshBalance")}
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <SettingsActionResult message={actionResult} />

      <ProviderConfigDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetDialogState();
          }
        }}
        isCreatingCustomProvider={isCreatingCustomProvider}
        isCustomDialog={isCustomDialog}
        editingConfig={editingConfig}
        form={form}
        setForm={setForm}
        selectableModels={selectableModels}
        previewModelsResult={previewModelsResult}
        isPreviewingModels={previewCustomProviderModelsMutation.isPending}
        onClearPreviewModels={clearPreviewModels}
        onPreviewModels={handlePreviewCustomModels}
        onSubmit={handleSubmitProviderDialog}
        submitDisabled={providerSubmitDisabled}
        submitLabel={providerSubmitLabel}
        onTest={handleTestProviderDialog}
        testDisabled={testMutation.isPending || !form.model.trim() || !form.baseURL.trim()}
        testResult={testResult}
        onDeleteCustomProvider={handleDeleteCustomProvider}
        deleteDisabled={deleteCustomProviderMutation.isPending}
        deleteLabel={deleteCustomProviderMutation.isPending ? t("settings.providers.deleting") : t("settings.providers.delete")}
      />
    </div>
  );
}
