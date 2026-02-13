import React from 'react';
import './TabView.css';

interface TabViewProps {
  activeTab: 'user' | 'project';
  onTabChange: (tab: 'user' | 'project') => void;
}

const TabView: React.FC<TabViewProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="tab-view">
      <button
        className={`tab ${activeTab === 'user' ? 'active' : ''}`}
        onClick={() => onTabChange('user')}
      >
        用户插件
      </button>
      <button
        className={`tab ${activeTab === 'project' ? 'active' : ''}`}
        onClick={() => onTabChange('project')}
      >
        项目插件
      </button>
    </div>
  );
};

export default TabView;