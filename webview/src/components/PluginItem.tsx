import { useState, useRef, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Download,
  Trash2,
  Power,
  PowerOff,
  RefreshCw,
  MoreVertical,
  Plus,
  User,
  Github
} from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from './Button';
import { useL10n } from '../l10n';
import { PluginData } from '../hooks';

// 声明全局 vscode API
declare const vscode: {
  postMessage: (message: any) => void;
  getState: () => any;
  setState: (state: any) => void;
};

interface PluginItemProps {
  plugin: PluginData;
  isHovered: boolean;
  onHoverChange: (id: string, hovered: boolean) => void;
}

export function PluginItem({ plugin, isHovered, onHoverChange }: PluginItemProps) {
  const { t } = useL10n();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 关闭菜单，当点击外部时
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  const handleInstall = () => {
    vscode.postMessage({
      type: 'installPlugin',
      payload: { pluginName: plugin.name, marketplace: plugin.marketplace, scope: 'user' }
    });
  };

  const handleUninstall = () => {
    vscode.postMessage({
      type: 'uninstallPlugin',
      payload: { pluginName: plugin.name }
    });
  };

  const handleEnable = () => {
    vscode.postMessage({
      type: 'enablePlugin',
      payload: { pluginName: plugin.name, marketplace: plugin.marketplace }
    });
  };

  const handleDisable = () => {
    vscode.postMessage({
      type: 'disablePlugin',
      payload: { pluginName: plugin.name, marketplace: plugin.marketplace }
    });
  };

  const handleUpdate = () => {
    vscode.postMessage({
      type: 'updatePlugin',
      payload: { pluginName: plugin.name, marketplace: plugin.marketplace }
    });
  };

  const handleOpenDetails = () => {
    vscode.postMessage({
      type: 'openDetails',
      payload: { pluginName: plugin.name, marketplace: plugin.marketplace }
    });
  };

  const statusMeta = plugin.updateAvailable
    ? {
        icon: <RefreshCw className="h-4 w-4 text-warning-fg" />,
        badge: <span className="rounded bg-warning-fg/10 px-1.5 py-0.5 text-[10px] font-medium text-warning-fg">Update</span>
      }
    : plugin.enabled === false
      ? {
          icon: <XCircle className="h-4 w-4 text-text-secondary" />,
          badge: <span className="rounded bg-muted/55 px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">Disabled</span>
        }
      : {
          icon: <CheckCircle2 className="h-4 w-4 text-success-fg" />,
          badge: <span className="rounded bg-success-fg/10 px-1.5 py-0.5 text-[10px] font-medium text-success-fg">Active</span>
        };

  const authorName = typeof plugin.author === 'string'
    ? plugin.author
    : (plugin.author as any)?.name || plugin.author;

  return (
    <article
      className={cn(
        'group relative flex items-start gap-3 rounded-xl border border-border/65 bg-card/95 px-3 py-3',
        'cursor-pointer select-none transition-all duration-200 ease-out hover:border-border hover:bg-hover-bg/40 hover:shadow-sm'
      )}
      onMouseEnter={() => onHoverChange(`plugin-${plugin.name}`, true)}
      onMouseLeave={() => onHoverChange(`plugin-${plugin.name}`, false)}
      onClick={handleOpenDetails}
    >
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/35">
        {statusMeta.icon}
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight text-foreground">{plugin.name}</p>
            {plugin.version && (
              <p className="mt-0.5 text-[11px] leading-none text-text-secondary">v{plugin.version}</p>
            )}
          </div>
          <div className="shrink-0">{statusMeta.badge}</div>
        </div>

        {authorName && (
          <div className="flex items-center gap-1 text-xs text-text-secondary">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">{String(authorName)}</span>
            {plugin.homepage && (
              <a
                href={plugin.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded text-text-secondary transition-colors hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
                title={plugin.homepage}
              >
                <Github className="h-3 w-3" />
              </a>
            )}
          </div>
        )}

        {plugin.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-text-secondary">{plugin.description}</p>
        )}
      </div>

      <div className="relative shrink-0" ref={menuRef}>
        {plugin.installed ? (
          <>
            <Button
              size="sm"
              variant="icon"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              title={t('item.actions')}
              className={cn(
                'rounded-md transition-opacity duration-150',
                isHovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              )}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>

            {showMenu && (
              <div
                className="absolute right-0 top-full z-50 mt-1.5 min-w-[150px]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="overflow-hidden rounded-lg border border-border/80 bg-popover shadow-lg">
                  <button
                    onClick={() => {
                      if (plugin.enabled === false) {
                        handleEnable();
                      } else {
                        handleDisable();
                      }
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-hover-bg"
                  >
                    {plugin.enabled === false ? (
                      <>
                        <Power className="h-3.5 w-3.5 text-success-fg" />
                        <span>{t('item.enable')}</span>
                      </>
                    ) : (
                      <>
                        <PowerOff className="h-3.5 w-3.5 text-text-secondary" />
                        <span>{t('item.disable')}</span>
                      </>
                    )}
                  </button>

                  {plugin.updateAvailable && (
                    <button
                      onClick={() => {
                        handleUpdate();
                        setShowMenu(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-hover-bg"
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-warning-fg" />
                      <span>{t('item.update')}</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      handleUninstall();
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{t('item.uninstall')}</span>
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              handleInstall();
            }}
            title={t('item.install')}
            className={cn(
              'rounded-md border border-border/60 px-2 text-[11px] shadow-sm transition-opacity duration-150',
              isHovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            <span className="text-xs font-medium">{t('item.install')}</span>
          </Button>
        )}
      </div>

      {plugin.updateAvailable && (
        <div className="absolute inset-y-2 left-0 w-0.5 rounded-r bg-warning-fg/80" aria-hidden="true" />
      )}
    </article>
  );
}
