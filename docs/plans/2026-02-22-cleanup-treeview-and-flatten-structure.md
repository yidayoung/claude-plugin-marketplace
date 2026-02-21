# 清理 TreeView 和扁平化目录结构实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标：** 移除未使用的 TreeView 代码并将扩展目录从嵌套结构扁平化到标准 VS Code 扩展结构

**架构：**
1. 删除 `PluginTreeProvider` 类和 `PluginTreeItem` 类型（未使用）
2. 更新 `extension.ts` 中的命令签名以接收纯对象而非 `PluginTreeItem`
3. 将 `vscode-extension/` 内容移至仓库根目录
4. 更新所有配置文件中的路径引用

**技术栈：** TypeScript, VS Code Extension API, Git

---

## Task 1: 移除 PluginTreeProvider 文件

**Files:**
- Delete: `vscode-extension/src/pluginMarketplace/pluginTreeProvider.ts`

**Step 1: 验证文件未被引用**

确认没有其他文件导入 `PluginTreeProvider`：
```bash
cd vscode-extension && grep -r "PluginTreeProvider" src/ --exclude-dir=node_modules
```

Expected output: 只有 `pluginTreeProvider.ts` 本身和 `extension.ts` 中的类型导入

**Step 2: 删除文件**

```bash
rm vscode-extension/src/pluginMarketplace/pluginTreeProvider.ts
```

Expected: 文件删除成功，无错误

**Step 3: 验证编译**

```bash
cd vscode-extension && npm run compile
```

Expected: 编译成功（可能有类型错误，将在下一个任务修复）

**Step 4: 提交**

```bash
git add vscode-extension/src/pluginMarketplace/pluginTreeProvider.ts
git commit -m "refactor: remove unused PluginTreeProvider class"
```

---

## Task 2: 清理 PluginTreeItem 类型

**Files:**
- Modify: `vscode-extension/src/pluginMarketplace/types.ts:67-160`
- Modify: `vscode-extension/src/extension.ts:5,161,193,221,241,261,288`

**Step 1: 移除 PluginTreeItem 类定义**

编辑 `vscode-extension/src/pluginMarketplace/types.ts`，删除：
- Lines 67-74: `TreeItemType` 类型
- Lines 76-160: `PluginTreeItem` 类

**Step 2: 更新 extension.ts 中的命令签名**

对于 `extension.ts` 中的每个命令，将参数类型从 `PluginTreeItem` 改为内联对象类型：

```typescript
// 修改前 (line 161)
vscode.commands.registerCommand('claudePluginMarketplace.installPlugin', async (item: PluginTreeItem) => {

// 修改后
vscode.commands.registerCommand('claudePluginMarketplace.installPlugin', async (item: { name?: string; marketplace?: string; plugin?: { name?: string; marketplace?: string } }) => {
```

需要修改的命令：
- Line 161: `installPlugin`
- Line 193: `uninstallPlugin`
- Line 221: `enablePlugin`
- Line 241: `disablePlugin`
- Line 261: `updatePlugin`
- Line 288: `showPluginDetails`

**Step 3: 移除 PluginTreeItem 导入**

在 `extension.ts` 第 5 行，从导入中移除 `PluginTreeItem`：

```typescript
// 修改前
import { PluginTreeItem, PluginScope } from './pluginMarketplace/types';

// 修改后
import { PluginScope } from './pluginMarketplace/types';
```

**Step 4: 验证编译**

```bash
cd vscode-extension && npm run compile
```

Expected: 编译成功，无类型错误

**Step 5: 运行测试**

```bash
cd vscode-extension && npm test
```

Expected: 所有测试通过

**Step 6: 提交**

```bash
git add vscode-extension/src/extension.ts vscode-extension/src/pluginMarketplace/types.ts
git commit -m "refactor: remove PluginTreeItem type and update command signatures"
```

---

## Task 3: 创建新的目录结构映射

**Files:**
- Create: `docs/plans/migration-map.txt` (临时文件，记录迁移映射)

**Step 1: 创建迁移映射文档**

```bash
cat > docs/plans/migration-map.txt << 'EOF'
# 目录迁移映射

## 旧路径 -> 新路径

vscode-extension/src -> src
vscode-extension/webview -> webview
vscode-extension/out -> out
vscode-extension/resources -> resources
vscode-extension/__tests__ -> __tests__
vscode-extension/__mocks__ -> __mocks__
vscode-extension/node_modules -> node_modules
vscode-extension/package.json -> package.json
vscode-extension/tsconfig.json -> tsconfig.json
vscode-extension/jest.config.js -> jest.config.js
EOF
```

**Step 4: 提交**

```bash
git add docs/plans/migration-map.txt
git commit -m "docs: add directory migration mapping reference"
```

---

## Task 4: 更新 tsconfig.json 路径配置

**Files:**
- Modify: `vscode-extension/tsconfig.json:15-18`
- Modify: `vscode-extension/webview/tsconfig.json`

**Step 1: 更新扩展 tsconfig.json**

修改 `vscode-extension/tsconfig.json`，移除 `webview` 路径别名（因为即将扁平化）：

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "outDir": "out",
    "lib": ["ES2020"],
    "sourceMap": true,
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "baseUrl": ".",
    "paths": {
      "@webview/*": ["webview/src/*"]
    }
  },
  "exclude": ["node_modules", ".vscode-test", "webview"],
  "include": ["src/**/*"]
}
```

这个文件不需要改动，因为它将在迁移后被移动到根目录。

**Step 2: 验证当前配置有效**

```bash
cd vscode-extension && npx tsc --noEmit
```

Expected: 无类型错误

**Step 5: 提交**

```bash
git add vscode-extension/tsconfig.json
git commit -m "docs: verify tsconfig.json before migration"
```

---

## Task 5: 更新 .gitignore

**Files:**
- Modify: `.gitignore`
- Modify: `vscode-extension/.gitignore` (如果存在)

**Step 1: 检查是否有 vscode-extension/.gitignore**

```bash
ls -la vscode-extension/.gitignore 2>/dev/null || echo "No .gitignore in vscode-extension/"
```

**Step 2: 更新根目录 .gitignore**

确保 `.gitignore` 包含以下内容（移除 `vscode-extension/` 前缀）：

```gitignore
# Node modules
node_modules/

# Compiled output
out/
dist/
*.log

# Test coverage
coverage/

# VS Code
.vscode-test/
*.vsix

# OS
.DS_Store
Thumbs.db

# Claude
.claude/cache/
```

**Step 4: 提交**

```bash
git add .gitignore
git commit -m "chore: update .gitignore for flat structure"
```

---

## Task 6: 更新 .vscode 配置

**Files:**
- Modify: `.vscode/launch.json`
- Modify: `.vscode/tasks.json`
- Modify: `.vscode/settings.json` (如果存在)
- Modify: `.vscode/extensions.json` (如果存在)

**Step 1: 更新 launch.json 路径**

将所有 `vscode-extension/` 路径前缀移除：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "🔴 开发模式 (Webview热更新)",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}",
        "--extensionDevelopmentPath=${workspaceFolder}"
      ],
      "outFiles": ["${workspaceFolder}/out/**/*.js"],
      "preLaunchTask": "npm: watch"
    }
  ]
}
```

**Step 2: 更新 tasks.json 路径**

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "npm: watch",
      "type": "npm",
      "script": "watch",
      "isBackground": true,
      "problemMatcher": "$tsc-watch"
    }
  ]
}
```

**Step 4: 提交**

```bash
git add .vscode/
git commit -m "chore: update VS Code config for flat structure"
```

---

## Task 7: 执行目录扁平化迁移

**Files:**
- Move: `vscode-extension/*` -> `./`

**Step 1: 使用 git mv 移动目录**

```bash
# 移动所有文件（使用 git mv 保留历史）
git mv vscode-extension/src .
git mv vscode-extension/webview .
git mv vscode-extension/out .
git mv vscode-extension/resources .
git mv vscode-extension/__tests__ .
git mv vscode-extension/__mocks__ .
git mv vscode-extension/node_modules .
git mv vscode-extension/package.json .
git mv vscode-extension/tsconfig.json .
git mv vscode-extension/jest.config.js .
```

**Step 2: 移动其他隐藏文件**

```bash
# 检查并移动其他文件
ls -la vscode-extension/
git mv vscode-extension/.eslintrc.json . 2>/dev/null || true
git mv vscode-extension/.prettierrc . 2>/dev/null || true
```

**Step 3: 删除空的 vscode-extension 目录**

```bash
rmdir vscode-extension 2>/dev/null || ls vscode-extension
```

如果有剩余文件，检查是否需要保留。

**Step 4: 更新 webview/vite.config.ts**

检查并更新 webview 构建配置中的输出路径：

```typescript
// webview/vite.config.ts
export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // 确保输出到正确的位置
      }
    }
  }
});
```

**Step 5: 更新 webview/package.json scripts**

修改构建脚本以反映新路径：

```json
{
  "scripts": {
    "build-webview": "npx tsc && npx vite build && shx rm -rf dist/src && shx mv dist/sidebar.* dist/ 2>/dev/null || true"
  }
}
```

**Step 6: 验证编译**

```bash
npm run compile
```

Expected: 编译成功

**Step 7: 构建 webview**

```bash
npm run build-webview
```

Expected: 构建成功

**Step 8: 运行测试**

```bash
npm test
```

Expected: 所有测试通过

**Step 9: 提交**

```bash
git add -A
git commit -m "refactor: flatten directory structure - move vscode-extension/* to root"
```

---

## Task 8: 更新 package.json 路径引用

**Files:**
- Modify: `package.json:22,89-99`

**Step 1: 验证 main 入口路径**

检查 `package.json` 中的 `main` 字段：

```json
{
  "main": "./out/extension.js"
}
```

这应该已经是正确的（指向 `out/`，不是 `vscode-extension/out/`）。

**Step 2: 检查 scripts 路径**

确保所有脚本路径正确（移除 `cd vscode-extension &&` 前缀）：

```json
{
  "scripts": {
    "vscode:prepublish": "npm run compile && npm run build-webview",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "pretest": "npm run compile",
    "test": "jest",
    "test:integration": "jest --testPathPattern=integration",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "build-webview": "cd webview && npx tsc && npx vite build && shx rm -rf dist/src && shx mv dist/sidebar.* dist/ 2>/dev/null || true",
    "dev-webview": "cd webview && npx vite"
  }
}
```

注意：`build-webview` 和 `dev-webview` 仍然需要 `cd webview`，因为 webview 有自己的 package.json。

**Step 4: 提交**

```bash
git add package.json
git commit -m "chore: verify package.json paths after flattening"
```

---

## Task 9: 更新文档中的路径引用

**Files:**
- Modify: `README.md`
- Modify: `TESTING.md`
- Modify: `CLAUDE.md`
- Modify: `docs/**/*.md`

**Step 1: 更新 README.md 路径**

```bash
# 替换所有 vscode-extension/ 路径引用
sed -i 's|vscode-extension/src/|src/|g' README.md
sed -i 's|vscode-extension/webview/|webview/|g' README.md
```

**Step 2: 更新 TESTING.md**

```bash
sed -i 's|vscode-extension/||g' TESTING.md
```

**Step 3: 更新 CLAUDE.md**

```bash
sed -i 's|vscode-extension/src/|src/|g' CLAUDE.md
sed -i 's|vscode-extension/webview/|webview/|g' CLAUDE.md
sed -i 's|vscode-extension/out/|out/|g' CLAUDE.md
```

**Step 4: 更新 docs/plans 中的所有文档**

```bash
find docs/plans -name "*.md" -exec sed -i 's|vscode-extension/||g' {} \;
```

**Step 5: 手动检查并修复特殊格式**

某些代码块或特殊格式可能需要手动处理。检查：

```bash
# 查看可能需要手动修复的地方
grep -n "vscode-extension" README.md TESTING.md CLAUDE.md docs/**/*.md
```

**Step 6: 提交**

```bash
git add README.md TESTING.md CLAUDE.md docs/
git commit -m "docs: update file path references after directory flattening"
```

---

## Task 10: 验证扩展功能

**Files:**
- Test: 完整的扩展功能测试

**Step 1: 完整构建**

```bash
npm run vscode:prepublish
```

Expected: 编译和 webview 构建都成功

**Step 2: 按 F5 启动扩展测试**

使用 VS Code 的 "Run Extension" 配置启动开发主机。

**Step 3: 测试侧边栏**

在开发主机中：
1. 打开侧边栏 "Plugin Market"
2. 验证插件列表显示
3. 测试安装/卸载功能
4. 测试启用/禁用功能

**Step 4: 测试命令**

按 `Ctrl+Shift+P` 测试以下命令：
- `Claude Plugin Marketplace: 刷新插件列表`
- `Claude Plugin Marketplace: 添加插件市场`
- `Claude Plugin Marketplace: 删除插件市场`

**Step 5: 检查控制台**

查看开发主机和控制台输出，确保没有错误。

**Step 6: 如果测试通过，打标签**

```bash
git tag -a v0.2.0 -m "Refactor: flatten directory structure and remove TreeView"
git push origin v0.2.0
```

**Step 7: 提交**

```bash
git add -A
git commit -m "test: verify extension functionality after refactoring"
```

---

## Task 11: 清理临时文件

**Files:**
- Delete: `docs/plans/migration-map.txt`

**Step 1: 删除迁移映射文件**

```bash
rm docs/plans/migration-map.txt
```

**Step 2: 提交**

```bash
git add docs/plans/migration-map.txt
git commit -m "chore: remove temporary migration documentation"
```

---

## 验证清单

完成所有任务后，验证：

- [ ] `PluginTreeProvider` 类已删除
- [ ] `PluginTreeItem` 类型已删除
- [ ] `vscode-extension/` 目录不存在
- [ ] 所有代码在 `src/` 和 `webview/` 目录
- [ ] `package.json` 在根目录
- [ ] `npm run compile` 成功
- [ ] `npm run build-webview` 成功
- [ ] `npm test` 通过
- [ ] 扩展在 VS Code 中正常工作
- [ ] 侧边栏 WebView 正常显示
- [ ] 所有命令可执行
- [ ] 文档已更新

---

**预计影响：**
- 代码行数减少：约 200 行（PluginTreeProvider）
- 目录层级减少：1 层
- 与标准 VS Code 扩展结构对齐

**风险评估：**
- 低风险：TreeView 代码未被使用
- 中等风险：目录迁移可能影响绝对路径引用
- 缓解措施：完整的功能测试套件
