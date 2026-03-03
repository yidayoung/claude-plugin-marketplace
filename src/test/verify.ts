import * as path from 'path';

console.log('=== 测试环境验证 ===');
console.log('当前目录:', __dirname);
console.log('项目根目录:', path.resolve(__dirname, '../../'));
console.log('测试套件路径:', path.resolve(__dirname, './suite/index'));
console.log('环境变量 ELECTRON_RUN_AS_NODE:', process.env.ELECTRON_RUN_AS_NODE);

// 删除可能干扰的环境变量
if (process.env.ELECTRON_RUN_AS_NODE) {
  console.log('删除 ELECTRON_RUN_AS_NODE 环境变量');
  delete process.env.ELECTRON_RUN_AS_NODE;
}

import { runTests } from '@vscode/test-electron';

console.log('开始运行 VS Code 测试...');

async function run() {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');
    const extensionTestsPath = path.resolve(__dirname, './suite/index');

    console.log('扩展开发路径:', extensionDevelopmentPath);
    console.log('测试套件路径:', extensionTestsPath);

    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        '--disable-gpu',
        '--disable-workspace-trust',
        '--skip-release-notes',
        '--skip-welcome'
      ]
    });

    console.log('测试完成!');
  } catch (err) {
    console.error('测试失败:', err);
    process.exit(1);
  }
}

run();
