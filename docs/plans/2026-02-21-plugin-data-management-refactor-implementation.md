# 插件数据管理重构实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 重构插件数据管理系统，实现分层加载、精确缓存失效和事件驱动的数据更新

**Architecture:** 集中式 Store + 事件系统架构，单一数据源（PluginDataStore），懒加载详情，精确缓存失效

**Tech Stack:** TypeScript, Node.js, VS Code Extension API, EventEmitter

---

## Task 1: 创建核心数据结构和事件定义

**Files:**
- Create: `src/pluginMarketplace/data/types.ts`
- Create: `src/pluginMarketplace/data/events.ts`

**Step 1: 创建数据类型定义文件**

```typescript
// src/pluginMarketplace/data/types.ts

import { PluginDetailData } from '../webview/messages/types';

// 市场信息
export interface MarketplaceInfo {
  name: string;
  source: {
    source: 'github' | 'url';
    repo?: string;
    url?: string;
  };
  path?: string;
}

// 插件基本信息（用于列表展示）
export interface PluginInfo {
  name: string;
  description: string;
  version: string;
  author?: string;
  homepage?: string;
  category?: string;
  marketplace: string;
  installed: boolean;
  enabled?: boolean;
  scope?: 'user' | 'project';
  stars?: number;
}

// 插件安装状态
export interface InstalledStatus {
  installed: boolean;
  enabled: boolean;
  scope?: 'user' | 'project';
}

// 插件详情缓存条目
export interface DetailCacheEntry {
  data: PluginDetailData;
  timestamp: number;
}

// Store 事件类型
export enum StoreEvent {
  MarketplaceChange = 'marketplaceChange',
  PluginStatusChange = 'pluginStatusChange',
  PluginDetailUpdate = 'pluginDetailUpdate',
}

// 插件状态变更事件
export interface PluginStatusChangeEvent {
  pluginName: string;
  marketplace: string;
  change: 'installed' | 'uninstalled' | 'enabled' | 'disabled';
}

// 插件详情更新事件
export interface PluginDetailUpdateEvent {
  pluginName: string;
  marketplace: string;
  updates: Partial<PluginDetailData>;
}
```

**Step 2: 创建事件发射器类**

```typescript
// src/pluginMarketplace/data/events.ts

import { EventEmitter } from 'events';
import { Disposable } from 'vscode';
import { StoreEvent, PluginStatusChangeEvent, PluginDetailUpdateEvent } from './types';

class StoreEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // 支持多个监听器
  }

  // 发射市场变更事件
  emitMarketplaceChange() {
    this.emit(StoreEvent.MarketplaceChange);
  }

  // 发射插件状态变更事件
  emitPluginStatusChange(event: PluginStatusChangeEvent) {
    this.emit(StoreEvent.PluginStatusChange, event);
  }

  // 发射插件详情更新事件
  emitPluginDetailUpdate(event: PluginDetailUpdateEvent) {
    this.emit(StoreEvent.PluginDetailUpdate, event);
  }

  // 订阅事件，返回 VS Code Disposable
  onEvent(event: StoreEvent, callback: (...args: any[]) => void): Disposable {
    this.on(event, callback);
    return new Disposable(() => this.off(event, callback));
  }
}

// 单例导出
export const storeEvents = new StoreEventEmitter();
```

**Step 3: 编译验证**

Run: `npm run compile`
Expected: Success, no type errors

**Step 4: 提交**

```bash
git add src/pluginMarketplace/data/types.ts src/pluginMarketplace/data/events.ts
git commit -m "feat: add data types and event system for plugin store refactor"
```

---

## Task 2: 创建 DataLoader - 数据加载器

**Files:**
- Create: `src/pluginMarketplace/data/DataLoader.ts`

**Step 1: 编写 DataLoader 基础结构和市场加载方法**

```typescript
// src/pluginMarketplace/data/DataLoader.ts

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { execClaudeCommand, InstalledPlugin } from '../types';
import { MarketplaceInfo, PluginInfo } from './types';

/**
 * 数据加载器
 * 负责从文件系统和 CLI 加载数据
 */
export class DataLoader {
  constructor(private context: vscode.ExtensionContext) {}

  /**
   * 加载已安装插件列表
   */
  async loadInstalledPlugins(): Promise<InstalledPlugin[]> {
    const result = await execClaudeCommand('plugin list --json');

    if (result.status !== 'success') {
      throw new Error(result.error || 'Failed to list installed plugins');
    }

    return result.data?.plugins || [];
  }

  /**
   * 加载市场列表
   */
  async loadMarketplaces(): Promise<MarketplaceInfo[]> {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (!homeDir) {
      return [];
    }

    const knownMarketplacesPath = path.join(homeDir, '.claude', 'plugins', 'known_marketplaces.json');

    try {
      const content = await fs.readFile(knownMarketplacesPath, 'utf-8');
      const data = JSON.parse(content);
      return data.marketplaces || [];
    } catch (error) {
      console.error('[DataLoader] Failed to load known_marketplaces.json:', error);
      return [];
    }
  }

  /**
   * 加载指定市场的插件列表
   */
  async loadPluginList(marketplace: MarketplaceInfo): Promise<PluginInfo[]> {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (!homeDir) {
      return [];
    }

    const marketplacePath = path.join(homeDir, '.claude', 'plugins', 'marketplaces', marketplace.name);
    const marketplaceJsonPath = path.join(marketplacePath, '.claude-plugin', 'marketplace.json');

    try {
      const content = await fs.readFile(marketplaceJsonPath, 'utf-8');
      const config = JSON.parse(content);

      return (config.plugins || []).map((p: any) => ({
        name: p.name,
        description: p.description || '',
        version: p.version || '0.0.0',
        author: p.author,
        homepage: p.homepage,
        category: p.category,
        marketplace: marketplace.name,
        installed: false, // 后续会更新
      }));
    } catch (error) {
      console.error(`[DataLoader] Failed to load plugins for ${marketplace.name}:`, error);
      return [];
    }
  }
}
```

**Step 2: 编译验证**

Run: `npm run compile`
Expected: Success

**Step 3: 编写 DataLoader 的插件详情解析方法（从现有代码迁移）**

首先，我需要读取现有的 PluginDetailsService 以复用解析逻辑：

(在实现计划中，我们会直接迁移现有的解析方法，这里不展开完整代码，计划中会标注"从 PluginDetailsService.ts:712-839 迁移 parseSkills 方法")

**Step 4: 提交**

```bash
git add src/pluginMarketplace/data/DataLoader.ts
git commit -m "feat: add DataLoader with marketplace and plugin list loading"
```

---

## Task 3: 创建 PluginDataStore 核心类

**Files:**
- Create: `src/pluginMarketplace/data/PluginDataStore.ts`

**Step 1: 编写 PluginDataStore 基础结构**

```typescript
// src/pluginMarketplace/data/PluginDataStore.ts

import * as vscode from 'vscode';
import { DataLoader } from './DataLoader';
import {
  MarketplaceInfo,
  PluginInfo,
  InstalledStatus,
  DetailCacheEntry,
  StoreEvent,
  PluginStatusChangeEvent,
} from './types';
import { storeEvents } from './events';
import { execClaudeCommand } from '../types';

/**
 * 插件数据存储
 * 单一数据源，管理所有插件数据
 */
export class PluginDataStore {
  // 内存缓存
  private marketplaces = new Map<string, MarketplaceInfo>();
  private pluginList = new Map<string, PluginInfo[]>(); // marketplace -> plugins
  private installedStatus = new Map<string, InstalledStatus>(); // "name@marketplace" -> status
  private pluginDetails = new Map<string, DetailCacheEntry>(); // "name@marketplace" -> detail
  private pendingRequests = new Map<string, Promise<any>>();

  // 缓存配置
  private readonly DETAIL_CACHE_TTL = 5 * 60 * 1000; // 5 分钟

  private dataLoader: DataLoader;
  private isInitialized = false;

  constructor(private context: vscode.ExtensionContext) {
    this.dataLoader = new DataLoader(context);
  }

  /**
   * 初始化 Store
   * 加载启动时需要的数据
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('[PluginDataStore] Initializing...');

    // 并行加载市场列表和已安装插件
    const [marketplaces, installedPlugins] = await Promise.all([
      this.dataLoader.loadMarketplaces(),
      this.dataLoader.loadInstalledPlugins(),
    ]);

    // 存储市场列表
    for (const market of marketplaces) {
      this.marketplaces.set(market.name, market);
    }

    // 存储已安装插件状态
    for (const plugin of installedPlugins) {
      const key = `${plugin.name}@${plugin.marketplace}`;
      this.installedStatus.set(key, {
        installed: true,
        enabled: plugin.enabled ?? true,
        scope: plugin.scope,
      });
    }

    // 加载所有市场的插件列表
    await this.loadAllPluginLists();

    // 更新插件列表中的安装状态
    this.syncInstalledStatus();

    this.isInitialized = true;
    console.log('[PluginDataStore] Initialization complete');
  }

  /**
   * 加载所有市场的插件列表
   */
  private async loadAllPluginLists(): Promise<void> {
    const promises = Array.from(this.marketplaces.values()).map((market) =>
      this.loadMarketplacePluginList(market.name)
    );
    await Promise.all(promises);
  }

  /**
   * 加载指定市场的插件列表
   */
  private async loadMarketplacePluginList(marketplaceName: string): Promise<void> {
    const market = this.marketplaces.get(marketplaceName);
    if (!market) {
      return;
    }

    const plugins = await this.dataLoader.loadPluginList(market);
    this.pluginList.set(marketplaceName, plugins);
  }

  /**
   * 同步插件列表中的安装状态
   */
  private syncInstalledStatus(): void {
    for (const [marketplace, plugins] of this.pluginList.entries()) {
      for (const plugin of plugins) {
        const key = `${plugin.name}@${marketplace}`;
        const status = this.installedStatus.get(key);
        if (status) {
          plugin.installed = status.installed;
          plugin.enabled = status.enabled;
          plugin.scope = status.scope;
        }
      }
    }
  }

  /**
   * 获取所有市场
   */
  getMarketplaces(): MarketplaceInfo[] {
    return Array.from(this.marketplaces.values());
  }

  /**
   * 获取插件列表
   */
  getPluginList(marketplace?: string): PluginInfo[] {
    if (marketplace) {
      return this.pluginList.get(marketplace) || [];
    }
    const all: PluginInfo[] = [];
    for (const plugins of this.pluginList.values()) {
      all.push(...plugins);
    }
    return all;
  }

  /**
   * 更新安装状态
   */
  private updateInstalledStatus(pluginName: string, status: Partial<InstalledStatus>): void {
    // 查找该插件在哪个市场
    for (const [marketplace, plugins] of this.pluginList.entries()) {
      const plugin = plugins.find(p => p.name === pluginName);
      if (plugin) {
        const key = `${pluginName}@${marketplace}`;
        const current = this.installedStatus.get(key) || { installed: false, enabled: true };
        this.installedStatus.set(key, { ...current, ...status });
        plugin.installed = status.installed ?? current.installed;
        plugin.enabled = status.enabled ?? current.enabled;
        plugin.scope = status.scope ?? current.scope;
        break;
      }
    }
  }

  /**
   * 安装插件
   */
  async installPlugin(pluginName: string, marketplace: string, scope: 'user' | 'project' = 'user'): Promise<void> {
    await execClaudeCommand(`plugin install "${pluginName}@${marketplace}" --${scope}`);

    // 更新缓存
    this.updateInstalledStatus(pluginName, { installed: true, enabled: true, scope });

    // 发射事件
    storeEvents.emitPluginStatusChange({
      pluginName,
      marketplace,
      change: 'installed',
    });
  }

  /**
   * 卸载插件
   */
  async uninstallPlugin(pluginName: string): Promise<void> {
    await execClaudeCommand(`plugin uninstall "${pluginName}"`);

    // 更新缓存
    this.updateInstalledStatus(pluginName, { installed: false, enabled: false });

    // 找到市场名称
    const marketplace = this.findPluginMarketplace(pluginName);
    if (marketplace) {
      // 发射事件
      storeEvents.emitPluginStatusChange({
        pluginName,
        marketplace,
        change: 'uninstalled',
      });
    }
  }

  /**
   * 启用插件
   */
  async enablePlugin(pluginName: string, marketplace: string): Promise<void> {
    await execClaudeCommand(`plugin enable "${pluginName}@${marketplace}"`);

    // 更新缓存
    this.updateInstalledStatus(pluginName, { enabled: true });

    // 发射事件
    storeEvents.emitPluginStatusChange({
      pluginName,
      marketplace,
      change: 'enabled',
    });
  }

  /**
   * 禁用插件
   */
  async disablePlugin(pluginName: string, marketplace: string): Promise<void> {
    await execClaudeCommand(`plugin disable "${pluginName}@${marketplace}"`);

    // 更新缓存
    this.updateInstalledStatus(pluginName, { enabled: false });

    // 发射事件
    storeEvents.emitPluginStatusChange({
      pluginName,
      marketplace,
      change: 'disabled',
    });
  }

  /**
   * 查找插件所属市场
   */
  private findPluginMarketplace(pluginName: string): string | undefined {
    for (const [marketplace, plugins] of this.pluginList.entries()) {
      if (plugins.find(p => p.name === pluginName)) {
        return marketplace;
      }
    }
    return undefined;
  }

  /**
   * 订阅事件
   */
  on(event: StoreEvent, callback: (...args: any[]) => void): vscode.Disposable {
    return storeEvents.onEvent(event, callback);
  }
}
```

**Step 2: 编译验证**

Run: `npm run compile`
Expected: Success

**Step 3: 提交**

```bash
git add src/pluginMarketplace/data/PluginDataStore.ts
git commit -m "feat: add PluginDataStore with basic functionality"
```

---

## Task 4: 实现插件详情加载和缓存

**Files:**
- Modify: `src/pluginMarketplace/data/PluginDataStore.ts`
- Modify: `src/pluginMarketplace/data/DataLoader.ts`

**Step 1: 在 DataLoader 中添加详情解析方法**

```typescript
// 在 DataLoader.ts 中添加

import { PluginDetailData } from '../webview/messages/types';

// ... 现有代码 ...

/**
 * 获取插件详情
 */
async getPluginDetail(
  pluginName: string,
  marketplace: string,
  isInstalled: boolean
): Promise<PluginDetailData> {
  // 迁移自 PluginDetailsService 的逻辑
  // 这里会调用 parseSkills, parseAgents 等方法
  // 完整实现会在实际执行时从现有代码迁移
  throw new Error('Not implemented yet');
}

/**
 * 获取 GitHub stars（异步，不阻塞）
 */
async fetchGitHubStars(owner: string, repo: string): Promise<number> {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (response.ok) {
      const data = (await response.json()) as { stargazers_count?: number };
      return data.stargazers_count || 0;
    }
  } catch {
    // 忽略错误
  }
  return 0;
}
```

**Step 2: 在 PluginDataStore 中添加详情获取方法**

```typescript
// 在 PluginDataStore.ts 中添加

import { PluginDetailData } from '../webview/messages/types';

// ... 现有代码 ...

/**
 * 获取插件详情（带缓存和请求去重）
 */
async getPluginDetail(pluginName: string, marketplace: string): Promise<PluginDetailData> {
  const key = `${pluginName}@${marketplace}`;

  // 检查缓存
  const cached = this.pluginDetails.get(key);
  if (cached && Date.now() - cached.timestamp < this.DETAIL_CACHE_TTL) {
    return cached.data;
  }

  // 检查是否有进行中的请求
  if (this.pendingRequests.has(key)) {
    return this.pendingRequests.get(key)!;
  }

  // 启动新请求
  const promise = this.fetchPluginDetail(pluginName, marketplace);
  this.pendingRequests.set(key, promise);

  try {
    const result = await promise;
    return result;
  } finally {
    this.pendingRequests.delete(key);
  }
}

/**
 * 获取插件详情（实际加载逻辑）
 */
private async fetchPluginDetail(
  pluginName: string,
  marketplace: string
): Promise<PluginDetailData> {
  const key = `${pluginName}@${marketplace}`;
  const status = this.installedStatus.get(key);
  const isInstalled = status?.installed ?? false;

  const data = await this.dataLoader.getPluginDetail(pluginName, marketplace, isInstalled);

  // 更新缓存
  this.pluginDetails.set(key, {
    data,
    timestamp: Date.now(),
  });

  // 如果是 GitHub 插件，异步获取 stars
  this.fetchStarsAsync(pluginName, marketplace, data);

  return data;
}

/**
 * 异步获取 stars
 */
private fetchStarsAsync(pluginName: string, marketplace: string, data: PluginDetailData): void {
  if (data.repository?.type !== 'github') {
    return;
  }

  // 解析 GitHub 仓库
  const url = data.repository.url;
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) {
    return;
  }

  const [, owner, repo] = match;

  // 后台获取
  this.dataLoader
    .fetchGitHubStars(owner, repo.replace('.git', ''))
    .then((stars) => {
      // 更新缓存中的数据
      const key = `${pluginName}@${marketplace}`;
      const cached = this.pluginDetails.get(key);
      if (cached) {
        cached.data = { ...cached.data, stars };
        // 发射更新事件
        storeEvents.emitPluginDetailUpdate({
          pluginName,
          marketplace,
          updates: { stars },
        });
      }
    })
    .catch((err) => {
      console.error(`[PluginDataStore] Failed to fetch stars for ${pluginName}:`, err);
    });
}

/**
 * 使插件详情缓存失效
 */
invalidatePluginDetail(pluginName: string, marketplace?: string): void {
  if (marketplace) {
    this.pluginDetails.delete(`${pluginName}@${marketplace}`);
  } else {
    // 清除所有市场的该插件缓存
    for (const key of this.pluginDetails.keys()) {
      if (key.startsWith(`${pluginName}@`)) {
        this.pluginDetails.delete(key);
      }
    }
  }
}
```

**Step 3: 编译验证**

Run: `npm run compile`
Expected: Success

**Step 4: 提交**

```bash
git add src/pluginMarketplace/data/PluginDataStore.ts src/pluginMarketplace/data/DataLoader.ts
git commit -m "feat: add plugin detail loading with cache and request deduplication"
```

---

## Task 5: 在 extension.ts 中初始化 PluginDataStore

**Files:**
- Modify: `src/extension.ts`

**Step 1: 读取现有 extension.ts**

Run: `Read src/extension.ts`

**Step 2: 修改 extension.ts 以使用新的 PluginDataStore**

在 extension.ts 中：
1. 导入 PluginDataStore
2. 在 activate 函数中创建并初始化 Store
3. 将 Store 传递给需要它的组件

```typescript
// 在 extension.ts 顶部添加
import { PluginDataStore } from './pluginMarketplace/data/PluginDataStore';

// 在 activate 函数中
export async function activate(context: vscode.ExtensionContext) {
  // ... 现有代码 ...

  // 初始化数据存储
  const dataStore = new PluginDataStore(context);
  await dataStore.initialize();

  // 将 dataStore 存储在 context 中，供其他组件使用
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.getDataStore', () => dataStore)
  );

  // ... 后续代码 ...
}
```

**Step 3: 编译验证**

Run: `npm run compile`
Expected: Success

**Step 4: 提交**

```bash
git add src/extension.ts
git commit -m "feat: initialize PluginDataStore in extension activation"
```

---

## Task 6: 更新 PluginTreeProvider 使用 Store 事件

**Files:**
- Modify: `src/pluginMarketplace/pluginTreeProvider.ts`

**Step 1: 读取现有的 PluginTreeProvider**

Run: `Read src/pluginMarketplace/pluginTreeProvider.ts`

**Step 2: 修改 PluginTreeProvider 订阅 Store 事件**

使 PluginTreeProvider 在插件状态变更时自动刷新：

```typescript
// 在 PluginTreeProvider 中添加事件监听

private disposables: vscode.Disposable[] = [];

constructor(
  private context: vscode.ExtensionContext,
  private dataStore: PluginDataStore
) {
  // 订阅插件状态变更事件
  this.disposables.push(
    dataStore.on(StoreEvent.PluginStatusChange, () => {
      this.refresh();
    })
  );
}

dispose() {
  for (const d of this.disposables) {
    d.dispose();
  }
}

private _onDidChangeTreeData = new vscode.EventEmitter<PluginTreeItem | undefined | null | void>();
readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

refresh(): void {
  this._onDidChangeTreeData.fire();
}
```

**Step 3: 编译验证**

Run: `npm run compile`
Expected: Success

**Step 4: 提交**

```bash
git add src/pluginMarketplace/pluginTreeProvider.ts
git commit -m "feat: make PluginTreeProvider listen to Store events"
```

---

## Task 7: 更新 MessageHandlers 使用 PluginDataStore

**Files:**
- Modify: `src/pluginMarketplace/webview/messages/handlers.ts`

**Step 1: 读取现有的 handlers.ts**

Run: `Read src/pluginMarketplace/webview/messages/handlers.ts`

**Step 2: 修改 handlers 使用 PluginDataStore**

替换现有的 PluginDataService 调用为 PluginDataStore 调用：

```typescript
// 在 handlers.ts 中
import { PluginDataStore } from '../../data/PluginDataStore';

// 修改构造函数接收 dataStore
constructor(
  private context: vscode.ExtensionContext,
  private dataStore: PluginDataStore,
  private panel: WebviewPanel
) {
  // ... 现有代码 ...
}

// 修改安装处理
private async handleInstallPlugin(params: any): Promise<void> {
  const { pluginName, marketplace, scope } = params;

  try {
    await this.dataStore.installPlugin(pluginName, marketplace, scope);

    this.postMessage({
      type: 'installSuccess',
      data: { pluginName, marketplace }
    });
  } catch (error) {
    this.postMessage({
      type: 'installError',
      data: { pluginName, error: String(error) }
    });
  }
}

// 类似地更新 uninstallPlugin, enablePlugin, disablePlugin
```

**Step 3: 编译验证**

Run: `npm run compile`
Expected: Success

**Step 4: 提交**

```bash
git add src/pluginMarketplace/webview/messages/handlers.ts
git commit -m "feat: update MessageHandlers to use PluginDataStore"
```

---

## Task 8: 更新 PluginDetailsPanel 使用 Store 和监听事件

**Files:**
- Modify: `src/pluginMarketplace/webview/PluginDetailsPanel.ts`

**Step 1: 读取现有的 PluginDetailsPanel.ts**

Run: `Read src/pluginMarketplace/webview/PluginDetailsPanel.ts`

**Step 2: 修改 PluginDetailsPanel 订阅详情更新事件**

```typescript
// 在 PluginDetailsPanel 中添加

import { StoreEvent } from '../../data/events';
import { PluginDetailUpdateEvent } from '../../data/types';

private disposables: vscode.Disposable[] = [];

constructor(...) {
  // ... 现有代码 ...

  // 订阅详情更新事件（如 stars 加载完成）
  this.disposables.push(
    dataStore.on(StoreEvent.PluginDetailUpdate, (event: PluginDetailUpdateEvent) => {
      // 如果是当前显示的插件，发送更新到 webview
      if (event.pluginName === this.pluginName && event.marketplace === this.marketplace) {
        this.postMessage({
          type: 'detailUpdate',
          data: event.updates
        });
      }
    })
  );

  // 订阅状态变更事件
  this.disposables.push(
    dataStore.on(StoreEvent.PluginStatusChange, (event) => {
      if (event.pluginName === this.pluginName) {
        this.postMessage({
          type: 'statusUpdate',
          data: { change: event.change }
        });
      }
    })
  );
}

dispose() {
  for (const d of this.disposables) {
    d.dispose();
  }
  // ... 现有 dispose 代码 ...
}
```

**Step 3: 编译验证**

Run: `npm run compile`
Expected: Success

**Step 4: 提交**

```bash
git add src/pluginMarketplace/webview/PluginDetailsPanel.ts
git commit -m "feat: make PluginDetailsPanel listen to Store events"
```

---

## Task 9: 迁移详情解析逻辑到 DataLoader

**Files:**
- Modify: `src/pluginMarketplace/data/DataLoader.ts`

**Step 1: 迁移解析方法**

从 `PluginDetailsService.ts` 迁移以下方法到 `DataLoader`:
- `parseSkills` (行 712-740)
- `parseAgents` (行 842-886)
- `parseCommands` (行 910-951)
- `parseHooks` (行 979-1018)
- `parseMcps` (行 1050-1082)
- `parseLsps` (行 1120-1152)
- `parseOutputStyles` (行 1183-1226)
- `readReadme` (行 596-615)
- `getPluginPath` (行 470-590)

**Step 2: 实现 getPluginDetail 方法**

```typescript
async getPluginDetail(
  pluginName: string,
  marketplace: string,
  isInstalled: boolean
): Promise<PluginDetailData> {
  // 获取插件路径
  const pluginPath = isInstalled
    ? await this.getPluginPath(pluginName)
    : await this.getLocalMarketPath(pluginName, marketplace);

  if (!pluginPath) {
    // 如果找不到本地路径，返回基本信息
    return this.getBasicPluginDetail(pluginName, marketplace);
  }

  // 读取配置和 README
  const configJson = await this.readPluginConfig(pluginPath);
  const readme = await this.readReadme(pluginPath);

  // 并行解析所有内容
  const [skills, agents, commands, hooks, mcps, lsps, outputStyles] = await Promise.all([
    this.parseSkills(pluginPath, configJson),
    this.parseAgents(pluginPath, configJson),
    this.parseCommands(pluginPath, configJson),
    this.parseHooks(pluginPath, configJson),
    this.parseMcps(pluginPath, configJson),
    this.parseLsps(pluginPath, configJson),
    this.parseOutputStyles(pluginPath, configJson),
  ]);

  // 返回详情数据
  return {
    name: configJson?.name || pluginName,
    description: configJson?.description || '',
    version: configJson?.version || '0.0.0',
    // ... 其他字段
    readme,
    skills,
    agents,
    commands,
    hooks,
    mcps,
    lsps,
    outputStyles,
    // ...
  };
}
```

**Step 3: 编译验证**

Run: `npm run compile`
Expected: Success

**Step 4: 提交**

```bash
git add src/pluginMarketplace/data/DataLoader.ts
git commit -m "feat: migrate detail parsing logic to DataLoader"
```

---

## Task 10: 删除或重构旧的 CacheManager

**Files:**
- Modify: `src/pluginMarketplace/webview/services/CacheManager.ts`
- 或删除（如果不再需要）

**Step 1: 评估 CacheManager 的使用**

Run: `Grep "CacheManager" src --glob="*.ts" --output-mode="files_with_matches"`

**Step 2: 更新所有 CacheManager 引用**

将 `CacheManager` 的调用替换为 `PluginDataStore` 调用。

**Step 3: 删除或简化 CacheManager**

如果 `CacheManager` 不再需要，删除它。如果还需要部分功能（如持久化缓存），保留简化版本。

**Step 4: 编译验证**

Run: `npm run compile`
Expected: Success

**Step 5: 提交**

```bash
git add src/pluginMarketplace/webview/services/CacheManager.ts
git commit -m "refactor: simplify or remove CacheManager after Store migration"
```

---

## Task 11: 删除旧的 PluginDetailsService

**Files:**
- Delete: `src/pluginMarketplace/webview/services/PluginDetailsService.ts`

**Step 1: 确认没有引用**

Run: `Grep "PluginDetailsService" src --glob="*.ts" --output-mode="files_with_matches"`

**Step 2: 删除文件**

```bash
rm src/pluginMarketplace/webview/services/PluginDetailsService.ts
```

**Step 3: 编译验证**

Run: `npm run compile`
Expected: Success

**Step 4: 提交**

```bash
git add src/pluginMarketplace/webview/services/PluginDetailsService.ts
git commit -m "refactor: remove old PluginDetailsService after migration"
```

---

## Task 12: 更新 webview 消息类型定义

**Files:**
- Modify: `src/pluginMarketplace/webview/messages/types.ts`

**Step 1: 添加新消息类型**

```typescript
// 添加到 webview 消息类型

export interface DetailUpdateMessage {
  type: 'detailUpdate';
  data: Partial<PluginDetailData>;
}

export interface StatusUpdateMessage {
  type: 'statusUpdate';
  data: {
    change: 'installed' | 'uninstalled' | 'enabled' | 'disabled';
  };
}
```

**Step 2: 编译验证**

Run: `npm run compile`
Expected: Success

**Step 3: 提交**

```bash
git add src/pluginMarketplace/webview/messages/types.ts
git commit -m "feat: add new message types for Store events"
```

---

## Task 13: 更新 webview 前端处理新消息

**Files:**
- Modify: `webview/src/`

**Step 1: 找到处理消息的组件**

Run: `Grep "type:.*installSuccess\\|type:.*detailUpdate" webview/src --glob="*.tsx" --output-mode="files_with_matches"`

**Step 2: 更新消息处理**

在 webview 前端添加对新消息类型的处理。

**Step 3: 构建 webview**

Run: `npm run build-webview`
Expected: Success

**Step 4: 提交**

```bash
git add webview/src/
git commit -m "feat: handle Store event messages in webview"
```

---

## Task 14: 端到端测试和验证

**Step 1: 启动开发环境**

Run: `F5` in VS Code (使用 "开发模式" 配置)

**Step 2: 验证启动性能**

- 打开 VS Code
- 观察 Sidebar 加载时间
- 检查控制台日志确认数据加载顺序

**Step 3: 验证详情页加载**

- 点击一个插件
- 确认详情快速加载
- 观察 stars 异步加载（先显示详情，后更新 stars）

**Step 4: 验证事件通知**

- 安装一个插件
- 确认 Sidebar 自动刷新
- 如果详情页打开，确认按钮状态更新

- 卸载一个插件
- 确认 Sidebar 自动刷新

**Step 5: 验证缓存**

- 打开同一个插件详情两次
- 第二次应该更快（使用缓存）

**Step 6: 验证请求去重**

- 快速点击多个插件
- 确认没有重复的相同请求

**Step 7: 提交**

```bash
git add .
git commit -m "refactor: complete plugin data management refactor"
```

---

## Task 15: 清理和文档

**Step 1: 添加 JSDoc 注释**

为新增的公共方法添加 JSDoc 注释。

**Step 2: 更新 README.md**

如果需要，更新项目文档。

**Step 3: 最终编译和测试**

Run: `npm run compile && npm run build-webview`
Expected: Success

**Step 4: 最终提交**

```bash
git add .
git commit -m "docs: add documentation for plugin data store refactor"
```

---

## 回滚计划

如果实现过程中遇到问题，可以使用以下回滚策略：

1. **保留旧实现并行**: 在迁移过程中保留 `PluginDetailsService` 和 `CacheManager`，通过 feature flag 切换
2. **分阶段发布**: 先发布市场/插件列表部分，确认稳定后再迁移详情加载
3. **保留简化版 CacheManager**: 如果需要持久化缓存，保留一个简化版本

## 后续优化

重构完成后可以考虑的优化：

1. **持久化缓存**: 使用 VS Code 的 globalState 将部分数据持久化到磁盘
2. **增量刷新**: 市场更新时只刷新变更的插件，而非全量刷新
3. **预加载**: 用户在 Sidebar 悬停时预加载插件详情
4. **性能监控**: 添加性能指标收集，持续优化加载时间
