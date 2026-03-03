import { User, Folder, FolderOpen, Github, ExternalLink, Star, Download, Trash2 } from 'lucide-react';
import { Button } from '../components';
import { useL10n } from '../l10n';
import type { PluginDetailData } from './DetailsApp';

interface DetailHeaderProps {
  plugin: PluginDetailData;
  onInstall: (scope: 'user' | 'project') => void;
  onUninstall: () => void;
  onEnable: () => void;
  onDisable: () => void;
  onOpenExternal: (url: string) => void;
  onOpenDirectory?: (directoryPath: string) => void;
}

export default function DetailHeader({
  plugin,
  onInstall,
  onUninstall,
  onEnable,
  onDisable,
  onOpenExternal,
  onOpenDirectory
}: DetailHeaderProps) {
  const { t } = useL10n();
  const isDisabled = plugin.installed && plugin.enabled === false;

  const getMarketplaceUrl = (plugin: PluginDetailData): string | null => {
    if (!plugin.marketplaceSource) return null;
    const { source, repo, url } = plugin.marketplaceSource;
    if (source === 'github' && repo) return `https://github.com/${repo}`;
    if (source === 'url' && url) return url;
    if (source === 'git' && url) return url;
    return null;
  };

  const getMarketplaceTitle = (plugin: PluginDetailData): string => {
    if (!plugin.marketplaceSource) return t('header.marketUnknown');
    const { source } = plugin.marketplaceSource;
    if (source === 'directory') return t('header.marketLocal');
    const url = getMarketplaceUrl(plugin);
    return url ? t('header.openMarketLink', url) : t('header.marketLocal');
  };

  return (
    <div className="mb-6">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold m-0">{plugin.name}</h3>
            {plugin.localPath && onOpenDirectory && (
              <button
                className="p-1 hover:bg-muted rounded transition-colors"
                onClick={() => onOpenDirectory(plugin.localPath!)}
                title={t('header.openPluginDir')}
              >
                <FolderOpen className="w-4 h-4" />
              </button>
            )}
            <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-500/10 text-blue-500">
              v{plugin.version}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {plugin.author && `${t('header.author')}: ${plugin.author} · `}
            {t('header.from')}{' '}
            <span
              className={getMarketplaceUrl(plugin) ? 'cursor-pointer underline underline-dashed underline-offset-1' : ''}
              onClick={() => {
                const marketplaceUrl = getMarketplaceUrl(plugin);
                if (marketplaceUrl) onOpenExternal(marketplaceUrl);
              }}
              title={getMarketplaceTitle(plugin)}
            >
              {plugin.marketplace}
            </span>
            {plugin.repository?.stars && (
              <span> · <Star className="w-3 h-3 text-yellow-500 inline" /> {plugin.repository.stars}</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {plugin.repository?.url && (
            <button
              className="p-1 hover:bg-muted rounded transition-colors"
              onClick={() => onOpenExternal(plugin.repository!.url)}
              title={t('header.openRepo')}
            >
              <Github className="w-4 h-4" />
            </button>
          )}
          {plugin.homepage && plugin.homepage !== plugin.repository?.url && (
            <button
              className="p-1 hover:bg-muted rounded transition-colors"
              onClick={() => onOpenExternal(plugin.homepage!)}
              title={t('header.openHomepage')}
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}

          {plugin.installed ? (
            <>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!isDisabled}
                  onChange={(e) => (e.target.checked ? onEnable() : onDisable())}
                  className="w-4 h-4 rounded"
                />
              </label>
              {plugin.scope && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-500/10 text-green-500 border border-green-500/30">
                  {plugin.scope === 'user' ? <User className="w-3 h-3 inline mr-1" /> : <Folder className="w-3 h-3 inline mr-1" />}
                  {plugin.scope === 'user' ? t('header.scopeUser') : t('header.scopeProject')}
                </span>
              )}
              <button
                className="p-1 hover:bg-destructive/10 rounded transition-colors text-destructive"
                onClick={onUninstall}
                title={t('header.uninstallBtn')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1">
              <Button size="sm" variant="primary" onClick={() => onInstall('user')}>
                <Download className="w-3 h-3 mr-1" />
                {t('header.install')}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="h-px bg-border" />
    </div>
  );
}
