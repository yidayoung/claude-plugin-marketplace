// vscode-extension/src/pluginMarketplace/pluginTreeProvider.ts

import * as vscode from 'vscode';
import { PluginManager } from './pluginManager';
import { MarketplaceManager } from './marketplaceManager';
import { Plugin, PluginTreeItem, TreeItemType } from './types';

export class PluginTreeProvider implements vscode.TreeDataProvider<PluginTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<PluginTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(
    private pluginManager: PluginManager,
    private marketplaceManager: MarketplaceManager
  ) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: PluginTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: PluginTreeItem): Promise<PluginTreeItem[]> {
    // 如果还未初始化，返回空数组
    if (!this.marketplaceManager.isInitialized()) {
      return [];
    }

    // 根节点：显示市场列表 + 已安装插件总览
    if (!element) {
      return this.getRootItems();
    }

    // 已安装插件总览节点
    if (element.type === 'installed-overview') {
      return this.getInstalledPluginsItems();
    }

    // 市场节点：显示可用插件
    if (element.type === 'marketplace') {
      return this.getAvailablePluginsItems(element.data.name);
    }

    return [];
  }

  /**
   * 获取根节点项目
   */
  private async getRootItems(): Promise<PluginTreeItem[]> {
    const items: PluginTreeItem[] = [];

    // 添加所有市场
    const marketplaces = this.marketplaceManager.listMarketplaces();
    for (const mp of marketplaces) {
      items.push(new PluginTreeItem(
        'marketplace',
        `🏢 ${mp.name}`,
        vscode.TreeItemCollapsibleState.Collapsed,
        mp
      ));
    }

    // 添加已安装插件总览
    const installed = await this.pluginManager.listInstalled();
    if (installed.length > 0) {
      items.unshift(new PluginTreeItem(
        'installed-overview',
        `📦 已安装的插件 (${installed.length})`,
        vscode.TreeItemCollapsibleState.Expanded,
        { plugins: installed }
      ));
    }

    return items;
  }

  /**
   * 获取已安装插件列表项
   */
  private async getInstalledPluginsItems(): Promise<PluginTreeItem[]> {
    const plugins = await this.pluginManager.listInstalled();

    return plugins.map((plugin: any) => {
      const item = new PluginTreeItem(
        'installed-plugin',
        `${plugin.name} v${plugin.version}`,
        vscode.TreeItemCollapsibleState.None,
        { plugin }
      );

      item.description = plugin.description || '';
      item.tooltip = `${plugin.name}\n${plugin.description}`;

      return item;
    });
  }

  /**
   * 获取市场的可用插件
   */
  private async getAvailablePluginsItems(marketplaceName: string): Promise<PluginTreeItem[]> {
    const marketplace = this.marketplaceManager.listMarketplaces()
      .find(mp => mp.name === marketplaceName);

    if (!marketplace) {
      return [];
    }

    const plugins = await this.marketplaceManager.fetchPlugins(marketplace);
    const installed = await this.pluginManager.listInstalled();
    const installedNames = new Set(installed.map((ip: any) => ip.name));

    // 只显示未安装的插件
    const availablePlugins = plugins.filter(p => !installedNames.has(p.name));

    return availablePlugins.map((plugin: any) => {
      const item = new PluginTreeItem(
        'available-plugin',
        `${plugin.name} v${plugin.version}`,
        vscode.TreeItemCollapsibleState.None,
        { plugin, marketplace: marketplace.name }
      );

      item.description = plugin.description || '';
      item.tooltip = `${plugin.name}\n${plugin.description}`;
      item.contextValue = 'available-plugin';

      return item;
    });
  }

}
