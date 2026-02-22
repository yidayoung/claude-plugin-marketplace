import { Button, Flex, Typography, Dropdown } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  PoweroffOutlined,
  SettingOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { PluginData } from '../hooks';

const { Text } = Typography;

// 声明全局 vscode API（由外部 HTML 注入）
declare const vscode: {
  postMessage: (message: any) => void;
  getState: () => any;
  setState: (state: any) => void;
};

interface PluginItemProps {
  plugin: PluginData;
  isHovered: boolean;
  onHoverChange: (id: string, hovered: boolean) => void;
}

export function PluginItem({ plugin, isHovered, onHoverChange }: PluginItemProps) {
  const statusIcon = plugin.updateAvailable
    ? <ReloadOutlined style={{ color: '#faad14' }} />
    : plugin.enabled === false
      ? <CloseCircleOutlined style={{ color: 'var(--vscode-disabledForeground)' }} />
      : <CheckCircleOutlined style={{ color: '#52c41a' }} />;

  const handleInstall = () => {
    vscode.postMessage({
      type: 'installPlugin',
      payload: { pluginName: plugin.name, marketplace: plugin.marketplace, scope: 'user' }
    });
  };

  const handleUninstall = () => {
    vscode.postMessage({
      type: 'uninstallPlugin',
      payload: { pluginName: plugin.name }
    });
  };

  const handleEnable = () => {
    vscode.postMessage({
      type: 'enablePlugin',
      payload: { pluginName: plugin.name, marketplace: plugin.marketplace }
    });
  };

  const handleDisable = () => {
    vscode.postMessage({
      type: 'disablePlugin',
      payload: { pluginName: plugin.name, marketplace: plugin.marketplace }
    });
  };

  const handleUpdate = () => {
    vscode.postMessage({
      type: 'updatePlugin',
      payload: { pluginName: plugin.name, marketplace: plugin.marketplace }
    });
  };

  const handleOpenDetails = () => {
    vscode.postMessage({
      type: 'openDetails',
      payload: { pluginName: plugin.name, marketplace: plugin.marketplace }
    });
  };

  const getActionMenu = (): MenuProps => {
    const items: MenuProps['items'] = [];

    if (plugin.installed) {
      if (plugin.enabled === false) {
        items.push({
          key: 'enable',
          label: '启用',
          icon: <PoweroffOutlined />,
          onClick: handleEnable
        });
      } else {
        items.push({
          key: 'disable',
          label: '禁用',
          icon: <PoweroffOutlined />,
          onClick: handleDisable
        });
      }
      if (plugin.updateAvailable) {
        items.push({
          key: 'update',
          label: '更新',
          icon: <ReloadOutlined />,
          onClick: handleUpdate
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
        onClick: handleUninstall
      });
    } else {
      items.push({
        key: 'install',
        label: '安装',
        icon: <PlusOutlined />,
        onClick: handleInstall
      });
    }
    items.push({
      key: 'info',
      label: '查看详情',
      icon: <InfoCircleOutlined />,
      onClick: handleOpenDetails
    });

    return { items };
  };

  return (
    <div
      onClick={handleOpenDetails}
      style={{
        marginBottom: 2,
        padding: '6px 8px',
        borderRadius: 4,
        cursor: 'pointer',
        transition: 'background 0.15s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--vscode-list-hoverBackground)';
        onHoverChange(`plugin-${plugin.name}`, true);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        onHoverChange(`plugin-${plugin.name}`, false);
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
                  onClick={(e) => { e.stopPropagation(); handleEnable(); }}
                  title="启用"
                  style={{ padding: '0 4px', minWidth: 'auto' }}
                />
              )}
              {plugin.updateAvailable && (
                <Button
                  type="text"
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={(e) => { e.stopPropagation(); handleUpdate(); }}
                  title="更新"
                  style={{ padding: '0 4px', minWidth: 'auto' }}
                />
              )}
              <Dropdown menu={getActionMenu()} trigger={['click']}>
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
                onClick={(e) => { e.stopPropagation(); handleInstall(); }}
                style={{ fontSize: 12 }}
              >
                安装
              </Button>
              <Dropdown menu={getActionMenu()} trigger={['click']}>
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
}
