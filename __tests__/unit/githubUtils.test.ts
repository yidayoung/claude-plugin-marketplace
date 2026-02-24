/**
 * GitHub 仓库解析工具函数测试
 *
 * 测试 types.ts 中的 extractGitHubOwnerRepo 和 parseGitHubUrl 函数
 */

import { extractGitHubOwnerRepo, parseGitHubUrl } from '../../src/pluginMarketplace/data/types';
import type { MarketplaceSource } from '../../src/pluginMarketplace/data/types';

describe('extractGitHubOwnerRepo', () => {
  describe('GitHub 类型的市场源', () => {
    it('应从标准 CLI 格式提取 owner/repo', () => {
      const source: MarketplaceSource = {
        source: 'github',
        repo: 'anthropics/claude-plugins-official',
      };
      expect(extractGitHubOwnerRepo(source)).toBe('anthropics/claude-plugins-official');
    });

    it('应从带 .git 后缀的 repo 提取 owner/repo', () => {
      const source: MarketplaceSource = {
        source: 'github',
        repo: 'owner/repo.git',
      };
      expect(extractGitHubOwnerRepo(source)).toBe('owner/repo.git');
    });

    it('应在 source 不是 github 类型时返回 undefined', () => {
      const source: MarketplaceSource = {
        source: 'url',
        url: 'https://example.com/repo',
      };
      expect(extractGitHubOwnerRepo(source)).toBeUndefined();
    });

    it('应在 github 类型但没有 repo 字段时返回 undefined', () => {
      const source: MarketplaceSource = {
        source: 'github',
      };
      expect(extractGitHubOwnerRepo(source)).toBeUndefined();
    });
  });

  describe('字符串格式（向后兼容）', () => {
    it('应从 owner/repo 格式字符串提取', () => {
      expect(extractGitHubOwnerRepo('anthropics/claude-plugins-official'))
        .toBe('anthropics/claude-plugins-official');
    });

    it('应从带 .git 的字符串提取', () => {
      expect(extractGitHubOwnerRepo('owner/repo.git')).toBe('owner/repo.git');
    });

    it('应在没有斜杠时返回 undefined', () => {
      expect(extractGitHubOwnerRepo('just-a-name')).toBeUndefined();
    });
  });

  describe('边界情况', () => {
    it('应处理 undefined 输入', () => {
      expect(extractGitHubOwnerRepo(undefined)).toBeUndefined();
    });

    it('应处理 null 输入', () => {
      expect(extractGitHubOwnerRepo(null as any)).toBeUndefined();
    });

    it('应处理空字符串', () => {
      expect(extractGitHubOwnerRepo('')).toBeUndefined();
    });

    it('应处理空对象', () => {
      expect(extractGitHubOwnerRepo({} as any)).toBeUndefined();
    });
  });
});

describe('parseGitHubUrl', () => {
  describe('标准 GitHub URL', () => {
    it('应解析 https://github.com/owner/repo', () => {
      expect(parseGitHubUrl('https://github.com/anthropics/claude-plugins-official'))
        .toBe('anthropics/claude-plugins-official');
    });

    it('应解析带 .git 后缀的 URL', () => {
      expect(parseGitHubUrl('https://github.com/owner/repo.git'))
        .toBe('owner/repo');
    });

    it('应解析带 www 的 URL', () => {
      expect(parseGitHubUrl('https://www.github.com/owner/repo'))
        .toBe('owner/repo');
    });
  });

  describe('带路径的 GitHub URL', () => {
    it('应解析带 tree 分支的 URL', () => {
      expect(parseGitHubUrl('https://github.com/owner/repo/tree/main'))
        .toBe('owner/repo');
    });

    it('应解析带 blob 路径的 URL', () => {
      expect(parseGitHubUrl('https://github.com/owner/repo/blob/main/README.md'))
        .toBe('owner/repo');
    });

    it('应解析带 issues 路径的 URL', () => {
      expect(parseGitHubUrl('https://github.com/owner/repo/issues/123'))
        .toBe('owner/repo');
    });
  });

  describe('非 GitHub URL', () => {
    it('应返回 undefined 对于非 GitHub URL', () => {
      expect(parseGitHubUrl('https://gitlab.com/owner/repo')).toBeUndefined();
    });

    it('应返回 undefined 对于非 URL 字符串', () => {
      expect(parseGitHubUrl('not-a-url')).toBeUndefined();
    });

    it('应返回 undefined 对于空字符串', () => {
      expect(parseGitHubUrl('')).toBeUndefined();
    });

    it('应返回 undefined 对于 github.com 但没有 owner/repo', () => {
      expect(parseGitHubUrl('https://github.com')).toBeUndefined();
    });

    it('应返回 undefined 对于只有 owner 的 URL', () => {
      expect(parseGitHubUrl('https://github.com/owner')).toBeUndefined();
    });
  });

  describe('特殊字符处理', () => {
    it('应正确处理 URL 中的查询参数', () => {
      expect(parseGitHubUrl('https://github.com/owner/repo?tab=readme'))
        .toBe('owner/repo');
    });

    it('应正确处理 URL 中的 hash', () => {
      expect(parseGitHubUrl('https://github.com/owner/repo#readme'))
        .toBe('owner/repo');
    });
  });
});
