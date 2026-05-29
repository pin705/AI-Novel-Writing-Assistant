import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  DirectorPolicyMode,
  DirectorRuntimeSnapshot,
} from "@ai-novel/shared/types/directorRuntime";
import { updateDirectorRuntimePolicy } from "@/api/novelDirector";
import { queryKeys } from "@/api/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/i18n";

interface TaskCenterRuntimePolicyCardProps {
  taskId: string;
  snapshot: DirectorRuntimeSnapshot | null | undefined;
}

const POLICY_VALUES: readonly DirectorPolicyMode[] = [
  "suggest_only",
  "run_next_step",
  "run_until_gate",
  "auto_safe_scope",
];

export default function TaskCenterRuntimePolicyCard({
  taskId,
  snapshot,
}: TaskCenterRuntimePolicyCardProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentMode = snapshot?.policy.mode ?? "run_until_gate";
  const [selectedMode, setSelectedMode] = useState<DirectorPolicyMode>(currentMode);
  const [allowExpensiveReview, setAllowExpensiveReview] = useState(false);
  const [mayOverwriteUserContent, setMayOverwriteUserContent] = useState(false);

  const policyOptions = useMemo(() => ([
    {
      value: "suggest_only" as const,
      label: t("tasks.policy.suggestOnly"),
      description: t("tasks.policy.suggestOnlyDescription"),
    },
    {
      value: "run_next_step" as const,
      label: t("tasks.policy.runNextStep"),
      description: t("tasks.policy.runNextStepDescription"),
    },
    {
      value: "run_until_gate" as const,
      label: t("tasks.policy.runUntilGate"),
      description: t("tasks.policy.runUntilGateDescription"),
    },
    {
      value: "auto_safe_scope" as const,
      label: t("tasks.policy.autoSafeScope"),
      description: t("tasks.policy.autoSafeScopeDescription"),
    },
  ]), [t]);

  const selectedOption = useMemo(
    () => policyOptions.find((item) => item.value === selectedMode) ?? policyOptions[2],
    [policyOptions, selectedMode],
  );

  const formatPolicyMode = (mode: DirectorPolicyMode): string => {
    return policyOptions.find((item) => item.value === mode)?.label ?? mode;
  };

  const mutation = useMutation({
    mutationFn: () => updateDirectorRuntimePolicy(taskId, {
      mode: selectedMode,
      allowExpensiveReview,
      mayOverwriteUserContent,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.directorRuntime(taskId) });
      toast.success(t("tasks.policy.updated"));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("tasks.policy.updateFailed"));
    },
  });

  useEffect(() => {
    setSelectedMode(currentMode);
    setAllowExpensiveReview(Boolean(snapshot?.policy.allowExpensiveReview));
    setMayOverwriteUserContent(Boolean(snapshot?.policy.mayOverwriteUserContent));
  }, [currentMode, snapshot?.policy.allowExpensiveReview, snapshot?.policy.mayOverwriteUserContent]);

  if (!snapshot) {
    return null;
  }

  // Reference POLICY_VALUES so it is kept for potential consumers using these constants.
  void POLICY_VALUES;

  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-medium">{t("tasks.policy.title")}</div>
          <div className="mt-1 text-sm leading-6 text-muted-foreground">
            {t("tasks.policy.description")}
          </div>
        </div>
        <Badge variant="outline">{formatPolicyMode(snapshot.policy.mode)}</Badge>
      </div>
      <div className="mt-3 space-y-2">
        <select
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={selectedMode}
          onChange={(event) => setSelectedMode(event.target.value as DirectorPolicyMode)}
        >
          {policyOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <div className="text-xs leading-5 text-muted-foreground">{selectedOption.description}</div>
      </div>
      <div className="mt-3 space-y-2 rounded-md border bg-background/70 p-3">
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={allowExpensiveReview}
            onChange={(event) => setAllowExpensiveReview(event.target.checked)}
          />
          <span>
            <span className="block font-medium">{t("tasks.policy.allowExpensiveReview")}</span>
            <span className="block text-xs leading-5 text-muted-foreground">
              {t("tasks.policy.allowExpensiveReviewHint")}
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={mayOverwriteUserContent}
            onChange={(event) => setMayOverwriteUserContent(event.target.checked)}
          />
          <span>
            <span className="block font-medium">{t("tasks.policy.mayOverwriteUserContent")}</span>
            <span className="block text-xs leading-5 text-muted-foreground">
              {t("tasks.policy.mayOverwriteUserContentHint")}
            </span>
          </span>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => mutation.mutate()}
          disabled={
            mutation.isPending
            || (
              selectedMode === snapshot.policy.mode
              && allowExpensiveReview === Boolean(snapshot.policy.allowExpensiveReview)
              && mayOverwriteUserContent === Boolean(snapshot.policy.mayOverwriteUserContent)
            )
          }
        >
          {mutation.isPending ? t("tasks.policy.saving") : t("tasks.policy.save")}
        </Button>
      </div>
    </div>
  );
}
