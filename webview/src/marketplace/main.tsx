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
