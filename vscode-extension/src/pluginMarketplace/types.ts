// vscode-extension/src/pluginMarketplace/types.ts

import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
  version: string;
  enabled: boolean;
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
  | 'available-section';

/**
 * 树节点基类
 */
export class PluginTreeItem extends vscode.TreeItem {
  constructor(
    public readonly type: TreeItemType,
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly data?: any
  ) {
    super(label, collapsibleState);
    this.contextValue = type;
    this.iconPath = new vscode.ThemeIcon(this.getIcon());
  }

  private getIcon(): string {
    switch (this.type) {
      case 'marketplace': return 'database';
      case 'installed-overview': return 'check';
      case 'installed-plugin': return 'package';
      case 'available-plugin': return 'package';
      case 'installed-section': return 'check';
      case 'available-section': return 'package';
      default: return 'circle-outline';
    }
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
