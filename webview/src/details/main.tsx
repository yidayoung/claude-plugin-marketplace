import React from 'react';
import ReactDOM from 'react-dom/client';
import DetailsApp from './DetailsApp';
import './details.css';
import { L10nProvider } from '@/l10n';

declare const acquireVsCodeApi: () => any;

declare global {
  interface Window {
    __LOCALE__?: string;
    __DETAILS_INIT_STATE__?: { locale?: string };
  }
}

if ((window as Window).__DETAILS_INIT_STATE__?.locale) {
  (window as Window).__LOCALE__ = (window as Window).__DETAILS_INIT_STATE__!.locale;
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

const locale = (window as Window).__LOCALE__ || (window as Window).__DETAILS_INIT_STATE__?.locale || 'en';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <L10nProvider locale={locale}>
      <DetailsApp />
    </L10nProvider>
  </React.StrictMode>
);
