// vscode-extension/webview/src/details/DetailHeader.tsx

import React from 'react';
import { Space, Tag, Button, Dropdown, Tooltip, Typography, Divider, Flex, Switch } from 'antd';
import {
  DeleteOutlined,
  DownloadOutlined,
  UserOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  GithubOutlined,
  LinkOutlined,
  CopyOutlined,
  CheckCircleFilled,
  StopOutlined,
  StarFilled
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { PluginDetailData } from './DetailsApp';

const { Text, Title } = Typography;

interface DetailHeaderProps {
  plugin: PluginDetailData;
  onInstall: (scope: 'user' | 'project') => void;
  onUninstall: () => void;
  onEnable: () => void;
  onDisable: () => void;
  onOpenExternal: (url: string) => void;
  onCopy: (text: string) => void;
  onOpenDirectory?: (directoryPath: string) => void;
}

const scopeConfig = {
  user: { label: '用户', icon: <UserOutlined />, color: '#52c41a' },
  project: { label: '项目', icon: <FolderOutlined />, color: '#1890ff' },
  local: { label: '本地', icon: <FolderOutlined />, color: '#8c8c8c' }
} as const;

const DetailHeader: React.FC<DetailHeaderProps> = ({
  plugin,
  onInstall,
  onUninstall,
  onEnable,
  onDisable,
  onOpenExternal,
  onCopy,
  onOpenDirectory
}) => {
  const isDisabled = plugin.installed && plugin.enabled === false;
  const scopeInfo = plugin.scope ? scopeConfig[plugin.scope] : null;

  const installMenuItems: MenuProps['items'] = [
    {
      key: 'user',
      label: '安装到用户',
      icon: <UserOutlined />,
      onClick: () => onInstall('user')
    },
    {
      key: 'project',
      label: '安装到项目',
      icon: <FolderOutlined />,
      onClick: () => onInstall('project')
    }
  ];

  const copyInstallCommand = () => {
    onCopy(`claude plugin install "${plugin.name}@${plugin.marketplace}"`);
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <Flex justify="space-between" align="flex-start" gap={16} style={{ marginBottom: 12 }}>
        <Space direction="vertical" size={4} style={{ flex: 1 }}>
          <Space size="middle">
            <Title
              level={3}
              style={{
                margin: 0,
                cursor: plugin.localPath ? 'pointer' : 'default'
              }}
              onClick={() => {
                if (plugin.localPath && onOpenDirectory) {
                  onOpenDirectory(plugin.localPath);
                }
              }}
            >
              {plugin.name}
            </Title>
            {plugin.localPath && onOpenDirectory && (
              <Tooltip title="打开插件目录">
                <Button
                  type="text"
                  size="small"
                  icon={<FolderOpenOutlined />}
                  onClick={() => onOpenDirectory(plugin.localPath!)}
                  style={{ fontSize: 16, padding: '0 4px' }}
                />
              </Tooltip>
            )}
            <Tag color="blue">v{plugin.version}</Tag>
            {plugin.installed && !isDisabled && (
              <Tooltip title="已启用">
                <CheckCircleFilled style={{ color: '#52c41a', fontSize: 16 }} />
              </Tooltip>
            )}
            {isDisabled && (
              <Tooltip title="已禁用">
                <StopOutlined style={{ fontSize: 16 }} />
              </Tooltip>
            )}
          </Space>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {plugin.author && `作者: ${plugin.author} · `}
            来自 {plugin.marketplace}
            {plugin.repository?.stars && (
              <span>
                {' '}· <StarFilled style={{ color: '#faad14' }} /> {plugin.repository.stars}
              </span>
            )}
          </Text>
        </Space>

        <Space size="middle">
          {plugin.repository?.url && (
            <Tooltip title="打开仓库">
              <Button
                type="text"
                icon={<GithubOutlined />}
                onClick={() => onOpenExternal(plugin.repository!.url)}
              />
            </Tooltip>
          )}
          {plugin.homepage && plugin.homepage !== plugin.repository?.url && (
            <Tooltip title="打开主页">
              <Button
                type="text"
                icon={<LinkOutlined />}
                onClick={() => onOpenExternal(plugin.homepage!)}
              />
            </Tooltip>
          )}

          {plugin.installed ? (
            <Space size="small">
              <Tooltip title={isDisabled ? '启用插件' : '禁用插件'}>
                <Switch
                  checked={!isDisabled}
                  onChange={(checked) => (checked ? onEnable() : onDisable())}
                  size="small"
                />
              </Tooltip>
              {scopeInfo && (
                <Tag
                  icon={scopeInfo.icon}
                  style={{
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
              <Tooltip title="复制安装命令">
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={copyInstallCommand}
                />
              </Tooltip>
              <Tooltip title="卸载">
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={onUninstall}
                />
              </Tooltip>
            </Space>
          ) : (
            <Dropdown.Button
              menu={{ items: installMenuItems }}
              icon={<DownloadOutlined />}
              onClick={() => onInstall('user')}
              type="primary"
              size="small"
            >
              安装
            </Dropdown.Button>
          )}
        </Space>
      </Flex>

      <Divider style={{ margin: '12px 0' }} />
    </div>
  );
};

export default DetailHeader;
