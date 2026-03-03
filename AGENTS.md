# AGENTS.md

本文件定义本仓库内 Agent（Codex / Claude Code 等）的最小工作规范。

## 1. 项目概览

- 项目类型: VS Code Extension + React Webview
- 主要目标: 为 Claude Code CLI 提供插件市场的可视化管理能力
- 核心目录:
  - `src/`: 扩展端 TypeScript 代码
  - `src/pluginMarketplace/data/`: 数据层（核心）
  - `src/pluginMarketplace/webview/`: 扩展端 Webview 宿主
  - `webview/`: React 前端（Vite）
  - `__tests__/`, `src/**/__tests__/`: 单元测试

## 2. 快速命令

在仓库根目录执行:

- 安装依赖: `npm install`
- 编译扩展: `npm run compile`
- 构建 Webview: `npm run build-webview`
- 运行单测: `npm test`
- 覆盖率: `npm run test:coverage`
- VS Code 集成测试: `npm run test:vscode`
- Webview 开发模式: `npm run dev-webview`

## 3. 架构硬约束

1. **唯一数据源**: 所有插件/市场数据读写必须通过 `PluginDataStore`。
2. **禁止平行状态管理**: 不要新增第二套缓存或 manager 与 `PluginDataStore` 并行。
3. **事件驱动更新**: UI 刷新基于 store events，不使用轮询。
4. **CLI 执行统一入口**: 通过现有封装（如 `execClaudeCommand` 或 `PluginDataStore` 内方法）调用 Claude CLI。

## 4. 代码与变更原则

1. 优先小步修改，避免无关重构。
2. 保持 TypeScript 类型完整，不引入 `any` 规避类型系统。
3. 复用现有目录结构与命名风格，不随意迁移文件。
4. 涉及 UI 文案时，遵循 i18n 机制，不硬编码用户可见字符串。

## 5. 测试与验证要求

完成代码变更后，至少执行:

1. `npm run compile`
2. `npm test`

如改动涉及 Webview 构建或样式资源，再执行:

1. `npm run build-webview`

如仅文档改动，可不跑编译与测试，但需在回复中明确说明。

## 6. 提交前检查清单

1. 变更是否遵守 `PluginDataStore` 单一数据源约束。
2. 是否补充或更新必要测试。
3. 是否更新相关文档（README / TESTING / 本文件）。
4. 是否避免提交构建产物或无关格式化噪音。

## 7. 沟通约定

1. 默认使用中文沟通。
2. 回答先给结论，再给关键证据（命令、文件、测试结果）。
3. 若存在阻塞（权限、环境、依赖），明确说明阻塞点和下一步建议。
