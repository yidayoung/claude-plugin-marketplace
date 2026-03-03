import { getPreferredOpenMode } from '../../src/pluginMarketplace/webview/utils/openFileStrategy';

describe('getPreferredOpenMode', () => {
  it('returns markdown-editor for markdown files', () => {
    expect(getPreferredOpenMode('/tmp/SKILL.md')).toBe('markdown-editor');
    expect(getPreferredOpenMode('/tmp/readme.MD')).toBe('markdown-editor');
  });

  it('returns text-editor for non-markdown files', () => {
    expect(getPreferredOpenMode('/tmp/config.json')).toBe('text-editor');
    expect(getPreferredOpenMode('/tmp/script.sh')).toBe('text-editor');
  });
});
