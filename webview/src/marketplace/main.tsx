// vscode-extension/webview/src/marketplace/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import MarketplaceApp from './MarketplaceApp';
import { L10nProvider } from '@/l10n';
import { antdTheme } from '@/theme/antd-theme';

declare const acquireVsCodeApi: () => any;

declare global {
  interface Window {
    __LOCALE__?: string;
    __MARKETPLACE_INIT_STATE__?: { locale?: string };
  }
}

// 从初始化状态获取 locale
if ((window as Window).__MARKETPLACE_INIT_STATE__?.locale) {
  (window as Window).__LOCALE__ = (window as Window).__MARKETPLACE_INIT_STATE__!.locale;
}

// 获取 vscode API,如果已经存在则不重复获取
if (!(window as any).vscode) {
  try {
    const vscode = acquireVsCodeApi();
    (window as any).vscode = vscode;
  } catch (e) {
    // 在开发环境下,HMR 可能导致此错误,可以忽略
    console.warn('Failed to acquire vscode API:', e);
  }
}

const locale = (window as Window).__LOCALE__ || (window as Window).__MARKETPLACE_INIT_STATE__?.locale || 'en';

// 渲染应用
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider theme={antdTheme}>
      <L10nProvider locale={locale}>
        <MarketplaceApp />
      </L10nProvider>
    </ConfigProvider>
  </React.StrictMode>
);
