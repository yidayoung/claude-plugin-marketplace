import { type VSCodeTheme } from './useVSCodeTheme';
import { MarketplaceCard } from './MarketplaceCard';
import { type RecommendedMarketplace } from './config';
import type { ReactNode } from 'react';
import { isMarketplaceAdded } from './marketplaceMatching';

interface MarketplaceSectionProps {
  title: string;
  icon: ReactNode;
  iconColor: string;
  markets: RecommendedMarketplace[];
  theme: VSCodeTheme;
  addedMarketplaces: Set<string>;
  loading: string | null;
  onAdd: (source: string, name: string) => void;
  onRemove: (name: string) => void;
}

export function MarketplaceSection({
  title,
  icon,
  iconColor,
  markets,
  theme,
  addedMarketplaces,
  loading,
  onAdd,
  onRemove
}: MarketplaceSectionProps) {
  if (markets.length === 0) {
    return null;
  }

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: iconColor }}
        >
          <span className="text-sm">{icon}</span>
        </div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <div className="h-px flex-1 bg-border" />
        <div className="rounded-md border border-border bg-background px-2 py-1 text-xs text-text-secondary">
          {markets.length} markets
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {markets.map((market, index) => (
          <div
            key={market.id}
            className="opacity-0 animate-fade-in"
            style={{ animationDelay: `${index * 75}ms`, animationFillMode: 'forwards' }}
          >
            <MarketplaceCard
              market={market}
              isAdded={isMarketplaceAdded(market, addedMarketplaces)}
              isLoading={loading === market.name}
              theme={theme}
              onAdd={onAdd}
              onRemove={onRemove}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
