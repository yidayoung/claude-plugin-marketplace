// src/shared/utils/parseUtils.ts
import * as path from 'path';

/**
 * 仓库信息
 */
export interface RepositoryInfo {
  type: 'github' | 'other';
  url: string;
}

/**
 * 解析 Markdown frontmatter
 * 宽松解析模式：
 * - 行首匹配 `key: value` 格式的为键值对
 * - 其他行作为上一个键的多行内容
 */
export function parseFrontmatter(content: string): Record<string, any> | null {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) return null;

  const frontmatterText = frontmatterMatch[1];
  const lines = frontmatterText.split('\n');
  const result: Record<string, any> = {};

  let currentKey: string | null = null;
  let currentValue: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // 跳过空行
    if (!trimmed) {
      // 如果当前有 key，保留空行
      if (currentKey) {
        currentValue.push('');
      }
      continue;
    }

    // 检查是否是键值对：行首非缩进的 `key:` 格式
    const keyValueMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)?$/);

    if (keyValueMatch) {
      // 保存之前的键值对
      if (currentKey) {
        result[currentKey] = parseValue(currentValue.join('\n').trim());
      }

      // 开始新的键值对
      currentKey = keyValueMatch[1];
      const inlineValue = keyValueMatch[2] || '';
      currentValue = inlineValue ? [inlineValue] : [];
    } else {
      // 多行内容，追加到当前键
      if (currentKey) {
        // 去掉行首缩进（保留相对缩进结构）
        const indentMatch = line.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1] : '';
        const trimmedLine = line.substring(indent.length - Math.min(2, indent.length));
        currentValue.push(trimmedLine);
      }
    }
  }

  // 保存最后一个键值对
  if (currentKey) {
    result[currentKey] = parseValue(currentValue.join('\n').trim());
  }

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * 解析值 - 统一返回字符串
 */
function parseValue(value: string): string {
  if (!value) return '';

  // 去掉首尾空行
  value = value.replace(/^\n+|\n+$/g, '');

  // 去掉引号包裹
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}

/**
 * 解析 GitHub 仓库地址
 */
export function parseGitHubRepo(url: string): { owner: string; repo: string } | null {
  // 简写格式: owner/repo
  const shortMatch = url.match(/^([^/]+)\/([^/]+?)(\.git)?$/);
  if (shortMatch && !url.includes('github.com') && !url.includes(':')) {
    return { owner: shortMatch[1], repo: shortMatch[2].replace(/\.git$/, '') };
  }

  // 完整 URL 格式
  const fullMatch = url.match(/github\.com[:/]([^/]+)\/(.+?)(\.git)?$/);
  if (fullMatch) {
    return { owner: fullMatch[1], repo: fullMatch[2].replace(/\.git$/, '') };
  }

  return null;
}

/**
 * 解析仓库信息
 */
export function parseRepository(packageJson: any): RepositoryInfo | undefined {
  const repo = packageJson.repository;
  if (!repo) return undefined;

  if (typeof repo === 'string') {
    if (repo.includes('github.com')) {
      return { type: 'github', url: repo };
    }
    return { type: 'other', url: repo };
  }

  if (repo.type === 'github') {
    return {
      type: 'github',
      url: `https://github.com/${repo.owner}/${repo.name}`
    };
  }

  return { type: 'other', url: repo.url || '' };
}

/**
 * 从 plugin.json 获取自定义路径配置
 */
export function getCustomPaths(
  config: string | string[] | undefined,
  basePath: string
): string[] {
  if (!config) return [];

  const configs = Array.isArray(config) ? config : [config];
  const paths: string[] = [];

  for (const cfg of configs) {
    if (typeof cfg === 'string') {
      const relativePath = cfg.startsWith('./') ? cfg.slice(2) : cfg;
      paths.push(path.join(basePath, relativePath));
    }
  }

  return paths;
}
