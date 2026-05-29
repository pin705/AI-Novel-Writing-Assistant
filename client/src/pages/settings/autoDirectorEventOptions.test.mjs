import test from "node:test";
import assert from "node:assert/strict";
import {
  AUTO_DIRECTOR_EVENT_OPTIONS,
  buildAutoDirectorChannelDraft,
  summarizeSelectedAutoDirectorEvents,
} from "./autoDirectorEventOptions.ts";

// Identity translator returns the key unchanged so we can assert on i18n keys
// instead of locale-specific strings.
const identityT = (key, vars) => {
  if (!vars) return key;
  return Object.keys(vars).reduce(
    (acc, name) => acc.replace(new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`, "g"), String(vars[name])),
    key,
  );
};

test("auto director event options expose translation keys and preserve event codes in drafts", () => {
  assert.equal(AUTO_DIRECTOR_EVENT_OPTIONS[0]?.code, "auto_director.approval_required");
  assert.equal(
    AUTO_DIRECTOR_EVENT_OPTIONS[0]?.labelKey,
    "settings.autoDirectorEvents.approvalRequired.label",
  );
  assert.equal(AUTO_DIRECTOR_EVENT_OPTIONS[1]?.code, "auto_director.auto_approved");
  assert.equal(
    AUTO_DIRECTOR_EVENT_OPTIONS[1]?.labelKey,
    "settings.autoDirectorEvents.autoApproved.label",
  );

  const draft = buildAutoDirectorChannelDraft({
    baseUrl: "https://book.example.com",
    dingtalk: {
      webhookUrl: "https://relay.example.test/dingtalk",
      callbackToken: "ding-token",
      operatorMapJson: "{\"ding_user_1\":\"user_1\"}",
      eventTypes: ["auto_director.approval_required", "auto_director.exception"],
    },
    wecom: {
      webhookUrl: "https://relay.example.test/wecom",
      callbackToken: "wecom-token",
      operatorMapJson: "{\"wecom_user_1\":\"user_1\"}",
      eventTypes: ["auto_director.completed"],
    },
  });

  assert.deepEqual(draft.dingtalk.eventTypes, [
    "auto_director.approval_required",
    "auto_director.exception",
  ]);
  assert.deepEqual(draft.wecom.eventTypes, ["auto_director.completed"]);
});

test("auto director event summary resolves event codes to label keys via the translator", () => {
  assert.equal(
    summarizeSelectedAutoDirectorEvents([], identityT),
    "settings.autoDirectorChannel.noSubscribedEvents",
  );
  assert.equal(
    summarizeSelectedAutoDirectorEvents(["auto_director.approval_required"], identityT),
    "settings.autoDirectorEvents.approvalRequired.label",
  );
  assert.equal(
    summarizeSelectedAutoDirectorEvents(
      [
        "auto_director.approval_required",
        "auto_director.exception",
        "auto_director.completed",
      ],
      identityT,
    ),
    // Selected summary key with vars interpolated by our identity translator.
    "settings.autoDirectorChannel.selectedSummary",
  );
});
