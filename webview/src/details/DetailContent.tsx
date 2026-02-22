// vscode-extension/webview/src/details/DetailContent.tsx

import React from 'react';
import { Typography, Tag, Space } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import type { PluginDetailData } from './DetailsApp';
import ComponentsSection from './ComponentsSection';
import ReadmeSection from './ReadmeSection';

const { Title, Paragraph, Text } = Typography;

interface DetailContentProps {
  plugin: PluginDetailData;
  onOpenFile: (filePath: string) => void;
}

const DetailContent: React.FC<DetailContentProps> = ({ plugin, onOpenFile }) => {
  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      {plugin.description && (
        <Space direction="vertical" size={12} style={{
          padding: 16,
          background: 'var(--vscode-sideBar-background)',
          borderRadius: 8,
          border: '1px solid var(--vscode-panel-border)',
          width: '100%'
        }}>
          <Title level={5} style={{ margin: 0 }}>
            <FileTextOutlined /> 详细描述
          </Title>
          <Paragraph style={{ fontSize: 14, marginBottom: 0 }}>
            {plugin.description}
          </Paragraph>
        </Space>
      )}

      <ComponentsSection plugin={plugin} onOpenFile={onOpenFile} />

      <ReadmeSection readme={plugin.readme} />

      {(plugin.dependencies?.length || plugin.license) && (
        <Space direction="vertical" size={12} style={{
          padding: 16,
          background: 'var(--vscode-sideBar-background)',
          borderRadius: 8,
          border: '1px solid var(--vscode-panel-border)',
          width: '100%'
        }}>
          <Title level={5} style={{ margin: 0 }}>元信息</Title>
          {plugin.dependencies?.length && (
            <Space direction="vertical" size={4}>
              <Text type="secondary">依赖:</Text>
              <div style={{ marginTop: 4 }}>
                {plugin.dependencies.map(dep => (
                  <Tag key={dep}>{dep}</Tag>
                ))}
              </div>
            </Space>
          )}
          {plugin.license && (
            <Space style={{ marginTop: 8 }}>
              <Text type="secondary">许可证:</Text>
              <Tag>{plugin.license}</Tag>
            </Space>
          )}
        </Space>
      )}
    </Space>
  );
};

export default DetailContent;
