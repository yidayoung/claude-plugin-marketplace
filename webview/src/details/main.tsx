import React from 'react';
import ReactDOM from 'react-dom/client';
import DetailsApp from './DetailsApp';
import './details.css';
import { L10nProvider } from '@/l10n';
import { initializeVSCodeEnvironment } from '@/shared/utils/vscode';

// 立即初始化 VS Code 环境
const { locale } = initializeVSCodeEnvironment();
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <L10nProvider locale={locale}>
      <DetailsApp />
    </L10nProvider>
  </React.StrictMode>
);
