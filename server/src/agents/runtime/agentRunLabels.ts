import { getBackendMessage } from "../../i18n";

const AGENT_RUN_STEP_LABEL_KEYS = {
  planning: "task.agentRun.currentStep.planning",
  executing: "task.agentRun.currentStep.executing",
  waiting_approval: "task.agentRun.currentStep.waiting_approval",
  completed: "task.agentRun.currentStep.completed",
  failed: "task.agentRun.currentStep.failed",
  cancelled: "task.agentRun.currentStep.cancelled",
  approval_expired: "task.agentRun.currentStep.approval_expired",
  approval_inconsistent: "task.agentRun.currentStep.approval_inconsistent",
  chapter_generation_completed: "task.agentRun.currentStep.chapter_generation_completed",
} as const;

export function localizeAgentRunCurrentStep(step: string | null | undefined): string | null {
  const normalized = step?.trim();
  if (!normalized) {
    return null;
  }
  const key = AGENT_RUN_STEP_LABEL_KEYS[normalized as keyof typeof AGENT_RUN_STEP_LABEL_KEYS];
  return key ? getBackendMessage(key) : normalized;
}

export function localizeAgentRunRecord<T extends { currentStep?: string | null }>(run: T): T {
  const localizedStep = localizeAgentRunCurrentStep(run.currentStep);
  if (!localizedStep || localizedStep === run.currentStep) {
    return run;
  }
  return {
    ...run,
    currentStep: localizedStep,
  };
}
