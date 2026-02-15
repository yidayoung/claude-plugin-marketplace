// vscode-extension/src/pluginMarketplace/webview/services/CacheManager.ts

import * as vscode from 'vscode';
import { FileParser } from './FileParser';
import {
  PluginInfo,
  InstalledPlugin,
  MarketplaceInfo,
  MarketplaceConfig,
  MarketplacePlugin
} from '../../types';

/**
 * 缓存管理类 - 管理插件数据缓存
 */
export class CacheManager {
  private parser: FileParser;
  private installedCache: InstalledPlugin[] | null = null;
  private enabledCache: Map<string, boolean> | null = null;
  private marketplacesCache: MarketplaceInfo[] | null = null;
  private marketplacePluginsCache: Map<string, MarketplaceConfig> = new Map();

  constructor(private context: vscode.ExtensionContext) {
    this.parser = new FileParser();
  }

  /**
   * 获取已安装插件 (带缓存)
   */
  async getInstalledPlugins(): Promise<InstalledPlugin[]> {
    if (this.installedCache) {
      return this.installedCache;
    }

    const plugins = await this.parser.parseInstalledPlugins();
    this.installedCache = plugins;
    return plugins;
  }

  /**
   * 获取启用状态 (带缓存)
   */
  async getEnabledPlugins(): Promise<Map<string, boolean>> {
    if (this.enabledCache) {
      return this.enabledCache;
    }

    const enabled = await this.parser.parseEnabledPlugins();
    this.enabledCache = enabled;
    return enabled;
  }

  /**
   * 获取市场列表 (带缓存)
   */
  async getMarketplaces(): Promise<MarketplaceInfo[]> {
    if (this.marketplacesCache) {
      return this.marketplacesCache;
    }

    const marketplaces = await this.parser.parseMarketplaces();
    this.marketplacesCache = marketplaces;
    return marketplaces;
  }

  /**
   * 获取市场插件配置 (带缓存)
   */
  async getMarketplacePlugins(marketplaceName: string): Promise<MarketplaceConfig | null> {
    if (this.marketplacePluginsCache.has(marketplaceName)) {
      return this.marketplacePluginsCache.get(marketplaceName)!;
    }

    const config = await this.parser.parseMarketplacePlugins(marketplaceName);
    if (config) {
      this.marketplacePluginsCache.set(marketplaceName, config);
    }
    return config;
  }

  /**
   * 获取所有插件 (合并状态)
   */
  async getAllPlugins(): Promise<PluginInfo[]> {
    const [marketplaces, installed, enabled] = await Promise.all([
      this.getMarketplaces(),
      this.getInstalledPlugins(),
      this.getEnabledPlugins()
    ]);

    const allPlugins: PluginInfo[] = [];

    for (const marketplace of marketplaces) {
      const config = await this.getMarketplacePlugins(marketplace.name);
      if (!config) continue;

      const plugins: PluginInfo[] = config.plugins.map((plugin: MarketplacePlugin) => {
        const installedInfo = installed.find(
          i => i.name === plugin.name && i.marketplace === marketplace.name
        );

        const key = `${plugin.name}@${marketplace.name}`;
        const isEnabled = enabled.get(key);

        return {
          ...plugin,
          marketplace: marketplace.name,
          status: {
            installed: !!installedInfo,
            enabled: isEnabled ?? !!installedInfo,
            version: installedInfo?.version,
            scope: installedInfo?.scope,
            updateAvailable: false // TODO: 实现版本比较
          }
        };
      });

      allPlugins.push(...plugins);
    }

    return allPlugins;
  }

  /**
   * 清除缓存
   */
  invalidate(): void {
    this.installedCache = null;
    this.enabledCache = null;
    this.marketplacesCache = null;
    this.marketplacePluginsCache.clear();
  }
}
