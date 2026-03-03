/**
 * VS Code API 工具函数
 * 提供统一的 VS Code API 获取和 locale 初始化逻辑
 */

declare const acquireVsCodeApi: () => any;

declare global {
  interface Window {
    vscode?: {
      postMessage: (message: any) => void;
      getState: () => any;
      setState: (state: any) => void;
    };
    __LOCALE__?: string;
    __MARKETPLACE_INIT_STATE__?: { locale?: string };
    __DETAILS_INIT_STATE__?: { locale?: string };
  }
}

/**
 * 获取 VS Code API
 * 如果已存在则返回缓存的版本，否则尝试获取新版本
 */
export function acquireVSCodeApi() {
  if (window.vscode) {
    return window.vscode;
  }

  try {
    const vscode = acquireVsCodeApi();
    window.vscode = vscode;
    return vscode;
  } catch (e) {
    // 在开发环境下，HMR 可能导致此错误，可以忽略
    console.warn('[VSCode API] Failed to acquire:', e);
    return null;
  }
}

/**
 * 获取初始 locale
 * 从初始化状态中获取 locale，并设置到 window.__LOCALE__
 */
export function getInitialLocale(): string {
  const initState =
    window.__MARKETPLACE_INIT_STATE__?.locale ||
    window.__DETAILS_INIT_STATE__?.locale;

  if (initState) {
    window.__LOCALE__ = initState;
  }

  return window.__LOCALE__ || 'en';
}

/**
 * 初始化 VS Code 环境
 * 同时获取 API 和 locale
 */
export function initializeVSCodeEnvironment() {
  const vscode = acquireVSCodeApi();
  const locale = getInitialLocale();

  return { vscode, locale };
}
