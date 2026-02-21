// Jest setup file
import * as os from 'os';

// 扩展全局类型
declare global {
  var testConfig: {
    homeDir: string;
    cacheBasePath: string;
    testPlugins: string[];
  };
  var testHelpers: {
    fileExists(path: string): Promise<boolean>;
    readJson(path: string): Promise<any>;
  };
}

// 全局测试配置
global.testConfig = {
  // 使用真实的 HOME 目录进行集成测试
  homeDir: os.homedir(),

  // 已安装插件的缓存目录
  cacheBasePath: `${os.homedir()}/.claude/plugins/cache`,

  // 用于测试的插件（从实际安装的插件中选择）
  testPlugins: [
    'frontend-design',
    'superpowers',
  ],
};

// 简单的测试辅助函数
global.testHelpers = {
  /**
   * 检查文件是否存在
   */
  async fileExists(path: string): Promise<boolean> {
    const fs = require('fs/promises');
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * 读取 JSON 文件
   */
  async readJson(path: string): Promise<any> {
    const fs = require('fs/promises');
    const content = await fs.readFile(path, 'utf-8');
    return JSON.parse(content);
  },
};
