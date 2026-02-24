// vscode-extension/src/pluginMarketplace/webview/PluginDetailsPanel.ts

import * as vscode from 'vscode';
import { PluginDataStore } from '../data/PluginDataStore';
import { StoreEvent } from '../data/types';
import { PluginDetailUpdateEvent, PluginStatusChangeEvent } from '../data/types';
import { OpenFilePayload } from './messages/types';
import { logger } from '../../shared/utils/logger';

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
  private readonly _isDevelopment: boolean;
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

    // 检测是否为开发环境
    const isDevelopment = process.env.VITE_DEV_SERVER === 'true' || process.env.NODE_ENV === 'development';

    // 创建新 Panel
    const panel = vscode.window.createWebviewPanel(
      PluginDetailsPanel.viewType,
      vscode.l10n.t('Plugin details: {0}', pluginName),
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: isDevelopment
          ? [
              vscode.Uri.joinPath(extensionUri, 'webview', 'dist'),
              vscode.Uri.parse('http://localhost:5173')
            ]
          : [
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
      isInstalled,
      isDevelopment
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
    private _isInstalled: boolean,
    isDevelopment: boolean
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._dataStore = dataStore;
    this._isDevelopment = isDevelopment;

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
          logger.debug(`插件 ${event.pluginName} 状态变更，通知 webview`);
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

    logger.debug(`加载插件详情: ${pluginName} 来自 ${marketplace}, 已安装: ${isInstalled}, 强制刷新: ${forceRefresh}`);

    try {
      // 使用 PluginDataStore 获取插件详情（统一的数据源）
      const locale = vscode.env.language;
      const detail = await this._dataStore.getPluginDetail(pluginName, marketplace, forceRefresh, locale);
      this._panel.title = vscode.l10n.t('Plugin details: {0}', pluginName);
      this.sendMessage({
        type: 'pluginDetail',
        payload: { plugin: detail }
      });

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
          logger.debug('状态变更后刷新插件详情');
          await this.loadPluginDetail(this._pluginName, this._marketplace, this._isInstalled, true);
          break;
        case 'installPlugin':
          // 使用 PluginDataStore 统一管理
          try {
            const { pluginName, marketplace, scope } = message.payload;
            await this._dataStore.installPlugin(pluginName, marketplace, scope as 'user' | 'project');
            vscode.window.showInformationMessage(vscode.l10n.t('Plugin {0} installed successfully', pluginName));
            // 强制刷新详情面板（绕过缓存）
            await this.loadPluginDetail(this._pluginName, this._marketplace, true, true);
          } catch (error: any) {
            vscode.window.showErrorMessage(vscode.l10n.t('Install failed: {0}', error.message || vscode.l10n.t('Unknown error')));
          }
          break;
        case 'uninstallPlugin':
          // 使用 PluginDataStore 统一管理
          try {
            const { pluginName } = message.payload;
            await this._dataStore.uninstallPlugin(pluginName);
            vscode.window.showInformationMessage(vscode.l10n.t('Plugin {0} uninstalled successfully', pluginName));
            // 事件系统会自动触发 UI 更新，但为了确保刷新，手动刷新一次
            await this.loadPluginDetail(this._pluginName, this._marketplace, false, true);
          } catch (error: any) {
            vscode.window.showErrorMessage(vscode.l10n.t('Uninstall failed: {0}', error.message || vscode.l10n.t('Unknown error')));
          }
          break;
        case 'enablePlugin':
          // 使用 PluginDataStore 统一管理
          try {
            const { pluginName, marketplace } = message.payload;
            await this._dataStore.enablePlugin(pluginName, marketplace);
            vscode.window.showInformationMessage(vscode.l10n.t('Plugin {0} enabled', pluginName));
            // 刷新详情面板
            await this.loadPluginDetail(this._pluginName, this._marketplace, this._isInstalled);
          } catch (error: any) {
            vscode.window.showErrorMessage(vscode.l10n.t('Enable failed: {0}', error.message || vscode.l10n.t('Unknown error')));
          }
          break;
        case 'disablePlugin':
          // 使用 PluginDataStore 统一管理
          try {
            const { pluginName, marketplace } = message.payload;
            await this._dataStore.disablePlugin(pluginName, marketplace);
            vscode.window.showInformationMessage(vscode.l10n.t('Plugin {0} disabled', pluginName));
            // 刷新详情面板
            await this.loadPluginDetail(this._pluginName, this._marketplace, this._isInstalled);
          } catch (error: any) {
            vscode.window.showErrorMessage(vscode.l10n.t('Disable failed: {0}', error.message || vscode.l10n.t('Unknown error')));
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
          // vscode.env.openExternal 在所有主流平台都支持
          const supportedPlatforms = ['win32', 'darwin', 'linux'];
          if (supportedPlatforms.includes(process.platform)) {
            await vscode.env.openExternal(directoryUri);
          } else {
            vscode.window.showWarningMessage(vscode.l10n.t('Copy not supported on this system'));
          }
          break;
        case 'copyToClipboard':
          await vscode.env.clipboard.writeText(message.payload.text);
          vscode.window.showInformationMessage(vscode.l10n.t('Copied to clipboard'));
          break;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(vscode.l10n.t('Operation failed: {0}', errorMsg));
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
    // 开发模式: 使用 Vite 开发服务器
    if (this._isDevelopment) {
      const initState = encodeURIComponent(JSON.stringify({
        viewType: 'details',
        pluginName: this._pluginName,
        marketplace: this._marketplace,
        locale: vscode.env.language
      }));

      // 获取 vscode API (防止 HMR 重复获取)
      const vscodeApi = `<script type="text/javascript">(function() { if (!window.vscode) { const vscode = acquireVsCodeApi(); window.vscode = vscode; } })();<\/script>`;

      return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-eval' 'unsafe-inline' http://localhost:5173; style-src http://localhost:5173 'unsafe-inline'; connect-src ws://localhost:5173 http://localhost:5173;">
  <title>${vscode.l10n.t('Plugin details')}</title>
</head>
<body>
  <div id="root"></div>
  ${vscodeApi}
  <script type="module">
    // 连接到 Vite 开发服务器
    import RefreshRuntime from 'http://localhost:5173/@react-refresh';
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => (type) => type;
    window.__vite_plugin_react_preamble_installed__ = true;

    // 动态导入主应用并传递初始状态
    const initState = decodeURIComponent('${initState}');
    window.__DETAILS_INIT_STATE__ = JSON.parse(initState);
    import('http://localhost:5173/src/details/main.tsx');
  </script>
</body>
</html>`;
    }

    // 生产模式: 使用构建后的文件
    const scriptUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'webview', 'dist', 'details.js')
    );

    const styleUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'webview', 'dist', 'details.css')
    );

    // 设置初始状态，告诉 React 这是详情面板
    // 使用 encodeURIComponent 安全地编码为 URL 参数
    const initState = encodeURIComponent(JSON.stringify({
      viewType: 'details',
      pluginName: this._pluginName,
      marketplace: this._marketplace,
      locale: vscode.env.language
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
  <title>${vscode.l10n.t('Plugin details')}</title>
</head>
<body>
  <div id="root"></div>
  <script>window.__LOCALE__ = ${JSON.stringify(vscode.env.language)};</script>
  <script type="module" src="${scriptUriWithState}"></script>
</body>
</html>`;
  }
}
