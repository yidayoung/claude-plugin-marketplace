import React from 'react';
import PluginCard from './PluginCard';

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 20px' }}>
        <p>暂无插件</p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
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