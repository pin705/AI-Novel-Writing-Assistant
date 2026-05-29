import test from "node:test";
import assert from "node:assert/strict";
import {
  MOBILE_ROUTE_PATTERNS,
  getMobileNavGroupForPath,
  getMobilePageTitle,
  getMobilePrimaryNavItems,
  getMobileMoreNavGroups,
  getMobileRouteClassName,
} from "../src/components/layout/mobile/mobileSiteNavigation.ts";

const routedPaths = [
  "/",
  "/help",
  "/novels",
  "/novels/create",
  "/novels/demo/preview",
  "/novels/demo/edit",
  "/novels/demo/chapters/chapter-1",
  "/creative-hub",
  "/chat-legacy",
  "/book-analysis",
  "/tasks",
  "/auto-director/follow-ups",
  "/knowledge",
  "/genres",
  "/story-modes",
  "/titles",
  "/prompt-workbench",
  "/settings/model-routes",
  "/settings",
  "/worlds",
  "/worlds/generator",
  "/worlds/world-1/workspace",
  "/style-engine",
  "/anti-ai-rules",
  "/base-characters",
];

// Identity translator: returns the key unchanged so we can assert on the key
// rather than locale-specific strings.
const identityT = (key) => key;

test("mobile route metadata covers every registered page", () => {
  assert.equal(MOBILE_ROUTE_PATTERNS.length, routedPaths.length);

  for (const path of routedPaths) {
    assert.notEqual(
      getMobilePageTitle(path, identityT),
      "components.layout.mobileSiteShell.fallbackTitle",
    );
    assert.match(getMobileNavGroupForPath(path), /^(home|novels|creation|tasks|more)$/);
    assert.match(getMobileRouteClassName(path), /^mobile-route-[a-z0-9-]+$/);
  }
});

test("mobile primary nav keeps core beginner actions visible", () => {
  assert.deepEqual(
    getMobilePrimaryNavItems().map((item) => [item.key, item.to, item.labelKey]),
    [
      ["home", "/", "components.layout.mobileSiteShell.primary.home"],
      ["novels", "/novels", "components.layout.mobileSiteShell.primary.novels"],
      ["creation", "/creative-hub", "components.layout.mobileSiteShell.primary.creation"],
      ["tasks", "/tasks", "components.layout.mobileSiteShell.primary.tasks"],
      ["more", "", "components.layout.mobileSiteShell.primary.more"],
    ],
  );
});

test("mobile more menu contains all non-primary registered pages", () => {
  const morePaths = getMobileMoreNavGroups().flatMap((group) => group.items.map((item) => item.to));

  assert.deepEqual(
    morePaths,
    [
      "/help",
      "/book-analysis",
      "/auto-director/follow-ups",
      "/chat-legacy",
      "/knowledge",
      "/genres",
      "/story-modes",
      "/titles",
      "/style-engine",
      "/anti-ai-rules",
      "/base-characters",
      "/worlds",
      "/worlds/generator",
      "/prompt-workbench",
      "/settings/model-routes",
      "/settings",
    ],
  );
});
