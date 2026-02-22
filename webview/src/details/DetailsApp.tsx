// vscode-extension/webview/src/details/DetailsApp.tsx

import React, { useState, useEffect, useRef } from 'react';
import { Spin, Alert, Button } from 'antd';
import { ReloadOutlined, LoadingOutlined } from '@ant-design/icons';
import DetailHeader from './DetailHeader';
import DetailContent from './DetailContent';

// 从 window 获取 vscode API（由 details/main.tsx 注入）
declare const vscode: {
  postMessage: (message: any) => void;
};

// 本地类型定义
export interface MarketplaceSource {
  source: 'github' | 'url' | 'directory' | 'git';
  repo?: string;
  url?: string;
}

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
  isRemoteSource?: boolean;
  localPath?: string;
  marketplaceSource?: MarketplaceSource;
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
  const [readyNotified, setReadyNotified] = useState(false);
  const messageReceivedRef = useRef(false); // 使用 ref 避免闭包问题

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case 'pluginDetail':
          setPlugin(message.payload.plugin);
          setLoading(false);
          setError(null);
          messageReceivedRef.current = true; // 标记已收到消息
          break;
        case 'starsUpdate':
          // 星标数据变更时，请求完整重新拉取（而不是精细化更新）
          vscode.postMessage({
            type: 'refreshPluginDetail'
          });
          break;
        case 'statusUpdate':
          // 状态变更时，请求扩展侧重新发送完整的插件详情
          vscode.postMessage({
            type: 'refreshPluginDetail'
          });
          break;
        case 'error':
          setError(message.payload.message);
          setLoading(false);
          messageReceivedRef.current = true;
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    // 通知扩展侧 webview 已准备好接收数据
    if (!readyNotified) {
      vscode.postMessage({ type: 'ready' });
      setReadyNotified(true);
    }

    // 添加超时处理：如果 30 秒后还没收到消息，只停止加载状态
    // 不会覆盖已加载的插件内容
    const timeoutId = setTimeout(() => {
      if (!messageReceivedRef.current) { // 使用 ref 检查最新的状态
        console.error('[DetailsApp] Timeout waiting for plugin data');
        setLoading(false); // 停止加载状态，但不设置 error
        // 不设置 setError，避免覆盖已显示的插件内容
      }
    }, 30000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timeoutId);
    };
  }, [readyNotified]); // 只依赖 readyNotified，确保 effect 只执行一次

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

  const handleOpenFile = (filePath: string) => {
    vscode.postMessage({
      type: 'openFile',
      payload: { filePath }
    });
  };

  const handleOpenDirectory = (directoryPath: string) => {
    vscode.postMessage({
      type: 'openDirectory',
      payload: { directoryPath }
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} tip="加载插件详情..." />
      </div>
    );
  }

  // 只有在没有任何插件数据时才显示错误页面
  if (!plugin && error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          type="error"
          description={error}
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

  // 没有插件数据且没有错误
  if (!plugin) {
    return (
      <div style={{ padding: 24 }}>
        <Alert description="未找到插件信息" type="warning" showIcon />
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 1200, minWidth: 800, margin: '0 auto' }}>
      {/* 如果有插件数据但有错误，在顶部显示警告（不覆盖内容） */}
      {error && (
        <Alert
          type="warning"
          description={error}
          closable
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}
      <DetailHeader
        plugin={plugin}
        onInstall={handleInstall}
        onUninstall={handleUninstall}
        onEnable={handleEnable}
        onDisable={handleDisable}
        onOpenExternal={handleOpenExternal}
        onOpenDirectory={handleOpenDirectory}
      />
      <DetailContent plugin={plugin} onOpenFile={handleOpenFile} />
    </div>
  );
};

export default DetailsApp;
