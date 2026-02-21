// vscode-extension/webview/src/details/DetailsApp.tsx

import React, { useState, useEffect } from 'react';
import { Spin, Alert, Button } from 'antd';
import { ReloadOutlined, LoadingOutlined } from '@ant-design/icons';
import DetailHeader from './DetailHeader';
import DetailContent from './DetailContent';

// 从 window 获取 vscode API（由 details/main.tsx 注入）
declare const vscode: {
  postMessage: (message: any) => void;
};

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
  agents?: AgentInfo[];
  hooks?: HookInfo[];
  mcps?: McpInfo[];
  commands?: CommandInfo[];
  lsps?: LspInfo[];
  outputStyles?: OutputStyleInfo[];
  repository?: RepositoryInfo;
  dependencies?: string[];
  license?: string;
}

export interface SkillInfo {
  name: string;
  description?: string;
  filePath?: string;
}

export interface AgentInfo {
  name: string;
  description?: string;
  filePath?: string;
}

export interface HookInfo {
  event: string;
  filePath?: string;
  hooks: HookConfig[];
}

export interface HookConfig {
  type: string;
  matcher?: string;
  command?: string;
  skill?: string;
}

export interface McpInfo {
  name: string;
  filePath?: string;
}

export interface LspInfo {
  language: string;
  filePath?: string;
}

export interface CommandInfo {
  name: string;
  description?: string;
  filePath?: string;
}

export interface OutputStyleInfo {
  name: string;
  filePath?: string;
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
  const [messageReceived, setMessageReceived] = useState(false);
  const [readyNotified, setReadyNotified] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      console.log('[DetailsApp] Received message:', message.type);
      switch (message.type) {
        case 'pluginDetail':
          console.log('[DetailsApp] Plugin detail data:', message.payload);
          setPlugin(message.payload.plugin);
          setLoading(false);
          setError(null);
          setMessageReceived(true);
          break;
        case 'error':
          setError(message.payload.message);
          setLoading(false);
          setMessageReceived(true);
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    // 通知扩展侧 webview 已准备好接收数据
    if (!readyNotified) {
      console.log('[DetailsApp] Sending ready message to extension');
      vscode.postMessage({ type: 'ready' });
      setReadyNotified(true);
    }

    // 添加超时处理：如果 30 秒后还没收到消息，显示错误
    const timeoutId = setTimeout(() => {
      if (!messageReceived) {
        console.error('[DetailsApp] Timeout waiting for plugin data');
        setError('加载插件详情超时，请重试');
        setLoading(false);
      }
    }, 30000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timeoutId);
    };
  }, [readyNotified]);

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

  const handleOpenFile = (filePath: string) => {
    vscode.postMessage({
      type: 'openFile',
      payload: { filePath }
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
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      <DetailHeader
        plugin={plugin}
        onInstall={handleInstall}
        onUninstall={handleUninstall}
        onEnable={handleEnable}
        onDisable={handleDisable}
        onOpenExternal={handleOpenExternal}
        onCopy={handleCopy}
      />
      <DetailContent plugin={plugin} onOpenFile={handleOpenFile} />
    </div>
  );
};

export default DetailsApp;
