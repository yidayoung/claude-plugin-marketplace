// vscode-extension/src/pluginMarketplace/data/DataLoader.ts

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { execClaudeCommand, InstalledPlugin } from '../types';
import { MarketplaceInfo, PluginInfo } from './types';
import { PluginDetailData } from '../webview/messages/types';

/**
 * 数据加载器
 * 负责从文件系统和 CLI 加载数据
 */
export class DataLoader {
  constructor(private context: vscode.ExtensionContext) {}

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
   * 获取插件详情（占位方法，将在 Task 9 中实现完整逻辑）
   */
  async getPluginDetail(
    pluginName: string,
    marketplace: string,
    isInstalled: boolean
  ): Promise<PluginDetailData> {
    // TODO: 迁移自 PluginDetailsService 的逻辑
    // 这里会调用 parseSkills, parseAgents 等方法
    // 完整实现会在 Task 9 中从现有代码迁移
    throw new Error('Plugin detail parsing not yet implemented - will be migrated in Task 9');
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
