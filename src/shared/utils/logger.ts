/**
 * 统一日志工具类
 * 提供可配置的日志级别，便于生产环境和开发环境切换
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

class Logger {
  private level: LogLevel;

  constructor() {
    // 生产环境默认只输出错误和警告，开发环境可通过 setLevel 调整
    this.level = LogLevel.ERROR;
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
      console.log('[DEBUG]', ...args);
    }
  }

  /**
   * 信息日志 - 关键操作使用
   */
  info(...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log('[INFO]', ...args);
    }
  }

  /**
   * 警告日志
   */
  warn(...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn('[WARN]', ...args);
    }
  }

  /**
   * 错误日志 - 始终输出
   */
  error(...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error('[ERROR]', ...args);
    }
  }

  /**
   * 性能测量日志
   */
  performance(label: string, duration: number): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log(`[PERF] ${label}: ${duration}ms`);
    }
  }
}

// 单例实例
export const logger = new Logger();
