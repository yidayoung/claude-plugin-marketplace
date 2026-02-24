// vscode-extension/webview/src/details/ReadmeSection.tsx

import React from 'react';
import { Typography, Space } from 'antd';
import { useL10n } from '../l10n';
import { FileTextOutlined } from '@ant-design/icons';
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
const MarkdownLink: React.FC<{ href?: string; children: React.ReactNode; fileLinkTitle?: string }> = ({ href, children, fileLinkTitle }) => {
  if (!href) return <>{children}</>;

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

  if (href.endsWith('.md') || href.startsWith('./') || href.startsWith('../')) {
    return (
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          window.parent.postMessage({ type: 'openFileLink', payload: { path: href } }, '*');
        }}
        title={fileLinkTitle ?? 'File link (direct access not supported)'}
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
  const { t } = useL10n();
  if (!readme) {
    return null;
  }
  const linkComponent = (props: any) => <MarkdownLink {...props} fileLinkTitle={t('readme.fileLinkUnsupported')} />;
  return (
    <Space direction="vertical" size={12} style={{
      padding: 16,
      background: 'var(--vscode-sideBar-background)',
      borderRadius: 8,
      border: '1px solid var(--vscode-panel-border)',
      width: '100%'
    }}>
      <Title level={5} style={{ margin: 0 }}>
        <FileTextOutlined /> {t('readme.title')}
      </Title>
      <div className="markdown-body">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, [remarkSlug as any]]}
          rehypePlugins={[rehypeRaw]}
          components={{
            a: linkComponent,
            img: MarkdownImage as any,
          }}
        >
          {readme}
        </ReactMarkdown>
      </div>
    </Space>
  );
};

export default ReadmeSection;
