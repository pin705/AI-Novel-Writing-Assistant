import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import {
  createCustomProvider,
  deleteCustomProvider,
  getAPIKeySettings,
  getProviderBalances,
  getRagSettings,
  refreshProviderBalance,
  refreshProviderModelList,
  saveAPIKeySetting,
  testLLMConnection,
} from "@/api/settings";
import { queryKeys } from "@/api/queryKeys";
import SearchableSelect from "@/components/common/SearchableSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const MODEL_BADGE_COLLAPSE_COUNT = 8;

function formatBalanceAmount(amount: number | null | undefined, currency: string | null | undefined): string {
  if (typeof amount !== "number" || Number.isNaN(amount)) {
    return "-";
  }
  if (currency) {
    try {
      return new Intl.NumberFormat("zh-CN", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      // Fall through to plain numeric output for unsupported currency codes.
    }
  }
  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatBalanceTime(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString("zh-CN", {
    hour12: false,
  });
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [editingProvider, setEditingProvider] = useState("");
  const [isCreatingCustomProvider, setIsCreatingCustomProvider] = useState(false);
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({
    displayName: "",
    key: "",
    model: "",
    baseURL: "",
  });
  const [testResult, setTestResult] = useState("");
  const [actionResult, setActionResult] = useState("");

  const apiKeySettingsQuery = useQuery({
    queryKey: queryKeys.settings.apiKeys,
    queryFn: getAPIKeySettings,
  });

  const ragSettingsQuery = useQuery({
    queryKey: queryKeys.settings.rag,
    queryFn: getRagSettings,
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
      baseURL: "",
    });
    setTestResult("");
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
      baseURL?: string;
    }) =>
      saveAPIKeySetting(payload.provider, {
        displayName: payload.displayName,
        key: payload.key,
        model: payload.model,
        baseURL: payload.baseURL,
      }),
    onSuccess: async (response) => {
      resetDialogState();
      setActionResult(response.message ?? "Lưu thành công.");
      await invalidateProviderQueries();
    },
    onError: (error) => {
      setActionResult(error instanceof Error ? error.message : "Lưu thất bại.");
    },
  });

  const createCustomProviderMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      key?: string;
      model: string;
      baseURL: string;
    }) =>
      createCustomProvider(payload),
    onSuccess: async (response) => {
      resetDialogState();
      setActionResult(response.message ?? "Tạo nhà cung cấp tùy chỉnh thành công.");
      await invalidateProviderQueries();
    },
    onError: (error) => {
      setActionResult(error instanceof Error ? error.message : "Tạo nhà cung cấp tùy chỉnh thất bại.");
    },
  });

  const deleteCustomProviderMutation = useMutation({
    mutationFn: (provider: LLMProvider) => deleteCustomProvider(provider),
    onSuccess: async (response) => {
      resetDialogState();
      setActionResult(response.message ?? "Nhà cung cấp tùy chỉnh đã được xóa.");
      await invalidateProviderQueries();
    },
    onError: (error) => {
      setActionResult(error instanceof Error ? error.message : "Xóa nhà cung cấp tùy chỉnh thất bại.");
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
          ? `Kết nối thường bình thường${plain.latency != null ? ` (${plain.latency}ms)` : ""}`
          : `Kết nối thường thất bại${plain.error ? `: ${plain.error}` : ""}`
        : "Chưa kiểm tra kết nối thường";
      const structuredText = structured
        ? structured.ok
          ? `Cấu trúc hóa bình thường${structured.strategy ? `, chiến lược ${structured.strategy}` : ""}${structured.reasoningForcedOff ? ", đã buộc tắt thinking" : ""}`
          : `Cấu trúc hóa thất bại${structured.errorCategory ? `, phân loại ${structured.errorCategory}` : ""}${structured.error ? `: ${structured.error}` : ""}`
        : "Chưa kiểm tra cấu trúc hóa";
      setTestResult(`Kết nối thành công, tổng thời gian ${latency}ms · ${plainText} · ${structuredText}`);
    },
    onError: (error) => {
      setTestResult(error instanceof Error ? error.message : "Kiểm tra kết nối thất bại.");
    },
  });

  const refreshModelsMutation = useMutation({
    mutationFn: (provider: LLMProvider) => refreshProviderModelList(provider),
    onSuccess: async (response, provider) => {
      const count = response.data?.models?.length ?? 0;
      const providerName = providerConfigs.find((item) => item.provider === provider)?.name ?? provider;
      setActionResult(`Đã làm mới danh sách mô hình của ${providerName} (${count} mô hình).`);
      await invalidateProviderQueries();
    },
    onError: (error) => {
      setActionResult(error instanceof Error ? error.message : "Làm mới danh sách mô hình thất bại.");
    },
  });

  const toggleReasoningMutation = useMutation({
    mutationFn: (payload: { provider: LLMProvider; reasoningEnabled: boolean }) =>
      saveAPIKeySetting(payload.provider, {
        reasoningEnabled: payload.reasoningEnabled,
      }),
    onSuccess: async (_response, variables) => {
      const providerName = providerConfigs.find((item) => item.provider === variables.provider)?.name ?? variables.provider;
      setActionResult(`Chức năng suy luận của ${providerName} đã ${variables.reasoningEnabled ? "bật" : "tắt"}.`);
      await invalidateProviderQueries();
    },
    onError: (error) => {
      setActionResult(error instanceof Error ? error.message : "Cập nhật công tắc suy luận thất bại.");
    },
  });

  const refreshBalanceMutation = useMutation({
    mutationFn: (provider: LLMProvider) => refreshProviderBalance(provider),
    onSuccess: async (response, provider) => {
      const providerName = providerConfigs.find((item) => item.provider === provider)?.name ?? provider;
      setActionResult(response.message ?? `Số dư của ${providerName} đã được làm mới.`);
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings.apiKeyBalances });
    },
    onError: (error) => {
      setActionResult(error instanceof Error ? error.message : "Làm mới số dư thất bại.");
    },
  });

  const providerBalanceMap = useMemo(
    () => new Map((providerBalancesQuery.data?.data ?? []).map((item) => [item.provider, item])),
    [providerBalancesQuery.data?.data],
  );
  const ragSettings = ragSettingsQuery.data?.data;
  const ragProvider = useMemo(
    () => ragSettings?.providers.find((item) => item.provider === ragSettings.embeddingProvider),
    [ragSettings],
  );

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
      baseURL: config.currentBaseURL,
    });
    setTestResult("");
    setActionResult("");
  };

  const openCreateCustomDialog = () => {
    setEditingProvider("");
    setIsCreatingCustomProvider(true);
    setForm({
      displayName: "",
      key: "",
      model: "",
      baseURL: "",
    });
    setTestResult("");
    setActionResult("");
  };

  const canRefreshBalance = (provider: LLMProvider, kind: "builtin" | "custom", isConfigured: boolean) => {
    if (kind === "custom" || !isConfigured) {
      return false;
    }
    const balance = providerBalanceMap.get(provider);
    return Boolean(balance?.canRefresh ?? (provider === "deepseek" || provider === "siliconflow" || provider === "kimi"));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
        <CardTitle>Cài đặt Embedding đã được chuyển chỗ</CardTitle>
        <CardDescription>
            Cấu hình nhà cung cấp và mô hình embedding hiện nằm trong mục tri thức.
        </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Nhà cung cấp embedding hiện tại</div>
              <div className="mt-1 font-medium">{ragProvider?.name ?? ragSettings?.embeddingProvider ?? "-"}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Mô hình embedding hiện tại</div>
              <div className="mt-1 font-medium">{ragSettings?.embeddingModel ?? "-"}</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Trạng thái</span>
            <Badge variant={ragProvider?.isConfigured ? "default" : "outline"}>
              {ragProvider?.isConfigured ? "Đã có API key" : "Thiếu API key"}
            </Badge>
            <Badge variant={ragProvider?.isActive ? "default" : "outline"}>
              {ragProvider?.isActive ? "Đang bật" : "Đang tắt"}
            </Badge>
          </div>
          <Button asChild>
            <Link to="/knowledge?tab=settings">Mở cài đặt tri thức</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Điều phối mô hình</CardTitle>
          <CardDescription>Phân bổ từng vai trò viết cho từng mô hình khác nhau, nên quản lý tập trung ở trang riêng.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Hiện điều phối mô hình đã có trang quản lý riêng, cho phép cấu hình riêng nhà cung cấp và mô hình theo từng vai trò.
          </div>
          <Button asChild>
            <Link to="/settings/model-routes">Vào trang điều phối mô hình</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Nhà cung cấp mô hình</CardTitle>
            <CardDescription>
              Quản lý các nhà cung cấp tích hợp sẵn, hoặc thêm nhà cung cấp tùy chỉnh tương thích OpenAI.
            </CardDescription>
          </div>
          <Button onClick={openCreateCustomDialog}>Thêm nhà cung cấp tùy chỉnh</Button>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
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
                className={`rounded-md border p-3 transition-colors ${
                  item.isConfigured
                    ? "border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20"
                    : "border-border"
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{item.name}</div>
                    {item.kind === "custom" ? <Badge variant="outline">Tùy chỉnh</Badge> : null}
                  </div>
                  <Badge
                    variant={item.isConfigured ? "default" : "outline"}
                    className={item.isConfigured ? "bg-emerald-600 text-white hover:bg-emerald-600" : ""}
                  >
                    {item.isConfigured ? "Đã cấu hình" : "Chưa cấu hình"}
                  </Badge>
                </div>
                <div className="mb-2 text-xs text-muted-foreground">Mô hình hiện tại: {item.currentModel || "-"}</div>
                <div className="mb-2 text-xs text-muted-foreground">API URL: {item.currentBaseURL || "-"}</div>
                <div className="mb-3 flex items-center justify-between rounded-md border bg-background/60 px-3 py-2">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Chế độ suy luận</div>
                    <div className="text-xs text-muted-foreground">
                      {item.reasoningEnabled
                        ? "Hiện hệ thống sẽ trả về và hiển thị phần suy luận của mô hình."
                        : "Hiện hệ thống sẽ ẩn phần suy luận; MiniMax sẽ tự tách và làm sạch để tránh thẻ <think> lọt vào nội dung chính."}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{item.reasoningEnabled ? "Đang bật" : "Đang tắt"}</span>
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
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">Số dư</div>
                      <div className="text-sm text-muted-foreground">
                        Nhà cung cấp tùy chỉnh tương thích OpenAI hiện chưa hỗ trợ truy vấn số dư.
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="text-xs font-medium text-muted-foreground">Số dư</div>
                        {balance?.status === "available" ? (
                          <Badge variant="outline">Cập nhật gần nhất {formatBalanceTime(balance.fetchedAt)}</Badge>
                        ) : null}
                      </div>
                      {isBalanceLoading ? (
                        <div className="text-sm text-muted-foreground">Đang truy vấn số dư...</div>
                      ) : balance?.status === "available" ? (
                        <div className="space-y-2">
                          <div className="text-lg font-semibold">
                            {formatBalanceAmount(balance.availableBalance, balance.currency)}
                          </div>
                          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                            {balance.cashBalance !== null ? <div>Số dư tiền mặt: {formatBalanceAmount(balance.cashBalance, balance.currency)}</div> : null}
                            {balance.voucherBalance !== null ? <div>Số dư voucher: {formatBalanceAmount(balance.voucherBalance, balance.currency)}</div> : null}
                            {balance.chargeBalance !== null ? <div>Số dư nạp tiền: {formatBalanceAmount(balance.chargeBalance, balance.currency)}</div> : null}
                            {balance.toppedUpBalance !== null ? <div>Tổng nạp: {formatBalanceAmount(balance.toppedUpBalance, balance.currency)}</div> : null}
                            {balance.grantedBalance !== null ? <div>Hạn mức tặng: {formatBalanceAmount(balance.grantedBalance, balance.currency)}</div> : null}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="text-sm text-muted-foreground">
                            {balance?.error ?? balance?.message ?? (item.isConfigured ? "Hiện chưa lấy được thông tin số dư." : "Vui lòng cấu hình API Key trước.")}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="mb-3 space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {(isProviderExpanded(item.provider)
                      ? item.models
                      : item.models.slice(0, MODEL_BADGE_COLLAPSE_COUNT)
                    ).map((model) => (
                      <Badge
                        key={model}
                        variant={model === item.currentModel ? "default" : "outline"}
                        className={model === item.currentModel ? "bg-primary" : ""}
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
                        ? "Thu gọn danh sách mô hình"
                        : `Mở rộng toàn bộ ${item.models.length} mô hình`}
                    </button>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => openBuiltInDialog(item.provider)}>
                    {item.kind === "custom" ? "Chỉnh sửa" : "Cấu hình"}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
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
                    Kiểm tra
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setActionResult("");
                      refreshModelsMutation.mutate(item.provider);
                    }}
                    disabled={!item.isConfigured || refreshModelsMutation.isPending}
                  >
                      {refreshModelsMutation.isPending && refreshModelsMutation.variables === item.provider
                      ? "Đang làm mới..."
                      : "Làm mới mô hình"}
                  </Button>
                  {item.kind === "builtin" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setActionResult("");
                        refreshBalanceMutation.mutate(item.provider);
                      }}
                      disabled={!refreshBalanceEnabled || isBalanceRefreshing}
                    >
                      {isBalanceRefreshing ? "Đang làm mới số dư..." : "Làm mới số dư"}
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {actionResult ? <div className="text-sm text-muted-foreground">{actionResult}</div> : null}

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetDialogState();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isCreatingCustomProvider
                ? "Thêm nhà cung cấp tùy chỉnh"
                : isCustomDialog
                  ? "Chỉnh sửa nhà cung cấp tùy chỉnh"
                  : "Cấu hình nhà cung cấp mô hình"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {isCustomDialog ? (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Tên nhà cung cấp</div>
                <Input
                  value={form.displayName}
                  placeholder="Ví dụ: My Gateway"
                  onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
                />
              </div>
            ) : null}

            {(isCustomDialog || editingConfig?.requiresApiKey === false) ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Mục này hỗ trợ chạy cục bộ hoặc kết nối không cần mật khẩu, nên có thể để trống API Key; phần quan trọng là tên mô hình và API URL.
              </div>
            ) : null}

            <Input
              type="password"
              value={form.key}
              placeholder={editingConfig?.isConfigured ? "Để trống để giữ API Key đã lưu" : "Nhập API key"}
              onChange={(event) => setForm((prev) => ({ ...prev, key: event.target.value }))}
            />

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Các mô hình khả dụng</div>
              <SearchableSelect
                value={form.model}
                onValueChange={(value) => setForm((prev) => ({ ...prev, model: value }))}
                options={(editingConfig?.models ?? []).map((model) => ({ value: model }))}
                placeholder="Chọn mô hình"
                searchPlaceholder="Tìm mô hình"
                emptyText="Không có mô hình nào"
              />
            </div>

            <Input
              value={form.model}
              placeholder="Cũng có thể tự nhập tên mô hình"
              onChange={(event) => setForm((prev) => ({ ...prev, model: event.target.value }))}
            />

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">API URL</div>
              <Input
                value={form.baseURL}
                placeholder={editingConfig?.defaultBaseURL ?? "https://api.example.com/v1"}
                onChange={(event) => setForm((prev) => ({ ...prev, baseURL: event.target.value }))}
              />
              <div className="text-xs text-muted-foreground">
                Địa chỉ Ollama cục bộ thường là `http://127.0.0.1:11434/v1`. Để trống sẽ dùng địa chỉ mặc định hiện tại.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  if (isCreatingCustomProvider) {
                    createCustomProviderMutation.mutate({
                      name: form.displayName.trim(),
                      key: form.key.trim() ? form.key : undefined,
                      model: form.model.trim(),
                      baseURL: form.baseURL.trim(),
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
                    baseURL: form.baseURL,
                  });
                }}
                disabled={
                  saveMutation.isPending
                  || createCustomProviderMutation.isPending
                  || !form.model.trim()
                  || (isCustomDialog && !form.displayName.trim())
                  || (isCreatingCustomProvider && !form.baseURL.trim())
                  || (!isCustomDialog && editingConfig?.requiresApiKey !== false && !form.key.trim() && !editingConfig?.isConfigured)
                }
              >
                {saveMutation.isPending || createCustomProviderMutation.isPending ? "Đang lưu..." : "Lưu"}
              </Button>

              <Button
                variant="secondary"
                onClick={() =>
                  testMutation.mutate({
                    provider: editingProvider || "custom_preview",
                    apiKey: form.key.trim() ? form.key : undefined,
                    model: form.model.trim() || undefined,
                    baseURL: form.baseURL.trim() ? form.baseURL : undefined,
                    probeMode: "both",
                  })
                }
                disabled={testMutation.isPending || !form.model.trim() || !form.baseURL.trim()}
              >
                Kiểm tra
              </Button>

              {editingConfig?.kind === "custom" ? (
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (!editingProvider) {
                      return;
                    }
                    if (!window.confirm(`Bạn có chắc muốn xóa nhà cung cấp tùy chỉnh ${editingConfig.name} không?`)) {
                      return;
                    }
                    deleteCustomProviderMutation.mutate(editingProvider);
                  }}
                  disabled={deleteCustomProviderMutation.isPending}
                >
                  {deleteCustomProviderMutation.isPending ? "Đang xóa..." : "Xóa"}
                </Button>
              ) : null}
            </div>
            {testResult ? <div className="text-sm text-muted-foreground">{testResult}</div> : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
