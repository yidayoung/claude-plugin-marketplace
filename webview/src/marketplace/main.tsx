// vscode-extension/webview/src/marketplace/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import MarketplaceApp from './MarketplaceApp';
import { L10nProvider } from '@/l10n';

declare const acquireVsCodeApi: () => any;

declare global {
  interface Window {
    __LOCALE__?: string;
    __MARKETPLACE_INIT_STATE__?: { locale?: string };
    vscode: {
      postMessage: (message: any) => void;
      getState: () => any;
      setState: (state: any) => void;
    };
  }
}

// 从初始化状态获取 locale
if ((window as Window).__MARKETPLACE_INIT_STATE__?.locale) {
  (window as Window).__LOCALE__ = (window as Window).__MARKETPLACE_INIT_STATE__!.locale;
}

// 获取 vscode API（确保在任何时候都能获取）
const getVSCodeApi = () => {
  if ((window as Window).vscode) {
    return (window as Window).vscode;
  }
  try {
    const vscode = acquireVsCodeApi();
    (window as Window).vscode = vscode;
    return vscode;
  } catch (e) {
    console.warn('[main] Failed to acquire vscode API:', e);
    return null;
  }
};

// 立即初始化 vscode API
getVSCodeApi();

const locale = (window as Window).__LOCALE__ || (window as Window).__MARKETPLACE_INIT_STATE__?.locale || 'en';

// 渲染应用
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <L10nProvider locale={locale}>
      <MarketplaceApp />
    </L10nProvider>
  </React.StrictMode>
);
