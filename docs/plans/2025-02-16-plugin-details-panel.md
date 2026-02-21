# 插件详情面板实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 Editor 区域创建独立的插件详情 Webview Panel，展示插件的完整信息（README、Skills、Hooks、MCPs、Commands）

**Architecture:**
- Extension 端创建 `PluginDetailsPanel` 类管理详情 Panel 生命周期
- 复用现有 `webview-app` 构建产物，通过 `initState` 区分面板类型
- 新增 `PluginDetailsService` 获取插件详情（已安装插件读本地文件，未安装插件从市场源获取）
- React 端新增 `details/` 目录下的详情组件

**Tech Stack:** TypeScript, React, Ant Design, VS Code Webview API

---

## Task 1: 添加插件详情数据类型定义

**Files:**
- Modify: `src/pluginMarketplace/webview/messages/types.ts`

**Step 1: 添加插件详情相关类型**

在文件末尾添加以下类型定义：

```typescript
/**
 * 插件详情数据负载
 */
export interface PluginDetailPayload {
  pluginName: string;
  marketplace: string;
}

/**
 * 插件核心内容信息
 */
export interface SkillInfo {
  name: string;
  description: string;
  category?: string;
}

export interface HookInfo {
  name: string;
  events: string[];
  description?: string;
}

export interface McpInfo {
  name: string;
  description?: string;
}

export interface CommandInfo {
  name: string;
  description?: string;
}

/**
 * 仓库信息
 */
export interface RepositoryInfo {
  type: 'github' | 'gitlab' | 'other';
  url: string;
  stars?: number;
}

/**
 * 插件详情数据（扩展 PluginData）
 */
export interface PluginDetailData {
  name: string;
  description: string;
  version: string;
  author?: string;
  homepage?: string;
  category?: string;
  marketplace: string;
  installed: boolean;
  enabled?: boolean;
  scope?: 'user' | 'project' | 'local';
  updateAvailable?: boolean;
  // 详情特有字段
  readme?: string;
  skills?: SkillInfo[];
  hooks?: HookInfo[];
  mcps?: McpInfo[];
  commands?: CommandInfo[];
  repository?: RepositoryInfo;
  dependencies?: string[];
  license?: string;
}

/**
 * Extension 发送给 Webview 的消息类型 - 添加 pluginDetail
 */
export type ExtensionMessageType =
  | 'plugins'
  | 'installSuccess'
  | 'installError'
  | 'uninstallSuccess'
  | 'uninstallError'
  | 'enableSuccess'
  | 'enableError'
  | 'disableSuccess'
  | 'disableError'
  | 'marketplaceSuccess'
  | 'marketplaceError'
  | 'error'
  | 'pluginDetail';  // 新增

/**
 * 插件详情消息负载
 */
export interface PluginDetailMessagePayload {
  plugin: PluginDetailData;
}
```

**Step 2: 编译检查**

Run: `cd vscode-extension && npm run compile`
Expected: 编译成功，无类型错误

**Step 3: 提交**

```bash
git add src/pluginMarketplace/webview/messages/types.ts
git commit -m "feat: add plugin detail data types"
```

---

## Task 2: 创建插件详情数据服务

**Files:**
- Create: `src/pluginMarketplace/webview/services/PluginDetailsService.ts`

**Step 1: 创建 PluginDetailsService 类**

```typescript
// src/pluginMarketplace/webview/services/PluginDetailsService.ts

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  PluginDetailData,
  SkillInfo,
  HookInfo,
  McpInfo,
  CommandInfo,
  RepositoryInfo
} from '../../messages/types';

const execAsync = promisify(exec);

/**
 * 插件详情数据服务
 * 获取插件的详细信息，包括 README、Skills、Hooks 等
 */
export class PluginDetailsService {
  constructor(private context: vscode.ExtensionContext) {}

  /**
   * 获取插件详情
   * 已安装插件从本地读取，未安装插件从市场源获取
   */
  async getPluginDetail(
    pluginName: string,
    marketplace: string,
    isInstalled: boolean
  ): Promise<PluginDetailData> {
    if (isInstalled) {
      return this.getInstalledPluginDetail(pluginName);
    }
    return this.getRemotePluginDetail(pluginName, marketplace);
  }

  /**
   * 获取已安装插件的详情（从本地文件读取）
   */
  private async getInstalledPluginDetail(pluginName: string): Promise<PluginDetailData> {
    // 获取插件目录
    const pluginPath = await this.getPluginPath(pluginName);
    if (!pluginPath) {
      throw new Error(`找不到插件 ${pluginName} 的安装目录`);
    }

    // 读取 package.json
    const packageJsonPath = path.join(pluginPath, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

    // 读取 README
    const readme = await this.readReadme(pluginPath);

    // 解析插件内容
    const skills = this.parseSkills(packageJson);
    const hooks = this.parseHooks(packageJson);
    const mcps = this.parseMcps(packageJson);
    const commands = this.parseCommands(packageJson);
    const repository = this.parseRepository(packageJson);
    const dependencies = this.parseDependencies(packageJson);

    return {
      name: packageJson.name || pluginName,
      description: packageJson.description || '',
      version: packageJson.version || '0.0.0',
      author: packageJson.author?.name || packageJson.author,
      homepage: packageJson.homepage,
      category: packageJson.keywords?.[0],
      marketplace: 'installed',
      installed: true,
      readme,
      skills,
      hooks,
      mcps,
      commands,
      repository,
      dependencies,
      license: packageJson.license
    };
  }

  /**
   * 获取远程插件的详情（从市场源获取）
   */
  private async getRemotePluginDetail(
    pluginName: string,
    marketplace: string
  ): Promise<PluginDetailData> {
    // 从缓存管理器获取市场信息
    const { CacheManager } = await import('./CacheManager');
    const cache = new CacheManager(this.context);
    const marketplaces = await cache.getMarketplaces();
    const market = marketplaces.find(m => m.name === marketplace);

    if (!market) {
      throw new Error(`找不到市场 ${marketplace}`);
    }

    // 获取插件列表找到目标插件
    const plugins = await cache.getAllPlugins();
    const plugin = plugins.find(p => p.name === pluginName && p.marketplace === marketplace);

    if (!plugin) {
      throw new Error(`找不到插件 ${pluginName}@${marketplace}`);
    }

    // 根据市场类型获取详情
    let readme = '';
    let repository: RepositoryInfo | undefined;

    if (market.source.source === 'github' && market.source.repo) {
      const repoInfo = this.parseGitHubRepo(market.source.repo);
      const repoPath = `${repoInfo.owner}/${repoInfo.repo}`;
      readme = await this.fetchGitHubReadme(repoInfo.owner, repoInfo.repo, pluginName);
      repository = {
        type: 'github',
        url: `https://github.com/${repoPath}`,
        stars: await this.fetchGitHubStars(repoInfo.owner, repoInfo.repo)
      };
    }

    // 从插件基础信息解析
    const skills: SkillInfo[] = [];
    const hooks: HookInfo[] = [];
    const mcps: McpInfo[] = [];
    const commands: CommandInfo[] = [];

    return {
      name: plugin.name,
      description: plugin.description,
      version: plugin.version,
      author: plugin.author?.name,
      homepage: plugin.homepage,
      category: plugin.category,
      marketplace,
      installed: false,
      readme,
      skills,
      hooks,
      mcps,
      commands,
      repository,
      dependencies: [],
      license: undefined
    };
  }

  /**
   * 获取插件安装路径
   */
  private async getPluginPath(pluginName: string): Promise<string | null> {
    // 尝试用户目录
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const userPluginPath = path.join(homeDir, '.claude', 'plugins', 'cache', 'claude-plugins-official', 'skills', pluginName);
    try {
      await fs.access(userPluginPath);
      return userPluginPath;
    } catch {
      // 尝试项目目录
      const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (workspacePath) {
        const projectPluginPath = path.join(workspacePath, '.claude', 'plugins', pluginName);
        try {
          await fs.access(projectPluginPath);
          return projectPluginPath;
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  /**
   * 读取 README 文件
   */
  private async readReadme(pluginPath: string): Promise<string> {
    const readmeNames = ['README.md', 'readme.md', 'Readme.md'];
    for (const name of readmeNames) {
      const readmePath = path.join(pluginPath, name);
      try {
        return await fs.readFile(readmePath, 'utf-8');
      } catch {
        // 继续尝试下一个
      }
    }
    return '';
  }

  /**
   * 从 GitHub 获取 README
   */
  private async fetchGitHubReadme(owner: string, repo: string, pluginName: string): Promise<string> {
    try {
      // 尝试从插件的 skills 目录获取
      const url = `https://raw.githubusercontent.com/${owner}/${repo}/main/skills/${pluginName}/README.md`;
      const response = await fetch(url);
      if (response.ok) {
        return await response.text();
      }
      // 尝试根目录
      const rootUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`;
      const rootResponse = await fetch(rootUrl);
      if (rootResponse.ok) {
        return await rootResponse.text();
      }
    } catch {
      // 忽略错误
    }
    return '';
  }

  /**
   * 获取 GitHub stars 数
   */
  private async fetchGitHubStars(owner: string, repo: string): Promise<number> {
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
      if (response.ok) {
        const data = await response.json();
        return data.stargazers_count || 0;
      }
    } catch {
      // 忽略错误
    }
    return 0;
  }

  /**
   * 解析 GitHub 仓库信息
   */
  private parseGitHubRepo(repo: string): { owner: string; repo: string } {
    const match = repo.match(/github\.com[:/]([^/]+)\/(.+?)(\.git)?$/);
    if (!match) {
      throw new Error(`无效的 GitHub 仓库地址: ${repo}`);
    }
    return { owner: match[1], repo: match[2] };
  }

  /**
   * 解析 Skills
   */
  private parseSkills(packageJson: any): SkillInfo[] {
    const skills: SkillInfo[] = [];
    const skillsDir = packageJson.claude?.skills;
    if (skillsDir) {
      // 如果指定了 skills 目录，解析该目录
      // 这里简化处理，实际可以读取目录结构
    }
    return skills;
  }

  /**
   * 解析 Hooks
   */
  private parseHooks(packageJson: any): HookInfo[] {
    const hooks: HookInfo[] = [];
    const hooksConfig = packageJson.claude?.hooks;
    if (hooksConfig) {
      // 解析 hooks 配置
    }
    return hooks;
  }

  /**
   * 解析 MCPs
   */
  private parseMcps(packageJson: any): McpInfo[] {
    const mcps: McpInfo[] = [];
    const mcpsConfig = packageJson.claude?.mcps;
    if (mcpsConfig) {
      // 解析 mcp 配置
    }
    return mcps;
  }

  /**
   * 解析 Commands
   */
  private parseCommands(packageJson: any): CommandInfo[] {
    const commands: CommandInfo[] = [];
    const commandsConfig = packageJson.claude?.commands;
    if (commandsConfig) {
      // 解析 command 配置
    }
    return commands;
  }

  /**
   * 解析仓库信息
   */
  private parseRepository(packageJson: any): RepositoryInfo | undefined {
    const repo = packageJson.repository;
    if (!repo) return undefined;

    if (typeof repo === 'string') {
      if (repo.includes('github.com')) {
        return { type: 'github', url: repo };
      }
      return { type: 'other', url: repo };
    }

    if (repo.type === 'github') {
      return {
        type: 'github',
        url: `https://github.com/${repo.owner}/${repo.name}`
      };
    }

    return { type: 'other', url: repo.url || '' };
  }

  /**
   * 解析依赖
   */
  private parseDependencies(packageJson: any): string[] {
    const deps = packageJson.dependencies || {};
    return Object.keys(deps);
  }
}
```

**Step 2: 编译检查**

Run: `cd vscode-extension && npm run compile`
Expected: 编译成功

**Step 3: 提交**

```bash
git add src/pluginMarketplace/webview/services/PluginDetailsService.ts
git commit -m "feat: add PluginDetailsService for fetching plugin details"
```

---

## Task 3: 创建 PluginDetailsPanel 类

**Files:**
- Create: `src/pluginMarketplace/webview/PluginDetailsPanel.ts`

**Step 1: 创建 PluginDetailsPanel 类**

```typescript
// src/pluginMarketplace/webview/PluginDetailsPanel.ts

import * as vscode from 'vscode';
import { PluginDetailsService } from './services/PluginDetailsService';

/**
 * 插件详情 Webview Panel 管理器
 * 负责创建、显示和管理插件详情的 Webview Panel
 */
export class PluginDetailsPanel {
  public static currentPanel: PluginDetailsPanel | undefined;
  public static readonly viewType = 'pluginDetails';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _detailService: PluginDetailsService;
  private _disposables: vscode.Disposable[] = [];

  /**
   * 创建或显示 PluginDetails Panel
   * 如果 Panel 已存在，则更新内容；否则创建新的 Panel
   */
  public static async createOrShow(
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext,
    pluginName: string,
    marketplace: string,
    isInstalled: boolean
  ): Promise<void> {
    const column = vscode.ViewColumn.Beside;

    // 如果已经存在详情面板，更新内容
    if (PluginDetailsPanel.currentPanel) {
      PluginDetailsPanel.currentPanel._panel.reveal(column);
      await PluginDetailsPanel.currentPanel.loadPluginDetail(pluginName, marketplace, isInstalled);
      return;
    }

    // 创建新 Panel
    const panel = vscode.window.createWebviewPanel(
      PluginDetailsPanel.viewType,
      `插件详情: ${pluginName}`,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'webview', 'dist')
        ]
      }
    );

    PluginDetailsPanel.currentPanel = new PluginDetailsPanel(
      panel,
      extensionUri,
      context,
      pluginName,
      marketplace,
      isInstalled
    );
  }

  /**
   * 构造函数
   */
  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext,
    private _pluginName: string,
    private _marketplace: string,
    private _isInstalled: boolean
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._detailService = new PluginDetailsService(context);

    // 设置 HTML
    this._panel.webview.html = this._getHtmlForWebview();

    // 监听消息
    this._panel.webview.onDidReceiveMessage(
      async message => {
        await this.handleMessage(message);
      },
      null,
      this._disposables
    );

    // 监听关闭事件
    this._panel.onDidDispose(
      () => this.dispose(),
      null,
      this._disposables
    );

    // 加载插件详情
    this.loadPluginDetail(pluginName, marketplace, isInstalled);
  }

  /**
   * 加载插件详情
   */
  public async loadPluginDetail(
    pluginName: string,
    marketplace: string,
    isInstalled: boolean
  ): Promise<void> {
    this._pluginName = pluginName;
    this._marketplace = marketplace;
    this._isInstalled = isInstalled;

    try {
      const detail = await this._detailService.getPluginDetail(pluginName, marketplace, isInstalled);
      this._panel.title = `插件详情: ${pluginName}`;
      this.sendMessage({
        type: 'pluginDetail',
        payload: { plugin: detail }
      });
    } catch (error: any) {
      this.sendMessage({
        type: 'error',
        payload: { message: `加载插件详情失败: ${error.message}` }
      });
    }
  }

  /**
   * 处理来自 Webview 的消息
   */
  private async handleMessage(message: any): Promise<void> {
    switch (message.type) {
      case 'installPlugin':
        // 转发到主市场面板处理
        await vscode.commands.executeCommand('claudePluginMarketplace.install', message.payload);
        break;
      case 'uninstallPlugin':
        await vscode.commands.executeCommand('claudePluginMarketplace.uninstall', message.payload);
        break;
      case 'enablePlugin':
        await vscode.commands.executeCommand('claudePluginMarketplace.enable', message.payload);
        break;
      case 'disablePlugin':
        await vscode.commands.executeCommand('claudePluginMarketplace.disable', message.payload);
        break;
      case 'openExternal':
        vscode.env.openExternal(vscode.Uri.parse(message.payload.url));
        break;
      case 'copyToClipboard':
        await vscode.env.clipboard.writeText(message.payload.text);
        vscode.window.showInformationMessage('已复制到剪贴板');
        break;
    }
  }

  /**
   * 发送消息到 Webview
   */
  private sendMessage(message: any): void {
    this._panel.webview.postMessage(message);
  }

  /**
   * 释放资源
   */
  public dispose(): void {
    PluginDetailsPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) disposable.dispose();
    }
  }

  /**
   * 生成 Webview HTML 内容
   */
  private _getHtmlForWebview(): string {
    const scriptUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'webview', 'dist', 'webview.js')
    );

    const styleUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'webview', 'dist', 'webview.css')
    );

    // 设置初始状态，告诉 React 这是详情面板
    const initState = JSON.stringify({
      viewType: 'details',
      pluginName: this._pluginName,
      marketplace: this._marketplace
    });

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${this._panel.webview.cspSource}; style-src ${this._panel.webview.cspSource} 'unsafe-inline';">
  <link href="${styleUri}" rel="stylesheet">
  <title>插件详情</title>
</head>
<body>
  <div id="root"></div>
  <script>
    // 设置初始状态
    window.vscodeState = ${initState};
  </script>
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }
}
```

**Step 2: 编译检查**

Run: `cd vscode-extension && npm run compile`
Expected: 编译成功

**Step 3: 提交**

```bash
git add src/pluginMarketplace/webview/PluginDetailsPanel.ts
git commit -m "feat: add PluginDetailsPanel for showing plugin details"
```

---

## Task 4: 更新消息处理器支持 openDetails

**Files:**
- Modify: `src/pluginMarketplace/webview/messages/handlers.ts`

**Step 1: 修改 handleOpenDetails 方法**

替换现有的 `handleOpenDetails` 方法（约 557-575 行）：

```typescript
  /**
   * 打开插件详情页
   * 创建独立的详情 Panel
   */
  private async handleOpenDetails(payload: OpenDetailsPayload): Promise<void> {
    const { pluginName, marketplace } = payload;

    if (!this.extensionUri) {
      vscode.window.showErrorMessage('无法打开详情页：缺少扩展 URI');
      return;
    }

    // 动态导入 PluginDetailsPanel
    const { PluginDetailsPanel } = await import('../PluginDetailsPanel');

    // 检查插件是否已安装
    const allPlugins = await this.dataService.getAllAvailablePlugins();
    const plugin = allPlugins.find(p => p.name === pluginName && p.marketplace === marketplace);
    const isInstalled = plugin?.status.installed || false;

    // 获取扩展上下文
    const context = this.dataService.getContext();

    // 打开详情面板
    await PluginDetailsPanel.createOrShow(
      this.extensionUri,
      context,
      pluginName,
      marketplace,
      isInstalled
    );
  }
```

**Step 2: 编译检查**

Run: `cd vscode-extension && npm run compile`
Expected: 编译成功

**Step 3: 提交**

```bash
git add src/pluginMarketplace/webview/messages/handlers.ts
git commit -m "feat: update handleOpenDetails to open details panel"
```

---

## Task 5: 更新 PluginDataService 添加 getContext 方法

**Files:**
- Modify: `src/pluginMarketplace/webview/services/PluginDataService.ts`

**Step 1: 确认 getContext 方法存在**

检查 `PluginDataService` 类中是否有 `getContext()` 方法（约 318-321 行）。如果不存在，添加：

```typescript
  /**
   * 获取扩展上下文
   */
  getContext(): vscode.ExtensionContext {
    return this.context;
  }
```

**Step 2: 编译检查**

Run: `cd vscode-extension && npm run compile`
Expected: 编译成功

**Step 3: 如果添加了方法，提交**

```bash
git add src/pluginMarketplace/webview/services/PluginDataService.ts
git commit -m "feat: add getContext method to PluginDataService"
```

---

## Task 6: 创建详情页面 React 组件

**Files:**
- Create: `webview-app/src/details/DetailsApp.tsx`
- Create: `webview-app/src/details/DetailHeader.tsx`
- Create: `webview-app/src/details/DetailContent.tsx`
- Create: `webview-app/src/details/ComponentsSection.tsx`
- Create: `webview-app/src/details/ReadmeSection.tsx`

**Step 1: 创建 DetailsApp 主组件**

```typescript
// webview-app/src/details/DetailsApp.tsx

import React, { useState, useEffect } from 'react';
import { Spin, Alert, Button } from 'antd';
import { ReloadOutlined, LoadingOutlined } from '@ant-design/icons';
import vscode from '../main';
import { PluginDetailData } from '../../src/pluginMarketplace/webview/messages/types';
import DetailHeader from './DetailHeader';
import DetailContent from './DetailContent';

const DetailsApp: React.FC = () => {
  const [plugin, setPlugin] = useState<PluginDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取初始状态
  const getInitialState = () => {
    if (typeof window !== 'undefined' && (window as any).vscodeState) {
      return (window as any).vscodeState;
    }
    return null;
  };

  const initState = getInitialState();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case 'pluginDetail':
          setPlugin(message.payload.plugin);
          setLoading(false);
          setError(null);
          break;
        case 'error':
          setError(message.payload.message);
          setLoading(false);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleInstall = (scope: 'user' | 'project') => {
    if (!plugin) return;
    vscode.postMessage({
      type: 'installPlugin',
      payload: {
        pluginName: plugin.name,
        marketplace: plugin.marketplace,
        scope
      }
    });
  };

  const handleUninstall = () => {
    if (!plugin) return;
    vscode.postMessage({
      type: 'uninstallPlugin',
      payload: { pluginName: plugin.name }
    });
  };

  const handleEnable = () => {
    if (!plugin) return;
    vscode.postMessage({
      type: 'enablePlugin',
      payload: { pluginName: plugin.name, marketplace: plugin.marketplace }
    });
  };

  const handleDisable = () => {
    if (!plugin) return;
    vscode.postMessage({
      type: 'disablePlugin',
      payload: { pluginName: plugin.name, marketplace: plugin.marketplace }
    });
  };

  const handleOpenExternal = (url: string) => {
    vscode.postMessage({
      type: 'openExternal',
      payload: { url }
    });
  };

  const handleCopy = (text: string) => {
    vscode.postMessage({
      type: 'copyToClipboard',
      payload: { text }
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} tip="加载插件详情..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          type="error"
          message={error}
          action={
            <Button size="small" danger onClick={() => window.location.reload()}>
              <ReloadOutlined /> 重试
            </Button>
          }
          showIcon
        />
      </div>
    );
  }

  if (!plugin) {
    return (
      <div style={{ padding: 24 }}>
        <Alert message="未找到插件信息" type="warning" showIcon />
      </div>
    );
  }

  return (
    <div className="details-app">
      <DetailHeader
        plugin={plugin}
        onInstall={handleInstall}
        onUninstall={handleUninstall}
        onEnable={handleEnable}
        onDisable={handleDisable}
        onOpenExternal={handleOpenExternal}
        onCopy={handleCopy}
      />
      <DetailContent plugin={plugin} />
    </div>
  );
};

export default DetailsApp;
```

**Step 2: 创建 DetailHeader 组件**

```typescript
// webview-app/src/details/DetailHeader.tsx

import React from 'react';
import { Space, Tag, Button, Dropdown, Tooltip, Typography, Divider } from 'antd';
import {
  DeleteOutlined,
  DownloadOutlined,
  UserOutlined,
  FolderOutlined,
  GithubOutlined,
  LinkOutlined,
  CopyOutlined,
  CheckCircleFilled,
  StopOutlined,
  PoweroffOutlined,
  StarFilled
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { PluginDetailData } from '../../../src/pluginMarketplace/webview/messages/types';

const { Text, Title } = Typography;

interface DetailHeaderProps {
  plugin: PluginDetailData;
  onInstall: (scope: 'user' | 'project') => void;
  onUninstall: () => void;
  onEnable: () => void;
  onDisable: () => void;
  onOpenExternal: (url: string) => void;
  onCopy: (text: string) => void;
}

const scopeConfig = {
  user: { label: '用户', icon: <UserOutlined />, color: '#52c41a' },
  project: { label: '项目', icon: <FolderOutlined />, color: '#1890ff' },
  local: { label: '本地', icon: <FolderOutlined />, color: '#8c8c8c' }
} as const;

const DetailHeader: React.FC<DetailHeaderProps> = ({
  plugin,
  onInstall,
  onUninstall,
  onEnable,
  onDisable,
  onOpenExternal,
  onCopy
}) => {
  const isDisabled = plugin.installed && plugin.enabled === false;
  const scopeInfo = plugin.scope ? scopeConfig[plugin.scope] : null;

  const installMenuItems: MenuProps['items'] = [
    {
      key: 'user',
      label: '安装到用户',
      icon: <UserOutlined />,
      onClick: () => onInstall('user')
    },
    {
      key: 'project',
      label: '安装到项目',
      icon: <FolderOutlined />,
      onClick: () => onInstall('project')
    }
  ];

  const copyInstallCommand = () => {
    onCopy(`claude plugin install "${plugin.name}@${plugin.marketplace}"`);
  };

  return (
    <div className="detail-header">
      <div className="detail-header-top">
        <Space direction="vertical" size={4} style={{ flex: 1 }}>
          <Space size="middle">
            <Title level={3} style={{ margin: 0 }}>
              {plugin.name}
            </Title>
            <Tag color="blue">v{plugin.version}</Tag>
            {plugin.installed && !isDisabled && (
              <Tooltip title="已启用">
                <CheckCircleFilled style={{ color: '#52c41a', fontSize: 16 }} />
              </Tooltip>
            )}
            {isDisabled && (
              <Tooltip title="已禁用">
                <StopOutlined style={{ color: 'var(--vscode-descriptionForeground)', fontSize: 16 }} />
              </Tooltip>
            )}
          </Space>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {plugin.author && `作者: ${plugin.author} · `}
            来自 {plugin.marketplace}
            {plugin.repository?.stars && (
              <span>
                {' '}· <StarFilled style={{ color: '#faad14' }} /> {plugin.repository.stars}
              </span>
            )}
          </Text>
        </Space>

        <Space size="middle">
          {/* 外部链接按钮 */}
          {plugin.repository?.url && (
            <Tooltip title="打开仓库">
              <Button
                type="text"
                icon={<GithubOutlined />}
                onClick={() => onOpenExternal(plugin.repository!.url)}
              />
            </Tooltip>
          )}
          {plugin.homepage && plugin.homepage !== plugin.repository?.url && (
            <Tooltip title="打开主页">
              <Button
                type="text"
                icon={<LinkOutlined />}
                onClick={() => onOpenExternal(plugin.homepage!)}
              />
            </Tooltip>
          )}

          {/* 操作按钮 */}
          {plugin.installed ? (
            <Space size="small">
              <Tooltip title={isDisabled ? '启用' : '禁用'}>
                <Button
                  type={isDisabled ? 'primary' : 'default'}
                  size="small"
                  icon={<PoweroffOutlined />}
                  onClick={isDisabled ? onEnable : onDisable}
                >
                  {isDisabled ? '启用' : '禁用'}
                </Button>
              </Tooltip>
              {scopeInfo && (
                <Tag
                  icon={scopeInfo.icon}
                  style={{
                    borderRadius: 12,
                    padding: '2px 10px',
                    background: `${scopeInfo.color}15`,
                    color: scopeInfo.color,
                    border: `1px solid ${scopeInfo.color}30`
                  }}
                >
                  {scopeInfo.label}
                </Tag>
              )}
              <Tooltip title="复制安装命令">
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={copyInstallCommand}
                />
              </Tooltip>
              <Tooltip title="卸载">
                <Button
                  danger
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={onUninstall}
                />
              </Tooltip>
            </Space>
          ) : (
            <Dropdown.Button
              menu={{ items: installMenuItems }}
              icon={<DownloadOutlined />}
              onClick={() => onInstall('user')}
              type="primary"
              size="small"
            >
              安装
            </Dropdown.Button>
          )}
        </Space>
      </div>

      <Divider style={{ margin: '12px 0' }} />
    </div>
  );
};

export default DetailHeader;
```

**Step 3: 创建 DetailContent 组件**

```typescript
// webview-app/src/details/DetailContent.tsx

import React from 'react';
import { Typography, Empty } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { PluginDetailData } from '../../../src/pluginMarketplace/webview/messages/types';
import ComponentsSection from './ComponentsSection';
import ReadmeSection from './ReadmeSection';

const { Title, Paragraph, Text } = Typography;

interface DetailContentProps {
  plugin: PluginDetailData;
}

const DetailContent: React.FC<DetailContentProps> = ({ plugin }) => {
  return (
    <div className="detail-content">
      {/* 详细描述 */}
      {plugin.description && (
        <div className="detail-section">
          <Title level={5}>
            <FileTextOutlined /> 详细描述
          </Title>
          <Paragraph style={{ fontSize: 14 }}>
            {plugin.description}
          </Paragraph>
        </div>
      )}

      {/* 插件内容 */}
      <ComponentsSection plugin={plugin} />

      {/* README */}
      <ReadmeSection readme={plugin.readme} />

      {/* 元信息 */}
      {(plugin.dependencies?.length || plugin.license) && (
        <div className="detail-section">
          <Title level={5}>元信息</Title>
          {plugin.dependencies?.length && (
            <div>
              <Text type="secondary">依赖:</Text>
              <div style={{ marginTop: 4 }}>
                {plugin.dependencies.map(dep => (
                  <Tag key={dep} style={{ marginBottom: 4 }}>{dep}</Tag>
                ))}
              </div>
            </div>
          )}
          {plugin.license && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">许可证:</Text>
              <Tag style={{ marginLeft: 8 }}>{plugin.license}</Tag>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DetailContent;
```

**Step 4: 创建 ComponentsSection 组件**

```typescript
// webview-app/src/details/ComponentsSection.tsx

import React from 'react';
import { Typography, Empty, Collapse, Tag } from 'antd';
import {
  ThunderboltOutlined,
  HookOutlined,
  ApiOutlined,
  CodeOutlined
} from '@ant-design/icons';
import { PluginDetailData } from '../../../src/pluginMarketplace/webview/messages/types';

const { Title } = Typography;

const { Panel } = Collapse;

interface ComponentsSectionProps {
  plugin: PluginDetailData;
}

const ComponentsSection: React.FC<ComponentsSectionProps> = ({ plugin }) => {
  const hasSkills = plugin.skills?.length || 0;
  const hasHooks = plugin.hooks?.length || 0;
  const hasMcps = plugin.mcps?.length || 0;
  const hasCommands = plugin.commands?.length || 0;

  const total = hasSkills + hasHooks + hasMcps + hasCommands;

  if (total === 0) {
    return null;
  }

  return (
    <div className="detail-section">
      <Title level={5}>插件内容</Title>
      <Collapse
        ghost
        defaultActiveKey={['skills', 'hooks', 'mcps', 'commands']}
      >
        {hasSkills > 0 && (
          <Panel
            header={
              <span>
                <ThunderboltOutlined /> Skills ({hasSkills})
              </span>
            }
            key="skills"
          >
            {plugin.skills?.map(skill => (
              <div key={skill.name} style={{ marginBottom: 8 }}>
                <Tag color="blue">{skill.name}</Tag>
                <span style={{ marginLeft: 8 }}>{skill.description}</span>
                {skill.category && <Tag style={{ marginLeft: 8 }}>{skill.category}</Tag>}
              </div>
            ))}
          </Panel>
        )}

        {hasHooks > 0 && (
          <Panel
            header={
              <span>
                <HookOutlined /> Hooks ({hasHooks})
              </span>
            }
            key="hooks"
          >
            {plugin.hooks?.map(hook => (
              <div key={hook.name} style={{ marginBottom: 8 }}>
                <Tag color="purple">{hook.name}</Tag>
                <span style={{ marginLeft: 8 }}>{hook.description || ''}</span>
                {hook.events?.length && (
                  <div style={{ marginTop: 4, marginLeft: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--vscode-descriptionForeground)' }}>
                      事件: {hook.events.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </Panel>
        )}

        {hasMcps > 0 && (
          <Panel
            header={
              <span>
                <ApiOutlined /> MCPs ({hasMcps})
              </span>
            }
            key="mcps"
          >
            {plugin.mcps?.map(mcp => (
              <div key={mcp.name} style={{ marginBottom: 8 }}>
                <Tag color="green">{mcp.name}</Tag>
                <span style={{ marginLeft: 8 }}>{mcp.description || ''}</span>
              </div>
            ))}
          </Panel>
        )}

        {hasCommands > 0 && (
          <Panel
            header={
              <span>
                <CodeOutlined /> Commands ({hasCommands})
              </span>
            }
            key="commands"
          >
            {plugin.commands?.map(cmd => (
              <div key={cmd.name} style={{ marginBottom: 8 }}>
                <Tag color="orange">{cmd.name}</Tag>
                <span style={{ marginLeft: 8 }}>{cmd.description || ''}</span>
              </div>
            ))}
          </Panel>
        )}
      </Collapse>
    </div>
  );
};

export default ComponentsSection;
```

**Step 5: 创建 ReadmeSection 组件**

```typescript
// webview-app/src/details/ReadmeSection.tsx

import React, { useState } from 'react';
import { Typography, Empty, Button } from 'antd';
import { FileTextOutlined, EyeOutlined, CodeOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';

const { Title } = Typography;

interface ReadmeSectionProps {
  readme?: string;
}

const ReadmeSection: React.FC<ReadmeSectionProps> = ({ readme }) => {
  const [viewMode, setViewMode] = useState<'rendered' | 'raw'>('rendered');

  if (!readme) {
    return null;
  }

  return (
    <div className="detail-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={5}>
          <FileTextOutlined /> README
        </Title>
        <Button
          type="text"
          size="small"
          icon={viewMode === 'rendered' ? <CodeOutlined /> : <EyeOutlined />}
          onClick={() => setViewMode(viewMode === 'rendered' ? 'raw' : 'rendered')}
        >
          {viewMode === 'rendered' ? '查看源码' : '预览'}
        </Button>
      </div>
      <div className="readme-content">
        {viewMode === 'rendered' ? (
          <div className="markdown-body">
            <ReactMarkdown>{readme}</ReactMarkdown>
          </div>
        ) : (
          <pre
            style={{
              background: 'var(--vscode-textBlockQuote-background)',
              padding: 16,
              borderRadius: 4,
              overflow: 'auto',
              fontSize: 13
            }}
          >
            {readme}
          </pre>
        )}
      </div>
    </div>
  );
};

export default ReadmeSection;
```

**Step 6: 安装 react-markdown 依赖**

Run: `cd webview-app && npm install react-markdown`
Expected: 依赖安装成功

**Step 7: 编译检查**

Run: `cd webview-app && npm run build`
Expected: 构建成功，生成 `dist/webview.js` 和 `dist/webview.css`

**Step 8: 提交**

```bash
git add webview-app/src/details/ webview-app/package.json webview-app/package-lock.json
git commit -m "feat: add details view components"
```

---

## Task 7: 更新主 App 组件支持路由

**Files:**
- Modify: `webview-app/src/App.tsx`
- Modify: `webview-app/src/main.tsx`

**Step 1: 更新 main.tsx 传递初始状态**

修改 `webview-app/src/main.tsx`：

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import App from './App';
import './index.css';
import { antdTheme } from './theme/antd-theme';

declare const acquireVsCodeApi: () => any;
const vscode = acquireVsCodeApi();

// 获取初始状态
const getInitialState = () => {
  if (typeof window !== 'undefined' && (window as any).vscodeState) {
    return (window as any).vscodeState;
  }
  return { viewType: 'marketplace' };
};

const initialState = getInitialState();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider theme={antdTheme}>
      <App initialState={initialState} />
    </ConfigProvider>
  </React.StrictMode>
);

export default vscode;
```

**Step 2: 更新 App.tsx 支持路由**

修改 `webview-app/src/App.tsx`，添加 props 并根据 viewType 渲染不同组件：

```typescript
// 在文件顶部添加导入
import DetailsApp from './details/DetailsApp';

// 修改 App 组件签名
interface AppProps {
  initialState?: { viewType: string; pluginName?: string; marketplace?: string };
}

const App: React.FC<AppProps> = ({ initialState }) => {
  // 获取初始 viewType
  const getViewType = () => {
    if (initialState?.viewType) {
      return initialState.viewType;
    }
    // 尝试从 window.vscodeState 获取
    if (typeof window !== 'undefined' && (window as any).vscodeState) {
      return (window as any).vscodeState.viewType || 'marketplace';
    }
    return 'marketplace';
  };

  const [viewType] = useState(getViewType());

  // 根据 viewType 渲染不同组件
  if (viewType === 'details') {
    return <DetailsApp />;
  }

  // 原有的市场面板代码
  const [state, setState] = useState<AppState>({
    // ... 保持原有代码
  });

  // ... 保持原有代码
};
```

**Step 3: 编译检查**

Run: `cd webview-app && npm run build`
Expected: 构建成功

**Step 4: 提交**

```bash
git add webview-app/src/App.tsx webview-app/src/main.tsx
git commit -m "feat: add routing support for marketplace and details views"
```

---

## Task 8: 添加详情面板样式

**Files:**
- Create: `webview-app/src/details/details.css`

**Step 1: 创建详情面板样式文件**

```css
/* webview-app/src/details/details.css */

.details-app {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.detail-header {
  margin-bottom: 24px;
}

.detail-header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.detail-section {
  padding: 16px;
  background: var(--vscode-editor-background);
  border-radius: 8px;
  border: 1px solid var(--vscode-panel-border);
}

.detail-section h5 {
  margin-bottom: 12px !important;
  color: var(--vscode-foreground) !important;
  display: flex;
  align-items: center;
  gap: 8px;
}

.readme-content {
  margin-top: 12px;
}

.markdown-body {
  font-size: 14px;
  line-height: 1.6;
}

.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4,
.markdown-body h5,
.markdown-body h6 {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
}

.markdown-body h1 {
  font-size: 2em;
  border-bottom: 1px solid var(--vscode-panel-border);
  padding-bottom: 0.3em;
}

.markdown-body h2 {
  font-size: 1.5em;
  border-bottom: 1px solid var(--vscode-panel-border);
  padding-bottom: 0.3em;
}

.markdown-body code {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background: var(--vscode-textBlockQuote-background);
  border-radius: 6px;
}

.markdown-body pre {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background: var(--vscode-textBlockQuote-background);
  border-radius: 6px;
}

.markdown-body pre code {
  padding: 0;
  background: transparent;
}

.markdown-body ul,
.markdown-body ol {
  padding-left: 2em;
}

.markdown-body a {
  color: var(--vscode-textLink-foreground);
  text-decoration: none;
}

.markdown-body a:hover {
  text-decoration: underline;
}

.markdown-body img {
  max-width: 100%;
  box-sizing: content-box;
}

.markdown-body table {
  border-spacing: 0;
  border-collapse: collapse;
  margin-top: 0;
  margin-bottom: 16px;
}

.markdown-body table th,
.markdown-body table td {
  padding: 6px 13px;
  border: 1px solid var(--vscode-panel-border);
}

.markdown-body table th {
  font-weight: 600;
  background: var(--vscode-textBlockQuote-background);
}

@media (max-width: 768px) {
  .details-app {
    padding: 16px;
  }

  .detail-header-top {
    flex-direction: column;
  }
}
```

**Step 2: 在 DetailsApp 中导入样式**

修改 `webview-app/src/details/DetailsApp.tsx`，添加样式导入：

```typescript
// 在文件顶部添加
import '../details/details.css';
```

**Step 3: 编译检查**

Run: `cd webview-app && npm run build`
Expected: 构建成功

**Step 4: 提交**

```bash
git add webview-app/src/details/details.css
git commit -m "feat: add styles for details panel"
```

---

## Task 9: 构建和测试

**Files:**
- Build artifacts

**Step 1: 构建完整项目**

Run: `cd vscode-extension && npm run build-webview`
Expected: webview 构建成功，生成 `webview/dist/` 文件

**Step 2: 编译 extension**

Run: `cd vscode-extension && npm run compile`
Expected: TypeScript 编译成功，无错误

**Step 3: 测试详情面板**

1. 按 F5 启动扩展开发主机
2. 打开插件市场面板
3. 点击任意插件卡片
4. 验证详情面板在 Editor 区域打开
5. 验证详情内容正确显示
6. 测试安装/卸载/启用/禁用操作
7. 测试复制命令功能
8. 测试外部链接功能

**Step 4: 提交构建产物**

```bash
git add webview/dist/
git commit -m "build: update webview dist with details panel support"
```

---

## Task 10: 更新类型导入路径

**Files:**
- Modify: `webview-app/src/details/DetailsApp.tsx`
- Modify: `webview-app/src/details/DetailHeader.tsx`
- Modify: `webview-app/src/details/DetailContent.tsx`
- Modify: `webview-app/src/details/ComponentsSection.tsx`

**Step 1: 修复类型导入路径**

由于 webview-app 无法直接导入 extension 的类型文件，需要创建共享类型文件或直接定义接口。

在每个 detail 组件文件中，替换类型导入：

```typescript
// 移除这行
import { PluginDetailData } from '../../../src/pluginMarketplace/webview/messages/types';

// 添加本地类型定义
export interface PluginDetailData {
  name: string;
  description: string;
  version: string;
  author?: string;
  homepage?: string;
  category?: string;
  marketplace: string;
  installed: boolean;
  enabled?: boolean;
  scope?: 'user' | 'project' | 'local';
  updateAvailable?: boolean;
  readme?: string;
  skills?: SkillInfo[];
  hooks?: HookInfo[];
  mcps?: McpInfo[];
  commands?: CommandInfo[];
  repository?: RepositoryInfo;
  dependencies?: string[];
  license?: string;
}

export interface SkillInfo {
  name: string;
  description: string;
  category?: string;
}

export interface HookInfo {
  name: string;
  events: string[];
  description?: string;
}

export interface McpInfo {
  name: string;
  description?: string;
}

export interface CommandInfo {
  name: string;
  description?: string;
}

export interface RepositoryInfo {
  type: 'github' | 'gitlab' | 'other';
  url: string;
  stars?: number;
}
```

**Step 2: 编译检查**

Run: `cd webview-app && npm run build`
Expected: 构建成功

**Step 3: 提交**

```bash
git add webview-app/src/details/
git commit -m "fix: add local type definitions for detail components"
```

---

## 完成检查清单

- [ ] 详情面板可以通过点击插件卡片打开
- [ ] 详情面板在 Editor 区域作为独立标签页显示
- [ ] 已安装插件显示本地读取的详细信息
- [ ] 未安装插件显示从市场源获取的信息
- [ ] README 正确渲染（支持 Markdown 和源码切换）
- [ ] Skills/Hooks/MCPs/Commands 正确显示
- [ ] 安装/卸载/启用/禁用操作正常工作
- [ ] 复制命令功能正常
- [ ] 外部链接在浏览器中打开
- [ ] 样式与 VS Code 主题一致
