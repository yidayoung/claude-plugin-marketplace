// webview/src/types/sourceTypes.ts

/**
 * 市场源类型
 * 统一定义所有可能的市场源类型
 */
export type SourceType = 'github' | 'git' | 'directory' | 'url';

/**
 * 市场源接口（完整版，包含所有可能的字段）
 */
export interface Source {
  source: SourceType;
  repo?: string;   // github 类型使用
  url?: string;    // url/git 类型使用
  path?: string;   // directory 类型使用
}
