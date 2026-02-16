// webview-app/src/details/ReadmeSection.tsx

import React, { useState } from 'react';
import { Typography, Button } from 'antd';
import { FileTextOutlined, EyeOutlined, CodeOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';

const { Title } = Typography;

interface ReadmeSectionProps {
  readme?: string;
}

const ReadmeSection: React.FC<ReadmeSectionProps> = ({ readme }) => {
  const [viewMode, setViewMode] = useState<'rendered' | 'raw'>('rendered');

  if (!readme) {
    return null;
  }

  return (
    <div className="detail-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={5}>
          <FileTextOutlined /> README
        </Title>
        <Button
          type="text"
          size="small"
          icon={viewMode === 'rendered' ? <CodeOutlined /> : <EyeOutlined />}
          onClick={() => setViewMode(viewMode === 'rendered' ? 'raw' : 'rendered')}
        >
          {viewMode === 'rendered' ? '查看源码' : '预览'}
        </Button>
      </div>
      <div className="readme-content">
        {viewMode === 'rendered' ? (
          <div className="markdown-body">
            <ReactMarkdown>{readme}</ReactMarkdown>
          </div>
        ) : (
          <pre
            style={{
              background: 'var(--vscode-textBlockQuote-background)',
              padding: 16,
              borderRadius: 4,
              overflow: 'auto',
              fontSize: 13
            }}
          >
            {readme}
          </pre>
        )}
      </div>
    </div>
  );
};

export default ReadmeSection;
