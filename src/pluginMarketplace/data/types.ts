// vscode-extension/src/pluginMarketplace/data/types.ts

import { PluginDetailData } from '../webview/messages/types';
import { PluginScope } from '../types';
import type { Source } from '../../shared/types/sourceTypes';

// 类型别名：Source -> MarketplaceSource
export type MarketplaceSource = Source;

// 市场信息
export interface MarketplaceInfo {
  name: string;
  source: Source;
  path?: string;
}

// 插件基本信息（用于列表展示）
export interface PluginInfo {
  name: string;
  description: string;
  version: string;
  author?: string;
  homepage?: string;
  category?: string;
  marketplace: string;
  installed: boolean;
  enabled?: boolean;
  scope?: PluginScope;
  stars?: number;
  updateAvailable?: boolean;  // 是否有可用更新
}

// 插件安装状态
export interface InstalledStatus {
  installed: boolean;
  enabled: boolean;
  scope?: PluginScope;
  installedVersion?: string;  // 已安装的版本号
}

// 插件详情缓存条目
export interface DetailCacheEntry {
  data: PluginDetailData;
  timestamp: number;
}

// Store 事件类型
export enum StoreEvent {
  MarketplaceChange = 'marketplaceChange',
  PluginStatusChange = 'pluginStatusChange',
  PluginDetailUpdate = 'pluginDetailUpdate',
}

// 插件状态变更事件
export interface PluginStatusChangeEvent {
  pluginName: string;
  marketplace: string;
  change: 'installed' | 'uninstalled' | 'enabled' | 'disabled';
}

// 插件详情更新事件
export interface PluginDetailUpdateEvent {
  pluginName: string;
  marketplace: string;
  updates: Partial<PluginDetailData>;
}

/**
 * 简单的版本号比较
 * @returns 正数表示 v1 > v2，负数表示 v1 < v2，0 表示相等
 */
export function compareVersions(v1: string, v2: string): number {
  // 移除可能的 'v' 前缀
  const cleanV1 = v1.replace(/^v/i, '');
  const cleanV2 = v2.replace(/^v/i, '');

  const parts1 = cleanV1.split('.').map(p => parseInt(p, 10) || 0);
  const parts2 = cleanV2.split('.').map(p => parseInt(p, 10) || 0);

  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const p1 = parts1[i] ?? 0;
    const p2 = parts2[i] ?? 0;

    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }

  return 0;
}

/**
 * 检查是否有更新可用
 * @param installedVersion 已安装版本
 * @param availableVersion 远端可用版本
 */
export function hasUpdateAvailable(installedVersion: string, availableVersion: string): boolean {
  return compareVersions(availableVersion, installedVersion) > 0;
}

/**
 * 从 GitHub 类型市场源中提取 owner/repo
 *
 * @param source 市场源对象
 * @returns owner/repo 字符串，如果不是 GitHub 源则返回 undefined
 *
 * CLI 构造的标准格式：
 * - { source: 'github', repo: 'owner/repo' }
 *
 * 直接使用 repo 字段即可，不需要额外处理
 */
export function extractGitHubOwnerRepo(source: MarketplaceSource | string | undefined): string | undefined {
  if (!source) {
    return undefined;
  }

  // 处理字符串格式（向后兼容）
  if (typeof source === 'string') {
    return source.includes('/') ? source : undefined;
  }

  // GitHub 类型直接使用 repo 字段
  if (source.source === 'github' && source.repo) {
    return source.repo;
  }

  return undefined;
}

/**
 * 从 GitHub URL 中提取 owner/repo
 *
 * @param url GitHub URL（如 https://github.com/owner/repo 或 https://github.com/owner/repo.git）
 * @returns owner/repo 字符串，如果无法解析则返回 undefined
 */
export function parseGitHubUrl(url: string): string | undefined {
  const match = url.match(/github\.com\/([^/]+)\/([^/\s?#]+)/);
  if (match) {
    return `${match[1]}/${match[2]}`.replace(/\.git$/, '');
  }
  return undefined;
}
