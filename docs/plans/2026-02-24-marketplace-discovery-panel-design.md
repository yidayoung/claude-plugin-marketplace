# 市场发现面板设计文档

**日期**: 2026-02-24
**状态**: 设计阶段

## 概述

在 Editor 区域新增一个"市场发现"面板，展示推荐市场和自定义市场添加功能，帮助用户更容易发现和添加插件市场。

## 问题背景

当前用户添加市场需要：
1. 知道市场的 GitHub 仓库地址
2. 手动输入 `owner/repo` 或完整 URL
3. 对新用户来说门槛较高

## 解决方案

新增 `MarketplacePanel`，在 Editor 区域展示：
- 自定义市场添加（输入框 + 按钮）
- 推荐市场列表（卡片式展示）

## 架构设计

### 组件结构

```
src/pluginMarketplace/webview/
├── MarketplacePanel.ts          # 新增：Panel 管理器
└── messages/
    └── handlers.ts              # 修改：添加 marketplace 相关消息处理

webview/src/
├── marketplace/                 # 新增目录
│   ├── main.tsx                 # 入口文件
│   ├── MarketplaceApp.tsx       # 主组件
│   └── RecommendedMarket.tsx    # 推荐市场卡片
└── dist/
    ├── marketplace.js           # 编译输出
    └── marketplace.css          # 样式输出
```

### 核心类：MarketplacePanel

```typescript
export class MarketplacePanel {
  // 单例模式：复用已打开的面板
  public static currentPanel: MarketplacePanel | undefined;
  public static readonly viewType = 'marketplaceDiscover';

  public static async createOrShow(
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext,
    dataStore: PluginDataStore
  ): Promise<void> {
    // 如果已存在，定位到已有面板
    if (MarketplacePanel.currentPanel) {
      MarketplacePanel.currentPanel._panel.reveal();
      return;
    }

    // 创建新面板（在 Editor 区域，Beside 列）
    const panel = vscode.window.createWebviewPanel(
      MarketplacePanel.viewType,
      '发现市场',
      vscode.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    MarketplacePanel.currentPanel = new MarketplacePanel(panel, ...);
  }

  // dispose 时清除静态引用
  public dispose(): void {
    MarketplacePanel.currentPanel = undefined;
    // ...
  }
}
```

### 推荐市场数据

初期硬编码，预留远程配置接口：

```typescript
const RECOMMENDED_MARKETPLACES: RecommendedMarketplace[] = [
  {
    id: 'anthropics/claude-plugins-official',
    name: 'claude-plugins-official',
    displayName: 'Anthropic 官方插件',
    description: 'Anthropic 官方维护的插件集合',
    source: 'github.com/anthropics/claude-plugins-official',
    icon: '🔷'
  },
  {
    id: 'claude-automation/claude-plugin-marketplace',
    name: 'claude-plugin-marketplace',
    displayName: '社区插件市场',
    description: '社区驱动的插件发现与分享平台',
    source: 'github.com/claude-automation/claude-plugin-marketplace',
    icon: '🌟'
  },
];

// 预留远程配置接口（未来）
async function fetchRemoteMarketplaces(): Promise<RecommendedMarketplace[]> {
  try {
    const response = await fetch('https://example.com/marketplaces.json');
    return await response.json();
  } catch {
    return RECOMMENDED_MARKETPLACES;
  }
}
```

## UI 设计

### 布局结构

```
┌─────────────────────────────────────────────────────────┐
│  发现市场                                    [×]         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  添加自定义市场                                          │
│  ┌────────────────────────────────────────┐            │
│  │ owner/repo 或 URL                      │            │
│  └────────────────────────────────────────┘            │
│                                   [ 添加 ]              │
│                                                          │
│  ─────────────────────────────────────────────────────  │
│                                                          │
│  推荐市场                                                │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 📦 claude-plugins-official        [ 添加 ]      │  │
│  │                                                   │  │
│  │ Anthropic 官方插件市场                             │  │
│  │ 包含 42 个插件                        ⭐ 1.2k    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 📦 claude-plugin-marketplace       [ 添加 ]      │  │
│  │                                                   │  │
│  │ 社区驱动的插件市场                                 │  │
│  │ 包含 18 个插件                        ⭐ 256      │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 交互流程

1. **打开面板**
   - 用户点击 Sidebar "添加市场" 菜单
   - 调用 `MarketplacePanel.createOrShow()`
   - 首次打开创建新 Panel，再次点击定位到已有 Panel

2. **添加自定义市场**
   - 用户输入 `owner/repo` 或 URL
   - 点击"添加"按钮
   - 发送 `addMarketplace` 消息到 extension
   - Extension 执行 CLI 命令
   - 成功后显示通知，刷新 Sidebar

3. **添加推荐市场**
   - 用户点击推荐市场卡片的"添加"按钮
   - 自动填充该市场的 source
   - 执行添加流程
   - 按钮状态变为"已添加"（禁用）

4. **关闭面板**
   - 点击 × 或按 ESC
   - `currentPanel` 置为 `undefined`
   - 下次打开创建新 Panel

## 数据流

### Webview → Extension

```typescript
// 添加自定义市场
vscode.postMessage({
  type: 'addMarketplace',
  payload: { source: 'owner/repo' }
});

// 添加推荐市场
vscode.postMessage({
  type: 'addRecommendedMarketplace',
  payload: { source: 'github.com/owner/repo' }
});
```

### Extension → Webview

```typescript
// 市场添加成功
panel.webview.postMessage({
  type: 'marketplaceAdded',
  payload: { marketplaceName: string }
});

// 市场已存在（用于更新 UI 状态）
panel.webview.postMessage({
  type: 'marketplaceExists',
  payload: { marketplaceNames: string[] }
});
```

### 与 PluginDataStore 集成

```typescript
// 在 handlers.ts 中添加
case 'addMarketplace':
case 'addRecommendedMarketplace':
  const { source } = message.payload;
  const result = await dataStore.addMarketplace(source);
  if (result.success) {
    vscode.window.showInformationMessage(
      vscode.l10n.t('marketplace.addSuccess', result.marketplaceName || source)
    );
    // 通知 Sidebar 刷新
    storeEvents.emitMarketplaceChange();
  }
  break;
```

## 命令注册

在 `extension.ts` 中修改现有命令，改为打开 Panel：

```typescript
// 修改：不再使用 showInputBox
context.subscriptions.push(
  vscode.commands.registerCommand('claudePluginMarketplace.addMarketplace', async () => {
    await MarketplacePanel.createOrShow(
      context.extensionUri,
      context,
      dataStore!
    );
  })
);
```

## 国际化

在 `l10n/bundle.l10n.zh-cn.json` 添加：

```json
{
  "marketplace.discover.title": "发现市场",
  "marketplace.discover.addCustom": "添加自定义市场",
  "marketplace.discover.inputPlaceholder": "owner/repo 或 URL",
  "marketplace.discover.recommended": "推荐市场",
  "marketplace.discover.addButton": "添加",
  "marketplace.discover.addedButton": "已添加",
  "marketplace.discover.alreadyExists": "该市场已存在"
}
```

## 技术约束

1. **单例模式**：只能有一个 MarketplacePanel 实例，复用已有面板
2. **不影响 PluginDetailsPanel**：两个 Panel 类型可以同时存在
3. **使用 Ant Design 组件**：遵循项目 CSS 约定，不创建新 CSS 文件
4. **统计数据获取**：插件数量需要从已加载的市场数据中获取

## 扩展性

### 远程配置（未来）

```typescript
// 从远程服务器获取推荐市场列表
async function fetchRemoteMarketplaces(): Promise<RecommendedMarketplace[]> {
  try {
    const response = await fetch('https://claude-plugin-marketplace.vercel.app/marketplaces.json');
    const data = await response.json();
    return data.marketplaces || RECOMMENDED_MARKETPLACES;
  } catch {
    return RECOMMENDED_MARKETPLACES;
  }
}
```

### 统计数据

```typescript
// 从 DataStore 获取已加载市场的插件数量
function getMarketplaceStats(marketplaceName: string): { pluginCount: number } | null {
  const plugins = dataStore.getPluginList(marketplaceName);
  return plugins ? { pluginCount: plugins.length } : null;
}
```

## 测试计划

1. **单元测试**
   - `MarketplacePanel.createOrShow()` 单例行为
   - 推荐市场数据格式验证

2. **集成测试**
   - 添加市场命令执行
   - Sidebar 刷新触发

3. **手动测试**
   - 首次打开面板
   - 复用已有面板
   - 添加自定义市场
   - 添加推荐市场
   - 添加已存在市场的错误处理

## 实施步骤

1. 创建 `MarketplacePanel.ts` 基础结构
2. 创建 React 组件 (`MarketplaceApp.tsx`, `RecommendedMarket.tsx`)
3. 修改 `extension.ts` 命令注册
4. 添加消息处理 (`handlers.ts`)
5. 添加国际化文本
6. 构建配置更新（Vite）
7. 测试

## 回顾

**关键决策**：
- 使用单例模式复用 Panel
- 初期硬编码推荐市场，预留远程配置接口
- 在 Editor 区域（Beside）展示，不受 Sidebar 宽度限制
- 与 `PluginDetailsPanel` 独立，两者可同时存在
