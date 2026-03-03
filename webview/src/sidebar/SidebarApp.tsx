import { useState, useRef, useEffect } from 'react';
import { Search, CheckCircle2, RefreshCw, Store, XCircle, Download, MoreVertical } from 'lucide-react';
import { Input, Button } from '../components';
import { usePluginData, usePluginFilter, useHoverState } from '../hooks';
import { PluginItem, PluginSection, MarketSectionActions } from '../components';
import { useL10n } from '../l10n';

// 声明全局 vscode API
declare const vscode: {
  postMessage: (message: any) => void;
  getState: () => any;
  setState: (state: any) => void;
};

const SidebarApp: React.FC = () => {
  const { t } = useL10n();
  const { state, loadPlugins, setState } = usePluginData();
  const { groupedPlugins, stats } = usePluginFilter(state.plugins, state.filter);
  const { isHovered, setHovered } = useHoverState();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['installed'])
  );
  const [showActionMenu, setShowActionMenu] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // 关闭操作菜单，当点击外部时
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setShowActionMenu(false);
      }
    };

    if (showActionMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showActionMenu]);

  const handleSearch = (keyword: string) => {
    setState(prev => ({
      ...prev,
      filter: { ...prev.filter, keyword }
    }));
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  if (state.loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm">{t('sidebar.loading')}</span>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="p-2">
        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <XCircle className="h-4 w-4" />
            <span>{state.error}</span>
          </div>
        </div>
      </div>
    );
  }

  // 计算可用插件数量
  const availableCount = stats.total - stats.installed;

  // 获取市场列表
  const marketList = Object.keys(groupedPlugins.byMarketplace).sort();

  return (
    <div className="sidebar-shell flex h-full flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-border/60 bg-background/95 px-3 pb-3 pt-3 backdrop-blur-sm">
        <div className="rounded-xl border border-border/60 bg-card/95 p-3 shadow-sm">
          {/* Search with Action Menu */}
          <div className="mb-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('sidebar.searchPlaceholder')}
                value={state.filter.keyword}
                onChange={(e) => handleSearch(e.target.value)}
                className="h-9 rounded-lg border-border/70 bg-background pl-9 text-sm shadow-sm"
              />
            </div>

            {/* Action Menu */}
            <div className="relative shrink-0" ref={actionMenuRef}>
              <Button
                size="sm"
                variant="icon"
                onClick={() => setShowActionMenu(!showActionMenu)}
                title={t('sidebar.moreActions')}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>

              {/* Dropdown Menu */}
              {showActionMenu && (
                <div
                  className="absolute right-0 top-full z-50 mt-2 min-w-[170px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="overflow-hidden rounded-lg border border-border/80 bg-popover shadow-lg">
                    {/* Refresh */}
                    <button
                      onClick={() => {
                        loadPlugins();
                        setShowActionMenu(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-hover-bg"
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-text-secondary" />
                      <span>{t('sidebar.refresh')}</span>
                    </button>

                    {/* Add Marketplace */}
                    <button
                      onClick={() => {
                        vscode.postMessage({
                          type: 'executeCommand',
                          payload: { command: 'claudePluginMarketplace.addMarketplace' }
                        });
                        setShowActionMenu(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-hover-bg"
                    >
                      <Store className="h-3.5 w-3.5 text-text-secondary" />
                      <span>{t('sidebar.addMarketplace')}</span>
                    </button>

                    {/* Update All (if available) */}
                    {stats.updatable > 0 && (
                      <button
                        onClick={() => {
                          state.plugins
                            .filter(p => p.updateAvailable)
                            .forEach(p => {
                              vscode.postMessage({
                                type: 'updatePlugin',
                                payload: { pluginName: p.name, marketplace: p.marketplace }
                              });
                            });
                          setShowActionMenu(false);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-hover-bg"
                      >
                        <Download className="h-3.5 w-3.5 text-warning-fg" />
                        <span>{t('sidebar.updateAll')}</span>
                        <span className="ml-auto rounded bg-warning-fg/10 px-1.5 py-0.5 text-[10px] text-warning-fg">
                          {stats.updatable}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-success-fg/20 bg-success-fg/10 px-2.5 py-2">
              <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-text-secondary">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success-fg" />
                <span>{t('sidebar.installed')}</span>
              </div>
              <span className="text-base font-semibold leading-none text-success-fg">{stats.installed}</span>
            </div>

            <div className="rounded-lg border border-border/70 bg-muted/35 px-2.5 py-2">
              <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-text-secondary">
                <Store className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
                <span>{t('sidebar.available')}</span>
              </div>
              <span className="text-base font-semibold leading-none text-foreground">{availableCount}</span>
            </div>

            {stats.updatable > 0 && (
              <div className="col-span-2 rounded-lg border border-warning-fg/25 bg-warning-fg/10 px-2.5 py-2">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-text-secondary">
                  <Download className="h-3.5 w-3.5 shrink-0 text-warning-fg" />
                  <span>{t('sidebar.updatable')}</span>
                </div>
                <span className="text-base font-semibold leading-none text-warning-fg">{stats.updatable}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Plugin List */}
      <div className="flex-1 space-y-4 overflow-y-auto px-2 pb-4 pt-3">
        {/* 已安装插件 */}
        {groupedPlugins.installed.length > 0 && (
          <PluginSection
            title={t('sidebar.installed')}
            count={groupedPlugins.installed.length}
            sectionKey="installed"
            isExpanded={expandedSections.has('installed')}
            isHovered={isHovered('section-installed')}
            onToggle={toggleSection}
            onHoverChange={setHovered}
          >
            {groupedPlugins.installed.map(plugin => (
              <PluginItem
                key={plugin.name}
                plugin={plugin}
                isHovered={isHovered(`plugin-${plugin.name}`)}
                onHoverChange={setHovered}
              />
            ))}
          </PluginSection>
        )}

        {/* 按市场分组的插件 */}
        {marketList.map(marketName => {
          const plugins = groupedPlugins.byMarketplace[marketName];
          const sectionId = `market-${marketName}`;
          const installedCount = plugins.filter(p => p.installed).length;

          return (
            <PluginSection
              key={marketName}
              title={marketName}
              count={installedCount}
              sectionKey={sectionId}
              isExpanded={expandedSections.has(sectionId)}
              isHovered={isHovered(`section-${sectionId}`)}
              onToggle={toggleSection}
              onHoverChange={setHovered}
              actions={<MarketSectionActions marketName={marketName} />}
            >
              {plugins.map(plugin => (
                <PluginItem
                  key={`${plugin.marketplace}-${plugin.name}`}
                  plugin={plugin}
                  isHovered={isHovered(`plugin-${plugin.name}`)}
                  onHoverChange={setHovered}
                />
              ))}
            </PluginSection>
          );
        })}

        {/* 空状态 */}
        {groupedPlugins.installed.length === 0 && marketList.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/40 py-12 text-muted-foreground">
            <Store className="mb-3 h-12 w-12 opacity-50" />
            <p className="text-sm">{t('sidebar.noResults')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SidebarApp;
