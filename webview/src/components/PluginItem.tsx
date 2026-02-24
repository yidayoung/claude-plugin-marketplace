import { Button, Flex, Typography, Dropdown } from 'antd';
import { useL10n } from '../l10n';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
  ReloadOutlined,
  EllipsisOutlined,
  PoweroffOutlined
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

  const { t } = useL10n();
  const getActionMenu = (): MenuProps => {
    const items: MenuProps['items'] = [
      {
        key: 'install',
        label: plugin.installed ? t('item.reinstall') : t('item.install'),
        icon: <PlusOutlined />,
        onClick: handleInstall
      }
    ];

    if (plugin.installed) {
      items.push(
        {
          type: 'divider'
        },
        {
          key: plugin.enabled === false ? 'enable' : 'disable',
          label: plugin.enabled === false ? t('item.enable') : t('item.disable'),
          icon: <PoweroffOutlined />,
          onClick: plugin.enabled === false ? handleEnable : handleDisable
        }
      );

      if (plugin.updateAvailable) {
        items.push({
          key: 'update',
          label: t('item.update'),
          icon: <ReloadOutlined />,
          onClick: handleUpdate
        });
      }

      items.push(
        {
          type: 'divider'
        },
        {
          key: 'uninstall',
          label: t('item.uninstall'),
          icon: <DeleteOutlined />,
          onClick: handleUninstall
        }
      );
    }

    return {
      items,
      onClick: () => {}
    };
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
          <Dropdown menu={getActionMenu()} trigger={['click']} placement="bottomRight">
            <Button
              type="text"
              size="small"
              icon={<EllipsisOutlined />}
              onClick={(e) => e.stopPropagation()}
              title={t('item.actions')}
              style={{ padding: '0 4px', minWidth: 'auto' }}
            />
          </Dropdown>
        </div>
      </Flex>
    </div>
  );
}
