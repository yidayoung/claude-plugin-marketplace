import React from 'react';
import vscode from '../main';
import './PluginCard.css';

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

interface PluginCardProps {
  plugin: PluginData;
  activeTab: 'user' | 'project';
}

const PluginCard: React.FC<PluginCardProps> = ({ plugin }) => {
  const handleInstall = (scope: 'user' | 'project' | 'local') => {
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
    vscode.postMessage({
      type: 'uninstallPlugin',
      payload: {
        pluginName: plugin.name
      }
    });
  };

  const getScopeLabel = (scope?: string) => {
    switch (scope) {
      case 'user': return '用户';
      case 'project': return '项目';
      case 'local': return '本地';
      default: return '';
    }
  };

  return (
    <div className="plugin-card">
      <div className="plugin-header">
        <h3 className="plugin-name">{plugin.name}</h3>
        <span className="plugin-version">v{plugin.version}</span>
      </div>

      <p className="plugin-description">{plugin.description}</p>

      <div className="plugin-meta">
        {plugin.author && <span className="plugin-author">作者: {plugin.author}</span>}
        {plugin.category && <span className="plugin-category">{plugin.category}</span>}
        <span className="plugin-marketplace">{plugin.marketplace}</span>
      </div>

      <div className="plugin-actions">
        {plugin.installed ? (
          <>
            {plugin.scope && (
              <span className="plugin-scope">
                ✅ 已安装到 {getScopeLabel(plugin.scope)}
              </span>
            )}
            <button onClick={handleUninstall} className="uninstall-button">
              卸载
            </button>
          </>
        ) : (
          <select
            onChange={(e) => handleInstall(e.target.value as any)}
            className="install-select"
            value=""
          >
            <option value="" disabled>选择安装范围</option>
            <option value="user">安装到用户</option>
            <option value="project">安装到项目</option>
            <option value="local">安装到本地</option>
          </select>
        )}
      </div>
    </div>
  );
};

export default PluginCard;