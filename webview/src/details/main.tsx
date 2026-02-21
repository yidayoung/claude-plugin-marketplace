import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import DetailsApp from './DetailsApp';
import './details.css';
import { antdTheme } from '@/theme/antd-theme';

declare const acquireVsCodeApi: () => any;
const vscode = acquireVsCodeApi();

// 将 vscode 挂载到 window，供 DetailsApp 使用
(window as any).vscode = vscode;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider theme={antdTheme}>
      <DetailsApp />
    </ConfigProvider>
  </React.StrictMode>
);
