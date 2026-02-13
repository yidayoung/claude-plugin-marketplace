import * as vscode from 'vscode';

// 导入插件市场相关
import { PluginManager } from './pluginMarketplace/pluginManager';
import { MarketplaceManager } from './pluginMarketplace/marketplaceManager';
import { PluginTreeProvider } from './pluginMarketplace/pluginTreeProvider';
import { PluginTreeItem } from './pluginMarketplace/types';
import { PluginMarketplacePanel } from './pluginMarketplace/webview/PluginMarketplacePanel';
import { PluginDataService } from './pluginMarketplace/webview/services/PluginDataService';

// 插件市场全局变量
let pluginManager: PluginManager | undefined;
let marketplaceManager: MarketplaceManager | undefined;
let pluginTreeProvider: PluginTreeProvider | undefined;

/**
 * 扩展激活入口
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('[Claude Plugin Marketplace] Extension is activating...');

  // 获取工作区根目录
  const workspaceRoot = vscode.workspace.rootPath || '';

  if (!workspaceRoot) {
    console.warn('[Claude Plugin Marketplace] No workspace folder found');
    vscode.window.showWarningMessage(
      'Claude Plugin Marketplace: Please open a workspace folder to use the Plugin Marketplace'
    );
  }

  // ========== 初始化插件市场 ==========

  pluginManager = new PluginManager(context);
  marketplaceManager = new MarketplaceManager(context);

  // 检查 Claude Code 是否安装
  pluginManager.checkClaudeInstalled().then((installed: boolean) => {
    if (!installed) {
      vscode.window.showWarningMessage(
        '未检测到 Claude Code CLI，插件市场功能将不可用。请安装 Claude Code: https://claude.ai/download',
        '下载'
      ).then(action => {
        if (action === '下载') {
          vscode.env.openExternal(vscode.Uri.parse('https://claude.ai/download'));
        }
      });
    }
  });

  // 初始化市场管理器
  marketplaceManager.initialize().then(() => {
    // 确保 pluginManager 和 marketplaceManager 已初始化
    if (!pluginManager || !marketplaceManager) {
      console.error('[Claude Plugin Marketplace] Failed to initialize plugin marketplace managers');
      return;
    }

    // 注册 TreeDataProvider
    pluginTreeProvider = new PluginTreeProvider(pluginManager, marketplaceManager);
    vscode.window.registerTreeDataProvider('claudePluginMarketplace', pluginTreeProvider);

    // 创建数据服务实例
    const dataService = new PluginDataService(context);

    // 注册打开插件市场命令
    const openMarketplaceCommand = vscode.commands.registerCommand(
      'claudePluginMarketplace.open',
      () => {
        PluginMarketplacePanel.createOrShow(context.extensionUri, dataService);
      }
    );
    context.subscriptions.push(openMarketplaceCommand);

    // 注册命令
    registerPluginMarketplaceCommands(context, pluginManager, marketplaceManager, pluginTreeProvider);

    console.log('[Claude Plugin Marketplace] Plugin Marketplace initialized');
  });

  console.log('[Claude Plugin Marketplace] Extension activated successfully');
}

/**
 * 扩展停用入口
 */
export function deactivate(): void {
  console.log('[Claude Plugin Marketplace] Extension deactivated');
  // Managers are automatically cleaned up by VS Code
}

/**
 * 注册插件市场相关命令
 */
function registerPluginMarketplaceCommands(
  context: vscode.ExtensionContext,
  pluginManager: PluginManager,
  marketplaceManager: MarketplaceManager,
  treeProvider: PluginTreeProvider
) {
  // 刷新命令
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.refresh', () => {
      treeProvider.refresh();
    })
  );

  // 添加市场命令
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.addMarketplace', async () => {
      const name = await vscode.window.showInputBox({
        prompt: '输入市场名称',
        placeHolder: '例如: 内部市场'
      });

      if (!name) {
        return;
      }

      const source = await vscode.window.showInputBox({
        prompt: '输入市场来源（URL/Git 仓库/本地路径）',
        placeHolder: 'https://github.com/company/marketplace'
      });

      if (source) {
        await marketplaceManager.addMarketplace(name, source);
        treeProvider.refresh();
      }
    })
  );

  // 删除市场命令
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.removeMarketplace', async (marketplaceName: string) => {
      const confirm = await vscode.window.showWarningMessage(
        `确认删除市场 "${marketplaceName}"?`,
        '确认',
        '取消'
      );

      if (confirm === '确认') {
        await marketplaceManager.removeMarketplace(marketplaceName);
        treeProvider.refresh();
      }
    })
  );

  // 刷新市场命令
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.refreshMarketplace', async (marketplaceName: string) => {
      // Re-initialize the marketplace to refresh it
      await marketplaceManager.initialize();
      treeProvider.refresh();
    })
  );

  // 安装插件命令
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.installPlugin', async (item: PluginTreeItem) => {
      if (item.type === 'available-plugin' && item.data) {
        const { plugin, marketplace } = item.data;
        await pluginManager.installPlugin(plugin.name, marketplace);
        treeProvider.refresh();
      }
    })
  );

  // 卸载插件命令
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.uninstallPlugin', async (item: PluginTreeItem) => {
      if (item.type === 'installed-plugin' && item.data) {
        const confirm = await vscode.window.showWarningMessage(
          `确认卸载插件 "${item.data.plugin.name}"?`,
          '确认',
          '取消'
        );

        if (confirm === '确认') {
          await pluginManager.uninstallPlugin(item.data.plugin.name);
          treeProvider.refresh();
        }
      }
    })
  );

  // 更新插件命令
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.updatePlugin', async (item: PluginTreeItem) => {
      if (item.type === 'installed-plugin' && item.data) {
        await pluginManager.updatePlugin(item.data.plugin.name);
        treeProvider.refresh();
      }
    })
  );

  // 查看插件详情命令
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.showPluginDetails', async (item: PluginTreeItem) => {
      if (item.data && item.data.plugin) {
        const plugin = item.data.plugin;
        const details = `
名称: ${plugin.name}
版本: ${plugin.version}
描述: ${plugin.description}
作者: ${plugin.author}
仓库: ${plugin.repository}
`;

        vscode.window.showInformationMessage(details, '关闭');
      }
    })
  );

  // 搜索插件命令
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.searchPlugins', async () => {
      const searchTerm = await vscode.window.showInputBox({
        prompt: '搜索插件',
        placeHolder: '输入插件名称或关键词'
      });

      if (searchTerm) {
        // TODO: 实现搜索功能
        vscode.window.showInformationMessage(`搜索功能即将推出: ${searchTerm}`);
      }
    })
  );
}
