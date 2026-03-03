import { PluginDataStore, MARKETPLACE_STARS_TTL_MS } from '../../src/pluginMarketplace/data/PluginDataStore';

jest.mock('../../src/pluginMarketplace/data/DataLoader', () => {
  return {
    DataLoader: jest.fn().mockImplementation(() => ({
      fetchGitHubStars: jest.fn(),
    })),
  };
});

describe('PluginDataStore stars cache policy', () => {
  const createStore = () => {
    const context = {
      globalState: {
        get: jest.fn(),
        update: jest.fn(),
      },
    } as any;

    return new PluginDataStore(context);
  };

  it('uses fixed 24-hour ttl constant', () => {
    expect(MARKETPLACE_STARS_TTL_MS).toBe(24 * 60 * 60 * 1000);
    expect(MARKETPLACE_STARS_TTL_MS).toBe(86_400_000);
  });

  it('reads marketplace stars by shared repo key', () => {
    const store = createStore() as any;

    store.marketplaceRepoIndex.set('market-a', 'owner/repo');
    store.marketplaceRepoIndex.set('market-b', 'owner/repo');
    store.marketplaceStarsByRepo.set('owner/repo', {
      stars: 123,
      timestamp: Date.now(),
    });

    expect(store.getMarketplaceStars('market-a')).toBe(123);
    expect(store.getMarketplaceStars('market-b')).toBe(123);
  });

  it('returns undefined when stars are not loaded yet', () => {
    const store = createStore() as any;
    expect(store.getMarketplaceStars('missing-market')).toBeUndefined();
  });

  it('returns undefined when marketplace has no resolved repo mapping', () => {
    const store = createStore() as any;
    store.marketplaceRepoIndex.set('market-a', 'owner/repo');
    expect(store.getMarketplaceStars('market-b')).toBeUndefined();
  });

  it('does not persist stars when fetch result is undefined', async () => {
    const store = createStore() as any;
    jest.spyOn(store.dataLoader, 'fetchGitHubStars').mockResolvedValue(undefined);
    const result = await store.fetchRepoStarsWithDedup('owner/repo');
    expect(result).toBeUndefined();
    expect(store.marketplaceStarsByRepo.get('owner/repo')).toBeUndefined();
  });

  it('deduplicates concurrent star fetches for same repo', async () => {
    const store = createStore() as any;
    const fetchSpy = jest
      .spyOn(store.dataLoader, 'fetchGitHubStars')
      .mockResolvedValue(999);

    const p1 = store.fetchRepoStarsWithDedup('owner/repo');
    const p2 = store.fetchRepoStarsWithDedup('owner/repo');

    const [v1, v2] = await Promise.all([p1, p2]);

    expect(v1).toBe(999);
    expect(v2).toBe(999);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('treats zero-star cache as stale to recover from invalid cached values', () => {
    const store = createStore() as any;
    const freshZeroEntry = {
      stars: 0,
      timestamp: Date.now(),
    };

    expect(store.isStarsCacheStale(freshZeroEntry)).toBe(true);
  });

  it('forces star refresh even when cache is fresh', async () => {
    const store = createStore() as any;

    store.rebuildMarketplaceRepoIndex = jest.fn(() => {
      store.marketplaceRepoIndex.clear();
      store.marketplaceRepoIndex.set('market-a', 'owner/repo');
    });

    store.marketplaceStarsByRepo.set('owner/repo', {
      stars: 123,
      timestamp: Date.now(),
    });

    const fetchSpy = jest
      .spyOn(store, 'fetchRepoStarsWithDedup')
      .mockResolvedValue(undefined);

    await store.refreshMarketplaceStars(true);

    expect(fetchSpy).toHaveBeenCalledWith('owner/repo');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
