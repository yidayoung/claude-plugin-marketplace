// vscode-extension/src/shared/types/sourceTypes.ts

/**
 * 市场源类型
 * 统一定义所有可能的市场源类型
 */
export type SourceType = 'github' | 'git' | 'directory' | 'url';

/**
 * 市场源接口（完整版，包含所有可能的字段）
 * 与 CLI known_marketplaces.json 中的 source 字段对应
 */
export interface Source {
  source: SourceType;
  repo?: string;   // github 类型使用，格式: owner/repo
  url?: string;    // url/git 类型使用
  path?: string;   // directory 类型使用
}

/**
 * 插件来源类型（用于 Marketplace 接口）
 * 注意: local 等同于 directory，是 CLI 的另一种表示方式
 */
export type PluginSourceType = 'url' | 'git' | 'local';
