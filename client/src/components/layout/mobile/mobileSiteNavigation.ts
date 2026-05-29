export type MobilePrimaryNavKey = "home" | "novels" | "creation" | "tasks" | "more";

export interface MobileNavItem {
  key: string;
  labelKey: string;
  to: string;
  group: MobilePrimaryNavKey;
}

export interface MobileNavGroup {
  titleKey: string;
  items: MobileNavItem[];
}

export interface MobileRoutePattern {
  key: string;
  pattern: RegExp;
  titleKey: string;
  group: MobilePrimaryNavKey;
}

type Translator = (key: string) => string;

export const MOBILE_ROUTE_PATTERNS: MobileRoutePattern[] = [
  { key: "home", pattern: /^\/$/, titleKey: "components.layout.mobileSiteShell.routes.home", group: "home" },
  { key: "help", pattern: /^\/help\/?$/, titleKey: "components.layout.mobileSiteShell.routes.help", group: "more" },
  { key: "novels", pattern: /^\/novels\/?$/, titleKey: "components.layout.mobileSiteShell.routes.novels", group: "novels" },
  { key: "novel-create", pattern: /^\/novels\/create\/?$/, titleKey: "components.layout.mobileSiteShell.routes.novelCreate", group: "novels" },
  { key: "novel-preview", pattern: /^\/novels\/[^/]+\/preview\/?$/, titleKey: "components.layout.mobileSiteShell.routes.novelPreview", group: "novels" },
  { key: "novel-edit", pattern: /^\/novels\/[^/]+\/edit\/?$/, titleKey: "components.layout.mobileSiteShell.routes.novelEdit", group: "novels" },
  { key: "chapter-edit", pattern: /^\/novels\/[^/]+\/chapters\/[^/]+\/?$/, titleKey: "components.layout.mobileSiteShell.routes.chapterEdit", group: "novels" },
  { key: "creative-hub", pattern: /^\/creative-hub\/?$/, titleKey: "components.layout.mobileSiteShell.routes.creativeHub", group: "creation" },
  { key: "chat-legacy", pattern: /^\/chat-legacy\/?$/, titleKey: "components.layout.mobileSiteShell.routes.chatLegacy", group: "creation" },
  { key: "book-analysis", pattern: /^\/book-analysis\/?$/, titleKey: "components.layout.mobileSiteShell.routes.bookAnalysis", group: "creation" },
  { key: "tasks", pattern: /^\/tasks\/?$/, titleKey: "components.layout.mobileSiteShell.routes.tasks", group: "tasks" },
  { key: "auto-director-follow-ups", pattern: /^\/auto-director\/follow-ups\/?$/, titleKey: "components.layout.mobileSiteShell.routes.autoDirectorFollowUps", group: "tasks" },
  { key: "knowledge", pattern: /^\/knowledge\/?$/, titleKey: "components.layout.mobileSiteShell.routes.knowledge", group: "more" },
  { key: "genres", pattern: /^\/genres\/?$/, titleKey: "components.layout.mobileSiteShell.routes.genres", group: "more" },
  { key: "story-modes", pattern: /^\/story-modes\/?$/, titleKey: "components.layout.mobileSiteShell.routes.storyModes", group: "more" },
  { key: "titles", pattern: /^\/titles\/?$/, titleKey: "components.layout.mobileSiteShell.routes.titles", group: "more" },
  { key: "prompt-workbench", pattern: /^\/prompt-workbench\/?$/, titleKey: "components.layout.mobileSiteShell.routes.promptWorkbench", group: "more" },
  { key: "model-routes", pattern: /^\/settings\/model-routes\/?$/, titleKey: "components.layout.mobileSiteShell.routes.modelRoutes", group: "more" },
  { key: "settings", pattern: /^\/settings\/?$/, titleKey: "components.layout.mobileSiteShell.routes.settings", group: "more" },
  { key: "worlds", pattern: /^\/worlds\/?$/, titleKey: "components.layout.mobileSiteShell.routes.worlds", group: "more" },
  { key: "world-generator", pattern: /^\/worlds\/generator\/?$/, titleKey: "components.layout.mobileSiteShell.routes.worldGenerator", group: "more" },
  { key: "world-workspace", pattern: /^\/worlds\/[^/]+\/workspace\/?$/, titleKey: "components.layout.mobileSiteShell.routes.worldWorkspace", group: "more" },
  { key: "style-engine", pattern: /^\/style-engine\/?$/, titleKey: "components.layout.mobileSiteShell.routes.styleEngine", group: "more" },
  { key: "anti-ai-rules", pattern: /^\/anti-ai-rules\/?$/, titleKey: "components.layout.mobileSiteShell.routes.antiAiRules", group: "more" },
  { key: "base-characters", pattern: /^\/base-characters\/?$/, titleKey: "components.layout.mobileSiteShell.routes.baseCharacters", group: "more" },
];

const primaryNavItems: MobileNavItem[] = [
  { key: "home", labelKey: "components.layout.mobileSiteShell.primary.home", to: "/", group: "home" },
  { key: "novels", labelKey: "components.layout.mobileSiteShell.primary.novels", to: "/novels", group: "novels" },
  { key: "creation", labelKey: "components.layout.mobileSiteShell.primary.creation", to: "/creative-hub", group: "creation" },
  { key: "tasks", labelKey: "components.layout.mobileSiteShell.primary.tasks", to: "/tasks", group: "tasks" },
  { key: "more", labelKey: "components.layout.mobileSiteShell.primary.more", to: "", group: "more" },
];

const moreNavGroups: MobileNavGroup[] = [
  {
    titleKey: "components.layout.mobileSiteShell.moreGroups.creationAid",
    items: [
      { key: "help", labelKey: "components.layout.mobileSiteShell.routes.help", to: "/help", group: "more" },
      { key: "book-analysis", labelKey: "components.layout.mobileSiteShell.routes.bookAnalysis", to: "/book-analysis", group: "creation" },
      { key: "auto-director-follow-ups", labelKey: "components.layout.mobileSiteShell.routes.autoDirectorFollowUps", to: "/auto-director/follow-ups", group: "tasks" },
      { key: "chat-legacy", labelKey: "components.layout.mobileSiteShell.routes.chatLegacy", to: "/chat-legacy", group: "creation" },
    ],
  },
  {
    titleKey: "components.layout.mobileSiteShell.moreGroups.assets",
    items: [
      { key: "knowledge", labelKey: "components.layout.mobileSiteShell.routes.knowledge", to: "/knowledge", group: "more" },
      { key: "genres", labelKey: "components.layout.mobileSiteShell.routes.genres", to: "/genres", group: "more" },
      { key: "story-modes", labelKey: "components.layout.mobileSiteShell.routes.storyModes", to: "/story-modes", group: "more" },
      { key: "titles", labelKey: "components.layout.mobileSiteShell.routes.titles", to: "/titles", group: "more" },
      { key: "style-engine", labelKey: "components.layout.mobileSiteShell.routes.styleEngine", to: "/style-engine", group: "more" },
      { key: "anti-ai-rules", labelKey: "components.layout.mobileSiteShell.routes.antiAiRules", to: "/anti-ai-rules", group: "more" },
      { key: "base-characters", labelKey: "components.layout.mobileSiteShell.routes.baseCharacters", to: "/base-characters", group: "more" },
    ],
  },
  {
    titleKey: "components.layout.mobileSiteShell.moreGroups.worldsAndSystem",
    items: [
      { key: "worlds", labelKey: "components.layout.mobileSiteShell.routes.worlds", to: "/worlds", group: "more" },
      { key: "world-generator", labelKey: "components.layout.mobileSiteShell.routes.worldGenerator", to: "/worlds/generator", group: "more" },
      { key: "prompt-workbench", labelKey: "components.layout.mobileSiteShell.routes.promptWorkbench", to: "/prompt-workbench", group: "more" },
      { key: "model-routes", labelKey: "components.layout.mobileSiteShell.routes.modelRoutes", to: "/settings/model-routes", group: "more" },
      { key: "settings", labelKey: "components.layout.mobileSiteShell.routes.settings", to: "/settings", group: "more" },
    ],
  },
];

export function getMobilePrimaryNavItems(): MobileNavItem[] {
  return primaryNavItems;
}

export function getMobileMoreNavGroups(): MobileNavGroup[] {
  return moreNavGroups;
}

export function getMobileRoutePattern(pathname: string): MobileRoutePattern | undefined {
  return MOBILE_ROUTE_PATTERNS.find((route) => route.pattern.test(pathname));
}

export function getMobilePageTitle(pathname: string, t: Translator): string {
  const route = getMobileRoutePattern(pathname);
  if (route) {
    return t(route.titleKey);
  }
  return t("components.layout.mobileSiteShell.fallbackTitle");
}

export function getMobileNavGroupForPath(pathname: string): MobilePrimaryNavKey {
  return getMobileRoutePattern(pathname)?.group ?? "more";
}

export function getMobileRouteClassName(pathname: string): string {
  return `mobile-route-${getMobileRoutePattern(pathname)?.key ?? "more"}`;
}
