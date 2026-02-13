import * as vscode from 'vscode';
import { execClaudeCommand, InstalledPlugin } from './types';

export class PluginManager {
  private context: vscode.ExtensionContext;
  private installedCache: Map<string, InstalledPlugin> = new Map();

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * 检查 Claude Code 是否已安装
   */
  async checkClaudeInstalled(): Promise<boolean> {
    const result = await execClaudeCommand('--version');
    return result.status === 'success';
  }

  /**
   * 列出已安装的插件
   */
  async listInstalled(): Promise<InstalledPlugin[]> {
    const result = await execClaudeCommand('plugin list --json');

    if (result.status !== 'success') {
      throw new Error(result.error || 'Failed to list plugins');
    }

    const plugins: InstalledPlugin[] = result.data?.plugins || [];
    this.updateCache(plugins);
    return plugins;
  }

  /**
   * 安装插件
   */
  async installPlugin(pluginName: string, marketplace: string): Promise<void> {
    // 在终端显示安装过程
    const terminal = vscode.window.createTerminal('GDD 插件安装');
    terminal.sendText(`claude plugin install "${pluginName}@${marketplace}"`);
    terminal.show();

    // 等待几秒后刷新列表
    setTimeout(async () => {
      await this.listInstalled();
      terminal.dispose();
      vscode.window.showInformationMessage(`✅ 插件 ${pluginName} 安装成功`);
    }, 3000);
  }

  /**
   * 卸载插件
   */
  async uninstallPlugin(pluginName: string): Promise<void> {
    const terminal = vscode.window.createTerminal('GDD 插件卸载');
    terminal.sendText(`claude plugin uninstall "${pluginName}"`);
    terminal.show();

    setTimeout(async () => {
      await this.listInstalled();
      terminal.dispose();
      vscode.window.showInformationMessage(`✅ 插件 ${pluginName} 已卸载`);
    }, 3000);
  }

  /**
   * 更新插件
   */
  async updatePlugin(pluginName: string): Promise<void> {
    const terminal = vscode.window.createTerminal('GDD 插件更新');
    terminal.sendText(`claude plugin update "${pluginName}"`);
    terminal.show();

    setTimeout(async () => {
      await this.listInstalled();
      terminal.dispose();
      vscode.window.showInformationMessage(`✅ 插件 ${pluginName} 已更新`);
    }, 3000);
  }

  /**
   * 从缓存获取插件信息
   */
  getFromCache(pluginName: string): InstalledPlugin | undefined {
    return this.installedCache.get(pluginName);
  }

  /**
   * 更新缓存
   */
  private updateCache(plugins: InstalledPlugin[]) {
    this.installedCache.clear();
    for (const plugin of plugins) {
      this.installedCache.set(plugin.name, plugin);
    }
  }
}
