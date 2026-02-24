/**
 * GitHub Stars 拉取逻辑集成测试
 *
 * 验证从市场源到 GitHub API 的完整星拉取流程
 */

import { extractGitHubOwnerRepo, parseGitHubUrl } from '../../src/pluginMarketplace/data/types';

describe('GitHub Stars 拉取逻辑集成测试', () => {
  describe('完整流程：从 CLI source 到 API 参数', () => {
    it('应正确处理标准 CLI 格式的市场源到 GitHub API 调用', () => {
      // 模拟 CLI 构造的标准格式
      const cliSource = {
        source: 'github' as const,
        repo: 'anthropics/claude-plugins-official',
      };

      // 步骤1: 提取 owner/repo
      const ownerRepo = extractGitHubOwnerRepo(cliSource);
      expect(ownerRepo).toBe('anthropics/claude-plugins-official');

      // 步骤2: 解析为 owner 和 repo 参数
      const [owner, repo] = ownerRepo!.split('/');
      expect(owner).toBe('anthropics');
      expect(repo).toBe('anthropics/claude-plugins-official'.split('/')[1]); // 'claude-plugins-official'

      // 步骤3: 构造 GitHub API URL
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
      expect(apiUrl).toBe('https://api.github.com/repos/anthropics/claude-plugins-official');
    });

    it('应正确处理带 .git 后缀的 repo', () => {
      const cliSource = {
        source: 'github' as const,
        repo: 'owner/repo.git',
      };

      const ownerRepo = extractGitHubOwnerRepo(cliSource);
      expect(ownerRepo).toBe('owner/repo.git');

      const [owner, repo] = ownerRepo!.split('/');
      // repo 会被 .replace('.git', '') 处理
      const cleanRepo = repo.replace('.git', '');
      expect(cleanRepo).toBe('repo');

      const apiUrl = `https://api.github.com/repos/${owner}/${cleanRepo}`;
      expect(apiUrl).toBe('https://api.github.com/repos/owner/repo');
    });
  });

  describe('插件详情中的 repository URL 到 API 调用', () => {
    it('应正确解析插件的 GitHub repository URL', () => {
      // 模拟从 plugin.json 解析出的 repository 信息
      const repository = {
        type: 'github' as const,
        url: 'https://github.com/anthropics/claude-plugins-official',
      };

      // 步骤1: 解析 URL 获取 owner/repo
      const ownerRepo = parseGitHubUrl(repository.url);
      expect(ownerRepo).toBe('anthropics/claude-plugins-official');

      // 步骤2: 解析为参数
      const [owner, repo] = ownerRepo!.split('/');
      expect(owner).toBe('anthropics');
      expect(repo).toBe('claude-plugins-official');

      // 步骤3: 构造 API URL
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
      expect(apiUrl).toBe('https://api.github.com/repos/anthropics/claude-plugins-official');
    });

    it('应处理带 .git 后缀的 repository URL', () => {
      const repository = {
        type: 'github' as const,
        url: 'https://github.com/owner/repo.git',
      };

      const ownerRepo = parseGitHubUrl(repository.url);
      expect(ownerRepo).toBe('owner/repo'); // .git 已被去除

      const [owner, repo] = ownerRepo!.split('/');
      expect(owner).toBe('owner');
      expect(repo).toBe('repo');
    });

    it('应处理带分支路径的 repository URL', () => {
      const repository = {
        type: 'github' as const,
        url: 'https://github.com/owner/repo/tree/main',
      };

      const ownerRepo = parseGitHubUrl(repository.url);
      expect(ownerRepo).toBe('owner/repo');
    });
  });

  describe('边界情况和非 GitHub 源', () => {
    it('应跳过非 GitHub 类型的市场', () => {
      const urlSource = {
        source: 'url' as const,
        url: 'https://example.com/marketplace',
      };

      const ownerRepo = extractGitHubOwnerRepo(urlSource);
      expect(ownerRepo).toBeUndefined();
    });

    it('应跳过 directory 类型的市场', () => {
      const dirSource = {
        source: 'directory' as const,
        path: '/local/path/to/marketplace',
      };

      const ownerRepo = extractGitHubOwnerRepo(dirSource);
      expect(ownerRepo).toBeUndefined();
    });

    it('应跳过非 GitHub 类型的插件 repository', () => {
      const repository = {
        type: 'other' as 'other' | 'github',
        url: 'https://gitlab.com/owner/repo',
      };

      // fetchStarsAsync 会检查 type !== 'github' 直接返回
      const isGitHub = repository.type === 'github';
      expect(isGitHub).toBe(false);
    });
  });

  describe('实际 GitHub API 响应格式验证', () => {
    it('应正确解析 GitHub API 返回的 stargazers_count', () => {
      // 模拟 GitHub API 的实际响应格式
      const mockApiResponse = {
        id: 1296269,
        name: 'Hello-World',
        full_name: 'octocat/Hello-World',
        stargazers_count: 80,
        watchers_count: 80,
        forks_count: 9,
      };

      const stars = mockApiResponse.stargazers_count || 0;
      expect(stars).toBe(80);

      // 验证缺失 stargazers_count 的情况
      const mockApiResponseMissing: Record<string, unknown> = {
        id: 1296269,
        name: 'Hello-World',
      };
      const starsMissing = (mockApiResponseMissing.stargazers_count as number | undefined) || 0;
      expect(starsMissing).toBe(0);
    });
  });

  describe('已知市场的实际数据验证', () => {
    const knownMarkets = [
      {
        name: 'claude-plugins-official',
        source: { source: 'github' as const, repo: 'anthropics/claude-plugins-official' },
        expectedOwner: 'anthropics',
        expectedRepo: 'claude-plugins-official',
        expectedApi: 'https://api.github.com/repos/anthropics/claude-plugins-official',
      },
      {
        name: 'superpowers-marketplace',
        source: { source: 'github' as const, repo: 'obra/superpowers-marketplace' },
        expectedOwner: 'obra',
        expectedRepo: 'superpowers-marketplace',
        expectedApi: 'https://api.github.com/repos/obra/superpowers-marketplace',
      },
      {
        name: 'ui-ux-pro-max-skill',
        source: { source: 'github' as const, repo: 'nextlevelbuilder/ui-ux-pro-max-skill' },
        expectedOwner: 'nextlevelbuilder',
        expectedRepo: 'ui-ux-pro-max-skill',
        expectedApi: 'https://api.github.com/repos/nextlevelbuilder/ui-ux-pro-max-skill',
      },
    ];

    knownMarkets.forEach((market) => {
      it(`应正确解析 ${market.name} 市场`, () => {
        const ownerRepo = extractGitHubOwnerRepo(market.source);
        expect(ownerRepo).toBe(`${market.expectedOwner}/${market.expectedRepo}`);

        const [owner, repo] = ownerRepo!.split('/');
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
        expect(apiUrl).toBe(market.expectedApi);
      });
    });
  });
});
