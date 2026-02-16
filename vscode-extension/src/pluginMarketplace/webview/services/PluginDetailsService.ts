// vscode-extension/src/pluginMarketplace/webview/services/PluginDetailsService.ts

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  PluginDetailData,
  SkillInfo,
  HookInfo,
  McpInfo,
  CommandInfo,
  RepositoryInfo
} from '../messages/types';
import { PluginInfo } from '../../types';

/**
 * 插件详情数据服务
 * 获取插件的详细信息，包括 README、Skills、Hooks 等
 */
export class PluginDetailsService {
  constructor(private context: vscode.ExtensionContext) {}

  /**
   * 获取插件详情
   * 已安装插件从本地读取，未安装插件从市场源获取
   */
  async getPluginDetail(
    pluginName: string,
    marketplace: string,
    isInstalled: boolean
  ): Promise<PluginDetailData> {
    if (isInstalled) {
      return this.getInstalledPluginDetail(pluginName);
    }
    return this.getRemotePluginDetail(pluginName, marketplace);
  }

  /**
   * 获取已安装插件的详情（从本地文件读取）
   */
  public async getInstalledPluginDetail(pluginName: string): Promise<PluginDetailData> {
    // 获取插件目录
    const pluginPath = await this.getPluginPath(pluginName);
    if (!pluginPath) {
      throw new Error(`找不到插件 ${pluginName} 的安装目录`);
    }

    // 读取 package.json
    const packageJsonPath = path.join(pluginPath, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

    // 读取 README
    const readme = await this.readReadme(pluginPath);

    // 解析插件内容
    const skills = this.parseSkills(packageJson);
    const hooks = this.parseHooks(packageJson);
    const mcps = this.parseMcps(packageJson);
    const commands = this.parseCommands(packageJson);
    const repository = this.parseRepository(packageJson);
    const dependencies = this.parseDependencies(packageJson);

    return {
      name: packageJson.name || pluginName,
      description: packageJson.description || '',
      version: packageJson.version || '0.0.0',
      author: packageJson.author?.name || packageJson.author,
      homepage: packageJson.homepage,
      category: packageJson.keywords?.[0],
      marketplace: 'installed',
      installed: true,
      readme,
      skills,
      hooks,
      mcps,
      commands,
      repository,
      dependencies,
      license: packageJson.license
    };
  }

  /**
   * 获取远程插件的详情（从市场源获取）
   */
  public async getRemotePluginDetail(
    pluginName: string,
    marketplace: string
  ): Promise<PluginDetailData> {
    // 从缓存管理器获取市场信息
    const { CacheManager } = await import('./CacheManager');
    const cache = new CacheManager(this.context);
    const marketplaces = await cache.getMarketplaces();
    const market = marketplaces.find(m => m.name === marketplace);

    if (!market) {
      throw new Error(`找不到市场 ${marketplace}`);
    }

    // 获取插件列表找到目标插件
    const plugins = await cache.getAllPlugins();
    const plugin = plugins.find(p => p.name === pluginName && p.marketplace === marketplace);

    if (!plugin) {
      throw new Error(`找不到插件 ${pluginName}@${marketplace}`);
    }

    // 根据市场类型获取详情
    let readme = '';
    let repository: RepositoryInfo | undefined;

    if (market.source.source === 'github' && market.source.repo) {
      const repoInfo = this.parseGitHubRepo(market.source.repo);
      readme = await this.fetchGitHubReadme(repoInfo.owner, repoInfo.repo, pluginName);
      repository = {
        type: 'github',
        url: `https://github.com/${repoInfo.owner}/${repoInfo.repo}`,
        stars: await this.fetchGitHubStars(repoInfo.owner, repoInfo.repo)
      };
    }

    // 从插件基础信息解析
    const skills: SkillInfo[] = [];
    const hooks: HookInfo[] = [];
    const mcps: McpInfo[] = [];
    const commands: CommandInfo[] = [];

    return {
      name: plugin.name,
      description: plugin.description,
      version: plugin.version,
      author: plugin.author?.name,
      homepage: plugin.homepage,
      category: plugin.category,
      marketplace,
      installed: false,
      readme,
      skills,
      hooks,
      mcps,
      commands,
      repository,
      dependencies: [],
      license: undefined
    };
  }

  /**
   * 获取插件安装路径
   * 在所有市场目录中搜索插件
   * 实际路径结构: ~/.claude/plugins/cache/{marketplace}/{pluginName}/{version}/package.json
   */
  public async getPluginPath(pluginName: string): Promise<string | null> {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const cacheBasePath = path.join(homeDir || '', '.claude', 'plugins', 'cache');

    // 首先尝试从缓存目录搜索
    if (homeDir) {
      try {
        // 列出所有市场目录
        const marketplaces = await fs.readdir(cacheBasePath, { withFileTypes: true });

        for (const market of marketplaces) {
          if (!market.isDirectory()) continue;

          const marketPath = path.join(cacheBasePath, market.name);

          // 尝试查找插件目录（可能包含版本号）
          try {
            const items = await fs.readdir(marketPath, { withFileTypes: true });

            for (const item of items) {
              if (!item.isDirectory()) continue;

              // 检查是否是目标插件目录（可能带版本号后缀）
              if (item.name === pluginName || item.name.startsWith(pluginName + '@')) {
                const pluginDirPath = path.join(marketPath, item.name);

                // 检查此目录是否直接包含 package.json
                try {
                  const packageJsonPath = path.join(pluginDirPath, 'package.json');
                  await fs.access(packageJsonPath);
                  return pluginDirPath;
                } catch {
                  // 如果没有 package.json，尝试查找版本子目录
                  try {
                    const subItems = await fs.readdir(pluginDirPath, { withFileTypes: true });
                    for (const subItem of subItems) {
                      if (!subItem.isDirectory()) continue;

                      const subDirPath = path.join(pluginDirPath, subItem.name);
                      const subPackageJsonPath = path.join(subDirPath, 'package.json');

                      try {
                        await fs.access(subPackageJsonPath);
                        return subDirPath;
                      } catch {
                        continue;
                      }
                    }
                  } catch {
                    continue;
                  }
                }
              }
            }
          } catch {
            continue;
          }
        }
      } catch {
        // 忽略错误，继续尝试其他路径
      }
    }

    // 尝试项目目录
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (workspacePath) {
      const projectPluginPath = path.join(workspacePath, '.claude', 'plugins', pluginName);
      try {
        await fs.access(projectPluginPath);
        return projectPluginPath;
      } catch {
        // 继续尝试
      }
    }

    return null;
  }

  /**
   * 读取 README 文件
   */
  public async readReadme(pluginPath: string): Promise<string> {
    const readmeNames = ['README.md', 'readme.md', 'Readme.md'];
    for (const name of readmeNames) {
      const readmePath = path.join(pluginPath, name);
      try {
        return await fs.readFile(readmePath, 'utf-8');
      } catch {
        // 继续尝试下一个
      }
    }
    return '';
  }

  /**
   * 从 GitHub 获取 README
   */
  private async fetchGitHubReadme(owner: string, repo: string, pluginName: string): Promise<string> {
    try {
      // 尝试从插件的 skills 目录获取
      const url = `https://raw.githubusercontent.com/${owner}/${repo}/main/skills/${pluginName}/README.md`;
      const response = await fetch(url);
      if (response.ok) {
        return await response.text();
      }
      // 尝试根目录
      const rootUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`;
      const rootResponse = await fetch(rootUrl);
      if (rootResponse.ok) {
        return await rootResponse.text();
      }
    } catch {
      // 忽略错误
    }
    return '';
  }

  /**
   * 获取 GitHub stars 数
   */
  private async fetchGitHubStars(owner: string, repo: string): Promise<number> {
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

  /**
   * 解析 GitHub 仓库信息
   */
  private parseGitHubRepo(repo: string): { owner: string; repo: string } {
    const match = repo.match(/github\.com[:/]([^/]+)\/(.+?)(\.git)?$/);
    if (!match) {
      throw new Error(`无效的 GitHub 仓库地址: ${repo}`);
    }
    return { owner: match[1], repo: match[2] };
  }

  /**
   * 解析 Skills
   */
  private parseSkills(packageJson: any): SkillInfo[] {
    const skills: SkillInfo[] = [];
    const skillsDir = packageJson.claude?.skills;
    if (skillsDir) {
      // 如果指定了 skills 目录，解析该目录
      // 这里简化处理，实际可以读取目录结构
    }
    return skills;
  }

  /**
   * 解析 Hooks
   */
  private parseHooks(packageJson: any): HookInfo[] {
    const hooks: HookInfo[] = [];
    const hooksConfig = packageJson.claude?.hooks;
    if (hooksConfig) {
      // 解析 hooks 配置
    }
    return hooks;
  }

  /**
   * 解析 MCPs
   */
  private parseMcps(packageJson: any): McpInfo[] {
    const mcps: McpInfo[] = [];
    const mcpsConfig = packageJson.claude?.mcps;
    if (mcpsConfig) {
      // 解析 mcp 配置
    }
    return mcps;
  }

  /**
   * 解析 Commands
   */
  private parseCommands(packageJson: any): CommandInfo[] {
    const commands: CommandInfo[] = [];
    const commandsConfig = packageJson.claude?.commands;
    if (commandsConfig) {
      // 解析 command 配置
    }
    return commands;
  }

  /**
   * 解析仓库信息
   */
  public parseRepository(packageJson: any): RepositoryInfo | undefined {
    const repo = packageJson.repository;
    if (!repo) return undefined;

    if (typeof repo === 'string') {
      if (repo.includes('github.com')) {
        return { type: 'github', url: repo };
      }
      return { type: 'other', url: repo };
    }

    if (repo.type === 'github') {
      return {
        type: 'github',
        url: `https://github.com/${repo.owner}/${repo.name}`
      };
    }

    return { type: 'other', url: repo.url || '' };
  }

  /**
   * 解析依赖
   */
  public parseDependencies(packageJson: any): string[] {
    const deps = packageJson.dependencies || {};
    return Object.keys(deps);
  }
}
