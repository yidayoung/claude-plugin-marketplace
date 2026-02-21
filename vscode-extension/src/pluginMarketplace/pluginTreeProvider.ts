// vscode-extension/src/pluginMarketplace/pluginTreeProvider.ts

import * as vscode from 'vscode';
import { PluginTreeItem, TreeItemType, PluginInfo, InstalledPlugin } from './types';
import { PluginDataStore } from './data/PluginDataStore';
import { StoreEvent } from './data/types';

export class PluginTreeProvider implements vscode.TreeDataProvider<PluginTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<PluginTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  // 缓存数据
  private installedPluginsCache: InstalledPlugin[] = [];
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

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: PluginTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: PluginTreeItem): Promise<PluginTreeItem[]> {
    // 根节点
    if (!element) {
      return this.getRootItems();
    }

    // 已安装插件节点
    if (element.type === 'installed-overview') {
      return this.getInstalledPluginsItems();
    }

    // 市场节点 - 显示已安装和可用插件分组
    if (element.type === 'marketplace') {
      return this.getMarketplaceSections(element.data.name);
    }

    // 已安装分组
    if (element.type === 'installed-section') {
      return this.getSectionInstalledItems(element.data.marketplaceName);
    }

    // 可用插件分组
    if (element.type === 'available-section') {
      return this.getAvailablePluginsItems(element.data.marketplaceName);
    }

    return [];
  }

  /**
   * 获取根节点
   */
  private async getRootItems(): Promise<PluginTreeItem[]> {
    const items: PluginTreeItem[] = [];

    try {
      // 使用 PluginDataStore 获取数据
      const marketplaces = this.dataStore.getMarketplaces();
      const allPlugins = this.dataStore.getPluginList();

      // 筛选已安装插件
      const installed = allPlugins.filter(p => p.installed).map(p => ({
        name: p.name,
        version: p.version,
        enabled: p.enabled ?? true,
        scope: p.scope,
        marketplace: p.marketplace,
        installPath: '' // TreeProvider 不需要路径
      } as InstalledPlugin));

      this.installedPluginsCache = installed;

      // 添加已安装插件分组
      if (installed.length > 0) {
        const enabledCount = installed.filter(p => p.enabled).length;
        const disabledCount = installed.length - enabledCount;
        let label = `📦 已安装 (${installed.length})`;
        if (disabledCount > 0) {
          label += ` - ${disabledCount} 个已禁用`;
        }

        items.push(new PluginTreeItem(
          'installed-overview',
          label,
          vscode.TreeItemCollapsibleState.Expanded,
          { plugins: installed }
        ));
      }

      // 添加市场列表
      for (const mp of marketplaces) {
        items.push(new PluginTreeItem(
          'marketplace',
          `🏢 ${mp.name}`,
          vscode.TreeItemCollapsibleState.Collapsed,
          { name: mp.name, info: mp }
        ));
      }
    } catch (error) {
      console.error('Failed to get root items:', error);
    }

    return items;
  }

  /**
   * 获取市场的插件分组（已安装 + 可用）
   */
  private async getMarketplaceSections(marketplaceName: string): Promise<PluginTreeItem[]> {
    const items: PluginTreeItem[] = [];

    try {
      const marketplacePlugins = this.dataStore.getPluginList(marketplaceName);

      const installed = marketplacePlugins.filter(p => p.installed);
      const available = marketplacePlugins.filter(p => !p.installed);

      // 已安装分组
      if (installed.length > 0) {
        items.push(new PluginTreeItem(
          'installed-section',
          `✅ 已安装 (${installed.length})`,
          vscode.TreeItemCollapsibleState.Collapsed,
          { marketplaceName, plugins: installed }
        ));
      }

      // 可用插件分组
      if (available.length > 0) {
        items.push(new PluginTreeItem(
          'available-section',
          `📋 可安装 (${available.length})`,
          vscode.TreeItemCollapsibleState.Collapsed,
          { marketplaceName, plugins: available }
        ));
      }

      if (items.length === 0) {
        items.push(new PluginTreeItem(
          'loading',
          '该市场暂无可用插件',
          vscode.TreeItemCollapsibleState.None,
          {}
        ));
      }
    } catch (error) {
      console.error(`Failed to get marketplace sections for ${marketplaceName}:`, error);
    }

    return items;
  }

  /**
   * 获取已安装插件列表
   */
  private async getInstalledPluginsItems(): Promise<PluginTreeItem[]> {
    const plugins = this.installedPluginsCache;

    return plugins.map(plugin => {
      const item = new PluginTreeItem(
        'installed-plugin',
        plugin.name,
        vscode.TreeItemCollapsibleState.None,
        { ...plugin }
      );

      item.description = `v${plugin.version}`;
      item.contextValue = plugin.enabled ? 'installed-enabled' : 'installed-disabled';

      return item;
    });
  }

  /**
   * 获取特定市场的已安装插件
   */
  private async getSectionInstalledItems(marketplaceName: string): Promise<PluginTreeItem[]> {
    try {
      const marketplacePlugins = this.dataStore.getPluginList(marketplaceName);

      return marketplacePlugins
        .filter(p => p.installed)
        .map(plugin => {
          const item = new PluginTreeItem(
            'installed-plugin',
            plugin.name,
            vscode.TreeItemCollapsibleState.None,
            { ...plugin, marketplaceName }
          );

          item.description = `v${plugin.version}`;
          item.contextValue = plugin.enabled ? 'installed-enabled' : 'installed-disabled';

          return item;
        });
    } catch (error) {
      console.error(`Failed to get installed items for ${marketplaceName}:`, error);
      return [];
    }
  }

  /**
   * 获取可用插件列表
   */
  private async getAvailablePluginsItems(marketplaceName: string): Promise<PluginTreeItem[]> {
    try {
      const marketplacePlugins = this.dataStore.getPluginList(marketplaceName);

      return marketplacePlugins
        .filter(p => !p.installed)
        .map(plugin => {
          const item = new PluginTreeItem(
            'available-plugin',
            plugin.name,
            vscode.TreeItemCollapsibleState.None,
            { ...plugin, marketplaceName }
          );

          item.description = plugin.version ? `v${plugin.version}` : '';
          item.contextValue = 'available-plugin';

          return item;
        });
    } catch (error) {
      console.error(`Failed to get available plugins for ${marketplaceName}:`, error);
      return [];
    }
  }

  /**
   * 获取插件详细信息
   */
  async getPluginDetails(pluginName: string, marketplace: string): Promise<PluginInfo | null> {
    try {
      const allPlugins = this.dataStore.getPluginList(marketplace);
      const plugin = allPlugins.find(p => p.name === pluginName);
      if (!plugin) return null;

      // 转换为旧类型格式（兼容性）
      return {
        name: plugin.name,
        description: plugin.description,
        version: plugin.version,
        author: plugin.author ? { name: plugin.author } : undefined,
        homepage: plugin.homepage,
        category: plugin.category,
        marketplace: plugin.marketplace,
        status: {
          installed: plugin.installed,
          enabled: plugin.enabled ?? true,
          version: plugin.version
        },
        source: '' as any // 兼容旧类型
      } as PluginInfo;
    } catch {
      return null;
    }
  }

  dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
