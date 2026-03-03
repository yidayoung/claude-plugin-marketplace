import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '../components';
import DetailHeader from './DetailHeader';
import DetailContent from './DetailContent';
import { useL10n } from '../l10n';
import type { Source } from '../types/sourceTypes';
import { logger } from '../shared/utils/logger';

// 从 window 获取 vscode API
declare const vscode: {
  postMessage: (message: any) => void;
};

export type MarketplaceSource = Source;

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

export default function DetailsApp() {
  const { t } = useL10n();
  const [plugin, setPlugin] = useState<PluginDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readyNotified, setReadyNotified] = useState(false);
  const messageReceivedRef = useRef(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case 'pluginDetail':
          setPlugin(message.payload.plugin);
          setLoading(false);
          setError(null);
          messageReceivedRef.current = true;
          break;
        case 'detailUpdate':
        case 'statusUpdate':
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

    if (!readyNotified) {
      vscode.postMessage({ type: 'ready' });
      setReadyNotified(true);
    }

    const timeoutId = setTimeout(() => {
      if (!messageReceivedRef.current) {
        logger.error('[DetailsApp] Timeout waiting for plugin data');
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
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <RefreshCw className="w-8 h-8 animate-spin" />
          <span className="text-sm">{t('detail.loading')}</span>
        </div>
      </div>
    );
  }

  if (!plugin && error) {
    return (
      <div className="p-6">
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">{error}</p>
              </div>
            </div>
            <Button size="sm" variant="destructive" onClick={() => window.location.reload()}>
              <RefreshCw className="w-3 h-3 mr-1" />
              {t('detail.retry')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!plugin) {
    return (
      <div className="p-6">
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            <p className="text-yellow-500">{t('detail.notFound')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 max-w-[1200px] min-w-[800px] mx-auto">
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-yellow-500" />
            <span className="text-yellow-500">{error}</span>
          </div>
        </div>
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
}
