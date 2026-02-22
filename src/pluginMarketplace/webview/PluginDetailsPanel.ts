// vscode-extension/src/pluginMarketplace/webview/PluginDetailsPanel.ts

import * as vscode from 'vscode';
import { PluginDataStore } from '../data/PluginDataStore';
import { StoreEvent } from '../data/types';
import { PluginDetailUpdateEvent, PluginStatusChangeEvent } from '../data/types';
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
  private readonly _dataStore: PluginDataStore;
  private _disposables: vscode.Disposable[] = [];
  private _webviewReady = false; // 跟踪 webview 是否已准备好

  /**
   * 创建或显示 PluginDetails Panel
   * 如果 Panel 已存在，则更新内容；否则创建新的 Panel
   */
  public static async createOrShow(
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext,
    dataStore: PluginDataStore,
    pluginName: string,
    marketplace: string,
    isInstalled: boolean
  ): Promise<void> {
    const column = vscode.ViewColumn.Beside;

    // 如果已经存在详情面板，更新内容
    if (PluginDetailsPanel.currentPanel) {
      // 不传入 viewColumn 参数，让 panel 保持在原位置
      // 这样可以避免每次打开时宽度变化
      PluginDetailsPanel.currentPanel._panel.reveal();
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
      dataStore,
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
    dataStore: PluginDataStore,
    private _pluginName: string,
    private _marketplace: string,
    private _isInstalled: boolean
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._dataStore = dataStore;

    // 订阅详情更新事件（如 stars 加载完成）
    this._disposables.push(
      this._dataStore.on(StoreEvent.PluginDetailUpdate, (event: PluginDetailUpdateEvent) => {
        // 如果是当前显示的插件，发送更新到 webview
        if (event.pluginName === this._pluginName && event.marketplace === this._marketplace) {
          this.sendMessage({
            type: 'detailUpdate',
            payload: { updates: event.updates }
          });
        }
      })
    );

    // 订阅状态变更事件
    this._disposables.push(
      this._dataStore.on(StoreEvent.PluginStatusChange, (event: PluginStatusChangeEvent) => {
        // 检查插件名称和市场名称是否匹配当前面板
        if (event.pluginName === this._pluginName && event.marketplace === this._marketplace) {
          console.log(`[PluginDetailsPanel] Status changed for ${event.pluginName}, notifying webview`);
          this.sendMessage({
            type: 'statusUpdate',
            payload: { change: event.change }
          });
        }
      })
    );

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
    isInstalled: boolean,
    forceRefresh = false
  ): Promise<void> {
    this._pluginName = pluginName;
    this._marketplace = marketplace;
    this._isInstalled = isInstalled;

    console.log(`[PluginDetailsPanel] 🔵 Loading details: ${pluginName} from ${marketplace}, installed: ${isInstalled}, forceRefresh: ${forceRefresh}`);

    try {
      // 使用 PluginDataStore 获取插件详情（统一的数据源）
      const detail = await this._dataStore.getPluginDetail(pluginName, marketplace, forceRefresh);
      console.log(`[PluginDetailsPanel] ✅ Got detail with installed=${detail.installed}, enabled=${detail.enabled}`);
      this._panel.title = `插件详情: ${pluginName}`;
      this.sendMessage({
        type: 'pluginDetail',
        payload: { plugin: detail }
      });
      console.log(`[PluginDetailsPanel] 📤 Sent pluginDetail message to webview`);

      // 延迟加载 stars：在后台异步获取，不阻塞主流程
      // 注意：stars 已经由 PluginDataStore 自动异步加载，这里不需要额外处理
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
   * 处理来自 Webview 的消息
   */
  private async handleMessage(message: any): Promise<void> {
    try {
      switch (message.type) {
        case 'ready':
          // Webview 已准备好，现在加载插件详情
          this._webviewReady = true;
          await this.loadPluginDetail(this._pluginName, this._marketplace, this._isInstalled);
          break;
        case 'refreshPluginDetail':
          // Webview 请求刷新插件详情（由 statusUpdate 事件触发）
          console.log('[PluginDetailsPanel] Refreshing plugin detail after status change');
          await this.loadPluginDetail(this._pluginName, this._marketplace, this._isInstalled, true);
          break;
        case 'installPlugin':
          // 使用 PluginDataStore 统一管理
          try {
            const { pluginName, marketplace, scope } = message.payload;
            await this._dataStore.installPlugin(pluginName, marketplace, scope as 'user' | 'project');
            vscode.window.showInformationMessage(`✅ 插件 ${pluginName} 安装成功`);
            // 强制刷新详情面板（绕过缓存）
            await this.loadPluginDetail(this._pluginName, this._marketplace, true, true);
          } catch (error: any) {
            vscode.window.showErrorMessage(`❌ 安装失败: ${error.message || '未知错误'}`);
          }
          break;
        case 'uninstallPlugin':
          // 使用 PluginDataStore 统一管理
          try {
            const { pluginName } = message.payload;
            await this._dataStore.uninstallPlugin(pluginName);
            vscode.window.showInformationMessage(`✅ 插件 ${pluginName} 已卸载`);
            // 事件系统会自动触发 UI 更新，但为了确保刷新，手动刷新一次
            await this.loadPluginDetail(this._pluginName, this._marketplace, false, true);
          } catch (error: any) {
            vscode.window.showErrorMessage(`❌ 卸载失败: ${error.message || '未知错误'}`);
          }
          break;
        case 'enablePlugin':
          // 使用 PluginDataStore 统一管理
          try {
            const { pluginName, marketplace } = message.payload;
            await this._dataStore.enablePlugin(pluginName, marketplace);
            vscode.window.showInformationMessage(`✅ 插件 ${pluginName} 已启用`);
            // 刷新详情面板
            await this.loadPluginDetail(this._pluginName, this._marketplace, this._isInstalled);
          } catch (error: any) {
            vscode.window.showErrorMessage(`❌ 启用失败: ${error.message || '未知错误'}`);
          }
          break;
        case 'disablePlugin':
          // 使用 PluginDataStore 统一管理
          try {
            const { pluginName, marketplace } = message.payload;
            await this._dataStore.disablePlugin(pluginName, marketplace);
            vscode.window.showInformationMessage(`✅ 插件 ${pluginName} 已禁用`);
            // 刷新详情面板
            await this.loadPluginDetail(this._pluginName, this._marketplace, this._isInstalled);
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
