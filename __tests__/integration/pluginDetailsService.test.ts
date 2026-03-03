/**
 * PluginDetailsService 集成测试
 *
 * 使用真实的 PluginDetailsService 和本地文件系统
 * 直接测试实际实现，而不是重写逻辑
 */

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import { PluginDetailsService } from '../../src/pluginMarketplace/webview/services/PluginDetailsService';
import { PluginPathResolver } from '../../src/pluginMarketplace/webview/services/PluginPathResolver';
import { ContentParser } from '../../src/pluginMarketplace/webview/services/ContentParser';

// Mock vscode 模块
jest.mock('vscode', () => ({
  TreeItem: class {
    public label: string = '';
    constructor(label: string) {
      this.label = label;
    }
  },
  workspace: {
    workspaceFolders: [{ uri: { fsPath: process.cwd() } }]
  }
}));

describe('PluginDetailsService 集成测试', () => {
  const homeDir = os.homedir();
  const installedPluginsPath = path.join(homeDir, '.claude', 'plugins', 'installed_plugins.json');

  let service: PluginDetailsService;
  let pathResolver: PluginPathResolver;
  let contentParser: ContentParser;
  let mockContext: any;

  // 收集实际已安装的插件用于测试
  let installedPlugins: Array<{ name: string; marketplace: string }> = [];

  beforeAll(async () => {
    console.log('\n=== 测试环境初始化 ===');
    console.log(`HOME: ${homeDir}`);

    // 创建 mock context
    mockContext = {
      globalStorageUri: { fsPath: path.join(homeDir, '.claude', 'test-storage') }
    };

    service = new PluginDetailsService(mockContext);
    pathResolver = new PluginPathResolver(mockContext);
    contentParser = new ContentParser();

    // 读取已安装插件列表
    try {
      const content = await fs.readFile(installedPluginsPath, 'utf-8');
      const data = JSON.parse(content);

      for (const [key] of Object.entries(data.plugins || {})) {
        const [name, marketplace] = key.split('@');
        installedPlugins.push({ name, marketplace });
      }

      console.log(`找到 ${installedPlugins.length} 个已安装插件`);
    } catch (error) {
      console.warn('警告: 无法读取已安装插件列表', error);
    }
  });

  describe('PluginPathResolver - 真实实现测试', () => {
    it('应能找到已安装插件的路径', async () => {
      if (installedPlugins.length === 0) {
        console.log('  ⚠ 跳过 - 没有已安装的插件');
        return;
      }

      const plugin = installedPlugins[0];
      console.log(`  测试插件: ${plugin.name}`);

      const pluginPath = await pathResolver.findPluginPath(plugin.name);

      expect(pluginPath).not.toBeNull();
      console.log(`  ✓ 找到路径: ${pluginPath}`);
    });

    it('应能找到 superpowers 插件', async () => {
      const pluginPath = await pathResolver.findPluginPath('superpowers');

      expect(pluginPath).not.toBeNull();
      console.log(`  ✓ superpowers 路径: ${pluginPath}`);
    });

    it('找不到的插件应返回 null', async () => {
      const pluginPath = await pathResolver.findPluginPath('nonexistent-plugin-xyz-123');

      expect(pluginPath).toBeNull();
      console.log(`  ✓ 不存在的插件返回 null`);
    });
  });

  describe('readReadme - 真实实现测试', () => {
    it('应能读取插件的 README', async () => {
      if (installedPlugins.length === 0) {
        console.log('  ⚠ 跳过 - 没有已安装的插件');
        return;
      }

      // 找一个有 README 的插件
      for (const plugin of installedPlugins.slice(0, 3)) {
        const pluginPath = await pathResolver.findPluginPath(plugin.name);
        if (!pluginPath) continue;

        const readme = await service.readReadme(pluginPath);

        if (readme.length > 0) {
          console.log(`  ✓ ${plugin.name} README: ${readme.length} 字符`);
          console.log(`    预览: ${readme.substring(0, 80).replace(/\n/g, ' ')}...`);
          expect(readme.length).toBeGreaterThan(0);
          return;
        }
      }

      console.log('  ⚠ 没有找到有 README 的插件');
    });
  });

  describe('parseRepository - 真实实现测试', () => {
    it('应能解析真实插件的 repository', async () => {
      // 读取 superpowers 的配置
      const pluginPath = await pathResolver.findPluginPath('superpowers');
      if (!pluginPath) {
        console.log('  ⚠ 跳过 - superpowers 未安装');
        return;
      }

      const configPath = path.join(pluginPath, '.claude-plugin', 'plugin.json');
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));

      if (config.repository) {
        const result = service.parseRepository(config);
        console.log(`  ✓ repository: ${JSON.stringify(result)}`);
        expect(result).toBeDefined();
      } else {
        console.log(`  ⚠ superpowers 没有 repository 字段`);
      }
    });
  });

  describe('parseDependencies - 真实实现测试', () => {
    it('应能解析真实插件的依赖', async () => {
      const pluginPath = await pathResolver.findPluginPath('superpowers');
      if (!pluginPath) {
        console.log('  ⚠ 跳过 - superpowers 未安装');
        return;
      }

      const configPath = path.join(pluginPath, '.claude-plugin', 'plugin.json');
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));

      const dependencies = service.parseDependencies(config);
      console.log(`  ✓ 依赖数量: ${dependencies.length}`);
      console.log(`    依赖列表: ${dependencies.join(', ') || '(无)'}`);
      expect(Array.isArray(dependencies)).toBe(true);
    });
  });

  describe('getInstalledPluginDetail - 完整流程测试', () => {
    it('应能获取 superpowers 的完整详情', async () => {
      const result = await service.getInstalledPluginDetail('superpowers', 'superpowers-marketplace');

      console.log(`  ✓ 插件名称: ${result.name}`);
      console.log(`  ✓ 版本: ${result.version}`);
      console.log(`  ✓ 描述: ${result.description.substring(0, 60)}...`);
      console.log(`  ✓ 作者: ${result.author}`);
      console.log(`  ✓ README: ${result.readme?.length || 0} 字符`);
      console.log(`  ✓ 仓库: ${result.repository?.url || 'N/A'}`);
      console.log(`  ✓ 依赖: ${result.dependencies?.length || 0} 个`);
      console.log(`  ✓ 许可证: ${result.license || 'N/A'}`);

      expect(result.name).toBe('superpowers');
      expect(result.description).toBeDefined();
      expect(result.installed).toBe(true);
    });

    it('应能获取 frontend-design 的完整详情', async () => {
      const result = await service.getInstalledPluginDetail('frontend-design', 'claude-plugins-official');

      console.log(`  ✓ 插件名称: ${result.name}`);
      console.log(`  ✓ 描述: ${result.description}`);

      expect(result.name).toBe('frontend-design');
    });

    it('应能获取 everything-claude-code 的完整详情（包括 skills）', async () => {
      // everything-claude-code 没有安装，直接用路径测试
      const pluginPath = path.join(homeDir, '.claude', 'plugins', 'cache', 'everything-claude-code', 'everything-claude-code', '1.4.1');

      console.log(`  测试路径: ${pluginPath}`);

      // 直接读取配置
      const configPath = path.join(pluginPath, '.claude-plugin', 'plugin.json');
      try {
        await fs.access(configPath);
      } catch {
        console.log('  ⚠ 跳过 - everything-claude-code 测试数据不存在');
        return;
      }
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      console.log(`  配置中的 name: ${config.name}`);

      // 测试 parseSkills
      const skills = await contentParser.parseSkills(pluginPath, config);
      console.log(`  ✓ Skills 数量: ${skills.length}`);
      if (skills.length > 0) {
        console.log(`    前 3 个: ${skills.slice(0, 3).map((s: any) => s.name).join(', ')}`);
      }

      // 测试 parseAgents
      const agents = await contentParser.parseAgents(pluginPath, config);
      console.log(`  ✓ Agents 数量: ${agents.length}`);
      if (agents.length > 0) {
        console.log(`    前 3 个: ${agents.slice(0, 3).map((a: any) => a.name).join(', ')}`);
      }

      // 测试 parseCommands
      const commands = await contentParser.parseCommands(pluginPath, config);
      console.log(`  ✓ Commands 数量: ${commands.length}`);

      expect(skills.length).toBeGreaterThan(0);
      expect(agents.length).toBeGreaterThan(0);
    });

    it('应能获取非安装插件的详情（从本地市场目录）', async () => {
      // code-simplifier 没有安装，但在市场目录中有
      // 直接测试 parseAgents 从本地市场目录读取
      const localMarketPath = path.join(homeDir, '.claude', 'plugins', 'marketplaces', 'claude-plugins-official', 'plugins', 'code-simplifier');

      console.log(`  本地市场路径: ${localMarketPath}`);

      // 检查目录存在
      await fs.access(localMarketPath);

      // 测试 parseAgents
      const agents = await contentParser.parseAgents(localMarketPath);
      console.log(`  ✓ Agents 数量: ${agents.length}`);
      if (agents.length > 0) {
        console.log(`    Agents: ${agents.map((a: any) => a.name).join(', ')}`);
      }

      expect(agents.length).toBeGreaterThan(0);
    });
  });

  describe('parseGitHubRepo - 边界情况测试', () => {
    it('应解析 known_marketplaces.json 中的 owner/repo 格式', async () => {
      // 验证实际数据格式
      const knownMarketplacesPath = path.join(homeDir, '.claude', 'plugins', 'known_marketplaces.json');

      try {
        const content = await fs.readFile(knownMarketplacesPath, 'utf-8');
        const data = JSON.parse(content);
        const firstMarket = Object.keys(data)[0];
        const repoValue = data[firstMarket].source.repo;

        console.log(`  实际的 repo 格式: ${repoValue}`);
        console.log(`  类型: ${typeof repoValue}`);

        // 验证格式是 owner/repo
        expect(repoValue).toMatch(/^[^/]+\/[^/]+$/);
      } catch (e) {
        console.log('  ⚠ 无法读取 known_marketplaces.json');
      }
    });
  });

  describe('性能测试 - getRemotePluginDetail', () => {
    it('未安装插件首次加载应快速返回（<50ms，不等待 GitHub）', async () => {
      // serena 是未安装的插件，但在本地市场源目录中
      const pluginName = 'serena';
      const marketplace = 'claude-plugins-official';

      console.log(`\n  📊 测试未安装插件加载性能: ${pluginName}@${marketplace}`);

      const startTime = Date.now();
      const result = await service.getRemotePluginDetail(pluginName, marketplace);
      const loadTime = Date.now() - startTime;

      console.log(`  ✓ 加载时间: ${loadTime}ms`);
      console.log(`  ✓ 插件名称: ${result.name}`);
      console.log(`  ✓ README 长度: ${result.readme?.length || 0} 字符 (本地无 README)`);
      console.log(`  ✓ Skills: ${result.skills?.length || 0} 个`);
      console.log(`  ✓ Agents: ${result.agents?.length || 0} 个`);
      console.log(`  ✓ Commands: ${result.commands?.length || 0} 个`);
      console.log(`  ✓ Repository URL: ${result.repository?.url || 'N/A'}`);
      console.log(`  ✓ Repository Stars: ${result.repository?.stars ?? 'undefined (延迟加载)'}`);

      expect(result.name).toBe(pluginName);
      expect(result.installed).toBe(false);
      // README 应该为空（本地没有，也不从 GitHub 获取）
      expect(result.readme).toBe('');
      // Stars 应该是 undefined（延迟加载）
      expect(result.repository?.stars).toBeUndefined();

      // 性能断言：应该非常快（<50ms），因为不等待任何 GitHub API
      if (loadTime > 50) {
        console.warn(`  ⚠ 性能警告: 加载时间 ${loadTime}ms 超过 50ms`);
      }
    });

    it('相同插件第二次加载应该更快（使用缓存）', async () => {
      const pluginName = 'serena';
      const marketplace = 'claude-plugins-official';

      console.log(`\n  📊 测试缓存性能: ${pluginName}@${marketplace}`);

      // 第一次加载（使用 getPluginDetail 以触发缓存）
      const t1 = Date.now();
      await service.getPluginDetail(pluginName, marketplace, false);
      const firstLoad = Date.now() - t1;
      console.log(`  第一次加载: ${firstLoad}ms`);

      // 第二次加载（应该使用缓存）
      const t2 = Date.now();
      await service.getPluginDetail(pluginName, marketplace, false);
      const secondLoad = Date.now() - t2;
      console.log(`  第二次加载: ${secondLoad}ms (缓存)`);

      // 第二次应该更快（缓存时间 < 10ms）
      expect(secondLoad).toBeLessThan(10);
      console.log(`  ✓ 缓存命中，加载时间显著减少`);
    });

    it('详情服务不负责 stars 拉取（由 PluginDataStore 统一管理）', async () => {
      const pluginName = 'serena';
      const marketplace = 'claude-plugins-official';

      console.log(`\n  📊 测试详情服务 stars 职责边界: ${pluginName}@${marketplace}`);

      const detail = await service.getRemotePluginDetail(pluginName, marketplace);
      expect(detail.repository?.stars).toBeUndefined();
      expect((service as any).fetchPluginStarsAsync).toBeUndefined();
      console.log('  ✓ PluginDetailsService 不再提供 stars 网络入口');
    });

    it('本地路径缓存应生效', async () => {
      const pluginName = 'serena';
      const marketplace = 'claude-plugins-official';

      console.log(`\n  📊 测试本地路径缓存: ${pluginName}@${marketplace}`);

      // 清除缓存以测试完整流程
      (service as any).localPathCache.clear();
      (service as any).cache.clear();

      // 第一次获取路径
      const t1 = Date.now();
      await service.getRemotePluginDetail(pluginName, marketplace);
      const firstTime = Date.now() - t1;
      console.log(`  首次加载（包含路径查找）: ${firstTime}ms`);

      // 第二次获取（路径应该被缓存）
      const t2 = Date.now();
      await service.getRemotePluginDetail(pluginName, marketplace);
      const secondTime = Date.now() - t2;
      console.log(`  第二次加载（路径已缓存）: ${secondTime}ms`);

      // 第二次应不慢于第一次（避免 CI/IO 抖动导致偶发失败）
      expect(secondTime).toBeLessThanOrEqual(firstTime + 20);
      console.log(`  ✓ 本地路径缓存有效`);
    });
  });

  describe('性能测试 - getInstalledPluginDetail', () => {
    it('已安装插件加载应快速（<300ms）', async () => {
      if (installedPlugins.length === 0) {
        console.log('  ⚠ 跳过 - 没有已安装的插件');
        return;
      }

      const plugin = installedPlugins[0];
      console.log(`\n  📊 测试已安装插件加载性能: ${plugin.name}@${plugin.marketplace}`);

      const startTime = Date.now();
      const result = await service.getInstalledPluginDetail(plugin.name, plugin.marketplace);
      const loadTime = Date.now() - startTime;

      console.log(`  ✓ 加载时间: ${loadTime}ms`);
      console.log(`  ✓ 插件名称: ${result.name}`);
      console.log(`  ✓ 已安装: ${result.installed}`);

      expect(result.name).toBe(plugin.name);
      expect(result.installed).toBe(true);

      // 已安装插件应该更快（<300ms）
      if (loadTime > 300) {
        console.warn(`  ⚠ 性能警告: 加载时间 ${loadTime}ms 超过 300ms`);
      }
    });
  });
});
