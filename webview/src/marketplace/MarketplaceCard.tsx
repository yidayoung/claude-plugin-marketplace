import {
  Star,
  Github,
  ExternalLink,
  Trash2,
  Plus,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Users,
  FlaskConical
} from 'lucide-react';
import { useL10n } from '@/l10n';
import { MARKETPLACE_CATEGORIES, type LocalizedMarketplace } from './config';
import { type VSCodeTheme } from './useVSCodeTheme';
import { formatStars, shouldDisplayStars } from './marketplaceMatching';

// 声明全局 vscode API
declare const vscode: {
  postMessage: (message: any) => void;
};

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
  const CategoryIcon = market.category === 'official'
    ? ShieldCheck
    : market.category === 'experimental'
      ? FlaskConical
      : Users;

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
      className="flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg"
      style={{
        borderTopWidth: '3px',
        borderTopColor: categoryConfig.color
      }}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-foreground">{market.displayName}</h3>
          {shouldDisplayStars(market.stars) && (
            <div className="mt-1 flex items-center gap-1 text-xs text-text-secondary">
              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
              <span>{formatStars(market.stars)} stars</span>
            </div>
          )}
        </div>
        <button
          className="rounded-md p-2 text-text-secondary transition-colors hover:bg-hover-bg hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          onClick={handleOpenUrl}
          title={market.url}
          aria-label={`View ${market.displayName} on GitHub`}
        >
          <Github className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className="inline-flex min-h-7 items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium"
          style={{
            backgroundColor: `${categoryConfig.color}1A`,
            borderColor: `${categoryConfig.color}4D`,
            color: categoryConfig.color
          }}
        >
          {CategoryIcon && <CategoryIcon className="h-3.5 w-3.5" />}
          {getCategoryLabel()}
        </span>
        {market.featured && (
          <span className="inline-flex min-h-7 items-center gap-1 rounded-md border border-amber-300 bg-amber-100/60 px-2 py-1 text-xs font-medium text-amber-800">
            <Star className="h-3.5 w-3.5 fill-amber-600 text-amber-600" />
            {t('marketplace.discover.featured')}
          </span>
        )}
        {isAdded && (
          <span className="inline-flex min-h-7 items-center gap-1 rounded-md border border-green-400/50 bg-green-500/10 px-2 py-1 text-xs font-medium text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t('marketplace.discover.addedButton')}
          </span>
        )}
      </div>

      <p className="mb-4 line-clamp-2 min-h-[2.5rem] text-sm leading-6 text-text-secondary">
        {market.description}
      </p>

      <div className="mt-auto flex gap-2">
        <button
          onClick={handleOpenUrl}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-hover-bg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <ExternalLink className="h-4 w-4" />
          {t('marketplace.discover.viewButton')}
        </button>
        {isAdded ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(market.name);
            }}
            disabled={isLoading}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {t('marketplace.discover.removeButton')}
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd(market.source, market.name);
            }}
            disabled={isLoading}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-btn-bg px-3 py-2 text-sm font-medium text-btn-fg transition-colors hover:bg-btn-hover focus:outline-none focus:ring-2 focus:ring-focus-border disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {t('marketplace.discover.addButton')}
          </button>
        )}
      </div>
    </div>
  );
}
