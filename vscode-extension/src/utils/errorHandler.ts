/**
 * 统一错误处理模块
 * 提供用户友好的错误消息和进度指示器
 */
import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import { ERROR_MESSAGES } from '../constants/reviewConstants';
import { logger } from './logger';
import { LOG_PREFIX } from '../constants/reviewConstants';

/**
 * Review 专用错误类
 */
export class ReviewError extends Error {
	constructor(
		message: string,
		public readonly userMessage: string,
		public readonly showToUser: boolean = true
	) {
		super(message);
		this.name = 'ReviewError';
	}
}

/**
 * 带进度指示器和错误处理的异步操作包装器
 */
export async function withProgressAndErrorHandling<T>(
	title: string,
	operation: () => Promise<T>
): Promise<T> {
	return vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title,
			cancellable: false,
		},
		async () => {
			try {
				return await operation();
			} catch (error) {
				return handleError(error);
			}
		}
	);
}

/**
 * 统一错误处理函数
 */
export function handleError(error: unknown): never {
	if (error instanceof ReviewError) {
		if (error.showToUser) {
			vscode.window.showErrorMessage(error.userMessage);
		}
		logger.error(LOG_PREFIX.REVIEW_COMMANDS, error.userMessage, error);
		throw error;
	}

	if (error instanceof yaml.YAMLException) {
		const message = `${ERROR_MESSAGES.YAML_PARSE_FAILED}: ${error.message}`;
		vscode.window.showErrorMessage(message);
		logger.error(LOG_PREFIX.REVIEW_COMMANDS, message, error);
		throw new ReviewError(message, message, true);
	}

	const message = error instanceof Error ? error.message : String(error);
	vscode.window.showErrorMessage(message);
	logger.error(LOG_PREFIX.REVIEW_COMMANDS, message, error);
	throw new ReviewError(message, message, true);
}

/**
 * 显示成功消息
 */
export function showSuccess(message: string): void {
	vscode.window.showInformationMessage(message);
	logger.info(LOG_PREFIX.REVIEW_COMMANDS, message);
}
