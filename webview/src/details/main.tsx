import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import DetailsApp from './DetailsApp';
import './details.css';
import { antdTheme } from '@/theme/antd-theme';

declare const acquireVsCodeApi: () => any;

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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider theme={antdTheme}>
      <DetailsApp />
    </ConfigProvider>
  </React.StrictMode>
);
