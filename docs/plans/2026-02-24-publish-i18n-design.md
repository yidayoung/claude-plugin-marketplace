# 发布清理与多语言设计

**日期:** 2026-02-24  
**状态:** 已批准  
**目标:** 上架 VS Code 官方 Marketplace，支持英文 + 中文双语

## 概述

在发布前完成四项改造与一项检查清单：

1. **Git 地址处理** — 展示与打开链接前统一规范化（SSH→HTTPS、去除 .git 等）
2. **扩展国际化** — package.nls（英文默认）+ package.nls.zh-cn，所有 contributes 与 extension 内文案
3. **Webview 国际化** — 侧边栏与详情页根据 VS Code 语言加载 en/zh-cn 文案表
4. **README 多语言** — 插件目录下 README.md（默认）+ README.zh-CN.md，按 UI 语言选择
5. **发布清单** — .vscodeignore、默认分支、description/categories/keywords、CHANGELOG 等

---

## 1. Git 地址处理

### 目标

- 所有「在浏览器打开」的链接使用可点击的 HTTPS URL。
- 展示用 URL 统一去除末尾 `.git`，避免重复或错误解析。

### 规范规则

| 输入形式 | 处理 |
|----------|------|
| `git@github.com:owner/repo.git` | 转为 `https://github.com/owner/repo` |
| `https://github.com/owner/repo.git` | 转为 `https://github.com/owner/repo` |
| `https://github.com/owner/repo` | 不变 |
| 其他 Git 主机（GitLab、自建等） | 若为 SSH，转为 HTTPS（已知格式）；否则 trim，不做强校验 |

### 实现要点

- **集中工具函数**：在 `src/shared/utils/parseUtils.ts` 或新建 `urlUtils.ts` 中提供 `normalizeRepoUrlForBrowser(url: string): string`，供 DetailHeader、PluginDetailsService、DataLoader 等调用。
- **SSH→HTTPS**：仅处理 `git@github.com:owner/repo` 与常见 `git@gitlab.com:...` 形式；其它 SSH 可保留或尝试通用转换（host + path）。
- **调用点**：`getMarketplaceUrl()`、`plugin.repository?.url` 在展示或传给 `openExternal` 前均经 `normalizeRepoUrlForBrowser()`。
- **默认分支**：若代码中仍有从 GitHub raw 拉取（如未来恢复远程 README），默认分支改为可配置或从 API 获取，避免写死 `main`；本次若未涉及 raw 请求可仅在文档/注释中说明。

### 涉及文件

- `src/shared/utils/parseUtils.ts` 或新建 `src/shared/utils/urlUtils.ts`
- `webview/src/details/DetailHeader.tsx`（getMarketplaceUrl / repository.url 使用规范化）
- `src/pluginMarketplace/webview/services/PluginDetailsService.ts`（构造 repository.url 时使用）
- 若有其他地方直接使用 repository.url 打开外链，一并改为使用规范化后的 URL

---

## 2. 扩展国际化（package.nls）

### 目标

- 扩展在 VS Code 中根据用户语言显示英文或中文（列表、命令、描述等）。
- 默认语言为英文（符合 Marketplace 展示与审核习惯）。

### 结构

- `package.nls.json` — 英文（默认）
- `package.nls.zh-cn.json` — 简体中文
- `package.json` 中所有用户可见字符串改为占位符，例如 `%extension.description%`、`%command.refresh.title%`

### 需要国际化的字段（package.json）

| 键路径 | 说明 |
|--------|------|
| `description` | 扩展描述 |
| `contributes.viewsContainers.activitybar[0].title` | 活动栏标题 "Plugin Market" |
| `contributes.views.claude-marketplace-sidebar[0].name` | 侧边栏视图名称 |
| `contributes.commands[].title` | 各命令标题（刷新、添加市场、删除市场、安装、卸载等） |

### 代码内文案

- `extension.ts` 及所有 `vscode.window.showInformationMessage` / `showErrorMessage` / `showInputBox` 等中的中文改为使用 `vscode.l10n.t()`（VS Code 内置）或 `import * as nls from 'vscode-nls'` 的 `localize()`。
- 若使用 `vscode.l10n.t()`：在扩展根目录使用 `l10n/` 下 `bundle.l10n.json`（及 `bundle.l10n.zh-cn.json` 等），与 package.nls 分离；或继续用 nls 的 `package.nls.*` 在代码中通过 key 引用。**建议**：commands/views 用 package.nls，运行时提示用 `vscode.l10n.t` + `l10n/*.json` 或统一用 vscode-nls 读 package.nls 的 key（需保证 key 一致）。

### 约定

- 键名：`extension.description`、`view.sidebar.name`、`command.refresh.title` 等，与 package.json 占位符一致。
- 英文为真相源，中文翻译与英文 key 一一对应。

### 涉及文件

- 新建：`package.nls.json`、`package.nls.zh-cn.json`
- 修改：`package.json`（上述字段改为 %key%）
- 修改：`src/extension.ts` 及所有弹出文案的 TS 文件（改为 l10n 调用）

---

## 3. Webview 国际化

### 目标

- 侧边栏与详情页中所有用户可见文案根据 VS Code 当前语言显示英文或中文。
- 语言来源：`vscode.env.language`（由 extension 在创建 webview 时传入，如 query 或 postMessage 初始状态）。

### 数据流

- Extension 创建 Webview 时读取 `vscode.env.language`，将 `locale`（如 `en`、`zh-cn`）通过 HTML 的初始脚本或第一次 postMessage 传给 Webview。
- Webview 根组件接收 `locale`，加载对应语言包（见下），通过 React Context 或 props 下发。

### 语言包结构

- `webview/src/l10n/en.json` — 英文
- `webview/src/l10n/zh-cn.json` — 简体中文
- 键为语义化 key，如 `sidebar.loading`、`sidebar.refresh`、`detail.install`、`detail.uninstallConfirm`。值即显示字符串。

### 回退

- 若 `locale` 为 `zh-cn` 则用 `zh-cn.json`，否则一律用 `en.json`（包括 `en`、`en-us` 等）。后续若增加语言，再扩展映射。

### 实现要点

- 所有当前硬编码中文的组件改为从 context 或 hook 取 `t(key)`，例如 `t('sidebar.loading')`。
- 文案表按界面模块分块（sidebar、detail.header、detail.content、detail.readme、components、pluginItem、pluginSection 等），便于维护。
- 不引入重型 i18n 库；用简单 `key → string` 对象 + 一层嵌套 key（如 `detail.header.uninstallConfirm`）即可。

### 涉及文件

- 新建：`webview/src/l10n/en.json`、`webview/src/l10n/zh-cn.json`
- 新建：`webview/src/l10n/index.ts`（导出 `getMessages(locale)` 或 `useTranslation(locale)`）
- 修改：`SidebarWebviewView.ts`、`PluginDetailsPanel.ts` — 在生成 HTML/初始状态时传入 `locale`
- 修改：`webview/src/sidebar/SidebarApp.tsx`、`webview/src/details/DetailsApp.tsx` 及所有子组件 — 使用 `t(key)` 替代硬编码

---

## 4. README 多语言

### 约定

- 插件目录（及 `.claude-plugin`）下支持：
  - `README.md` — 默认（英文或通用）
  - `README.zh-CN.md` — 简体中文
- 加载顺序：根据当前 UI 语言（与 Webview 一致）：
  - `zh-cn` → 先尝试 `README.zh-CN.md`，若无则 `README.md`
  - 其他 → 使用 `README.md`
- 文件名大小写：与现有逻辑一致，可同时支持 `readme.md` / `Readme.md` 等变体（先查本地约定再定是否保留）。

### 实现要点

- `PluginDetailsService.readReadme(pluginPath, locale?)` 增加可选 `locale`；若未传则从调用方传入的 UI 语言决定。
- 在插件根与 `.claude-plugin` 下，先按语言选文件名列表（如 zh-cn → `['README.zh-CN.md', 'readme.zh-CN.md', 'README.md', 'readme.md']`），再依次尝试读取，第一个存在即返回内容。
- 调用链：详情页在请求详情时带上当前 locale；PluginDetailsPanel/PluginDataStore 将 locale 传到 getPluginDetail；PluginDetailsService.getPluginDetail 将 locale 传给 readReadme。

### 涉及文件

- `src/pluginMarketplace/webview/services/PluginDetailsService.ts` — readReadme 支持 locale，getPluginDetail 接收并传递 locale
- `src/pluginMarketplace/data/PluginDataStore.ts` — getPluginDetail 若支持 locale 参数则传递
- `src/pluginMarketplace/webview/PluginDetailsPanel.ts` — 将 webview 的 locale 传给 getPluginDetail
- `src/pluginMarketplace/webview/messages/types.ts` — 若详情请求带 locale，类型中体现
- Webview 详情页 — 在请求详情时携带当前 locale（若尚未在初始状态里传过）

---

## 5. 发布清单与其它

### .vscodeignore

- 确保排除：`node_modules`、`**/__tests__`、`**/*.test.ts`、`**/.*`（按需）、`webview/node_modules`、`src`（若已编译到 out）、`docs`（若不需要打进 vsix）、`*.map` 等，以减小 vsix 体积并避免泄露测试与源码。

### package.json 与商店

- **description**：英文简洁描述，便于 Marketplace 搜索与审核。
- **categories**：至少选一个 Marketplace 标准分类（如 "Other" 或更具体）。
- **keywords**：保留并酌情增加英文关键词（如 claude, plugin, marketplace, skills）。
- **repository**：保持正确；若为私有或后续变更，及时更新。

### 默认分支

- 代码中若有 `raw.githubusercontent.com/.../main/...` 的写死，改为可配置或从 GitHub API 获取默认分支；若无此类调用，在注释或文档中说明「未来若恢复远程 README，将使用默认分支」。

### CHANGELOG

- 提供 `CHANGELOG.md`（或遵循 VS Code 的 changelog 约定），便于用户与审核查看版本变更。

### 测试与验证

- 切换 VS Code 显示语言（Display Language）为 English / 中文（简体），验证扩展名称、命令、侧边栏、详情页、弹窗均为对应语言。
- 验证「打开市场链接」「打开仓库」等跳转为 HTTPS 且无 `.git` 后缀。
- 验证存在 `README.zh-CN.md` 的插件在中文环境下显示该内容，否则显示 `README.md`。

---

## 实现顺序建议

1. Git URL 规范化（工具函数 + 调用点）
2. 扩展 nls（package.nls.* + package.json 占位符 + extension 内 l10n）
3. Webview locale 传入 + 语言包 en/zh-cn + 组件改用 t(key)
4. README 多语言（readReadme + locale 传递链）
5. 发布清单（.vscodeignore、description/keywords、CHANGELOG、默认分支说明）

---

## 备注

- 仅支持英文与简体中文；后续若增加语言，扩展侧加 package.nls.{locale}.json，Webview 加 l10n/{locale}.json，README 加 README.{locale}.md 约定即可。
- 远程插件当前不从 GitHub 拉 README；若未来恢复，需同时约定默认分支与多语言文件名，与本节一致。
