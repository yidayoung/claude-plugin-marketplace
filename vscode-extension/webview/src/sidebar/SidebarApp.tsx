// vscode-extension/webview/src/sidebar/SidebarApp.tsx

import { useState, useEffect, useMemo } from 'react';
import { Input, Spin, Empty, Alert, Button, Divider, Typography, Space, Flex, Dropdown } from 'antd';
import {
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
  ReloadOutlined,
  CaretDownOutlined,
  CaretUpOutlined,
  SyncOutlined,
  InfoCircleOutlined,
  PoweroffOutlined,
  SettingOutlined,
  MoreOutlined,
  AppstoreOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Text } = Typography;

interface PluginData {
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

interface MarketplaceData {
  name: string;
  pluginCount?: number;
}

interface AppState {
  plugins: PluginData[];
  marketplaces: MarketplaceData[];
  loading: boolean;
  error: string | null;
  filter: {
    keyword: string;
    status: string;
    marketplace: string;
  };
}

// 声明全局 vscode API（由外部 HTML 注入）
declare const vscode: {
  postMessage: (message: any) => void;
  getState: () => any;
  setState: (state: any) => void;
};

const SidebarApp: React.FC = () => {
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

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['installed', 'available']));

  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = () => {
    vscode.postMessage({
      type: 'getPlugins',
      payload: {}
    });
  };

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

  // 过滤和分组插件
  const groupedPlugins = useMemo(() => {
    let filtered = [...state.plugins];

    if (state.filter.keyword) {
      const keyword = state.filter.keyword.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(keyword) ||
        p.description.toLowerCase().includes(keyword)
      );
    }

    if (state.filter.status === 'installed') {
      filtered = filtered.filter(p => p.installed);
    } else if (state.filter.status === 'not-installed') {
      filtered = filtered.filter(p => !p.installed);
    } else if (state.filter.status === 'upgradable') {
      filtered = filtered.filter(p => p.updateAvailable);
    }

    if (state.filter.marketplace && state.filter.marketplace !== 'all') {
      filtered = filtered.filter(p => p.marketplace === state.filter.marketplace);
    }

    const installed = filtered.filter(p => p.installed);

    const byMarketplace: Record<string, PluginData[]> = {};
    filtered.forEach(p => {
      if (!byMarketplace[p.marketplace]) {
        byMarketplace[p.marketplace] = [];
      }
      byMarketplace[p.marketplace].push(p);
    });

    installed.sort((a, b) => {
      const getPriority = (p: PluginData) => {
        let score = 0;
        if (p.installed) score += 100;
        if (p.enabled !== false) score += 50;
        if (p.updateAvailable) score += 20;
        return score;
      };

      const priorityA = getPriority(a);
      const priorityB = getPriority(b);

      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }

      return a.name.localeCompare(b.name);
    });

    return { installed, byMarketplace };
  }, [state.plugins, state.filter]);

  // 统计数据
  const stats = useMemo(() => {
    const installed = state.plugins.filter(p => p.installed).length;
    const enabled = state.plugins.filter(p => p.installed && p.enabled !== false).length;
    const updatable = state.plugins.filter(p => p.updateAvailable).length;
    return { installed, enabled, updatable, total: state.plugins.length };
  }, [state.plugins]);

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
  }, []);

  // 插件操作
  const handleInstall = (pluginName: string, marketplace: string) => {
    vscode.postMessage({
      type: 'installPlugin',
      payload: { pluginName, marketplace, scope: 'user' }
    });
  };

  const handleUninstall = (pluginName: string) => {
    vscode.postMessage({
      type: 'uninstallPlugin',
      payload: { pluginName }
    });
  };

  const handleEnable = (pluginName: string, marketplace: string) => {
    vscode.postMessage({
      type: 'enablePlugin',
      payload: { pluginName, marketplace }
    });
  };

  const handleDisable = (pluginName: string, marketplace: string) => {
    vscode.postMessage({
      type: 'disablePlugin',
      payload: { pluginName, marketplace }
    });
  };

  const handleUpdate = (pluginName: string, marketplace: string) => {
    vscode.postMessage({
      type: 'updatePlugin',
      payload: { pluginName, marketplace }
    });
  };

  const handleOpenDetails = (pluginName: string, marketplace: string) => {
    vscode.postMessage({
      type: 'openDetails',
      payload: { pluginName, marketplace }
    });
  };

  // 渲染插件项
  const renderPluginItem = (plugin: PluginData) => {
    const [isHovered, setIsHovered] = useState(false);

    const statusIcon = plugin.updateAvailable
      ? <SyncOutlined style={{ color: '#faad14' }} />
      : plugin.enabled === false
        ? <CloseCircleOutlined style={{ color: 'var(--vscode-disabledForeground)' }} />
        : <CheckCircleOutlined style={{ color: '#52c41a' }} />;

    const getActionMenu = (plugin: PluginData): MenuProps => {
      const items: MenuProps['items'] = [];

      if (plugin.installed) {
        if (plugin.enabled === false) {
          items.push({
            key: 'enable',
            label: '启用',
            icon: <PoweroffOutlined />,
            onClick: () => handleEnable(plugin.name, plugin.marketplace)
          });
        } else {
          items.push({
            key: 'disable',
            label: '禁用',
            icon: <PoweroffOutlined />,
            onClick: () => handleDisable(plugin.name, plugin.marketplace)
          });
        }
        if (plugin.updateAvailable) {
          items.push({
            key: 'update',
            label: '更新',
            icon: <ReloadOutlined />,
            onClick: () => handleUpdate(plugin.name, plugin.marketplace)
          });
        }
        items.push({
          type: 'divider'
        });
        items.push({
          key: 'uninstall',
          label: '卸载',
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () => handleUninstall(plugin.name)
        });
      } else {
        items.push({
          key: 'install',
          label: '安装',
          icon: <PlusOutlined />,
          onClick: () => handleInstall(plugin.name, plugin.marketplace)
        });
      }
      items.push({
        key: 'info',
        label: '查看详情',
        icon: <InfoCircleOutlined />,
        onClick: () => handleOpenDetails(plugin.name, plugin.marketplace)
      });

      return { items };
    };

    return (
      <div
        key={plugin.name}
        onClick={() => handleOpenDetails(plugin.name, plugin.marketplace)}
        style={{
          marginBottom: 2,
          padding: '6px 8px',
          borderRadius: 4,
          cursor: 'pointer',
          transition: 'background 0.15s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--vscode-list-hoverBackground)';
          setIsHovered(true);
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          setIsHovered(false);
        }}
      >
        <Flex align="center" gap={8}>
          <div style={{ display: 'flex', alignItems: 'center', minWidth: 16 }}>
            {statusIcon}
          </div>
          <Flex vertical gap={2} style={{ flex: 1, minWidth: 0 }}>
            <Flex align="baseline" gap={6}>
              <Text strong style={{ fontSize: 13 }}>{plugin.name}</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>v{plugin.version}</Text>
            </Flex>
            <Text type="secondary" ellipsis style={{ fontSize: 11 }}>
              {plugin.description}
            </Text>
          </Flex>
          <div
            style={{
              display: 'flex',
              gap: 2,
              opacity: isHovered ? 1 : 0,
              transition: 'opacity 0.15s'
            }}
          >
            {plugin.installed ? (
              <>
                {plugin.enabled === false && (
                  <Button
                    type="text"
                    size="small"
                    icon={<PoweroffOutlined />}
                    onClick={(e) => { e.stopPropagation(); handleEnable(plugin.name, plugin.marketplace); }}
                    title="启用"
                    style={{ padding: '0 4px', minWidth: 'auto' }}
                  />
                )}
                {plugin.updateAvailable && (
                  <Button
                    type="text"
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={(e) => { e.stopPropagation(); handleUpdate(plugin.name, plugin.marketplace); }}
                    title="更新"
                    style={{ padding: '0 4px', minWidth: 'auto' }}
                  />
                )}
                <Dropdown menu={getActionMenu(plugin)} trigger={['click']}>
                  <Button
                    type="text"
                    size="small"
                    icon={<SettingOutlined />}
                    onClick={(e) => e.stopPropagation()}
                    title="更多操作"
                    style={{ padding: '0 4px', minWidth: 'auto' }}
                  />
                </Dropdown>
              </>
            ) : (
              <>
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={(e) => { e.stopPropagation(); handleInstall(plugin.name, plugin.marketplace); }}
                  style={{ fontSize: 12 }}
                >
                  安装
                </Button>
                <Dropdown menu={getActionMenu(plugin)} trigger={['click']}>
                  <Button
                    type="text"
                    size="small"
                    icon={<SettingOutlined />}
                    onClick={(e) => e.stopPropagation()}
                    title="更多操作"
                    style={{ padding: '0 4px', minWidth: 'auto' }}
                  />
                </Dropdown>
              </>
            )}
          </div>
        </Flex>
      </div>
    );
  };

  // 渲染分组
  const renderSection = (
    title: string,
    count: number,
    sectionKey: string,
    children: React.ReactNode,
    actions?: React.ReactNode
  ) => {
    const [isHovered, setIsHovered] = useState(false);
    const isExpanded = expandedSections.has(sectionKey);
    return (
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Flex
          align="center"
          gap={4}
          style={{
            padding: '4px 8px',
            borderRadius: 4,
            cursor: 'pointer',
            transition: 'background 0.15s'
          }}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('button')) {
              return;
            }
            toggleSection(sectionKey);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--vscode-toolbar-hoverBackground)';
            setIsHovered(true);
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            setIsHovered(false);
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', fontSize: 10 }}>
            {isExpanded ? <CaretDownOutlined /> : <CaretUpOutlined />}
          </span>
          <Text strong>{title}</Text>
          <Text type="secondary">({count})</Text>
          {actions && (
            <div
              style={{
                marginLeft: 'auto',
                display: 'flex',
                gap: 2,
                opacity: isHovered ? 1 : 0,
                transition: 'opacity 0.15s'
              }}
            >
              {actions}
            </div>
          )}
        </Flex>
        {isExpanded && <div style={{ paddingLeft: 16 }}>{children}</div>}
      </Space>
    );
  };

  if (state.loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Spin size="small" tip="加载中..." />
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
      label: '刷新',
      icon: <ReloadOutlined />,
      onClick: loadPlugins
    },
    {
      key: 'addMarketplace',
      label: '添加市场',
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
      label: '全部更新',
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
            placeholder="搜索插件..."
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
              title="更多操作"
              style={{ width: 28, height: 28, padding: 0 }}
            />
          </Dropdown>
        </Flex>

        {/* 统计信息 */}
        <Flex justify="space-between" style={{ padding: '0 8px' }}>
          <Text type="secondary" style={{ fontSize: 11 }}>
            <CheckCircleOutlined style={{ marginRight: 4 }} />
            已安装 {stats.installed} / 启用 {stats.enabled}
          </Text>
          {stats.updatable > 0 && (
            <Text style={{ fontSize: 11, color: '#faad14' }}>
              <SyncOutlined style={{ marginRight: 4 }} />
              {stats.updatable} 个可更新
            </Text>
          )}
        </Flex>

        <Divider style={{ margin: '8px 0' }} />

        {/* 插件列表 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
          {groupedPlugins.installed.length === 0 && Object.keys(groupedPlugins.byMarketplace).length === 0 ? (
            <Empty
              description={state.filter.keyword ? '没有找到匹配的插件' : '暂无插件'}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <>
              {groupedPlugins.installed.length > 0 && renderSection(
                '已安装',
                groupedPlugins.installed.length,
                'installed',
                groupedPlugins.installed.map(p => renderPluginItem(p))
              )}

              {Object.keys(groupedPlugins.byMarketplace).map(marketName => {
                const plugins = groupedPlugins.byMarketplace[marketName];
                const marketActions = (
                  <>
                    <Button
                      type="text"
                      size="small"
                      icon={<ReloadOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        vscode.postMessage({
                          type: 'executeCommand',
                          payload: { command: 'claudePluginMarketplace.refreshMarketplace', args: [marketName] }
                        });
                      }}
                      title="刷新市场"
                      style={{ padding: '0 4px', minWidth: 20 }}
                    />
                    <Button
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        vscode.postMessage({
                          type: 'executeCommand',
                          payload: { command: 'claudePluginMarketplace.removeMarketplace', args: [marketName] }
                        });
                      }}
                      title="删除市场"
                      danger
                      style={{ padding: '0 4px', minWidth: 20 }}
                    />
                  </>
                );
                return renderSection(
                  marketName,
                  plugins.length,
                  `market-${marketName}`,
                  plugins.map(p => renderPluginItem(p)),
                  marketActions
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
