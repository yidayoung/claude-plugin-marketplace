import { FileText } from 'lucide-react';
import { useL10n } from '../l10n';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkSlug from 'remark-slug';
import rehypeRaw from 'rehype-raw';

interface ReadmeSectionProps {
  readme?: string;
  pluginName?: string;
  marketplace?: string;
}

interface MarkdownLinkProps {
  href?: string;
  children: React.ReactNode;
  fileLinkTitle?: string;
}

function MarkdownLink({ href, children, fileLinkTitle }: MarkdownLinkProps) {
  if (!href) return <>{children}</>;

  if (href.startsWith('http://') || href.startsWith('https://')) {
    return (
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          window.parent.postMessage({ type: 'openExternal', payload: { url: href } }, '*');
        }}
        className="text-primary hover:underline"
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
        className="cursor-not-allowed opacity-70"
      >
        {children}
      </a>
    );
  }

  if (href.startsWith('#')) {
    return <a href={href}>{children}</a>;
  }

  return <a href={href}>{children}</a>;
}

function MarkdownImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const { src, alt, ...rest } = props;

  return (
    <img
      src={src}
      alt={alt}
      {...rest}
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}

export default function ReadmeSection({ readme }: ReadmeSectionProps) {
  const { t } = useL10n();

  if (!readme) return null;

  const linkComponent = (props: any) => <MarkdownLink {...props} fileLinkTitle={t('readme.fileLinkUnsupported')} />;

  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <h5 className="text-base font-semibold m-0 flex items-center gap-2">
        <FileText className="w-4 h-4" />
        {t('readme.title')}
      </h5>
      <div className="markdown-body mt-3">
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
    </div>
  );
}
