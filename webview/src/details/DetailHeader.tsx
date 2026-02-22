// vscode-extension/webview/src/details/DetailHeader.tsx

import React from 'react';
import { Space, Tag, Button, Dropdown, Tooltip, Typography, Divider, Flex, Switch, Modal } from 'antd';
import {
  DeleteOutlined,
  DownloadOutlined,
  UserOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  GithubOutlined,
  LinkOutlined,
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
  onOpenDirectory
}) => {
  const isDisabled = plugin.installed && plugin.enabled === false;
  const scopeInfo = plugin.scope ? scopeConfig[plugin.scope] : null;

  // 根据市场源信息生成 URL
  const getMarketplaceUrl = (plugin: PluginDetailData): string | null => {
    if (!plugin.marketplaceSource) {
      return null;
    }

    const { source, repo, url } = plugin.marketplaceSource;

    // GitHub 市场
    if (source === 'github' && repo) {
      return `https://github.com/${repo}`;
    }

    // URL 市场
    if (source === 'url' && url) {
      return url;
    }

    // Git 市场（如果有 URL）
    if (source === 'git' && url) {
      return url;
    }

    // Directory 类型是本地的，没有 URL
    return null;
  };

  // 生成市场标题提示
  const getMarketplaceTitle = (plugin: PluginDetailData): string => {
    if (!plugin.marketplaceSource) {
      return '未知市场类型';
    }

    const { source } = plugin.marketplaceSource;

    if (source === 'directory') {
      return '本地市场';
    }

    const url = getMarketplaceUrl(plugin);
    return url ? `打开市场链接: ${url}` : '本地市场';
  };

  const handleUninstallWithConfirm = () => {
    Modal.confirm({
      title: '确认卸载',
      content: `确定要卸载插件 "${plugin.name}" 吗？`,
      okText: '卸载',
      okType: 'danger',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: onUninstall,
    });
  };

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


  return (
    <div style={{ marginBottom: 24 }}>
      <Flex justify="space-between" align="flex-start" gap={16} style={{ marginBottom: 12 }}>
        <Space direction="vertical" size={4} style={{ flex: 1 }}>
          <Space size="middle">
            <Title level={3} style={{ margin: 0 }}>
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
          </Space>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {plugin.author && `作者: ${plugin.author} · `}
            来自{' '}
            <Text
              style={{
                cursor: getMarketplaceUrl(plugin) ? 'pointer' : 'default',
                textDecoration: getMarketplaceUrl(plugin) ? 'underline' : 'none',
                textDecorationStyle: getMarketplaceUrl(plugin) ? 'dashed' : 'solid',
                textUnderlineOffset: 2
              }}
              onClick={() => {
                const marketplaceUrl = getMarketplaceUrl(plugin);
                if (marketplaceUrl) {
                  onOpenExternal(marketplaceUrl);
                }
              }}
              title={getMarketplaceTitle(plugin)}
            >
              {plugin.marketplace}
            </Text>
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
              <Tooltip title="卸载">
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={handleUninstallWithConfirm}
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
