import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  ThreadPrimitive,
  type AssistantRuntime,
} from "@assistant-ui/react";
import type { FailureDiagnostic } from "@ai-novel/shared/types/agent";
import type { CreativeHubInterrupt } from "@ai-novel/shared/types/creativeHub";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n";
import { CreativeHubInlineControlsProvider } from "./CreativeHubInlineControlsContext";
import {
  CreativeHubAssistantMessage,
  CreativeHubEditComposer,
  CreativeHubUserMessage,
} from "./CreativeHubMessagePrimitives";

interface CreativeHubConversationProps {
  runtime: AssistantRuntime;
  onQuickAction?: (prompt: string) => void;
  interrupt?: CreativeHubInterrupt;
  approvalNote?: string;
  onApprovalNoteChange?: (value: string) => void;
  onResolveInterrupt?: (action: "approve" | "reject") => void;
  diagnostics?: FailureDiagnostic;
}

export default function CreativeHubConversation({
  runtime,
  onQuickAction,
  interrupt,
  approvalNote,
  onApprovalNoteChange,
  onResolveInterrupt,
  diagnostics,
}: CreativeHubConversationProps) {
  const { t } = useTranslation();
  return (
    <CreativeHubInlineControlsProvider
      value={{
        interrupt,
        approvalNote: approvalNote ?? "",
        diagnostics,
        onApprovalNoteChange,
        onResolveInterrupt,
        onQuickAction,
      }}
    >
      <AssistantRuntimeProvider runtime={runtime}>
        <Card className="flex h-full min-h-0 flex-col">
          <CardHeader>
            <CardTitle className="text-base">{t("creativeHub.common.title")}</CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col">
            <ThreadPrimitive.Root className="flex min-h-0 flex-1 flex-col space-y-4">
              <ThreadPrimitive.Viewport className="min-h-0 flex-1 space-y-4 overflow-y-auto rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/70 p-4 ring-1 ring-slate-200">
                <ThreadPrimitive.Empty>
                  <div className="mx-auto mt-8 max-w-[680px] px-2 text-center">
                    <h3 className="text-4xl font-semibold tracking-tight text-slate-900">
                      {t("creativeHub.conversation.emptyTitle")}
                    </h3>
                    <p className="mt-2 text-lg text-slate-500">{t("creativeHub.conversation.emptyHint")}</p>
                    {onQuickAction ? (
                      <div className="mt-5 flex flex-wrap justify-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => onQuickAction(t("creativeHub.conversation.quickActions.setDirectionPrompt"))}
                        >
                          {t("creativeHub.conversation.quickActions.setDirection")}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => onQuickAction(t("creativeHub.conversation.quickActions.diagnosePrompt"))}
                        >
                          {t("creativeHub.conversation.quickActions.diagnose")}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => onQuickAction(t("creativeHub.conversation.quickActions.askPromisePrompt"))}
                        >
                          {t("creativeHub.conversation.quickActions.askPromise")}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => onQuickAction(t("creativeHub.conversation.quickActions.convergePrompt"))}
                        >
                          {t("creativeHub.conversation.quickActions.converge")}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </ThreadPrimitive.Empty>
                <ThreadPrimitive.Messages
                  components={{
                    UserMessage: CreativeHubUserMessage,
                    AssistantMessage: CreativeHubAssistantMessage,
                    EditComposer: CreativeHubEditComposer,
                  }}
                />
              </ThreadPrimitive.Viewport>
              <ComposerPrimitive.Root className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <ComposerPrimitive.Input
                  className="min-h-[110px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                  placeholder={t("creativeHub.conversation.composerPlaceholder")}
                  submitMode="enter"
                />
                <div className="mt-3 flex gap-2">
                  <ComposerPrimitive.Send asChild>
                    <button
                      type="button"
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                      {t("creativeHub.conversation.send")}
                    </button>
                  </ComposerPrimitive.Send>
                  <ComposerPrimitive.Cancel asChild>
                    <button
                      type="button"
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      {t("creativeHub.conversation.stop")}
                    </button>
                  </ComposerPrimitive.Cancel>
                </div>
              </ComposerPrimitive.Root>
            </ThreadPrimitive.Root>
          </CardContent>
        </Card>
      </AssistantRuntimeProvider>
    </CreativeHubInlineControlsProvider>
  );
}
