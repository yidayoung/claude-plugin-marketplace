import * as vscode from 'vscode';
import { execClaudeCommand, Marketplace, Plugin } from './types';

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
   * 注意：当前实现返回已安装的插件列表
   * TODO: 实现从市场浏览可用插件的功能
   */
  async fetchPlugins(marketplace: Marketplace): Promise<Plugin[]> {
    try {
      // MVP 阶段：返回所有已安装的插件（忽略市场来源）
      // 因为 Claude Code CLI 可能不提供"从特定市场列出所有可用插件"的命令
      const result = await execClaudeCommand('plugin list --json');

      if (result.status === 'success' && result.data?.plugins) {
        return result.data.plugins.map((ip: any) => ({
          name: ip.name,
          version: ip.version,
          description: ip.description || '',
          author: ip.author || 'Unknown',
          homepage: ip.homepage,
          marketplace: marketplace.name,
          installed: true
        }));
      }

      return [];
    } catch (error) {
      vscode.window.showErrorMessage(`获取市场 ${marketplace.name} 失败: ${error}`);
      return [];
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
