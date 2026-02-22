# 插件详情界面 UI 优化实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 优化插件详情界面，添加卸载确认、移除冗余状态图标、增强卡片视觉区分

**架构:** 修改 React 组件，使用 Ant Design Modal 实现确认弹窗，通过 VS Code CSS 变量实现半透明卡片背景

**技术栈:** React, TypeScript, Ant Design, VS Code Webview API

---

## Task 1: 添加卸载确认弹窗

**Files:**
- Modify: [webview/src/details/DetailHeader.tsx](webview/src/details/DetailHeader.tsx)

**Step 1: 导入 Modal 组件**

在 `DetailHeader.tsx` 顶部，将 Modal 添加到已有的 antd 导入中：

```typescript
import { Space, Tag, Button, Dropdown, Tooltip, Typography, Divider, Flex, Switch, Modal } from 'antd';
```

**Step 2: 创建卸载处理函数**

在 `DetailHeader` 组件内部，`scopeConfig` 常量定义之后，添加以下函数：

```typescript
  const handleUninstallWithConfirm = () => {
    Modal.confirm({
      title: '确认卸载',
      content: `确定要卸载插件 "${plugin.name}" 吗？`,
      okText: '卸载',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: onUninstall,
    });
  };
```

**Step 3: 更新卸载按钮的 onClick**

将卸载按钮的 `onClick` 从 `onUninstall` 改为 `handleUninstallWithConfirm`：

```typescript
              <Tooltip title="卸载">
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={handleUninstallWithConfirm}
                />
              </Tooltip>
```

**Step 4: 构建 webview**

Run: `npm run build-webview`
Expected: 成功编译到 `webview/dist/details.js`

**Step 5: 提交**

```bash
git add webview/src/details/DetailHeader.tsx webview/dist/details.js
git commit -m "feat: add uninstall confirmation modal"
```

---

## Task 2: 移除启用状态图标

**Files:**
- Modify: [webview/src/details/DetailHeader.tsx](webview/src/details/DetailHeader.tsx)

**Step 1: 移除状态图标代码**

删除 DetailHeader 组件中标题区域的启用/禁用图标代码（大约第 94-103 行）：

找到这段代码：
```typescript
            {plugin.installed && !isDisabled && (
              <Tooltip title="已启用">
                <CheckCircleFilled style={{ color: '#52c41a', fontSize: 16 }} />
              </Tooltip>
            )}
            {isDisabled && (
              <Tooltip title="已禁用">
                <StopOutlined style={{ fontSize: 16 }} />
              </Tooltip>
            )}
```

将其删除。

**Step 2: 移除不再需要的图标导入**

从导入中移除 `CheckCircleFilled` 和 `StopOutlined`：

修改前：
```typescript
import {
  DeleteOutlined,
  DownloadOutlined,
  UserOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  GithubOutlined,
  LinkOutlined,
  CopyOutlined,
  CheckCircleFilled,
  StopOutlined,
  StarFilled
} from '@ant-design/icons';
```

修改后：
```typescript
import {
  DeleteOutlined,
  DownloadOutlined,
  UserOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  GithubOutlined,
  LinkOutlined,
  CopyOutlined,
  StarFilled
} from '@ant-design/icons';
```

**Step 3: 构建 webview**

Run: `npm run build-webview`
Expected: 成功编译

**Step 4: 提交**

```bash
git add webview/src/details/DetailHeader.tsx webview/dist/details.js
git commit -m "refactor: remove redundant enabled status icon from header"
```

---

## Task 3: 更新 DetailContent 卡片背景色

**Files:**
- Modify: [webview/src/details/DetailContent.tsx](webview/src/details/DetailContent.tsx)

**Step 1: 更新详细描述卡片背景色**

将详细描述卡片的 `background` 从 `var(--vscode-editor-background)` 改为 `var(--vscode-sideBar-background)`：

修改前（约第 20-27 行）：
```typescript
        <Space direction="vertical" size={12} style={{
          padding: 16,
          background: 'var(--vscode-editor-background)',
          borderRadius: 8,
          border: '1px solid var(--vscode-panel-border)',
          width: '100%'
        }}>
```

修改后：
```typescript
        <Space direction="vertical" size={12} style={{
          padding: 16,
          background: 'var(--vscode-sideBar-background)',
          borderRadius: 8,
          border: '1px solid var(--vscode-panel-border)',
          width: '100%'
        }}>
```

**Step 2: 更新元信息卡片背景色**

同样修改元信息卡片的背景色（约第 42-48 行）：

修改前：
```typescript
        <Space direction="vertical" size={12} style={{
          padding: 16,
          background: 'var(--vscode-editor-background)',
          borderRadius: 8,
          border: '1px solid var(--vscode-panel-border)',
          width: '100%'
        }}>
```

修改后：
```typescript
        <Space direction="vertical" size={12} style={{
          padding: 16,
          background: 'var(--vscode-sideBar-background)',
          borderRadius: 8,
          border: '1px solid var(--vscode-panel-border)',
          width: '100%'
        }}>
```

**Step 3: 构建 webview**

Run: `npm run build-webview`
Expected: 成功编译

**Step 4: 提交**

```bash
git add webview/src/details/DetailContent.tsx webview/dist/details.js
git commit -m "style: update content cards background color"
```

---

## Task 4: 更新 README 卡片背景色

**Files:**
- Modify: [webview/src/details/ReadmeSection.tsx](webview/src/details/ReadmeSection.tsx)

**Step 1: 更新 README 卡片背景色**

将 README 卡片的 `background` 从 `var(--vscode-editor-background)` 改为 `var(--vscode-sideBar-background)`（约第 88-94 行）：

修改前：
```typescript
    <Space direction="vertical" size={12} style={{
      padding: 16,
      background: 'var(--vscode-editor-background)',
      borderRadius: 8,
      border: '1px solid var(--vscode-panel-border)',
      width: '100%'
    }}>
```

修改后：
```typescript
    <Space direction="vertical" size={12} style={{
      padding: 16,
      background: 'var(--vscode-sideBar-background)',
      borderRadius: 8,
      border: '1px solid var(--vscode-panel-border)',
      width: '100%'
    }}>
```

**Step 2: 构建 webview**

Run: `npm run build-webview`
Expected: 成功编译

**Step 3: 提交**

```bash
git add webview/src/details/ReadmeSection.tsx webview/dist/details.js
git commit -m "style: update README card background color"
```

---

## Task 5: 验证和测试

**Step 1: 启动扩展开发模式**

Run: 按 F5 或使用 "🔴 开发扩展 (Webview 热更新)" 配置
Expected: VS Code 新窗口打开，扩展已激活

**Step 2: 测试卸载确认**

1. 打开插件市场侧边栏
2. 点击任意已安装的插件
3. 点击详情页中的卸载按钮
4. 验证: 弹出确认对话框
5. 点击"取消"，验证插件未被卸载
6. 再次点击卸载，点击"卸载"，验证插件被卸载

**Step 3: 测试状态图标移除**

1. 打开任意已安装插件详情
2. 验证: 标题左侧没有启用/禁用图标
3. 验证: 右侧 Switch 开关正常工作

**Step 4: 测试卡片背景色**

1. 切换 VS Code 主题（浅色/深色/其他主题）
2. 验证: 详细描述、README、元信息卡片与背景有明显区分
3. 验证: 边框清晰可见

**Step 5: 提交最终版本**

```bash
git add .
git commit -m "test: verify plugin details UI improvements"
```

---

## 完成检查清单

- [ ] 卸载时弹出确认对话框
- [ ] 确认对话框包含插件名称
- [ ] 确认按钮为危险样式（红色）
- [ ] 标题左侧无启用/禁用图标
- [ ] 右侧 Switch 正常工作
- [ ] 详细描述卡片有半透明背景
- [ ] README 卡片有半透明背景
- [ ] 元信息卡片有半透明背景
- [ ] 多主题下显示正常
