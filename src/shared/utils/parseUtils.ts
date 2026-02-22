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
 */
export function parseFrontmatter(content: string): Record<string, any> | null {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) return null;

  try {
    const yaml = require('yaml');
    return yaml.parse(frontmatterMatch[1]);
  } catch {
    return null;
  }
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
