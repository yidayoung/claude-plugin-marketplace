// vscode-extension/src/pluginMarketplace/webview/services/PluginDetailsService.ts

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  PluginDetailData,
  SkillInfo,
  AgentInfo,
  HookInfo,
  HookConfig,
  McpInfo,
  LspInfo,
  CommandInfo,
  OutputStyleInfo,
  RepositoryInfo
} from '../messages/types';
import { PluginInfo } from '../../types';

/**
 * 插件详情缓存条目
 */
interface DetailCacheEntry {
  data: PluginDetailData;
  timestamp: number;
}

/**
 * 插件详情数据服务
 * 获取插件的详细信息，包括 README、Skills、Hooks 等
 */
export class PluginDetailsService {
  // 简单的内存缓存，键为 "pluginName@marketplace"
  private cache = new Map<string, DetailCacheEntry>();
  // 缓存过期时间（5分钟）
  private readonly CACHE_TTL = 5 * 60 * 1000;
  // 本地市场路径缓存，避免重复查找
  private localPathCache = new Map<string, string>();

  constructor(private context: vscode.ExtensionContext) {}

  /**
   * 获取插件详情
   * 已安装插件从本地读取，未安装插件从市场源获取
   * 使用缓存提高重复访问的性能
   * @param enabledFromStore 从 PluginDataStore 传递的启用状态（单一数据源）
   * @param scopeFromStore 从 PluginDataStore 传递的作用域（单一数据源）
   */
  async getPluginDetail(
    pluginName: string,
    marketplace: string,
    isInstalled: boolean,
    enabledFromStore?: boolean,
    scopeFromStore?: 'user' | 'project' | 'local'
  ): Promise<PluginDetailData> {
    const cacheKey = `${pluginName}@${marketplace}`;

    // 检查缓存（注意：如果状态发生变化，需要清除缓存）
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      // 如果有从 Store 传递的状态，更新缓存数据
      if (enabledFromStore !== undefined || scopeFromStore !== undefined) {
        return {
          ...cached.data,
          enabled: enabledFromStore ?? cached.data.enabled,
          scope: scopeFromStore ?? cached.data.scope,
        };
      }
      return cached.data;
    }

    // 获取数据，传递来自 Store 的状态
    const data = isInstalled
      ? await this.getInstalledPluginDetail(pluginName, marketplace, enabledFromStore, scopeFromStore)
      : await this.getRemotePluginDetail(pluginName, marketplace, enabledFromStore, scopeFromStore);

    // 更新缓存
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    return data;
  }

  /**
   * 清除指定插件的缓存
   */
  clearCache(pluginName: string, marketplace?: string): void {
    if (marketplace) {
      this.cache.delete(`${pluginName}@${marketplace}`);
      this.localPathCache.delete(`${pluginName}@${marketplace}`);
    } else {
      // 清除所有匹配的缓存
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${pluginName}@`)) {
          this.cache.delete(key);
          this.localPathCache.delete(key);
        }
      }
    }
  }

  /**
   * 清除所有缓存
   */
  clearAllCache(): void {
    this.cache.clear();
    this.localPathCache.clear();
    console.log('[PluginDetailsService] All caches cleared');
  }

  /**
   * 获取插件的本地市场源路径
   * 通过读取 marketplace.json 获取插件的 source 配置
   * - 相对路径：直接从市场目录读取
   * - 远程 Git：未安装时无法读取，返回 null
   */
  private async getLocalMarketPath(
    pluginName: string,
    marketplace: string
  ): Promise<string | null> {
    const cacheKey = `${pluginName}@${marketplace}`;

    // 检查缓存
    const cachedPath = this.localPathCache.get(cacheKey);
    if (cachedPath) {
      try {
        await fs.access(cachedPath);
        return cachedPath;
      } catch {
        // 缓存的路径不存在，清除缓存
        this.localPathCache.delete(cacheKey);
      }
    }

    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (!homeDir) {
      console.error('[PluginDetailsService] Cannot determine HOME directory');
      return null;
    }

    const marketplacePath = path.join(homeDir, '.claude', 'plugins', 'marketplaces', marketplace);
    const marketplaceJsonPath = path.join(marketplacePath, '.claude-plugin', 'marketplace.json');

    console.log(`[PluginDetailsService] Looking for marketplace.json at: ${marketplaceJsonPath}`);

    try {
      // 读取 marketplace.json
      const marketplaceContent = await fs.readFile(marketplaceJsonPath, 'utf-8');
      const marketplaceConfig = JSON.parse(marketplaceContent);

      // 查找目标插件
      const pluginConfig = marketplaceConfig.plugins?.find((p: any) => p.name === pluginName);
      if (!pluginConfig) {
        console.log(`[PluginDetailsService] Plugin ${pluginName} not found in marketplace.json`);
        return null;
      }

      const source = pluginConfig.source;
      console.log(`[PluginDetailsService] Plugin ${pluginName} source:`, source);

      // 处理相对路径 source
      if (typeof source === 'string' && source.startsWith('./')) {
        const relativePath = source.slice(2); // 去掉 ./
        const fullPath = path.join(marketplacePath, relativePath);

        try {
          await fs.access(fullPath);
          console.log(`[PluginDetailsService] Found local path: ${fullPath}`);
          this.localPathCache.set(cacheKey, fullPath);
          return fullPath;
        } catch {
          console.log(`[PluginDetailsService] Local path not accessible: ${fullPath}`);
          return null;
        }
      }

      // 远程 Git 仓库
      if (typeof source === 'object') {
        console.log(`[PluginDetailsService] Plugin ${pluginName} has remote source, skipping local read`);
        return null;
      }

      console.log(`[PluginDetailsService] Unknown source type for ${pluginName}:`, source);
      return null;
    } catch (error) {
      console.error(`[PluginDetailsService] Error reading marketplace.json:`, error);
      return null;
    }
  }

  /**
   * 获取已安装插件的详情（从本地文件读取）
   * 如果本地找不到，会回退到远程获取
   * @param enabledFromStore 从 PluginDataStore 传递的启用状态（单一数据源）
   * @param scopeFromStore 从 PluginDataStore 传递的作用域（单一数据源）
   */
  public async getInstalledPluginDetail(
    pluginName: string,
    marketplace: string,
    enabledFromStore?: boolean,
    scopeFromStore?: 'user' | 'project' | 'local'
  ): Promise<PluginDetailData> {
    // 获取插件目录（传递 marketplace 以精确匹配）
    const pluginPath = await this.getPluginPath(pluginName, marketplace);
    if (!pluginPath) {
      // 本地找不到，回退到远程获取
      console.log(`[PluginDetailsService] Plugin ${pluginName}@${marketplace} not found locally, fetching from remote`);
      return this.getRemotePluginDetail(pluginName, marketplace);
    }

    // 查找并读取配置文件（package.json 或 plugin.json）
    // 如果没有配置文件，使用空对象
    const configJson = await this.readPluginConfig(pluginPath);

    // 读取 README
    const readme = await this.readReadme(pluginPath);

    // 解析插件内容（并行执行以提高性能）
    // 传入 configJson 以获取自定义路径配置
    const [skills, agents, commands, hooks, mcps, lsps, outputStyles] = await Promise.all([
      this.parseSkills(pluginPath, configJson),
      this.parseAgents(pluginPath, configJson),
      this.parseCommands(pluginPath, configJson),
      this.parseHooks(pluginPath, configJson),
      this.parseMcps(pluginPath, configJson),
      this.parseLsps(pluginPath, configJson),
      this.parseOutputStyles(pluginPath, configJson),
    ]);

    const repository = configJson ? this.parseRepository(configJson) : undefined;
    const dependencies = configJson ? this.parseDependencies(configJson) : [];

    // 如果没有 README 且没有其他内容，尝试从远程获取
    if (!readme && skills.length === 0 && agents.length === 0 && commands.length === 0) {
      console.log(`[PluginDetailsService] Plugin ${pluginName} has no local content, fetching from remote`);
      return this.getRemotePluginDetail(pluginName, marketplace);
    }

    // 获取启用状态和作用域（如果从 Store 传递了，直接使用；否则从文件解析）
    let enabled = enabledFromStore;
    let scope = scopeFromStore;
    let actualMarketplace = marketplace;

    if (enabledFromStore === undefined || scopeFromStore === undefined) {
      // 只有在 Store 没有传递状态时才从文件解析（保持兼容性）
      const { FileParser } = await import('./FileParser');
      const parser = new FileParser();
      const [installedPlugins, enabledMap] = await Promise.all([
        parser.parseInstalledPlugins(),
        parser.parseEnabledPlugins()
      ]);

      // 查找当前插件的安装信息 - 需要同时匹配插件名和市场名
      const installedInfo = installedPlugins.find(p => p.name === pluginName && p.marketplace === marketplace);
      const key = `${pluginName}@${marketplace}`;
      const isEnabled = enabledMap.get(key);

      enabled = enabledFromStore ?? isEnabled ?? true; // 优先使用 Store 传递的值
      scope = scopeFromStore ?? installedInfo?.scope;
      actualMarketplace = installedInfo?.marketplace || marketplace;
    }

    return {
      name: configJson?.name || pluginName,
      description: configJson?.description || '',
      version: configJson?.version || '0.0.0',
      author: configJson?.author?.name || configJson?.author,
      homepage: configJson?.homepage,
      category: configJson?.keywords?.[0],
      marketplace: actualMarketplace, // 使用实际的市场名称
      installed: true,
      enabled: enabled, // 使用从 Store 传递或解析的状态
      scope: scope,
      readme,
      skills,
      agents,
      hooks,
      mcps,
      commands,
      lsps,
      outputStyles,
      repository,
      dependencies,
      license: configJson?.license,
      localPath: pluginPath
    };
  }

  /**
   * 读取插件配置文件（可选）
   * 支持多种路径: package.json, plugin.json, .claude-plugin/plugin.json
   * 如果找不到配置文件，返回 undefined
   */
  private async readPluginConfig(pluginPath: string): Promise<any> {
    const configPaths = [
      path.join(pluginPath, 'package.json'),
      path.join(pluginPath, 'plugin.json'),
      path.join(pluginPath, '.claude-plugin', 'plugin.json'),
    ];

    for (const configPath of configPaths) {
      try {
        const content = await fs.readFile(configPath, 'utf-8');
        return JSON.parse(content);
      } catch {
        // 继续尝试下一个
      }
    }

    // 没有找到配置文件，返回 undefined 而不是抛出错误
    return undefined;
  }

  /**
   * 获取远程插件的详情（从市场源获取）
   * @param enabledFromStore 从 PluginDataStore 传递的启用状态（单一数据源）
   * @param scopeFromStore 从 PluginDataStore 传递的作用域（单一数据源）
   */
  public async getRemotePluginDetail(
    pluginName: string,
    marketplace: string,
    enabledFromStore?: boolean,
    scopeFromStore?: 'user' | 'project' | 'local'
  ): Promise<PluginDetailData> {
    const startTime = Date.now();
    console.log(`[PluginDetailsService] Loading remote plugin: ${pluginName}@${marketplace}`);

    // 从文件解析器获取市场信息
    const { FileParser } = await import('./FileParser');
    const parser = new FileParser();
    const marketplaces = await parser.parseMarketplaces();
    const market = marketplaces.find(m => m.name === marketplace);

    if (!market) {
      throw new Error(`找不到市场 ${marketplace}`);
    }

    // 获取插件列表找到目标插件
    const config = await parser.parseMarketplacePlugins(marketplace);
    const plugins = config?.plugins || [];
    const plugin = plugins.find(p => p.name === pluginName);

    if (!plugin) {
      throw new Error(`找不到插件 ${pluginName}@${marketplace}`);
    }

    // 读取 marketplace.json 获取插件的 source 配置
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    let marketplaceConfig: any = null;
    if (homeDir) {
      const marketplaceJsonPath = path.join(homeDir, '.claude', 'plugins', 'marketplaces', marketplace, '.claude-plugin', 'marketplace.json');
      try {
        const content = await fs.readFile(marketplaceJsonPath, 'utf-8');
        marketplaceConfig = JSON.parse(content);
      } catch {
        // 忽略错误
      }
    }

    const t1 = Date.now();
    console.log(`[PluginDetailsService] Cache lookup took ${t1 - startTime}ms`);

    let readme = '';
    let skills: SkillInfo[] = [];
    let agents: AgentInfo[] = [];
    let commands: CommandInfo[] = [];
    let hooks: HookInfo[] = [];
    let mcps: McpInfo[] = [];
    let lsps: LspInfo[] = [];
    let outputStyles: OutputStyleInfo[] = [];
    let repository: RepositoryInfo | undefined;
    let license: string | undefined;

    let configJson: any = undefined;

    // 使用缓存优化的路径查找方法
    const t2 = Date.now();
    const localMarketPath = await this.getLocalMarketPath(pluginName, marketplace);
    console.log(`[PluginDetailsService] Path lookup took ${Date.now() - t2}ms, found: ${localMarketPath ? 'YES' : 'NO'}`);

    if (localMarketPath) {
      try {
        const t3 = Date.now();

        // 首先读取配置文件（用于获取自定义路径）
        try {
          const configPath = path.join(localMarketPath, '.claude-plugin', 'plugin.json');
          const configContent = await fs.readFile(configPath, 'utf-8');
          configJson = JSON.parse(configContent);
          license = configJson?.license;
          if (configJson?.repository) {
            repository = this.parseRepository(configJson);
          }
        } catch {
          // 配置文件不存在，继续
        }

        const t4 = Date.now();
        console.log(`[PluginDetailsService] Config read took ${t4 - t3}ms`);

        // 读取 README
        readme = await this.readReadme(localMarketPath);

        const t5 = Date.now();
        console.log(`[PluginDetailsService] README read took ${t5 - t4}ms`);

        // 解析插件内容（传入 configJson 以支持自定义路径）
        [skills, agents, commands, hooks, mcps, lsps, outputStyles] = await Promise.all([
          this.parseSkills(localMarketPath, configJson),
          this.parseAgents(localMarketPath, configJson),
          this.parseCommands(localMarketPath, configJson),
          this.parseHooks(localMarketPath, configJson),
          this.parseMcps(localMarketPath, configJson),
          this.parseLsps(localMarketPath, configJson),
          this.parseOutputStyles(localMarketPath, configJson),
        ]);

        const t6 = Date.now();
        console.log(`[PluginDetailsService] Content parsing took ${t6 - t5}ms (skills:${skills.length}, agents:${agents.length}, commands:${commands.length}, hooks:${hooks.length}, mcps:${mcps.length}, lsps:${lsps.length}, outputStyles:${outputStyles.length})`);
      } catch (error) {
        console.error(`[PluginDetailsService] Local read failed:`, error);
        // 本地读取失败，继续使用 GitHub 获取
      }
    }

    // 注意：不再从 GitHub 获取 README 和 stars
    // - README: 本地有就用，没有就留空
    // - stars: 通过延迟加载异步获取
    // 这样可以大幅提升未安装插件的加载速度

    // 确保 repository 对象存在（用于显示 GitHub 链接）
    // 对于远程插件，从插件的 source 配置中获取仓库地址
    if (!repository && !localMarketPath) {
      const pluginConfig = marketplaceConfig.plugins?.find((p: any) => p.name === pluginName);
      if (pluginConfig?.source) {
        const source = pluginConfig.source;
        if (typeof source === 'object') {
          if (source.source === 'github' && source.repo) {
            // GitHub 类型：owner/repo
            repository = {
              type: 'github',
              url: `https://github.com/${source.repo}`
            };
          } else if (source.source === 'url' && source.url) {
            // URL 类型：完整的 Git 仓库 URL
            repository = {
              type: 'other',
              url: source.url
            };
          }
        }
      }
      // 如果还是没有，且 plugin.homepage 存在，使用它作为回退
      if (!repository && plugin.homepage) {
        repository = {
          type: 'other',
          url: plugin.homepage
        };
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`[PluginDetailsService] Total loading time for ${pluginName}@${marketplace}: ${totalTime}ms`);

    // 判断是否为远程源（本地没有完整解析的数据）
    const isRemoteSource = !localMarketPath || (skills.length === 0 && agents.length === 0 && commands.length === 0 && hooks.length === 0 && mcps.length === 0 && lsps.length === 0 && !readme);

    // 检查实际的安装状态（只有在 Store 没有传递状态时才解析）
    let enabled = enabledFromStore;
    let scope = scopeFromStore;
    let installed = false;

    if (enabledFromStore === undefined || scopeFromStore === undefined) {
      // 只有在 Store 没有传递状态时才从文件解析（保持兼容性）
      const installedPlugins = await parser.parseInstalledPlugins();
      const installedInfo = installedPlugins.find(p => p.name === pluginName && p.marketplace === marketplace);
      const key = `${pluginName}@${marketplace}`;
      const enabledMap = await parser.parseEnabledPlugins();
      const isEnabled = enabledMap.get(key);

      installed = !!installedInfo;
      enabled = enabledFromStore ?? isEnabled ?? true; // 优先使用 Store 传递的值
      scope = scopeFromStore ?? installedInfo?.scope;
    }

    return {
      name: plugin.name,
      description: plugin.description,
      version: plugin.version,
      author: plugin.author?.name,
      homepage: plugin.homepage,
      category: plugin.category,
      marketplace,
      installed: installed,
      enabled: enabled, // 使用从 Store 传递或解析的状态
      scope: scope,
      readme,
      skills,
      agents,
      hooks,
      mcps,
      commands,
      lsps,
      outputStyles,
      repository,
      dependencies: [],
      license,
      isRemoteSource,
      localPath: localMarketPath || undefined
    };
  }

  /**
   * 获取插件安装路径
   * 在所有市场目录中搜索插件
   * 实际路径结构:
   * - ~/.claude/plugins/cache/{marketplace}/{pluginName}/{version}/
   * - ~/.claude/plugins/marketplaces/{marketplace}/plugins/{pluginName}/
   * @param pluginName 插件名称
   * @param marketplace 市场名称（用于精确匹配）
   */
  public async getPluginPath(pluginName: string, marketplace?: string): Promise<string | null> {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const cacheBasePath = path.join(homeDir || '', '.claude', 'plugins', 'cache');

    // 搜索路径列表：缓存目录和市场目录
    const searchPaths = [
      cacheBasePath,
      path.join(homeDir || '', '.claude', 'plugins', 'marketplaces'),
    ];

    for (const basePath of searchPaths) {
      if (!homeDir) continue;

      try {
        // 列出所有市场目录
        const marketplaces = await fs.readdir(basePath, { withFileTypes: true });

        for (const market of marketplaces) {
          if (!market.isDirectory()) continue;

          // 如果指定了 marketplace，只搜索该市场
          if (marketplace && market.name !== marketplace) {
            continue;
          }

          const marketPath = path.join(basePath, market.name);

          // 尝试查找插件目录（可能包含版本号）
          try {
            const items = await fs.readdir(marketPath, { withFileTypes: true });

            for (const item of items) {
              if (!item.isDirectory()) continue;

              // 检查是否是目标插件目录（可能带版本号后缀）
              if (item.name === pluginName || item.name.startsWith(pluginName + '@')) {
                const pluginDirPath = path.join(marketPath, item.name);

                // 尝试多种可能的配置文件位置
                const configPaths = [
                  path.join(pluginDirPath, 'package.json'),
                  path.join(pluginDirPath, 'plugin.json'),
                  path.join(pluginDirPath, '.claude-plugin', 'plugin.json'),
                ];

                let foundConfig = false;
                for (const configPath of configPaths) {
                  try {
                    await fs.access(configPath);
                    foundConfig = true;
                    break;
                  } catch {
                    // 继续尝试下一个
                  }
                }

                // 如果找到配置文件，返回插件目录
                if (foundConfig) {
                  return pluginDirPath;
                }

                // 如果没有找到配置文件，尝试查找版本子目录
                try {
                  const subItems = await fs.readdir(pluginDirPath, { withFileTypes: true });
                  for (const subItem of subItems) {
                    if (!subItem.isDirectory()) continue;

                    const subDirPath = path.join(pluginDirPath, subItem.name);

                    // 检查子目录中是否有配置文件或 README
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
                        // 找到配置文件或 README，返回版本目录
                        return subDirPath;
                      } catch {
                        continue;
                      }
                    }
                  }

                  // 如果插件目录本身有 README.md，也返回
                  for (const name of ['README.md', 'readme.md', 'Readme.md']) {
                    try {
                      await fs.access(path.join(pluginDirPath, name));
                      return pluginDirPath;
                    } catch {
                      continue;
                    }
                  }
                } catch {
                  // 继续尝试其他插件目录
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
   * 支持在插件目录或 .claude-plugin 目录中查找
   */
  public async readReadme(pluginPath: string): Promise<string> {
    const readmeLocations = [
      pluginPath,
      path.join(pluginPath, '.claude-plugin'),
    ];

    const readmeNames = ['README.md', 'readme.md', 'Readme.md'];

    for (const baseLocation of readmeLocations) {
      for (const name of readmeNames) {
        const readmePath = path.join(baseLocation, name);
        try {
          return await fs.readFile(readmePath, 'utf-8');
        } catch {
          // 继续尝试下一个
        }
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
   * 异步获取插件的 GitHub stars（不阻塞主流程）
   * 返回 Promise，调用者可以选择 await 或在后台执行
   */
  async fetchPluginStarsAsync(pluginName: string, marketplace: string): Promise<number | null> {
    try {
      const { FileParser } = await import('./FileParser');
      const parser = new FileParser();
      const marketplaces = await parser.parseMarketplaces();
      const market = marketplaces.find(m => m.name === marketplace);

      if (!market || market.source.source !== 'github' || !market.source.repo) {
        return null;
      }

      const repoInfo = this.parseGitHubRepo(market.source.repo);
      const stars = await this.fetchGitHubStars(repoInfo.owner, repoInfo.repo);
      console.log(`[PluginDetailsService] Fetched stars for ${pluginName}: ${stars}`);
      return stars;
    } catch (error) {
      console.error(`[PluginDetailsService] Failed to fetch stars for ${pluginName}:`, error);
      return null;
    }
  }

  /**
   * 解析 GitHub 仓库信息
   * 支持两种格式:
   * - "owner/repo" (简写格式，来自 known_marketplaces.json)
   * - "github.com/owner/repo" 或 "https://github.com/owner/repo" (完整 URL)
   */
  private parseGitHubRepo(repo: string): { owner: string; repo: string } {
    // 先尝试简写格式 owner/repo (不包含 github.com)
    const shortMatch = repo.match(/^([^/]+)\/([^/]+?)(\.git)?$/);
    if (shortMatch && !repo.includes('github.com') && !repo.includes(':')) {
      return { owner: shortMatch[1], repo: shortMatch[2].replace(/\.git$/, '') };
    }

    // 尝试完整 URL 格式
    const fullMatch = repo.match(/github\.com[:/]([^/]+)\/(.+?)(\.git)?$/);
    if (fullMatch) {
      return { owner: fullMatch[1], repo: fullMatch[2].replace(/\.git$/, '') };
    }

    throw new Error(`无效的 GitHub 仓库地址: ${repo}`);
  }

  /**
   * 解析 Skills
   * 目录结构: skills/skill-name/SKILL.md
   * 或者从 plugin.json 的 skills 字段获取自定义路径
   *
   * 自定义路径可能有两种情况:
   * 1. 直接指向一个 skill 目录 (如 ./.claude/skills/ui-ux-pro-max)，该目录下有 SKILL.md
   * 2. 指向一个 skills 集合目录，其子目录各有 SKILL.md
   */
  private async parseSkills(pluginPath: string, configJson?: any): Promise<SkillInfo[]> {
    const skills: SkillInfo[] = [];

    // 尝试从 plugin.json 获取自定义 skills 路径
    const customPaths = this.getCustomPaths(configJson?.skills, pluginPath);

    // 处理自定义路径（优先处理，因为这些路径是明确指定的）
    for (const customPath of customPaths) {
      const parsedFromCustom = await this.parseSkillPath(customPath);
      for (const skill of parsedFromCustom) {
        if (!skills.find(s => s.name === skill.name)) {
          skills.push(skill);
        }
      }
    }

    // 如果没有从自定义路径获取到 skills，尝试默认路径
    if (skills.length === 0) {
      const defaultSkillsPath = path.join(pluginPath, 'skills');
      const parsedFromDefault = await this.parseSkillPath(defaultSkillsPath);
      for (const skill of parsedFromDefault) {
        if (!skills.find(s => s.name === skill.name)) {
          skills.push(skill);
        }
      }
    }

    return skills;
  }

  /**
   * 解析一个 skill 路径
   * 该路径可能:
   * 1. 是一个 skill 目录（直接包含 SKILL.md）
   * 2. 是一个 skills 集合目录（包含多个 skill 子目录）
   */
  private async parseSkillPath(skillPath: string): Promise<SkillInfo[]> {
    const skills: SkillInfo[] = [];

    try {
      await fs.access(skillPath);

      // 首先检查这个路径本身是否就是一个 skill 目录（包含 SKILL.md）
      const ownSkillMdPath = path.join(skillPath, 'SKILL.md');
      try {
        const content = await fs.readFile(ownSkillMdPath, 'utf-8');
        const skillName = path.basename(skillPath);
        const skill = this.parseSkillMarkdown(skillName, content);
        if (skill) {
          skill.filePath = ownSkillMdPath;
          skills.push(skill);
          return skills; // 如果本身就是 skill 目录，直接返回
        }
      } catch {
        // 不是 skill 目录，继续作为集合目录处理
      }

      // 作为 skills 集合目录处理，查找子目录中的 SKILL.md
      const entries = await fs.readdir(skillPath, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const subSkillPath = path.join(skillPath, entry.name);
        const subSkillMdPath = path.join(subSkillPath, 'SKILL.md');

        try {
          const content = await fs.readFile(subSkillMdPath, 'utf-8');
          const skill = this.parseSkillMarkdown(entry.name, content);
          if (skill) {
            skill.filePath = subSkillMdPath;
            skills.push(skill);
          }
        } catch {
          // 该 skill 没有 SKILL.md，跳过
          continue;
        }
      }
    } catch {
      // 路径不存在或无法访问
    }

    return skills;
  }

  /**
   * 从 plugin.json 的 skills/agents/commands 等字段获取自定义路径
   */
  private getCustomPaths(fieldConfig: string | string[] | undefined, pluginPath: string): string[] {
    const paths: string[] = [];

    if (!fieldConfig) {
      return paths;
    }

    const configs = Array.isArray(fieldConfig) ? fieldConfig : [fieldConfig];

    for (const config of configs) {
      if (typeof config === 'string') {
        // 处理相对路径（如 ./.claude/skills/ui-ux-pro-max）
        // 去掉开头的 ./ 如果存在
        const relativePath = config.startsWith('./') ? config.slice(2) : config;
        const fullPath = path.join(pluginPath, relativePath);
        paths.push(fullPath);
      }
    }

    return paths;
  }

  /**
   * 解析单个 Skill 的 Markdown 文件
   */
  private parseSkillMarkdown(skillName: string, content: string): SkillInfo | null {
    const frontmatter = this.parseFrontmatter(content);
    if (!frontmatter) return null;

    return {
      name: frontmatter.name || skillName,
      description: frontmatter.description || '',
      tools: frontmatter.tools,
      allowedTools: frontmatter.allowedTools || frontmatter['allowed-tools'],
      disableModelInvocation: frontmatter['disable-model-invocation'] === true,
    };
  }

  /**
   * 解析 Agents
   * 目录结构: agents/agent-name.md
   * 或者从 plugin.json 的 agents 字段获取自定义路径
   */
  private async parseAgents(pluginPath: string, configJson?: any): Promise<AgentInfo[]> {
    const agents: AgentInfo[] = [];

    // 尝试从 plugin.json 获取自定义 agents 路径
    const customPaths = this.getCustomPaths(configJson?.agents, pluginPath);

    // 收集所有要搜索的 agents 目录
    const searchDirs: string[] = [...customPaths, path.join(pluginPath, 'agents')];

    console.log(`[PluginDetailsService] parseAgents: searching in dirs:`, searchDirs);

    for (const agentsDir of searchDirs) {
      try {
        await fs.access(agentsDir);
        const entries = await fs.readdir(agentsDir);

        console.log(`[PluginDetailsService] parseAgents: found dir ${agentsDir} with ${entries.length} entries`);

        for (const entry of entries) {
          if (!entry.endsWith('.md') || entry.startsWith('.')) continue;

          const agentPath = path.join(agentsDir, entry);
          try {
            const content = await fs.readFile(agentPath, 'utf-8');
            const agentName = entry.replace(/\.md$/, '');
            const agent = this.parseAgentMarkdown(agentName, content);
            console.log(`[PluginDetailsService] parseAgents: parsed agent ${agentName}, result:`, agent ? 'SUCCESS' : 'FAILED');
            if (agent && !agents.find(a => a.name === agent.name)) {
              agent.filePath = agentPath;
              agents.push(agent);
            }
          } catch (error) {
            console.log(`[PluginDetailsService] parseAgents: failed to read ${agentPath}:`, error);
            continue;
          }
        }
      } catch (error) {
        console.log(`[PluginDetailsService] parseAgents: dir ${agentsDir} not accessible:`, error);
        // 目录不存在，继续下一个
      }
    }

    console.log(`[PluginDetailsService] parseAgents: returning ${agents.length} agents`);
    return agents;
  }

  /**
   * 解析单个 Agent 的 Markdown 文件
   */
  private parseAgentMarkdown(agentName: string, content: string): AgentInfo | null {
    const frontmatter = this.parseFrontmatter(content);
    if (!frontmatter) {
      // 没有 frontmatter，返回基本信息
      return { name: agentName, description: '' };
    }

    return {
      name: frontmatter.name || agentName,
      description: frontmatter.description || '',
      model: frontmatter.model,
    };
  }

  /**
   * 解析 Commands
   * 目录结构: commands/command-name.md
   * 或者从 plugin.json 的 commands 字段获取自定义路径
   */
  private async parseCommands(pluginPath: string, configJson?: any): Promise<CommandInfo[]> {
    const commands: CommandInfo[] = [];

    // 尝试从 plugin.json 获取自定义 commands 路径
    const customPaths = this.getCustomPaths(configJson?.commands, pluginPath);

    // 收集所有要搜索的 commands 目录
    const searchDirs: string[] = [...customPaths, path.join(pluginPath, 'commands')];

    for (const commandsDir of searchDirs) {
      try {
        await fs.access(commandsDir);
        const entries = await fs.readdir(commandsDir);

        for (const entry of entries) {
          if (!entry.endsWith('.md') || entry.startsWith('.')) continue;

          const commandPath = path.join(commandsDir, entry);
          try {
            const content = await fs.readFile(commandPath, 'utf-8');
            const commandName = entry.replace(/\.md$/, '');
            const command = this.parseCommandMarkdown(commandName, content);
            // 避免重复
            if (!commands.find(c => c.name === command.name)) {
              command.filePath = commandPath;
              commands.push(command);
            }
          } catch {
            // 即使无法解析，也添加基础信息
            const name = entry.replace(/\.md$/, '');
            if (!commands.find(c => c.name === name)) {
              commands.push({ name, filePath: commandPath });
            }
          }
        }
      } catch {
        // 目录不存在，继续下一个
      }
    }

    return commands;
  }

  /**
   * 解析单个 Command 的 Markdown 文件
   */
  private parseCommandMarkdown(commandName: string, content: string): CommandInfo {
    // 尝试从 frontmatter 获取描述
    const frontmatter = this.parseFrontmatter(content);
    if (frontmatter) {
      return {
        name: commandName,
        description: frontmatter.description,
      };
    }

    // 尝试从第一行获取描述
    const firstLine = content.split('\n').find(line => line.trim() && !line.startsWith('#'));
    return {
      name: commandName,
      description: firstLine?.trim().replace(/^#\s*/, ''),
    };
  }

  /**
   * 解析 Hooks
   * 文件: hooks/hooks.json
   * 或者从 plugin.json 的 hooks 字段获取配置（可能是内联的）
   */
  private async parseHooks(pluginPath: string, configJson?: any): Promise<HookInfo[]> {
    const hooks: HookInfo[] = [];

    // 首先检查 plugin.json 中是否有内联的 hooks 配置
    if (configJson?.hooks) {
      // hooks 可能是路径字符串，也可能是内联配置对象
      if (typeof configJson.hooks === 'string') {
        // 是路径，读取文件
        try {
          const hooksPath = path.join(pluginPath, configJson.hooks.replace(/^\.\//, ''));
          const content = await fs.readFile(hooksPath, 'utf-8');
          const config = JSON.parse(content) as { hooks?: Record<string, any[]> };
          if (config.hooks) {
            hooks.push(...this.parseHooksConfig(config.hooks, hooksPath));
          }
        } catch {
          // 忽略错误
        }
      } else if (typeof configJson.hooks === 'object') {
        // 内联配置，没有文件路径
        hooks.push(...this.parseHooksConfig(configJson.hooks));
      }
    }

    // 如果没有从 plugin.json 获取到 hooks，尝试默认位置
    if (hooks.length === 0) {
      const hooksJsonPath = path.join(pluginPath, 'hooks', 'hooks.json');
      try {
        const content = await fs.readFile(hooksJsonPath, 'utf-8');
        const config = JSON.parse(content) as { hooks?: Record<string, any[]> };
        if (config.hooks) {
          hooks.push(...this.parseHooksConfig(config.hooks, hooksJsonPath));
        }
      } catch {
        // hooks.json 不存在或解析失败
      }
    }

    return hooks;
  }

  /**
   * 解析 hooks 配置对象
   */
  private parseHooksConfig(hooksConfig: Record<string, any[]>, filePath?: string): HookInfo[] {
    const hooks: HookInfo[] = [];
    for (const [event, hookConfigs] of Object.entries(hooksConfig)) {
      const configs = Array.isArray(hookConfigs) ? hookConfigs : [hookConfigs];
      const hookInfo: HookInfo = {
        event,
        hooks: configs.map((c: any) => ({
          type: c.type,
          matcher: c.matcher,
          command: c.command,
          skill: c.skill,
          async: c.async,
        })),
      };
      if (filePath) {
        hookInfo.filePath = filePath;
      }
      hooks.push(hookInfo);
    }
    return hooks;
  }

  /**
   * 解析 MCP Servers
   * 文件: .mcp.json
   * 或者从 plugin.json 的 mcpServers 字段获取配置（可能是内联的）
   */
  private async parseMcps(pluginPath: string, configJson?: any): Promise<McpInfo[]> {
    const mcps: McpInfo[] = [];

    // 首先检查 plugin.json 中是否有 mcpServers 配置
    if (configJson?.mcpServers) {
      if (typeof configJson.mcpServers === 'string') {
        // 是路径，读取文件
        try {
          const mcpPath = path.join(pluginPath, configJson.mcpServers.replace(/^\.\//, ''));
          const content = await fs.readFile(mcpPath, 'utf-8');
          mcps.push(...this.parseMcpConfig(JSON.parse(content), mcpPath));
        } catch {
          // 忽略错误
        }
      } else if (typeof configJson.mcpServers === 'object') {
        // 内联配置，没有文件路径
        mcps.push(...this.parseMcpConfig(configJson.mcpServers));
      }
    }

    // 如果没有从 plugin.json 获取到 mcp，尝试默认位置
    if (mcps.length === 0) {
      const mcpJsonPath = path.join(pluginPath, '.mcp.json');
      try {
        const content = await fs.readFile(mcpJsonPath, 'utf-8');
        mcps.push(...this.parseMcpConfig(JSON.parse(content), mcpJsonPath));
      } catch {
        // .mcp.json 不存在或解析失败
      }
    }

    return mcps;
  }

  /**
   * 解析 MCP 配置对象
   */
  private parseMcpConfig(config: any, filePath?: string): McpInfo[] {
    const mcps: McpInfo[] = [];
    // .mcp.json 可能是 { "mcpServers": { ... } } 或直接服务配置
    const servers = config.mcpServers || config;

    if (typeof servers === 'object') {
      for (const [name, serverConfig] of Object.entries(servers)) {
        if (typeof serverConfig === 'object' && serverConfig !== null) {
          const cfg = serverConfig as any;
          const mcpInfo: McpInfo = {
            name,
            command: cfg.command,
            args: cfg.args,
            env: cfg.env,
            description: cfg.description || cfg.url || cfg.type,
            type: cfg.type,
            url: cfg.url,
          };
          if (filePath) {
            mcpInfo.filePath = filePath;
          }
          mcps.push(mcpInfo);
        }
      }
    }
    return mcps;
  }

  /**
   * 解析 LSP Servers
   * 文件: .lsp.json
   * 或者从 plugin.json 的 lspServers 字段获取配置（可能是内联的）
   */
  private async parseLsps(pluginPath: string, configJson?: any): Promise<LspInfo[]> {
    const lsps: LspInfo[] = [];

    // 首先检查 plugin.json 中是否有 lspServers 配置
    if (configJson?.lspServers) {
      if (typeof configJson.lspServers === 'string') {
        // 是路径，读取文件
        try {
          const lspPath = path.join(pluginPath, configJson.lspServers.replace(/^\.\//, ''));
          const content = await fs.readFile(lspPath, 'utf-8');
          lsps.push(...this.parseLspConfig(JSON.parse(content), lspPath));
        } catch {
          // 忽略错误
        }
      } else if (typeof configJson.lspServers === 'object') {
        // 内联配置，没有文件路径
        lsps.push(...this.parseLspConfig(configJson.lspServers));
      }
    }

    // 如果没有从 plugin.json 获取到 lsp，尝试默认位置
    if (lsps.length === 0) {
      const lspJsonPath = path.join(pluginPath, '.lsp.json');
      try {
        const content = await fs.readFile(lspJsonPath, 'utf-8');
        lsps.push(...this.parseLspConfig(JSON.parse(content), lspJsonPath));
      } catch {
        // .lsp.json 不存在或解析失败
      }
    }

    return lsps;
  }

  /**
   * 解析 LSP 配置对象
   */
  private parseLspConfig(config: any, filePath?: string): LspInfo[] {
    const lsps: LspInfo[] = [];
    if (typeof config === 'object') {
      for (const [language, lspConfig] of Object.entries(config)) {
        if (typeof lspConfig === 'object' && lspConfig !== null) {
          const lspInfo: LspInfo = {
            language,
            command: (lspConfig as any).command || language,
            args: (lspConfig as any).args,
            extensionToLanguage: (lspConfig as any).extensionToLanguage,
          };
          if (filePath) {
            lspInfo.filePath = filePath;
          }
          lsps.push(lspInfo);
        }
      }
    }
    return lsps;
  }

  /**
   * 解析 Output Styles
   * 目录结构: outputStyles/ 或自定义路径
   * 来自 plugin.json 的 outputStyles 字段
   */
  private async parseOutputStyles(pluginPath: string, configJson?: any): Promise<OutputStyleInfo[]> {
    const outputStyles: OutputStyleInfo[] = [];

    // 尝试从 plugin.json 获取自定义 outputStyles 路径
    const customPaths = this.getCustomPaths(configJson?.outputStyles, pluginPath);

    // 收集所有要搜索的 outputStyles 路径
    const searchPaths: string[] = [...customPaths, path.join(pluginPath, 'outputStyles')];

    for (const styleBasePath of searchPaths) {
      try {
        await fs.access(styleBasePath);
        const entries = await fs.readdir(styleBasePath, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.name.startsWith('.')) continue;

          const styleName = entry.name;
          const stylePath = path.join(styleBasePath, entry.name);

          // 检查是文件还是目录
          try {
            const stat = await fs.stat(stylePath);
            outputStyles.push({
              name: styleName,
              type: stat.isDirectory() ? 'directory' : 'file',
              filePath: stylePath
            });
          } catch {
            // 无法获取状态，默认添加为目录
            outputStyles.push({
              name: styleName,
              type: 'directory',
              filePath: stylePath
            });
          }
        }
      } catch {
        // 路径不存在，继续下一个
      }
    }

    return outputStyles;
  }

  /**
   * 解析 Skill/Agent Markdown 文件的 frontmatter
   * 提取 --- 包裹的 YAML frontmatter 并使用标准 YAML 解析器
   */
  private parseFrontmatter(markdown: string): Record<string, any> | null {
    // 支持 LF (\n) 和 CRLF (\r\n) 行尾符
    const frontmatterMatch = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!frontmatterMatch) return null;

    try {
      // 使用标准 YAML 解析器
      const yaml = require('yaml');
      return yaml.parse(frontmatterMatch[1]);
    } catch {
      return null;
    }
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
