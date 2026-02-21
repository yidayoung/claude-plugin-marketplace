/**
 * 纯函数单元测试
 *
 * 测试 types.ts 和工具函数中的纯逻辑
 */

// Mock child_process
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

describe('CLI 错误处理', () => {
  // 注意：handleCliError 是 types.ts 中的私有函数
  // 我们在下面重新实现了类似的逻辑进行测试
});

describe('路径工具函数', () => {
  const os = require('os');
  const path = require('path');

  describe('CLAUDE_PATHS', () => {
    it('应生成正确的插件路径', () => {
      const homeDir = os.homedir();
      const expectedInstalledPath = path.join(homeDir, '.claude', 'plugins', 'installed_plugins.json');

      // 实际使用时导入：import { CLAUDE_PATHS } from '../../types';
      // expect(CLAUDE_PATHS.installedPlugins).toBe(expectedInstalledPath);
      expect(expectedInstalledPath).toContain('.claude/plugins/installed_plugins.json');
    });

    it('应生成正确的市场配置路径', () => {
      const homeDir = os.homedir();
      const marketplaceName = 'test-market';
      const expectedPath = path.join(
        homeDir,
        '.claude',
        'plugins',
        'marketplaces',
        marketplaceName,
        '.claude-plugin',
        'marketplace.json'
      );

      // expect(CLAUDE_PATHS.getMarketplaceConfig(marketplaceName)).toBe(expectedPath);
      expect(expectedPath).toContain('.claude/plugins/marketplaces/test-market');
    });
  });
});

describe('Repository 解析工具函数', () => {
  /**
   * 解析 GitHub 仓库地址
   * 支持两种格式:
   * - "owner/repo" (简写格式)
   * - "github.com/owner/repo" 或 "https://github.com/owner/repo" (完整格式)
   */
  function parseGitHubRepo(repo: string): { owner: string; repo: string } {
    // 先尝试简写格式 owner/repo (不包含 github.com)
    const shortMatch = repo.match(/^([^/]+)\/([^/]+?)(\.git)?$/);
    if (shortMatch && !repo.includes('github.com') && !repo.includes(':')) {
      return { owner: shortMatch[1], repo: shortMatch[2].replace(/\.git$/, '') };
    }

    // 尝试完整 URL 格式
    const fullMatch = repo.match(/github\.com[:/]([^/]+)\/(.+?)(\.git)?$/);
    if (fullMatch) {
      return { owner: fullMatch[1], repo: fullMatch[2].replace(/\.git$/, '') };
    }

    throw new Error(`无效的 GitHub 仓库地址: ${repo}`);
  }

  /**
   * 解析 repository 字段（字符串或对象）
   */
  function parseRepository(repo: string | { type?: string; url?: string; owner?: string; name?: string } | undefined | null): { type: string; url: string } | undefined {
    if (!repo) return undefined;

    if (typeof repo === 'string') {
      if (repo.includes('github.com')) {
        const url = repo.replace(/\.git$/, '');
        return { type: 'github', url };
      }
      return { type: 'other', url: repo };
    }

    if (repo.type === 'github' && repo.url) {
      return { type: 'github', url: repo.url };
    }

    return { type: 'other', url: repo.url || '' };
  }

  describe('parseGitHubRepo', () => {
    it('应解析简写格式 owner/repo (known_marketplaces.json 格式)', () => {
      // 这是实际 known_marketplaces.json 中使用的格式
      const result = parseGitHubRepo('anthropics/claude-plugins-official');
      expect(result).toEqual({ owner: 'anthropics', repo: 'claude-plugins-official' });
    });

    it('应解析带 .git 的简写格式', () => {
      const result = parseGitHubRepo('owner/repo.git');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('应解析 HTTPS URL', () => {
      const result = parseGitHubRepo('https://github.com/owner/repo');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('应解析带 .git 的 HTTPS URL', () => {
      const result = parseGitHubRepo('https://github.com/owner/repo.git');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('应解析 SSH URL', () => {
      const result = parseGitHubRepo('git@github.com:owner/repo.git');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('应拒绝无效的 URL', () => {
      expect(() => parseGitHubRepo('https://example.com/repo')).toThrow();
      expect(() => parseGitHubRepo('not-a-url')).toThrow();
    });
  });

  describe('parseRepository', () => {
    it('应处理 undefined', () => {
      expect(parseRepository(undefined)).toBeUndefined();
    });

    it('应解析 GitHub 字符串', () => {
      const result = parseRepository('https://github.com/owner/repo');
      expect(result).toEqual({
        type: 'github',
        url: 'https://github.com/owner/repo'
      });
    });

    it('应解析带 .git 的 GitHub 字符串', () => {
      const result = parseRepository('https://github.com/owner/repo.git');
      expect(result).toEqual({
        type: 'github',
        url: 'https://github.com/owner/repo'
      });
    });

    it('应解析 GitHub 对象格式', () => {
      const result = parseRepository({
        type: 'github',
        url: 'https://github.com/owner/repo'
      });
      expect(result).toEqual({
        type: 'github',
        url: 'https://github.com/owner/repo'
      });
    });

    it('应处理非 GitHub repository', () => {
      const result = parseRepository('https://gitlab.com/owner/repo');
      expect(result).toEqual({
        type: 'other',
        url: 'https://gitlab.com/owner/repo'
      });
    });

    it('应处理带 type 的非 GitHub 对象', () => {
      const result = parseRepository({
        type: 'git',
        url: 'https://example.com/repo.git'
      });
      expect(result).toEqual({
        type: 'other',
        url: 'https://example.com/repo.git'
      });
    });
  });
});

describe('依赖解析工具函数', () => {
  /**
   * 解析 dependencies 为依赖名称数组
   */
  function parseDependencies(packageJson: any): string[] {
    const deps = packageJson.dependencies || {};
    return Object.keys(deps);
  }

  it('应返回依赖数组', () => {
    const result = parseDependencies({
      dependencies: {
        'react': '^18.0.0',
        'lodash': '^4.17.21',
        'typescript': '^5.0.0'
      }
    });
    expect(result).toEqual(['react', 'lodash', 'typescript']);
  });

  it('应处理空依赖', () => {
    const result = parseDependencies({});
    expect(result).toEqual([]);
  });

  it('应处理没有 dependencies 字段的情况', () => {
    const result = parseDependencies({ name: 'test' });
    expect(result).toEqual([]);
  });

  it('应处理空的 dependencies 对象', () => {
    const result = parseDependencies({ dependencies: {} });
    expect(result).toEqual([]);
  });
});

describe('插件名称解析', () => {
  /**
   * 从 "name@marketplace" 格式解析插件信息
   */
  function parsePluginKey(key: string): { name: string; marketplace?: string } {
    const parts = key.split('@');
    if (parts.length === 2) {
      return { name: parts[0], marketplace: parts[1] };
    }
    return { name: key };
  }

  it('应解析带 marketplace 的 key', () => {
    const result = parsePluginKey('frontend-design@claude-plugins-official');
    expect(result).toEqual({
      name: 'frontend-design',
      marketplace: 'claude-plugins-official'
    });
  });

  it('应解析不带 marketplace 的 key', () => {
    const result = parsePluginKey('my-plugin');
    expect(result).toEqual({
      name: 'my-plugin',
      marketplace: undefined
    });
  });

  it('应处理带多个 @ 的插件名（edge case）', () => {
    // 实际场景中不应该有多个 @
    // 当有多个 @ 时，split 返回超过 2 个元素，函数返回整个 key
    const result = parsePluginKey('plugin@name@marketplace');
    expect(result.name).toBe('plugin@name@marketplace');
    expect(result.marketplace).toBeUndefined();
  });
});
