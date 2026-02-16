import React from 'react';
import {
  Card,
  Tag,
  Button,
  Space,
  Tooltip,
  Typography,
  Dropdown,
  Badge,
  Divider,
  Switch
} from 'antd';
import {
  DeleteOutlined,
  DownloadOutlined,
  UserOutlined,
  FolderOutlined,
  HomeOutlined,
  StarOutlined,
  CheckCircleFilled,
  StopOutlined,
  PoweroffOutlined,
  EyeOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import vscode from '../main';

const { Text, Paragraph } = Typography;

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

interface PluginCardProps {
  plugin: PluginData;
  activeTab: 'user' | 'project';
}

const scopeConfig = {
  user: { label: '用户', icon: <UserOutlined />, color: '#52c41a' },
  project: { label: '项目', icon: <FolderOutlined />, color: '#1890ff' },
  local: { label: '本地', icon: <HomeOutlined />, color: '#8c8c8c' }
} as const;

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

  const handleToggleEnable = (checked: boolean) => {
    vscode.postMessage({
      type: checked ? 'enablePlugin' : 'disablePlugin',
      payload: {
        pluginName: plugin.name,
        marketplace: plugin.marketplace
      }
    });
  };

  const handleOpenDetails = () => {
    vscode.postMessage({
      type: 'openDetails',
      payload: {
        pluginName: plugin.name,
        marketplace: plugin.marketplace
      }
    });
  };

  const installMenuItems: MenuProps['items'] = [
    {
      key: 'user',
      label: '安装到用户',
      icon: <UserOutlined />,
      onClick: () => handleInstall('user')
    },
    {
      key: 'project',
      label: '安装到项目',
      icon: <FolderOutlined />,
      onClick: () => handleInstall('project')
    },
    {
      key: 'local',
      label: '安装到本地',
      icon: <HomeOutlined />,
      onClick: () => handleInstall('local')
    }
  ];

  const scopeInfo = plugin.scope ? scopeConfig[plugin.scope] : null;
  const isDisabled = plugin.installed && plugin.enabled === false;

  return (
    <Badge.Ribbon
      text={plugin.updateAvailable ? '可更新' : (isDisabled ? '已禁用' : undefined)}
      color={isDisabled ? 'default' : 'orange'}
    >
      <Card
        hoverable
        className={`plugin-card-modern ${isDisabled ? 'plugin-card-disabled' : ''}`}
        styles={{
          body: { padding: '20px' }
        }}
      >
        {/* Header - 名称和状态 */}
        <div className="plugin-card-header">
          <Space direction="vertical" size={4} style={{ flex: 1 }}>
            <Space>
              <Text
                strong
                style={{
                  fontSize: 16,
                  color: isDisabled ? 'var(--vscode-descriptionForeground)' : 'var(--vscode-foreground)'
                }}
              >
                {plugin.name}
              </Text>
              <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>
                v{plugin.version}
              </Tag>
              {plugin.installed && !isDisabled && (
                <Tooltip title="已启用">
                  <CheckCircleFilled style={{ color: '#52c41a', fontSize: 14 }} />
                </Tooltip>
              )}
              {isDisabled && (
                <Tooltip title="已禁用">
                  <StopOutlined style={{ color: 'var(--vscode-descriptionForeground)', fontSize: 14 }} />
                </Tooltip>
              )}
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              来自 {plugin.marketplace}
              {plugin.author && ` · ${plugin.author}`}
            </Text>
          </Space>

          {/* 操作按钮 */}
          <div className="plugin-card-actions">
            {plugin.installed ? (
              <Space size="middle">
                {/* 启用/禁用开关 */}
                <Tooltip title={isDisabled ? '启用插件' : '禁用插件'}>
                  <Switch
                    checked={plugin.enabled !== false}
                    onChange={handleToggleEnable}
                    checkedChildren={<PoweroffOutlined />}
                    unCheckedChildren={<PoweroffOutlined />}
                    size="small"
                  />
                </Tooltip>

                {/* 安装范围标签 */}
                {scopeInfo && (
                  <Tag
                    icon={scopeInfo.icon}
                    style={{
                      margin: 0,
                      borderRadius: 12,
                      padding: '2px 10px',
                      background: `${scopeInfo.color}15`,
                      color: scopeInfo.color,
                      border: `1px solid ${scopeInfo.color}30`
                    }}
                  >
                    {scopeInfo.label}
                  </Tag>
                )}

                {/* 查看详情按钮 */}
                <Tooltip title="查看详情">
                  <Button
                    type="text"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={handleOpenDetails}
                    style={{ borderRadius: 8 }}
                  />
                </Tooltip>

                {/* 卸载按钮 */}
                <Tooltip title="卸载插件">
                  <Button
                    danger
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={handleUninstall}
                    style={{ borderRadius: 8 }}
                  />
                </Tooltip>
              </Space>
            ) : (
              <Space size="small">
                <Dropdown.Button
                  menu={{ items: installMenuItems }}
                  trigger={['click']}
                  icon={<DownloadOutlined />}
                  onClick={() => handleInstall('user')}
                  type="primary"
                  size="small"
                  style={{ borderRadius: 8 }}
                >
                  安装
                </Dropdown.Button>

                {/* 查看详情按钮 */}
                <Tooltip title="查看详情">
                  <Button
                    type="default"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={handleOpenDetails}
                    style={{ borderRadius: 8 }}
                  />
                </Tooltip>
              </Space>
            )}
          </div>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* Description */}
        <Paragraph
          ellipsis={{ rows: 2, tooltip: plugin.description }}
          style={{
            fontSize: 13,
            lineHeight: '1.6',
            marginBottom: 12,
            color: isDisabled ? 'var(--vscode-descriptionForeground)' : 'var(--vscode-foreground)',
            opacity: isDisabled ? 0.6 : 1
          }}
        >
          {plugin.description}
        </Paragraph>

        {/* Footer - 分类标签 */}
        {plugin.category && (
          <Space wrap size={4}>
            <Tag
              icon={<StarOutlined />}
              style={{
                borderRadius: 12,
                fontSize: 11,
                padding: '1px 8px',
                background: 'var(--vscode-textBlockQuote-background)',
                border: 'none'
              }}
            >
              {plugin.category}
            </Tag>
          </Space>
        )}
      </Card>
    </Badge.Ribbon>
  );
};

export default PluginCard;
