import type { AutoDirectorChannelSettings } from "@/api/settings";

export interface AutoDirectorEventOption {
  code: string;
  labelKey: string;
  descriptionKey: string;
}

export interface AutoDirectorChannelDraft {
  baseUrl: string;
  dingtalk: {
    webhookUrl: string;
    callbackToken: string;
    operatorMapJson: string;
    eventTypes: string[];
  };
  wecom: {
    webhookUrl: string;
    callbackToken: string;
    operatorMapJson: string;
    eventTypes: string[];
  };
}

export const AUTO_DIRECTOR_EVENT_OPTIONS: AutoDirectorEventOption[] = [
  {
    code: "auto_director.approval_required",
    labelKey: "settings.autoDirectorEvents.approvalRequired.label",
    descriptionKey: "settings.autoDirectorEvents.approvalRequired.description",
  },
  {
    code: "auto_director.auto_approved",
    labelKey: "settings.autoDirectorEvents.autoApproved.label",
    descriptionKey: "settings.autoDirectorEvents.autoApproved.description",
  },
  {
    code: "auto_director.exception",
    labelKey: "settings.autoDirectorEvents.exception.label",
    descriptionKey: "settings.autoDirectorEvents.exception.description",
  },
  {
    code: "auto_director.recovered",
    labelKey: "settings.autoDirectorEvents.recovered.label",
    descriptionKey: "settings.autoDirectorEvents.recovered.description",
  },
  {
    code: "auto_director.completed",
    labelKey: "settings.autoDirectorEvents.completed.label",
    descriptionKey: "settings.autoDirectorEvents.completed.description",
  },
  {
    code: "auto_director.progress_changed",
    labelKey: "settings.autoDirectorEvents.progressChanged.label",
    descriptionKey: "settings.autoDirectorEvents.progressChanged.description",
  },
];

const AUTO_DIRECTOR_EVENT_LABEL_KEY_MAP = new Map(
  AUTO_DIRECTOR_EVENT_OPTIONS.map((item) => [item.code, item.labelKey]),
);

export function buildAutoDirectorChannelDraft(
  settings?: AutoDirectorChannelSettings | null,
): AutoDirectorChannelDraft {
  return settings ? {
    baseUrl: settings.baseUrl,
    dingtalk: {
      webhookUrl: settings.dingtalk.webhookUrl,
      callbackToken: settings.dingtalk.callbackToken,
      operatorMapJson: settings.dingtalk.operatorMapJson,
      eventTypes: settings.dingtalk.eventTypes,
    },
    wecom: {
      webhookUrl: settings.wecom.webhookUrl,
      callbackToken: settings.wecom.callbackToken,
      operatorMapJson: settings.wecom.operatorMapJson,
      eventTypes: settings.wecom.eventTypes,
    },
  } : {
    baseUrl: "",
    dingtalk: {
      webhookUrl: "",
      callbackToken: "",
      operatorMapJson: "",
      eventTypes: [],
    },
    wecom: {
      webhookUrl: "",
      callbackToken: "",
      operatorMapJson: "",
      eventTypes: [],
    },
  };
}

export function summarizeSelectedAutoDirectorEvents(
  codes: string[],
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  const labels = codes
    .map((code) => {
      const key = AUTO_DIRECTOR_EVENT_LABEL_KEY_MAP.get(code);
      return key ? t(key) : null;
    })
    .filter((label): label is string => Boolean(label));
  const separator = t("settings.autoDirectorChannel.joinSeparator");
  if (labels.length === 0) {
    return t("settings.autoDirectorChannel.noSubscribedEvents");
  }
  if (labels.length <= 2) {
    return labels.join(separator);
  }
  return t("settings.autoDirectorChannel.selectedSummary", {
    summary: labels.slice(0, 2).join(separator),
    count: labels.length,
  });
}
