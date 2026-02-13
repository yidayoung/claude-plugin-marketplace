import React, { useState, useEffect } from 'react';
import vscode from './main';
import PluginList from './components/PluginList';
import SearchBar from './components/SearchBar';
import FilterBar from './components/FilterBar';
import TabView from './components/TabView';
import './App.css';

interface PluginData {
  name: string;
  description: string;
  version: string;
  author?: string;
  homepage?: string;
  category?: string;
  marketplace: string;
  installed: boolean;
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

const App: React.FC = () => {
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

  const handleTabChange = (tab: 'user' | 'project') => {
    setState(prev => ({ ...prev, activeTab: tab }));
  };

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
          loadPlugins();
          break;

        case 'error':
          setState(prev => ({
            ...prev,
            error: message.payload.message,
            loading: false
          }));
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (state.loading) {
    return <div className="loading">加载中...</div>;
  }

  if (state.error) {
    return <div className="error">{state.error}</div>;
  }

  return (
    <div className="app">
      <SearchBar onSearch={handleSearch} />
      <FilterBar
        status={state.filter.status}
        marketplace={state.filter.marketplace}
        marketplaces={state.marketplaces}
        onFilterChange={handleFilterChange}
      />
      <TabView activeTab={state.activeTab} onTabChange={handleTabChange} />
      <PluginList plugins={state.plugins} activeTab={state.activeTab} />
    </div>
  );
};

export default App;