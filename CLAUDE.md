# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a VS Code extension for managing Claude Code plugin marketplace. It has two parts:

- `vscode-extension/` - VS Code extension (TypeScript)
- `webview-app/` - React webview UI (Vite + React)

## Build Commands

### Extension
- `npm run compile` - Compile TypeScript to `vscode-extension/out/`
- `npm run watch` - Watch mode for development

### Webview
- `cd vscode-extension && npm run build-webview` - Build React app to `vscode-extension/webview/dist/`

### Full Build
- Use VS Code task "vscode: 全部构建" or run: `npm run compile && npm run build-webview`

### Debug
- Press F5 with "🔴 开发模式 (Webview热更新)" configuration

## Architecture

### Core Managers
- `PluginManager` ([pluginManager.ts](vscode-extension/src/pluginMarketplace/pluginManager.ts)) - Manages plugin install/uninstall/update via Claude CLI
- `MarketplaceManager` ([marketplaceManager.ts](vscode-extension/src/pluginMarketplace/marketplaceManager.ts)) - Manages marketplace sources
- `PluginTreeProvider` ([pluginTreeProvider.ts](vscode-extension/src/pluginMarketplace/pluginTreeProvider.ts)) - TreeView data provider

### Webview Communication
- `PluginMarketplacePanel` ([PluginMarketplacePanel.ts](vscode-extension/src/pluginMarketplace/webview/PluginMarketplacePanel.ts)) - Creates webview panels
- `MessageHandler` ([handlers.ts](vscode-extension/src/pluginMarketplace/webview/messages/handlers.ts)) - Handles bidirectional messages
- `PluginDataService` ([PluginDataService.ts](vscode-extension/src/pluginMarketplace/webview/services/PluginDataService.ts)) - Data layer

### CLI Integration
All plugin operations use `execClaudeCommand()` from [types.ts](vscode-extension/src/pluginMarketplace/types.ts):
- `claude plugin list --json`
- `claude plugin install "<name>@<marketplace>"`
- `claude plugin uninstall "<name>"`
- `claude plugin update "<name>"`
- `claude plugin marketplace add/remove/list`

## Key Conventions

1. **Always rebuild webview after editing** `webview-app/src/` files
2. **Extension entry point**: [extension.ts](vscode-extension/src/extension.ts)
3. **Tree item types** are defined in [types.ts](vscode-extension/src/pluginMarketplace/types.ts) as `TreeItemType`
4. **CLI commands** are wrapped in `execClaudeCommand()` with timeout handling

## Webview UI Conventions

### CSS & Styling Policy

**Principle**: Use Ant Design components and theme system first. Avoid custom CSS files.

#### Preferred Approaches (in order)

1. **Ant Design 组件属性** - 使用组件内置的 props 控制样式
   ```tsx
   // ✅ Good
   <Button type="primary" size="large" danger />
   <Input style={{ borderRadius: 8 }} />
   ```

2. **Ant Design 主题配置** - 通过 `antd-theme.ts` 统一配置主题 token
   ```typescript
   // ✅ Good - 在 theme/antd-theme.ts 中配置
   export const antdTheme = {
     token: { colorPrimary: 'var(--vscode-textLink-foreground)' },
     components: { Button: { borderRadius: 8 } }
   };
   ```

3. **内联样式** - 简单的、一次性的样式直接用 style 属性
   ```tsx
   // ✅ Good - 简单布局
   <div style={{ flex: 1, overflowY: 'auto' }}>
   ```

4. **全局 CSS** - 仅用于真正全局的内容（滚动条、动画、可访问性）
   ```css
   /* ✅ OK - 在 index.css 中 */
   ::-webkit-scrollbar { width: 8px; }
   @media (prefers-reduced-motion: reduce) { ... }
   ```

#### 禁止的做法

```tsx
// ❌ Bad - 不要为单个组件创建 CSS 文件
import './MyComponent.css'

// ❌ Bad - 不要用 className 做简单的样式
<div className="my-container">

// ❌ Bad - 不要在多处重复相同的样式
```

#### 例外情况

以下情况可以创建 CSS 文件：
- 复杂的动画效果
- 需要多处复用的样式模式
- 第三方组件的深度样式覆盖（无法通过主题配置）

#### 当前 CSS 文件结构

```
webview-app/src/
├── index.css      # 全局基础样式（滚动条、选择文本、可访问性）
├── App.css        # 主应用布局、动画、必要的组件样式
└── sidebar/
    └── sidebar.css # 侧边栏专用样式（VS Code 主题适配）
```

**不要创建新的 CSS 文件，除非有充分理由。**
