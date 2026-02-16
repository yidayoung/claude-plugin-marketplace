// webview-app/src/details/DetailContent.tsx

import React from 'react';
import { Typography, Tag } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import type { PluginDetailData } from './DetailsApp';
import ComponentsSection from './ComponentsSection';
import ReadmeSection from './ReadmeSection';

const { Title, Paragraph, Text } = Typography;

interface DetailContentProps {
  plugin: PluginDetailData;
}

const DetailContent: React.FC<DetailContentProps> = ({ plugin }) => {
  return (
    <div className="detail-content">
      {plugin.description && (
        <div className="detail-section">
          <Title level={5}>
            <FileTextOutlined /> 详细描述
          </Title>
          <Paragraph style={{ fontSize: 14 }}>
            {plugin.description}
          </Paragraph>
        </div>
      )}

      <ComponentsSection plugin={plugin} />

      <ReadmeSection readme={plugin.readme} />

      {(plugin.dependencies?.length || plugin.license) && (
        <div className="detail-section">
          <Title level={5}>元信息</Title>
          {plugin.dependencies?.length && (
            <div>
              <Text type="secondary">依赖:</Text>
              <div style={{ marginTop: 4 }}>
                {plugin.dependencies.map(dep => (
                  <Tag key={dep} style={{ marginBottom: 4 }}>{dep}</Tag>
                ))}
              </div>
            </div>
          )}
          {plugin.license && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">许可证:</Text>
              <Tag style={{ marginLeft: 8 }}>{plugin.license}</Tag>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DetailContent;
