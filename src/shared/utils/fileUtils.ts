// src/shared/utils/fileUtils.ts
import * as fs from 'fs/promises';

/**
 * 安全读取文件，失败时返回 null
 */
export async function tryReadFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * 在多个路径中查找文件
 */
export async function findFileInPaths(
  fileName: string,
  searchPaths: string[]
): Promise<string | null> {
  for (const basePath of searchPaths) {
    const filePath = basePath + '/' + fileName;
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * 带默认值的访问函数
 */
export async function accessWithDefault<T>(
  fn: () => Promise<T>,
  defaultValue: T
): Promise<T> {
  try {
    return await fn();
  } catch {
    return defaultValue;
  }
}
