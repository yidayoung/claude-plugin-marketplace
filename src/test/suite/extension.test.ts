import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Claude Plugin Marketplace Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('Extension should be present', () => {
    assert.ok(vscode.extensions.getExtension('yidayoung.claude-plugin-marketplace'));
  });

  test('Extension should activate', async () => {
    const extension = vscode.extensions.getExtension('yidayoung.claude-plugin-marketplace');
    assert.ok(extension);
    await extension?.activate();
    assert.strictEqual(extension?.isActive, true);
  });

  test('Should register all commands', async () => {
    const commands = await vscode.commands.getCommands(true);

    const expectedCommands = [
      'claudePluginMarketplace.refresh',
      'claudePluginMarketplace.addMarketplace',
      'claudePluginMarketplace.removeMarketplace',
      'claudePluginMarketplace.refreshMarketplace',
      'claudePluginMarketplace.installPlugin',
      'claudePluginMarketplace.uninstallPlugin',
      'claudePluginMarketplace.updatePlugin',
      'claudePluginMarketplace.showPluginDetails',
      'claudePluginMarketplace.enablePlugin',
      'claudePluginMarketplace.disablePlugin'
    ];

    for (const command of expectedCommands) {
      assert.ok(commands.includes(command), `Command ${command} should be registered`);
    }
  });

  test('Should execute refresh command', async () => {
    // 测试刷新命令是否能正常执行
    await vscode.commands.executeCommand('claudePluginMarketplace.refresh');
    // 如果没有抛出错误，则测试通过
    assert.ok(true);
  });
});
