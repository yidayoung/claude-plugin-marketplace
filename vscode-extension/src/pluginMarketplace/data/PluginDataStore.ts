// vscode-extension/src/pluginMarketplace/data/PluginDataStore.ts

import * as vscode from 'vscode';
import { DataLoader } from './DataLoader';
import {
  MarketplaceInfo,
  PluginInfo,
  InstalledStatus,
  StoreEvent,
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
