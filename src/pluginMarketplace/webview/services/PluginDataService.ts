// vscode-extension/src/pluginMarketplace/webview/services/PluginDataService.ts

import * as vscode from 'vscode';
import { CacheManager } from './CacheManager';
import {
  execClaudeCommand,
  PluginInfo,
  InstalledPlugin,
  MarketplaceInfo,
  PluginFilter,
  PluginScope,
  Marketplace
} from '../../types';

/**
 * 插件数据服务类
 * 读取操作使用文件解析，修改操作使用 CLI 命令
 */
export class PluginDataService {
  private cache: CacheManager;

  constructor(private context: vscode.ExtensionContext) {
    this.cache = new CacheManager(context);
  }

  // ===== 读取操作 (文件解析，快速) =====

  /**
   * 获取所有市场
   */
  async getAllMarketplaces(): Promise<Marketplace[]> {
    const marketplaces = await this.cache.getMarketplaces();
    return marketplaces.map(m => ({
      name: m.name,
      source: this.formatSource(m.source),
      type: this.getSourceType(m.source)
    }));
  }

  /**
   * 获取已安装插件
   */
  async getInstalledPlugins(): Promise<InstalledPlugin[]> {
    const plugins = await this.cache.getInstalledPlugins();

    // 合并启用状态
    const enabled = await this.cache.getEnabledPlugins();

    return plugins.map(plugin => {
      const key = plugin.marketplace
        ? `${plugin.name}@${plugin.marketplace}`
        : plugin.name;
      return {
        ...plugin,
        enabled: enabled.get(key) ?? true
      };
    });
  }

  /**
   * 获取所有可用插件 (带状态)
   */
  async getAllAvailablePlugins(): Promise<PluginInfo[]> {
    return this.cache.getAllPlugins();
  }

  /**
   * 获取插件状态
   * @param pluginName 插件名称
   * @param marketplace 市场名称（可选，用于精确匹配同一插件在不同市场的情况）
   */
  async getPluginStatus(pluginName: string, marketplace?: string): Promise<{
    installed: boolean;
    enabled?: boolean;
    scope?: PluginScope;
    version?: string;
    updateAvailable?: boolean;
  }> {
    const installedPlugins = await this.getInstalledPlugins();
    // 同时匹配插件名和市场名（如果提供了 marketplace 参数）
    const installedPlugin = installedPlugins.find(p =>
      p.name === pluginName && (!marketplace || p.marketplace === marketplace)
    );

    if (!installedPlugin) {
      return { installed: false };
    }

    return {
      installed: true,
      enabled: installedPlugin.enabled,
      scope: installedPlugin.scope,
      version: installedPlugin.version,
      updateAvailable: await this.checkUpdate(pluginName, installedPlugin.version)
    };
  }

  /**
   * 筛选插件
   */
  filterPlugins(plugins: PluginInfo[], filter: PluginFilter): PluginInfo[] {
    let filtered = [...plugins];

    if (filter.keyword) {
      const keyword = filter.keyword.toLowerCase();
      filtered = filtered.filter(plugin =>
        plugin.name.toLowerCase().includes(keyword) ||
        plugin.description.toLowerCase().includes(keyword)
      );
    }

    // 只在不是 'all' 时才按市场筛选
    if (filter.marketplace && filter.marketplace !== 'all') {
      filtered = filtered.filter(plugin => plugin.marketplace === filter.marketplace);
    }

    if (filter.status && filter.status !== 'all') {
      filtered = filtered.filter(plugin => {
        switch (filter.status) {
          case 'installed':
            return plugin.status.installed;
          case 'not-installed':
            return !plugin.status.installed;
          case 'upgradable':
            return plugin.status.updateAvailable;
          default:
            return true;
        }
      });
    }

    if (filter.scope) {
      filtered = filtered.filter(plugin =>
        plugin.status.installed && plugin.status.scope === filter.scope
      );
    }

    return filtered;
  }

  // ===== 修改操作 (CLI 命令，确保数据正确) =====

  /**
   * 安装插件
   */
  async installPlugin(
    pluginName: string,
    marketplaceName: string,
    scope: PluginScope = 'user'
  ): Promise<{ success: boolean; error?: string }> {
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspacePath) {
      return { success: false, error: '未找到工作区文件夹' };
    }

    const result = await execClaudeCommand(
      `plugin install "${pluginName}@${marketplaceName}" --scope ${scope}`,
      { cwd: workspacePath, timeout: 120000 }
    );

    this.cache.invalidate();

    if (result.status === 'success') {
      return { success: true };
    }

    return { success: false, error: result.error || '安装失败' };
  }

  /**
   * 卸载插件
   */
  async uninstallPlugin(pluginName: string): Promise<{ success: boolean; error?: string }> {
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspacePath) {
      return { success: false, error: '未找到工作区文件夹' };
    }

    const result = await execClaudeCommand(
      `plugin uninstall "${pluginName}"`,
      { cwd: workspacePath }
    );

    this.cache.invalidate();

    if (result.status === 'success') {
      return { success: true };
    }

    return { success: false, error: result.error || '卸载失败' };
  }

  /**
   * 启用插件
   */
  async enablePlugin(
    pluginName: string,
    marketplaceName: string
  ): Promise<{ success: boolean; error?: string }> {
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspacePath) {
      return { success: false, error: '未找到工作区文件夹' };
    }

    const result = await execClaudeCommand(
      `plugin enable "${pluginName}@${marketplaceName}"`,
      { cwd: workspacePath }
    );

    this.cache.invalidate();

    if (result.status === 'success') {
      return { success: true };
    }

    return { success: false, error: result.error || '启用失败' };
  }

  /**
   * 禁用插件
   */
  async disablePlugin(
    pluginName: string,
    marketplaceName: string
  ): Promise<{ success: boolean; error?: string }> {
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspacePath) {
      return { success: false, error: '未找到工作区文件夹' };
    }

    const result = await execClaudeCommand(
      `plugin disable "${pluginName}@${marketplaceName}"`,
      { cwd: workspacePath }
    );

    this.cache.invalidate();

    if (result.status === 'success') {
      return { success: true };
    }

    return { success: false, error: result.error || '禁用失败' };
  }

  /**
   * 添加市场
   */
  async addMarketplace(source: string): Promise<{ success: boolean; error?: string }> {
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspacePath) {
      return { success: false, error: '未找到工作区文件夹' };
    }

    const result = await execClaudeCommand(
      `plugin marketplace add ${source}`,
      { cwd: workspacePath, timeout: 120000 }
    );

    this.cache.invalidate();

    if (result.status === 'success') {
      return { success: true };
    }

    return { success: false, error: result.error || '添加市场失败' };
  }

  /**
   * 删除市场
   */
  async removeMarketplace(name: string): Promise<{ success: boolean; error?: string }> {
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspacePath) {
      return { success: false, error: '未找到工作区文件夹' };
    }

    const result = await execClaudeCommand(
      `plugin marketplace remove ${name}`,
      { cwd: workspacePath }
    );

    this.cache.invalidate();

    if (result.status === 'success') {
      return { success: true };
    }

    return { success: false, error: result.error || '删除市场失败' };
  }

  /**
   * 更新市场
   */
  async updateMarketplace(name: string): Promise<{ success: boolean; error?: string }> {
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspacePath) {
      return { success: false, error: '未找到工作区文件夹' };
    }

    const result = await execClaudeCommand(
      `plugin marketplace update ${name}`,
      { cwd: workspacePath, timeout: 120000 }
    );

    this.cache.invalidate();

    if (result.status === 'success') {
      return { success: true };
    }

    return { success: false, error: result.error || '更新市场失败' };
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.invalidate();
  }

  /**
   * 获取扩展上下文
   */
  getContext(): vscode.ExtensionContext {
    return this.context;
  }

  /**
   * 检查插件更新
   */
  async checkUpdate(pluginName: string, installedVersion: string): Promise<boolean> {
    try {
      const allPlugins = await this.getAllAvailablePlugins();
      const plugin = allPlugins.find(p => p.name === pluginName);

      if (!plugin || !plugin.version) {
        return false;
      }

      const latestVersion = plugin.version;
      return this.compareVersions(latestVersion, installedVersion) > 0;
    } catch (error) {
      console.error('Failed to check update:', error);
      return false;
    }
  }

  // ===== 辅助方法 =====

  private formatSource(source: MarketplaceInfo['source']): string {
    if (source.source === 'github' && source.repo) {
      return source.repo;
    }
    if (source.source === 'url' && source.url) {
      return source.url;
    }
    if (source.source === 'directory' && source.path) {
      return source.path;
    }
    return source.source;
  }

  private getSourceType(source: MarketplaceInfo['source']): 'url' | 'git' | 'local' {
    if (source.source === 'directory') return 'local';
    if (source.source === 'github' || source.source === 'git') return 'git';
    return 'url';
  }

  /**
   * 比较版本号
   * @returns 1: v1 > v2, -1: v1 < v2, 0: v1 === v2
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;

      if (p1 < p2) return -1;
      if (p1 > p2) return 1;
    }

    return 0;
  }
}
