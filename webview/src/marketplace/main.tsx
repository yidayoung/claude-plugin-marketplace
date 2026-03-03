// vscode-extension/webview/src/marketplace/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import MarketplaceApp from './MarketplaceApp';
import '@/index.css';
import { L10nProvider } from '@/l10n';
import { initializeVSCodeEnvironment } from '@/shared/utils/vscode';

// 立即初始化 VS Code 环境
const { locale } = initializeVSCodeEnvironment();

// 渲染应用
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <L10nProvider locale={locale}>
      <MarketplaceApp />
    </L10nProvider>
  </React.StrictMode>
);
