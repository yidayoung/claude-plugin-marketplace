import { useState, useEffect, useMemo } from 'react';
import { Input, Spin, Empty, Alert, Button, Divider, Typography, ConfigProvider } from 'antd';
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
import { Dropdown } from 'antd';

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

  // 筛选完全在前端进行，不需要根据 filter 变化重新请求后端

  const loadPlugins = () => {
    vscode.postMessage({
      type: 'getPlugins',
      payload: {} // 不传 filter，获取所有插件
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

    // 关键词过滤
    if (state.filter.keyword) {
      const keyword = state.filter.keyword.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(keyword) ||
        p.description.toLowerCase().includes(keyword)
      );
    }

    // 状态过滤
    if (state.filter.status === 'installed') {
      filtered = filtered.filter(p => p.installed);
    } else if (state.filter.status === 'not-installed') {
      filtered = filtered.filter(p => !p.installed);
    } else if (state.filter.status === 'upgradable') {
      filtered = filtered.filter(p => p.updateAvailable);
    }

    // 市场过滤
    if (state.filter.marketplace && state.filter.marketplace !== 'all') {
      filtered = filtered.filter(p => p.marketplace === state.filter.marketplace);
    }

    // 分组
    const installed = filtered.filter(p => p.installed);

    // 按市场分组所有插件（包括已安装和未安装）
    const byMarketplace: Record<string, PluginData[]> = {};
    filtered.forEach(p => {
      if (!byMarketplace[p.marketplace]) {
        byMarketplace[p.marketplace] = [];
      }
      byMarketplace[p.marketplace].push(p);
    });

    // 排序：已启用 > 已禁用 > 可更新 > 按名称
    installed.sort((a, b) => {
      // 优先级分数计算
      const getPriority = (p: PluginData) => {
        let score = 0;
        if (p.installed) score += 100;
        if (p.enabled !== false) score += 50; // 已启用额外加分
        if (p.updateAvailable) score += 20; // 可更新加分
        return score;
      };

      const priorityA = getPriority(a);
      const priorityB = getPriority(b);

      if (priorityA !== priorityB) {
        return priorityB - priorityA; // 降序，分数高的在前
      }

      // 同优先级按名称字母序
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
    console.log('[SidebarApp] Sending openDetails message:', { pluginName, marketplace });
    vscode.postMessage({
      type: 'openDetails',
      payload: { pluginName, marketplace }
    });
  };

  // 渲染插件项
  const renderPluginItem = (plugin: PluginData) => {
    const statusIcon = plugin.updateAvailable
      ? <SyncOutlined style={{ color: '#faad14' }} />
      : plugin.enabled === false
        ? <CloseCircleOutlined style={{ color: '#8c8c8c' }} />
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
      <div key={plugin.name} className="sidebar-plugin-item">
        <div className="plugin-item-main" onClick={() => handleOpenDetails(plugin.name, plugin.marketplace)}>
          <div className="plugin-item-icon">{statusIcon}</div>
          <div className="plugin-item-content">
            <div className="plugin-item-header">
              <Text strong className="plugin-name">{plugin.name}</Text>
              <Text type="secondary" className="plugin-version">v{plugin.version}</Text>
            </div>
            <Text type="secondary" className="plugin-description" ellipsis>
              {plugin.description}
            </Text>
          </div>
          <div className="plugin-item-actions">
            {plugin.installed ? (
              <>
                {plugin.enabled === false && (
                  <Button
                    type="text"
                    size="small"
                    icon={<PoweroffOutlined />}
                    onClick={(e) => { e.stopPropagation(); handleEnable(plugin.name, plugin.marketplace); }}
                    title="启用"
                  />
                )}
                {plugin.updateAvailable && (
                  <Button
                    type="text"
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={(e) => { e.stopPropagation(); handleUpdate(plugin.name, plugin.marketplace); }}
                    title="更新"
                  />
                )}
                {/* 设置按钮 - 齿轮图标 */}
                <Dropdown menu={getActionMenu(plugin)} trigger={['click']}>
                  <Button
                    type="text"
                    size="small"
                    icon={<SettingOutlined />}
                    onClick={(e) => e.stopPropagation()}
                    title="更多操作"
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
                >
                  安装
                </Button>
                {/* 未安装插件也有设置按钮 */}
                <Dropdown menu={getActionMenu(plugin)} trigger={['click']}>
                  <Button
                    type="text"
                    size="small"
                    icon={<SettingOutlined />}
                    onClick={(e) => e.stopPropagation()}
                    title="更多操作"
                  />
                </Dropdown>
              </>
            )}
          </div>
        </div>
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
    const isExpanded = expandedSections.has(sectionKey);
    return (
      <div className="sidebar-section">
        <div
          className="sidebar-section-header"
          onClick={(e) => {
            // 如果点击的是操作按钮，不切换展开/收起
            if ((e.target as HTMLElement).closest('.section-actions')) {
              return;
            }
            toggleSection(sectionKey);
          }}
        >
          <span className="section-icon">
            {isExpanded ? <CaretDownOutlined /> : <CaretUpOutlined />}
          </span>
          <Text strong>{title}</Text>
          <Text type="secondary">({count})</Text>
          {actions && <div className="section-actions">{actions}</div>}
        </div>
        {isExpanded && <div className="sidebar-section-content">{children}</div>}
      </div>
    );
  };

  if (state.loading) {
    return (
      <div className="sidebar-loading">
        <Spin size="small" tip="加载中..." />
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="sidebar-error">
        <Alert
          type="error"
          message={state.error}
          showIcon
          closable
        />
      </div>
    );
  }

  // 从 VSCode CSS 变量获取主题颜色
  const getVsCodeColor = (varName: string, fallback: string) => {
    if (typeof window === 'undefined') return fallback;
    const style = getComputedStyle(document.body);
    return style.getPropertyValue(varName).trim() || fallback;
  };

  // 构建主题 token 配置
  const themeConfig = {
    token: {
      // 主色调
      colorPrimary: getVsCodeColor('--vscode-button-background', '#007acc'),
      colorPrimaryHover: getVsCodeColor('--vscode-button-hoverBackground', '#0062a3'),
      colorText: getVsCodeColor('--vscode-foreground', '#cccccc'),
      colorTextSecondary: getVsCodeColor('--vscode-descriptionForeground', '#858585'),
      colorTextTertiary: getVsCodeColor('--vscode-descriptionForeground', '#858585'),
      colorBgContainer: getVsCodeColor('--vscode-sideBar-background', '#252526'),
      colorBgElevated: getVsCodeColor('--vscode-dropdown-background', '#3c3c3c'),
      colorBgLayout: getVsCodeColor('--vscode-sideBar-background', '#252526'),
      colorBorder: getVsCodeColor('--vscode-widget-border', '#454545'),
      colorBorderSecondary: getVsCodeColor('--vscode-widget-border', '#454545'),
      // 输入框
      colorBgContainerDisabled: getVsCodeColor('--vscode-input-background', '#3c3c3c'),
      colorTextPlaceholder: getVsCodeColor('--vscode-input-placeholderForeground', '#858585'),
      // 下拉菜单
      colorBgSpotlight: getVsCodeColor('--vscode-list-activeSelectionBackground', '#094771'),
      colorTextLightSolid: getVsCodeColor('--vscode-list-activeSelectionForeground', '#ffffff'),
      // 选中/悬停
      colorFillContent: getVsCodeColor('--vscode-list-hoverBackground', '#2a2d2e'),
      colorFillAlter: getVsCodeColor('--vscode-list-hoverBackground', '#2a2d2e'),
      // 禁用状态
      colorTextDisabled: getVsCodeColor('--vscode-disabledForeground', '#858585'),
      // 错误/警告
      colorError: getVsCodeColor('--vscode-errorForeground', '#f14c4c'),
      colorWarning: getVsCodeColor('--vscode-editorWarning-foreground', '#ffa600'),
      colorSuccess: getVsCodeColor('--vscode-terminal-ansiGreen', '#89d185'),
      // 字体
      fontFamily: getVsCodeColor('--vscode-font-family', 'system-ui, -apple-system, sans-serif'),
      fontSize: 13,
      borderRadius: 4,
    },
    components: {
      Input: {
        colorBgContainer: getVsCodeColor('--vscode-input-background', '#3c3c3c'),
        colorBorder: getVsCodeColor('--vscode-input-border', '#3c3c3c'),
        colorText: getVsCodeColor('--vscode-input-foreground', '#cccccc'),
        colorTextPlaceholder: getVsCodeColor('--vscode-input-placeholderForeground', '#858585'),
        hoverBorderColor: getVsCodeColor('--vscode-focusBorder', '#007acc'),
        activeBorderColor: getVsCodeColor('--vscode-focusBorder', '#007acc'),
      },
      Select: {
        colorBgContainer: getVsCodeColor('--vscode-input-background', '#3c3c3c'),
        colorBorder: getVsCodeColor('--vscode-input-border', '#3c3c3c'),
        colorText: getVsCodeColor('--vscode-input-foreground', '#cccccc'),
        colorTextPlaceholder: getVsCodeColor('--vscode-input-placeholderForeground', '#858585'),
        optionSelectedBg: getVsCodeColor('--vscode-list-activeSelectionBackground', '#094771'),
        optionActiveBg: getVsCodeColor('--vscode-list-hoverBackground', '#2a2d2e'),
        selectorBg: getVsCodeColor('--vscode-input-background', '#3c3c3c'),
      },
      Button: {
        colorPrimary: getVsCodeColor('--vscode-button-background', '#007acc'),
        colorPrimaryHover: getVsCodeColor('--vscode-button-hoverBackground', '#0062a3'),
        defaultBg: 'transparent',
        defaultColor: getVsCodeColor('--vscode-foreground', '#cccccc'),
        defaultBorderColor: 'transparent',
        defaultHoverBg: getVsCodeColor('--vscode-toolbar-hoverBackground', '#2a2d2e'),
        defaultHoverColor: getVsCodeColor('--vscode-foreground', '#cccccc'),
        defaultHoverBorderColor: 'transparent',
      },
      Dropdown: {
        colorBgElevated: getVsCodeColor('--vscode-dropdown-background', '#252526'),
      },
      Menu: {
        colorBgContainer: getVsCodeColor('--vscode-menu-background', '#252526'),
        colorItemBg: 'transparent',
        colorItemText: getVsCodeColor('--vscode-foreground', '#cccccc'),
        colorItemBgSelected: getVsCodeColor('--vscode-list-activeSelectionBackground', '#094771'),
        colorItemTextSelected: getVsCodeColor('--vscode-list-activeSelectionForeground', '#ffffff'),
        colorItemBgHover: getVsCodeColor('--vscode-list-hoverBackground', '#2a2d2e'),
        colorItemTextHover: getVsCodeColor('--vscode-foreground', '#cccccc'),
      },
      Typography: {
        colorText: getVsCodeColor('--vscode-foreground', '#cccccc'),
        colorTextSecondary: getVsCodeColor('--vscode-descriptionForeground', '#858585'),
        colorTextDescription: getVsCodeColor('--vscode-descriptionForeground', '#858585'),
      },
    },
  };

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
        // 更新所有可更新的插件
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
    <ConfigProvider theme={themeConfig}>
      <div className="sidebar-app">
        {/* 搜索栏 + 设置按钮 */}
        <div className="sidebar-search-bar">
          <Input
            placeholder="搜索插件..."
            value={state.filter.keyword}
            onChange={(e) => handleSearch(e.target.value)}
            prefix={<SearchOutlined />}
            allowClear
            size="small"
            className="sidebar-search-compact"
          />
          <Dropdown menu={{ items: settingsMenuItems }} trigger={['click']} placement="bottomRight">
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
              className="sidebar-settings-btn"
              title="更多操作"
            />
          </Dropdown>
        </div>

        {/* 统计信息 */}
        <div className="sidebar-stats">
          <Text type="secondary" style={{ fontSize: 12 }}>
            <CheckCircleOutlined style={{ marginRight: 4 }} />
            已安装 {stats.installed} / 启用 {stats.enabled}
          </Text>
          {stats.updatable > 0 && (
            <Text style={{ fontSize: 12, color: '#faad14' }}>
              <SyncOutlined style={{ marginRight: 4 }} />
              {stats.updatable} 个可更新
            </Text>
          )}
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {/* 插件列表 */}
        <div className="sidebar-content">
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
                // 市场操作按钮
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
                      style={{ padding: '0 4px' }}
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
                      style={{ padding: '0 4px' }}
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
      </div>
    </ConfigProvider>
  );
};

export default SidebarApp;
