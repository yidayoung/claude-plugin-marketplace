// vscode-extension/src/pluginMarketplace/webview/messages/handlers.ts

import * as vscode from 'vscode';
import { PluginDataService } from '../services/PluginDataService';
import {
  WebviewMessage,
  ExtensionMessage,
  InstallPluginPayload,
  UninstallPluginPayload,
  GetPluginsPayload,
  PluginsPayload,
  PluginData
} from './types';

/**
 * Webview 消息处理器
 * 负责处理 Webview 和 Extension 之间的所有消息通信
 */
export class MessageHandler {
  constructor(
    private webview: vscode.Webview,
    private dataService: PluginDataService
  ) {}

  /**
   * 消息路由 - 根据消息类型分发到具体的处理方法
   */
  async handleMessage(message: WebviewMessage): Promise<void> {
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

        case 'refresh':
          await this.handleRefresh();
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
   */
  private async handleGetPlugins(payload: GetPluginsPayload = {}): Promise<void> {
    try {
      // 获取所有可用插件
      const allPlugins = await this.dataService.getAllAvailablePlugins();
      const marketplaces = await this.dataService.getAllMarketplaces();

      // 获取已安装插件列表
      const installedPlugins = await this.dataService.getInstalledPlugins();
      const installedNames = new Set(installedPlugins.map(ip => ip.name));

      // 更新所有插件的安装状态
      const pluginsWithStatus = await Promise.all(
        allPlugins.map(async (plugin) => {
          if (installedNames.has(plugin.name)) {
            // 已安装，获取详细状态
            const status = await this.dataService.getPluginStatus(plugin.name);
            return {
              ...plugin,
              status
            };
          } else {
            // 未安装，保持原样
            return plugin;
          }
        })
      );

      // 筛选插件
      const filteredPlugins = this.dataService.filterPlugins(pluginsWithStatus, {
        keyword: payload.filter?.keyword,
        status: payload.filter?.status,
        marketplace: payload.filter?.marketplace
      });

      // 转换为 UI 格式
      const pluginData: PluginData[] = filteredPlugins.map(p => ({
        name: p.name,
        description: p.description,
        version: p.version,
        author: p.author?.name,
        homepage: p.homepage,
        category: p.category,
        marketplace: p.marketplace,
        installed: p.status.installed,
        scope: p.status.scope,
        updateAvailable: p.status.updateAvailable
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
          const result = await this.dataService.installPlugin(pluginName, marketplace, scope);

          if (result.success) {
            this.sendMessage({
              type: 'installSuccess',
              payload: { pluginName, scope }
            });

            vscode.window.showInformationMessage(`✅ 插件 ${pluginName} 安装成功`);
          } else {
            this.sendMessage({
              type: 'installError',
              payload: { pluginName, error: result.error || '安装失败' }
            });

            vscode.window.showErrorMessage(`❌ 插件 ${pluginName} 安装失败: ${result.error}`);
          }
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
          const result = await this.dataService.uninstallPlugin(pluginName);

          if (result.success) {
            this.sendMessage({
              type: 'uninstallSuccess',
              payload: { pluginName }
            });

            vscode.window.showInformationMessage(`✅ 插件 ${pluginName} 卸载成功`);
          } else {
            this.sendMessage({
              type: 'uninstallError',
              payload: { pluginName, error: result.error || '卸载失败' }
            });

            vscode.window.showErrorMessage(`❌ 插件 ${pluginName} 卸载失败: ${result.error}`);
          }
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
   * 刷新插件列表
   */
  private async handleRefresh(): Promise<void> {
    try {
      // 清除缓存以确保获取最新数据
      this.dataService.clearCache();
      await this.handleGetPlugins({});
    } catch (error: any) {
      this.sendMessage({
        type: 'error',
        payload: { message: `刷新失败: ${error.message}` }
      });
    }
  }

  /**
   * 发送消息到 Webview
   */
  private sendMessage(message: ExtensionMessage): void {
    this.webview.postMessage(message);
  }
}
