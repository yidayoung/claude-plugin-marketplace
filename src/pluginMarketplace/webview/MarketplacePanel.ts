// vscode-extension/src/pluginMarketplace/webview/MarketplacePanel.ts

import * as vscode from 'vscode';
import { PluginDataStore } from '../data/PluginDataStore';
import { StoreEvent } from '../data/types';
import { BUILTIN_MARKETPLACES } from '../data/MarketplaceConfig';
import { logger } from '../../shared/utils/logger';

// Webview 消息类型
type WebviewMessage = {
  type: 'ready' | 'addMarketplace' | 'addRecommendedMarketplace' | 'openExternal' | 'removeMarketplace' | 'refreshMarketplaceStars';
  payload?: any;
};

// Extension 消息类型
type ExtensionMessage = {
  type: 'marketplaceList' | 'builtinMarkets' | 'error';
  payload?: any;
};

// 市场信息（带 stars）
interface MarketplaceWithStars {
  name: string;
  stars?: number;
}

/**
 * 市场发现 Webview Panel 管理器
 * 展示推荐市场和添加市场功能
 */
export class MarketplacePanel {
  public static currentPanel: MarketplacePanel | undefined;
  public static readonly viewType = 'marketplaceDiscover';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _dataStore: PluginDataStore;
  private readonly _isDevelopment: boolean;
  private _disposables: vscode.Disposable[] = [];

  /**
   * 创建或显示 Marketplace Panel
   * 如果 Panel 已存在，则定位到已有 Panel
   */
  public static async createOrShow(
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext,
    dataStore: PluginDataStore
  ): Promise<void> {
    const column = vscode.ViewColumn.Beside;

    // 如果已经存在面板，定位到它
    if (MarketplacePanel.currentPanel) {
      MarketplacePanel.currentPanel._panel.reveal(column);
      return;
    }

    // 检测是否为开发环境
    const isDevelopment = process.env.VITE_DEV_SERVER === 'true' || process.env.NODE_ENV === 'development';

    // 创建新 Panel
    const panel = vscode.window.createWebviewPanel(
      MarketplacePanel.viewType,
      vscode.l10n.t('marketplace.discover.title'),
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

    MarketplacePanel.currentPanel = new MarketplacePanel(
      panel,
      extensionUri,
      context,
      dataStore,
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
    isDevelopment: boolean
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._dataStore = dataStore;
    this._isDevelopment = isDevelopment;

    logger.debug('[MarketplacePanel] Creating new panel');

    // 订阅市场变更事件
    this._disposables.push(
      this._dataStore.on(StoreEvent.MarketplaceChange, () => {
        logger.debug('[MarketplacePanel] Marketplaces changed, sending updated list');
        this.sendMarketplaceList();
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
  }

  /**
   * 发送当前市场列表到 webview（包含缓存的 stars 数据）
   */
  private sendMarketplaceList(): void {
    const marketplaces = this._dataStore.getMarketplaces();
    const marketplacesWithStars: MarketplaceWithStars[] = marketplaces.map(m => ({
      name: m.name,
      stars: this._dataStore.getMarketplaceStars(m.name),
    }));

    // 同时发送内置市场的 stars 数据（用于未安装的市场显示）
    const builtinStars: Record<string, number | undefined> = {};
    for (const builtin of BUILTIN_MARKETPLACES) {
      // 如果已安装，使用已有的 stars；否则从缓存获取
      const existing = marketplacesWithStars.find(m => m.name === builtin.name);
      if (existing) {
        builtinStars[builtin.name] = existing.stars;
      } else {
        // 从内置配置中提取 owner/repo 并获取 stars
        builtinStars[builtin.name] = this._dataStore.getMarketplaceStars(builtin.name);
      }
    }

    logger.debug('[MarketplacePanel] Sending marketplace list with stars:', marketplacesWithStars);
    logger.debug('[MarketplacePanel] Sending builtin stars:', builtinStars);
    this.sendMessage({
      type: 'marketplaceList',
      payload: {
        marketplaces: marketplacesWithStars,
        builtinStars  // 包含所有内置市场的 stars（包括未安装的）
      }
    });
  }

  /**
   * 发送内置推荐市场列表到 webview
   */
  private sendBuiltinMarkets(): void {
    logger.debug('[MarketplacePanel] Sending builtin markets, count:', BUILTIN_MARKETPLACES.length);
    this.sendMessage({
      type: 'builtinMarkets',
      payload: { markets: BUILTIN_MARKETPLACES }
    });
  }

  /**
   * 处理来自 Webview 的消息
   */
  private async handleMessage(message: any): Promise<void> {
    try {
      logger.debug('[MarketplacePanel] Received message:', message.type, message.payload);

      switch (message.type) {
        case 'ready': {
          // Webview 准备好了，发送市场列表
          logger.debug('[MarketplacePanel] Webview ready, sending marketplace list');
          this.sendMarketplaceList();
          this.sendBuiltinMarkets();
          break;
        }
        case 'addMarketplace':
        case 'addRecommendedMarketplace': {
          const { source } = message.payload;
          logger.debug('[MarketplacePanel] Adding marketplace:', source);
          const result = await this._dataStore.addMarketplace(source);
          if (result.success) {
            vscode.window.showInformationMessage(
              vscode.l10n.t('marketplace.addSuccess', result.marketplaceName || source)
            );
          } else {
            vscode.window.showErrorMessage(
              vscode.l10n.t('marketplace.addFailure', result.error ?? '')
            );
          }
          break;
        }
        case 'openExternal':
          vscode.env.openExternal(vscode.Uri.parse(message.payload.url));
          break;
        case 'removeMarketplace': {
          const { marketplaceName } = message.payload;
          const result = await this._dataStore.removeMarketplace(marketplaceName);
          if (result.success) {
            vscode.window.showInformationMessage(
              vscode.l10n.t('marketplace.removeSuccess', marketplaceName)
            );
          } else {
            vscode.window.showErrorMessage(
              vscode.l10n.t('marketplace.removeFailure', result.error ?? '')
            );
          }
          break;
        }
        case 'refreshMarketplaceStars': {
          logger.debug('[MarketplacePanel] Manually refreshing marketplace stars');
          await this._dataStore.refreshMarketplaceStars(true);
          this.sendMarketplaceList();
          break;
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('[MarketplacePanel] Error handling message:', errorMsg);
      vscode.window.showErrorMessage(vscode.l10n.t('operation.failure', errorMsg));
      // 同时发送错误消息到 webview
      this.sendMessage({
        type: 'error',
        payload: { message: errorMsg }
      });
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
    MarketplacePanel.currentPanel = undefined;
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
      const title = vscode.l10n.t('marketplace.discover.title');
      const initState = encodeURIComponent(JSON.stringify({
        viewType: 'marketplace',
        locale: vscode.env.language,
        title
      }));

      const vscodeApi = `<script type="text/javascript">(function() { if (!window.vscode) { const vscode = acquireVsCodeApi(); window.vscode = vscode; } })();<\/script>`;

      return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-eval' 'unsafe-inline' http://localhost:5173; style-src http://localhost:5173 'unsafe-inline'; connect-src ws://localhost:5173 http://localhost:5173;">
  <title>${title}</title>
</head>
<body>
  <div id="root"></div>
  ${vscodeApi}
  <script type="module">
    import RefreshRuntime from 'http://localhost:5173/@react-refresh';
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => (type) => type;
    window.__vite_plugin_react_preamble_installed__ = true;

    const initState = decodeURIComponent('${initState}');
    window.__MARKETPLACE_INIT_STATE__ = JSON.parse(initState);
    import('http://localhost:5173/src/marketplace/main.tsx');
  </script>
</body>
</html>`;
    }

    // 生产模式: 使用构建后的文件
    const scriptUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'webview', 'dist', 'marketplace.js')
    );
    const styleUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'webview', 'dist', 'marketplace.css')
    );

    const title = vscode.l10n.t('marketplace.discover.title');
    const initState = encodeURIComponent(JSON.stringify({
      viewType: 'marketplace',
      locale: vscode.env.language,
      title
    }));

    const scriptUriWithState = `${scriptUri}?init=${initState}`;

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${this._panel.webview.cspSource} 'unsafe-inline' 'unsafe-eval'; style-src ${this._panel.webview.cspSource} 'unsafe-inline';">
  <link href="${styleUri}" rel="stylesheet">
  <title>${title}</title>
</head>
<body>
  <div id="root"></div>
  <script>window.__LOCALE__ = ${JSON.stringify(vscode.env.language)};</script>
  <script type="module" src="${scriptUriWithState}"></script>
</body>
</html>`;
  }
}
