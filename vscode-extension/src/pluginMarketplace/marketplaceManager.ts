import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

import { execClaudeCommand, Marketplace, Plugin, MarketplaceConfig, MarketplacePlugin } from './types';

export class MarketplaceManager {
  private context: vscode.ExtensionContext;
  private marketplaces: Map<string, Marketplace> = new Map();
  private initialized: boolean = false;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * 初始化：加载已配置的市场
   */
  async initialize(): Promise<void> {
    await this.loadMarketplacesFromCli();
    await this.loadMarketplacesFromStorage();
    this.initialized = true;
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 从 CLI 加载已配置的市场
   */
  private async loadMarketplacesFromCli(): Promise<void> {
    const result = await execClaudeCommand('plugin marketplace list --json');

    if (result.status === 'success' && result.data) {
      for (const cliMp of result.data) {
        // 转换 CLI 格式到我们的 Marketplace 接口格式
        const mp: Marketplace = {
          name: cliMp.name,
          source: this.buildSourceFromCliData(cliMp),
          type: this.detectMarketplaceTypeFromCli(cliMp)
        };
        this.marketplaces.set(mp.name, mp);
      }
    }
  }

  /**
   * 从 CLI 数据构建 source 字符串
   */
  private buildSourceFromCliData(cliMp: any): string {
    if (cliMp.source === 'github' && cliMp.repo) {
      return `https://github.com/${cliMp.repo}`;
    }
    if (cliMp.source === 'git' && cliMp.repo) {
      return cliMp.repo;
    }
    if (cliMp.source === 'local' && cliMp.installLocation) {
      return cliMp.installLocation;
    }
    // 如果有 installLocation，使用它
    if (cliMp.installLocation) {
      return cliMp.installLocation;
    }
    // 兜底：如果有 repo 字段，使用它
    if (cliMp.repo) {
      return cliMp.repo;
    }
    return '';
  }

  /**
   * 从 CLI 数据检测市场类型
   */
  private detectMarketplaceTypeFromCli(cliMp: any): Marketplace['type'] {
    if (cliMp.source === 'github' || cliMp.source?.startsWith('https://')) {
      return 'url';
    }
    if (cliMp.source === 'git' || cliMp.repo?.startsWith('git+')) {
      return 'git';
    }
    return 'local';
  }

  /**
   * 从存储加载自定义市场
   */
  private async loadMarketplacesFromStorage(): Promise<void> {
    const customMarketplaces = this.context.globalState.get<Marketplace[]>('customMarketplaces', []);

    for (const mp of customMarketplaces) {
      this.marketplaces.set(mp.name, mp);
    }
  }

  /**
   * 添加市场
   */
  async addMarketplace(name: string, source: string): Promise<void> {
    // 先通过 CLI 添加
    const result = await execClaudeCommand(`plugin marketplace add "${source}" --name "${name}"`);

    if (result.status !== 'success') {
      throw new Error(result.error || 'Failed to add marketplace');
    }

    // 添加到存储
    const newMarketplace: Marketplace = {
      name,
      source,
      type: this.detectMarketplaceType(source)
    };

    const customMarketplaces = this.context.globalState.get<Marketplace[]>('customMarketplaces', []);
    customMarketplaces.push(newMarketplace);
    await this.context.globalState.update('customMarketplaces', customMarketplaces);

    this.marketplaces.set(name, newMarketplace);
    vscode.window.showInformationMessage(`✅ 已添加市场: ${name}`);
  }

  /**
   * 移除市场
   */
  async removeMarketplace(name: string): Promise<void> {
    const result = await execClaudeCommand(`plugin marketplace remove "${name}"`);

    if (result.status !== 'success') {
      throw new Error(result.error || 'Failed to remove marketplace');
    }

    // 从存储移除
    const customMarketplaces = this.context.globalState.get<Marketplace[]>('customMarketplaces', []);
    const filtered = customMarketplaces.filter(mp => mp.name !== name);
    await this.context.globalState.update('customMarketplaces', filtered);

    this.marketplaces.delete(name);
    vscode.window.showInformationMessage(`✅ 已移除市场: ${name}`);
  }

  /**
   * 列出所有市场
   */
  listMarketplaces(): Marketplace[] {
    return Array.from(this.marketplaces.values());
  }

  /**
   * 从市场获取插件列表
   * 通过读取市场的 marketplace.yaml 文件获取可用插件
   */
  async fetchPlugins(marketplace: Marketplace): Promise<Plugin[]> {
    const config = await this.loadMarketplaceConfig(marketplace);
    if (!config || !config.plugins) {
      return [];
    }

    // 转换为 Plugin 格式
    return config.plugins.map((mp: MarketplacePlugin) => ({
      name: mp.name,
      version: mp.version,
      description: mp.description,
      author: mp.author?.name || 'Unknown',
      homepage: mp.homepage,
      marketplace: marketplace.name,
      installed: false
    }));
  }

  /**
   * 加载市场配置文件
   */
  private async loadMarketplaceConfig(marketplace: Marketplace): Promise<MarketplaceConfig | null> {
    const marketplacesDir = path.join(this.context.globalStorageUri.fsPath, 'marketplaces');
    const marketPath = path.join(marketplacesDir, marketplace.name);
    const configPath = path.join(marketPath, 'marketplace.yaml');

    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      return this.parseYaml(configContent);
    } catch (error) {
      // 如果本地文件不存在，尝试刷新市场
      await this.refreshMarketplace(marketplace);
      // 重试读取
      try {
        const configContent = await fs.readFile(configPath, 'utf-8');
        return this.parseYaml(configContent);
      } catch {
        return null;
      }
    }
  }

  /**
   * 刷新市场：从远程拉取最新数据
   */
  private async refreshMarketplace(marketplace: Marketplace): Promise<void> {
    try {
      const marketplacesDir = path.join(this.context.globalStorageUri.fsPath, 'marketplaces');
      await fs.mkdir(marketplacesDir, { recursive: true });

      const marketPath = path.join(marketplacesDir, marketplace.name);

      // 如果已存在，先更新
      try {
        await fs.access(marketPath);
        await execAsync(`git -C "${marketPath}" pull`, { timeout: 30000 });
      } catch {
        // 不存在，克隆
        const repoUrl = this.getGitUrl(marketplace);
        await execAsync(`git clone "${repoUrl}" "${marketPath}"`, { timeout: 60000 });
      }
    } catch (error) {
      console.error(`Failed to refresh marketplace ${marketplace.name}:`, error);
    }
  }

  /**
   * 获取市场的 Git URL
   */
  private getGitUrl(marketplace: Marketplace): string {
    if (marketplace.source.startsWith('http://') || marketplace.source.startsWith('https://')) {
      return marketplace.source;
    }
    return marketplace.source;
  }

  /**
   * 简单的 YAML 解析器
   * 由于不想引入 heavy 依赖，这里实现一个简单的解析
   */
  private parseYaml(content: string): MarketplaceConfig | null {
    try {
      // 简单的 YAML 到 JSON 转换（针对 marketplace.yaml 格式）
      const lines = content.split('\n');
      const result: any = {};
      const plugins: any[] = [];
      let currentPlugin: any = null;
      let inPlugins = false;

      for (const line of lines) {
        const trimmed = line.trim();

        // 跳过注释和空行
        if (!trimmed || trimmed.startsWith('#')) continue;

        // 解析根级字段
        const rootMatch = trimmed.match(/^([a-zA-Z_]+):\s*(.*)$/);
        if (rootMatch && !inPlugins) {
          const key = rootMatch[1];
          const value = rootMatch[2].trim();

          if (key === 'plugins') {
            inPlugins = true;
            continue;
          }

          if (value.startsWith('"') || value.startsWith("'")) {
            result[key] = value.slice(1, -1);
          } else if (value === 'true' || value === 'false') {
            result[key] = value === 'true';
          } else if (!isNaN(Number(value))) {
            result[key] = Number(value);
          } else {
            result[key] = value;
          }
          continue;
        }

        // 解析插件字段
        if (inPlugins) {
          const indent = line.search(/\S/);
          if (indent <= 2) {
            // 插件结束
            if (currentPlugin) {
              plugins.push(currentPlugin);
              currentPlugin = null;
            }
            inPlugins = false;
          }

          const pluginMatch = trimmed.match(/^([a-zA-Z_]+):\s*(.*)$/);
          if (pluginMatch) {
            if (!currentPlugin) {
              currentPlugin = {};
            }
            const key = pluginMatch[1];
            let value = pluginMatch[2].trim();

            // 处理引用类型
            if (value.startsWith('"') || value.startsWith("'")) {
              value = value.slice(1, -1);
            }

            currentPlugin[key] = value;
          }
        }
      }

      // 添加最后一个插件
      if (currentPlugin) {
        plugins.push(currentPlugin);
      }

      result.plugins = plugins;
      return result;
    } catch (error) {
      console.error('Failed to parse YAML:', error);
      return null;
    }
  }

  /**
   * 检测市场类型
   */
  private detectMarketplaceType(source: string): Marketplace['type'] {
    if (source.startsWith('http://') || source.startsWith('https://')) {
      return 'url';
    }
    if (source.startsWith('git+')) {
      return 'git';
    }
    return 'local';
  }
}
