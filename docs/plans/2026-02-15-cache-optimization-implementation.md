# 缓存优化实现计划

**设计文档**: [2026-02-15-cache-optimization-design.md](./2026-02-15-cache-optimization-design.md)

## 实现步骤

### 步骤 1: 添加文件路径常量和类型定义

**文件**: `vscode-extension/src/pluginMarketplace/types.ts`

添加 Claude 配置文件路径常量和新的类型定义：

```typescript
// Claude 配置文件路径
export const CLAUDE_PATHS = {
  home: path.join(os.homedir(), '.claude'),
  installedPlugins: path.join(os.homedir(), '.claude', 'plugins', 'installed_plugins.json'),
  userSettings: path.join(os.homedir(), '.claude', 'settings.json'),
  knownMarketplaces: path.join(os.homedir(), '.claude', 'plugins', 'known_marketplaces.json'),
  marketplacesDir: path.join(os.homedir(), '.claude', 'plugins', 'marketplaces'),

  getProjectSettings: (workspacePath: string) =>
    path.join(workspacePath, '.claude', 'settings.local.json'),

  getMarketplaceConfig: (marketplaceName: string) =>
    path.join(os.homedir(), '.claude', 'plugins', 'marketplaces', marketplaceName, '.claude-plugin', 'marketplace.json')
} as const;

// installed_plugins.json 数据结构
export interface InstalledPluginsData {
  version: number;
  plugins: Record<string, Array<{
    scope: PluginScope;
    installPath: string;
    version: string;
    installedAt: string;
    lastUpdated: string;
    gitCommitSha?: string;
  }>>;
}

// settings.json 数据结构
export interface SettingsData {
  enabledPlugins?: Record<string, boolean>;
  [key: string]: any;
}

// known_marketplaces.json 数据结构
export interface KnownMarketplacesData {
  [name: string]: {
    source: {
      source: 'github' | 'git' | 'directory' | 'url';
      repo?: string;
      path?: string;
      url?: string;
    };
    installLocation: string;
    lastUpdated: string;
    autoUpdate?: boolean;
  };
}

// 更新 PluginStatus 添加 enabled 字段
export interface PluginStatus {
  installed: boolean;
  enabled?: boolean;  // 新增
  scope?: PluginScope;
  version?: string;
  updateAvailable?: boolean;
}

// 更新 InstalledPlugin 添加 marketplace 字段
export interface InstalledPlugin {
  name: string;
  marketplace?: string;  // 新增
  version: string;
  enabled: boolean;
  scope?: PluginScope;   // 新增
  installPath: string;
}

// 市场信息
export interface MarketplaceInfo {
  name: string;
  source: {
    source: 'github' | 'git' | 'directory' | 'url';
    repo?: string;
    path?: string;
    url?: string;
  };
  installLocation: string;
  lastUpdated: Date;
  autoUpdate?: boolean;
  pluginCount?: number;
}
```

---

### 步骤 2: 创建 FileParser 类

**文件**: `vscode-extension/src/pluginMarketplace/webview/services/FileParser.ts`

新建文件解析类，负责从本地文件读取数据：

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import {
  CLAUDE_PATHS,
  InstalledPluginsData,
  SettingsData,
  KnownMarketplacesData,
  InstalledPlugin,
  MarketplaceInfo,
  PluginScope
} from '../../types';

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
      console.error('Failed to parse installed plugins:', error);
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
      console.error('Failed to parse marketplaces:', error);
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
      console.error(`Failed to parse marketplace config for ${marketplaceName}:`, error);
      return null;
    }
  }
}
```

---

### 步骤 3: 创建 CacheManager 类

**文件**: `vscode-extension/src/pluginMarketplace/webview/services/CacheManager.ts`

新建缓存管理类：

```typescript
import * as vscode from 'vscode';
import { FileParser } from './FileParser';
import {
  PluginInfo,
  InstalledPlugin,
  MarketplaceInfo,
  PluginStatus,
  MarketplaceConfig
} from '../../types';

/**
 * 缓存管理类 - 管理插件数据缓存
 */
export class CacheManager {
  private parser: FileParser;
  private installedCache: InstalledPlugin[] | null = null;
  private enabledCache: Map<string, boolean> | null = null;
  private marketplacesCache: MarketplaceInfo[] | null = null;
  private marketplacePluginsCache: Map<string, MarketplaceConfig> = new Map();
  private cacheTimestamp: number = 0;

  constructor(private context: vscode.ExtensionContext) {
    this.parser = new FileParser();
  }

  /**
   * 获取已安装插件 (带缓存)
   */
  async getInstalledPlugins(): Promise<InstalledPlugin[]> {
    if (this.installedCache) {
      return this.installedCache;
    }

    const plugins = await this.parser.parseInstalledPlugins();
    this.installedCache = plugins;
    return plugins;
  }

  /**
   * 获取启用状态 (带缓存)
   */
  async getEnabledPlugins(): Promise<Map<string, boolean>> {
    if (this.enabledCache) {
      return this.enabledCache;
    }

    const enabled = await this.parser.parseEnabledPlugins();
    this.enabledCache = enabled;
    return enabled;
  }

  /**
   * 获取市场列表 (带缓存)
   */
  async getMarketplaces(): Promise<MarketplaceInfo[]> {
    if (this.marketplacesCache) {
      return this.marketplacesCache;
    }

    const marketplaces = await this.parser.parseMarketplaces();
    this.marketplacesCache = marketplaces;
    return marketplaces;
  }

  /**
   * 获取市场插件配置 (带缓存)
   */
  async getMarketplacePlugins(marketplaceName: string): Promise<MarketplaceConfig | null> {
    if (this.marketplacePluginsCache.has(marketplaceName)) {
      return this.marketplacePluginsCache.get(marketplaceName)!;
    }

    const config = await this.parser.parseMarketplacePlugins(marketplaceName);
    if (config) {
      this.marketplacePluginsCache.set(marketplaceName, config);
    }
    return config;
  }

  /**
   * 获取所有插件 (合并状态)
   */
  async getAllPlugins(): Promise<PluginInfo[]> {
    const [marketplaces, installed, enabled] = await Promise.all([
      this.getMarketplaces(),
      this.getInstalledPlugins(),
      this.getEnabledPlugins()
    ]);

    const allPlugins: PluginInfo[] = [];

    for (const marketplace of marketplaces) {
      const config = await this.getMarketplacePlugins(marketplace.name);
      if (!config) continue;

      const plugins: PluginInfo[] = config.plugins.map(plugin => {
        const installedInfo = installed.find(
          i => i.name === plugin.name && i.marketplace === marketplace.name
        );

        const key = `${plugin.name}@${marketplace.name}`;
        const isEnabled = enabled.get(key);

        return {
          ...plugin,
          marketplace: marketplace.name,
          status: {
            installed: !!installedInfo,
            enabled: isEnabled ?? !!installedInfo,
            version: installedInfo?.version,
            scope: installedInfo?.scope,
            updateAvailable: false // TODO: 实现版本比较
          }
        };
      });

      allPlugins.push(...plugins);
    }

    return allPlugins;
  }

  /**
   * 清除缓存
   */
  invalidate(): void {
    this.installedCache = null;
    this.enabledCache = null;
    this.marketplacesCache = null;
    this.marketplacePluginsCache.clear();
    this.cacheTimestamp = 0;
  }
}
```

---

### 步骤 4: 重构 PluginDataService

**文件**: `vscode-extension/src/pluginMarketplace/webview/services/PluginDataService.ts`

重构数据服务类，使用 CacheManager：

```typescript
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
    return this.cache.getInstalledPlugins();
  }

  /**
   * 获取所有可用插件 (带状态)
   */
  async getAllAvailablePlugins(): Promise<PluginInfo[]> {
    return this.cache.getAllPlugins();
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

    if (filter.marketplace) {
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
}
```

---

### 步骤 5: 更新 Webview 消息处理器

**文件**: `vscode-extension/src/pluginMarketplace/webview/messages/handlers.ts`

添加启用/禁用插件的处理器：

```typescript
// 在现有的 switch/case 中添加
case 'enablePlugin':
  {
    const { pluginName, marketplace } = message.data;
    result = await this.dataService.enablePlugin(pluginName, marketplace);
  }
  break;

case 'disablePlugin':
  {
    const { pluginName, marketplace } = message.data;
    result = await this.dataService.disablePlugin(pluginName, marketplace);
  }
  break;

// 添加市场管理
case 'addMarketplace':
  {
    const { source } = message.data;
    result = await this.dataService.addMarketplace(source);
  }
  break;

case 'removeMarketplace':
  {
    const { name } = message.data;
    result = await this.dataService.removeMarketplace(name);
  }
  break;

case 'updateMarketplace':
  {
    const { name } = message.data;
    result = await this.dataService.updateMarketplace(name);
  }
  break;

case 'refreshCache':
  {
    this.dataService.clearCache();
    result = { success: true };
  }
  break;
```

---

### 步骤 6: 更新 Webview UI

**文件**: `webview-app/src/`

添加刷新按钮和启用/禁用插件功能到 UI。

---

## 测试计划

1. **单元测试**: FileParser 和 CacheManager
2. **集成测试**: PluginDataService 的读取和修改操作
3. **E2E 测试**: 完整的用户工作流

---

## 文件清单

### 新建文件
- `vscode-extension/src/pluginMarketplace/webview/services/FileParser.ts`
- `vscode-extension/src/pluginMarketplace/webview/services/CacheManager.ts`

### 修改文件
- `vscode-extension/src/pluginMarketplace/types.ts` - 添加常量和类型
- `vscode-extension/src/pluginMarketplace/webview/services/PluginDataService.ts` - 重构
- `vscode-extension/src/pluginMarketplace/webview/messages/handlers.ts` - 添加消息处理
- `webview-app/src/` - UI 更新
