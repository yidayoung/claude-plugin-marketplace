# 插件详情面板设计

**日期:** 2025-02-16
**状态:** 设计完成

## 概述

为 Claude Code 插件市场添加独立的插件详情面板，在 Editor 区域展示插件的完整信息，包括 README、Skills、Hooks、MCPs、Commands 等核心内容。

## 触发方式

用户通过点击插件卡片（PluginCard 或侧边栏插件项）触发详情面板。

## 展示形式

详情面板作为独立的 Webview Panel 在 Editor 区域打开，与插件市场面板并列显示为独立标签页。

## 数据获取策略

采用混合方式：
- **已安装插件**：从本地 `~/.claude/plugins/` 目录读取 `package.json` 和 `README.md`
- **未安装插件**：从市场源（如 GitHub API）远程获取插件元数据和 README

## 架构设计

### 文件结构

```
vscode-extension/src/pluginMarketplace/webview/
├── PluginMarketplacePanel.ts    (现有 - 市场列表)
├── PluginDetailsPanel.ts        (新增 - 插件详情)
├── SidebarWebviewView.ts        (现有 - 侧边栏视图)
└── messages/
    └── handlers.ts              (添加 openDetails 处理)

webview-app/src/
├── App.tsx                       (修改 - 根据 viewType 路由)
├── main.tsx                      (修改 - 传递 initState)
├── details/
│   ├── DetailsApp.tsx            (新增 - 详情面板主组件)
│   ├── DetailHeader.tsx          (新增 - 头部信息)
│   ├── DetailContent.tsx         (新增 - 内容区域)
│   ├── ComponentsSection.tsx     (新增 - Skills/Hooks/MCPs/Commands)
│   └── ReadmeSection.tsx         (新增 - Markdown 渲染)
```

### 数据结构

```typescript
interface PluginDetailData extends PluginData {
  // README 内容（Markdown 格式）
  readme?: string;

  // Claude 插件核心内容
  skills?: SkillInfo[];
  hooks?: HookInfo[];
  mcps?: McpInfo[];
  commands?: CommandInfo[];

  // 仓库信息
  repository?: {
    type: 'github' | 'gitlab' | 'other';
    url: string;
    stars?: number;
  };

  // 依赖信息
  dependencies?: string[];

  // 许可证
  license?: string;
}

interface SkillInfo {
  name: string;
  description: string;
  category?: string;
}

interface HookInfo {
  name: string;
  events: string[];
  description?: string;
}

interface McpInfo {
  name: string;
  description?: string;
}

interface CommandInfo {
  name: string;
  description?: string;
}
```

### Webview 构建策略

复用现有 `webview-app` 构建产物，通过 `initState` 区分面板类型：

```typescript
// Extension 端
panel.webview.html = getHtmlForWebview({
  viewType: 'details',
  pluginName: 'xxx',
  marketplace: 'yyy'
});

// React 端
const initState = vscode.getState();
if (initState?.viewType === 'details') {
  return <DetailsApp {...initState} />;
}
return <MarketplaceApp />;
```

## UI 设计

### 面板布局

```
┌─────────────────────────────────────────────────────────────┐
│  插件详情: plugin-name                        ×              │
├─────────────────────────────────────────────────────────────┤
│  [Header] 名称、版本、作者、操作按钮                          │
│  [详细描述] 插件详细介绍                                      │
│  [插件内容] Skills / Hooks / MCPs / Commands                │
│  [README] Markdown 渲染内容                                  │
│  [元信息] 依赖、许可证、版本历史                              │
└─────────────────────────────────────────────────────────────┘
```

### UI 组件层次

```
DetailsApp
├── DetailHeader
│   ├── 插件名称 + 版本
│   ├── 作者/市场来源标签
│   ├── 外部链接按钮（主页/仓库）
│   └── 操作按钮组（安装/卸载/启用/复制）
├── DetailContent
│   ├── DescriptionSection
│   ├── ComponentsSection (Skills/Hooks/MCPs/Commands)
│   ├── ReadmeSection (Markdown)
│   └── MetaSection (依赖/许可证)
└── DetailFooter (复制命令快捷操作)
```

## 交互设计

| 操作 | 行为 |
|------|------|
| 点击插件卡片 | 创建或激活详情面板，加载插件信息 |
| 安装/卸载 | 操作完成后刷新详情面板状态 |
| 复制命令 | 复制 `claude plugin install "name@marketplace"` 到剪贴板 |
| 外部链接 | 在浏览器中打开插件主页或仓库 |

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| 插件已安装 | 从本地读取 package.json 和 README.md |
| 插件未安装 | 从市场源 URL 获取元数据和 README |
| 网络失败 | 显示错误提示，提供重试按钮 |
| README 不存在 | 显示"该插件暂无 README"提示 |
| 解析失败 | 显示"无法解析插件信息"，提供查看原始链接 |

## 支持的操作

详情面板支持以下操作：
- 安装/卸载插件
- 启用/禁用插件
- 更新插件（如有新版本）
- 复制安装命令
- 打开外部链接（主页/仓库）
