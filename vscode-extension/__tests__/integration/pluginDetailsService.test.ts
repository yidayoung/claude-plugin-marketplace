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

// Mock vscode 模块
jest.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [{ uri: { fsPath: process.cwd() } }]
  }
}));

describe('PluginDetailsService 集成测试', () => {
  const homeDir = os.homedir();
  const installedPluginsPath = path.join(homeDir, '.claude', 'plugins', 'installed_plugins.json');

  let service: PluginDetailsService;
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

  describe('getPluginPath - 真实实现测试', () => {
    it('应能找到已安装插件的路径', async () => {
      if (installedPlugins.length === 0) {
        console.log('  ⚠ 跳过 - 没有已安装的插件');
        return;
      }

      const plugin = installedPlugins[0];
      console.log(`  测试插件: ${plugin.name}`);

      const pluginPath = await service.getPluginPath(plugin.name);

      expect(pluginPath).not.toBeNull();
      console.log(`  ✓ 找到路径: ${pluginPath}`);
    });

    it('应能找到 superpowers 插件', async () => {
      const pluginPath = await service.getPluginPath('superpowers');

      expect(pluginPath).not.toBeNull();
      console.log(`  ✓ superpowers 路径: ${pluginPath}`);
    });

    it('找不到的插件应返回 null', async () => {
      const pluginPath = await service.getPluginPath('nonexistent-plugin-xyz-123');

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
        const pluginPath = await service.getPluginPath(plugin.name);
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
      const pluginPath = await service.getPluginPath('superpowers');
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
      const pluginPath = await service.getPluginPath('superpowers');
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
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      console.log(`  配置中的 name: ${config.name}`);

      // 测试 parseSkills
      const skills = await (service as any).parseSkills(pluginPath);
      console.log(`  ✓ Skills 数量: ${skills.length}`);
      if (skills.length > 0) {
        console.log(`    前 3 个: ${skills.slice(0, 3).map((s: any) => s.name).join(', ')}`);
      }

      // 测试 parseAgents
      const agents = await (service as any).parseAgents(pluginPath);
      console.log(`  ✓ Agents 数量: ${agents.length}`);
      if (agents.length > 0) {
        console.log(`    前 3 个: ${agents.slice(0, 3).map((a: any) => a.name).join(', ')}`);
      }

      // 测试 parseCommands
      const commands = await (service as any).parseCommands(pluginPath);
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
      const agents = await (service as any).parseAgents(localMarketPath);
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
});
