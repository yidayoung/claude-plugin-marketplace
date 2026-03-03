// vscode-extension/src/pluginMarketplace/webview/services/FileParser.ts

import * as fs from 'fs/promises';
import * as vscode from 'vscode';
import {
  CLAUDE_PATHS,
  InstalledPluginsData,
  SettingsData,
  KnownMarketplacesData,
  InstalledPlugin,
  MarketplaceInfo,
  MarketplaceConfig,
  PluginScope
} from '../../types';
import { logger } from '../../../shared/utils/logger';

/**
 * 文件解析类 - 从本地 Claude 配置文件读取数据
 */
export class FileParser {
  /**
   * 解析已安装插件列表
   * 读取: ~/.claude/plugins/installed_plugins.json
   */
  async parseInstalledPlugins(): Promise<InstalledPlugin[]> {
    try {
      const content = await fs.readFile(CLAUDE_PATHS.installedPlugins, 'utf-8');
      const data: InstalledPluginsData = JSON.parse(content);

      return Object.entries(data.plugins).flatMap(([key, entries]) =>
        entries.map(entry => {
          const [name, marketplace] = key.split('@');
          return {
            name,
            marketplace,
            version: entry.version,
            enabled: true, // 默认启用，稍后合并启用状态
            scope: entry.scope,
            installPath: entry.installPath
          };
        })
      );
    } catch (error) {
      logger.error('Failed to parse installed plugins:', error);
      return [];
    }
  }

  /**
   * 解析启用状态
   * 读取: ~/.claude/settings.json 和 {project}/.claude/settings.local.json
   */
  async parseEnabledPlugins(): Promise<Map<string, boolean>> {
    const enabled = new Map<string, boolean>();

    // 读取用户级别设置
    try {
      const userContent = await fs.readFile(CLAUDE_PATHS.userSettings, 'utf-8');
      const userData: SettingsData = JSON.parse(userContent);
      Object.entries(userData.enabledPlugins || {}).forEach(([key, value]) => {
        enabled.set(key, value);
      });
    } catch (error) {
      // 文件不存在时忽略
    }

    // 读取项目级别设置
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (workspacePath) {
      try {
        const projectPath = CLAUDE_PATHS.getProjectSettings(workspacePath);
        const projectContent = await fs.readFile(projectPath, 'utf-8');
        const projectData: SettingsData = JSON.parse(projectContent);
        Object.entries(projectData.enabledPlugins || {}).forEach(([key, value]) => {
          enabled.set(key, value);
        });
      } catch (error) {
        // 文件不存在时忽略
      }
    }

    return enabled;
  }

  /**
   * 解析市场列表
   * 读取: ~/.claude/plugins/known_marketplaces.json
   */
  async parseMarketplaces(): Promise<MarketplaceInfo[]> {
    try {
      const content = await fs.readFile(CLAUDE_PATHS.knownMarketplaces, 'utf-8');
      const data: KnownMarketplacesData = JSON.parse(content);

      return Object.entries(data).map(([name, info]) => ({
        name,
        source: info.source,
        installLocation: info.installLocation,
        lastUpdated: new Date(info.lastUpdated),
        autoUpdate: info.autoUpdate
      }));
    } catch (error) {
      logger.error('Failed to parse marketplaces:', error);
      return [];
    }
  }

  /**
   * 解析市场插件配置
   * 读取: ~/.claude/plugins/marketplaces/{name}/.claude-plugin/marketplace.json
   */
  async parseMarketplacePlugins(marketplaceName: string): Promise<MarketplaceConfig | null> {
    try {
      const configPath = CLAUDE_PATHS.getMarketplaceConfig(marketplaceName);
      const content = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      logger.error(`Failed to parse marketplace config for ${marketplaceName}:`, error);
      return null;
    }
  }
}
