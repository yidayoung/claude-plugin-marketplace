# 插件详情界面 UI 优化设计

**日期:** 2026-02-22
**状态:** 已批准

## 概述

对插件详情界面进行三个小优化：
1. 卸载操作需要二次确认
2. 移除标题左侧的启用状态图标（与右侧 Switch 重复）
3. 为详细描述、README、元信息卡片添加半透明背景色以增强视觉区分

## 设计目标

- **安全性:** 防止用户误操作卸载插件
- **简洁性:** 移除冗余的状态指示器
- **可读性:** 增强卡片与背景的视觉区分

## 设计方案

### 1. 卸载确认弹窗

**实现方式:**
- 使用 Ant Design 的 `Modal.confirm()` 组件
- 点击卸载按钮时弹出确认对话框
- 对话框配置:
  - 标题: "确认卸载"
  - 内容: "确定要卸载插件 `{pluginName}` 吗？"
  - 确认按钮: 危险样式 (红色)
  - 取消按钮: 默认样式

**需要修改的文件:**
- `webview/src/details/DetailHeader.tsx`

### 2. 移除启用状态 Tag

**当前实现:**
- 标题左侧有 `CheckCircleFilled` (已启用) 或 `StopOutlined` (已禁用) 图标
- 右侧已有 Switch 开关显示启用状态

**修改:**
- 移除 [DetailHeader.tsx:94-103](webview/src/details/DetailHeader.tsx#L94-L103) 中的状态图标代码

**需要修改的文件:**
- `webview/src/details/DetailHeader.tsx`

### 3. 卡片背景颜色优化

**当前问题:**
- 卡片使用 `var(--vscode-editor-background)` 作为背景色
- 与整体背景相同，边界不明显

**方案:**
- 使用 `var(--vscode-sideBar-background)` 作为卡片背景
- 保持边框 `1px solid var(--vscode-panel-border)`

**影响的卡片:**
1. 详细描述卡片 (`DetailContent.tsx`)
2. README 卡片 (`ReadmeSection.tsx`)
3. 元信息卡片 (`DetailContent.tsx`)

**需要修改的文件:**
- `webview/src/details/DetailContent.tsx`
- `webview/src/details/ReadmeSection.tsx`

## 实现检查清单

- [ ] 在 `DetailHeader.tsx` 中添加卸载确认 Modal
- [ ] 移除 `DetailHeader.tsx` 中的启用/禁用状态图标
- [ ] 更新 `DetailContent.tsx` 中卡片的背景色
- [ ] 更新 `ReadmeSection.tsx` 中卡片的背景色
- [ ] 测试卸载确认流程
- [ ] 测试不同主题下的卡片显示效果

## 备注

无
