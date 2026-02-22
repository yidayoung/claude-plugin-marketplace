import { useState, useEffect, useCallback } from 'react';

export interface PluginData {
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

export interface MarketplaceData {
  name: string;
  pluginCount?: number;
}

export interface FilterState {
  keyword: string;
  status: string;
  marketplace: string;
}

export interface AppState {
  plugins: PluginData[];
  marketplaces: MarketplaceData[];
  loading: boolean;
  error: string | null;
  filter: FilterState;
}

// 声明全局 vscode API（由外部 HTML 注入）
declare const vscode: {
  postMessage: (message: any) => void;
  getState: () => any;
  setState: (state: any) => void;
};

export function usePluginData() {
  const [state, setState] = useState<AppState>({
    plugins: [],
    marketplaces: [],
    loading: true,
    error: null,
    filter: {
      keyword: '',
      status: 'all',
      marketplace: 'all'
    }
  });

  const loadPlugins = useCallback(() => {
    vscode.postMessage({
      type: 'getPlugins',
      payload: {}
    });
  }, []);

  useEffect(() => {
    loadPlugins();
  }, [loadPlugins]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.type) {
        case 'plugins':
          setState(prev => ({
            ...prev,
            plugins: message.payload.plugins,
            marketplaces: message.payload.marketplaces.map((name: string) => ({
              name,
              pluginCount: message.payload.plugins.filter((p: PluginData) => p.marketplace === name).length
            })),
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

        case 'refresh':
          loadPlugins();
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [loadPlugins]);

  return { state, loadPlugins, setState };
}
