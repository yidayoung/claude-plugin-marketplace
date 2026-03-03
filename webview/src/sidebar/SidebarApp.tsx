import { useState } from 'react';
import { Search, CheckCircle2, RefreshCw, MoreVertical, Store, Sync, XCircle } from 'lucide-react';
import { cn } from '../lib/cn';
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
    new Set(['installed', 'available'])
  );

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
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm">{t('sidebar.loading')}</span>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="p-2">
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
          <div className="flex items-center gap-2 text-destructive text-sm">
            <XCircle className="w-4 h-4" />
            <span>{state.error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border">
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('sidebar.searchPlaceholder')}
            value={state.filter.keyword}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Stats & Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{t('sidebar.installed')}: {stats.installed}</span>
            <span>{t('sidebar.available')}: {stats.available}</span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={loadPlugins}
              title={t('sidebar.refresh')}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                vscode.postMessage({
                  type: 'executeCommand',
                  payload: { command: 'claudePluginMarketplace.addMarketplace' }
                });
              }}
              title={t('sidebar.addMarketplace')}
            >
              <Store className="w-4 h-4" />
            </Button>

            {state.plugins.some(p => p.updateAvailable) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  // Update all logic
                  state.plugins
                    .filter(p => p.updateAvailable)
                    .forEach(p => {
                      vscode.postMessage({
                        type: 'updatePlugin',
                        payload: { pluginName: p.name, marketplace: p.marketplace }
                      });
                    });
                }}
                title={t('sidebar.updateAll')}
              >
                <Sync className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Plugin List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {groupedPlugins.map(([marketplace, plugins]) => {
          const sectionId = `${marketplace}-section`;
          const isExpanded = expandedSections.has(sectionId);
          const installedCount = plugins.filter(p => p.installed).length;

          return (
            <PluginSection
              key={marketplace}
              id={sectionId}
              title={marketplace}
              count={installedCount}
              expanded={isExpanded}
              onToggle={() => toggleSection(sectionId)}
            >
              {plugins.map(plugin => (
                <PluginItem
                  key={`${plugin.marketplace}-${plugin.name}`}
                  plugin={plugin}
                  isHovered={isHovered(plugin.name)}
                  onHoverChange={setHovered}
                />
              ))}
            </PluginSection>
          );
        })}

        {groupedPlugins.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Store className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">{t('sidebar.noResults')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SidebarApp;
