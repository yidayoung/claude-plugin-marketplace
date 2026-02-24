# Publish Cleanup & i18n Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the extension Marketplace-ready with Git URL normalization, English + Chinese (extension + webview), README locale support, and publish checklist.

**Architecture:** Add shared URL normalization; use package.nls for extension strings and a simple JSON-based l10n for webview; README loading by locale; .vscodeignore and metadata cleanup.

**Tech Stack:** TypeScript, React, VS Code Extension API, package.nls / vscode.l10n

**Design reference:** [2026-02-24-publish-i18n-design.md](2026-02-24-publish-i18n-design.md)

---

## Phase 1: Git URL normalization

### Task 1: Add normalizeRepoUrlForBrowser and use it

**Files:**
- Create or Modify: `src/shared/utils/urlUtils.ts`
- Modify: `webview/src/details/DetailHeader.tsx`
- Modify: `src/pluginMarketplace/webview/services/PluginDetailsService.ts`

**Step 1: Create urlUtils.ts with normalization**

Create `src/shared/utils/urlUtils.ts`:

```typescript
/**
 * Normalize repo URL for opening in browser (HTTPS, no .git suffix).
 * Handles git@host:owner/repo and https URLs.
 */
export function normalizeRepoUrlForBrowser(url: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // SSH: git@github.com:owner/repo.git -> https://github.com/owner/repo
  const sshMatch = trimmed.match(/^git@([^:]+):(.+?)(\.git)?$/);
  if (sshMatch) {
    const host = sshMatch[1];
    const path = sshMatch[2].replace(/\.git$/, '');
    return `https://${host}/${path}`;
  }

  // HTTPS/HTTP: remove .git suffix
  if (trimmed.endsWith('.git')) {
    return trimmed.slice(0, -4);
  }
  return trimmed;
}
```

**Step 2: Add unit test for normalizeRepoUrlForBrowser**

Create or add in `src/shared/utils/__tests__/urlUtils.test.ts` (or add to existing test file):

- Test: `git@github.com:owner/repo.git` -> `https://github.com/owner/repo`
- Test: `https://github.com/owner/repo.git` -> `https://github.com/owner/repo`
- Test: `https://github.com/owner/repo` -> unchanged
- Test: empty string -> `''`

Run: `npm test -- urlUtils` (or the test file name). Expect: PASS after implementation.

**Step 3: Use in DetailHeader**

In `webview/src/details/DetailHeader.tsx`, in `getMarketplaceUrl(plugin)`:
- Before returning any URL, pass it through a normalizer. The webview cannot import Node modules; normalization must happen in extension or the URL must be normalized when sent from extension.
- **Therefore:** Normalize in extension when building `pluginDetail` (PluginDetailsService / DataStore) so `plugin.repository.url` and marketplace source URL are already normalized. In DetailHeader only use the URL as-is.
- So: apply normalization in PluginDetailsService when setting `repository.url` and when building marketplace source URL for display. Add a helper in extension side that uses urlUtils.

**Step 4: Apply in PluginDetailsService**

In `src/pluginMarketplace/webview/services/PluginDetailsService.ts`:
- Import `normalizeRepoUrlForBrowser` from `@shared/utils/urlUtils` (or relative path per project alias).
- Wherever `repository.url` is set (e.g. from parseRepository or from source), set it to `normalizeRepoUrlForBrowser(repository.url)`.
- Wherever marketplace URL is built for display (e.g. github `https://github.com/${repo}`), pass through `normalizeRepoUrlForBrowser` if it might contain .git or SSH (extension builds these, so normalization here is sufficient).

**Step 5: Commit**

```bash
git add src/shared/utils/urlUtils.ts src/shared/utils/__tests__/urlUtils.test.ts src/pluginMarketplace/webview/services/PluginDetailsService.ts
git commit -m "chore: normalize Git URLs for browser (SSH to HTTPS, strip .git)"
```

---

## Phase 2: Extension i18n (package.nls)

### Task 2: Add package.nls.json and package.nls.zh-cn.json

**Files:**
- Create: `package.nls.json`
- Create: `package.nls.zh-cn.json`
- Modify: `package.json`

**Step 1: Create package.nls.json (English)**

Create `package.nls.json` with keys used in package.json. Example structure:

```json
{
  "extension.description": "Claude Code Plugin Marketplace: browse, install, and manage Claude Code skill plugins",
  "view.sidebar.name": "Plugin Market",
  "view.containers.title": "Plugin Market",
  "command.refresh.title": "Refresh plugin list",
  "command.addMarketplace.title": "Add marketplace",
  "command.removeMarketplace.title": "Remove marketplace",
  "command.refreshMarketplace.title": "Refresh marketplace",
  "command.installPlugin.title": "Install plugin",
  "command.uninstallPlugin.title": "Uninstall plugin",
  "command.updatePlugin.title": "Update plugin",
  "command.showPluginDetails.title": "Show plugin details",
  "command.enablePlugin.title": "Enable plugin",
  "command.disablePlugin.title": "Disable plugin"
}
```

**Step 2: Create package.nls.zh-cn.json (Chinese)**

Create `package.nls.zh-cn.json` with same keys, Chinese values (current strings from package.json).

**Step 3: Update package.json to use placeholders**

In `package.json`:
- `"description": "%extension.description%"`
- `contributes.viewsContainers.activitybar[0].title` -> `"%view.containers.title%"`
- `contributes.views.claude-marketplace-sidebar[0].name` -> `"%view.sidebar.name%"`
- Each command's `title` -> `"%command.<id>.title%"` (map each command id to a key)

Use exact key names that match the nls files. VS Code resolves these from package.nls.json or package.nls.zh-cn.json by locale.

**Step 4: Commit**

```bash
git add package.nls.json package.nls.zh-cn.json package.json
git commit -m "feat(i18n): add extension strings (en + zh-cn) via package.nls"
```

### Task 3: Use l10n in extension.ts and other extension code

**Files:**
- Modify: `src/extension.ts`
- Check: Any other src/*.ts that show messages (handlers, PluginDetailsPanel.ts, etc.)

**Step 1: Use vscode.l10n.t in extension**

In `src/extension.ts`, replace hardcoded Chinese in:
- `showWarningMessage` / `showInformationMessage` / `showErrorMessage` / `showInputBox` (prompt, placeHolder, etc.)

VS Code 1.80+ supports `vscode.l10n.t('key')` for extension. Ensure keys exist in `l10n/bundle.l10n.json` (and `l10n/bundle.l10n.zh-cn.json`) if using bundle, or use the same keys as in package.nls and load via `require('../package.nls.json')` per locale (vscode-nls). Prefer **vscode.l10n**: create `l10n/bundle.l10n.json` and `l10n/bundle.l10n.zh-cn.json` with keys like `cli.notInstalled`, `cli.download`, `marketplace.addSourcePrompt`, `marketplace.addSuccess`, `marketplace.addFailure`, etc.

**Step 2: Add l10n files for extension runtime strings**

Create `l10n/bundle.l10n.json` (English) and `l10n/bundle.l10n.zh-cn.json` (Chinese) with all strings used in extension.ts and in message handlers (PluginDetailsPanel, handlers.ts). Reference: current Chinese text in those files.

**Step 3: Replace every user-facing string in extension code**

Replace each string with `vscode.l10n.t('key')`. Run extension (F5), test with English and Chinese display language, then commit.

**Step 4: Commit**

```bash
git add l10n/bundle.l10n.json l10n/bundle.l10n.zh-cn.json src/extension.ts src/pluginMarketplace/webview/PluginDetailsPanel.ts src/pluginMarketplace/webview/messages/handlers.ts
git commit -m "feat(i18n): use vscode.l10n for extension runtime strings"
```

---

## Phase 3: Webview i18n

### Task 4: Add webview locale and l10n bundle

**Files:**
- Create: `webview/src/l10n/en.json`
- Create: `webview/src/l10n/zh-cn.json`
- Create: `webview/src/l10n/index.ts`
- Modify: `src/pluginMarketplace/webview/SidebarWebviewView.ts`
- Modify: `src/pluginMarketplace/webview/PluginDetailsPanel.ts`

**Step 1: Create en.json and zh-cn.json**

Extract all user-visible strings from:
- `webview/src/sidebar/SidebarApp.tsx`
- `webview/src/details/DetailsApp.tsx`
- `webview/src/details/DetailHeader.tsx`
- `webview/src/details/DetailContent.tsx`
- `webview/src/details/ComponentsSection.tsx`
- `webview/src/details/ReadmeSection.tsx`
- `webview/src/components/PluginSection.tsx`
- `webview/src/components/PluginItem.tsx`

Use flat or nested keys, e.g. `sidebar.loading`, `sidebar.refresh`, `detail.header.uninstallConfirm`, `detail.loading`, etc. Fill `en.json` with English and `zh-cn.json` with current Chinese.

**Step 2: Create l10n/index.ts**

```typescript
// webview/src/l10n/index.ts
import en from './en.json';
import zhCn from './zh-cn.json';

const messages: Record<string, Record<string, string>> = {
  en,
  'zh-cn': zhCn,
};

export function getMessages(locale: string): Record<string, string> {
  const lang = locale.startsWith('zh') ? 'zh-cn' : 'en';
  return messages[lang] ?? en;
}
```

(Adjust to match actual JSON shape — if nested, flatten or use getMessages returning nested object and t(key) that supports 'detail.header.title'.)

**Step 3: Pass locale into sidebar webview**

In `SidebarWebviewView.ts`, when generating HTML or initial state, include `locale: vscode.env.language`. E.g. in the script that bootstraps the app, set `window.__LOCALE__ = '...'` or pass via postMessage after webview ready.

**Step 4: Pass locale into details panel webview**

In `PluginDetailsPanel.ts`, when creating the webview HTML or initial state (e.g. query params or inline script), pass `vscode.env.language` as `locale`.

**Step 5: Commit**

```bash
git add webview/src/l10n/en.json webview/src/l10n/zh-cn.json webview/src/l10n/index.ts src/pluginMarketplace/webview/SidebarWebviewView.ts src/pluginMarketplace/webview/PluginDetailsPanel.ts
git commit -m "feat(i18n): add webview l10n bundle and pass locale from extension"
```

### Task 5: Replace hardcoded strings in webview components

**Files:**
- Modify: `webview/src/sidebar/SidebarApp.tsx`
- Modify: `webview/src/details/DetailsApp.tsx`
- Modify: `webview/src/details/DetailHeader.tsx`
- Modify: `webview/src/details/DetailContent.tsx`
- Modify: `webview/src/details/ComponentsSection.tsx`
- Modify: `webview/src/details/ReadmeSection.tsx`
- Modify: `webview/src/components/PluginSection.tsx`
- Modify: `webview/src/components/PluginItem.tsx`

**Step 1: Add locale and t to sidebar**

In SidebarApp, get locale from window (set by SidebarWebviewView) and `const messages = getMessages(locale)`. Add helper `function t(key: string): string { return messages[key] ?? key; }` (or support nested keys). Pass `t` down or use React Context.

**Step 2: Replace every hardcoded string in SidebarApp**

Replace "加载中...", "刷新", "添加市场", "已安装", "启用", "搜索插件...", "没有找到匹配的插件", "暂无插件", "已安装", "更多操作", "可更新" with t('sidebar.loading'), t('sidebar.refresh'), etc.

**Step 3: Add locale and t to details app**

DetailsApp gets locale from initial state (from PluginDetailsPanel). Create same t helper and context if needed. Replace all strings in DetailHeader, DetailContent, ComponentsSection, ReadmeSection.

**Step 4: Replace strings in PluginSection and PluginItem**

Same pattern: use t('...') for "刷新市场", "删除市场", "安装", "重新安装", "启用", "禁用", "更新", "卸载", "操作".

**Step 5: Build and test**

Run `npm run build-webview`. Launch extension (F5), switch VS Code language to English and 中文, verify sidebar and details show correct language.

**Step 6: Commit**

```bash
git add webview/src/sidebar/SidebarApp.tsx webview/src/details/DetailsApp.tsx webview/src/details/DetailHeader.tsx webview/src/details/DetailContent.tsx webview/src/details/ComponentsSection.tsx webview/src/details/ReadmeSection.tsx webview/src/components/PluginSection.tsx webview/src/components/PluginItem.tsx
git commit -m "feat(i18n): replace webview hardcoded strings with l10n"
```

---

## Phase 4: README multi-language

### Task 6: readReadme(pluginPath, locale) and call chain

**Files:**
- Modify: `src/pluginMarketplace/webview/services/PluginDetailsService.ts`
- Modify: `src/pluginMarketplace/data/PluginDataStore.ts`
- Modify: `src/pluginMarketplace/webview/PluginDetailsPanel.ts`
- Modify: `src/pluginMarketplace/webview/messages/types.ts` (if request payload gains locale)

**Step 1: Extend readReadme with locale**

In `PluginDetailsService.ts`, change `readReadme(pluginPath: string)` to `readReadme(pluginPath: string, locale?: string)`. Logic:
- If locale is 'zh-cn' (or startsWith 'zh'), try in order: README.zh-CN.md, readme.zh-CN.md, README.md, readme.md, Readme.md in each base (pluginPath, pluginPath + '/.claude-plugin').
- Else try: README.md, readme.md, Readme.md.
- Return first found content.

**Step 2: getPluginDetail to accept and pass locale**

In `PluginDetailsService.getPluginDetail`, add optional `locale?: string`. When calling `readReadme`, pass locale. In `getInstalledPluginDetail` and `getRemotePluginDetail`, call readReadme with that locale.

**Step 3: PluginDataStore.getPluginDetail**

Add optional `locale?: string` to getPluginDetail. Pass it to detailsService.getPluginDetail (or whatever method returns detail). If PluginDataStore doesn't call PluginDetailsService directly, trace the call chain and add locale through it.

**Step 4: PluginDetailsPanel and webview request**

When loading detail, pass current locale (from webview initial state or from vscode.env.language in panel). If the panel gets locale when creating webview, include it in the message when requesting plugin detail. Ensure handlers.ts (or the code that calls getPluginDetail) receives locale and passes to dataStore.getPluginDetail(..., locale).

**Step 5: Tests**

Run existing tests. If any test calls readReadme, update to pass locale or leave optional. Add a simple test: readReadme with locale 'zh-cn' prefers README.zh-CN.md when present.

**Step 6: Commit**

```bash
git add src/pluginMarketplace/webview/services/PluginDetailsService.ts src/pluginMarketplace/data/PluginDataStore.ts src/pluginMarketplace/webview/PluginDetailsPanel.ts
git commit -m "feat(i18n): README by locale (README.zh-CN.md + fallback README.md)"
```

---

## Phase 5: Publish checklist

### Task 7: .vscodeignore and metadata

**Files:**
- Modify: `.vscodeignore`
- Modify: `package.json` (description already via nls; ensure categories, keywords)
- Create: `CHANGELOG.md` (if missing)

**Step 1: .vscodeignore**

Ensure entries exclude: node_modules, **/__tests__/** , **/*.test.ts, webview/node_modules, src/** (if only out/ is needed), docs (optional), *.map, .git. Keep: out/, webview/dist/, package.nls.json, package.nls.zh-cn.json, l10n/, resources/.

**Step 2: package.json metadata**

Verify categories (e.g. "Other"), keywords (claude, plugin, marketplace, skills). Description is already from package.nls. Ensure repository.url is correct.

**Step 3: CHANGELOG.md**

Create or update CHANGELOG.md with at least one version (e.g. 0.1.0) and list: i18n (en/zh-cn), Git URL normalization, README locale support.

**Step 4: Commit**

```bash
git add .vscodeignore package.json CHANGELOG.md
git commit -m "chore: publish checklist (.vscodeignore, metadata, CHANGELOG)"
```

---

## Verification

- Switch VS Code Display Language to English and 中文 (简体), reload; check extension name, commands, sidebar, detail panel, and dialogs.
- Open a plugin that has repository URL; click "Open repo" / "Open marketplace"; URL should be HTTPS and without .git.
- For a plugin with README.zh-CN.md, set UI to 中文 and open detail; should show README.zh-CN.md content; set to English and should show README.md.
- Run `npm test` and fix any failures.
- Package with `vsce package` and inspect .vsix size and contents.

---

## Execution options

**Plan saved to `docs/plans/2026-02-24-publish-i18n-implementation.md`.**

1. **Subagent-driven (this session)** — I run tasks one by one with a subagent, review between tasks.
2. **Parallel session (separate)** — You open a new session in the same repo (or worktree), use @executing-plans skill, and run the plan there with checkpoints.

Which approach do you want?
