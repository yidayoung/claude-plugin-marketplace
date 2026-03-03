import ReactDOM from 'react-dom/client';
import SidebarApp from './SidebarApp';
import './sidebar.css';
import { L10nProvider } from '@/l10n';

const locale = (window as any).__LOCALE__ || 'en';
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <L10nProvider locale={locale}>
    <SidebarApp />
  </L10nProvider>
);
