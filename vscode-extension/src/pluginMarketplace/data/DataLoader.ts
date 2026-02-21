// vscode-extension/src/pluginMarketplace/data/DataLoader.ts

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { execClaudeCommand, InstalledPlugin } from '../types';
import { MarketplaceInfo, PluginInfo } from './types';
import { PluginDetailData } from '../webview/messages/types';
import { PluginDetailsService } from '../webview/services/PluginDetailsService';

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

  /**
   * 获取插件详情
   * 委托给现有的 PluginDetailsService
   * TODO: 未来可以将解析逻辑逐步迁移到 DataLoader
   */
  async getPluginDetail(
    pluginName: string,
    marketplace: string,
    isInstalled: boolean
  ): Promise<PluginDetailData> {
    // 委托给现有的 PluginDetailsService
    // 该服务已经实现了完整的解析逻辑（parseSkills, parseAgents 等）
    return this.pluginDetailsService.getPluginDetail(pluginName, marketplace, isInstalled);
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
}
