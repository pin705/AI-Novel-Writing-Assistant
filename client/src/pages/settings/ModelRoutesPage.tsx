import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CopyCheck, RefreshCw, Save } from "lucide-react";
import type { StructuredFallbackSettings } from "@/api/settings";
import {
  getAPIKeySettings,
  getModelRoutes,
  getStructuredFallbackConfig,
  saveModelRoute,
  saveStructuredFallbackConfig,
  testModelRouteConnectivity,
} from "@/api/settings";
import { queryKeys } from "@/api/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "@/i18n";
import ModelRouteFields from "./ModelRouteFields";
import { MODEL_ROUTE_LABEL_KEYS } from "./modelRouteLabels";
import {
  buildRouteSavePayload,
  formatConnectivityStatus,
  getPreferredModel,
  getProviderDisplayName,
  isSameRouteDraft,
  resolveConnectivityState,
  type ConnectivityState,
  type RouteDraft,
  type RouteSavePayload,
  type StructuredFallbackDraft,
} from "./modelRoutes.utils";
import type { ModelRouteTaskType } from "@ai-novel/shared/types/novel";

function RouteStatusDot({ state }: { state: ConnectivityState }) {
  const colorClass = state === "healthy"
    ? "bg-emerald-500"
    : state === "failed"
      ? "bg-red-500"
      : state === "checking"
        ? "bg-amber-400"
        : "bg-slate-300";

  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${colorClass}`} aria-hidden="true" />;
}

export default function ModelRoutesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [actionResult, setActionResult] = useState("");
  const [routeDrafts, setRouteDrafts] = useState<Record<string, RouteDraft>>({});
  const [bulkDraft, setBulkDraft] = useState<RouteDraft | null>(null);
  const [structuredFallbackDraft, setStructuredFallbackDraft] = useState<StructuredFallbackDraft | null>(null);

  const apiKeySettingsQuery = useQuery({
    queryKey: queryKeys.settings.apiKeys,
    queryFn: getAPIKeySettings,
  });

  const modelRoutesQuery = useQuery({
    queryKey: queryKeys.settings.modelRoutes,
    queryFn: getModelRoutes,
  });

  const modelRouteConnectivityQuery = useQuery({
    queryKey: queryKeys.settings.modelRouteConnectivity,
    queryFn: testModelRouteConnectivity,
    enabled: modelRoutesQuery.isSuccess,
    refetchOnWindowFocus: false,
  });

  const structuredFallbackQuery = useQuery({
    queryKey: queryKeys.settings.structuredFallback,
    queryFn: getStructuredFallbackConfig,
    refetchOnWindowFocus: false,
  });

  const saveModelRouteMutation = useMutation({
    mutationFn: (payload: RouteSavePayload) => saveModelRoute(payload),
    onSuccess: async () => {
      setActionResult(t("settings.modelRoutes.savedRoute"));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.settings.modelRoutes }),
        queryClient.invalidateQueries({ queryKey: queryKeys.settings.modelRouteConnectivity }),
      ]);
    },
  });

  const saveAllModelRoutesMutation = useMutation({
    mutationFn: async (payloads: RouteSavePayload[]) => {
      await Promise.all(payloads.map((payload) => saveModelRoute(payload)));
      return payloads.length;
    },
    onSuccess: async (count) => {
      setActionResult(t("settings.modelRoutes.savedRoutes", { count }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.settings.modelRoutes }),
        queryClient.invalidateQueries({ queryKey: queryKeys.settings.modelRouteConnectivity }),
      ]);
    },
  });

  const saveStructuredFallbackMutation = useMutation({
    mutationFn: (payload: Partial<StructuredFallbackSettings>) => saveStructuredFallbackConfig(payload),
    onSuccess: async () => {
      setActionResult(t("settings.modelRoutes.fallbackSaved"));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.settings.structuredFallback }),
        queryClient.invalidateQueries({ queryKey: queryKeys.settings.modelRouteConnectivity }),
      ]);
    },
  });

  const providerConfigs = useMemo(() => apiKeySettingsQuery.data?.data ?? [], [apiKeySettingsQuery.data?.data]);
  const modelRoutes = modelRoutesQuery.data?.data;
  const modelRouteConnectivity = modelRouteConnectivityQuery.data?.data;
  const structuredFallback = structuredFallbackQuery.data?.data;
  const taskTypes = modelRoutes?.taskTypes ?? [];
  const providerOptions = useMemo(() => providerConfigs.map((item) => item.provider), [providerConfigs]);
  const routeMap = useMemo(() => new Map((modelRoutes?.routes ?? []).map((item) => [item.taskType, item])), [modelRoutes?.routes]);
  const connectivityMap = useMemo(
    () => new Map((modelRouteConnectivity?.statuses ?? []).map((item) => [item.taskType, item])),
    [modelRouteConnectivity?.statuses],
  );
  const connectivitySummary = useMemo(() => {
    const statuses = modelRouteConnectivity?.statuses ?? [];
    return {
      total: statuses.length,
      healthy: statuses.filter((item) => (item.plain?.ok ?? true) && (item.structured?.ok ?? true)).length,
      failed: statuses.filter((item) => (item.plain && !item.plain.ok) || (item.structured && !item.structured.ok)).length,
      testedAt: modelRouteConnectivity?.testedAt ?? "",
    };
  }, [modelRouteConnectivity?.statuses, modelRouteConnectivity?.testedAt]);
  const preferredProviderConfig = useMemo(
    () => providerConfigs.find((item) => item.isConfigured && item.isActive && getPreferredModel(item))
      ?? providerConfigs.find((item) => getPreferredModel(item))
      ?? providerConfigs[0],
    [providerConfigs],
  );
  const defaultProvider = preferredProviderConfig?.provider ?? "deepseek";
  const defaultModel = getPreferredModel(preferredProviderConfig);
  const dirtyTaskTypes = useMemo(
    () => taskTypes.filter((taskType) => {
      const draft = routeDrafts[taskType];
      return draft ? !isSameRouteDraft(draft, routeMap.get(taskType)) : false;
    }),
    [routeDrafts, routeMap, taskTypes],
  );
  const dirtyTaskTypeSet = useMemo(() => new Set(dirtyTaskTypes), [dirtyTaskTypes]);
  const failedTaskTypes = useMemo(
    () => taskTypes.filter((taskType) => resolveConnectivityState(connectivityMap.get(taskType), false) === "failed"),
    [connectivityMap, taskTypes],
  );
  const emptyRouteTaskTypes = useMemo(
    () => taskTypes.filter((taskType) => {
      const route = routeMap.get(taskType);
      return !route?.provider || !route?.model;
    }),
    [routeMap, taskTypes],
  );
  const isSavingRoutes = saveModelRouteMutation.isPending || saveAllModelRoutesMutation.isPending;

  function getRouteDraft(taskType: ModelRouteTaskType): RouteDraft {
    const existing = routeDrafts[taskType];
    if (existing) {
      return existing;
    }
    const route = routeMap.get(taskType);
    return {
      provider: route?.provider ?? "deepseek",
      model: route?.model ?? "",
      temperature: route?.temperature != null ? String(route.temperature) : "0.7",
      maxTokens: route?.maxTokens != null ? String(route.maxTokens) : "",
      requestProtocol: route?.requestProtocol ?? "auto",
      structuredResponseFormat: route?.structuredResponseFormat ?? "auto",
    };
  }

  function getBulkDraft(): RouteDraft {
    if (bulkDraft) {
      return bulkDraft;
    }
    return {
      provider: defaultProvider,
      model: defaultModel,
      temperature: "0.7",
      maxTokens: "",
      requestProtocol: "auto",
      structuredResponseFormat: "auto",
    };
  }

  function patchDraft(taskType: ModelRouteTaskType, patch: Partial<RouteDraft>) {
    const current = getRouteDraft(taskType);
    setRouteDrafts((prev) => ({
      ...prev,
      [taskType]: {
        ...current,
        ...patch,
      },
    }));
  }

  function patchBulkDraft(patch: Partial<RouteDraft>) {
    const current = getBulkDraft();
    setBulkDraft({
      ...current,
      ...patch,
    });
  }

  function applyBulkDraftToRoutes(targetTaskTypes: ModelRouteTaskType[]) {
    if (targetTaskTypes.length === 0) {
      setActionResult(t("settings.modelRoutes.nothingToApply"));
      return;
    }
    const draft = getBulkDraft();
    setRouteDrafts((prev) => {
      const next = { ...prev };
      targetTaskTypes.forEach((taskType) => {
        next[taskType] = { ...draft };
      });
      return next;
    });
    setActionResult(t("settings.modelRoutes.bulkApplied", { count: targetTaskTypes.length }));
  }

  function getStructuredFallbackDraft(): StructuredFallbackDraft {
    if (structuredFallbackDraft) {
      return structuredFallbackDraft;
    }
    return {
      enabled: structuredFallback?.enabled ?? false,
      provider: structuredFallback?.provider ?? "deepseek",
      model: structuredFallback?.model ?? "deepseek-chat",
      temperature: structuredFallback != null ? String(structuredFallback.temperature) : "0.2",
      maxTokens: structuredFallback?.maxTokens != null ? String(structuredFallback.maxTokens) : "",
      requestProtocol: "auto",
      structuredResponseFormat: "auto",
    };
  }

  function patchStructuredFallbackDraft(patch: Partial<StructuredFallbackDraft>) {
    const current = getStructuredFallbackDraft();
    setStructuredFallbackDraft({
      ...current,
      ...patch,
    });
  }

  const fallbackDraft = getStructuredFallbackDraft();
  const routeBulkDraft = getBulkDraft();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.modelRoutes.pageTitle")}</CardTitle>
          <CardDescription>
            {t("settings.modelRoutes.pageDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2 text-sm text-muted-foreground">
            <div>{t("settings.modelRoutes.detectionNotice")}</div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-2">
                <RouteStatusDot
                  state={modelRouteConnectivityQuery.isPending || modelRouteConnectivityQuery.isFetching
                    ? "checking"
                    : connectivitySummary.failed > 0
                      ? "failed"
                      : connectivitySummary.total > 0
                        ? "healthy"
                        : "idle"}
                />
                {modelRouteConnectivityQuery.isPending || modelRouteConnectivityQuery.isFetching
                  ? t("settings.modelRoutes.detecting")
                  : connectivitySummary.total > 0
                    ? t("settings.modelRoutes.detectionSummary", { total: connectivitySummary.total, healthy: connectivitySummary.healthy, failed: connectivitySummary.failed })
                    : t("settings.modelRoutes.noDetectionYet")}
              </span>
              {connectivitySummary.testedAt ? (
                <span>{t("settings.modelRoutes.testedAt", { value: new Date(connectivitySummary.testedAt).toLocaleString() })}</span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => void modelRouteConnectivityQuery.refetch()}
              disabled={modelRouteConnectivityQuery.isFetching || !modelRoutesQuery.isSuccess}
            >
              <RefreshCw className={`h-4 w-4 ${modelRouteConnectivityQuery.isFetching ? "animate-spin" : ""}`} />
              {modelRouteConnectivityQuery.isFetching ? t("settings.modelRoutes.rechecking") : t("settings.modelRoutes.recheck")}
            </Button>
            <Button asChild variant="outline">
              <Link to="/settings">
                <ArrowLeft className="h-4 w-4" />
                {t("settings.modelRoutes.backToSettings")}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CopyCheck className="h-5 w-5" />
            {t("settings.modelRoutes.bulkTitle")}
          </CardTitle>
          <CardDescription>
            {t("settings.modelRoutes.bulkDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ModelRouteFields
            draft={routeBulkDraft}
            providerConfigs={providerConfigs}
            providerOptions={providerOptions}
            onPatch={patchBulkDraft}
            temperaturePlaceholder={t("settings.modelRoutes.temperaturePlaceholderRoute")}
            maxTokensPlaceholder={t("settings.modelRoutes.maxTokensPlaceholder")}
            modelEmptyText={t("settings.modelRoutes.modelEmptyText")}
            manualModelPlaceholder={t("settings.modelRoutes.modelManualPlaceholder")}
            showProtocolFields={false}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {t("settings.modelRoutes.bulkStatus", { dirty: dirtyTaskTypes.length, failed: failedTaskTypes.length, empty: emptyRouteTaskTypes.length })}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => applyBulkDraftToRoutes(taskTypes)}
                disabled={!routeBulkDraft.provider.trim() || !routeBulkDraft.model.trim() || taskTypes.length === 0}
              >
                <CopyCheck className="h-4 w-4" />
                {t("settings.modelRoutes.applyToAll")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => applyBulkDraftToRoutes(failedTaskTypes)}
                disabled={!routeBulkDraft.provider.trim() || !routeBulkDraft.model.trim() || failedTaskTypes.length === 0}
              >
                <CopyCheck className="h-4 w-4" />
                {t("settings.modelRoutes.applyToFailed")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => applyBulkDraftToRoutes(emptyRouteTaskTypes)}
                disabled={!routeBulkDraft.provider.trim() || !routeBulkDraft.model.trim() || emptyRouteTaskTypes.length === 0}
              >
                <CopyCheck className="h-4 w-4" />
                {t("settings.modelRoutes.applyToEmpty")}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => saveAllModelRoutesMutation.mutate(
                  dirtyTaskTypes.map((taskType) => buildRouteSavePayload(taskType, getRouteDraft(taskType))),
                )}
                disabled={isSavingRoutes || dirtyTaskTypes.length === 0}
              >
                <Save className="h-4 w-4" />
                {saveAllModelRoutesMutation.isPending
                  ? t("settings.modelRoutes.saveAllPending")
                  : dirtyTaskTypes.length > 0
                    ? t("settings.modelRoutes.saveAllWithCount", { count: dirtyTaskTypes.length })
                    : t("settings.modelRoutes.saveAllPlain")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.modelRoutes.fallbackTitle")}</CardTitle>
          <CardDescription>
            {t("settings.modelRoutes.fallbackDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="font-medium">{t("settings.modelRoutes.fallbackEnableLabel")}</div>
              <div className="text-sm text-muted-foreground">
                {t("settings.modelRoutes.fallbackEnableHint")}
              </div>
            </div>
            <Switch
              checked={fallbackDraft.enabled}
              onCheckedChange={(checked) => patchStructuredFallbackDraft({ enabled: checked })}
            />
          </div>

          <ModelRouteFields
            draft={fallbackDraft}
            providerConfigs={providerConfigs}
            providerOptions={providerOptions}
            onPatch={patchStructuredFallbackDraft}
            temperaturePlaceholder={t("settings.modelRoutes.temperaturePlaceholderFallback")}
            maxTokensPlaceholder={t("settings.modelRoutes.maxTokensPlaceholder")}
            modelEmptyText={t("settings.modelRoutes.modelEmptyText")}
            manualModelPlaceholder={t("settings.modelRoutes.modelManualPlaceholder")}
          />

          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              onClick={() => saveStructuredFallbackMutation.mutate({
                enabled: fallbackDraft.enabled,
                provider: fallbackDraft.provider,
                model: fallbackDraft.model,
                temperature: Number(fallbackDraft.temperature || 0.2),
                maxTokens: fallbackDraft.maxTokens.trim() ? Number(fallbackDraft.maxTokens) : null,
              })}
              disabled={saveStructuredFallbackMutation.isPending || !fallbackDraft.provider.trim() || !fallbackDraft.model.trim()}
            >
              {saveStructuredFallbackMutation.isPending ? t("settings.modelRoutes.fallbackSaving") : t("settings.modelRoutes.fallbackSave")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {taskTypes.map((taskType) => {
        const draft = getRouteDraft(taskType);
        const labelKeys = MODEL_ROUTE_LABEL_KEYS[taskType];
        const providerName = getProviderDisplayName(providerConfigs, draft.provider);
        const connectivity = connectivityMap.get(taskType);
        const connectivityState = resolveConnectivityState(
          connectivity,
          modelRouteConnectivityQuery.isPending || modelRouteConnectivityQuery.isFetching,
        );
        const isDirty = dirtyTaskTypeSet.has(taskType);
        const hasUnsavedRouteDiff = connectivity != null
          && (
            draft.provider !== connectivity.provider
            || (draft.model.trim().length > 0 && draft.model !== connectivity.model)
            || (draft.requestProtocol !== "auto" && draft.requestProtocol !== connectivity.requestProtocol)
            || (
              draft.structuredResponseFormat !== "auto"
              && draft.structuredResponseFormat !== connectivity.structured?.strategy
            )
          );

        return (
          <Card key={taskType}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                <span>{t(labelKeys.titleKey)}</span>
                <span className="inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-xs font-normal text-muted-foreground">
                  <RouteStatusDot state={connectivityState} />
                  {connectivityState === "healthy"
                    ? t("settings.modelRoutes.stateHealthy")
                    : connectivityState === "failed"
                      ? t("settings.modelRoutes.stateFailed")
                      : connectivityState === "checking"
                        ? t("settings.modelRoutes.stateChecking")
                        : t("settings.modelRoutes.stateIdle")}
                </span>
                {isDirty ? <Badge variant="secondary">{t("settings.modelRoutes.pendingBadge")}</Badge> : null}
              </CardTitle>
              <CardDescription>
                {t(labelKeys.descriptionKey)}
                <span className="ml-2 text-xs">{t("settings.modelRoutes.taskIdentifier", { value: taskType })}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ModelRouteFields
                draft={draft}
                providerConfigs={providerConfigs}
                providerOptions={providerOptions}
                onPatch={(patch) => patchDraft(taskType, patch)}
                temperaturePlaceholder={t("settings.modelRoutes.temperaturePlaceholderRoute")}
                maxTokensPlaceholder={t("settings.modelRoutes.maxTokensPlaceholder")}
                modelEmptyText={t("settings.modelRoutes.modelEmptyText")}
                manualModelPlaceholder={t("settings.modelRoutes.modelManualPlaceholder")}
              />

              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>{isDirty ? t("settings.modelRoutes.dirtyHint") : t("settings.modelRoutes.providerInUse", { value: providerName })}</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <RouteStatusDot state={connectivityState} />
                    <span>{formatConnectivityStatus(connectivity, t)}</span>
                  </div>
                  {connectivity?.structured ? (
                    <div>
                      {t("settings.modelRoutes.structuredProtocol", {
                        protocol: connectivity.structured.requestProtocol ?? connectivity.requestProtocol ?? t("settings.modelRoutes.structuredProtocolNone"),
                        strategy: connectivity.structured.strategy ?? t("settings.modelRoutes.structuredProtocolNone"),
                        thinking: connectivity.structured.reasoningForcedOff
                          ? t("settings.modelRoutes.thinkingClosed")
                          : t("settings.modelRoutes.thinkingKept"),
                        fallback: connectivity.structured.fallbackAvailable
                          ? t("settings.modelRoutes.fallbackAvailable")
                          : t("settings.modelRoutes.fallbackUnavailable"),
                      })}
                    </div>
                  ) : null}
                  {hasUnsavedRouteDiff ? (
                    <div>{t("settings.modelRoutes.unsavedDiff")}</div>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  onClick={() => saveModelRouteMutation.mutate(buildRouteSavePayload(taskType, draft))}
                  disabled={isSavingRoutes || !draft.provider.trim() || !draft.model.trim()}
                >
                  <Save className="h-4 w-4" />
                  {t("settings.modelRoutes.saveRoute")}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {actionResult ? <div className="text-sm text-muted-foreground">{actionResult}</div> : null}
    </div>
  );
}
