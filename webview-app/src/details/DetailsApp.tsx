// webview-app/src/details/DetailsApp.tsx

import React, { useState, useEffect } from 'react';
import { Spin, Alert, Button } from 'antd';
import { ReloadOutlined, LoadingOutlined } from '@ant-design/icons';
import vscode from '../main';
import DetailHeader from './DetailHeader';
import DetailContent from './DetailContent';

// 本地类型定义
export interface PluginDetailData {
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
  readme?: string;
  skills?: SkillInfo[];
  hooks?: HookInfo[];
  mcps?: McpInfo[];
  commands?: CommandInfo[];
  repository?: RepositoryInfo;
  dependencies?: string[];
  license?: string;
}

export interface SkillInfo {
  name: string;
  description: string;
  category?: string;
}

export interface HookInfo {
  name: string;
  events: string[];
  description?: string;
}

export interface McpInfo {
  name: string;
  description?: string;
}

export interface CommandInfo {
  name: string;
  description?: string;
}

export interface RepositoryInfo {
  type: 'github' | 'gitlab' | 'other';
  url: string;
  stars?: number;
}

const DetailsApp: React.FC = () => {
  const [plugin, setPlugin] = useState<PluginDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case 'pluginDetail':
          setPlugin(message.payload.plugin);
          setLoading(false);
          setError(null);
          break;
        case 'error':
          setError(message.payload.message);
          setLoading(false);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleInstall = (scope: 'user' | 'project') => {
    if (!plugin) return;
    vscode.postMessage({
      type: 'installPlugin',
      payload: {
        pluginName: plugin.name,
        marketplace: plugin.marketplace,
        scope
      }
    });
  };

  const handleUninstall = () => {
    if (!plugin) return;
    vscode.postMessage({
      type: 'uninstallPlugin',
      payload: { pluginName: plugin.name }
    });
  };

  const handleEnable = () => {
    if (!plugin) return;
    vscode.postMessage({
      type: 'enablePlugin',
      payload: { pluginName: plugin.name, marketplace: plugin.marketplace }
    });
  };

  const handleDisable = () => {
    if (!plugin) return;
    vscode.postMessage({
      type: 'disablePlugin',
      payload: { pluginName: plugin.name, marketplace: plugin.marketplace }
    });
  };

  const handleOpenExternal = (url: string) => {
    vscode.postMessage({
      type: 'openExternal',
      payload: { url }
    });
  };

  const handleCopy = (text: string) => {
    vscode.postMessage({
      type: 'copyToClipboard',
      payload: { text }
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} tip="加载插件详情..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          type="error"
          message={error}
          action={
            <Button size="small" danger onClick={() => window.location.reload()}>
              <ReloadOutlined /> 重试
            </Button>
          }
          showIcon
        />
      </div>
    );
  }

  if (!plugin) {
    return (
      <div style={{ padding: 24 }}>
        <Alert message="未找到插件信息" type="warning" showIcon />
      </div>
    );
  }

  return (
    <div className="details-app">
      <DetailHeader
        plugin={plugin}
        onInstall={handleInstall}
        onUninstall={handleUninstall}
        onEnable={handleEnable}
        onDisable={handleDisable}
        onOpenExternal={handleOpenExternal}
        onCopy={handleCopy}
      />
      <DetailContent plugin={plugin} />
    </div>
  );
};

export default DetailsApp;
