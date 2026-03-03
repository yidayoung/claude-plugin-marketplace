import { isMarketplaceAdded, shouldDisplayStars } from '@webview/marketplace/marketplaceMatching';

describe('isMarketplaceAdded', () => {
  test('matches by exact marketplace name', () => {
    const added = new Set(['ui-ux-pro-max-skill']);
    const market = {
      id: 'nextlevelbuilder/ui-ux-pro-max-skill',
      name: 'ui-ux-pro-max-skill',
      source: 'nextlevelbuilder/ui-ux-pro-max-skill',
    };

    expect(isMarketplaceAdded(market, added)).toBe(true);
  });

  test('matches by repo part when source is owner/repo', () => {
    const added = new Set(['ui-ux-pro-max-skill']);
    const market = {
      id: 'nextlevelbuilder/ui-ux-pro-max-skill',
      name: 'custom-name',
      source: 'nextlevelbuilder/ui-ux-pro-max-skill',
    };

    expect(isMarketplaceAdded(market, added)).toBe(true);
  });

  test('returns false when none of candidates exist', () => {
    const added = new Set(['another-market']);
    const market = {
      id: 'nextlevelbuilder/ui-ux-pro-max-skill',
      name: 'custom-name',
      source: 'nextlevelbuilder/ui-ux-pro-max-skill',
    };

    expect(isMarketplaceAdded(market, added)).toBe(false);
  });
});

describe('shouldDisplayStars', () => {
  test('returns false when stars are undefined', () => {
    expect(shouldDisplayStars(undefined)).toBe(false);
  });

  test('returns false when stars are zero', () => {
    expect(shouldDisplayStars(0)).toBe(false);
  });

  test('returns true when stars are positive', () => {
    expect(shouldDisplayStars(1)).toBe(true);
  });
});
