/**
 * 统一日志系统
 * 提供可配置的日志级别和输出渠道
 */
import * as vscode from 'vscode';

export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
	NONE = 4,
}

class Logger {
	private level: LogLevel = LogLevel.INFO;
	private outputChannel: vscode.OutputChannel | null = null;

	/**
	 * 设置日志级别
	 */
	setLevel(level: LogLevel): void {
		this.level = level;
	}

	/**
	 * 设置输出渠道（OutputChannel）
	 */
	setOutputChannel(channel: vscode.OutputChannel): void {
		this.outputChannel = channel;
	}

	/**
	 * 输出调试日志
	 */
	debug(prefix: string, message: string, ...args: any[]): void {
		if (this.level <= LogLevel.DEBUG) {
			console.log(`${prefix} ${message}`, ...args);
			this.appendLine(`[DEBUG] ${prefix} ${message}`);
		}
	}

	/**
	 * 输出信息日志
	 */
	info(prefix: string, message: string, ...args: any[]): void {
		if (this.level <= LogLevel.INFO) {
			console.log(`${prefix} ${message}`, ...args);
			this.appendLine(`[INFO] ${prefix} ${message}`);
		}
	}

	/**
	 * 输出警告日志
	 */
	warn(prefix: string, message: string, ...args: any[]): void {
		if (this.level <= LogLevel.WARN) {
			console.warn(`${prefix} ${message}`, ...args);
			this.appendLine(`[WARN] ${prefix} ${message}`);
		}
	}

	/**
	 * 输出错误日志
	 */
	error(prefix: string, message: string, error?: any): void {
		if (this.level <= LogLevel.ERROR) {
			console.error(`${prefix} ${message}`, error);
			this.appendLine(`[ERROR] ${prefix} ${message}: ${error?.message || error}`);
		}
	}

	/**
	 * 追加日志到输出渠道
	 */
	private appendLine(message: string): void {
		if (this.outputChannel) {
			this.outputChannel.appendLine(message);
		}
	}
}

// 导出单例
export const logger = new Logger();
