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
  if (typeof window !== 'undefined' && (window as any).vscodeState) {
    return (window as any).vscodeState;
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
