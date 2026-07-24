> Note: `README.md` is partially out of date. It lists Ant Design Vue / Element Plus / VXE Table and scripts
> like `yarn lint` / `yarn build:prod` that do **not** exist. Trust `package.json` and the source, not the README.
> The UI library is **TDesign Vue Next** (+ `@tdesign-vue-next/chat`).

## Commands

Package manager is **yarn**. Node ≥ 23.11.1.

```bash
yarn install
yarn dev          # vite dev server, --host, port 50188 (see vite.config.ts server.port)
yarn build        # vue-tsc --build --force && vite build  (type-check + build)
yarn build-only   # vite build without type-check
yarn type-check   # vue-tsc --build --force
yarn license      # regenerate third-party license manifest (scripts/license.ts)
yarn i18n:check   # find unused i18n keys (scripts/findUnusedI18n.ts)
yarn preview      # vite preview
```

There is **no lint/format/test script** in `package.json` despite README mentions. Prettier config exists
(`.prettierrc.json`); run `prettier` manually if needed. There is no test suite.

## Architecture

Frontend for **Toonflow**, an AI short-drama (短剧) creation workbench. Talks to a separate backend
(obtained from the `Toonflow-app` repo) over HTTP + WebSocket/Socket.IO. Built as a **single-file SPA**
(`vite-plugin-singlefile`, `inlineDynamicImports`, `assetsInlineLimit: Infinity`) — the production build is
one self-contained `dist/index.html` intended to be dropped into the backend's `scripts/web` static dir.

### Entry & setup (`src/main.ts`, `src/App.vue`)
- Pinia with `pinia-plugin-persistedstate` (stores persist to localStorage).
- vue-i18n mounted globally; translations accessed as `window.$t(...)` / `$t(...)` in templates.
- TDesign `LoadingPlugin` + `v-loading` directive registered globally.
- Custom `imageOptimizer` plugin registered on the app.

### Routing (`src/router/index.ts`)
- **Hash history** (`createWebHashHistory`) — important for the single-file/static deployment.
- Auth guard: every path except `/login` requires `localStorage.getItem("token")`, else redirect to `/login`.
- `/workbench` is the authenticated shell; its children are the real feature views under `src/views/`:
  `project`, `task`, `novel`, `script`, `scriptAgent`, `cornerScape` (storyboard), `production`, `assets`, `test`.

### State (`src/stores/`)
Pinia stores: `setting` (holds `baseUrl` + `otherSetting`, persisted — this is the source of API/WS endpoints,
**not** `.env` files), `user`, `project`, `video`, `scriptAgent`, `productionAgent`, `loadingStore`,
`imageListCache`. When adding API/WS configuration, read/change `settingStore`, not env vars.

### HTTP (`src/utils/axios.ts`)
- Singleton axios instance; `baseURL` and timeout come from `settingStore` at request time.
- `Authorization` header set from `localStorage["token"]`.
- Response interceptor unwraps `response.data`. On `401` it clears the token and redirects to `/login`.
- Network errors surface a TDesign `NotifyPlugin` with recovery instructions.

### Realtime (`src/utils/useSocket.ts`)
Socket.IO client used for task progress / generation streaming. Pair with `videoPolling.ts` for video task status.

### Feature domains (`src/views/`)
The short-drama pipeline roughly follows: `novel` (raw text / Word import via mammoth) → `script`/`scriptAgent`
(script editing, AI agent) → `cornerScape` (storyboard canvas, built on **VueFlow** `@vue-flow/*`) →
`production` (video config + generation) → `assets` (character/asset library). Monaco editor
(`monaco-editor-vue3`) and `md-editor-v3` are used for code/markdown editing; `@webav/av-*` for video composition.

### Styling
- SCSS (`modern-compiler`), global sheet at `src/assets/main.scss`.
- **`postcss-px-to-viewport`** converts `px` → `rem` against a **1600px** design width. Use `px` in styles
  matching the 1600-wide mockup; the `ignore` class name and values ≤ 1px are excluded from conversion.

### Auto-imports (no manual import needed)
`unplugin-auto-import` (Vue, Pinia, vue-router APIs) and `unplugin-vue-components` (TDesign components, resolved
via `TDesignResolver` for both `vue-next` and `chat` libraries). Type declarations are emitted to
`src/types/auto-imports.d.ts` and `src/types/components.d.ts` (the latter is also checked in at repo root as
`components.d.ts`) — these regenerate on dev/build; don't hand-edit.

### i18n (`src/locales/`)
7 locales under `src/locales/language/` (`zh-CN`, `zh-TW`, `en`, `ja_JP`, `ru_RU`, `th_TH`, `vi-VN`).
Run `yarn i18n:check` after adding/removing keys. Default UI language is Chinese.

## Conventions
- Path alias `@/` → `src/`.
- New TDesign components need no import (auto-resolved); non-TDesign components under `src/components/` are also auto-registered by `unplugin-vue-components`.
- Persisted Pinia stores write to localStorage — be careful what you put in `setting`/`user`, it survives reloads.
- Commits/messages in this repo are in Chinese; match that style for commit messages.
