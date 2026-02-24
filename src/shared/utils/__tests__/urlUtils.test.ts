// src/shared/utils/__tests__/urlUtils.test.ts
import { normalizeRepoUrlForBrowser } from '../urlUtils';

describe('normalizeRepoUrlForBrowser', () => {
  it('should convert SSH URL to HTTPS', () => {
    expect(normalizeRepoUrlForBrowser('git@github.com:owner/repo.git')).toBe('https://github.com/owner/repo');
  });

  it('should strip .git from HTTPS URL', () => {
    expect(normalizeRepoUrlForBrowser('https://github.com/owner/repo.git')).toBe('https://github.com/owner/repo');
  });

  it('should leave HTTPS URL without .git unchanged', () => {
    expect(normalizeRepoUrlForBrowser('https://github.com/owner/repo')).toBe('https://github.com/owner/repo');
  });

  it('should return empty string for empty input', () => {
    expect(normalizeRepoUrlForBrowser('')).toBe('');
  });

  it('should return empty string for whitespace-only input', () => {
    expect(normalizeRepoUrlForBrowser('   ')).toBe('');
  });

  it('should trim and strip .git', () => {
    expect(normalizeRepoUrlForBrowser('  https://github.com/a/b.git  ')).toBe('https://github.com/a/b');
  });

  it('should handle SSH without .git suffix', () => {
    expect(normalizeRepoUrlForBrowser('git@github.com:owner/repo')).toBe('https://github.com/owner/repo');
  });
});
