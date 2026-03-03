// vscode-extension/src/pluginMarketplace/data/DataLoader.ts

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { execClaudeCommand, InstalledPlugin } from '../types';
import { MarketplaceInfo, PluginInfo } from './types';
import { PluginDetailData } from '../webview/messages/types';
import { PluginDetailsService } from '../webview/services/PluginDetailsService';
import { logger } from '../../shared/utils/logger';

/**
 * 数据加载器
 * 负责从文件系统和 CLI 加载数据
 */
export class DataLoader {
  private pluginDetailsService: PluginDetailsService;

  constructor(private context: vscode.ExtensionContext) {
    this.pluginDetailsService = new PluginDetailsService(context);
  }

  /**
   * 加载已安装插件列表
   * CLI返回格式可能是数组或对象
   * 重要：需要在当前工作目录下执行，才能正确识别 local 作用域的插件
   */
  async loadInstalledPlugins(): Promise<InstalledPlugin[]> {
    // 获取当前工作目录，确保能正确识别 local 插件
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    const result = await execClaudeCommand('plugin list --json', {
      cwd: workspacePath // 在当前工作目录下执行
    });

    if (result.status !== 'success') {
      logger.error('加载已安装插件列表失败:', result.error);
      throw new Error(result.error || 'Failed to list installed plugins');
    }

    const installedPlugins: InstalledPlugin[] = [];

    // CLI 返回的可能是数组格式
    if (Array.isArray(result.data)) {
      for (const plugin of result.data) {
        // CLI 返回的格式: { id: "name@marketplace", version, enabled, scope, installPath }
        // 需要从 id 字段解析出 name 和 marketplace
        const pluginId = plugin.id;
        let name = plugin.name;
        let marketplace = plugin.marketplace;

        if (pluginId && pluginId.includes('@')) {
          const [parsedName, parsedMarketplace] = pluginId.split('@');
          name = parsedName;
          marketplace = parsedMarketplace;
        }

        installedPlugins.push({
          name: name || '',
          marketplace: marketplace || '',
          version: plugin.version,
          enabled: plugin.enabled ?? true,
          scope: plugin.scope,
          installPath: plugin.installPath
        });
      }
    } else {
      // 或者是对象格式 { plugins: { "name@marketplace": [entries] } }
      const pluginsData = result.data?.plugins || result.data || {};

      for (const [key, entries] of Object.entries(pluginsData)) {
        // key 格式: "name@marketplace"
        const [name, marketplace] = key.split('@');

        // 取第一个安装条目（通常只有一个）
        const firstEntry = (entries as any[])[0];
        if (firstEntry) {
          installedPlugins.push({
            name,
            marketplace,
            version: firstEntry.version,
            enabled: true, // 默认启用，后续会从 settings.json 合并
            scope: firstEntry.scope,
            installPath: firstEntry.installPath
          });
        }
      }
    }

    logger.debug(`加载了 ${installedPlugins.length} 个已安装插件`);
    return installedPlugins;
  }

  /**
   * 加载市场列表
   * 从 known_marketplaces.json 解析，格式为 { [name]: { source, installLocation, lastUpdated } }
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

      // known_marketplaces.json 格式: { [name]: { source, installLocation, lastUpdated } }
      return Object.entries(data).map(([name, info]: [string, any]) => ({
        name,
        source: info.source,
      }));
    } catch (error) {
      logger.error('加载 known_marketplaces.json 失败:', error);
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
        enabled: false, // 初始化为 false
        scope: undefined, // 初始化为 undefined
      }));
    } catch (error) {
      logger.error(`加载市场 ${marketplace.name} 的插件列表失败:`, error);
      return [];
    }
  }

  /**
   * 获取插件详情
   * 委托给现有的 PluginDetailsService
   * TODO: 未来可以将解析逻辑逐步迁移到 DataLoader
   */
  async getPluginDetail(
    pluginName: string,
    marketplace: string,
    isInstalled: boolean,
    enabled?: boolean,
    scope?: 'user' | 'project' | 'local',
    locale?: string
  ): Promise<PluginDetailData> {
    return this.pluginDetailsService.getPluginDetail(pluginName, marketplace, isInstalled, enabled, scope, locale);
  }

  /**
   * 获取 GitHub stars（异步，不阻塞）
   */
  async fetchGitHubStars(owner: string, repo: string): Promise<number | undefined> {
    const repoKey = `${owner}/${repo}`;
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
      const remaining = response.headers.get('x-ratelimit-remaining');
      const reset = response.headers.get('x-ratelimit-reset');
      logger.debug(
        `[DataLoader] fetchGitHubStars response repo=${repoKey} status=${response.status} remaining=${remaining ?? 'n/a'} reset=${reset ?? 'n/a'}`
      );

      if (response.ok) {
        const data = (await response.json()) as { stargazers_count?: number };
        if (typeof data.stargazers_count === 'number') {
          logger.debug(`[DataLoader] fetchGitHubStars success repo=${repoKey} stars=${data.stargazers_count}`);
          return data.stargazers_count;
        }
        logger.warn(`[DataLoader] fetchGitHubStars missing stargazers_count repo=${repoKey}`);
        return undefined;
      }

      logger.warn(`[DataLoader] fetchGitHubStars non-ok response repo=${repoKey} status=${response.status}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.warn(`[DataLoader] fetchGitHubStars failed repo=${repoKey}: ${errorMsg}`);
    }
    return undefined;
  }

  /**
   * 清除插件详情缓存
   * 用于状态变更时确保返回最新数据
   */
  clearPluginDetailCache(pluginName: string, marketplace?: string): void {
    this.pluginDetailsService.clearCache(pluginName, marketplace);
  }
}
