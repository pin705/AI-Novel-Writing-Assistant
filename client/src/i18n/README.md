# Client i18n

Lightweight internationalization for the AI Novel Writing Assistant web client.
Zero runtime dependencies — translations live in JSON, the provider is a thin
React context, locale persistence uses `localStorage`, and the desktop main
process gets synced over IPC.

## Layout

```
client/src/i18n/
├── config.ts            # Supported locales, defaults, detection, storage key
├── translate.ts         # Pure helpers: dot-path lookup + {{var}} interpolation
├── I18nProvider.tsx     # React provider, hook, fallback chain, <html lang>, desktop IPC
├── LanguageSwitcher.tsx # UI control bound to the provider
├── index.ts             # Public barrel
└── locales/
    ├── zh-CN/           # Simplified Chinese — primary source language
    │   ├── app.json
    │   ├── common.json
    │   ├── navbar.json
    │   ├── sidebar.json
    │   ├── home.json
    │   ├── languageSwitcher.json
    │   ├── tasks.json
    │   ├── autoDirectorFollowUps.json
    │   ├── chat.json
    │   ├── settings.json
    │   ├── promptWorkbench.json
    │   ├── antiAiRules.json
    │   ├── creativeHub.json
    │   ├── bookAnalysis.json
    │   ├── help.json
    │   ├── genres.json
    │   ├── storyModes.json
    │   ├── titles.json
    │   ├── worlds.json
    │   ├── characters.json
    │   ├── knowledge.json
    │   ├── writingFormula.json
    │   ├── novels.json
    │   ├── components.json
    │   └── lib.json
    ├── vi-VN/           # Vietnamese — same shape
    └── en-US/           # English   — same shape
```

There is also a parallel mini-i18n for the Electron main process at
`desktop/src/i18n/` with its own `zh-CN.json` / `vi-VN.json` / `en-US.json`.
The renderer's locale switch is mirrored to the main process via IPC so the
splash screen and native dialogs render in the right language too.

## Currently supported locales

| Code     | Native label | HTML `lang` |
| -------- | ------------ | ----------- |
| `zh-CN`  | 简体中文     | `zh-CN`     |
| `vi-VN`  | Tiếng Việt   | `vi`        |
| `en-US`  | English      | `en`        |

The fallback chain is **active locale → `zh-CN`**. If a key is missing in both,
the key itself is returned (which makes missing translations visible in dev).

## Namespace conventions

One JSON file per namespace, per locale. Namespaces map roughly to feature
areas / page directories:

- `app`, `common`, `navbar`, `sidebar`, `languageSwitcher` — global shells
- `home` — landing page
- `tasks`, `autoDirectorFollowUps`, `chat` — task management
- `settings`, `promptWorkbench`, `antiAiRules` — system controls
- `creativeHub`, `bookAnalysis`, `help` — top-level tools
- `genres`, `storyModes`, `titles`, `worlds`, `characters`, `knowledge` — asset libs
- `writingFormula` — style engine
- `novels` — the novel editor + everything under `pages/novels/`
- `components` — shared components (layout, common, mobile, autoDirector, etc.)
- `lib` — strings from `client/src/lib/*` utilities

Vite auto-discovers via `import.meta.glob("./locales/*/*.json", { eager: true })`,
so **just dropping a JSON file is enough** — no provider edit required.

## Using translations in components

```tsx
import { useTranslation } from "@/i18n";

export function Example() {
  const { t } = useTranslation();
  return (
    <>
      <h1>{t("home.recent.title")}</h1>
      <p>{t("home.continueRecent.progress", { percent: 42 })}</p>
    </>
  );
}
```

- Keys are dot-paths into the locale JSON: `"home.recent.title"`.
- Variables use double braces: `"Progress {{percent}}%"`.
- Don't concatenate translated fragments — make one key per sentence so word
  order can change per language.

## Switching the language

The `<LanguageSwitcher />` lives in the top navbar. Programmatically:

```tsx
const { setLocale, locale, availableLocales } = useTranslation();
setLocale("vi-VN");
```

`setLocale` persists to `localStorage["ai-novel.locale"]`, updates
`<html lang>`, and (when running inside Electron) sends the new locale over
the IPC bridge (`window.electron.setLocale`) so the main process writes its
own `desktop-locale.json` for the next launch.

On first paint, the inline boot script in `index.html` reads the same
localStorage key so the pre-React loading screen renders in the right
language too.

## Patterns the codebase relies on

These patterns are used heavily; follow them when adding more migrations.

### 1. Top-level helpers that need `t`

Helpers defined at module scope can't call `useTranslation()`. Either:

- Move them inside the component (preferred for short helpers — see
  [Home.tsx](../pages/Home.tsx) `formatDate` and `getNovelLeadSummary`).
- Or accept a `t` parameter — see
  [`taskCenterUtils.ts`](../pages/tasks/taskCenterUtils.ts),
  [`directorTaskNotice.ts`](../lib/directorTaskNotice.ts), and
  [`novelWorkflowTaskUi.ts`](../lib/novelWorkflowTaskUi.ts). Callers pass
  `t` from `useTranslation()`.

### 2. Arrays of options with labels

When you have `[{ to, label, icon }, …]` config arrays, replace `label` with
`labelKey` and translate at render time — see
[Sidebar.tsx](../components/layout/Sidebar.tsx) and
[mobileSiteNavigation.ts](../components/layout/mobile/mobileSiteNavigation.ts).

### 3. Identity translator in tests

Helpers that take `t` are easiest to test with an identity translator that
returns the key (with `{{var}}` substitution if you need to assert on
interpolated output). See
[`mobileSiteNavigation.test.js`](../../tests/mobileSiteNavigation.test.js) and
[`autoDirectorEventOptions.test.mjs`](../pages/settings/autoDirectorEventOptions.test.mjs).

## Adding keys

1. Add the key to **`locales/zh-CN/<namespace>.json`** (source of truth).
2. Mirror the key into the matching `vi-VN/<namespace>.json` and
   `en-US/<namespace>.json`. Missing keys fall back to `zh-CN`, but you should
   still translate them.
3. Reference the key via `t("namespace.key.path")`.

Conventions:

- Group keys by visual section (`tasks.list.emptyState`, `tasks.filters.status`).
- Reuse `common.*` for shared labels (Draft, Published, Reload, …).
- Use `{{var}}` placeholders — never string-concatenate translated values.

## Adding a new language

1. Pick a BCP-47 code (e.g. `ja-JP`, `th-TH`, `fr-FR`).
2. Create the locale directory and clone the JSON files:
   ```
   mkdir client/src/i18n/locales/ja-JP
   cp client/src/i18n/locales/en-US/*.json client/src/i18n/locales/ja-JP/
   ```
3. Translate every value in every file. Every key in `zh-CN/*.json` must be
   present.
4. Register it in `config.ts`:
   ```ts
   export const SUPPORTED_LOCALES = ["zh-CN", "vi-VN", "en-US", "ja-JP"] as const;
   // …
   export const LOCALE_METADATA: Record<SupportedLocale, LocaleMeta> = {
     // …
     "ja-JP": { code: "ja-JP", label: "Japanese", nativeLabel: "日本語", htmlLang: "ja" },
   };
   ```
   The `<LanguageSwitcher />` picks it up automatically.
5. (Optional) Extend `detectInitialLocale()` in `config.ts` for browser
   language auto-detection.
6. (Optional) Add a matching entry to:
   - `STARTUP_COPY` in [`client/index.html`](../../index.html) so the pre-React
     splash renders in the new language.
   - `desktop/src/i18n/locales/<code>.json` so the Electron main process
     splash + native dialogs follow suit.

## Migration status

The infrastructure is in place; most user-facing surfaces are migrated. A
handful of large editor files (notably `NovelEdit.tsx`, parts of
`pages/novels/components/` subdirectories, and a few hooks) still contain
hardcoded Chinese literals — the `novels` namespace JSON skeleton is already
defined, so these can be wired up incrementally with the patterns above
without touching the locale files much further.

## Tests

Pure helpers in `translate.ts` are easy to unit test:

```ts
import { createTranslator } from "@/i18n/translate";

const t = createTranslator(
  { greet: "Xin chào {{name}}" },
  { greet: "Hello {{name}}", fallback: "Hi" },
);
t("greet", { name: "Linh" });   // → "Xin chào Linh"
t("fallback");                  // → "Hi"  (falls back)
t("missing");                   // → "missing"  (returns key)
```
