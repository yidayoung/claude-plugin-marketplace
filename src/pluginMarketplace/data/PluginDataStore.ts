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
import { logger } from '../../shared/utils/logger';

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

    logger.info('[PluginDataStore] 初始化中...');

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

    // 修复：对于没有正确 marketplace 的已安装插件，从 pluginList 中查找并更新
    this.fixInstalledPluginsMarketplace();

    this.isInitialized = true;
    logger.info('[PluginDataStore] 初始化完成');
  }

  /**
   * 修复已安装插件的 marketplace 字段
   * 对于 CLI 返回的 marketplace 为空的插件，从 pluginList 中查找正确的市场名称
   */
  private fixInstalledPluginsMarketplace(): void {
    const toFix: Array<{ name: string; oldKey: string; newMarketplace: string }> = [];

    // 查找所有需要修复的插件
    for (const [key, status] of this.installedStatus.entries()) {
      if (key.endsWith('@')) {
        // key 格式为 "pluginName@"，marketplace 为空
        const pluginName = key.slice(0, -1); // 移除末尾的 '@'
        const marketplace = this.findPluginMarketplace(pluginName);
        if (marketplace) {
          toFix.push({ name: pluginName, oldKey: key, newMarketplace: marketplace });
        }
      }
    }

    // 更新 Map
    for (const { name, oldKey, newMarketplace } of toFix) {
      const status = this.installedStatus.get(oldKey);
      if (status) {
        const newKey = `${name}@${newMarketplace}`;
        this.installedStatus.set(newKey, status);
        this.installedStatus.delete(oldKey);
        logger.debug(`修复插件市场: ${oldKey} -> ${newKey}`);
      }
    }

    if (toFix.length > 0) {
      // 重新同步状态
      this.syncInstalledStatus();
    }
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
   * 获取扩展上下文（用于某些需要 context 的操作）
   */
  getContext(): vscode.ExtensionContext {
    return this.context;
  }

  /**
   * 更新安装状态
   * @param pluginName 插件名称
   * @param marketplace 市场名称
   * @param status 状态更新
   */
  private updateInstalledStatus(pluginName: string, marketplace: string, status: Partial<InstalledStatus>): void {
    const key = `${pluginName}@${marketplace}`;
    const plugins = this.pluginList.get(marketplace);
    if (!plugins) {
      logger.warn(`市场 ${marketplace} 不存在，无法更新插件 ${pluginName} 的状态`);
      return;
    }

    const plugin = plugins.find(p => p.name === pluginName);
    if (!plugin) {
      logger.warn(`插件 ${pluginName} 在市场 ${marketplace} 中不存在`);
      return;
    }

    // 更新 installedStatus Map
    const current = this.installedStatus.get(key) || { installed: false, enabled: true };
    this.installedStatus.set(key, { ...current, ...status });

    // 更新 pluginList 中的插件状态
    plugin.installed = status.installed ?? current.installed;
    plugin.enabled = status.enabled ?? current.enabled;
    plugin.scope = status.scope ?? current.scope;

    // 清除详情缓存，确保下次获取时使用最新状态
    this.pluginDetails.delete(key);
    this.dataLoader.clearPluginDetailCache(pluginName, marketplace);
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
    scope?: 'user' | 'project' | 'local'
  ): Promise<void> {
    const commands = {
      install: scope
        ? `plugin install "${pluginName}@${marketplace}" --scope ${scope}`
        : `plugin install "${pluginName}@${marketplace}"`,
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

    // 对于 uninstall，需要先查找市场名称（因为 uninstall 命令不需要 marketplace 参数）
    let effectiveMarketplace = marketplace;
    if (operation === 'uninstall') {
      effectiveMarketplace = marketplace || this.findPluginMarketplace(pluginName) || '';
    }

    // 获取工作区路径，确保 CLI 在正确的工作目录下执行
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    const result = await execClaudeCommand(commands[operation], {
      cwd: workspacePath
    });

    // 检查命令执行结果
    if (result.status !== 'success') {
      const errorMsg = result.error || `Failed to ${operation} plugin`;
      logger.error(`${operation} 失败:`, errorMsg);
      throw new Error(errorMsg);
    }

    // 命令成功时更新状态
    this.updateInstalledStatus(pluginName, effectiveMarketplace, statusChanges[operation]);

    // 发射状态变更事件
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
  async installPlugin(pluginName: string, marketplace: string, scope: 'user' | 'project' | 'local' = 'user'): Promise<void> {
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
   * 调试方法：打印插件状态
   */
  debugPluginStatus(pluginName: string, marketplace?: string): void {
    const effectiveMarketplace = marketplace || this.findPluginMarketplace(pluginName);
    if (!effectiveMarketplace) {
      logger.debug(`插件 ${pluginName} 在任何市场中都未找到`);
      return;
    }

    const key = `${pluginName}@${effectiveMarketplace}`;
    const status = this.installedStatus.get(key);
    const plugin = this.pluginList.get(effectiveMarketplace)?.find(p => p.name === pluginName);

    logger.debug(`插件状态: ${pluginName}@${effectiveMarketplace}`);
    logger.debug('  - installedStatus:', status);
    logger.debug('  - pluginList:', plugin ? { installed: plugin.installed, enabled: plugin.enabled } : 'not found');
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
  async getPluginDetail(pluginName: string, marketplace: string, forceRefresh = false, locale?: string): Promise<PluginDetailData> {
    const key = `${pluginName}@${marketplace}`;

    // 检查缓存（除非强制刷新）
    if (!forceRefresh) {
      const cached = this.pluginDetails.get(key);
      if (cached && Date.now() - cached.timestamp < this.DETAIL_CACHE_TTL) {
        return cached.data;
      }
    }

    // 检查是否有进行中的请求
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    // 启动新请求（传入 locale 用于 README 多语言）
    const promise = this.fetchPluginDetail(pluginName, marketplace, locale);
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
    marketplace: string,
    locale?: string
  ): Promise<PluginDetailData> {
    const key = `${pluginName}@${marketplace}`;
    const status = this.installedStatus.get(key);
    const isInstalled = status?.installed ?? false;

    const data = await this.dataLoader.getPluginDetail(
      pluginName,
      marketplace,
      isInstalled,
      status?.enabled,
      status?.scope,
      locale
    );

    // 获取市场源信息
    const marketplaceInfo = this.marketplaces.get(marketplace);

    // 添加市场源信息到详情数据
    if (marketplaceInfo) {
      data.marketplaceSource = {
        source: marketplaceInfo.source.source as 'github' | 'url' | 'directory' | 'git',
        repo: marketplaceInfo.source.repo,
        url: marketplaceInfo.source.url,
      };
    }

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
        logger.error(`获取 ${pluginName} 的 stars 失败:`, err);
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

  /**
   * 检查 Claude Code 是否已安装
   */
  async checkClaudeInstalled(): Promise<boolean> {
    const result = await execClaudeCommand('--version');
    return result.status === 'success';
  }

  // ===== 市场管理方法 =====

  /**
   * 添加市场
   * @param source 市场源（URL 或本地路径）
   * @param name 市场名称（可选，CLI 会自动生成）
   */
  async addMarketplace(source: string, name?: string): Promise<{ success: boolean; error?: string; marketplaceName?: string }> {
    try {
      const command = name
        ? `plugin marketplace add "${source}" --name "${name}"`
        : `plugin marketplace add "${source}"`;

      const result = await execClaudeCommand(command);

      if (result.status !== 'success') {
        return { success: false, error: result.error || '添加市场失败' };
      }

      // 重新加载市场列表
      await this.reloadMarketplaces();

      // 触发市场变更事件
      storeEvents.emitMarketplaceChange();

      // 获取实际的市场名称（CLI 可能会生成不同的名称）
      const actualName = name || this.extractMarketplaceNameFromSource(source);
      return { success: true, marketplaceName: actualName };
    } catch (error: any) {
      return { success: false, error: error.message || '添加市场失败' };
    }
  }

  /**
   * 移除市场
   */
  async removeMarketplace(name: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await execClaudeCommand(`plugin marketplace remove "${name}"`);

      if (result.status !== 'success') {
        return { success: false, error: result.error || '移除市场失败' };
      }

      // 从缓存中移除
      this.marketplaces.delete(name);
      this.pluginList.delete(name);

      // 清除该市场下所有插件的详情缓存
      for (const key of this.pluginDetails.keys()) {
        if (key.endsWith(`@${name}`)) {
          this.pluginDetails.delete(key);
        }
      }

      // 触发市场变更事件
      storeEvents.emitMarketplaceChange();

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || '移除市场失败' };
    }
  }

  /**
   * 更新市场
   */
  async updateMarketplace(name: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await execClaudeCommand(`plugin marketplace update "${name}`);

      if (result.status !== 'success') {
        return { success: false, error: result.error || '更新市场失败' };
      }

      // 重新加载市场列表和插件列表
      await this.reloadMarketplaces();

      // 清除该市场的插件详情缓存（因为可能有更新）
      for (const key of this.pluginDetails.keys()) {
        if (key.endsWith(`@${name}`)) {
          this.pluginDetails.delete(key);
        }
      }

      // 触发市场变更事件
      storeEvents.emitMarketplaceChange();

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || '更新市场失败' };
    }
  }

  /**
   * 重新加载市场列表和插件列表
   */
  private async reloadMarketplaces(): Promise<void> {
    // 重新加载市场列表
    const marketplaces = await this.dataLoader.loadMarketplaces();
    this.marketplaces.clear();
    marketplaces.forEach(m => this.marketplaces.set(m.name, m));

    // 重新加载插件列表
    await this.loadAllPluginLists();

    // 同步安装状态
    this.syncInstalledStatus();
  }

  /**
   * 获取 GitHub stars（用于市场发现面板）
   */
  async fetchGitHubStars(owner: string, repo: string): Promise<number> {
    return this.dataLoader.fetchGitHubStars(owner, repo);
  }

  /**
   * 从源提取市场名称（简单的启发式方法）
   */
  private extractMarketplaceNameFromSource(source: string): string {
    if (source.includes('github.com')) {
      const match = source.match(/github\.com\/([^/]+)/);
      return match ? match[1] : source;
    }
    // 最后的路径部分作为名称
    const parts = source.split(/[/\\]/);
    return parts[parts.length - 1] || source;
  }
}
