// src/shared/utils/__tests__/fileUtils.test.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { tryReadFile, findFileInPaths, accessWithDefault } from '../../src/shared/utils/fileUtils';

// Mock fs module
jest.mock('fs/promises');

describe('fileUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('tryReadFile', () => {
    it('should return file content when file exists', async () => {
      (fs.readFile as jest.Mock).mockResolvedValueOnce('file content');
      const result = await tryReadFile('/path/to/file.txt');
      expect(result).toBe('file content');
    });

    it('should return null when file does not exist', async () => {
      (fs.readFile as jest.Mock).mockRejectedValueOnce(new Error('not found'));
      const result = await tryReadFile('/path/to/nonexistent.txt');
      expect(result).toBeNull();
    });
  });

  describe('findFileInPaths', () => {
    it('should return path when file found', async () => {
      (fs.access as jest.Mock).mockResolvedValueOnce(undefined);
      const result = await findFileInPaths('test.txt', ['/path1', '/path2']);
      expect(result).toBe('/path1/test.txt');
    });

    it('should return null when file not found in any path', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('not found'));
      const result = await findFileInPaths('test.txt', ['/path1', '/path2']);
      expect(result).toBeNull();
    });
  });

  describe('accessWithDefault', () => {
    it('should return function result on success', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await accessWithDefault(fn, 'default');
      expect(result).toBe('success');
    });

    it('should return default value on error', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('error'));
      const result = await accessWithDefault(fn, 'default');
      expect(result).toBe('default');
    });
  });
});
