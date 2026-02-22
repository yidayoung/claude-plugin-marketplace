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
 * 使用宽松的解析模式，处理包含特殊字符（如冒号）的值
 */
export function parseFrontmatter(content: string): Record<string, any> | null {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) return null;

  const frontmatterText = frontmatterMatch[1];

  // 首先尝试标准 YAML 解析
  try {
    const yaml = require('yaml');
    return yaml.parse(frontmatterText);
  } catch (e) {
    // YAML 解析失败，使用宽松的正则表达式解析
    // 这种情况通常发生在值中包含冒号等特殊字符时
  }

  // 宽松解析：逐行解析键值对
  const result: Record<string, any> = {};
  const lines = frontmatterText.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 跳过空行和注释
    if (!trimmed || trimmed.startsWith('#')) continue;

    // 查找第一个冒号作为键值分隔符
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.substring(0, colonIndex).trim();
    let value = trimmed.substring(colonIndex + 1).trim();

    // 处理不同类型的值
    if (!value) {
      // 空值
      result[key] = null;
    } else if (value.startsWith('"') || value.startsWith("'")) {
      // 字符串值（引号包围）
      result[key] = value.slice(1, -1);
    } else if (value === 'true') {
      result[key] = true;
    } else if (value === 'false') {
      result[key] = false;
    } else if (value === 'null') {
      result[key] = null;
    } else if (!isNaN(Number(value))) {
      // 数字值
      result[key] = Number(value);
    } else if (value.startsWith('[')) {
      // 数组值 - 简单处理
      try {
        result[key] = JSON.parse(value);
      } catch {
        // 如果解析失败，保留原始字符串
        result[key] = value;
      }
    } else if (value.startsWith('{')) {
      // 对象值 - 简单处理
      try {
        result[key] = JSON.parse(value);
      } catch {
        // 如果解析失败，保留原始字符串
        result[key] = value;
      }
    } else {
      // 多行字符串值：检查后续行是否缩进
      let fullValue = value;
      let j = i + 1;
      while (j < lines.length && (lines[j].startsWith('  ') || lines[j].startsWith('\t'))) {
        fullValue += '\n' + lines[j].trimLeft();
        j++;
      }
      i = j - 1; // 跳过已处理的行
      result[key] = fullValue;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
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
