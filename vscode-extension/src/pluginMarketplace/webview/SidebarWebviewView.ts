// vscode-extension/src/pluginMarketplace/webview/SidebarWebviewView.ts

import * as vscode from 'vscode';
import { PluginDataService } from './services/PluginDataService';
import { MessageHandler } from './messages/handlers';

/**
 * 侧边栏 WebviewView Provider
 * 在 VSCode 侧边栏中渲染完全自定义的插件市场 UI
 */
export class SidebarWebviewViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'claudePluginMarketplaceSidebar';

  private _view?: vscode.WebviewView;
  private _dataService: PluginDataService;
  private _messageHandler?: MessageHandler;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    dataService: PluginDataService
  ) {
    this._dataService = dataService;
  }

  /**
   * 解析 WebviewView
   * 当侧边栏被显示时调用
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    // 配置 Webview
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, 'webview', 'dist')
      ]
    };

    // 设置 HTML
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // 创建消息处理器
    this._messageHandler = new MessageHandler(webviewView.webview, this._dataService, this._extensionUri);

    // 监听消息
    webviewView.webview.onDidReceiveMessage(
      async message => {
        if (this._messageHandler) {
          await this._messageHandler.handleMessage(message);
        }
      }
    );

    // 监听可见性变化
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        // 侧边栏显示时刷新数据
        this.refreshData();
      }
    });
  }

  /**
   * 刷新数据
   * 通知 webview 重新加载插件数据
   */
  public refreshData(): void {
    if (this._view) {
      this._view.webview.postMessage({
        type: 'refresh'
      });
    }
  }

  /**
   * 发送消息到 Webview
   */
  public postMessage(message: any): void {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  /**
   * 生成 Webview HTML 内容
   * 使用侧边栏专用的构建版本
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'webview', 'dist', 'sidebar.js')
    );

    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'webview', 'dist', 'sidebar.css')
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}' ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline';">
  <link href="${styleUri}" rel="stylesheet">
  <title>Claude 插件市场</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}">
    // 初始化 VS Code API
    const vscode = acquireVsCodeApi();
    window.vscode = vscode;
  </script>
  <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

/**
 * 生成随机 nonce 值
 * 用于 CSP 策略中的脚本安全
 */
function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
