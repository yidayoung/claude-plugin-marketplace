# 市场发现面板实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 在 Editor 区域创建一个市场发现面板，展示推荐市场和自定义市场添加功能

**架构:** 新增 `MarketplacePanel` 类（单例模式，类似 `PluginDetailsPanel`），在 VS Code Editor 区域创建 WebviewPanel，使用 React + Ant Design 构建 UI

**技术栈:** TypeScript, React, Ant Design, VS Code Extension API, Vite

---

## 前置说明

### 相关文件结构
```
src/pluginMarketplace/
├── data/
│   └── PluginDataStore.ts          # 数据源，用于添加市场
├── webview/
│   ├── PluginDetailsPanel.ts       # 参考实现
│   ├── messages/
│   │   └── handlers.ts             # 消息处理
│   └── messages/
│       └── types.ts                # 消息类型定义

webview/src/
├── details/                         # 参考实现
│   ├── index.html
│   └── main.tsx
├── l10n/
│   └── zh-cn.json                   # 国际化
└── vite.config.ts                   # 构建配置
```

### 关键约定
- 使用 Ant Design 组件，不创建 CSS 文件
- 遵循项目国际化模式（`vscode.l10n.t()` + `useL10n()`）
- 单例模式：`currentPanel` 静态变量 + `reveal()` 复用

---

## Task 1: 创建 MarketplacePanel 类

**Files:**
- Create: `src/pluginMarketplace/webview/MarketplacePanel.ts`

**Step 1: 创建 MarketplacePanel 类基础结构**

```typescript
// vscode-extension/src/pluginMarketplace/webview/MarketplacePanel.ts

import * as vscode from 'vscode';
import { PluginDataStore } from '../data/PluginDataStore';
import { StoreEvent } from '../data/types';
import { logger } from '../../shared/utils/logger';

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

    // 订阅市场变更事件
    this._disposables.push(
      this._dataStore.on(StoreEvent.MarketplaceChange, () => {
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

    // 发送当前市场列表
    this.sendMarketplaceList();
  }

  /**
   * 发送当前市场列表到 webview
   */
  private sendMarketplaceList(): void {
    const marketplaces = this._dataStore.getMarketplaces();
    const marketplaceNames = marketplaces.map(m => m.name);
    this.sendMessage({
      type: 'marketplaceList',
      payload: { marketplaces: marketplaceNames }
    });
  }

  /**
   * 处理来自 Webview 的消息
   */
  private async handleMessage(message: any): Promise<void> {
    try {
      switch (message.type) {
        case 'addMarketplace':
        case 'addRecommendedMarketplace': {
          const { source } = message.payload;
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
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(vscode.l10n.t('operation.failure', errorMsg));
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
      const initState = encodeURIComponent(JSON.stringify({
        viewType: 'marketplace',
        locale: vscode.env.language
      }));

      const vscodeApi = `<script type="text/javascript">(function() { if (!window.vscode) { const vscode = acquireVsCodeApi(); window.vscode = vscode; } })();<\/script>`;

      return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-eval' 'unsafe-inline' http://localhost:5173; style-src http://localhost:5173 'unsafe-inline'; connect-src ws://localhost:5173 http://localhost:5173;">
  <title>发现市场</title>
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

    const initState = encodeURIComponent(JSON.stringify({
      viewType: 'marketplace',
      locale: vscode.env.language
    }));

    const scriptUriWithState = `${scriptUri}?init=${initState}`;

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${this._panel.webview.cspSource} 'unsafe-inline' 'unsafe-eval'; style-src ${this._panel.webview.cspSource} 'unsafe-inline';">
  <link href="${styleUri}" rel="stylesheet">
  <title>发现市场</title>
</head>
<body>
  <div id="root"></div>
  <script>window.__LOCALE__ = ${JSON.stringify(vscode.env.language)};</script>
  <script type="module" src="${scriptUriWithState}"></script>
</body>
</html>`;
  }
}
```

**Step 2: 编译检查**

Run: `npm run compile`
Expected: 无错误

**Step 3: Commit**

```bash
git add src/pluginMarketplace/webview/MarketplacePanel.ts
git commit -m "feat: add MarketplacePanel class skeleton"
```

---

## Task 2: 修改 extension.ts 命令注册

**Files:**
- Modify: `src/extension.ts:97-115`

**Step 1: 修改 addMarketplace 命令，改为打开面板**

找到 `claudePluginMarketplace.addMarketplace` 命令注册部分，替换为：

```typescript
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
```

**Step 2: 添加 import 语句**

在文件顶部的 import 区域添加：

```typescript
import { MarketplacePanel } from './pluginMarketplace/webview/MarketplacePanel';
```

**Step 3: 编译检查**

Run: `npm run compile`
Expected: 无错误

**Step 4: Commit**

```bash
git add src/extension.ts
git commit -m "feat: change addMarketplace command to open MarketplacePanel"
```

---

## Task 3: 添加国际化文本

**Files:**
- Modify: `l10n/bundle.l10n.zh-cn.json`

**Step 1: 添加市场发现相关的国际化文本**

在文件末尾添加（注意最后一个条目后需要加逗号）：

```json
{
  ...
  "marketplace.updateFailureWithName": "市场 {0} 更新失败: {1}",
  "marketplace.discover.title": "发现市场",
  "marketplace.discover.addCustom": "添加自定义市场",
  "marketplace.discover.inputPlaceholder": "owner/repo 或 URL",
  "marketplace.discover.addButton": "添加",
  "marketplace.discover.recommended": "推荐市场",
  "marketplace.discover.addedButton": "已添加",
  "marketplace.discover.alreadyExists": "该市场已存在"
}
```

**Step 2: Commit**

```bash
git add l10n/bundle.l10n.zh-cn.json
git commit -m "feat: add i18n strings for marketplace discovery panel"
```

---

## Task 4: 创建 Webview 入口 HTML

**Files:**
- Create: `webview/src/marketplace/index.html`

**Step 1: 创建入口 HTML 文件**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Marketplace Discovery</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

**Step 2: Commit**

```bash
git add webview/src/marketplace/index.html
git commit -m "feat: add marketplace discovery webview entry HTML"
```

---

## Task 5: 创建 Webview 主入口文件

**Files:**
- Create: `webview/src/marketplace/main.tsx`

**Step 1: 创建 main.tsx**

```typescript
// vscode-extension/webview/src/marketplace/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import MarketplaceApp from './MarketplaceApp';
import { loadL10n } from '../l10n';

// 获取初始状态
function getInitialState(): { viewType: string; locale: string } {
  // 开发模式：从全局变量获取
  if (typeof window !== 'undefined' && (window as any).__MARKETPLACE_INIT_STATE__) {
    return (window as any).__MARKETPLACE_INIT_STATE__;
  }

  // 生产模式：从 URL 参数获取
  const script = document.currentScript as HTMLScriptElement;
  if (script && script.src) {
    const url = new URL(script.src);
    const initParam = url.searchParams.get('init');
    if (initParam) {
      try {
        return JSON.parse(decodeURIComponent(initParam));
      } catch {
        // ignore parse error
      }
    }
  }

  // 生产模式：从全局变量获取（备用）
  if (typeof window !== 'undefined' && (window as any).__LOCALE__) {
    return {
      viewType: 'marketplace',
      locale: (window as any).__LOCALE__
    };
  }

  return { viewType: 'marketplace', locale: 'en' };
}

// 获取 locale
const initialState = getInitialState();
const locale = initialState.locale || 'en';

// 加载国际化
const t = await loadL10n(locale);

// 渲染应用
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MarketplaceApp t={t} />
  </React.StrictMode>
);
```

**Step 2: Commit**

```bash
git add webview/src/marketplace/main.tsx
git commit -m "feat: add marketplace discovery webview main entry"
```

---

## Task 6: 创建 Webview 主组件

**Files:**
- Create: `webview/src/marketplace/MarketplaceApp.tsx`

**Step 1: 创建 MarketplaceApp.tsx**

```typescript
// vscode-extension/webview/src/marketplace/MarketplaceApp.tsx

import { useState, useEffect } from 'react';
import { Input, Button, Divider, Typography, Space, Card, Alert, message } from 'antd';
import { AppstoreOutlined, PlusOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

// 声明全局 vscode API
declare const vscode: {
  postMessage: (message: any) => void;
  getState: () => any;
  setState: (state: any) => void;
};

// 推荐市场列表
const RECOMMENDED_MARKETPLACES = [
  {
    id: 'anthropics/claude-plugins-official',
    name: 'claude-plugins-official',
    displayName: 'Anthropic 官方插件',
    description: 'Anthropic 官方维护的插件集合',
    source: 'github.com/anthropics/claude-plugins-official',
    icon: '🔷'
  },
  {
    id: 'claude-automation/claude-plugin-marketplace',
    name: 'claude-plugin-marketplace',
    displayName: '社区插件市场',
    description: '社区驱动的插件发现与分享平台',
    source: 'github.com/claude-automation/claude-plugin-marketplace',
    icon: '🌟'
  }
];

interface MarketplaceAppProps {
  t: Record<string, string>;
}

interface MarketplaceListMessage {
  type: 'marketplaceList';
  payload: {
    marketplaces: string[];
  };
}

const MarketplaceApp: React.FC<MarketplaceAppProps> = ({ t }) => {
  const [inputValue, setInputValue] = useState('');
  const [addedMarketplaces, setAddedMarketplaces] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // 监听来自 extension 的消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data as MarketplaceListMessage;
      if (msg.type === 'marketplaceList') {
        setAddedMarketplaces(new Set(msg.payload.marketplaces));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // 添加自定义市场
  const handleAddMarketplace = () => {
    const source = inputValue.trim();
    if (!source) {
      message.warning(t['marketplace.discover.inputPlaceholder'] || '请输入市场来源');
      return;
    }

    setLoading(true);
    vscode.postMessage({
      type: 'addMarketplace',
      payload: { source }
    });
    // 不清空输入，方便用户看到输入的内容
    setLoading(false);
  };

  // 添加推荐市场
  const handleAddRecommended = (source: string) => {
    setLoading(true);
    vscode.postMessage({
      type: 'addRecommendedMarketplace',
      payload: { source }
    });
    setLoading(false);
  };

  // 检查市场是否已添加
  const isMarketplaceAdded = (source: string): boolean => {
    // 从 source 提取市场名称
    const name = source.includes('/') ? source.split('/').pop() : source;
    return addedMarketplaces.has(name || '');
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      {/* 标题 */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={3} style={{ margin: 0 }}>
          <AppstoreOutlined style={{ marginRight: '8px' }} />
          {t['marketplace.discover.title'] || '发现市场'}
        </Title>
      </div>

      {/* 自定义市场添加 */}
      <Card
        title={t['marketplace.discover.addCustom'] || '添加自定义市场'}
        style={{ marginBottom: '24px' }}
      >
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder={t['marketplace.discover.inputPlaceholder'] || 'owner/repo 或 URL'}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onPressEnter={handleAddMarketplace}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddMarketplace}
            loading={loading}
          >
            {t['marketplace.discover.addButton'] || '添加'}
          </Button>
        </Space.Compact>
      </Card>

      <Divider />

      {/* 推荐市场 */}
      <div>
        <Title level={4} style={{ marginBottom: '16px' }}>
          {t['marketplace.discover.recommended'] || '推荐市场'}
        </Title>

        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {RECOMMENDED_MARKETPLACES.map((marketplace) => {
            const isAdded = isMarketplaceAdded(marketplace.source);

            return (
              <Card
                key={marketplace.id}
                size="small"
                extra={
                  <Button
                    type={isAdded ? 'default' : 'primary'}
                    size="small"
                    disabled={isAdded}
                    onClick={() => handleAddRecommended(marketplace.source)}
                  >
                    {isAdded
                      ? (t['marketplace.discover.addedButton'] || '已添加')
                      : (t['marketplace.discover.addButton'] || '添加')
                    }
                  </Button>
                }
              >
                <Space direction="vertical" size={0} style={{ width: '100%' }}>
                  <Text strong style={{ fontSize: '14px' }}>
                    {marketplace.icon} {marketplace.displayName}
                  </Text>
                  <Paragraph style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
                    {marketplace.description}
                  </Paragraph>
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    {marketplace.source}
                  </Text>
                </Space>
              </Card>
            );
          })}
        </Space>
      </div>
    </div>
  );
};

export default MarketplaceApp;
```

**Step 2: Commit**

```bash
git add webview/src/marketplace/MarketplaceApp.tsx
git commit -m "feat: add MarketplaceApp component"
```

---

## Task 7: 更新 Vite 构建配置

**Files:**
- Modify: `webview/vite.config.ts`

**Step 1: 添加 marketplace 入口**

修改 `rollupOptions.input`，添加 marketplace 入口：

```typescript
rollupOptions: {
  input: {
    // 侧边栏
    sidebar: resolve(__dirname, 'src/sidebar/index.html'),
    // 插件详情
    details: resolve(__dirname, 'src/details/index.html'),
    // 市场发现
    marketplace: resolve(__dirname, 'src/marketplace/index.html')
  },
  output: {
    entryFileNames: '[name].js',
    chunkFileNames: '[name].js',
    assetFileNames: '[name].css'
  }
}
```

**Step 2: Commit**

```bash
git add webview/vite.config.ts
git commit -m "build: add marketplace entry to vite config"
```

---

## Task 8: 构建和测试

**Step 1: 构建 webview**

Run: `npm run build-webview`
Expected: 在 `webview/dist/` 目录生成 `marketplace.js` 和 `marketplace.css`

**Step 2: 编译 extension**

Run: `npm run compile`
Expected: 无错误

**Step 3: 测试功能**

1. 按 F5 启动扩展开发模式
2. 在侧边栏点击"更多操作" → "添加市场"
3. 应该在 Editor 区域打开"发现市场"面板
4. 尝试添加自定义市场
5. 尝试点击推荐市场的"添加"按钮

**Step 4: 提交构建**

```bash
git add webview/dist/
git commit -m "build: add marketplace webview dist files"
```

---

## Task 9: 添加 Webview 国际化文本

**Files:**
- Modify: `webview/src/l10n/zh-cn.json`

**Step 1: 添加 webview 国际化文本**

在文件末尾添加：

```json
{
  ...
  "item.actions": "操作",
  "marketplace.discover.title": "发现市场",
  "marketplace.discover.addCustom": "添加自定义市场",
  "marketplace.discover.inputPlaceholder": "owner/repo 或 URL",
  "marketplace.discover.addButton": "添加",
  "marketplace.discover.recommended": "推荐市场",
  "marketplace.discover.addedButton": "已添加",
  "marketplace.discover.alreadyExists": "该市场已存在"
}
```

**Step 2: Commit**

```bash
git add webview/src/l10n/zh-cn.json
git commit -m "feat: add webview i18n for marketplace discovery"
```

---

## Task 10: 最终测试和验证

**Step 1: 完整构建**

Run: `npm run compile && npm run build-webview`
Expected: 无错误

**Step 2: 功能验证清单**

- [ ] 点击"添加市场"命令打开面板
- [ ] 再次点击"添加市场"命令，面板定位到已打开的面板（不是新建）
- [ ] 输入自定义市场来源并添加成功
- [ ] 点击推荐市场的添加按钮成功
- [ ] 已添加的市场显示"已添加"状态
- [ ] 添加成功后侧边栏刷新显示新市场
- [ ] 关闭面板后再次打开可以正常工作

**Step 3: 最终提交**

```bash
git add .
git commit -m "feat: complete marketplace discovery panel implementation"
```

---

## 验收标准

1. 用户可以通过 Sidebar 的"添加市场"命令打开发现面板
2. 面板在 Editor 区域（Beside 列）打开
3. 可以输入自定义市场来源并添加
4. 可以点击推荐市场的添加按钮
5. 已添加的市场显示"已添加"状态
6. 面板支持单例模式（复用已打开的面板）
7. 添加成功后侧边栏自动刷新
