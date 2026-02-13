# Claude Plugin Marketplace

一个强大的 VS Code 扩展，为 Claude Code CLI 提供可视化的插件市场功能。通过此扩展，您可以轻松地浏览、安装、管理和更新 Claude Code 插件。

## 功能特性

### 核心功能
- **插件市场浏览**: 可视化浏览所有可用的 Claude Code 插件
- **插件管理**: 一键安装、卸载、更新插件
- **多市场支持**: 支持添加和管理多个插件市场（官方市场、内部市场等）
- **已安装插件管理**: 查看和管理所有已安装的插件
- **插件搜索**: 快速搜索和过滤插件
- **插件详情**: 查看插件的详细信息和文档

### 界面特性
- **侧边栏视图**: 在 VS Code 侧边栏中直观地查看插件树
- **Webview 界面**: 现代化的 React 界面，提供更好的用户体验
- **实时状态**: 显示插件的安装状态和版本信息
- **命令面板**: 通过命令面板快速执行插件操作

## 安装

### 前置要求
1. 安装 [Claude Code CLI](https://claude.ai/download)
2. 确保 Claude Code CLI 已添加到系统 PATH

### 从源码安装

```bash
# 克隆仓库
git clone https://github.com/your-org/claude-plugin-marketplace.git
cd claude-plugin-marketplace/vscode-extension

# 安装依赖
npm install

# 编译 TypeScript
npm run compile

# 在 VS Code 中安装
# 1. 按 F5 启动扩展开发主机
# 2. 或在 VS Code 中按 Ctrl+Shift+P，输入 "Install from Location"
#    选择此扩展的目录
```

### 从 VS Code Marketplace 安装（待发布）

```
待发布后可通过 VS Code 扩展市场直接搜索安装
```

## 使用指南

### 基本操作

#### 1. 打开插件市场
- 通过侧边栏的 "Claude Plugin Marketplace" 视图
- 或使用命令面板 (Ctrl+Shift+P) 输入 "Claude Plugin Marketplace: Open"

#### 2. 浏览插件
- **已安装插件**: 查看所有已安装的插件
- **市场列表**: 浏览各个插件市场
- **可用插件**: 查看市场中的插件

#### 3. 管理插件
- **安装插件**: 右键点击可用插件，选择 "安装"
- **卸载插件**: 右键点击已安装插件，选择 "卸载"
- **更新插件**: 右键点击已安装插件，选择 "更新"
- **查看详情**: 右键点击插件，选择 "查看详情"

#### 4. 管理市场
- **添加市场**: 右键点击插件市场根节点，选择 "添加市场"
- **删除市场**: 右键点击市场，选择 "删除市场"
- **刷新市场**: 右键点击市场，选择 "刷新市场"

### 命令参考

| 命令 | 说明 |
|------|------|
| `claudePluginMarketplace.open` | 打开插件市场 Webview 界面 |
| `claudePluginMarketplace.refresh` | 刷新插件列表 |
| `claudePluginMarketplace.addMarketplace` | 添加新的插件市场 |
| `claudePluginMarketplace.removeMarketplace` | 删除插件市场 |
| `claudePluginMarketplace.refreshMarketplace` | 刷新指定市场 |
| `claudePluginMarketplace.installPlugin` | 安装插件 |
| `claudePluginMarketplace.uninstallPlugin` | 卸载插件 |
| `claudePluginMarketplace.updatePlugin` | 更新插件 |
| `claudePluginMarketplace.enablePlugin` | 启用插件 |
| `claudePluginMarketplace.disablePlugin` | 禁用插件 |
| `claudePluginMarketplace.showPluginDetails` | 显示插件详情 |
| `claudePluginMarketplace.openPluginFolder` | 打开插件目录 |
| `claudePluginMarketplace.searchPlugins` | 搜索插件 |

## 开发指南

### 项目结构

```
claude-plugin-marketplace/
├── vscode-extension/           # VS Code 扩展主目录
│   ├── src/
│   │   ├── extension.ts        # 扩展入口文件
│   │   └── pluginMarketplace/  # 插件市场核心代码
│   │       ├── pluginManager.ts       # 插件管理器
│   │       ├── marketplaceManager.ts  # 市场管理器
│   │       ├── pluginTreeProvider.ts   # 树视图提供器
│   │       ├── types.ts               # 类型定义
│   │       └── webview/               # Webview 界面
│   │           ├── PluginMarketplacePanel.ts
│   │           ├── messages/          # 消息处理
│   │           ├── services/          # 数据服务
│   │           └── dist/              # React 构建产物
│   ├── package.json           # 扩展配置文件
│   ├── tsconfig.json          # TypeScript 配置
│   └── assets/                # 资源文件
└── README.md
```

### 开发设置

#### 1. 安装依赖
```bash
cd vscode-extension
npm install
```

#### 2. 编译 TypeScript
```bash
npm run compile
```

#### 3. 监听模式（开发时使用）
```bash
npm run watch
```

#### 4. 在 VS Code 中调试
1. 按 F5 启动扩展开发主机
2. 在新打开的 VS Code 窗口中测试扩展功能

#### 5. Webview 开发（可选）
如果需要修改 Webview 界面：

```bash
cd webview
npm install
npm run dev
```

### 测试

#### 手动测试清单
- [ ] 打开插件市场视图
- [ ] 查看已安装插件列表
- [ ] 查看可用插件列表
- [ ] 安装一个插件
- [ ] 卸载一个插件
- [ ] 更新一个插件
- [ ] 添加自定义市场
- [ ] 删除自定义市场
- [ ] 刷新插件列表
- [ ] 搜索插件
- [ ] 查看插件详情

## 配置

### 添加自定义市场

1. 右键点击侧边栏的 "Claude Plugin Marketplace" 视图
2. 选择 "添加市场"
3. 输入市场名称（例如："内部市场"）
4. 输入市场来源（URL、Git 仓库或本地路径）

### 市场来源格式

- **URL**: `https://github.com/company/marketplace`
- **Git 仓库**: `git@github.com:company/marketplace.git`
- **本地路径**: `/path/to/marketplace`

## 故障排除

### Claude Code 未检测到
**问题**: 扩展提示未检测到 Claude Code CLI

**解决方案**:
1. 确认已安装 [Claude Code CLI](https://claude.ai/download)
2. 确保 Claude Code CLI 在系统 PATH 中
3. 重启 VS Code

### 插件安装失败
**问题**: 插件安装命令执行失败

**解决方案**:
1. 检查网络连接
2. 确认市场地址正确
3. 查看输出面板的详细错误信息

### Webview 无法加载
**问题**: 插件市场界面无法显示

**解决方案**:
1. 确认已编译 Webview 资源
2. 检查 `webview/dist` 目录是否存在
3. 尝试重新加载 VS Code 窗口

## 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详情。

### 贡献方式
1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 致谢

- [Claude Code](https://claude.ai/download) - 强大的 AI 编程助手
- [VS Code Extension API](https://code.visualstudio.com/api) - VS Code 扩展开发文档

## 联系方式

- 问题反馈: [GitHub Issues](https://github.com/your-org/claude-plugin-marketplace/issues)
- 功能建议: [GitHub Discussions](https://github.com/your-org/claude-plugin-marketplace/discussions)

## 更新日志

### v1.0.0 (待发布)
- 初始版本发布
- 支持基本的插件市场功能
- 支持插件安装、卸载、更新
- 支持多市场管理
- Webview 界面

---

**注意**: 本扩展需要 Claude Code CLI 才能正常工作。请确保在使用前已正确安装。
