import type { CreativeHubMessage, CreativeHubThread } from "@ai-novel/shared/types/creativeHub";
import { getBackendMessage } from "../i18n";

export function latestHumanGoal(messages: CreativeHubMessage[]): string {
  const latestHuman = [...messages].reverse().find((item) => item.type === "human");
  if (typeof latestHuman?.content === "string" && latestHuman.content.trim()) {
    return latestHuman.content.trim();
  }
  return getBackendMessage("creativeHub.runtime.goal.default");
}

export function toRunStatusContext(status: CreativeHubThread["status"], latestError: string | null) {
  return {
    threadStatus: status,
    latestError,
  };
}
