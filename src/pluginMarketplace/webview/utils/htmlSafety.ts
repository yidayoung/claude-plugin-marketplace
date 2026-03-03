/**
 * Escape JSON for safe embedding inside inline <script> tags.
 */
export function toInlineScriptJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/<\//g, '<\\/')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Escape CSS text for safe embedding inside inline <style> tags.
 */
export function toInlineStyleCss(css: string): string {
  return css.replace(/<\/style/gi, '<\\/style');
}
