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
import { PluginPathResolver } from './PluginPathResolver';
import { ContentParser } from './ContentParser';
import { tryReadFile } from '@shared/utils/fileUtils';
import { parseFrontmatter, parseGitHubRepo, getCustomPaths, parseRepository as parseRepositoryUtil } from '@shared/utils/parseUtils';
import { normalizeRepoUrlForBrowser } from '@shared/utils/urlUtils';
import { logger } from '../../../shared/utils/logger';

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
  private pathResolver: PluginPathResolver;
  private contentParser: ContentParser;
  // FileParser 单例缓存
  private fileParserInstance: any = null;

  constructor(private context: vscode.ExtensionContext) {
    this.pathResolver = new PluginPathResolver(context);
    this.contentParser = new ContentParser();
  }

  /**
   * 获取 FileParser 单例
   */
  private async getFileParser() {
    if (!this.fileParserInstance) {
      const { FileParser } = await import('./FileParser');
      this.fileParserInstance = new FileParser();
    }
    return this.fileParserInstance;
  }

  /**
   * 获取插件安装状态（从文件解析）
   * 提取为公共方法以避免重复代码
   */
  private async getPluginStatusFromFiles(pluginName: string, marketplace: string) {
    const parser = await this.getFileParser();
    const [installedPlugins, enabledMap] = await Promise.all([
      parser.parseInstalledPlugins(),
      parser.parseEnabledPlugins()
    ]);

    const installedInfo = installedPlugins.find((p: any) => p.name === pluginName && p.marketplace === marketplace);
    const key = `${pluginName}@${marketplace}`;
    const isEnabled = enabledMap.get(key);

    return {
      installed: !!installedInfo,
      enabled: isEnabled ?? true,
      scope: installedInfo?.scope,
      actualMarketplace: installedInfo?.marketplace || marketplace
    };
  }

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
    scopeFromStore?: 'user' | 'project' | 'local',
    locale?: string
  ): Promise<PluginDetailData> {
    const cacheKey = `${pluginName}@${marketplace}`;

    // 检查缓存（注意：如果状态发生变化，需要清除缓存）
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      // 如果有从 Store 传递的状态，更新缓存数据
      if (enabledFromStore !== undefined || scopeFromStore !== undefined) {
        return {
          ...cached.data,
          installed: isInstalled, // ✅ 同时更新 installed 字段
          enabled: enabledFromStore ?? cached.data.enabled,
          scope: scopeFromStore ?? cached.data.scope,
        };
      }
      // 即使没有启用/作用域更新，也要确保 installed 字段正确
      return {
        ...cached.data,
        installed: isInstalled,
      };
    }

    // 获取数据，传递来自 Store 的状态与 locale（用于 README 多语言）
    const data = isInstalled
      ? await this.getInstalledPluginDetail(pluginName, marketplace, enabledFromStore, scopeFromStore, locale)
      : await this.getRemotePluginDetail(pluginName, marketplace, enabledFromStore, scopeFromStore, locale);

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
    logger.debug('已清除所有缓存');
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
    scopeFromStore?: 'user' | 'project' | 'local',
    locale?: string
  ): Promise<PluginDetailData> {
    // 使用路径解析器查找插件
    const pluginPath = await this.pathResolver.findPluginPath(pluginName, marketplace);
    if (!pluginPath) {
      logger.debug(`插件 ${pluginName}@${marketplace} 未在本地找到，从远程获取`);
      return this.getRemotePluginDetail(pluginName, marketplace, enabledFromStore, scopeFromStore, locale);
    }

    // 读取配置文件和 README（按 locale 优先 README.zh-CN.md）
    const configJson = await this.readPluginConfig(pluginPath);
    const readme = await this.readReadme(pluginPath, locale);

    // 使用内容解析器解析插件内容
    const [skills, agents, commands, hooks, mcps, lsps, outputStyles] = await Promise.all([
      this.contentParser.parseSkills(pluginPath, configJson),
      this.contentParser.parseAgents(pluginPath, configJson),
      this.contentParser.parseCommands(pluginPath, configJson),
      this.contentParser.parseHooks(pluginPath, configJson),
      this.contentParser.parseMcps(pluginPath, configJson),
      this.contentParser.parseLsps(pluginPath, configJson),
      this.contentParser.parseOutputStyles(pluginPath, configJson),
    ]);

    // 如果没有内容，尝试从远程获取
    if (!readme && skills.length === 0 && agents.length === 0 && commands.length === 0) {
      logger.debug(`插件 ${pluginName} 无本地内容，从远程获取`);
      return this.getRemotePluginDetail(pluginName, marketplace);
    }

    // 获取安装状态和作用域
    let enabled = enabledFromStore;
    let scope = scopeFromStore;
    let actualMarketplace = marketplace;

    if (enabledFromStore === undefined || scopeFromStore === undefined) {
      const status = await this.getPluginStatusFromFiles(pluginName, marketplace);
      enabled = enabledFromStore ?? status.enabled;
      scope = scopeFromStore ?? status.scope;
      actualMarketplace = status.actualMarketplace;
    }

    const repoParsed = configJson ? parseRepositoryUtil(configJson) : undefined;
    const repository = repoParsed?.url
      ? { ...repoParsed, url: normalizeRepoUrlForBrowser(repoParsed.url) }
      : repoParsed;
    const dependencies = configJson ? this.parseDependencies(configJson) : [];


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
      const content = await tryReadFile(configPath);
      if (content) {
        try {
          return JSON.parse(content);
        } catch {
          continue;
        }
      }
    }
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
    scopeFromStore?: 'user' | 'project' | 'local',
    locale?: string
  ): Promise<PluginDetailData> {
    // 从文件解析器获取市场信息
    const parser = await this.getFileParser();
    const marketplaces = await parser.parseMarketplaces();
    const market = marketplaces.find((m: any) => m.name === marketplace);

    if (!market) {
      throw new Error(`找不到市场 ${marketplace}`);
    }

    // 获取插件列表找到目标插件
    const config = await parser.parseMarketplacePlugins(marketplace);
    const plugins = config?.plugins || [];
    const plugin = plugins.find((p: any) => p.name === pluginName);

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

    // 使用路径解析器获取本地市场路径
    const localMarketPath = await this.pathResolver.getLocalMarketPath(pluginName, marketplace);

    if (localMarketPath) {
      try {
        // 读取配置文件
        try {
          const configPath = path.join(localMarketPath, '.claude-plugin', 'plugin.json');
          const configContent = await fs.readFile(configPath, 'utf-8');
          configJson = JSON.parse(configContent);
          license = configJson?.license;
          if (configJson?.repository) {
            const repoParsed = parseRepositoryUtil(configJson);
            repository = repoParsed?.url
              ? { ...repoParsed, url: normalizeRepoUrlForBrowser(repoParsed.url) }
              : repoParsed;
          }
        } catch {
          // 配置文件不存在，继续
        }

        // 读取 README（按 locale 优先 README.zh-CN.md）
        readme = await this.readReadme(localMarketPath, locale);

        // 使用内容解析器
        [skills, agents, commands, hooks, mcps, lsps, outputStyles] = await Promise.all([
          this.contentParser.parseSkills(localMarketPath, configJson),
          this.contentParser.parseAgents(localMarketPath, configJson),
          this.contentParser.parseCommands(localMarketPath, configJson),
          this.contentParser.parseHooks(localMarketPath, configJson),
          this.contentParser.parseMcps(localMarketPath, configJson),
          this.contentParser.parseLsps(localMarketPath, configJson),
          this.contentParser.parseOutputStyles(localMarketPath, configJson),
        ]);
      } catch (error) {
        logger.error(`本地读取失败:`, error);
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
              url: normalizeRepoUrlForBrowser(`https://github.com/${source.repo}`)
            };
          } else if (source.source === 'url' && source.url) {
            // URL 类型：完整的 Git 仓库 URL
            repository = {
              type: 'other',
              url: normalizeRepoUrlForBrowser(source.url)
            };
          }
        }
      }
      // 如果还是没有，且 plugin.homepage 存在，使用它作为回退
      if (!repository && plugin.homepage) {
        repository = {
          type: 'other',
          url: normalizeRepoUrlForBrowser(plugin.homepage)
        };
      }
    }

    // 判断是否为远程源（本地没有完整解析的数据）
    const isRemoteSource = !localMarketPath || (skills.length === 0 && agents.length === 0 && commands.length === 0 && hooks.length === 0 && mcps.length === 0 && lsps.length === 0 && !readme);

    // 检查实际的安装状态（只有在 Store 没有传递状态时才解析）
    let enabled = enabledFromStore;
    let scope = scopeFromStore;
    let installed = false;

    if (enabledFromStore === undefined || scopeFromStore === undefined) {
      // 只有在 Store 没有传递状态时才从文件解析（保持兼容性）
      const status = await this.getPluginStatusFromFiles(pluginName, marketplace);
      installed = status.installed;
      enabled = enabledFromStore ?? status.enabled;
      scope = scopeFromStore ?? status.scope;
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
   * 读取 README 文件（支持多语言）
   * 支持在插件目录或 .claude-plugin 目录中查找。
   * 若传入 locale 且为 zh-cn，优先查找 README.zh-CN.md，否则使用 README.md。
   */
  public async readReadme(pluginPath: string, locale?: string): Promise<string> {
    const readmeLocations = [pluginPath, path.join(pluginPath, '.claude-plugin')];
    const isZhCn = locale?.toLowerCase().startsWith('zh');

    const readmeNames = isZhCn
      ? ['README.zh-CN.md', 'readme.zh-CN.md', 'README.md', 'readme.md', 'Readme.md']
      : ['README.md', 'readme.md', 'Readme.md'];

    for (const baseLocation of readmeLocations) {
      for (const name of readmeNames) {
        const content = await tryReadFile(path.join(baseLocation, name));
        if (content) return content;
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
      const parser = await this.getFileParser();
      const marketplaces = await parser.parseMarketplaces();
      const market = marketplaces.find((m: any) => m.name === marketplace);

      if (!market || market.source.source !== 'github' || !market.source.repo) {
        return null;
      }

      const repoInfo = parseGitHubRepo(market.source.repo);
      if (!repoInfo) {
        return null;
      }
      const stars = await this.fetchGitHubStars(repoInfo.owner, repoInfo.repo);
      logger.debug(`获取 ${pluginName} 的 stars: ${stars}`);
      return stars;
    } catch (error) {
      logger.error(`获取 ${pluginName} 的 stars 失败:`, error);
      return null;
    }
  }

  /**
   * 解析仓库信息
   */
  public parseRepository(packageJson: any): RepositoryInfo | undefined {
    return parseRepositoryUtil(packageJson);
  }

  /**
   * 解析依赖
   */
  public parseDependencies(packageJson: any): string[] {
    const deps = packageJson.dependencies || {};
    return Object.keys(deps);
  }
}
