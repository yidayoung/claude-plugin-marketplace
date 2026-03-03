import * as vscode from 'vscode';

// 导入插件市场相关
import { PluginScope } from './pluginMarketplace/types';
import { PluginDetailsPanel } from './pluginMarketplace/webview/PluginDetailsPanel';
import { MarketplacePanel } from './pluginMarketplace/webview/MarketplacePanel';
import { SidebarWebviewViewProvider } from './pluginMarketplace/webview/SidebarWebviewView';
import { PluginDataStore } from './pluginMarketplace/data/PluginDataStore';
import { logger } from './shared/utils/logger';

// 插件市场全局变量
let sidebarProvider: SidebarWebviewViewProvider | undefined;
let dataStore: PluginDataStore | undefined;

/**
 * 扩展激活入口
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  logger.info('[Claude Plugin Marketplace] Extension is activating...');

  // ========== 初始化插件市场 ==========

  // 初始化数据存储（统一的数据管理单例）
  dataStore = new PluginDataStore(context);
  await dataStore.initialize();

  // 将 dataStore 存储在 context 中，供其他组件使用
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.getDataStore', () => dataStore)
  );

  // 调试命令：打印插件状态
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.debugPluginStatus', (pluginName: string, marketplace?: string) => {
      if (dataStore) {
        (dataStore as any).debugPluginStatus(pluginName, marketplace);
      }
    })
  );

  // 调试命令：打印数据存储状态
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.debugDataStore', () => {
      if (dataStore) {
        const allPlugins = (dataStore as any).getPluginList();
        const installedPlugins = allPlugins.filter((p: any) => p.installed);
        vscode.window.showInformationMessage(
          `总插件数: ${allPlugins.length}, 已安装: ${installedPlugins.length}\n` +
          `市场列表: ${(dataStore as any).getMarketplaces().map((m: any) => m.name).join(', ')}`
        );
        logger.debug('[DataStore Debug] 总插件数:', allPlugins.length);
        logger.debug('[DataStore Debug] 已安装插件:', installedPlugins.map((p: any) => `${p.name}@${p.marketplace}`));
      }
    })
  );

  // 检查 Claude Code 是否安装
  dataStore.checkClaudeInstalled().then((installed: boolean) => {
    if (!installed) {
      vscode.window.showWarningMessage(
        vscode.l10n.t('Claude Code CLI was not detected. Plugin Marketplace will be unavailable. Install Claude Code: https://claude.ai/download'),
        vscode.l10n.t('Download')
      ).then(action => {
        if (action === vscode.l10n.t('Download')) {
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

  logger.info('[Claude Plugin Marketplace] Extension activated successfully');
}

/**
 * 扩展停用入口
 */
export function deactivate(): void {
  logger.info('[Claude Plugin Marketplace] Extension deactivated');
}

/**
 * 插取插件信息
 * 从 item 对象中提取插件名称和市场名称
 */
function extractPluginInfo(item: {
  name?: string;
  marketplace?: string;
  plugin?: { name?: string; marketplace?: string };
}): { name: string; marketplace: string } | null {
  const name = item.name || item.plugin?.name;
  const marketplace = item.marketplace || item.plugin?.marketplace;

  if (!name || !marketplace) {
    return null;
  }

  return { name, marketplace };
}

/**
 * 执行插件操作并统一处理错误
 */
async function executePluginOperation<T>(
  operation: () => Promise<void>,
  successMessage: string,
  operationName: string
): Promise<void> {
  try {
    await operation();
    vscode.window.showInformationMessage(successMessage);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(
      vscode.l10n.t('{0} failed: {1}', operationName, errorMsg || vscode.l10n.t('Unknown error'))
    );
  }
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

  // 添加市场命令 - 打开市场发现 Panel
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.addMarketplace', async () => {
      await MarketplacePanel.createOrShow(
        context.extensionUri,
        context,
        dataStore!
      );
    })
  );

  // 删除市场命令（使用 PluginDataStore）
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.removeMarketplace', async (marketplaceName: string) => {
    if (!marketplaceName) {
      return;
    }

    const confirm = await vscode.window.showWarningMessage(
      vscode.l10n.t('Remove marketplace "{0}"?', marketplaceName),
      { modal: true },
      vscode.l10n.t('Confirm'),
      vscode.l10n.t('Cancel')
    );

    if (confirm === vscode.l10n.t('Confirm')) {
      const result = await dataStore.removeMarketplace(marketplaceName);
      if (result.success) {
        vscode.window.showInformationMessage(vscode.l10n.t('Market {0} removed successfully', marketplaceName));
      } else {
        vscode.window.showErrorMessage(vscode.l10n.t('Failed to remove marketplace: {0}', result.error ?? ''));
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

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: vscode.l10n.t('Updating marketplace {0}...', marketplaceName),
          cancellable: false
        },
        async () => {
          const result = await dataStore.updateMarketplace(marketplaceName);
          if (result.success) {
            vscode.window.showInformationMessage(vscode.l10n.t('Market {0} updated successfully', marketplaceName));
          } else {
            vscode.window.showErrorMessage(vscode.l10n.t('Failed to update marketplace: {0}', result.error ?? ''));
          }
        }
      );
    })
  );

  // 安装插件命令（使用 PluginDataStore）
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.installPlugin', async (item: { name?: string; marketplace?: string; plugin?: { name?: string; marketplace?: string } }) => {
      const pluginInfo = extractPluginInfo(item);
      if (!pluginInfo) {
        return;
      }

      const scopeItems = [
        { label: 'user', description: vscode.l10n.t('All projects for current user') },
        { label: 'project', description: vscode.l10n.t('Current project') },
        { label: 'local', description: vscode.l10n.t('Current workspace only') }
      ] as const;
      const scope = await vscode.window.showQuickPick(scopeItems, {
        placeHolder: vscode.l10n.t('Select install scope')
      });

      if (scope) {
        await executePluginOperation(
          () => dataStore.installPlugin(pluginInfo.name, pluginInfo.marketplace, scope.label as PluginScope),
          vscode.l10n.t('Plugin {0} installed successfully', pluginInfo.name),
          'Install'
        );
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
        vscode.l10n.t('Uninstall plugin "{0}"?', pluginName),
        { modal: true },
        vscode.l10n.t('Confirm'),
        vscode.l10n.t('Cancel')
      );

      if (confirm === vscode.l10n.t('Confirm')) {
        await executePluginOperation(
          () => dataStore.uninstallPlugin(pluginName),
          vscode.l10n.t('Plugin {0} uninstalled successfully', pluginName),
          'Uninstall'
        );
      }
    })
  );

  // 启用插件命令（使用 PluginDataStore）
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.enablePlugin', async (item: { name?: string; marketplace?: string; plugin?: { name?: string; marketplace?: string } }) => {
      const pluginInfo = extractPluginInfo(item);
      if (!pluginInfo) {
        return;
      }

      await executePluginOperation(
        () => dataStore.enablePlugin(pluginInfo.name, pluginInfo.marketplace),
        vscode.l10n.t('Plugin {0} enabled', pluginInfo.name),
        'Enable'
      );
    })
  );

  // 禁用插件命令（使用 PluginDataStore）
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.disablePlugin', async (item: { name?: string; marketplace?: string; plugin?: { name?: string; marketplace?: string } }) => {
      const pluginInfo = extractPluginInfo(item);
      if (!pluginInfo) {
        return;
      }

      await executePluginOperation(
        () => dataStore.disablePlugin(pluginInfo.name, pluginInfo.marketplace),
        vscode.l10n.t('Plugin {0} disabled', pluginInfo.name),
        'Disable'
      );
    })
  );

  // 更新插件命令（使用 PluginDataStore）
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.updatePlugin', async (item: { name?: string; marketplace?: string; plugin?: { name?: string; marketplace?: string } }) => {
      const pluginInfo = extractPluginInfo(item);
      if (!pluginInfo) {
        return;
      }

      await executePluginOperation(
        async () => {
          await dataStore.uninstallPlugin(pluginInfo.name);
          await dataStore.installPlugin(pluginInfo.name, pluginInfo.marketplace, 'user');
        },
        vscode.l10n.t('Plugin {0} updated successfully', pluginInfo.name),
        'Update'
      );
    })
  );

  // 查看插件详情命令 - 打开详情 Panel
  context.subscriptions.push(
    vscode.commands.registerCommand('claudePluginMarketplace.showPluginDetails', async (item: { name?: string; marketplace?: string; plugin?: { name?: string; marketplace?: string; installed?: boolean } }) => {
      const pluginInfo = extractPluginInfo(item);
      if (!pluginInfo) {
        return;
      }

      const isInstalled = item.plugin?.installed || false;

      // 打开详情 Panel
      await PluginDetailsPanel.createOrShow(
        context.extensionUri,
        context,
        dataStore!,
        pluginInfo.name,
        pluginInfo.marketplace,
        isInstalled
      );
    })
  );

}
