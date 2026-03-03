import { type VSCodeTheme, getVSCodeColors } from './useVSCodeTheme';
import { MarketplaceCard } from './MarketplaceCard';
import { type RecommendedMarketplace } from './config';
import type { ReactNode } from 'react';

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
  const colors = getVSCodeColors(theme);

  const isMarketplaceAdded = (market: RecommendedMarketplace): boolean => {
    const possibleNames: string[] = [];

    if (market.name) {
      possibleNames.push(market.name);
    }

    if (market.source.includes('/')) {
      const repoPart = market.source.split('/').pop()!;
      possibleNames.push(repoPart);
      const ownerPart = market.source.split('/')[0];
      possibleNames.push(ownerPart);
    } else {
      possibleNames.push(market.source);
    }

    if (market.id.includes('/')) {
      const ownerFromId = market.id.split('/')[0];
      const repoFromId = market.id.split('/')[1];
      possibleNames.push(ownerFromId);
      possibleNames.push(repoFromId);
    }

    return possibleNames.some(name => name && addedMarketplaces.has(name));
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-1.5 mb-4">
        <span style={{ color: iconColor, fontSize: '16px', display: 'flex', alignItems: 'center' }}>
          {icon}
        </span>
        <span className="text-base font-semibold">{title}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {markets.map(market => (
          <MarketplaceCard
            key={market.id}
            market={market}
            isAdded={isMarketplaceAdded(market)}
            isLoading={loading === market.name}
            theme={theme}
            onAdd={onAdd}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  );
}
