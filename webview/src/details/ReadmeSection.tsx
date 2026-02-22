// vscode-extension/webview/src/details/ReadmeSection.tsx

import React, { useState } from 'react';
import { Typography, Button, Space } from 'antd';
import { FileTextOutlined, EyeOutlined, CodeOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkSlug from 'remark-slug';
import rehypeRaw from 'rehype-raw';

const { Title } = Typography;

interface ReadmeSectionProps {
  readme?: string;
  pluginName?: string;
  marketplace?: string;
}

// 自定义链接组件，处理不同类型的链接
const MarkdownLink: React.FC<{ href?: string; children: React.ReactNode }> = ({ href, children }) => {
  if (!href) return <>{children}</>;

  // 外部链接 - 用浏览器打开
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return (
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          window.parent.postMessage({ type: 'openExternal', payload: { url: href } }, '*');
        }}
      >
        {children}
      </a>
    );
  }

  // 相对文件链接 (.md 文件或 ./ 开头的路径)
  if (href.endsWith('.md') || href.startsWith('./') || href.startsWith('../')) {
    return (
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          window.parent.postMessage({ type: 'openFileLink', payload: { path: href } }, '*');
        }}
        title="文件链接（暂不支持直接访问）"
        style={{ cursor: 'not-allowed', opacity: 0.7 }}
      >
        {children}
      </a>
    );
  }

  // 锚点链接 - 页面内跳转
  if (href.startsWith('#')) {
    return <a href={href}>{children}</a>;
  }

  return <a href={href}>{children}</a>;
};

// 自定义图片组件，处理远程图片
const MarkdownImage: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = (props) => {
  const { src, alt, ...rest } = props;

  return (
    <img
      src={src}
      alt={alt}
      {...rest}
      onError={(e) => {
        // 图片加载失败时显示占位符
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
};

const ReadmeSection: React.FC<ReadmeSectionProps> = ({ readme }) => {
  const [viewMode, setViewMode] = useState<'rendered' | 'raw'>('rendered');

  if (!readme) {
    return null;
  }

  return (
    <Space direction="vertical" size={12} style={{
      padding: 16,
      background: 'var(--vscode-sideBar-background)',
      borderRadius: 8,
      border: '1px solid var(--vscode-panel-border)',
      width: '100%'
    }}>
      <Space style={{ justifyContent: 'space-between', width: '100%' }}>
        <Title level={5} style={{ margin: 0 }}>
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
      </Space>
      {viewMode === 'rendered' ? (
        <div className="markdown-body">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, [remarkSlug as any]]}
            rehypePlugins={[rehypeRaw]}
            components={{
              a: MarkdownLink as any,
              img: MarkdownImage as any,
            }}
          >
            {readme}
          </ReactMarkdown>
        </div>
      ) : (
        <pre
          style={{
            background: 'var(--vscode-textBlockQuote-background)',
            padding: 16,
            borderRadius: 4,
            overflow: 'auto',
            fontSize: 13,
            margin: 0
          }}
        >
          {readme}
        </pre>
      )}
    </Space>
  );
};

export default ReadmeSection;
