// vscode-extension/src/pluginMarketplace/data/PluginDataStore.ts

import * as vscode from 'vscode';
import { DataLoader } from './DataLoader';
import {
  MarketplaceInfo,
  PluginInfo,
  InstalledStatus,
  DetailCacheEntry,
  StoreEvent,
} from './types';
import { storeEvents } from './events';
import { execClaudeCommand } from '../types';
import { PluginDetailData } from '../webview/messages/types';

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

    // 使用 forEach 简化循环
    marketplaces.forEach(m => this.marketplaces.set(m.name, m));
    installedPlugins.forEach(p => {
      const key = this.pluginKey(p.name, p.marketplace || '');
      this.installedStatus.set(key, {
        installed: true,
        enabled: p.enabled ?? true,
        scope: p.scope,
      });
    });

    await this.loadAllPluginLists();
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
   * 生成插件缓存键
   */
  private pluginKey(pluginName: string, marketplace: string): string {
    return `${pluginName}@${marketplace}`;
  }

  /**
   * 通用插件操作执行器
   */
  private async executePluginOperation(
    operation: 'install' | 'uninstall' | 'enable' | 'disable',
    pluginName: string,
    marketplace: string,
    scope?: 'user' | 'project'
  ): Promise<void> {
    const commands = {
      install: `plugin install "${pluginName}@${marketplace}" --${scope || 'user'}`,
      uninstall: `plugin uninstall "${pluginName}"`,
      enable: `plugin enable "${pluginName}@${marketplace}"`,
      disable: `plugin disable "${pluginName}@${marketplace}"`
    };

    const statusChanges = {
      install: { installed: true, enabled: true, scope },
      uninstall: { installed: false, enabled: false },
      enable: { enabled: true },
      disable: { enabled: false }
    };

    const changeTypes = {
      install: 'installed' as const,
      uninstall: 'uninstalled' as const,
      enable: 'enabled' as const,
      disable: 'disabled' as const
    };

    await execClaudeCommand(commands[operation]);
    this.updateInstalledStatus(pluginName, statusChanges[operation]);

    // 对于 uninstall，需要找到市场名称
    let effectiveMarketplace = marketplace;
    if (operation === 'uninstall') {
      effectiveMarketplace = marketplace || this.findPluginMarketplace(pluginName) || '';
    }

    if (effectiveMarketplace) {
      storeEvents.emitPluginStatusChange({
        pluginName,
        marketplace: effectiveMarketplace,
        change: changeTypes[operation],
      });
    }
  }

  /**
   * 安装插件
   */
  async installPlugin(pluginName: string, marketplace: string, scope: 'user' | 'project' = 'user'): Promise<void> {
    return this.executePluginOperation('install', pluginName, marketplace, scope);
  }

  /**
   * 卸载插件
   */
  async uninstallPlugin(pluginName: string): Promise<void> {
    return this.executePluginOperation('uninstall', pluginName, '');
  }

  /**
   * 启用插件
   */
  async enablePlugin(pluginName: string, marketplace: string): Promise<void> {
    return this.executePluginOperation('enable', pluginName, marketplace);
  }

  /**
   * 禁用插件
   */
  async disablePlugin(pluginName: string, marketplace: string): Promise<void> {
    return this.executePluginOperation('disable', pluginName, marketplace);
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
}
