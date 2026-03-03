// vscode-extension/src/pluginMarketplace/webview/services/__tests__/PluginPathResolver.test.ts

import { PluginPathResolver } from '../../src/pluginMarketplace/webview/services/PluginPathResolver';
import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

jest.mock('vscode');
jest.mock('fs/promises');

describe('PluginPathResolver', () => {
  let resolver: PluginPathResolver;
  let mockContext: any;

  beforeEach(() => {
    mockContext = {};
    resolver = new PluginPathResolver(mockContext);
    jest.clearAllMocks();
  });

  describe('findPluginPath', () => {
    it('should return null when HOME is not defined', async () => {
      const originalHome = process.env.HOME;
      const originalUserprofile = process.env.USERPROFILE;
      delete process.env.HOME;
      delete process.env.USERPROFILE;

      const result = await resolver.findPluginPath('test-plugin');

      process.env.HOME = originalHome;
      process.env.USERPROFILE = originalUserprofile;
      expect(result).toBeNull();
    });

    it('should search in cache and marketplace directories', async () => {
      process.env.HOME = '/test/home';

      // Mock readdir to return no directories
      (fs.readdir as jest.Mock).mockResolvedValue([]);

      const result = await resolver.findPluginPath('test-plugin');

      expect(fs.readdir).toHaveBeenCalledWith(
        path.join('/test/home/.claude/plugins/cache'),
        { withFileTypes: true }
      );
      expect(result).toBeNull();
    });

    it('should find plugin in marketplace directory', async () => {
      process.env.HOME = '/test/home';

      const mockDirents = [
        { name: 'test-market', isDirectory: () => true }
      ];

      (fs.readdir as jest.Mock)
        .mockResolvedValueOnce(mockDirents) // Base path readdir
        .mockResolvedValueOnce([{ name: 'test-plugin', isDirectory: () => true }]); // Market path readdir

      (fs.access as jest.Mock).mockResolvedValue(undefined);

      const result = await resolver.findPluginPath('test-plugin', 'test-market');

      expect(result).toContain('test-plugin');
    });
  });

  describe('getLocalMarketPath', () => {
    it('should return null when HOME is not defined', async () => {
      const originalHome = process.env.HOME;
      delete process.env.HOME;
      delete process.env.USERPROFILE;

      const result = await resolver.getLocalMarketPath('test-plugin', 'test-market');

      process.env.HOME = originalHome;
      expect(result).toBeNull();
    });

    it('should return null when marketplace.json does not exist', async () => {
      process.env.HOME = '/test/home';

      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      const result = await resolver.getLocalMarketPath('test-plugin', 'test-market');

      expect(result).toBeNull();
    });

    it('should return path for local relative source', async () => {
      process.env.HOME = '/test/home';

      const marketplaceConfig = {
        plugins: [
          {
            name: 'test-plugin',
            source: './plugins/test-plugin'
          }
        ]
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(marketplaceConfig));
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      const result = await resolver.getLocalMarketPath('test-plugin', 'test-market');

      expect(result).toBe(path.join('/test/home/.claude/plugins/marketplaces/test-market/plugins/test-plugin'));
    });

    it('should return null for remote source', async () => {
      process.env.HOME = '/test/home';

      const marketplaceConfig = {
        plugins: [
          {
            name: 'test-plugin',
            source: {
              source: 'github',
              repo: 'owner/repo'
            }
          }
        ]
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(marketplaceConfig));

      const result = await resolver.getLocalMarketPath('test-plugin', 'test-market');

      expect(result).toBeNull();
    });

    it('should return null when plugin not found in marketplace.json', async () => {
      process.env.HOME = '/test/home';

      const marketplaceConfig = {
        plugins: [
          {
            name: 'other-plugin',
            source: './plugins/other-plugin'
          }
        ]
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(marketplaceConfig));

      const result = await resolver.getLocalMarketPath('test-plugin', 'test-market');

      expect(result).toBeNull();
    });
  });

  describe('isValidPluginDir', () => {
    it('should return true when package.json exists', async () => {
      (fs.access as jest.Mock).mockResolvedValueOnce(undefined);
      const result = await (resolver as any).isValidPluginDir('/path/to/plugin');
      expect(result).toBe(true);
    });

    it('should return true when plugin.json exists', async () => {
      (fs.access as jest.Mock)
        .mockRejectedValueOnce(new Error('not found'))
        .mockResolvedValueOnce(undefined);
      const result = await (resolver as any).isValidPluginDir('/path/to/plugin');
      expect(result).toBe(true);
    });

    it('should return true when .claude-plugin/plugin.json exists', async () => {
      (fs.access as jest.Mock)
        .mockRejectedValueOnce(new Error('not found'))
        .mockRejectedValueOnce(new Error('not found'))
        .mockResolvedValueOnce(undefined);
      const result = await (resolver as any).isValidPluginDir('/path/to/plugin');
      expect(result).toBe(true);
    });

    it('should return false when no config file exists', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('not found'));
      const result = await (resolver as any).isValidPluginDir('/path/to/plugin');
      expect(result).toBe(false);
    });
  });

  describe('searchInVersionSubdir', () => {
    it('should return subdirectory path when config file found', async () => {
      const mockSubItems = [
        { name: '1.0.0', isDirectory: () => true }
      ];

      (fs.readdir as jest.Mock).mockResolvedValue(mockSubItems);
      (fs.access as jest.Mock).mockResolvedValueOnce(undefined);

      const result = await (resolver as any).searchInVersionSubdir('/path/to/plugin');
      expect(result).toBe(path.join('/path/to/plugin', '1.0.0'));
    });

    it('should return plugin path when README.md found in plugin dir', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([]);
      (fs.access as jest.Mock).mockResolvedValueOnce(undefined);

      const result = await (resolver as any).searchInVersionSubdir('/path/to/plugin');
      expect(result).toBe('/path/to/plugin');
    });

    it('should return null when no config or README found', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([]);
      (fs.access as jest.Mock).mockRejectedValue(new Error('not found'));

      const result = await (resolver as any).searchInVersionSubdir('/path/to/plugin');
      expect(result).toBeNull();
    });
  });
});
