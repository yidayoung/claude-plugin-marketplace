import ReactDOM from 'react-dom/client';
import SidebarApp from './SidebarApp';
import './sidebar.css';

// 直接渲染，vscode API 由外部 HTML 提供并挂载到全局
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<SidebarApp />);
