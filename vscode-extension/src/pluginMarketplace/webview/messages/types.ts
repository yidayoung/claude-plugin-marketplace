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
  | 'openDetail'
  | 'refresh'
  | 'addMarketplace'
  | 'removeMarketplace'
  | 'updateMarketplace';

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
  | 'error';

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
