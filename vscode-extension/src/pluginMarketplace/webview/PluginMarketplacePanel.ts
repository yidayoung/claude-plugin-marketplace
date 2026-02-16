// vscode-extension/src/pluginMarketplace/webview/PluginMarketplacePanel.ts

import * as vscode from 'vscode';
import { PluginDataService } from './services/PluginDataService';
import { MessageHandler } from './messages/handlers';

/**
 * 插件市场 Webview Panel 管理器
 * 负责创建、显示和管理插件市场的 Webview Panel
 */
export class PluginMarketplacePanel {
  public static currentPanel: PluginMarketplacePanel | undefined;
  public static readonly viewType = 'pluginMarketplace';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  /**
   * 创建或显示 PluginMarketplace Panel
   * 如果 Panel 已存在，则重新显示；否则创建新的 Panel
   *
   * @param extensionUri 扩展的 URI，用于定位 Webview 资源
   * @param dataService 插件数据服务
   */
  public static createOrShow(
    extensionUri: vscode.Uri,
    dataService: PluginDataService
  ): void {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // 如果已经存在，则显示
    if (PluginMarketplacePanel.currentPanel) {
      PluginMarketplacePanel.currentPanel._panel.reveal(column);
      return;
    }

    // 创建新 Panel
    const panel = vscode.window.createWebviewPanel(
      PluginMarketplacePanel.viewType,
      '插件市场',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'webview', 'dist')
        ]
      }
    );

    PluginMarketplacePanel.currentPanel = new PluginMarketplacePanel(
      panel,
      extensionUri,
      dataService
    );
  }

  /**
   * 构造函数
   * 初始化 Panel，设置 HTML 内容，注册消息处理器
   *
   * @param panel Webview Panel 实例
   * @param extensionUri 扩展的 URI
   * @param dataService 插件数据服务
   */
  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    dataService: PluginDataService
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // 设置 HTML
    this._panel.webview.html = this._getHtmlForWebview();

    // 创建消息处理器
    const messageHandler = new MessageHandler(this._panel.webview, dataService, extensionUri);

    // 监听消息
    this._panel.webview.onDidReceiveMessage(
      async message => {
        await messageHandler.handleMessage(message);
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
  }

  /**
   * 发送搜索关键词到 Webview
   * 用于从命令面板触发搜索
   */
  public sendSearchTerm(searchTerm: string): void {
    this._panel.webview.postMessage({
      type: 'search',
      payload: { searchTerm }
    });
  }

  /**
   * 显示插件详情
   * 通知 Webview 切换到详情视图
   */
  public showPluginDetails(pluginName: string, marketplace: string): void {
    this._panel.webview.postMessage({
      type: 'showDetails',
      payload: { pluginName, marketplace }
    });
  }

  /**
   * 释放资源
   * 清理 Panel 和所有 disposable 资源
   */
  public dispose(): void {
    PluginMarketplacePanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  /**
   * 生成 Webview HTML 内容
   * 包含 CSP 策略、样式、脚本等
   *
   * @returns HTML 字符串
   */
  private _getHtmlForWebview(): string {
    const scriptUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'webview', 'dist', 'webview.js')
    );

    const styleUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'webview', 'dist', 'webview.css')
    );

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${this._panel.webview.cspSource}; style-src ${this._panel.webview.cspSource} 'unsafe-inline';">
  <link href="${styleUri}" rel="stylesheet">
  <title>Claude Code 插件市场</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

/**
 * 生成随机 nonce 值
 * 用于 CSP 策略中的脚本安全
 *
 * @returns 随机 nonce 字符串
 */
function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
