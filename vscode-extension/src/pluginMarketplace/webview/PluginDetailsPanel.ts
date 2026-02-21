// vscode-extension/src/pluginMarketplace/webview/PluginDetailsPanel.ts

import * as vscode from 'vscode';
import { PluginDetailsService } from './services/PluginDetailsService';
import { PluginDataService } from './services/PluginDataService';
import { OpenFilePayload } from './messages/types';

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
  private readonly _dataService: PluginDataService;
  private _disposables: vscode.Disposable[] = [];
  private _webviewReady = false; // 跟踪 webview 是否已准备好

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
    this._dataService = new PluginDataService(context);

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

    // 注意：不再在构造函数中立即加载插件详情
    // 而是等待 webview 发送 ready 消息后再加载
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

    console.log(`[PluginDetailsPanel] Loading details: ${pluginName} from ${marketplace}, installed: ${isInstalled}`);

    // 清除缓存以确保获取最新数据
    this._detailService.clearCache(pluginName, marketplace);
    console.log(`[PluginDetailsPanel] Cleared cache for ${pluginName}@${marketplace}`);

    try {
      const detail = await this._detailService.getPluginDetail(pluginName, marketplace, isInstalled);
      console.log(`[PluginDetailsPanel] Got detail:`, detail);
      this._panel.title = `插件详情: ${pluginName}`;
      this.sendMessage({
        type: 'pluginDetail',
        payload: { plugin: detail }
      });
      console.log(`[PluginDetailsPanel] Sent pluginDetail message`);

      // 延迟加载 stars：在后台异步获取，不阻塞主流程
      if (detail.repository?.url && !detail.repository.stars) {
        this.fetchStarsInBackground(pluginName, marketplace);
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[PluginDetailsPanel] Error loading details:`, errorMsg);
      this.sendMessage({
        type: 'error',
        payload: { message: `加载插件详情失败: ${errorMsg}` }
      });
    }
  }

  /**
   * 在后台异步获取 stars 并更新到前端
   */
  private async fetchStarsInBackground(pluginName: string, marketplace: string): Promise<void> {
    console.log(`[PluginDetailsPanel] Fetching stars in background for ${pluginName}@${marketplace}`);
    const stars = await this._detailService.fetchPluginStarsAsync(pluginName, marketplace);
    if (stars !== null) {
      console.log(`[PluginDetailsPanel] Got stars: ${stars}, sending update`);
      this.sendMessage({
        type: 'starsUpdate',
        payload: { pluginName, marketplace, stars }
      });
    }
  }

  /**
   * 处理来自 Webview 的消息
   */
  private async handleMessage(message: any): Promise<void> {
    try {
      switch (message.type) {
        case 'ready':
          // Webview 已准备好，现在加载插件详情
          console.log('[PluginDetailsPanel] Webview is ready, loading plugin details');
          this._webviewReady = true;
          await this.loadPluginDetail(this._pluginName, this._marketplace, this._isInstalled);
          break;
        case 'installPlugin':
          // 直接调用 dataService
          try {
            const { pluginName, marketplace, scope } = message.payload;
            const result = await this._dataService.installPlugin(pluginName, marketplace, scope);
            if (result.success) {
              vscode.window.showInformationMessage(`✅ 插件 ${pluginName} 安装成功`);
              // 刷新详情面板
              await this.loadPluginDetail(this._pluginName, this._marketplace, true);
            } else {
              vscode.window.showErrorMessage(`❌ 安装失败: ${result.error || '未知错误'}`);
            }
          } catch (error: any) {
            vscode.window.showErrorMessage(`❌ 安装失败: ${error.message || '未知错误'}`);
          }
          break;
        case 'uninstallPlugin':
          // 直接调用 dataService
          try {
            const { pluginName } = message.payload;
            const result = await this._dataService.uninstallPlugin(pluginName);
            if (result.success) {
              vscode.window.showInformationMessage(`✅ 插件 ${pluginName} 已卸载`);
              // 刷新详情面板
              await this.loadPluginDetail(this._pluginName, this._marketplace, false);
            } else {
              vscode.window.showErrorMessage(`❌ 卸载失败: ${result.error || '未知错误'}`);
            }
          } catch (error: any) {
            vscode.window.showErrorMessage(`❌ 卸载失败: ${error.message || '未知错误'}`);
          }
          break;
        case 'enablePlugin':
          // 直接调用 dataService
          try {
            const { pluginName, marketplace } = message.payload;
            const result = await this._dataService.enablePlugin(pluginName, marketplace);
            if (result.success) {
              vscode.window.showInformationMessage(`✅ 插件 ${pluginName} 已启用`);
              // 刷新详情面板
              await this.loadPluginDetail(this._pluginName, this._marketplace, this._isInstalled);
            } else {
              vscode.window.showErrorMessage(`❌ 启用失败: ${result.error || '未知错误'}`);
            }
          } catch (error: any) {
            vscode.window.showErrorMessage(`❌ 启用失败: ${error.message || '未知错误'}`);
          }
          break;
        case 'disablePlugin':
          // 直接调用 dataService
          try {
            const { pluginName, marketplace } = message.payload;
            const result = await this._dataService.disablePlugin(pluginName, marketplace);
            if (result.success) {
              vscode.window.showInformationMessage(`✅ 插件 ${pluginName} 已禁用`);
              // 刷新详情面板
              await this.loadPluginDetail(this._pluginName, this._marketplace, this._isInstalled);
            } else {
              vscode.window.showErrorMessage(`❌ 禁用失败: ${result.error || '未知错误'}`);
            }
          } catch (error: any) {
            vscode.window.showErrorMessage(`❌ 禁用失败: ${error.message || '未知错误'}`);
          }
          break;
        case 'openExternal':
          vscode.env.openExternal(vscode.Uri.parse(message.payload.url));
          break;
        case 'openFile':
          // 打开文件并显示在编辑器中
          const filePath = message.payload.filePath;
          const fileUri = vscode.Uri.file(filePath);
          const doc = await vscode.workspace.openTextDocument(fileUri);
          await vscode.window.showTextDocument(doc);
          break;
        case 'openDirectory':
          // 打开目录在系统文件管理器中
          const directoryPath = message.payload.directoryPath;
          const directoryUri = vscode.Uri.file(directoryPath);
          // 根据操作系统使用不同的命令
          switch (process.platform) {
            case 'win32':
              // Windows: 使用 explorer
              await vscode.env.openExternal(directoryUri);
              break;
            case 'darwin':
              // macOS: 使用 open
              await vscode.env.openExternal(directoryUri);
              break;
            case 'linux':
              // Linux: 使用 xdg-open
              await vscode.env.openExternal(directoryUri);
              break;
            default:
              vscode.window.showWarningMessage('不支持的操作系统');
          }
          break;
        case 'copyToClipboard':
          await vscode.env.clipboard.writeText(message.payload.text);
          vscode.window.showInformationMessage('已复制到剪贴板');
          break;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`操作失败: ${errorMsg}`);
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
      vscode.Uri.joinPath(this._extensionUri, 'webview', 'dist', 'details.js')
    );

    // 现在每个入口点都有独立的 CSS 文件
    const styleUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'webview', 'dist', 'details.css')
    );

    // 设置初始状态，告诉 React 这是详情面板
    // 使用 encodeURIComponent 安全地编码为 URL 参数
    const initState = encodeURIComponent(JSON.stringify({
      viewType: 'details',
      pluginName: this._pluginName,
      marketplace: this._marketplace
    }));

    // 在 scriptUri 后面添加初始状态作为查询参数
    const scriptUriWithState = `${scriptUri}?init=${initState}`;

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${this._panel.webview.cspSource} 'unsafe-inline' 'unsafe-eval'; style-src ${this._panel.webview.cspSource} 'unsafe-inline';">
  <link href="${styleUri}" rel="stylesheet">
  <title>插件详情</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${scriptUriWithState}"></script>
</body>
</html>`;
  }
}
