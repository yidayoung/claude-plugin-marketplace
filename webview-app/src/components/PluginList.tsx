import React from 'react';
import PluginCard from './PluginCard';
import './PluginList.css';

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

interface PluginListProps {
  plugins: PluginData[];
  activeTab: 'user' | 'project';
}

const PluginList: React.FC<PluginListProps> = ({ plugins, activeTab }) => {
  if (plugins.length === 0) {
    return (
      <div className="plugin-list-empty">
        <p>暂无插件</p>
      </div>
    );
  }

  return (
    <div className="plugin-list">
      {plugins.map(plugin => (
        <PluginCard
          key={`${plugin.marketplace}-${plugin.name}`}
          plugin={plugin}
          activeTab={activeTab}
        />
      ))}
    </div>
  );
};

export default PluginList;