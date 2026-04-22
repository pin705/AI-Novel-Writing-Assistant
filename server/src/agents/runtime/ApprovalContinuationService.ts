import { AgentTraceStore } from "../traceStore";
import type { AgentApprovalDecisionInput, AgentRuntimeCallbacks, AgentRuntimeResult, PlannedAction } from "../types";
import { getBackendMessage } from "../../i18n";
import { RunExecutionService } from "./RunExecutionService";
import { withSharedRunLock } from "./runLocks";

type FailRunFn = (
  runId: string,
  message: string,
  agentName: string,
  callbacks?: AgentRuntimeCallbacks,
) => Promise<void>;

function getApprovalStatusLabel(status: string): string {
  switch (status) {
    case "approved":
      return getBackendMessage("agent.runtime.approval.status.approved");
    case "rejected":
      return getBackendMessage("agent.runtime.approval.status.rejected");
    case "expired":
      return getBackendMessage("agent.runtime.approval.status.expired");
    default:
      return status;
  }
}

export class ApprovalContinuationService {
  constructor(
    private readonly store: AgentTraceStore,
    private readonly executor: RunExecutionService,
  ) {}

  async reconcileWaitingApprovalRun(runId: string): Promise<void> {
    const run = await this.store.getRun(runId);
    if (!run || run.status !== "waiting_approval") {
      return;
    }

    await this.store.expirePendingApprovals(runId);
    const detail = await this.store.getRunDetail(runId);
    if (!detail || detail.run.status !== "waiting_approval") {
      return;
    }

    const pendingApprovals = detail.approvals.filter((item) => item.status === "pending");
    if (pendingApprovals.length > 0) {
      return;
    }

    const latestApproval = detail.approvals[detail.approvals.length - 1];
    const errorMessage = latestApproval?.status === "expired"
      ? getBackendMessage("agent.runtime.error.approval_expired_stopped")
      : getBackendMessage("agent.runtime.error.approval_inconsistent_stopped");

    await this.store.updateRun(runId, {
      status: "failed",
      currentStep: latestApproval?.status === "expired" ? "approval_expired" : "approval_inconsistent",
      currentAgent: detail.run.currentAgent ?? "Planner",
      error: errorMessage,
      finishedAt: new Date(),
    });
  }

  private markApprovedContinuation(actions: PlannedAction[]): PlannedAction[] {
    return actions.map((action, index) => {
      if (index !== 0 || action.calls.length === 0) {
        return action;
      }
      const [firstCall, ...restCalls] = action.calls;
      return {
        ...action,
        calls: [
          {
            ...firstCall,
            approvalSatisfied: true,
          },
          ...restCalls,
        ],
      };
    });
  }

  async resolve(
    input: AgentApprovalDecisionInput,
    callbacks: AgentRuntimeCallbacks | undefined,
    failRun: FailRunFn,
  ): Promise<AgentRuntimeResult> {
    return withSharedRunLock(input.runId, async () => {
      await this.reconcileWaitingApprovalRun(input.runId);
      const detail = await this.store.getRunDetail(input.runId);
      if (!detail) {
        throw new Error(getBackendMessage("agent.runtime.error.run_not_found"));
      }
      if (detail.run.status === "cancelled") {
        throw new Error(getBackendMessage("agent.runtime.error.run_cancelled"));
      }
      await this.store.expirePendingApprovals(input.runId);
      const pending = await this.store.findPendingApproval(input.runId, input.approvalId);
      if (!pending) {
        const latest = await this.store.getRunDetail(input.runId);
        const target = latest?.approvals.find((item) => item.id === input.approvalId);
        throw new Error(target
          ? getBackendMessage("agent.runtime.error.approval_already_resolved", {
            status: getApprovalStatusLabel(target.status),
          })
          : getBackendMessage("agent.runtime.error.approval_not_found"));
      }

      const approval = await this.store.resolveApproval({
        runId: input.runId,
        approvalId: input.approvalId,
        action: input.action,
        note: input.note,
      });
      callbacks?.onApprovalResolved?.({
        runId: input.runId,
        approvalId: input.approvalId,
        action: input.action === "approve" ? "approved" : "rejected",
        note: input.note,
      });

      const payload = this.executor.parseApprovalPayload(approval.payloadJson);
      if (!payload) {
        await failRun(input.runId, getBackendMessage("agent.runtime.error.approval_payload_invalid"), "Planner", callbacks);
        return this.executor.getRunDetailOrThrow(input.runId, getBackendMessage("agent.runtime.error.approval_payload_terminated"));
      }

      if (input.action === "reject") {
        const alternatives = this.executor.buildAlternativePathFromRejectedApproval(payload, input.note);
        if (alternatives.length === 0) {
          await failRun(
            input.runId,
            input.note?.trim() || getBackendMessage("agent.runtime.error.rejected_no_alternative"),
            "Planner",
            callbacks,
          );
          return this.executor.getRunDetailOrThrow(input.runId, getBackendMessage("agent.runtime.error.rejected_stopped"));
        }
        await this.store.updateRun(input.runId, {
          status: "running",
          currentStep: "executing",
          currentAgent: alternatives[0].agent,
          error: null,
          finishedAt: null,
        });
        callbacks?.onRunStatus?.({
          runId: input.runId,
          status: "running",
          message: getBackendMessage("agent.runtime.status.approval_rejected_alternative"),
        });
        return this.executor.runActionPlan(
          input.runId,
          payload.goal,
          alternatives,
          payload.context,
          payload.structuredIntent,
          failRun,
          callbacks,
        );
      }

      await this.store.updateRun(input.runId, {
        status: "running",
        currentStep: "executing",
        currentAgent: payload.plannedActions[0]?.agent ?? "Planner",
        error: null,
        finishedAt: null,
      });
      callbacks?.onRunStatus?.({
        runId: input.runId,
        status: "running",
        message: getBackendMessage("agent.runtime.status.approval_approved_resume"),
      });
      const approvedActions = this.markApprovedContinuation(payload.plannedActions);
      return this.executor.runActionPlan(
        input.runId,
        payload.goal,
        approvedActions,
        payload.context,
        payload.structuredIntent,
        failRun,
        callbacks,
      );
    });
  }
}
