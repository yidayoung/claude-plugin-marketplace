// vscode-extension/src/pluginMarketplace/webview/PluginDetailsPanel.ts

import * as vscode from 'vscode';
import { PluginDetailsService } from './services/PluginDetailsService';

/**
 * 插件详情 Webview Panel 管理器
 * 负责创建、显示和管理插件详情的 Webview Panel
 */
export class PluginDetailsPanel {
  public static currentPanel: PluginDetailsPanel | undefined;
  public static readonly viewType = 'pluginDetails';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _detailService: PluginDetailsService;
  private _disposables: vscode.Disposable[] = [];

  /**
   * 创建或显示 PluginDetails Panel
   * 如果 Panel 已存在，则更新内容；否则创建新的 Panel
   */
  public static async createOrShow(
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext,
    pluginName: string,
    marketplace: string,
    isInstalled: boolean
  ): Promise<void> {
    const column = vscode.ViewColumn.Beside;

    // 如果已经存在详情面板，更新内容
    if (PluginDetailsPanel.currentPanel) {
      PluginDetailsPanel.currentPanel._panel.reveal(column);
      await PluginDetailsPanel.currentPanel.loadPluginDetail(pluginName, marketplace, isInstalled);
      return;
    }

    // 创建新 Panel
    const panel = vscode.window.createWebviewPanel(
      PluginDetailsPanel.viewType,
      `插件详情: ${pluginName}`,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'webview', 'dist')
        ]
      }
    );

    PluginDetailsPanel.currentPanel = new PluginDetailsPanel(
      panel,
      extensionUri,
      context,
      pluginName,
      marketplace,
      isInstalled
    );
  }

  /**
   * 构造函数
   */
  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext,
    private _pluginName: string,
    private _marketplace: string,
    private _isInstalled: boolean
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._detailService = new PluginDetailsService(context);

    // 设置 HTML
    this._panel.webview.html = this._getHtmlForWebview();

    // 监听消息
    this._panel.webview.onDidReceiveMessage(
      async message => {
        await this.handleMessage(message);
      },
      null,
      this._disposables
    );

    // 监听关闭事件
    this._panel.onDidDispose(
      () => this.dispose(),
      null,
      this._disposables
    );

    // 加载插件详情
    this.loadPluginDetail(this._pluginName, this._marketplace, this._isInstalled);
  }

  /**
   * 加载插件详情
   */
  public async loadPluginDetail(
    pluginName: string,
    marketplace: string,
    isInstalled: boolean
  ): Promise<void> {
    this._pluginName = pluginName;
    this._marketplace = marketplace;
    this._isInstalled = isInstalled;

    try {
      const detail = await this._detailService.getPluginDetail(pluginName, marketplace, isInstalled);
      this._panel.title = `插件详情: ${pluginName}`;
      this.sendMessage({
        type: 'pluginDetail',
        payload: { plugin: detail }
      });
    } catch (error: any) {
      this.sendMessage({
        type: 'error',
        payload: { message: `加载插件详情失败: ${error.message}` }
      });
    }
  }

  /**
   * 处理来自 Webview 的消息
   */
  private async handleMessage(message: any): Promise<void> {
    switch (message.type) {
      case 'installPlugin':
        // 转发到主市场面板处理
        await vscode.commands.executeCommand('claudePluginMarketplace.install', message.payload);
        break;
      case 'uninstallPlugin':
        await vscode.commands.executeCommand('claudePluginMarketplace.uninstall', message.payload);
        break;
      case 'enablePlugin':
        await vscode.commands.executeCommand('claudePluginMarketplace.enable', message.payload);
        break;
      case 'disablePlugin':
        await vscode.commands.executeCommand('claudePluginMarketplace.disable', message.payload);
        break;
      case 'openExternal':
        vscode.env.openExternal(vscode.Uri.parse(message.payload.url));
        break;
      case 'copyToClipboard':
        await vscode.env.clipboard.writeText(message.payload.text);
        vscode.window.showInformationMessage('已复制到剪贴板');
        break;
    }
  }

  /**
   * 发送消息到 Webview
   */
  private sendMessage(message: any): void {
    this._panel.webview.postMessage(message);
  }

  /**
   * 释放资源
   */
  public dispose(): void {
    PluginDetailsPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) disposable.dispose();
    }
  }

  /**
   * 生成 Webview HTML 内容
   */
  private _getHtmlForWebview(): string {
    const scriptUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'webview', 'dist', 'webview.js')
    );

    const styleUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'webview', 'dist', 'webview.css')
    );

    // 设置初始状态，告诉 React 这是详情面板
    const initState = JSON.stringify({
      viewType: 'details',
      pluginName: this._pluginName,
      marketplace: this._marketplace
    });

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${this._panel.webview.cspSource}; style-src ${this._panel.webview.cspSource} 'unsafe-inline';">
  <link href="${styleUri}" rel="stylesheet">
  <title>插件详情</title>
</head>
<body>
  <div id="root"></div>
  <script>
    // 设置初始状态
    window.vscodeState = ${initState};
  </script>
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }
}
