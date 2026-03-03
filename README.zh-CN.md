# Claude Plugin Marketplace

一个 VS Code 扩展，用可视化界面帮助你发现、安装和管理 Claude Code 插件。

语言： [English](./README.md) | 简体中文

## 它能帮你做什么

- 在一个界面里浏览可用插件
- 查看当前已安装插件
- 安装、卸载、启用、禁用、更新插件
- 添加和管理多个插件市场（官方/自定义）
- 安装前查看插件详情

## 安装

从 VS Code 扩展市场安装：

1. 打开 VS Code 扩展页面
2. 搜索 `Claude Plugin Marketplace`
3. 点击 **Install**

## 快速开始（新手）

1. 打开侧边栏中的 **Claude Plugin Marketplace**
2. 在 **已安装** 分组查看当前插件
3. 浏览各市场分组发现新插件
4. 点击插件查看详情
5. 一键安装

## 核心功能

### 1. 侧边栏插件管理

在侧边栏快速查看已安装和可用插件，并执行常用操作。

### 2. 插件详情页

安装前可查看版本、描述、README 以及插件内容（若插件提供）。

### 3. 多市场支持

可同时使用官方市场和自定义市场。

## 截图

![侧边栏总览](screenshot/sidebar-overview.png)
![插件详情](screenshot/plugin-detail.png)
![添加市场](screenshot/add-marketplace.png)

## 常见问题

### 没检测到 Claude Code CLI

- 确认已安装 Claude Code CLI
- 确认 CLI 已加入系统 PATH
- 重载 VS Code 窗口后重试

### 插件安装失败

- 检查网络连接
- 确认市场源地址有效
- 在侧边栏操作菜单中重试

### 插件列表为空

- 点击操作菜单中的刷新
- 检查市场源是否可访问

## FAQ

### 这个扩展会替代 Claude Code CLI 吗？

不会。它是 Claude Code CLI 的可视化管理层。

### 支持私有/内部市场吗？

支持，只要你的环境可以访问对应市场源。
