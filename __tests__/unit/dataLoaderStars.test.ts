import { DataLoader } from '../../src/pluginMarketplace/data/DataLoader';

jest.mock('../../src/pluginMarketplace/webview/services/PluginDetailsService', () => ({
  PluginDetailsService: jest.fn().mockImplementation(() => ({
    getPluginDetail: jest.fn(),
    clearCache: jest.fn(),
  })),
}));

describe('DataLoader.fetchGitHubStars', () => {
  const createLoader = () => new DataLoader({} as any);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns undefined when response does not include stargazers_count', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({ message: 'ok-without-stars' }),
    });

    (global as any).fetch = fetchMock;

    const loader = createLoader();
    const stars = await loader.fetchGitHubStars('owner', 'repo');

    expect(stars).toBeUndefined();
  });

  it('returns stargazers_count when present', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({ stargazers_count: 1234 }),
    });

    (global as any).fetch = fetchMock;

    const loader = createLoader();
    const stars = await loader.fetchGitHubStars('owner', 'repo');

    expect(stars).toBe(1234);
  });
});
