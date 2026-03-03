import type { RecommendedMarketplace } from './config';

type MarketplaceIdentity = Pick<RecommendedMarketplace, 'id' | 'name' | 'source'>;

function splitCandidates(value: string): string[] {
  if (!value) return [];
  if (!value.includes('/')) return [value];

  const [owner, repo] = value.split('/');
  return [value, owner, repo].filter(Boolean);
}

export function getMarketplaceCandidates(market: MarketplaceIdentity): string[] {
  const candidateSet = new Set<string>();

  splitCandidates(market.name).forEach((n) => candidateSet.add(n));
  splitCandidates(market.source).forEach((n) => candidateSet.add(n));
  splitCandidates(market.id).forEach((n) => candidateSet.add(n));

  return Array.from(candidateSet);
}

export function isMarketplaceAdded(
  market: MarketplaceIdentity,
  addedMarketplaces: Set<string>
): boolean {
  return getMarketplaceCandidates(market).some((candidate) => addedMarketplaces.has(candidate));
}

export function formatStars(stars: number): string {
  if (stars >= 1000) {
    return `${(stars / 1000).toFixed(1)}k`;
  }
  return `${stars}`;
}

export function shouldDisplayStars(stars: number | undefined): stars is number {
  return typeof stars === 'number' && stars > 0;
}
