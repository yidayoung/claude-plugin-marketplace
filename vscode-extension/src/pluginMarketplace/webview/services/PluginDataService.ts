// vscode-extension/src/pluginMarketplace/webview/services/PluginDataService.ts

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import {
  execClaudeCommand,
  Marketplace,
  MarketplaceConfig,
  MarketplacePlugin,
  PluginFilter,
  PluginInfo,
  PluginScope,
  PluginStatus,
  InstalledPlugin
} from '../../types';

/**
 * 插件数据服务类
 * 负责从市场文件和 CLI 命令获取插件数据
 */
export class PluginDataService {
  private marketplaceCache: Map<string, MarketplaceConfig> = new Map();
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 分钟

  constructor(private context: vscode.ExtensionContext) {}

  /**
   * Phase 1: 获取所有市场列表
   */
  async getAllMarketplaces(): Promise<Marketplace[]> {
    const result = await execClaudeCommand('plugin marketplace list --json');

    if (result.status !== 'success' || !result.data) {
      console.error('Failed to get marketplaces:', result.error);
      return [];
    }

    // CLI 返回的数据可能是数组或对象
    const marketplaces = Array.isArray(result.data) ? result.data : result.data.marketplaces || [];
    return marketplaces;
  }

  /**
   * Phase 1: 从指定市场获取插件配置
   */
  async getPluginsFromMarket(marketplaceName: string): Promise<MarketplaceConfig | null> {
    try {
      // 检查缓存
      if (this.marketplaceCache.has(marketplaceName) && this.isCacheValid()) {
        return this.marketplaceCache.get(marketplaceName)!;
      }

      // 读取市场配置文件
      const config = await this.readMarketplaceConfig(marketplaceName);

      // 更新缓存
      this.marketplaceCache.set(marketplaceName, config);
      this.cacheTimestamp = Date.now();

      return config;
    } catch (error: any) {
      console.error(`Failed to read marketplace config for ${marketplaceName}:`, error);
      return null;
    }
  }

  /**
   * Phase 1: 获取所有可用插件
   */
  async getAllAvailablePlugins(): Promise<PluginInfo[]> {
    const marketplaces = await this.getAllMarketplaces();
    const allPlugins: PluginInfo[] = [];

    for (const marketplace of marketplaces) {
      const config = await this.getPluginsFromMarket(marketplace.name);

      if (!config) {
        continue;
      }

      // 将 MarketplacePlugin 转换为 PluginInfo
      const plugins: PluginInfo[] = config.plugins.map(plugin => ({
        ...plugin,
        marketplace: marketplace.name,
        status: {
          installed: false
        }
      }));

      allPlugins.push(...plugins);
    }

    return allPlugins;
  }

  /**
   * Phase 1: 获取已安装的插件
   */
  async getInstalledPlugins(): Promise<InstalledPlugin[]> {
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    if (!workspacePath) {
      console.warn('No workspace folder found');
      return [];
    }

    const result = await execClaudeCommand('plugin list --json', {
      cwd: workspacePath
    });

    if (result.status !== 'success' || !result.data) {
      console.error('Failed to get installed plugins:', result.error);
      return [];
    }

    // CLI 返回的数据可能是数组或对象
    const plugins = Array.isArray(result.data) ? result.data : result.data.plugins || [];
    return plugins;
  }

  /**
   * Phase 2: 获取插件状态
   */
  async getPluginStatus(pluginName: string): Promise<PluginStatus> {
    const installedPlugins = await this.getInstalledPlugins();
    const installedPlugin = installedPlugins.find(p => p.name === pluginName);

    if (!installedPlugin) {
      return { installed: false };
    }

    // 获取工作空间路径
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspacePath) {
      console.warn('No workspace folder found');
      return { installed: true, version: installedPlugin.version, updateAvailable: false };
    }

    // 获取规范的安装路径
    const normalizePath = (p: string) => p.replace(/\\/g, '/');

    const installPath = installedPlugin.installPath;
    const normalizedInstallPath = normalizePath(installPath);

    // 用户目录
    const userPluginPath = path.join(os.homedir(), '.claude', 'plugins').replace(/\\/g, '/');

    // 项目本地目录
    const localPluginPath = path.join(workspacePath || '', '.claude', 'local').replace(/\\/g, '/');

    // 判断安装范围
    let scope: PluginScope = 'project';
    if (normalizedInstallPath.startsWith(userPluginPath)) {
      scope = 'user';
    } else if (normalizedInstallPath.includes(localPluginPath)) {
      scope = 'local';
    }

    // 检查是否有更新
    const updateAvailable = await this.checkUpdate(pluginName, installedPlugin.version);

    return {
      installed: true,
      scope,
      version: installedPlugin.version,
      updateAvailable
    };
  }

  /**
   * Phase 2: 筛选插件
   */
  filterPlugins(plugins: PluginInfo[], filter: PluginFilter): PluginInfo[] {
    let filtered = [...plugins];

    // 关键字筛选
    if (filter.keyword) {
      const keyword = filter.keyword.toLowerCase();
      filtered = filtered.filter(plugin =>
        plugin.name.toLowerCase().includes(keyword) ||
        plugin.description.toLowerCase().includes(keyword)
      );
    }

    // 市场筛选
    if (filter.marketplace) {
      filtered = filtered.filter(plugin => plugin.marketplace === filter.marketplace);
    }

    // 状态筛选
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

    // 范围筛选
    if (filter.scope) {
      filtered = filtered.filter(plugin =>
        plugin.status.installed && plugin.status.scope === filter.scope
      );
    }

    return filtered;
  }

  /**
   * Phase 3: 安装插件
   */
  async installPlugin(
    pluginName: string,
    marketplaceName: string,
    scope: PluginScope = 'user'
  ): Promise<{ success: boolean; error?: string }> {
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    if (!workspacePath) {
      console.warn('No workspace folder found');
      return { success: false, error: '未找到工作区文件夹' };
    }

    const pluginIdentifier = `"${pluginName}@${marketplaceName}"`;
    const command = `plugin install ${pluginIdentifier} --scope ${scope}`;

    const result = await execClaudeCommand(command, {
      cwd: workspacePath,
      timeout: 120000 // 2 分钟
    });

    // 清除缓存
    this.marketplaceCache.clear();

    if (result.status === 'success') {
      return { success: true };
    }

    return {
      success: false,
      error: result.error || '安装失败'
    };
  }

  /**
   * Phase 3: 卸载插件
   */
  async uninstallPlugin(pluginName: string): Promise<{ success: boolean; error?: string }> {
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    if (!workspacePath) {
      console.warn('No workspace folder found');
      return { success: false, error: '未找到工作区文件夹' };
    }

    const command = `plugin uninstall "${pluginName}"`;

    const result = await execClaudeCommand(command, {
      cwd: workspacePath
    });

    // 清除缓存
    this.marketplaceCache.clear();

    if (result.status === 'success') {
      return { success: true };
    }

    return {
      success: false,
      error: result.error || '卸载失败'
    };
  }

  /**
   * Phase 3: 检查插件更新
   */
  async checkUpdate(pluginName: string, installedVersion: string): Promise<boolean> {
    try {
      // 获取所有可用插件
      const allPlugins = await this.getAllAvailablePlugins();
      const plugin = allPlugins.find(p => p.name === pluginName);

      if (!plugin) {
        return false;
      }

      // 比较版本号
      const latestVersion = plugin.version;
      return this.compareVersions(latestVersion, installedVersion) > 0;
    } catch (error) {
      console.error('Failed to check update:', error);
      return false;
    }
  }

  /**
   * 辅助方法: 读取市场配置文件
   */
  private async readMarketplaceConfig(marketplaceName: string): Promise<MarketplaceConfig> {
    const marketplacePath = path.join(
      os.homedir(),
      '.claude',
      'plugins',
      'marketplaces',
      marketplaceName,
      '.claude-plugin',
      'marketplace.json'
    );

    const content = await fs.readFile(marketplacePath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * 辅助方法: 检查缓存是否有效
   */
  private isCacheValid(): boolean {
    return Date.now() - this.cacheTimestamp < this.CACHE_DURATION;
  }

  /**
   * 辅助方法: 比较版本号
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

  /**
   * 清除缓存（用于手动刷新）
   */
  clearCache(): void {
    this.marketplaceCache.clear();
    this.cacheTimestamp = 0;
  }
}
