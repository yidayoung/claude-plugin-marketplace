// vscode-extension/src/pluginMarketplace/webview/messages/handlers.ts

import * as vscode from 'vscode';
import { PluginDataStore } from '../../data/PluginDataStore';
import {
  WebviewMessage,
  ExtensionMessage,
  InstallPluginPayload,
  UninstallPluginPayload,
  EnablePluginPayload,
  DisablePluginPayload,
  UpdatePluginPayload,
  GetPluginsPayload,
  PluginsPayload,
  PluginData,
  AddMarketplacePayload,
  RemoveMarketplacePayload,
  UpdateMarketplacePayload,
  OpenDetailsPayload,
  ExecuteCommandPayload
} from './types';
import { logger } from '../../../shared/utils/logger';

/**
 * Webview 消息处理器
 * 负责处理 Webview 和 Extension 之间的所有消息通信
 * 所有数据操作通过 PluginDataStore 单例进行
 */
export class MessageHandler {
  constructor(
    private webview: vscode.Webview,
    private dataStore: PluginDataStore,
    private extensionUri: vscode.Uri
  ) {}

  /**
   * 消息路由 - 根据消息类型分发到具体的处理方法
   */
  async handleMessage(message: WebviewMessage): Promise<void> {
    logger.debug('收到消息:', message.type, message.payload);
    try {
      switch (message.type) {
        case 'getPlugins':
          await this.handleGetPlugins(message.payload as GetPluginsPayload);
          break;

        case 'installPlugin':
          await this.handleInstallPlugin(message.payload as InstallPluginPayload);
          break;

        case 'uninstallPlugin':
          await this.handleUninstallPlugin(message.payload as UninstallPluginPayload);
          break;

        case 'enablePlugin':
          await this.handleEnablePlugin(message.payload as EnablePluginPayload);
          break;

        case 'disablePlugin':
          await this.handleDisablePlugin(message.payload as DisablePluginPayload);
          break;

        case 'updatePlugin':
          await this.handleUpdatePlugin(message.payload as UpdatePluginPayload);
          break;

        case 'openDetails':
          await this.handleOpenDetails(message.payload as OpenDetailsPayload);
          break;

        case 'addMarketplace':
          await this.handleAddMarketplace(message.payload as AddMarketplacePayload);
          break;

        case 'removeMarketplace':
          await this.handleRemoveMarketplace(message.payload as RemoveMarketplacePayload);
          break;

        case 'updateMarketplace':
          await this.handleUpdateMarketplace(message.payload as UpdateMarketplacePayload);
          break;

        case 'refresh':
          await this.handleRefresh();
          break;

        case 'executeCommand':
          await this.handleExecuteCommand(message.payload as ExecuteCommandPayload);
          break;

        default:
          this.sendMessage({
            type: 'error',
            payload: { message: `Unknown message type: ${message.type}` }
          });
      }
    } catch (error: any) {
      this.sendMessage({
        type: 'error',
        payload: { message: error.message || 'Unknown error' }
      });
    }
  }

  /**
   * 获取插件列表
   * 支持关键字、状态、市场等筛选条件
   * 使用 PluginDataStore 统一数据源
   */
  private async handleGetPlugins(payload: GetPluginsPayload = {}): Promise<void> {
    try {
      // 从 PluginDataStore 获取插件列表（已经包含安装状态）
      const allPlugins = this.dataStore.getPluginList();
      const marketplaces = this.dataStore.getMarketplaces();

      logger.debug(`获取插件列表 - 总数: ${allPlugins.length}, 已安装: ${allPlugins.filter(p => p.installed).length}`);

      // 筛选插件
      let filteredPlugins = allPlugins;

      // 关键字筛选
      if (payload.filter?.keyword) {
        const keyword = payload.filter.keyword.toLowerCase();
        filteredPlugins = filteredPlugins.filter(plugin =>
          plugin.name.toLowerCase().includes(keyword) ||
          plugin.description.toLowerCase().includes(keyword)
        );
      }

      // 市场筛选
      if (payload.filter?.marketplace && payload.filter.marketplace !== 'all') {
        filteredPlugins = filteredPlugins.filter(plugin => plugin.marketplace === payload.filter?.marketplace);
      }

      // 状态筛选
      if (payload.filter?.status && payload.filter.status !== 'all') {
        filteredPlugins = filteredPlugins.filter(plugin => {
          switch (payload.filter?.status) {
            case 'installed':
              return plugin.installed;
            case 'not-installed':
              return !plugin.installed;
            case 'upgradable':
              // TODO: 实现版本比较逻辑
              return false;
            default:
              return true;
          }
        });
      }

      // 转换为 UI 格式
      const pluginData: PluginData[] = filteredPlugins.map(p => ({
        name: p.name,
        description: p.description,
        version: p.version,
        author: p.author,
        homepage: p.homepage,
        category: p.category,
        marketplace: p.marketplace,
        installed: p.installed,
        enabled: p.enabled,
        scope: p.scope,
        updateAvailable: false // TODO: 实现版本比较
      }));

      const responsePayload: PluginsPayload = {
        plugins: pluginData,
        marketplaces: ['all', ...marketplaces.map(m => m.name)]
      };

      this.sendMessage({
        type: 'plugins',
        payload: responsePayload
      });
    } catch (error: any) {
      this.sendMessage({
        type: 'error',
        payload: { message: `获取插件列表失败: ${error.message}` }
      });
    }
  }

  /**
   * 安装插件
   * 显示进度通知，安装完成后发送结果消息
   */
  private async handleInstallPlugin(payload: InstallPluginPayload): Promise<void> {
    const { pluginName, marketplace, scope } = payload;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `正在安装插件 ${pluginName}...`,
        cancellable: false
      },
      async () => {
        try {
          // 使用 PluginDataStore 安装插件（会自动发射事件）
          await this.dataStore.installPlugin(pluginName, marketplace, scope as 'user' | 'project');

          this.sendMessage({
            type: 'installSuccess',
            payload: { pluginName, scope }
          });

          vscode.window.showInformationMessage(`✅ 插件 ${pluginName} 安装成功`);
        } catch (error: any) {
          const errorMessage = error.message || '未知错误';
          this.sendMessage({
            type: 'installError',
            payload: { pluginName, error: errorMessage }
          });

          vscode.window.showErrorMessage(`❌ 插件 ${pluginName} 安装失败: ${errorMessage}`);
          throw error;
        }
      }
    );
  }

  /**
   * 卸载插件
   * 显示确认对话框，确认后显示进度并执行卸载
   */
  private async handleUninstallPlugin(payload: UninstallPluginPayload): Promise<void> {
    const { pluginName } = payload;

    // 显示确认对话框
    const confirm = await vscode.window.showWarningMessage(
      `确定要卸载插件 ${pluginName} 吗？`,
      { modal: true },
      '确定',
      '取消'
    );

    if (confirm !== '确定') {
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `正在卸载插件 ${pluginName}...`,
        cancellable: false
      },
      async () => {
        try {
          // 使用 PluginDataStore 卸载插件（会自动发射事件）
          await this.dataStore.uninstallPlugin(pluginName);

          this.sendMessage({
            type: 'uninstallSuccess',
            payload: { pluginName }
          });

          vscode.window.showInformationMessage(`✅ 插件 ${pluginName} 卸载成功`);
        } catch (error: any) {
          const errorMessage = error.message || '未知错误';
          this.sendMessage({
            type: 'uninstallError',
            payload: { pluginName, error: errorMessage }
          });

          vscode.window.showErrorMessage(`❌ 插件 ${pluginName} 卸载失败: ${errorMessage}`);
          throw error;
        }
      }
    );
  }

  /**
   * 启用插件
   */
  private async handleEnablePlugin(payload: EnablePluginPayload): Promise<void> {
    const { pluginName, marketplace } = payload;

    try {
      // 使用 PluginDataStore 启用插件（会自动发射事件）
      await this.dataStore.enablePlugin(pluginName, marketplace);

      this.sendMessage({
        type: 'enableSuccess',
        payload: { pluginName, marketplace }
      });

      vscode.window.showInformationMessage(`✅ 插件 ${pluginName} 已启用`);
    } catch (error: any) {
      const errorMessage = error.message || '未知错误';
      this.sendMessage({
        type: 'enableError',
        payload: { pluginName, error: errorMessage }
      });

      vscode.window.showErrorMessage(`❌ 插件 ${pluginName} 启用失败: ${errorMessage}`);
    }
  }

  /**
   * 禁用插件
   */
  private async handleDisablePlugin(payload: DisablePluginPayload): Promise<void> {
    const { pluginName, marketplace } = payload;

    try {
      // 使用 PluginDataStore 禁用插件（会自动发射事件）
      await this.dataStore.disablePlugin(pluginName, marketplace);

      this.sendMessage({
        type: 'disableSuccess',
        payload: { pluginName, marketplace }
      });

      vscode.window.showInformationMessage(`✅ 插件 ${pluginName} 已禁用`);
    } catch (error: any) {
      const errorMessage = error.message || '未知错误';
      this.sendMessage({
        type: 'disableError',
        payload: { pluginName, error: errorMessage }
      });

      vscode.window.showErrorMessage(`❌ 插件 ${pluginName} 禁用失败: ${errorMessage}`);
    }
  }

  /**
   * 添加市场
   * 使用 PluginDataStore 统一管理，会自动触发 MarketplaceChange 事件
   */
  private async handleAddMarketplace(payload: AddMarketplacePayload): Promise<void> {
    const { source } = payload;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `正在添加市场 ${source}...`,
        cancellable: false
      },
      async () => {
        try {
          // 使用 PluginDataStore 添加市场（会自动发射事件）
          const result = await this.dataStore.addMarketplace(source);

          if (result.success) {
            this.sendMessage({
              type: 'marketplaceSuccess',
              payload: { action: 'add', source, name: result.marketplaceName }
            });

            vscode.window.showInformationMessage(`✅ 市场 ${result.marketplaceName || source} 添加成功`);
          } else {
            this.sendMessage({
              type: 'marketplaceError',
              payload: { action: 'add', error: result.error || '添加失败' }
            });

            vscode.window.showErrorMessage(`❌ 市场 ${source} 添加失败: ${result.error}`);
          }
        } catch (error: any) {
          const errorMessage = error.message || '未知错误';
          this.sendMessage({
            type: 'marketplaceError',
            payload: { action: 'add', error: errorMessage }
          });

          vscode.window.showErrorMessage(`❌ 市场 ${source} 添加失败: ${errorMessage}`);
        }
      }
    );
  }

  /**
   * 删除市场
   * 使用 PluginDataStore 统一管理，会自动触发 MarketplaceChange 事件
   */
  private async handleRemoveMarketplace(payload: RemoveMarketplacePayload): Promise<void> {
    const { name } = payload;

    // 显示确认对话框
    const confirm = await vscode.window.showWarningMessage(
      `确定要删除市场 ${name} 吗？`,
      { modal: true },
      '确定',
      '取消'
    );

    if (confirm !== '确定') {
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `正在删除市场 ${name}...`,
        cancellable: false
      },
      async () => {
        try {
          // 使用 PluginDataStore 删除市场（会自动发射事件）
          const result = await this.dataStore.removeMarketplace(name);

          if (result.success) {
            this.sendMessage({
              type: 'marketplaceSuccess',
              payload: { action: 'remove', name }
            });

            vscode.window.showInformationMessage(`✅ 市场 ${name} 删除成功`);
          } else {
            this.sendMessage({
              type: 'marketplaceError',
              payload: { action: 'remove', error: result.error || '删除失败' }
            });

            vscode.window.showErrorMessage(`❌ 市场 ${name} 删除失败: ${result.error}`);
          }
        } catch (error: any) {
          const errorMessage = error.message || '未知错误';
          this.sendMessage({
            type: 'marketplaceError',
            payload: { action: 'remove', error: errorMessage }
          });

          vscode.window.showErrorMessage(`❌ 市场 ${name} 删除失败: ${errorMessage}`);
        }
      }
    );
  }

  /**
   * 更新市场
   * 使用 PluginDataStore 统一管理，会自动触发 MarketplaceChange 事件
   */
  private async handleUpdateMarketplace(payload: UpdateMarketplacePayload): Promise<void> {
    const { name } = payload;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `正在更新市场 ${name}...`,
        cancellable: false
      },
      async () => {
        try {
          // 使用 PluginDataStore 更新市场（会自动发射事件）
          const result = await this.dataStore.updateMarketplace(name);

          if (result.success) {
            this.sendMessage({
              type: 'marketplaceSuccess',
              payload: { action: 'update', name }
            });

            vscode.window.showInformationMessage(`✅ 市场 ${name} 更新成功`);
          } else {
            this.sendMessage({
              type: 'marketplaceError',
              payload: { action: 'update', error: result.error || '更新失败' }
            });

            vscode.window.showErrorMessage(`❌ 市场 ${name} 更新失败: ${result.error}`);
          }
        } catch (error: any) {
          const errorMessage = error.message || '未知错误';
          this.sendMessage({
            type: 'marketplaceError',
            payload: { action: 'update', error: errorMessage }
          });

          vscode.window.showErrorMessage(`❌ 市场 ${name} 更新失败: ${errorMessage}`);
        }
      }
    );
  }

  /**
   * 刷新插件列表
   * 直接重新获取数据，不再需要清除缓存
   */
  private async handleRefresh(): Promise<void> {
    try {
      await this.handleGetPlugins({});
    } catch (error: any) {
      this.sendMessage({
        type: 'error',
        payload: { message: `刷新失败: ${error.message}` }
      });
    }
  }

  /**
   * 更新插件
   * 先卸载再安装最新版本
   * 使用 PluginDataStore 统一管理，会自动触发事件
   */
  private async handleUpdatePlugin(payload: UpdatePluginPayload): Promise<void> {
    const { pluginName, marketplace } = payload;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `正在更新插件 ${pluginName}...`,
        cancellable: false
      },
      async () => {
        try {
          // 先卸载
          await this.dataStore.uninstallPlugin(pluginName);

          // 再安装
          await this.dataStore.installPlugin(pluginName, marketplace, 'user');

          this.sendMessage({
            type: 'installSuccess',
            payload: { pluginName, scope: 'user' }
          });

          vscode.window.showInformationMessage(`✅ 插件 ${pluginName} 更新成功`);
        } catch (error: any) {
          const errorMessage = error.message || '未知错误';
          this.sendMessage({
            type: 'installError',
            payload: { pluginName, error: errorMessage }
          });

          vscode.window.showErrorMessage(`❌ 插件 ${pluginName} 更新失败: ${errorMessage}`);
          throw error;
        }
      }
    );
  }

  /**
   * 打开插件详情页
   * 创建独立的详情 Panel
   */
  private async handleOpenDetails(payload: OpenDetailsPayload): Promise<void> {
    const { pluginName, marketplace } = payload;

    if (!this.extensionUri) {
      vscode.window.showErrorMessage('无法打开详情页：缺少扩展 URI');
      return;
    }

    try {
      // 动态导入 PluginDetailsPanel
      const { PluginDetailsPanel } = await import('../PluginDetailsPanel');

      // 从 PluginDataStore 检查插件是否已安装
      const allPlugins = this.dataStore.getPluginList();
      const plugin = allPlugins.find(p => p.name === pluginName && p.marketplace === marketplace);
      const isInstalled = plugin?.installed || false;

      // 获取扩展上下文
      const context = this.dataStore.getContext();
      if (!context) {
        vscode.window.showErrorMessage('无法打开详情页：缺少扩展上下文');
        return;
      }

      // 打开详情面板
      await PluginDetailsPanel.createOrShow(
        this.extensionUri,
        context,
        this.dataStore,
        pluginName,
        marketplace,
        isInstalled
      );
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`打开插件详情失败: ${errorMsg}`);
    }
  }

  /**
   * 执行 VSCode 命令
   */
  private async handleExecuteCommand(payload: ExecuteCommandPayload): Promise<void> {
    const { command, args } = payload;
    await vscode.commands.executeCommand(command, ...(args || []));
  }

  /**
   * 发送消息到 Webview
   */
  private sendMessage(message: ExtensionMessage): void {
    this.webview.postMessage(message);
  }
}
