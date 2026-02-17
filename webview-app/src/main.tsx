import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import App from './App';
import './index.css';
import { antdTheme } from './theme/antd-theme';

declare const acquireVsCodeApi: () => any;
const vscode = acquireVsCodeApi();

// 获取初始状态
const getInitialState = () => {
  // 优先从 window.vscodeState 获取（用于兼容）
  if (typeof window !== 'undefined' && (window as any).vscodeState) {
    return (window as any).vscodeState;
  }

  // 从 URL 查询参数获取（详情面板使用这种方式避免 CSP 问题）
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const initStateParam = urlParams.get('init');
    if (initStateParam) {
      try {
        return JSON.parse(decodeURIComponent(initStateParam));
      } catch (e) {
        console.error('Failed to parse init state from URL:', e);
      }
    }
  }

  return { viewType: 'marketplace' };
};

const initialState = getInitialState();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider theme={antdTheme}>
      <App initialState={initialState} />
    </ConfigProvider>
  </React.StrictMode>
);

export default vscode;
