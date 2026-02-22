# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a VS Code extension for managing Claude Code plugin marketplace with a flat directory structure:

```
.
├── src/                          # Extension source code (TypeScript)
│   ├── extension.ts              # Extension entry point
│   └── pluginMarketplace/
│       ├── data/                 # Data layer (core architecture)
│       │   ├── PluginDataStore.ts    # 唯一数据源，管理所有插件/市场数据
│       │   ├── DataLoader.ts          # 数据加载（文件系统/CLI）
│       │   ├── events.ts              # 全局事件发射器
│       │   └── types.ts               # 数据层类型定义
│       ├── webview/              # Webview UI components
│       │   ├── SidebarWebviewView.ts  # Sidebar provider
│       │   ├── PluginDetailsPanel.ts  # Details panel
│       │   ├── messages/              # Webview message handlers
│       │   └── services/              # PluginDetailsService（详情解析）
│       └── types.ts              # 共享类型定义
├── webview/                      # React UI (Vite + React + Ant Design)
│   ├── src/                      # React source
│   └── dist/                     # Compiled output
├── out/                          # Compiled extension output
├── __tests__/                    # Jest tests
└── __mocks__/                    # Test mocks
```

## Build Commands

### Extension
- `npm run compile` - Compile TypeScript to `out/`
- `npm run watch` - Watch mode for development

### Webview
- `npm run build-webview` - Build React app to `webview/dist/`
- `cd webview && npm run dev` - Webview dev server with hot reload

### Full Build
- Use VS Code task "vscode: 全部构建" or run: `npm run compile && npm run build-webview`

### Testing
- `npm test` - Run Jest tests
- `npm run test:watch` - Watch mode
- `npm run test:coverage` - Coverage report

### Debug
- Press F5 with "🔴 开发模式 (Webview热更新)" configuration

## Architecture

### Data Layer (Core)

The extension uses a **single-source-of-truth** architecture with event-driven updates:

#### PluginDataStore
[PluginDataStore.ts](src/pluginMarketplace/data/PluginDataStore.ts) - 唯一数据源，管理所有插件/市场数据

**Key Features:**
- 单例模式，通过扩展激活访问
- 插件详情内存缓存（5分钟TTL）
- 请求去重（防止重复API调用）
- 事件驱动更新到所有订阅者
- 集成所有插件和市场操作（install, uninstall, enable, disable, addMarketplace, removeMarketplace, updateMarketplace）

**Data Caching:**
| Data Type | Load Timing | Cache Strategy | Invalidation |
|-----------|-------------|----------------|--------------|
| Marketplaces | VS startup | Memory cache, never expires | Add/remove marketplace |
| Plugin list (basic info) | VS startup | Memory cache, never expires | Marketplace update |
| Plugin details (skills/agents) | On demand | Memory cache, 5min TTL | Refresh marketplace |
| Install/enabled status | VS startup | Memory cache, never expires | Install/uninstall/enable/disable |
| GitHub stars | After detail load | Memory cache, session | Refresh marketplace |

#### DataLoader
[DataLoader.ts](src/pluginMarketplace/data/DataLoader.ts) - 数据加载（文件系统/CLI）

- 解析市场配置文件
- 解析插件详情（README, skills, agents等）
- 通过 `execClaudeCommand()` 执行CLI命令
- 异步获取GitHub stars

#### Event System
[events.ts](src/pluginMarketplace/data/events.ts) - 全局事件发射器

```typescript
enum StoreEvent {
  MarketplaceChange = 'marketplaceChange',      // 市场列表更新
  PluginStatusChange = 'pluginStatusChange',    // 插件安装/卸载/启用/禁用
  PluginDetailUpdate = 'pluginDetailUpdate',    // 插件详情更新（如stars加载完成）
}
```

**Usage:**
```typescript
import { storeEvents } from './data/events';

// Emit event
storeEvents.emitPluginStatusChange({
  pluginName: 'my-plugin',
  marketplace: 'community',
  change: 'installed'
});

// Subscribe to events (returns VS Code Disposable)
const disposable = storeEvents.onEvent(StoreEvent.PluginStatusChange, (event) => {
  console.log('Plugin status changed:', event);
});
```

### Webview Communication

#### SidebarWebviewView
[SidebarWebviewView.ts](src/pluginMarketplace/webview/SidebarWebviewView.ts) - Sidebar provider
- Receives `PluginDataStore` via constructor
- Subscribes to Store events for real-time updates
- Renders React UI in `webview/dist/sidebar.js`

#### PluginDetailsPanel
[PluginDetailsPanel.ts](src/pluginMarketplace/webview/PluginDetailsPanel.ts) - Details panel
- Creates webview panels for plugin details
- Listens to Store events to update button states
- Uses `PluginDataStore.getPluginDetail()` with caching

#### MessageHandler
[handlers.ts](src/pluginMarketplace/webview/messages/handlers.ts) - Bidirectional message handling
- Handles webview → extension messages
- Delegates plugin operations to `PluginDataStore`
- Stores emit events that webview UI subscribes to

### CLI Integration

**Preferred:** Use `PluginDataStore` methods which handle CLI commands automatically:
```typescript
await dataStore.installPlugin(name, marketplace, scope);
await dataStore.uninstallPlugin(name);
await dataStore.enablePlugin(name, marketplace);
await dataStore.disablePlugin(name, marketplace);
// 市场管理也已整合到 PluginDataStore
await dataStore.addMarketplace(source);
await dataStore.removeMarketplace(name);
await dataStore.updateMarketplace(name);
```

**Direct CLI:** Use `execClaudeCommand()` from [types.ts](src/pluginMarketplace/types.ts) when needed:
```typescript
await execClaudeCommand('plugin list --json');
await execClaudeCommand('plugin marketplace add <source>');
```

## Key Conventions

1. **Data Access**: 始终使用 `PluginDataStore` 访问插件数据 - 绝不要绕过它
   - Extension activation: 存储在 `dataStore` 变量中
   - Commands: 执行 `claudePluginMarketplace.getDataStore` 命令
   - Webview: 通过 `SidebarWebviewViewProvider` 构造函数注入

2. **Event-Driven Updates**: 订阅Store事件而不是轮询
   ```typescript
   const disposable = dataStore.on(StoreEvent.PluginStatusChange, (event) => {
     // 更新UI
   });
   context.subscriptions.push(disposable); // deactivate时自动清理
   ```

3. **Development with Hot Reload**:
   - 热更新模式（F5 → "🔴 开发扩展 (Webview 热更新)"）会自动监听文件变化
   - 修改 `webview/src/` 文件后，Vite 开发服务器会自动热更新，无需手动 build
   - 仅在生产构建时需要手动执行 `npm run build-webview`

4. **Extension entry point**: [extension.ts](src/extension.ts)

5. **Shared types** are in [types.ts](src/pluginMarketplace/types.ts) and [data/types.ts](src/pluginMarketplace/data/types.ts)

6. **CLI commands** are wrapped in `execClaudeCommand()` with timeout handling

7. **No parallel data managers**: Never create separate data caches or managers
   - All data operations must go through `PluginDataStore`
   - All state changes must emit appropriate events
   - UI components subscribe to events, never poll

7. **No parallel data managers**: Never create separate data caches or managers
   - All data operations must go through `PluginDataStore`
   - All state changes must emit appropriate events
   - UI components subscribe to events, never poll

## Webview UI Conventions

### CSS & Styling Policy

**Principle**: Use Ant Design components and theme system first. Avoid custom CSS files.

#### Preferred Approaches (in order)

1. **Ant Design 组件属性** - Use built-in component props
   ```tsx
   // ✅ Good
   <Button type="primary" size="large" danger />
   <Input style={{ borderRadius: 8 }} />
   ```

2. **Ant Design 主题配置** - Configure theme tokens globally
   ```typescript
   // ✅ Good - in theme/antd-theme.ts
   export const antdTheme = {
     token: { colorPrimary: 'var(--vscode-textLink-foreground)' },
     components: { Button: { borderRadius: 8 } }
   };
   ```

3. **内联样式** - For simple, one-off styles
   ```tsx
   // ✅ Good - simple layout
   <div style={{ flex: 1, overflowY: 'auto' }}>
   ```

4. **全局 CSS** - Only for truly global styles (scrollbars, animations, accessibility)
   ```css
   /* ✅ OK - in index.css */
   ::-webkit-scrollbar { width: 8px; }
   @media (prefers-reduced-motion: reduce) { ... }
   ```

#### 禁止的做法

```tsx
// ❌ Bad - Don't create CSS files for individual components
import './MyComponent.css'

// ❌ Bad - Don't use className for simple styling
<div className="my-container">

// ❌ Bad - Don't repeat the same styles in multiple places
```

#### 例外情况

CSS files are allowed for:
- Markdown rendering styles (React Markdown content)
- Complex animations
- Third-party component deep style overrides (not possible via theme config)

#### 当前 CSS 文件结构

```
webview/src/
├── index.css      # Global base styles (scrollbars, text selection, accessibility)
└── theme/
    └── antd-theme.ts  # Ant Design theme configuration (VS Code variable mapping)
```

**不要创建新的 CSS 文件，除非有充分理由。**

---

## 已重构的架构

2026-02重构后，项目遵循**单一数据源 + 事件驱动**架构：

- ✅ `PluginDataStore` 是唯一的数据管理类
- ✅ 所有插件/市场操作都通过 `PluginDataStore` 执行并触发事件
- ✅ UI组件通过订阅事件获取实时更新
- ❌ 已删除 `PluginDataService`, `CacheManager`, `PluginManager`, `MarketplaceManager`

---

## Recommended Automations

This project uses TypeScript, React, Ant Design, and Jest. Recommended Claude Code automations:

### 🪝 Hooks

#### Auto-compile on TypeScript changes
**Why**: Catch type errors early after extension edits
**Where**: `.claude/settings.json`
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "pattern": "src/**/*.ts",
        "command": "npm run compile",
        "allowedTools": ["Bash(npm run compile)"]
      }
    ]
  }
}
```

#### Build webview on React changes (仅生产模式)
**Why**: 在没有启动热更新服务器时，自动构建 webview
**Where**: `.claude/settings.json`
**注意**: 如果使用热更新模式（`npm run dev-webview`），不需要此 hook
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "pattern": "webview/src/**/*.{ts,tsx}",
        "command": "npm run build-webview",
        "allowedTools": ["Bash(npm run build-webview)"]
      }
    ]
  }
}
```

#### Run tests on changes
**Why**: Run relevant tests after editing source files
**Where**: `.claude/settings.json`
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "pattern": "src/**/*.ts",
        "command": "npm test -- --testPathPattern=${file%.test}",
        "allowedTools": ["Bash(npm test:*)"]
      }
    ]
  }
}
```

### 🔌 MCP Servers

#### Context7
**Why**: Quick lookup for React, Ant Design, and VS Code API documentation
**Install**: `claude mcp add context7`

---

**Want more automations?** Ask for specific categories (e.g., "show me more skills" or "what other hooks would help?").
