import * as vscode from 'vscode';

// 导入插件市场相关
import { PluginManager } from './pluginMarketplace/pluginManager';
import { PluginTreeItem, PluginScope } from './pluginMarketplace/types';
import { PluginDetailsPanel } from './pluginMarketplace/webview/PluginDetailsPanel';
import { SidebarWebviewViewProvider } from './pluginMarketplace/webview/SidebarWebviewView';
import { PluginDataService } from './pluginMarketplace/webview/services/PluginDataService';
import { PluginDataStore } from './pluginMarketplace/data/PluginDataStore';

// 插件市场全局变量
let pluginManager: PluginManager | undefined;
let sidebarProvider: SidebarWebviewViewProvider | undefined;
let dataService: PluginDataService | undefined;
let dataStore: PluginDataStore | undefined;

/**
 * 扩展激活入口
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('[Claude Plugin Marketplace] Extension is activating...');

  // 获取工作区根目录
  const workspaceRoot = vscode.workspace.rootPath || '';

  if (!workspaceRoot) {
    console.warn('[Claude Plugin Marketplace] No workspace folder found');
    vscode.window.showWarningMessage(
      'Claude Plugin Marketplace: Please open a workspace folder to use the Plugin Marketplace',
      'OK'
    );
  }

  // ========== 初始化插件市场 ==========

  pluginManager = new PluginManager(context);

  // 初始化数据存储
  dataStore = new PluginDataStore(context);
  await dataStore.initialize();

  // 将 dataStore 存储在 context 中，供其他组件使用
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.getDataStore', () => dataStore)
  );

  dataService = new PluginDataService(context);

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

  // 注册侧边栏 WebviewViewProvider
  sidebarProvider = new SidebarWebviewViewProvider(context.extensionUri, dataService);
  vscode.window.registerWebviewViewProvider('claudePluginMarketplaceSidebar', sidebarProvider);

  // 注册命令
  registerPluginMarketplaceCommands(context, sidebarProvider, dataService);

  console.log('[Claude Plugin Marketplace] Extension activated successfully');
}

/**
 * 扩展停用入口
 */
export function deactivate(): void {
  console.log('[Claude Plugin Marketplace] Extension deactivated');
}

/**
 * 注册插件市场相关命令
 */
function registerPluginMarketplaceCommands(
  context: vscode.ExtensionContext,
  sidebarProvider: SidebarWebviewViewProvider,
  dataService: PluginDataService
) {
  // 刷新命令
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.refresh', () => {
      sidebarProvider.refreshData();
    })
  );

  // 添加市场命令
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.addMarketplace', async () => {
      const source = await vscode.window.showInputBox({
        prompt: '输入市场来源',
        placeHolder: 'owner/repo 或 https://github.com/owner/repo',
        value: ''
      });

      if (source) {
        const result = await dataService.addMarketplace(source);
        if (result.success) {
          vscode.window.showInformationMessage(`✅ 市场 ${source} 添加成功`);
          sidebarProvider.refreshData();
        } else {
          vscode.window.showErrorMessage(`❌ 添加市场失败: ${result.error}`);
        }
      }
    })
  );

  // 删除市场命令
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.removeMarketplace', async (marketplaceName: string) => {
    if (!marketplaceName) {
      return;
    }

    const confirm = await vscode.window.showWarningMessage(
      `确认删除市场 "${marketplaceName}"?`,
      { modal: true },
      '确认',
      '取消'
    );

    if (confirm === '确认') {
      const result = await dataService.removeMarketplace(marketplaceName);
      if (result.success) {
        vscode.window.showInformationMessage(`✅ 市场 ${marketplaceName} 删除成功`);
        sidebarProvider.refreshData();
      } else {
        vscode.window.showErrorMessage(`❌ 删除市场失败: ${result.error}`);
      }
    }
  })
  );

  // 刷新市场命令
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.refreshMarketplace', async (marketplaceName: string) => {
      if (!marketplaceName) {
        return;
      }

      const result = await dataService.updateMarketplace(marketplaceName);
      if (result.success) {
        vscode.window.showInformationMessage(`✅ 市场 ${marketplaceName} 更新成功`);
        sidebarProvider.refreshData();
      } else {
        vscode.window.showErrorMessage(`❌ 更新市场失败: ${result.error}`);
      }
    })
  );

  // 安装插件命令（保留用于 TreeItem 右键菜单，如果有的话）
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.installPlugin', async (item: PluginTreeItem) => {
      const pluginName = item.data?.name || item.data?.plugin?.name;
      const marketplaceName = item.data?.marketplaceName || item.data?.marketplace;

      if (!pluginName || !marketplaceName) {
        return;
      }

      // 选择安装范围
      const scopeItems = [
        { label: 'user', description: '当前用户的所有项目' },
        { label: 'project', description: '当前项目' },
        { label: 'local', description: '仅当前工作区' }
      ] as const;
      const scope = await vscode.window.showQuickPick(scopeItems, {
        placeHolder: '选择安装范围'
      });

      if (scope) {
        const result = await dataService.installPlugin(pluginName, marketplaceName, scope.label as PluginScope);
        if (result.success) {
          vscode.window.showInformationMessage(`✅ 插件 ${pluginName} 安装成功`);
          sidebarProvider.refreshData();
        } else {
          vscode.window.showErrorMessage(`❌ 安装失败: ${result.error}`);
        }
      }
    })
  );

  // 卸载插件命令
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.uninstallPlugin', async (item: PluginTreeItem) => {
      const pluginName = item.data?.name || item.data?.plugin?.name;

      if (!pluginName) {
        return;
      }

      const confirm = await vscode.window.showWarningMessage(
        `确认卸载插件 "${pluginName}"?`,
        { modal: true },
        '确认',
        '取消'
      );

      if (confirm === '确认') {
        const result = await dataService.uninstallPlugin(pluginName);
        if (result.success) {
          vscode.window.showInformationMessage(`✅ 插件 ${pluginName} 卸载成功`);
          sidebarProvider.refreshData();
        } else {
          vscode.window.showErrorMessage(`❌ 卸载失败: ${result.error}`);
        }
      }
    })
  );

  // 启用插件命令
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.enablePlugin', async (item: PluginTreeItem) => {
      const pluginName = item.data?.name || item.data?.plugin?.name;
      const marketplaceName = item.data?.marketplaceName || item.data?.marketplace || item.data?.plugin?.marketplace;

      if (!pluginName || !marketplaceName) {
        return;
      }

      const result = await dataService.enablePlugin(pluginName, marketplaceName);
      if (result.success) {
        vscode.window.showInformationMessage(`✅ 插件 ${pluginName} 已启用`);
        sidebarProvider.refreshData();
      } else {
        vscode.window.showErrorMessage(`❌ 启用失败: ${result.error}`);
      }
    })
  );

  // 禁用插件命令
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.disablePlugin', async (item: PluginTreeItem) => {
      const pluginName = item.data?.name || item.data?.plugin?.name;
      const marketplaceName = item.data?.marketplaceName || item.data?.marketplace || item.data?.plugin?.marketplace;

      if (!pluginName || !marketplaceName) {
        return;
      }

      const result = await dataService.disablePlugin(pluginName, marketplaceName);
      if (result.success) {
        vscode.window.showInformationMessage(`✅ 插件 ${pluginName} 已禁用`);
        sidebarProvider.refreshData();
      } else {
        vscode.window.showErrorMessage(`❌ 禁用失败: ${result.error}`);
      }
    })
  );

  // 更新插件命令
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.updatePlugin', async (item: PluginTreeItem) => {
      const pluginName = item.data?.name || item.data?.plugin?.name;
      const marketplaceName = item.data?.marketplaceName || item.data?.marketplace;

      if (!pluginName) {
        return;
      }

      // 先卸载再安装
      const uninstallResult = await dataService.uninstallPlugin(pluginName);
      if (!uninstallResult.success) {
        vscode.window.showErrorMessage(`❌ 更新失败: ${uninstallResult.error}`);
        return;
      }

      const installResult = await dataService.installPlugin(pluginName, marketplaceName, 'user');
      if (installResult.success) {
        vscode.window.showInformationMessage(`✅ 插件 ${pluginName} 更新成功`);
        sidebarProvider.refreshData();
      } else {
        vscode.window.showErrorMessage(`❌ 更新失败: ${installResult.error}`);
      }
    })
  );

  // 查看插件详情命令 - 打开详情 Panel
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.showPluginDetails', async (item: PluginTreeItem) => {
      const pluginName = item.data?.name || item.data?.plugin?.name;
      const marketplaceName = item.data?.marketplaceName || item.data?.marketplace;
      const isInstalled = item.data?.installed || item.data?.plugin?.installed || false;

      if (!pluginName || !marketplaceName) {
        return;
      }

      // 打开详情 Panel
      await PluginDetailsPanel.createOrShow(
        context.extensionUri,
        context,
        pluginName,
        marketplaceName,
        isInstalled
      );
    })
  );

}
