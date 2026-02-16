/**
 * Webview 消息类型定义
 */

/**
 * Webview 发送给 Extension 的消息类型
 */
export type WebviewMessageType =
  | 'getPlugins'
  | 'installPlugin'
  | 'uninstallPlugin'
  | 'enablePlugin'
  | 'disablePlugin'
  | 'updatePlugin'
  | 'openDetails'
  | 'refresh'
  | 'addMarketplace'
  | 'removeMarketplace'
  | 'updateMarketplace'
  | 'executeCommand';

/**
 * Extension 发送给 Webview 的消息类型
 */
export type ExtensionMessageType =
  | 'plugins'
  | 'installSuccess'
  | 'installError'
  | 'uninstallSuccess'
  | 'uninstallError'
  | 'enableSuccess'
  | 'enableError'
  | 'disableSuccess'
  | 'disableError'
  | 'marketplaceSuccess'
  | 'marketplaceError'
  | 'error'
  | 'pluginDetail';

/**
 * Webview 消息基础结构
 */
export interface WebviewMessage {
  type: WebviewMessageType;
  payload?: any;
}

/**
 * 安装插件的消息负载
 */
export interface InstallPluginPayload {
  pluginName: string;
  marketplace: string;
  scope: 'user' | 'project' | 'local';
}

/**
 * 卸载插件的消息负载
 */
export interface UninstallPluginPayload {
  pluginName: string;
}

/**
 * 获取插件的消息负载
 */
export interface GetPluginsPayload {
  filter?: {
    keyword?: string;
    status?: 'all' | 'installed' | 'not-installed' | 'upgradable';
    marketplace?: string;
  };
}

/**
 * Extension 消息基础结构
 */
export interface ExtensionMessage {
  type: ExtensionMessageType;
  payload?: any;
}

/**
 * 插件数据负载
 */
export interface PluginsPayload {
  plugins: PluginData[];
  marketplaces: string[];
}

/**
 * 插件数据（用于 UI 展示）
 */
export interface PluginData {
  name: string;
  description: string;
  version: string;
  author?: string;
  homepage?: string;
  category?: string;
  marketplace: string;
  installed: boolean;
  enabled?: boolean;
  scope?: 'user' | 'project' | 'local';
  updateAvailable?: boolean;
}

/**
 * 启用/禁用插件的消息负载
 */
export interface EnablePluginPayload {
  pluginName: string;
  marketplace: string;
}

export interface DisablePluginPayload {
  pluginName: string;
  marketplace: string;
}

/**
 * 市场操作的消息负载
 */
export interface AddMarketplacePayload {
  source: string;
}

export interface RemoveMarketplacePayload {
  name: string;
}

export interface UpdateMarketplacePayload {
  name: string;
}

/**
 * 打开插件详情的消息负载
 */
export interface OpenDetailsPayload {
  pluginName: string;
  marketplace: string;
}

/**
 * 更新插件的消息负载
 */
export interface UpdatePluginPayload {
  pluginName: string;
  marketplace: string;
}

/**
 * 执行命令的消息负载
 */
export interface ExecuteCommandPayload {
  command: string;
  args?: any[];
}

/**
 * 插件详情数据负载
 */
export interface PluginDetailPayload {
  pluginName: string;
  marketplace: string;
}

/**
 * 插件核心内容信息
 */
export interface SkillInfo {
  name: string;
  description: string;
  category?: string;
}

export interface HookInfo {
  name: string;
  events: string[];
  description?: string;
}

export interface McpInfo {
  name: string;
  description?: string;
}

export interface CommandInfo {
  name: string;
  description?: string;
}

/**
 * 仓库信息
 */
export interface RepositoryInfo {
  type: 'github' | 'gitlab' | 'other';
  url: string;
  stars?: number;
}

/**
 * 插件详情数据（扩展 PluginData）
 */
export interface PluginDetailData {
  name: string;
  description: string;
  version: string;
  author?: string;
  homepage?: string;
  category?: string;
  marketplace: string;
  installed: boolean;
  enabled?: boolean;
  scope?: 'user' | 'project' | 'local';
  updateAvailable?: boolean;
  // 详情特有字段
  readme?: string;
  skills?: SkillInfo[];
  hooks?: HookInfo[];
  mcps?: McpInfo[];
  commands?: CommandInfo[];
  repository?: RepositoryInfo;
  dependencies?: string[];
  license?: string;
}

/**
 * 插件详情消息负载
 */
export interface PluginDetailMessagePayload {
  plugin: PluginDetailData;
}

