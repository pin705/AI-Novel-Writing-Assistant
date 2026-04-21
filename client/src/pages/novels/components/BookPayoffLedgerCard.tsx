import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  PayoffLedgerItem,
  PayoffLedgerResponse,
  StoryStateSnapshot,
} from "@ai-novel/shared/types/novel";
import CollapsibleSummary from "./CollapsibleSummary";
import { t } from "@/i18n";


interface BookPayoffLedgerCardProps {
  latestStateSnapshot?: StoryStateSnapshot | null;
  payoffLedger?: PayoffLedgerResponse | null;
}

function payoffStatusLabel(status: string): string {
  switch (status) {
    case "setup":
      return t("已埋设");
    case "hinted":
      return t("已提示");
    case "pending_payoff":
      return t("待回收");
    case "paid_off":
      return t("已回收");
    case "failed":
      return t("已失效");
    case "overdue":
      return t("已逾期");
    default:
      return status || t("未知");
  }
}

function payoffStatusVariant(status: string): "default" | "secondary" | "outline" {
  switch (status) {
    case "paid_off":
      return "default";
    case "failed":
      return "secondary";
    default:
      return "outline";
  }
}

function payoffStatusTone(status: string): string {
  if (status === "overdue") {
    return "border-amber-300 bg-amber-50 text-amber-900";
  }
  if (status === "paid_off") {
    return "border-emerald-300 bg-emerald-50 text-emerald-900";
  }
  if (status === "failed") {
    return "border-slate-300 bg-slate-100 text-slate-700";
  }
  return "";
}

function formatWindow(item: PayoffLedgerItem): string {
  if (
    typeof item.targetStartChapterOrder === "number"
    && typeof item.targetEndChapterOrder === "number"
  ) {
    return t("第 {{targetStartChapterOrder}}-{{targetEndChapterOrder}} 章", { targetStartChapterOrder: item.targetStartChapterOrder, targetEndChapterOrder: item.targetEndChapterOrder });
  }
  if (typeof item.targetEndChapterOrder === "number") {
    return t("最晚第 {{targetEndChapterOrder}} 章", { targetEndChapterOrder: item.targetEndChapterOrder });
  }
  if (typeof item.targetStartChapterOrder === "number") {
    return t("从第 {{targetStartChapterOrder}} 章开始", { targetStartChapterOrder: item.targetStartChapterOrder });
  }
  return t("未限定");
}

function scopeLabel(scopeType: PayoffLedgerItem["scopeType"]): string {
  if (scopeType === "book") {
    return t("全书");
  }
  if (scopeType === "volume") {
    return t("卷级");
  }
  return t("章节");
}

function sourceSummary(item: PayoffLedgerItem): string {
  const labels = item.sourceRefs
    .map((source) => source.refLabel?.trim())
    .filter(Boolean)
    .slice(0, 3);
  return labels.length > 0 ? labels.join(" / ") : t("暂无来源摘要");
}

export default function BookPayoffLedgerCard(props: BookPayoffLedgerCardProps) {
  const { latestStateSnapshot, payoffLedger } = props;
  const ledgerItems = payoffLedger?.items ?? [];
  const ledgerSummary = payoffLedger?.summary;
  const snapshotForeshadows = latestStateSnapshot?.foreshadowStates ?? [];
  const pendingForeshadows = snapshotForeshadows.filter(
    (item) => item.status !== "paid_off" && item.status !== "failed",
  );
  const paidOffForeshadows = snapshotForeshadows.filter((item) => item.status === "paid_off");
  const failedForeshadows = snapshotForeshadows.filter((item) => item.status === "failed");
  const hasCanonicalLedgerContent = ledgerItems.length > 0;
  const hasSnapshotContent = snapshotForeshadows.length > 0 || Boolean(latestStateSnapshot?.summary?.trim());

  return (
    <Card>
      <CardContent className="p-0">
        <details className="group">
          <summary className="cursor-pointer list-none p-5">
            <CollapsibleSummary
              title={t("全书 Canonical 伏笔账本")}
              description={t("这块是整本书级别的 canonical 伏笔账本，不跟随当前卷切换。默认收起，需要检查整条伏笔链或整体回收压力时再展开。")}
              collapsedLabel="展开全书账本"
              expandedLabel="收起全书账本"
              meta={(
                <>
                  <Badge variant="outline">{t("待兑现")}{ledgerSummary?.pendingCount ?? 0}</Badge>
                  <Badge variant={ledgerSummary?.urgentCount ? "secondary" : "outline"}>
                    {t("紧急")}{ledgerSummary?.urgentCount ?? 0}
                  </Badge>
                  <Badge variant={ledgerSummary?.overdueCount ? "secondary" : "outline"}>
                    {t("逾期")}{ledgerSummary?.overdueCount ?? 0}
                  </Badge>
                  <Badge variant="outline">{t("已回收")}{ledgerSummary?.paidOffCount ?? 0}</Badge>
                </>
              )}
            />
          </summary>

          <div className="space-y-3 border-t border-border/70 px-5 pb-5 pt-4">
            <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-foreground">{t("Canonical 伏笔账本")}</div>
                <Badge variant="outline">{ledgerItems.length}</Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {t("后续规划、写作、审查和修复优先消费这里的 canonical 结果，不再只盯某一处原始字段。")}</div>
              <div className="mt-3 space-y-2 text-sm">
                {hasCanonicalLedgerContent ? (
                  ledgerItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-border/70 bg-background p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium text-foreground">{item.title}</div>
                        <Badge
                          variant={payoffStatusVariant(item.currentStatus)}
                          className={cn(payoffStatusTone(item.currentStatus))}
                        >
                          {payoffStatusLabel(item.currentStatus)}
                        </Badge>
                        <Badge variant="outline">{scopeLabel(item.scopeType)}</Badge>
                        <Badge variant="outline">{formatWindow(item)}</Badge>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">{item.summary}</div>
                      <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                        <div>
                          {t("最近触碰：")}{typeof item.lastTouchedChapterOrder === "number"
                            ? t("第 {{lastTouchedChapterOrder}} 章", { lastTouchedChapterOrder: item.lastTouchedChapterOrder })
                            : t("暂无")}
                        </div>
                        <div>{t("来源摘要：")}{sourceSummary(item)}</div>
                        <div>
                          {t("风险信号：")}{item.riskSignals.length > 0
                            ? ` ${item.riskSignals
                              .slice(0, 2)
                              .map((signal) => signal.summary)
                              .join("；")}`
                            : t("暂无")}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-border/70 bg-background p-3 text-xs text-muted-foreground">
                    {t("当前还没有可用的 canonical 伏笔账本。首次进入老项目时，系统会懒同步这份账本；如果现在仍为空，说明相关规划或状态材料还不够。")}</div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-foreground">{t("全书最新状态快照")}</div>
                <Badge variant="outline">{snapshotForeshadows.length}</Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {t("这里显示的是全书最新状态，不只限当前卷，用来辅助判断整体回收压力。")}</div>
              {latestStateSnapshot?.summary ? (
                <div className="mt-3 rounded-lg border border-border/70 bg-background p-3 text-xs text-muted-foreground">
                  {latestStateSnapshot.summary}
                </div>
              ) : null}
              <div className="mt-3 space-y-3 text-sm">
                {hasSnapshotContent ? (
                  <>
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">{t("待跟进")}</div>
                      {pendingForeshadows.length > 0 ? (
                        pendingForeshadows.slice(0, 5).map((item) => (
                          <div
                            key={item.id}
                            className="rounded-lg border border-border/70 bg-background p-3"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-medium text-foreground">{item.title}</div>
                              <Badge variant={payoffStatusVariant(item.status)}>
                                {payoffStatusLabel(item.status)}
                              </Badge>
                            </div>
                            {item.summary ? (
                              <div className="mt-1 text-xs text-muted-foreground">{item.summary}</div>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-lg border border-dashed border-border/70 bg-background p-3 text-xs text-muted-foreground">
                          {t("当前没有待跟进的伏笔状态。")}</div>
                      )}
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border border-border/70 bg-background p-3">
                        <div className="text-xs text-muted-foreground">{t("已回收")}</div>
                        <div className="mt-1 text-lg font-semibold text-foreground">
                          {paidOffForeshadows.length}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-background p-3">
                        <div className="text-xs text-muted-foreground">{t("已失效")}</div>
                        <div className="mt-1 text-lg font-semibold text-foreground">
                          {failedForeshadows.length}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed border-border/70 bg-background p-3 text-xs text-muted-foreground">
                    {t("还没有可用的伏笔状态快照。先执行章节生成或审计后，这里的状态会逐步充实。")}</div>
                )}
              </div>
            </div>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
