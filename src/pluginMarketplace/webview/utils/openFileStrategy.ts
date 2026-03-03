import * as path from 'path';

export type PreferredOpenMode = 'markdown-editor' | 'text-editor';

export function getPreferredOpenMode(filePath: string): PreferredOpenMode {
  return path.extname(filePath).toLowerCase() === '.md'
    ? 'markdown-editor'
    : 'text-editor';
}
