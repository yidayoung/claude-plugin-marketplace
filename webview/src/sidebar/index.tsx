// vscode-extension/webview/src/sidebar/index.tsx

import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import SidebarApp from './SidebarApp';
import './sidebar.css';
import { antdTheme } from '@/theme/antd-theme';

// 直接渲染，vscode API 由外部 HTML 提供并挂载到全局
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <ConfigProvider theme={antdTheme}>
    <SidebarApp />
  </ConfigProvider>
);
