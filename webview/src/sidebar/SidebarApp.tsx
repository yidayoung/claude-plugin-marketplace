// vscode-extension/webview/src/sidebar/SidebarApp.tsx

import { useState } from 'react';
import { Input, Spin, Empty, Alert, Button, Divider, Typography, Flex, Dropdown } from 'antd';
import {
  SearchOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  MoreOutlined,
  AppstoreOutlined,
  SyncOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

import { usePluginData, usePluginFilter, useHoverState } from '../hooks';
import { PluginItem, PluginSection, MarketSectionActions } from '../components';
import { useL10n } from '../l10n';

const { Text } = Typography;

// 声明全局 vscode API（由外部 HTML 注入）
declare const vscode: {
  postMessage: (message: any) => void;
  getState: () => any;
  setState: (state: any) => void;
};

const SidebarApp: React.FC = () => {
  const { t } = useL10n();
  const { state, loadPlugins, setState } = usePluginData();
  const { groupedPlugins, stats } = usePluginFilter(state.plugins, state.filter);
  const { isHovered, setHovered } = useHoverState();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['installed', 'available']));

  const handleSearch = (keyword: string) => {
    setState(prev => ({
      ...prev,
      filter: { ...prev.filter, keyword }
    }));
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  if (state.loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Spin size="small" tip={t('sidebar.loading')} />
      </div>
    );
  }

  if (state.error) {
    return (
      <div style={{ padding: 8 }}>
        <Alert
          type="error"
          message={state.error}
          showIcon
          closable
        />
      </div>
    );
  }

  // 设置菜单项
  const settingsMenuItems: MenuProps['items'] = [
    {
      key: 'refresh',
      label: t('sidebar.refresh'),
      icon: <ReloadOutlined />,
      onClick: loadPlugins
    },
    {
      key: 'addMarketplace',
      label: t('sidebar.addMarketplace'),
      icon: <AppstoreOutlined />,
      onClick: () => {
        vscode.postMessage({
          type: 'executeCommand',
          payload: { command: 'claudePluginMarketplace.addMarketplace' }
        });
      }
    },
    {
      type: 'divider'
    },
    {
      key: 'updateAll',
      label: t('sidebar.updateAll'),
      icon: <SyncOutlined />,
      onClick: () => {
        state.plugins.filter(p => p.updateAvailable).forEach(p => {
          vscode.postMessage({
            type: 'updatePlugin',
            payload: { pluginName: p.name, marketplace: p.marketplace }
          });
        });
      }
    }
  ];

  return (
    <>
      <Flex vertical style={{ height: '100%', overflow: 'hidden' }}>
        {/* 搜索栏 + 设置按钮 */}
        <Flex align="center" gap={4} style={{ padding: '6px 8px' }}>
          <Input
            placeholder={t('sidebar.searchPlaceholder')}
            value={state.filter.keyword}
            onChange={(e) => handleSearch(e.target.value)}
            prefix={<SearchOutlined />}
            allowClear
            size="small"
            style={{ flex: 1 }}
          />
          <Dropdown menu={{ items: settingsMenuItems }} trigger={['click']} placement="bottomRight">
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
              title={t('sidebar.moreActions')}
              style={{ width: 28, height: 28, padding: 0 }}
            />
          </Dropdown>
        </Flex>

        {/* 统计信息 */}
        <Flex justify="space-between" style={{ padding: '0 8px' }}>
          <Text type="secondary" style={{ fontSize: 11 }}>
            <CheckCircleOutlined style={{ marginRight: 4 }} />
            {t('sidebar.installedEnabled', String(stats.installed), String(stats.enabled))}
          </Text>
          {stats.updatable > 0 && (
            <Text style={{ fontSize: 11, color: '#faad14' }}>
              <SyncOutlined style={{ marginRight: 4 }} />
              {t('sidebar.updatableCount', String(stats.updatable))}
            </Text>
          )}
        </Flex>

        <Divider style={{ margin: '8px 0' }} />

        {/* 插件列表 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
          {groupedPlugins.installed.length === 0 && Object.keys(groupedPlugins.byMarketplace).length === 0 ? (
            <Empty
              description={state.filter.keyword ? t('sidebar.noMatch') : t('sidebar.noPlugins')}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <>
              {groupedPlugins.installed.length > 0 && (
                <PluginSection
                  title={t('sidebar.installed')}
                  count={groupedPlugins.installed.length}
                  sectionKey="installed"
                  isExpanded={expandedSections.has('installed')}
                  isHovered={isHovered('section-installed')}
                  onToggle={toggleSection}
                  onHoverChange={setHovered}
                >
                  {groupedPlugins.installed.map(plugin => (
                    <PluginItem
                      key={plugin.name}
                      plugin={plugin}
                      isHovered={isHovered(`plugin-${plugin.name}`)}
                      onHoverChange={setHovered}
                    />
                  ))}
                </PluginSection>
              )}

              {Object.keys(groupedPlugins.byMarketplace).map(marketName => {
                const plugins = groupedPlugins.byMarketplace[marketName];
                return (
                  <PluginSection
                    key={marketName}
                    title={marketName}
                    count={plugins.length}
                    sectionKey={`market-${marketName}`}
                    isExpanded={expandedSections.has(`market-${marketName}`)}
                    isHovered={isHovered(`section-market-${marketName}`)}
                    onToggle={toggleSection}
                    onHoverChange={setHovered}
                    actions={<MarketSectionActions marketName={marketName} />}
                  >
                    {plugins.map(plugin => (
                      <PluginItem
                        key={plugin.name}
                        plugin={plugin}
                        isHovered={isHovered(`plugin-${plugin.name}`)}
                        onHoverChange={setHovered}
                      />
                    ))}
                  </PluginSection>
                );
              })}
            </>
          )}
        </div>
      </Flex>
    </>
  );
};

export default SidebarApp;
