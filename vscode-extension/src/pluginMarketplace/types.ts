// vscode-extension/src/pluginMarketplace/types.ts

import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Claude 配置文件路径常量
 */
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

/**
 * Claude Code 插件信息
 */
export interface Plugin {
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  marketplace: string;
  installed: boolean;
  installedVersion?: string;
  updateAvailable?: boolean;
}

/**
 * 插件市场信息
 */
export interface Marketplace {
  name: string;
  source: string;
  type: 'url' | 'git' | 'local';
}

/**
 * 已安装的插件
 */
export interface InstalledPlugin {
  name: string;
  marketplace?: string;
  version: string;
  enabled: boolean;
  scope?: PluginScope;
  installPath: string;
}

/**
 * 树节点类型
 */
export type TreeItemType =
  | 'marketplace'
  | 'installed-overview'
  | 'installed-plugin'
  | 'available-plugin'
  | 'installed-section'
  | 'available-section'
  | 'loading';

/**
 * 树节点基类
 */
export class PluginTreeItem extends vscode.TreeItem {
  // 插件状态（用于可用插件）
  public pluginStatus?: {
    installed: boolean;
    enabled?: boolean;
    updateAvailable?: boolean;
  };

  constructor(
    public readonly type: TreeItemType,
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly data?: any
  ) {
    super(label, collapsibleState);
    this.contextValue = type;

    // 根据状态设置图标
    this.iconPath = new vscode.ThemeIcon(this.getIcon());
    this.tooltip = this.getTooltip();
  }

  private getIcon(): string {
    // 已安装插件 - 根据启用状态显示不同图标
    if (this.type === 'installed-plugin') {
      if (this.data?.enabled === false) {
        return 'circle-large-outline'; // 禁用
      }
      return 'check'; // 已启用
    }

    // 可用插件 - 根据安装状态显示图标
    if (this.type === 'available-plugin') {
      if (this.pluginStatus?.installed) {
        if (this.pluginStatus?.updateAvailable) {
          return 'sync'; // 可更新
        }
        if (this.pluginStatus?.enabled === false) {
          return 'circle-slash'; // 已安装但禁用
        }
        return 'check'; // 已安装
      }
      return 'circle-large-outline'; // 未安装
    }

    // 分组节点
    if (this.type === 'installed-overview') return 'package';
    if (this.type === 'installed-section') return 'check';
    if (this.type === 'available-section') return 'extensions';
    if (this.type === 'marketplace') return 'database';
    if (this.type === 'loading') return 'loading~spin';

    return 'circle-outline';
  }

  private getTooltip(): string {
    if (this.type === 'installed-plugin') {
      const status = this.data?.enabled === false ? ' (已禁用)' : ' (已启用)';
      return `${this.data?.name || this.label} v${this.data?.version || ''}${status}\n${this.data?.description || ''}`;
    }

    if (this.type === 'available-plugin') {
      const status = this.pluginStatus?.installed
        ? (this.pluginStatus?.updateAvailable
            ? ' (有更新可用)'
            : (this.pluginStatus?.enabled === false ? ' (已安装但禁用)' : ' (已安装)'))
        : '';
      return `${this.data?.name || this.label}${status}\n${this.data?.description || ''}`;
    }

    return String(this.label || '');
  }

  /**
   * 设置插件状态（用于可用插件）
   */
  setPluginStatus(status: { installed: boolean; enabled?: boolean; updateAvailable?: boolean }): void {
    this.pluginStatus = status;
    this.iconPath = new vscode.ThemeIcon(this.getIcon());
    this.tooltip = this.getTooltip();
  }
}

/**
 * CLI 命令执行结果
 */
export interface CommandResult {
  status: 'success' | 'error' | 'exists';
  data?: any;
  error?: string;
  code?: string;
}

/**
 * 执行 Claude Code CLI 命令
 */
export async function execClaudeCommand(
  command: string,
  options?: { timeout?: number; cwd?: string }
): Promise<CommandResult> {
  try {
    const { stdout, stderr } = await execAsync(
      `claude ${command}`,
      {
        timeout: options?.timeout || 60000,
        cwd: options?.cwd
      }
    );

    // 解析 JSON 输出
    if (command.includes('--json')) {
      try {
        const data = JSON.parse(stdout);
        return { status: 'success', data };
      } catch {
        return { status: 'success', data: stdout };
      }
    }

    return { status: 'success', data: stdout };
  } catch (error: any) {
    return handleCliError(error);
  }
}

/**
 * 处理 CLI 错误
 */
function handleCliError(error: any): CommandResult {
  const stderr = error.stderr || '';

  if (error.code === 'ENOENT') {
    return {
      status: 'error',
      code: 'CLAUDE_NOT_INSTALLED',
      error: 'Claude Code CLI 未安装。请先安装 Claude Code: https://claude.ai/download'
    };
  }

  if (stderr.includes('already installed')) {
    return {
      status: 'exists',
      error: '插件已安装'
    };
  }

  if (stderr.includes('not found')) {
    return {
      status: 'error',
      code: 'PLUGIN_NOT_FOUND',
      error: '插件不存在'
    };
  }

  return {
    status: 'error',
    code: 'UNKNOWN_ERROR',
    error: stderr || error.message
  };
}

/**
 * 市场配置文件结构
 */
export interface MarketplaceConfig {
  $schema: string;
  name: string;
  description: string;
  owner: {
    name: string;
    email?: string;
  };
  plugins: MarketplacePlugin[];
}

/**
 * 市场中的插件配置
 */
export interface MarketplacePlugin {
  name: string;
  description: string;
  version: string;
  author?: {
    name: string;
    email?: string;
  };
  source: string | { source: string; url: string };
  category?: string;
  homepage?: string;
  tags?: string[];
}

/**
 * 插件安装范围
 */
export type PluginScope = 'user' | 'project' | 'local';

/**
 * 插件状态
 */
export interface PluginStatus {
  installed: boolean;
  enabled?: boolean;
  scope?: PluginScope;
  version?: string;
  updateAvailable?: boolean;
}

/**
 * 完整插件信息（用于 UI 展示）
 */
export interface PluginInfo extends MarketplacePlugin {
  marketplace: string;
  status: PluginStatus;
  iconUrl?: string;
}

/**
 * 筛选条件
 */
export interface PluginFilter {
  keyword?: string;
  status?: 'all' | 'installed' | 'not-installed' | 'upgradable';
  marketplace?: string;
  scope?: PluginScope;
}

/**
 * installed_plugins.json 数据结构
 */
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

/**
 * settings.json 数据结构 (部分)
 */
export interface SettingsData {
  enabledPlugins?: Record<string, boolean>;
  [key: string]: any;
}

/**
 * known_marketplaces.json 数据结构
 */
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

/**
 * 市场信息
 */
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
