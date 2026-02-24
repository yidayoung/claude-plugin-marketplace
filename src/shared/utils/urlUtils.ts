/**
 * Normalize repo URL for opening in browser (HTTPS, no .git suffix).
 * Handles git@host:owner/repo and https URLs.
 */
export function normalizeRepoUrlForBrowser(url: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // SSH: git@github.com:owner/repo.git -> https://github.com/owner/repo
  const sshMatch = trimmed.match(/^git@([^:]+):(.+?)(\.git)?$/);
  if (sshMatch) {
    const host = sshMatch[1];
    const path = sshMatch[2].replace(/\.git$/, '');
    return `https://${host}/${path}`;
  }

  // HTTPS/HTTP: remove .git suffix
  if (trimmed.endsWith('.git')) {
    return trimmed.slice(0, -4);
  }
  return trimmed;
}
