# VS Code 扩展集成测试指南

## 概述

本项目现在支持两种类型的测试：

1. **Jest 单元测试** - 用于测试独立的函数和类
2. **VS Code 集成测试** - 用于测试扩展在真实 VS Code 环境中的行为

## VS Code 集成测试

### 运行所有测试

```bash
npm run test:vscode
```

这将会：
1. 编译 TypeScript 代码到 `out/` 目录
2. 下载 VS Code（如果尚未下载）
3. 启动 VS Code 并运行测试套件

### 运行特定测试

使用 `--grep` 参数过滤测试：

```bash
npm run test:vscode:grep "Extension"
```

这只会运行名称或描述中包含 "Extension" 的测试。

### 运行特定文件

使用 `--file` 参数运行特定的测试文件：

```bash
npm run test:vscode:file extension
```

这会运行 `extension.test.js` 文件中的所有测试。

## 编写测试

### 测试文件位置

将测试文件放在 `src/test/suite/` 目录下，文件名以 `.test.ts` 结尾。

### 测试结构示例

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('我的测试套件', () => {
  setup(() => {
    // 每个测试前执行
  });

  teardown(() => {
    // 每个测试后执行
  });

  suiteSetup(async () => {
    // 整个套件开始前执行一次
  });

  suiteTeardown(() => {
    // 整个套件结束后执行一次
  });

  test('测试名称', async () => {
    // 测试代码
    assert.strictEqual(1 + 1, 2);
  });
});
```

### 访问扩展 API

```typescript
// 获取扩展实例
const extension = vscode.extensions.getExtension('yidayoung.claude-plugin-marketplace');
await extension?.activate();

// 执行命令
await vscode.commands.executeCommand('claudePluginMarketplace.refresh');

// 访问配置
const config = vscode.workspace.getConfiguration('claudePluginMarketplace');
```

## 测试最佳实践

1. **使用 suiteSetup/suiteTeardown**：对于耗时操作（如激活扩展），使用 suiteSetup 而不是 setup
2. **清理状态**：在 teardown 中恢复 VS Code 状态
3. **使用 await**：VS Code API 大多是异步的，确保正确使用 await
4. **合理的超时时间**：默认超时是 60 秒，可以根据需要调整

## 调试测试

在 VS Code 中按 F5，选择 "运行 VS Code 扩展集成测试" 配置即可调试测试。

## 与 Jest 测试的区别

| 特性 | Jest 测试 | VS Code 集成测试 |
|------|-----------|------------------|
| 环境 | Node.js | 真实 VS Code 实例 |
| 速度 | 快 | 慢（需要启动 VS Code）|
| 用途 | 单元测试、逻辑测试 | 扩展激活、命令执行、UI 交互 |
| 依赖 | Mock VS Code API | 真实 VS Code API |

## 常见问题

### Q: 测试失败，提示扩展未激活
A: 确保在测试前调用 `await extension?.activate()`

### Q: 如何测试 Webview？
A: 可以通过命令打开 webview，然后验证 webview 面板是否创建

### Q: 测试超时怎么办？
A: 增加超时时间或在测试套件索引文件中修改默认超时设置
