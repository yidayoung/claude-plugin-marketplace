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
            <span className="px-2 py-0.5 text-xs font-medium rounded bg-badge-bg text-badge-fg">
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
              <span> · <Star className="w-3 h-3 text-warning-fg inline" /> {plugin.repository.stars}</span>
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
              <button
                type="button"
                role="switch"
                aria-checked={!isDisabled}
                aria-label={!isDisabled ? t('header.disablePlugin') : t('header.enablePlugin')}
                title={!isDisabled ? t('header.disablePlugin') : t('header.enablePlugin')}
                onClick={() => (!isDisabled ? onDisable() : onEnable())}
                className={`relative inline-flex h-6 w-12 items-center rounded-full border shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-focus-border ${
                  !isDisabled
                    ? 'bg-green-500 border-green-400'
                    : 'bg-muted border-border'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                    !isDisabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
              {plugin.scope && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-success-fg/10 text-success-fg border border-success-fg/30">
                  {plugin.scope === 'user' ? <User className="w-3 h-3 inline mr-1" /> : <Folder className="w-3 h-3 inline mr-1" />}
                  {plugin.scope === 'user' ? t('header.scopeUser') : t('header.scopeProject')}
                </span>
              )}
              <button
                className="p-1 hover:bg-error-fg/10 rounded transition-colors text-error-fg"
                onClick={onUninstall}
                title={t('header.uninstallBtn')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1">
              <Button size="sm" variant="secondary" onClick={() => onInstall('user')}>
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
