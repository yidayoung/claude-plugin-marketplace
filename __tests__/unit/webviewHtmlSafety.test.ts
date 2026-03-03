import { toInlineScriptJson, toInlineStyleCss } from '../../src/pluginMarketplace/webview/utils/htmlSafety';

describe('webview html safety helpers', () => {
  it('escapes closing script tags and line separators in inline script JSON', () => {
    const payload = {
      locale: 'zh-cn',
      text: '</script><script>alert(1)</script>',
      separators: 'A\u2028B\u2029C',
    };

    const escaped = toInlineScriptJson(payload);

    expect(escaped).not.toContain('</script>');
    expect(escaped).toContain('<\\/script>');
    expect(escaped).toContain('\\u2028');
    expect(escaped).toContain('\\u2029');
  });

  it('escapes closing style tags in inline css', () => {
    const css = 'body{color:red;} </style> .x{display:none;}';
    const escaped = toInlineStyleCss(css);

    expect(escaped).not.toContain('</style>');
    expect(escaped).toContain('<\\/style>');
  });
});
