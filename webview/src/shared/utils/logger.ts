/**
 * Webview 统一日志工具类
 * 提供可配置的日志级别，开发环境自动输出，生产环境仅输出错误
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

class WebviewLogger {
  private level: LogLevel;
  private isDev: boolean;

  constructor() {
    // 开发环境默认 DEBUG，生产环境默认 ERROR
    this.isDev = import.meta.env.DEV;
    this.level = this.isDev ? LogLevel.DEBUG : LogLevel.ERROR;
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * 获取当前日志级别
   */
  getLevel(): LogLevel {
    return this.level;
  }

  /**
   * 调试日志 - 开发调试使用
   */
  debug(...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log('[Webview Debug]', ...args);
    }
  }

  /**
   * 信息日志 - 关键操作使用
   */
  info(...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log('[Webview Info]', ...args);
    }
  }

  /**
   * 警告日志
   */
  warn(...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn('[Webview Warn]', ...args);
    }
  }

  /**
   * 错误日志 - 始终输出
   */
  error(...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error('[Webview Error]', ...args);
    }
  }

  /**
   * 性能测量日志
   */
  performance(label: string, duration: number): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log(`[Webview Perf] ${label}: ${duration}ms`);
    }
  }
}

// 单例实例
export const logger = new WebviewLogger();
