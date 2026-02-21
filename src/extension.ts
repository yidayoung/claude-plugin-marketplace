import * as vscode from 'vscode';

// 导入插件市场相关
import { PluginScope } from './pluginMarketplace/types';
import { PluginDetailsPanel } from './pluginMarketplace/webview/PluginDetailsPanel';
import { SidebarWebviewViewProvider } from './pluginMarketplace/webview/SidebarWebviewView';
import { PluginDataStore } from './pluginMarketplace/data/PluginDataStore';

// 插件市场全局变量
let sidebarProvider: SidebarWebviewViewProvider | undefined;
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

  // 初始化数据存储（统一的数据管理单例）
  dataStore = new PluginDataStore(context);
  await dataStore.initialize();

  // 将 dataStore 存储在 context 中，供其他组件使用
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.getDataStore', () => dataStore)
  );

  // 检查 Claude Code 是否安装
  dataStore.checkClaudeInstalled().then((installed: boolean) => {
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

  // 注册侧边栏 WebviewViewProvider（不再需要 PluginDataService）
  sidebarProvider = new SidebarWebviewViewProvider(context.extensionUri, dataStore!);
  vscode.window.registerWebviewViewProvider('claudePluginMarketplaceSidebar', sidebarProvider);

  // 注册命令
  registerPluginMarketplaceCommands(context, sidebarProvider, dataStore!);

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
 * 所有数据操作通过 PluginDataStore 统一管理
 */
function registerPluginMarketplaceCommands(
  context: vscode.ExtensionContext,
  sidebarProvider: SidebarWebviewViewProvider,
  dataStore: PluginDataStore
) {
  // 刷新命令
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.refresh', () => {
      sidebarProvider.refreshData();
    })
  );

  // 添加市场命令（使用 PluginDataStore）
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.addMarketplace', async () => {
      const source = await vscode.window.showInputBox({
        prompt: '输入市场来源',
        placeHolder: 'owner/repo 或 https://github.com/owner/repo',
        value: ''
      });

      if (source) {
        const result = await dataStore.addMarketplace(source);
        if (result.success) {
          vscode.window.showInformationMessage(`✅ 市场 ${result.marketplaceName || source} 添加成功`);
        } else {
          vscode.window.showErrorMessage(`❌ 添加市场失败: ${result.error}`);
        }
      }
    })
  );

  // 删除市场命令（使用 PluginDataStore）
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
      const result = await dataStore.removeMarketplace(marketplaceName);
      if (result.success) {
        vscode.window.showInformationMessage(`✅ 市场 ${marketplaceName} 删除成功`);
      } else {
        vscode.window.showErrorMessage(`❌ 删除市场失败: ${result.error}`);
      }
    }
  })
  );

  // 刷新市场命令（使用 PluginDataStore）
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.refreshMarketplace', async (marketplaceName: string) => {
      if (!marketplaceName) {
        return;
      }

      const result = await dataStore.updateMarketplace(marketplaceName);
      if (result.success) {
        vscode.window.showInformationMessage(`✅ 市场 ${marketplaceName} 更新成功`);
      } else {
        vscode.window.showErrorMessage(`❌ 更新市场失败: ${result.error}`);
      }
    })
  );

  // 安装插件命令（使用 PluginDataStore）
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.installPlugin', async (item: { name?: string; marketplace?: string; plugin?: { name?: string; marketplace?: string } }) => {
      const pluginName = item.name || item.plugin?.name;
      const marketplaceName = item.marketplace || item.plugin?.marketplace;

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
        try {
          await dataStore.installPlugin(pluginName, marketplaceName, scope.label as PluginScope);
          vscode.window.showInformationMessage(`✅ 插件 ${pluginName} 安装成功`);
        } catch (error: any) {
          vscode.window.showErrorMessage(`❌ 安装失败: ${error.message || '未知错误'}`);
        }
      }
    })
  );

  // 卸载插件命令（使用 PluginDataStore）
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.uninstallPlugin', async (item: { name?: string; plugin?: { name?: string } }) => {
      const pluginName = item.name || item.plugin?.name;

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
        try {
          await dataStore.uninstallPlugin(pluginName);
          vscode.window.showInformationMessage(`✅ 插件 ${pluginName} 卸载成功`);
        } catch (error: any) {
          vscode.window.showErrorMessage(`❌ 卸载失败: ${error.message || '未知错误'}`);
        }
      }
    })
  );

  // 启用插件命令（使用 PluginDataStore）
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.enablePlugin', async (item: { name?: string; marketplace?: string; plugin?: { name?: string; marketplace?: string } }) => {
      const pluginName = item.name || item.plugin?.name;
      const marketplaceName = item.marketplace || item.plugin?.marketplace;

      if (!pluginName || !marketplaceName) {
        return;
      }

      try {
        await dataStore.enablePlugin(pluginName, marketplaceName);
        vscode.window.showInformationMessage(`✅ 插件 ${pluginName} 已启用`);
      } catch (error: any) {
        vscode.window.showErrorMessage(`❌ 启用失败: ${error.message || '未知错误'}`);
      }
    })
  );

  // 禁用插件命令（使用 PluginDataStore）
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.disablePlugin', async (item: { name?: string; marketplace?: string; plugin?: { name?: string; marketplace?: string } }) => {
      const pluginName = item.name || item.plugin?.name;
      const marketplaceName = item.marketplace || item.plugin?.marketplace;

      if (!pluginName || !marketplaceName) {
        return;
      }

      try {
        await dataStore.disablePlugin(pluginName, marketplaceName);
        vscode.window.showInformationMessage(`✅ 插件 ${pluginName} 已禁用`);
      } catch (error: any) {
        vscode.window.showErrorMessage(`❌ 禁用失败: ${error.message || '未知错误'}`);
      }
    })
  );

  // 更新插件命令（使用 PluginDataStore）
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.updatePlugin', async (item: { name?: string; marketplace?: string; plugin?: { name?: string; marketplace?: string } }) => {
      const pluginName = item.name || item.plugin?.name;
      const marketplaceName = item.marketplace || item.plugin?.marketplace;

      if (!pluginName || !marketplaceName) {
        return;
      }

      try {
        // 先卸载再安装
        await dataStore.uninstallPlugin(pluginName);
        await dataStore.installPlugin(pluginName, marketplaceName, 'user');
        vscode.window.showInformationMessage(`✅ 插件 ${pluginName} 更新成功`);
      } catch (error: any) {
        vscode.window.showErrorMessage(`❌ 更新失败: ${error.message || '未知错误'}`);
      }
    })
  );

  // 查看插件详情命令 - 打开详情 Panel
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.showPluginDetails', async (item: { name?: string; marketplace?: string; plugin?: { name?: string; marketplace?: string; installed?: boolean } }) => {
      const pluginName = item.name || item.plugin?.name;
      const marketplaceName = item.marketplace || item.plugin?.marketplace;
      const isInstalled = item.plugin?.installed || false;

      if (!pluginName || !marketplaceName) {
        return;
      }

      // 打开详情 Panel
      await PluginDetailsPanel.createOrShow(
        context.extensionUri,
        context,
        dataStore!,
        pluginName,
        marketplaceName,
        isInstalled
      );
    })
  );

}
