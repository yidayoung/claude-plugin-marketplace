// vscode-extension/src/pluginMarketplace/webview/services/PluginPathResolver.ts

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * 插件路径解析器
 * 负责在文件系统中查找插件路径
 */
export class PluginPathResolver {
  constructor(private context: vscode.ExtensionContext) {}

  /**
   * 查找插件安装路径
   * 在所有市场目录中搜索插件
   */
  async findPluginPath(pluginName: string, marketplace?: string): Promise<string | null> {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (!homeDir) return null;

    const cacheBasePath = path.join(homeDir, '.claude', 'plugins', 'cache');

    // 搜索路径列表：缓存目录和市场目录
    const searchPaths = [
      cacheBasePath,
      path.join(homeDir, '.claude', 'plugins', 'marketplaces'),
    ];

    for (const basePath of searchPaths) {
      const result = await this.searchInBasePath(basePath, pluginName, marketplace);
      if (result) return result;
    }

    // 尝试项目目录
    return this.searchInProjectDir(pluginName);
  }

  /**
   * 获取插件的本地市场源路径
   * 通过读取 marketplace.json 获取插件的 source 配置
   * - 相对路径：直接从市场目录读取
   * - 远程 Git：未安装时无法读取，返回 null
   */
  async getLocalMarketPath(pluginName: string, marketplace: string): Promise<string | null> {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (!homeDir) return null;

    const marketplacePath = path.join(homeDir, '.claude', 'plugins', 'marketplaces', marketplace);
    const marketplaceJsonPath = path.join(marketplacePath, '.claude-plugin', 'marketplace.json');

    try {
      const marketplaceContent = await fs.readFile(marketplaceJsonPath, 'utf-8');
      const marketplaceConfig = JSON.parse(marketplaceContent);

      const pluginConfig = marketplaceConfig.plugins?.find((p: any) => p.name === pluginName);
      if (!pluginConfig) return null;

      const source = pluginConfig.source;

      // 处理相对路径 source
      if (typeof source === 'string' && source.startsWith('./')) {
        const relativePath = source.slice(2);
        const fullPath = path.join(marketplacePath, relativePath);

        try {
          await fs.access(fullPath);
          return fullPath;
        } catch {
          return null;
        }
      }

      // 远程 Git 仓库
      if (typeof source === 'object') {
        return null;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * 在基础路径下搜索插件
   */
  private async searchInBasePath(basePath: string, pluginName: string, marketplace?: string): Promise<string | null> {
    try {
      const marketplaces = await fs.readdir(basePath, { withFileTypes: true });

      for (const market of marketplaces) {
        if (!market.isDirectory()) continue;

        // 如果指定了 marketplace，只搜索该市场
        if (marketplace && market.name !== marketplace) {
          continue;
        }

        const marketPath = path.join(basePath, market.name);

        const result = await this.searchInMarketPath(marketPath, pluginName);
        if (result) return result;
      }
    } catch {
      // 忽略错误
    }

    return null;
  }

  /**
   * 在单个市场目录下搜索插件
   */
  private async searchInMarketPath(marketPath: string, pluginName: string): Promise<string | null> {
    try {
      const items = await fs.readdir(marketPath, { withFileTypes: true });

      for (const item of items) {
        if (!item.isDirectory()) continue;

        // 检查是否是目标插件目录（可能带版本号后缀）
        if (item.name === pluginName || item.name.startsWith(pluginName + '@')) {
          const pluginDirPath = path.join(marketPath, item.name);

          // 验证这是有效的插件目录
          if (await this.isValidPluginDir(pluginDirPath)) {
            return pluginDirPath;
          }

          // 尝试查找版本子目录
          const subResult = await this.searchInVersionSubdir(pluginDirPath);
          if (subResult) return subResult;
        }
      }
    } catch {
      // 忽略错误
    }

    return null;
  }

  /**
   * 验证是否是有效的插件目录
   */
  private async isValidPluginDir(dirPath: string): Promise<boolean> {
    const configPaths = [
      path.join(dirPath, 'package.json'),
      path.join(dirPath, 'plugin.json'),
      path.join(dirPath, '.claude-plugin', 'plugin.json'),
    ];

    for (const configPath of configPaths) {
      try {
        await fs.access(configPath);
        return true;
      } catch {
        continue;
      }
    }

    return false;
  }

  /**
   * 在版本子目录中搜索
   */
  private async searchInVersionSubdir(pluginDirPath: string): Promise<string | null> {
    try {
      const subItems = await fs.readdir(pluginDirPath, { withFileTypes: true });
      for (const subItem of subItems) {
        if (!subItem.isDirectory()) continue;

        const subDirPath = path.join(pluginDirPath, subItem.name);

        const subConfigPaths = [
          path.join(subDirPath, 'package.json'),
          path.join(subDirPath, 'plugin.json'),
          path.join(subDirPath, '.claude-plugin', 'plugin.json'),
          path.join(subDirPath, 'README.md'),
          path.join(subDirPath, 'readme.md'),
        ];

        for (const subConfigPath of subConfigPaths) {
          try {
            await fs.access(subConfigPath);
            return subDirPath;
          } catch {
            continue;
          }
        }
      }

      // 如果插件目录本身有 README.md
      for (const name of ['README.md', 'readme.md', 'Readme.md']) {
        try {
          await fs.access(path.join(pluginDirPath, name));
          return pluginDirPath;
        } catch {
          continue;
        }
      }
    } catch {
      // 忽略错误
    }

    return null;
  }

  /**
   * 在项目目录中搜索插件
   */
  private async searchInProjectDir(pluginName: string): Promise<string | null> {
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspacePath) return null;

    const projectPluginPath = path.join(workspacePath, '.claude', 'plugins', pluginName);
    try {
      await fs.access(projectPluginPath);
      return projectPluginPath;
    } catch {
      return null;
    }
  }
}
