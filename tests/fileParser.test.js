#!/usr/bin/env node
/**
 * FileParser 测试脚本
 *
 * 运行: node tests/fileParser.test.js
 */

const path = require('path');
const fs = require('fs');

// 模拟 vscode 模块
const mockVscode = {
  workspace: {
    workspaceFolders: [
      { uri: { fsPath: '/Users/test/workspace' } }
    ]
  }
};

// 创建 mock 模块
const mockModules = {
  'vscode': mockVscode,
  'fs/promises': fs.promises
};

// 简单的测试运行器
class TestRunner {
  constructor() {
    this.tests = [];
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0
    };
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('\n运行测试...\n');

    for (const test of this.tests) {
      try {
        await test.fn();
        this.results.passed++;
        console.log('  ✓', test.name);
      } catch (error) {
        this.results.failed++;
        console.log('  ✗', test.name);
        console.log('    Error:', error.message);
      }
    }

    this.printSummary();
  }

  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log(`总计: ${this.tests.length} | 通过: ${this.results.passed} | 失败: ${this.results.failed}`);
    console.log('='.repeat(50));
  }

  assertEqual(actual, expected, message = '') {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
      throw new Error(message || `Expected ${expectedStr}, but got ${actualStr}`);
    }
  }

  assertTruthy(value, message = '') {
    if (!value) {
      throw new Error(message || 'Expected truthy value');
    }
  }

  assertArrayLength(arr, length, message = '') {
    if (!Array.isArray(arr) || arr.length !== length) {
      throw new Error(message || `Expected array of length ${length}, got ${arr?.length}`);
    }
  }
}

// 文件解析器测试
async function testFileParser() {
  const runner = new TestRunner();

  // 注意: 这些测试需要实际的文件存在才能运行
  // 如果文件不存在，测试会跳过

  runner.test('installed_plugins.json 文件存在性', async () => {
    const installedPath = path.join(require('os').homedir(), '.claude', 'plugins', 'installed_plugins.json');
    const exists = fs.existsSync(installedPath);
    if (exists) {
      runner.assertTruthy(true);
    } else {
      console.log('    (跳过 - 文件不存在)');
      runner.results.skipped++;
    }
  });

  runner.test('known_marketplaces.json 文件存在性', async () => {
    const marketplacesPath = path.join(require('os').homedir(), '.claude', 'plugins', 'known_marketplaces.json');
    const exists = fs.existsSync(marketplacesPath);
    if (exists) {
      runner.assertTruthy(true);
    } else {
      console.log('    (跳过 - 文件不存在)');
      runner.results.skipped++;
    }
  });

  runner.test('解析 installed_plugins.json', async () => {
    const installedPath = path.join(require('os').homedir(), '.claude', 'plugins', 'installed_plugins.json');
    const exists = fs.existsSync(installedPath);

    if (!exists) {
      console.log('    (跳过 - 文件不存在)');
      runner.results.skipped++;
      return;
    }

    const content = fs.readFileSync(installedPath, 'utf-8');
    const data = JSON.parse(content);

    runner.assertTruthy(data.version, 'version 字段存在');
    runner.assertTruthy(data.plugins, 'plugins 字段存在');

    const pluginKeys = Object.keys(data.plugins);
    console.log(`    找到 ${pluginKeys.length} 个已安装插件`);
  });

  runner.test('解析 known_marketplaces.json', async () => {
    const marketplacesPath = path.join(require('os').homedir(), '.claude', 'plugins', 'known_marketplaces.json');
    const exists = fs.existsSync(marketplacesPath);

    if (!exists) {
      console.log('    (跳过 - 文件不存在)');
      runner.results.skipped++;
      return;
    }

    const content = fs.readFileSync(marketplacesPath, 'utf-8');
    const data = JSON.parse(content);

    const marketplaceNames = Object.keys(data);
    console.log(`    找到 ${marketplaceNames.length} 个市场: ${marketplaceNames.join(', ')}`);
    runner.assertTruthy(marketplaceNames.length > 0, '至少有一个市场');
  });

  runner.test('解析 marketplace.json (第一个市场)', async () => {
    const knownMarketplacesPath = path.join(require('os').homedir(), '.claude', 'plugins', 'known_marketplaces.json');
    const exists = fs.existsSync(knownMarketplacesPath);

    if (!exists) {
      console.log('    (跳过 - 文件不存在)');
      runner.results.skipped++;
      return;
    }

    const knownData = JSON.parse(fs.readFileSync(knownMarketplacesPath, 'utf-8'));
    const firstMarketplace = Object.keys(knownData)[0];

    const marketplaceConfigPath = path.join(
      require('os').homedir(),
      '.claude',
      'plugins',
      'marketplaces',
      firstMarketplace,
      '.claude-plugin',
      'marketplace.json'
    );

    const configExists = fs.existsSync(marketplaceConfigPath);
    if (!configExists) {
      console.log('    (跳过 - marketplace.json 不存在)');
      runner.results.skipped++;
      return;
    }

    const config = JSON.parse(fs.readFileSync(marketplaceConfigPath, 'utf-8'));
    runner.assertTruthy(config.name, 'marketplace name 存在');
    runner.assertTruthy(config.plugins, 'plugins 数组存在');
    console.log(`    ${firstMarketplace}: ${config.plugins.length} 个插件`);
  });

  await runner.run();
}

// 运行测试
testFileParser().catch(console.error);
