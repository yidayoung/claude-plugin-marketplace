import { PluginDataStore } from '../../src/pluginMarketplace/data/PluginDataStore';

const loadMarketplaces = jest.fn();
const loadInstalledPlugins = jest.fn();
const loadPluginList = jest.fn();
const fetchGitHubStars = jest.fn();

jest.mock('../../src/pluginMarketplace/data/DataLoader', () => {
  return {
    DataLoader: jest.fn().mockImplementation(() => ({
      loadMarketplaces,
      loadInstalledPlugins,
      loadPluginList,
      fetchGitHubStars,
    })),
  };
});

describe('PluginDataStore initialize installed status sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks installed plugins correctly after initialize', async () => {
    loadMarketplaces.mockResolvedValue([
      {
        name: 'test-market',
        source: 'owner/repo',
      },
    ]);

    loadInstalledPlugins.mockResolvedValue([
      {
        name: 'demo-plugin',
        marketplace: 'test-market',
        enabled: true,
        scope: 'user',
        version: '1.0.0',
      },
    ]);

    loadPluginList.mockImplementation(
      async () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve([
              {
                name: 'demo-plugin',
                description: 'demo',
                version: '1.1.0',
                marketplace: 'test-market',
                installed: false,
              },
            ]);
          }, 0);
        })
    );

    fetchGitHubStars.mockResolvedValue(undefined);

    const context = {
      globalState: {
        get: jest.fn(),
        update: jest.fn(),
      },
    } as any;

    const store = new PluginDataStore(context);
    await store.initialize();

    const plugin = store.getPluginList().find((p) => p.name === 'demo-plugin' && p.marketplace === 'test-market');

    expect(plugin).toBeDefined();
    expect(plugin?.installed).toBe(true);
    expect(plugin?.enabled).toBe(true);
    expect(plugin?.scope).toBe('user');
  });
});
