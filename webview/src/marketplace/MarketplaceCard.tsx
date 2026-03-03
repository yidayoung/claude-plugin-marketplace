import { Star, Github, ExternalLink, Trash2, Plus } from 'lucide-react';
import { Button, Badge } from '../components';
import { useL10n } from '@/l10n';
import { MARKETPLACE_CATEGORIES, type LocalizedMarketplace } from './config';
import { getVSCodeColors, type VSCodeTheme } from './useVSCodeTheme';

// 声明全局 vscode API
declare const vscode: {
  postMessage: (message: any) => void;
};

function formatStars(stars: number): string {
  if (stars >= 1000) {
    return (stars / 1000).toFixed(1) + 'k';
  }
  return stars.toString();
}

interface MarketplaceCardProps {
  market: LocalizedMarketplace;
  isAdded: boolean;
  isLoading: boolean;
  theme: VSCodeTheme;
  onAdd: (source: string, name: string) => void;
  onRemove: (name: string) => void;
}

export function MarketplaceCard({ market, isAdded, isLoading, theme, onAdd, onRemove }: MarketplaceCardProps) {
  const { t, locale } = useL10n();
  const categoryConfig = MARKETPLACE_CATEGORIES[market.category || 'community' as keyof typeof MARKETPLACE_CATEGORIES];

  const getCategoryLabel = (): string => {
    if (locale === 'zh-cn') {
      return categoryConfig.label;
    }
    return categoryConfig.labelEn;
  };

  const handleOpenUrl = () => {
    vscode.postMessage({
      type: 'openExternal',
      payload: { url: market.url }
    });
  };

  return (
    <div
      className="relative p-4 rounded-lg border border-border bg-card shadow-sm hover:shadow-md transition-all duration-200 h-full flex flex-col group"
      style={{ borderTopColor: categoryConfig.color, borderTopWidth: '3px' }}
    >
      {/* 精选标签 */}
      {market.featured && (
        <div className="absolute top-2.5 right-2.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/10 text-yellow-500">
            <Star className="w-3 h-3 mr-1" />
            {t('marketplace.discover.featured')}
          </span>
        </div>
      )}

      {/* 主内容区 */}
      <div className={`${market.featured ? 'mt-7' : 'mt-5'} flex-1 flex flex-col`}>
        {/* 图标和名称行 */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
              style={{ background: `${categoryConfig.color}20` }}
            >
              {market.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{market.displayName}</p>
              {market.stars !== undefined && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />
                  <span className="text-xs text-muted-foreground">{formatStars(market.stars)}</span>
                </div>
              )}
            </div>
          </div>

          {/* GitHub 链接图标 */}
          <button
            className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground shrink-0"
            onClick={handleOpenUrl}
            title={market.url}
          >
            <Github className="w-4 h-4" />
          </button>
        </div>

        {/* 分类标签 */}
        <div className="mb-2">
          <Badge variant="default" className="text-xs">
            <span className="mr-1">{categoryConfig.icon}</span>
            {getCategoryLabel()}
          </Badge>
        </div>

        {/* 描述 */}
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2 min-h-[40px] max-h-[40px] leading-5">
          {market.description}
        </p>

        {/* 操作按钮 */}
        <div className="flex gap-2 mt-auto">
          <Button
            size="sm"
            variant="default"
            onClick={handleOpenUrl}
            className="flex-1"
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            View
          </Button>
          {isAdded ? (
            <Button
              size="sm"
              variant="destructive"
              loading={isLoading}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(market.name);
              }}
              className="flex-1"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              {t('marketplace.discover.uninstallButton')}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="primary"
              loading={isLoading}
              onClick={(e) => {
                e.stopPropagation();
                onAdd(market.source, market.name);
              }}
              className="flex-1"
            >
              <Plus className="w-3 h-3 mr-1" />
              {t('marketplace.discover.addButton')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
