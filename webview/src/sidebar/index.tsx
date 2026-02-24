import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import SidebarApp from './SidebarApp';
import './sidebar.css';
import { antdTheme } from '@/theme/antd-theme';
import { L10nProvider } from '@/l10n';

const locale = (window as any).__LOCALE__ || 'en';
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <ConfigProvider theme={antdTheme}>
    <L10nProvider locale={locale}>
      <SidebarApp />
    </L10nProvider>
  </ConfigProvider>
);
