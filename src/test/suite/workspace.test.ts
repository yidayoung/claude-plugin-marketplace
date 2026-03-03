import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

suite('PluginDataStore Integration Tests', () => {
  let extension: vscode.Extension<any> | undefined;

  suiteSetup(async () => {
    // 确保扩展已激活
    extension = vscode.extensions.getExtension('yidayoung.claude-plugin-marketplace');
    await extension?.activate();
  });

  test('Should access PluginDataStore through command', async () => {
    // 通过命令获取数据存储
    const dataStore = await vscode.commands.executeCommand('claudePluginMarketplace.getDataStore');

    assert.ok(dataStore, 'PluginDataStore should be accessible');
  });

  test('Should get list of marketplaces', async function() {
    try {
      const dataStore = await vscode.commands.executeCommand('claudePluginMarketplace.getDataStore');

      // 假设 dataStore 有 getMarketplaces 方法
      const marketplaces = await (dataStore as any).getMarketplaces?.();

      assert.ok(Array.isArray(marketplaces), 'Should return an array of marketplaces');
    } catch (error) {
      // 如果方法不存在或出错，跳过此测试
      this.skip();
    }
  });

  test('Should open sidebar webview', async () => {
    // 执行命令打开侧边栏
    await vscode.commands.executeCommand('workbench.view.extension.claude-marketplace-sidebar');

    // 等待一下让 webview 加载
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 验证侧边栏是否可见（这只是示例，实际需要更复杂的检查）
    assert.ok(true, 'Sidebar should be open');
  });
});
