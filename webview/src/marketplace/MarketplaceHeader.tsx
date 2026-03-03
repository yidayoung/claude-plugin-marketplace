import { Compass, Sparkles, CheckCircle2, RefreshCw } from 'lucide-react';
import { useL10n } from '@/l10n';
import { type VSCodeTheme } from './useVSCodeTheme';

interface MarketplaceHeaderProps {
  theme: VSCodeTheme;
  totalMarkets: number;
  addedMarkets: number;
  isRefreshingStars: boolean;
  onRefreshStars: () => void;
}

export function MarketplaceHeader({
  totalMarkets,
  addedMarkets,
  isRefreshingStars,
  onRefreshStars
}: MarketplaceHeaderProps) {
  const { t, locale } = useL10n();
  const totalLabel = locale === 'zh-cn' ? '总市场' : 'Total markets';
  const addedLabel = locale === 'zh-cn' ? '已添加' : 'Added';

  return (
    <header className="mb-8 rounded-xl border border-border bg-card/80 p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Compass className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">{t('marketplace.discover.title')}</h1>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary md:text-base">
            {t('marketplace.discover.subtitle')}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <div className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>{totalLabel}</span>
          <strong className="font-semibold">{totalMarkets}</strong>
        </div>
        <div className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>{addedLabel}</span>
          <strong className="font-semibold">{addedMarkets}</strong>
        </div>
        <button
          type="button"
          onClick={onRefreshStars}
          disabled={isRefreshingStars}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-hover-bg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 text-primary ${isRefreshingStars ? 'animate-spin' : ''}`} />
          <span>{t('marketplace.discover.refreshStars')}</span>
        </button>
      </div>
    </header>
  );
}
