import React from 'react';
import { Space, Flex, Typography, Button } from 'antd';
import { CaretDownOutlined, CaretUpOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons';

const { Text } = Typography;

// 声明全局 vscode API（由外部 HTML 注入）
declare const vscode: {
  postMessage: (message: any) => void;
  getState: () => any;
  setState: (state: any) => void;
};

interface PluginSectionProps {
  title: string;
  count: number;
  sectionKey: string;
  isExpanded: boolean;
  isHovered: boolean;
  onToggle: (sectionKey: string) => void;
  onHoverChange: (id: string, hovered: boolean) => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function PluginSection({
  title,
  count,
  sectionKey,
  isExpanded,
  isHovered,
  onToggle,
  onHoverChange,
  children,
  actions
}: PluginSectionProps) {
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
          onToggle(sectionKey);
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--vscode-toolbar-hoverBackground)';
          onHoverChange(`section-${sectionKey}`, true);
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          onHoverChange(`section-${sectionKey}`, false);
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
}

interface MarketSectionActionsProps {
  marketName: string;
}

export function MarketSectionActions({ marketName }: MarketSectionActionsProps) {
  const handleRefreshMarket = (e: React.MouseEvent) => {
    e.stopPropagation();
    vscode.postMessage({
      type: 'executeCommand',
      payload: { command: 'claudePluginMarketplace.refreshMarketplace', args: [marketName] }
    });
  };

  const handleRemoveMarket = (e: React.MouseEvent) => {
    e.stopPropagation();
    vscode.postMessage({
      type: 'executeCommand',
      payload: { command: 'claudePluginMarketplace.removeMarketplace', args: [marketName] }
    });
  };

  return (
    <>
      <Button
        type="text"
        size="small"
        icon={<ReloadOutlined />}
        onClick={handleRefreshMarket}
        title="刷新市场"
        style={{ padding: '0 4px', minWidth: 20 }}
      />
      <Button
        type="text"
        size="small"
        icon={<DeleteOutlined />}
        onClick={handleRemoveMarket}
        title="删除市场"
        style={{ padding: '0 4px', minWidth: 20 }}
      />
    </>
  );
}
