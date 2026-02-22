// vscode-extension/src/pluginMarketplace/data/types.ts

import { PluginDetailData } from '../webview/messages/types';
import { PluginScope } from '../types';

// 市场信息
export interface MarketplaceInfo {
  name: string;
  source: {
    source: 'github' | 'url' | 'directory' | 'git';
    repo?: string;
    url?: string;
  };
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
}

// 插件安装状态
export interface InstalledStatus {
  installed: boolean;
  enabled: boolean;
  scope?: PluginScope;
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
