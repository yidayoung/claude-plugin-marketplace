/**
 * Webview 消息类型定义
 */

import type { Source } from '../../../shared/types/sourceTypes';

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
  | 'openExternal'
  | 'copyToClipboard'
  | 'openFile'
  | 'openDirectory'
  | 'refresh'
  | 'addMarketplace'
  | 'addRecommendedMarketplace'
  | 'removeMarketplace'
  | 'updateMarketplace'
  | 'executeCommand'
  | 'ready';

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
  | 'pluginDetail'
  | 'detailUpdate'
  | 'statusUpdate'
  | 'marketplaceList';

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
  stars?: number;
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
 * 打开文件的消息负载
 */
export interface OpenFilePayload {
  filePath: string;
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

/**
 * Skill 信息（Agent Skills）
 * 来源: skills 目录下的 SKILL.md 文件
 */
export interface SkillInfo {
  name: string;
  description: string;
  category?: string;
  tools?: string[];
  allowedTools?: string[];
  disableModelInvocation?: boolean;
  filePath?: string;  // SKILL.md 文件的绝对路径
}

/**
 * Agent 信息（Subagents）
 * 来源: agents/*.md
 */
export interface AgentInfo {
  name: string;
  description: string;
  model?: string;
  category?: string;
  filePath?: string;  // agent.md 文件的绝对路径
}

/**
 * Hook 信息
 * 来源: hooks/hooks.json
 */
export interface HookInfo {
  event: string;
  hooks: HookConfig[];
  filePath?: string;  // hooks.json 文件的绝对路径
}

export interface HookConfig {
  type: string;
  matcher?: string;
  command?: string;
  skill?: string;
  async?: boolean;
}

/**
 * MCP Server 信息
 * 来源: .mcp.json
 */
export interface McpInfo {
  name: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  description?: string;
  type?: string;  // "stdio" | "http" 等
  url?: string;   // HTTP MCP 服务器的 URL
  filePath?: string;  // .mcp.json 文件的绝对路径
}

/**
 * LSP Server 信息
 * 来源: .lsp.json
 */
export interface LspInfo {
  language: string;
  command: string;
  args?: string[];
  extensionToLanguage?: Record<string, string>;
  filePath?: string;  // .lsp.json 文件的绝对路径
}

/**
 * Command 信息（User Commands）
 * 来源: commands/*.md
 */
export interface CommandInfo {
  name: string;
  description?: string;
  filePath?: string;  // command.md 文件的绝对路径
}

/**
 * Output Style 信息
 * 来源: outputStyles/ 目录或 plugin.json 的 outputStyles 字段
 */
export interface OutputStyleInfo {
  name: string;
  type?: 'file' | 'directory';
  filePath?: string;  // output style 文件/目录的绝对路径
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
export interface PluginDetailData extends PluginData {
  // 详情特有字段
  readme?: string;
  skills?: SkillInfo[];
  agents?: AgentInfo[];
  hooks?: HookInfo[];
  mcps?: McpInfo[];
  commands?: CommandInfo[];
  lsps?: LspInfo[];
  outputStyles?: OutputStyleInfo[];
  repository?: RepositoryInfo;
  dependencies?: string[];
  license?: string;
  // 是否为远程插件（未安装时无法获取完整内容）
  isRemoteSource?: boolean;
  // 本地插件路径（用于打开目录）
  localPath?: string;
  // 市场源信息
  marketplaceSource?: Source;
}

/**
 * 插件详情消息负载
 */
export interface PluginDetailMessagePayload {
  plugin: PluginDetailData;
}

/**
 * 插件详情更新消息负载（用于 Store 事件）
 */
export interface DetailUpdatePayload {
  updates: Partial<PluginDetailData>;
}

/**
 * 插件状态更新消息负载（用于 Store 事件）
 */
export interface StatusUpdatePayload {
  change: 'installed' | 'uninstalled' | 'enabled' | 'disabled';
}
