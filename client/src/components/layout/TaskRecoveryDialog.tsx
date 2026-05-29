import type { RecoverableTaskSummary } from "@ai-novel/shared/types/task";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AppDialogContent,
  Dialog,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/i18n";
import { useTaskRecovery } from "./TaskRecoveryContext";

function formatTaskKind(
  kind: RecoverableTaskSummary["kind"],
  t: (key: string) => string,
): string {
  switch (kind) {
    case "novel_workflow":
      return t("components.layout.taskRecovery.kinds.novel_workflow");
    case "novel_pipeline":
      return t("components.layout.taskRecovery.kinds.novel_pipeline");
    case "book_analysis":
      return t("components.layout.taskRecovery.kinds.book_analysis");
    case "style_extraction":
      return t("components.layout.taskRecovery.kinds.style_extraction");
    default:
      return t("components.layout.taskRecovery.kinds.image");
  }
}

export default function TaskRecoveryDialog() {
  const { t } = useTranslation();
  const {
    items,
    isOpen,
    busyTaskId,
    isResumeSinglePending,
    isResumeAllPending,
    closeDialog,
    resumeSingle,
    resumeAll,
  } = useTaskRecovery();

  return (
    <Dialog open={isOpen} onOpenChange={(nextOpen) => { if (!nextOpen) closeDialog(); }}>
      <AppDialogContent
        title={t("components.layout.taskRecovery.title")}
        description={t("components.layout.taskRecovery.description")}
        footer={(
          <>
            <Button variant="outline" onClick={closeDialog}>
              {t("components.layout.taskRecovery.later")}
            </Button>
            <Button onClick={resumeAll} disabled={isResumeSinglePending || isResumeAllPending}>
              {isResumeAllPending
                ? t("components.layout.taskRecovery.resumeAllPending")
                : t("components.layout.taskRecovery.resumeAll")}
            </Button>
          </>
        )}
      >
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={`${item.kind}-${item.id}`}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{formatTaskKind(item.kind, t)}</Badge>
                      <Badge variant={item.status === "running" ? "default" : "secondary"}>
                        {item.status === "running"
                          ? t("components.layout.taskRecovery.statusRunning")
                          : t("components.layout.taskRecovery.statusQueued")}
                      </Badge>
                    </div>
                    <div className="text-base font-semibold">{item.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {t("components.layout.taskRecovery.ownerLabel", { value: item.ownerLabel })}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => resumeSingle({ kind: item.kind, id: item.id })}
                      disabled={isResumeAllPending || (isResumeSinglePending && busyTaskId !== item.id)}
                    >
                      {isResumeSinglePending && busyTaskId === item.id
                        ? t("components.layout.taskRecovery.resumeSinglePending")
                        : t("components.layout.taskRecovery.resumeSingle")}
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link to={item.sourceRoute} onClick={closeDialog}>
                        {t("components.layout.taskRecovery.openLocation")}
                      </Link>
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2 text-sm text-muted-foreground">
                  {item.currentStage
                    ? <div>{t("components.layout.taskRecovery.currentStage", { value: item.currentStage })}</div>
                    : null}
                  {item.currentItemLabel
                    ? <div>{t("components.layout.taskRecovery.currentItem", { value: item.currentItemLabel })}</div>
                    : null}
                  {item.resumeAction
                    ? <div>{t("components.layout.taskRecovery.resumeAction", { value: item.resumeAction })}</div>
                    : null}
                  {item.recoveryHint
                    ? <div>{t("components.layout.taskRecovery.recoveryHint", { value: item.recoveryHint })}</div>
                    : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </AppDialogContent>
    </Dialog>
  );
}
