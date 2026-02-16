import React, { useState, useEffect, useMemo } from 'react';
import { Layout, Spin, Empty, Alert, Space, Typography, Segmented } from 'antd';
import {
  LoadingOutlined,
  AppstoreOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import vscode from './main';
import PluginList from './components/PluginList';
import SearchBar from './components/SearchBar';
import FilterBar from './components/FilterBar';
import DetailsApp from './details/DetailsApp';
import './App.css';

const { Content } = Layout;
const { Title, Text } = Typography;

interface AppProps {
  initialState?: {
    viewType: string;
    pluginName?: string;
    marketplace?: string;
  };
}

interface PluginData {
  name: string;
  description: string;
  version: string;
  author?: string;
  homepage?: string;
  category?: string;
  marketplace: string;
  installed: boolean;
  enabled?: boolean;
  scope?: 'user' | 'project' | 'local';
  updateAvailable?: boolean;
}

interface AppState {
  plugins: PluginData[];
  marketplaces: string[];
  loading: boolean;
  error: string | null;
  filter: {
    keyword: string;
    status: string;
    marketplace: string;
  };
  activeTab: 'user' | 'project';
}

type ViewMode = 'all' | 'installed' | 'discover';

const App: React.FC<AppProps> = ({ initialState }) => {
  // 确定 viewType
  const viewType = initialState?.viewType || 'marketplace';

  // 如果是 details 视图，渲染 DetailsApp
  if (viewType === 'details') {
    return <DetailsApp />;
  }
  const [state, setState] = useState<AppState>({
    plugins: [],
    marketplaces: [],
    loading: true,
    error: null,
    filter: {
      keyword: '',
      status: 'all',
      marketplace: 'all'
    },
    activeTab: 'user'
  });

  const [viewMode, setViewMode] = useState<ViewMode>('all');

  useEffect(() => {
    loadPlugins();
  }, []);

  useEffect(() => {
    loadPlugins();
  }, [state.filter, state.activeTab]);

  const loadPlugins = () => {
    vscode.postMessage({
      type: 'getPlugins',
      payload: {
        filter: state.filter
      }
    });
  };

  const handleSearch = (keyword: string) => {
    setState(prev => ({
      ...prev,
      filter: { ...prev.filter, keyword }
    }));
  };

  const handleFilterChange = (status: string, marketplace: string) => {
    setState(prev => ({
      ...prev,
      filter: { ...prev.filter, status, marketplace }
    }));
  };

  // 排序和过滤插件
  const processedPlugins = useMemo(() => {
    let filtered = [...state.plugins];

    // 根据视图模式过滤
    if (viewMode === 'installed') {
      filtered = filtered.filter(p => p.installed);
    }

    // 排序规则:
    // 1. 已安装且启用 > 已安装但禁用 > 未安装
    // 2. 已安装中: 可更新 > 不可更新
    // 3. 同级按名称字母序
    filtered.sort((a, b) => {
      // 计算优先级分数（分数越高越靠前）
      const getPriority = (p: PluginData) => {
        let score = 0;
        if (p.installed) {
          score += 100; // 已安装基础分
          if (p.enabled !== false) score += 50; // 已启用额外加分
          if (p.updateAvailable) score += 20; // 可更新加分
        }
        return score;
      };

      const priorityA = getPriority(a);
      const priorityB = getPriority(b);

      if (priorityA !== priorityB) {
        return priorityB - priorityA; // 降序，分数高的在前
      }

      // 同优先级按名称字母序
      return a.name.localeCompare(b.name);
    });

    return filtered;
  }, [state.plugins, viewMode]);

  // 统计数据
  const stats = useMemo(() => {
    const installed = state.plugins.filter(p => p.installed).length;
    const updatable = state.plugins.filter(p => p.updateAvailable).length;
    return { installed, updatable, total: state.plugins.length };
  }, [state.plugins]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.type) {
        case 'plugins':
          setState(prev => ({
            ...prev,
            plugins: message.payload.plugins,
            marketplaces: message.payload.marketplaces,
            loading: false
          }));
          break;

        case 'installSuccess':
        case 'uninstallSuccess':
        case 'enableSuccess':
        case 'disableSuccess':
          loadPlugins();
          break;

        case 'error':
          setState(prev => ({
            ...prev,
            error: message.payload.message,
            loading: false
          }));
          break;

        case 'search':
          setState(prev => ({
            ...prev,
            filter: { ...prev.filter, keyword: message.payload.searchTerm }
          }));
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (state.loading) {
    return (
      <div className="loading-container">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} tip="加载中..." />
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="error-container">
        <Alert
          type="error"
          message={state.error}
          showIcon
          closable
        />
      </div>
    );
  }

  return (
    <Layout className="app-layout">
      {/* Header */}
      <header className="app-header">
        <div className="header-top">
          <div className="title-section">
            <Title level={3} style={{ margin: 0 }}>
              <ThunderboltOutlined style={{ marginRight: 8, color: 'var(--vscode-textLink-foreground)' }} />
              插件市场
            </Title>
            <Space size="large" className="stats">
              <Text type="secondary">
                <CheckCircleOutlined style={{ marginRight: 4 }} />
                已安装 {stats.installed}
              </Text>
              {stats.updatable > 0 && (
                <Text style={{ color: '#faad14' }}>
                  {stats.updatable} 个可更新
                </Text>
              )}
              <Text type="secondary">共 {stats.total} 个</Text>
            </Space>
          </div>

          <Segmented
            value={viewMode}
            onChange={(value) => setViewMode(value as ViewMode)}
            options={[
              { label: '全部', value: 'all', icon: <AppstoreOutlined /> },
              { label: `已安装 (${stats.installed})`, value: 'installed', icon: <CheckCircleOutlined /> },
              { label: '发现', value: 'discover', icon: <ThunderboltOutlined /> }
            ]}
            size="large"
          />
        </div>

        <SearchBar onSearch={handleSearch} />
        <FilterBar
          status={state.filter.status}
          marketplace={state.filter.marketplace}
          marketplaces={state.marketplaces}
          onFilterChange={handleFilterChange}
        />
      </header>

      {/* Content */}
      <Content className="app-content">
        {processedPlugins.length === 0 ? (
          <Empty
            description={viewMode === 'installed' ? '还没有安装任何插件' : '没有找到插件'}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <PluginList plugins={processedPlugins} activeTab={state.activeTab} />
        )}
      </Content>
    </Layout>
  );
};

export default App;
