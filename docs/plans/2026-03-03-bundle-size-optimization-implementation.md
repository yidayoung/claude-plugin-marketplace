# 打包体积优化实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 webview 打包体积从 5.4MB 降至 ~500KB-800KB，通过删除 source maps 和将 Ant Design 迁移到 Tailwind CSS。

**Architecture:**
- 阶段 1：快速优化构建配置（删除 sourcemaps）
- 阶段 2：安装和配置 Tailwind CSS（使用 VS Code 原生变量）
- 阶段 3：渐进式迁移所有 UI 组件（Ant Design → Tailwind + lucide-react）
- 阶段 4：清理依赖并验证

**Tech Stack:** Tailwind CSS 3.4, lucide-react 0.344, VS Code CSS Variables, Vite 5.0, React 18

**设计文档:** [docs/plans/2026-03-03-bundle-size-optimization-design.md](./2026-03-03-bundle-size-optimization-design.md)

---

## 阶段 1：构建配置优化（1 小时）

### Task 1.1: 修改 Vite 配置删除 sourcemaps

**Files:**
- Modify: `webview/vite.config.ts`

**Step 1: 读取当前 Vite 配置**

当前配置在第 27 行有 `sourcemap: true`。

**Step 2: 修改 sourcemap 配置**

将第 27 行的 `sourcemap: true` 改为 `sourcemap: false`：

```typescript
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173
    },
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,  // 修改这里：从 true 改为 false
    rollupOptions: {
      input: {
        sidebar: resolve(__dirname, 'src/sidebar/index.html'),
        details: resolve(__dirname, 'src/details/index.html'),
        marketplace: resolve(__dirname, 'src/marketplace/index.html')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].css'
      }
    }
  }
});
```

**Step 3: 验证构建**

运行构建命令验证配置正确：

```bash
npm run build-webview
```

预期输出：构建成功，无 sourcemap 文件生成。

**Step 4: 检查体积变化**

```bash
du -sh webview/dist/
```

预期结果：~1.8MB（从 5.4MB 减少 ~3.5MB，即删除的 sourcemaps 大小）

**Step 5: 提交变更**

```bash
git add webview/vite.config.ts
git commit -m "build: disable sourcemaps in production build

Saves ~3.5MB by removing source maps from webview dist.
"
```

---

### Task 1.2: 添加 Terser 压缩配置

**Files:**
- Modify: `webview/vite.config.ts`

**Step 1: 修改 build 配置添加 minify 选项**

在 build 对象中添加 minify 配置：

```typescript
build: {
  outDir: 'dist',
  sourcemap: false,
  minify: 'terser',  // 添加这行
  rollupOptions: {
    // ... 保持不变
  }
}
```

**Step 2: 验证构建**

```bash
npm run build-webview
```

**Step 3: 检查新体积**

```bash
du -sh webview/dist/
ls -lh webview/dist/*.js
```

预期结果：JS 文件进一步压缩。

**Step 4: 提交变更**

```bash
git add webview/vite.config.ts
git commit -m "build: enable terser minification for webview

Further reduces bundle size with aggressive minification.
"
```

---

## 阶段 2：安装和配置 Tailwind CSS（30 分钟）

### Task 2.1: 安装 Tailwind CSS 依赖

**Files:**
- Modify: `package.json` (根目录)

**Step 1: 安装 Tailwind CSS 和相关依赖**

```bash
npm install -D tailwindcss@3.4.1 postcss@8.4.35 autoprefixer@10.4.17
npm install lucide-react@0.344.0 tailwind-merge@2.2.0 clsx@2.1.0
```

预期输出：所有依赖安装成功，无错误。

**Step 2: 验证 package.json**

检查 `package.json` 确认依赖已添加：

```bash
cat package.json | grep -A 5 "devDependencies"
cat package.json | grep -A 3 "dependencies"
```

预期结果：应看到新添加的依赖。

**Step 3: 提交变更**

```bash
git add package.json package-lock.json
git commit -m "deps: install tailwind css and lucide-react

- tailwindcss@3.4.1, postcss@8.4.35, autoprefixer@10.4.17
- lucide-react@0.344.0, tailwind-merge@2.2.0, clsx@2.1.0
"
```

---

### Task 2.2: 创建 Tailwind 配置文件

**Files:**
- Create: `webview/tailwind.config.js`

**Step 1: 创建 Tailwind 配置**

创建 `webview/tailwind.config.js` 文件：

```javascript
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--vscode-editor-background)',
        foreground: 'var(--vscode-editor-foreground)',
        primary: 'var(--vscode-textLink-foreground)',
        'primary-hover': 'var(--vscode-textLink-activeForeground)',
        secondary: 'var(--vscode-descriptionForeground)',
        border: 'var(--vscode-panel-border)',
        muted: 'var(--vscode-sideBar-background)',
        'muted-foreground': 'var(--vscode-descriptionForeground)',
        accent: 'var(--vscode-textLink-foreground)',
        destructive: 'var(--vscode-errorForeground)',
        card: 'var(--vscode-editor-background)',
        'card-foreground': 'var(--vscode-editor-foreground)',
      },
      borderRadius: {
        DEFAULT: '4px',
        md: '6px',
        lg: '8px',
      },
    },
  },
  plugins: [],
};
```

**Step 2: 验证配置文件**

```bash
cat webview/tailwind.config.js
```

预期结果：配置文件内容正确。

**Step 3: 提交变更**

```bash
git add webview/tailwind.config.js
git commit -m "feat: add tailwind css config

Configured with VS Code native CSS variables for theme adaptation.
"
```

---

### Task 2.3: 创建 PostCSS 配置文件

**Files:**
- Create: `webview/postcss.config.js`

**Step 1: 创建 PostCSS 配置**

创建 `webview/postcss.config.js` 文件：

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

**Step 2: 验证配置文件**

```bash
cat webview/postcss.config.js
```

**Step 3: 提交变更**

```bash
git add webview/postcss.config.js
git commit -m "feat: add postcss config for tailwind

Enables Tailwind CSS processing and autoprefixer.
"
```

---

### Task 2.4: 创建 className 合并工具

**Files:**
- Create: `webview/src/lib/cn.ts`

**Step 1: 创建 lib 目录**

```bash
mkdir -p webview/src/lib
```

**Step 2: 创建 cn.ts 工具函数**

创建 `webview/src/lib/cn.ts` 文件：

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Step 3: 验证文件**

```bash
cat webview/src/lib/cn.ts
```

**Step 4: 提交变更**

```bash
git add webview/src/lib/cn.ts
git commit -m "feat: add className merge utility

Provides cn() function for combining Tailwind classes with clsx and tailwind-merge.
"
```

---

### Task 2.5: 修改全局样式引入 Tailwind

**Files:**
- Modify: `webview/src/index.css`
- Modify: `webview/src/sidebar/index.html`
- Modify: `webview/src/details/index.html`
- Modify: `webview/src/marketplace/index.html`

**Step 1: 备份当前样式**

```bash
cp webview/src/index.css webview/src/index.css.backup
```

**Step 2: 替换 index.css 内容**

将 `webview/src/index.css` 的内容替换为：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    margin: 0;
    padding: 0;
  }

  /* 交互元素样式 */
  button,
  a {
    @apply cursor-pointer;
  }

  /* Focus 状态 */
  *:focus-visible {
    @apply outline-2 outline-offset-2 outline-primary;
  }

  /* 滚动条样式（VS Code 风格）*/
  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  ::-webkit-scrollbar-track {
    background: var(--vscode-scrollbarSlider-background);
  }

  ::-webkit-scrollbar-thumb {
    background: var(--vscode-scrollbarSlider-hoverBackground);
    border-radius: 5px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: var(--vscode-scrollbarSlider-activeBackground);
  }
}

@layer components {
  /* Markdown 内容样式 */
  .markdown-body {
    @apply text-foreground;
    line-height: 1.6;
  }

  .markdown-body h1,
  .markdown-body h2,
  .markdown-body h3,
  .markdown-body h4,
  .markdown-body h5,
  .markdown-body h6 {
    @apply font-bold mt-6 mb-4;
  }

  .markdown-body h1 {
    @apply text-2xl;
  }

  .markdown-body h2 {
    @apply text-xl;
  }

  .markdown-body h3 {
    @apply text-lg;
  }

  .markdown-body p {
    @apply mb-4;
  }

  .markdown-body a {
    @apply text-primary underline;
  }

  .markdown-body code {
    @apply bg-muted px-1 py-0.5 rounded text-sm;
    font-family: var(--vscode-editor-font-family);
  }

  .markdown-body pre {
    @apply bg-muted p-4 rounded-lg mb-4 overflow-x-auto;
  }

  .markdown-body pre code {
    @apply bg-transparent p-0;
  }

  .markdown-body ul,
  .markdown-body ol {
    @apply ml-6 mb-4;
  }

  .markdown-body li {
    @apply mb-2;
  }

  .markdown-body blockquote {
    @apply border-l-4 border-border pl-4 italic text-muted-foreground;
  }
}
```

**Step 3: 验证样式文件**

```bash
head -20 webview/src/index.css
```

**Step 4: 提交变更**

```bash
git add webview/src/index.css
git commit -m "refactor: replace antd styles with tailwind css

Migrated from Ant Design theme to Tailwind CSS with VS Code variables.
"
```

---

## 阶段 3：组件迁移（1-2 天）

### Task 3.1: 创建共享 Button 组件

**Files:**
- Create: `webview/src/components/Button.tsx`
- Modify: `webview/src/components/index.ts`

**Step 1: 创建 Button 组件**

创建 `webview/src/components/Button.tsx`：

```typescript
import { forwardRef } from 'react';
import { cn } from '../lib/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'default' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantStyles = {
      primary: 'bg-primary text-white hover:bg-primary-hover',
      default: 'bg-card border border-border text-foreground hover:bg-muted',
      destructive: 'bg-destructive/10 text-destructive hover:bg-destructive/20',
      ghost: 'hover:bg-muted text-foreground'
    };

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

**Step 2: 导出组件**

在 `webview/src/components/index.ts` 中添加导出：

```typescript
export { Button, type ButtonProps } from './Button';
```

**Step 3: 提交变更**

```bash
git add webview/src/components/Button.tsx webview/src/components/index.ts
git commit -m "feat: add Button component with Tailwind

Replaces Ant Design Button with lightweight Tailwind component.
Supports primary, default, destructive, and ghost variants.
"
```

---

### Task 3.2: 创建共享 Input 组件

**Files:**
- Create: `webview/src/components/Input.tsx`
- Modify: `webview/src/components/index.ts`

**Step 1: 创建 Input 组件**

创建 `webview/src/components/Input.tsx`：

```typescript
import { forwardRef } from 'react';
import { cn } from '../lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type = 'text', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <input
          ref={ref}
          type={type}
          className={cn(
            'px-3 py-2 rounded-md border border-border',
            'bg-card text-foreground text-sm',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-primary',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors duration-200',
            error && 'border-destructive focus:ring-destructive',
            className
          )}
          {...props}
        />
        {error && (
          <span className="text-xs text-destructive">{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
```

**Step 2: 导出组件**

在 `webview/src/components/index.ts` 中添加导出：

```typescript
export { Input, type InputProps } from './Input';
```

**Step 3: 提交变更**

```bash
git add webview/src/components/Input.tsx webview/src/components/index.ts
git commit -m "feat: add Input component with Tailwind

Replaces Ant Design Input with lightweight Tailwind component.
Supports label, error states, and all standard input props.
"
```

---

### Task 3.3: 创建 Badge 组件

**Files:**
- Create: `webview/src/components/Badge.tsx`
- Modify: `webview/src/components/index.ts`

**Step 1: 创建 Badge 组件**

创建 `webview/src/components/Badge.tsx`：

```typescript
import { cn } from '../lib/cn';

export interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error';
  children: React.ReactNode;
}

export function Badge({ variant = 'default', children }: BadgeProps) {
  const variantStyles = {
    default: 'bg-muted text-muted-foreground',
    success: 'bg-green-500/10 text-green-500',
    warning: 'bg-yellow-500/10 text-yellow-500',
    error: 'bg-destructive/10 text-destructive'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        variantStyles[variant]
      )}
    >
      {children}
    </span>
  );
}
```

**Step 2: 导出组件**

在 `webview/src/components/index.ts` 中添加导出：

```typescript
export { Badge, type BadgeProps } from './Badge';
```

**Step 3: 提交变更**

```bash
git add webview/src/components/Badge.tsx webview/src/components/index.ts
git commit -m "feat: add Badge component with Tailwind

Replaces Ant Design Badge with lightweight Tailwind component.
Supports default, success, warning, and error variants.
"
```

---

### Task 3.4: 创建 Icon 组件（lucide-react 封装）

**Files:**
- Create: `webview/src/components/Icon.tsx`
- Modify: `webview/src/components/index.ts`

**Step 1: 创建 Icon 组件**

创建 `webview/src/components/Icon.tsx`：

```typescript
import { LucideIcon } from 'lucide-react';
import { cn } from '../lib/cn';

export interface IconProps {
  icon: LucideIcon;
  className?: string;
  size?: number;
}

export function Icon({ icon: IconComponent, className, size = 16 }: IconProps) {
  return (
    <IconComponent
      className={cn('shrink-0', className)}
      size={size}
    />
  );
}
```

**Step 2: 导出组件**

在 `webview/src/components/index.ts` 中添加导出：

```typescript
export { Icon, type IconProps } from './Icon';
```

**Step 3: 提交变更**

```bash
git add webview/src/components/Icon.tsx webview/src/components/index.ts
git commit -m "feat: add Icon component wrapper

Wrapper for lucide-react icons with consistent sizing.
"
```

---

### Task 3.5: 迁移 PluginItem 组件

**Files:**
- Modify: `webview/src/components/PluginItem.tsx`

**Step 1: 读取当前 PluginItem 组件**

```bash
cat webview/src/components/PluginItem.tsx
```

**Step 2: 重写 PluginItem 组件**

完全替换 `webview/src/components/PluginItem.tsx` 的内容：

```typescript
import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Download,
  Trash2,
  Power,
  PowerOff,
  RefreshCw,
  MoreVertical,
  Plus
} from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from './Button';
import { useL10n } from '../l10n';
import { PluginData } from '../hooks';

// 声明全局 vscode API
declare const vscode: {
  postMessage: (message: any) => void;
  getState: () => any;
  setState: (state: any) => void;
};

interface PluginItemProps {
  plugin: PluginData;
  isHovered: boolean;
  onHoverChange: (id: string, hovered: boolean) => void;
}

export function PluginItem({ plugin, isHovered, onHoverChange }: PluginItemProps) {
  const { t } = useL10n();
  const [showMenu, setShowMenu] = useState(false);

  const handleInstall = () => {
    vscode.postMessage({
      type: 'installPlugin',
      payload: { pluginName: plugin.name, marketplace: plugin.marketplace, scope: 'user' }
    });
  };

  const handleUninstall = () => {
    vscode.postMessage({
      type: 'uninstallPlugin',
      payload: { pluginName: plugin.name }
    });
  };

  const handleEnable = () => {
    vscode.postMessage({
      type: 'enablePlugin',
      payload: { pluginName: plugin.name, marketplace: plugin.marketplace }
    });
  };

  const handleDisable = () => {
    vscode.postMessage({
      type: 'disablePlugin',
      payload: { pluginName: plugin.name, marketplace: plugin.marketplace }
    });
  };

  const handleUpdate = () => {
    vscode.postMessage({
      type: 'updatePlugin',
      payload: { pluginName: plugin.name, marketplace: plugin.marketplace }
    });
  };

  const handleOpenDetails = () => {
    vscode.postMessage({
      type: 'openDetails',
      payload: { pluginName: plugin.name, marketplace: plugin.marketplace }
    });
  };

  const statusIcon = plugin.updateAvailable
    ? <RefreshCw className="w-4 h-4 text-yellow-500" />
    : plugin.enabled === false
      ? <XCircle className="w-4 h-4 text-muted-foreground" />
      : <CheckCircle2 className="w-4 h-4 text-green-500" />;

  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-3 py-2 rounded-md",
        "hover:bg-muted/50 transition-colors duration-200",
        "cursor-pointer"
      )}
      onMouseEnter={() => onHoverChange(plugin.name, true)}
      onMouseLeave={() => onHoverChange(plugin.name, false)}
      onClick={handleOpenDetails}
    >
      {/* Status Icon */}
      <div className="shrink-0">
        {statusIcon}
      </div>

      {/* Plugin Name */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">
          {plugin.displayName || plugin.name}
        </div>
      </div>

      {/* Action Buttons - Show on Hover */}
      {isHovered && (
        <div className="flex items-center gap-1 shrink-0">
          {plugin.installed ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  if (plugin.enabled === false) {
                    handleEnable();
                  } else {
                    handleDisable();
                  }
                }}
                title={plugin.enabled === false ? t('item.enable') : t('item.disable')}
              >
                {plugin.enabled === false ? (
                  <Power className="w-4 h-4" />
                ) : (
                  <PowerOff className="w-4 h-4" />
                )}
              </Button>

              {plugin.updateAvailable && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpdate();
                  }}
                  title={t('item.update')}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUninstall();
                }}
                title={t('item.uninstall')}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="primary"
              onClick={(e) => {
                e.stopPropagation();
                handleInstall();
              }}
              title={t('item.install')}
            >
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 3: 提交变更**

```bash
git add webview/src/components/PluginItem.tsx
git commit -m "refactor: migrate PluginItem to Tailwind

Replaced Ant Design components with Tailwind CSS and lucide-react icons.
- Button → custom Button component
- Typography → native HTML elements
- Icons → lucide-react
- Dropdown → inline action buttons on hover
"
```

---

### Task 3.6: 迁移 SidebarApp 组件

**Files:**
- Modify: `webview/src/sidebar/SidebarApp.tsx`

**Step 1: 读取当前 SidebarApp 组件**

```bash
cat webview/src/sidebar/SidebarApp.tsx
```

**Step 2: 重写 SidebarApp 组件**

完全替换 `webview/src/sidebar/SidebarApp.tsx` 的内容：

```typescript
import { useState } from 'react';
import { Search, CheckCircle2, RefreshCw, MoreVertical, Store, Sync } from 'lucide-react';
import { cn } from '../lib/cn';
import { Input, Button } from '../components';
import { usePluginData, usePluginFilter, useHoverState } from '../hooks';
import { PluginItem, PluginSection, MarketSectionActions } from '../components';
import { useL10n } from '../l10n';

// 声明全局 vscode API
declare const vscode: {
  postMessage: (message: any) => void;
  getState: () => any;
  setState: (state: any) => void;
};

const SidebarApp: React.FC = () => {
  const { t } = useL10n();
  const { state, loadPlugins, setState } = usePluginData();
  const { groupedPlugins, stats } = usePluginFilter(state.plugins, state.filter);
  const { isHovered, setHovered } = useHoverState();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['installed', 'available'])
  );

  const handleSearch = (keyword: string) => {
    setState(prev => ({
      ...prev,
      filter: { ...prev.filter, keyword }
    }));
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  if (state.loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm">{t('sidebar.loading')}</span>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="p-2">
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
          <div className="flex items-center gap-2 text-destructive text-sm">
            <XCircle className="w-4 h-4" />
            <span>{state.error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border">
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('sidebar.searchPlaceholder')}
            value={state.filter.keyword}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Stats & Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{t('sidebar.installed')}: {stats.installed}</span>
            <span>{t('sidebar.available')}: {stats.available}</span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={loadPlugins}
              title={t('sidebar.refresh')}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                vscode.postMessage({
                  type: 'executeCommand',
                  payload: { command: 'claudePluginMarketplace.addMarketplace' }
                });
              }}
              title={t('sidebar.addMarketplace')}
            >
              <Store className="w-4 h-4" />
            </Button>

            {state.plugins.some(p => p.updateAvailable) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  // Update all logic
                  state.plugins
                    .filter(p => p.updateAvailable)
                    .forEach(p => {
                      vscode.postMessage({
                        type: 'updatePlugin',
                        payload: { pluginName: p.name, marketplace: p.marketplace }
                      });
                    });
                }}
                title={t('sidebar.updateAll')}
              >
                <Sync className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Plugin List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {groupedPlugins.map(([marketplace, plugins]) => {
          const sectionId = `${marketplace}-section`;
          const isExpanded = expandedSections.has(sectionId);
          const installedCount = plugins.filter(p => p.installed).length;

          return (
            <PluginSection
              key={marketplace}
              id={sectionId}
              title={marketplace}
              count={installedCount}
              expanded={isExpanded}
              onToggle={() => toggleSection(sectionId)}
            >
              {plugins.map(plugin => (
                <PluginItem
                  key={`${plugin.marketplace}-${plugin.name}`}
                  plugin={plugin}
                  isHovered={isHovered(plugin.name)}
                  onHoverChange={setHovered}
                />
              ))}
            </PluginSection>
          );
        })}

        {groupedPlugins.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Store className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">{t('sidebar.noResults')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SidebarApp;
```

**Step 3: 提交变更**

```bash
git add webview/src/sidebar/SidebarApp.tsx
git commit -m "refactor: migrate SidebarApp to Tailwind

Replaced Ant Design components with Tailwind CSS and lucide-react.
- Input, Spin, Empty, Alert, Button → custom Tailwind components
- Typography → native HTML with Tailwind classes
- Flex, Divider → Tailwind flexbox utilities
- Icons → lucide-react
"
```

---

### Task 3.7: 迁移 Details 组件

**Files:**
- Modify: `webview/src/details/DetailHeader.tsx`
- Modify: `webview/src/details/DetailContent.tsx`
- Modify: `webview/src/details/ComponentsSection.tsx`
- Modify: `webview/src/details/ReadmeSection.tsx`

**Step 1: 迁移 DetailHeader 组件**

替换 `webview/src/details/DetailHeader.tsx` 的内容：

```typescript
import { Star, Github, ExternalLink } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from '../components';
import { useL10n } from '../l10n';

// 声明全局 vscode API
declare const vscode: {
  postMessage: (message: any) => void;
};

interface PluginDetail {
  name: string;
  displayName?: string;
  description?: string;
  author?: string;
  homepage?: string;
  repository?: string;
  stars?: number;
  installed?: boolean;
  enabled?: boolean;
  updateAvailable?: boolean;
}

interface DetailHeaderProps {
  plugin: PluginDetail;
  marketplace: string;
}

export function DetailHeader({ plugin, marketplace }: DetailHeaderProps) {
  const { t } = useL10n();

  const handleInstall = () => {
    vscode.postMessage({
      type: 'installPlugin',
      payload: { pluginName: plugin.name, marketplace, scope: 'user' }
    });
  };

  const handleUninstall = () => {
    vscode.postMessage({
      type: 'uninstallPlugin',
      payload: { pluginName: plugin.name }
    });
  };

  const handleEnable = () => {
    vscode.postMessage({
      type: 'enablePlugin',
      payload: { pluginName: plugin.name, marketplace }
    });
  };

  const handleDisable = () => {
    vscode.postMessage({
      type: 'disablePlugin',
      payload: { pluginName: plugin.name, marketplace }
    });
  };

  const handleUpdate = () => {
    vscode.postMessage({
      type: 'updatePlugin',
      payload: { pluginName: plugin.name, marketplace }
    });
  };

  return (
    <div className="p-6 border-b border-border">
      {/* Title and Description */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {plugin.displayName || plugin.name}
        </h1>
        {plugin.description && (
          <p className="text-muted-foreground">{plugin.description}</p>
        )}
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
        {plugin.author && (
          <div>
            <span className="font-medium">{t('details.author')}:</span>{' '}
            <span>{plugin.author}</span>
          </div>
        )}

        {plugin.stars && (
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
            <span>{plugin.stars}</span>
          </div>
        )}

        {plugin.repository && (
          <a
            href={plugin.repository}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-primary transition-colors"
          >
            <Github className="w-4 h-4" />
            <span>GitHub</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {!plugin.installed ? (
          <Button onClick={handleInstall} variant="primary">
            {t('details.install')}
          </Button>
        ) : (
          <>
            {plugin.enabled === false ? (
              <Button onClick={handleEnable} variant="default">
                {t('details.enable')}
              </Button>
            ) : (
              <Button onClick={handleDisable} variant="default">
                {t('details.disable')}
              </Button>
            )}

            {plugin.updateAvailable && (
              <Button onClick={handleUpdate} variant="default">
                {t('details.update')}
              </Button>
            )}

            <Button onClick={handleUninstall} variant="destructive">
              {t('details.uninstall')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
```

**Step 2: 迁移 ReadmeSection 组件**

替换 `webview/src/details/ReadmeSection.tsx` 的内容：

```typescript
import { useL10n } from '../l10n';

interface ReadmeSectionProps {
  readmeHtml: string;
}

export function ReadmeSection({ readmeHtml }: ReadmeSectionProps) {
  const { t } = useL10n();

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold text-foreground mb-4">
        {t('details.readme')}
      </h2>

      {readmeHtml ? (
        <div
          className="markdown-body"
          dangerouslySetInnerHTML={{ __html: readmeHtml }}
        />
      ) : (
        <div className="text-muted-foreground text-sm">
          {t('details.noReadme')}
        </div>
      )}
    </div>
  );
}
```

**Step 3: 迁移 ComponentsSection 组件**

替换 `webview/src/details/ComponentsSection.tsx` 的内容：

```typescript
import { useL10n } from '../l10n';
import { Badge } from '../components';

interface Component {
  name: string;
  description?: string;
  type: 'skill' | 'agent';
}

interface ComponentsSectionProps {
  skills?: Component[];
  agents?: Component[];
}

export function ComponentsSection({ skills = [], agents = [] }: ComponentsSectionProps) {
  const { t } = useL10n();

  if (skills.length === 0 && agents.length === 0) {
    return null;
  }

  return (
    <div className="p-6 border-t border-border">
      <h2 className="text-lg font-bold text-foreground mb-4">
        {t('details.components')}
      </h2>

      <div className="space-y-4">
        {skills.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">
              {t('details.skills')}
            </h3>
            <div className="space-y-2">
              {skills.map(skill => (
                <div
                  key={skill.name}
                  className="p-3 rounded-md bg-muted/50 border border-border"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">
                        {skill.name}
                      </div>
                      {skill.description && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {skill.description}
                        </div>
                      )}
                    </div>
                    <Badge variant="default">Skill</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {agents.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">
              {t('details.agents')}
            </h3>
            <div className="space-y-2">
              {agents.map(agent => (
                <div
                  key={agent.name}
                  className="p-3 rounded-md bg-muted/50 border border-border"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">
                        {agent.name}
                      </div>
                      {agent.description && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {agent.description}
                        </div>
                      )}
                    </div>
                    <Badge variant="default">Agent</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 4: 提交变更**

```bash
git add webview/src/details/DetailHeader.tsx webview/src/details/ReadmeSection.tsx webview/src/details/ComponentsSection.tsx
git commit -m "refactor: migrate Details components to Tailwind

Replaced Ant Design components with Tailwind CSS and lucide-react.
- DetailHeader, ReadmeSection, ComponentsSection migrated
"
```

---

### Task 3.8: 迁移 Marketplace 组件

**Files:**
- Modify: `webview/src/marketplace/MarketplaceApp.tsx`
- Modify: `webview/src/marketplace/CustomMarketInput.tsx`
- Modify: `webview/src/marketplace/MarketplaceCard.tsx`

**Step 1: 迁移 CustomMarketInput 组件**

替换 `webview/src/marketplace/CustomMarketInput.tsx` 的内容：

```typescript
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { Input, Button } from '../components';
import { useL10n } from '../l10n';

// 声明全局 vscode API
declare const vscode: {
  postMessage: (message: any) => void;
};

export function CustomMarketInput() {
  const { t } = useL10n();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    setError('');

    if (!url.trim()) {
      setError(t('marketplace.error.empty'));
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setError(t('marketplace.error.invalid'));
      return;
    }

    vscode.postMessage({
      type: 'addMarketplace',
      payload: { source: url.trim() }
    });

    setUrl('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="p-4 border-b border-border">
      <h3 className="text-sm font-medium text-foreground mb-3">
        {t('marketplace.addCustom')}
      </h3>

      <div className="flex items-center gap-2">
        <Input
          placeholder={t('marketplace.placeholder')}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyPress={handleKeyPress}
          error={error}
          className="flex-1"
        />

        <Button onClick={handleSubmit} variant="primary" size="md">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
```

**Step 2: 迁移 MarketplaceCard 组件**

替换 `webview/src/marketplace/MarketplaceCard.tsx` 的内容：

```typescript
import { Trash2, RefreshCw } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from '../components';
import { useL10n } from '../l10n';

// 声明全局 vscode API
declare const vscode: {
  postMessage: (message: any) => void;
};

interface MarketplaceCardProps {
  name: string;
  source: string;
  isBuiltIn?: boolean;
}

export function MarketplaceCard({ name, source, isBuiltIn = false }: MarketplaceCardProps) {
  const { t } = useL10n();

  const handleRemove = () => {
    vscode.postMessage({
      type: 'removeMarketplace',
      payload: { name }
    });
  };

  const handleRefresh = () => {
    vscode.postMessage({
      type: 'refreshMarketplace',
      payload: { name }
    });
  };

  return (
    <div className="p-4 rounded-md bg-card border border-border">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-foreground">
              {name}
            </h3>
            {isBuiltIn && (
              <span className="px-1.5 py-0.5 text-xs bg-muted text-muted-foreground rounded">
                Built-in
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground break-all">
            {source}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRefresh}
            title={t('marketplace.refresh')}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>

          {!isBuiltIn && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRemove}
              title={t('marketplace.remove')}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 3: 迁移 MarketplaceApp 组件**

替换 `webview/src/marketplace/MarketplaceApp.tsx` 的内容：

```typescript
import { Store } from 'lucide-react';
import { CustomMarketInput, MarketplaceCard } from './';
import { useL10n } from '../l10n';

interface Marketplace {
  name: string;
  source: string;
  isBuiltIn?: boolean;
}

interface MarketplaceAppProps {
  marketplaces: Marketplace[];
}

export function MarketplaceApp({ marketplaces }: MarketplaceAppProps) {
  const { t } = useL10n();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">
            {t('marketplace.title')}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {t('marketplace.description')}
        </p>
      </div>

      {/* Add Custom Marketplace */}
      <CustomMarketInput />

      {/* Marketplace List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {marketplaces.map(marketplace => (
          <MarketplaceCard
            key={marketplace.name}
            name={marketplace.name}
            source={marketplace.source}
            isBuiltIn={marketplace.isBuiltIn}
          />
        ))}

        {marketplaces.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Store className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">{t('marketplace.noMarketplaces')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 4: 提交变更**

```bash
git add webview/src/marketplace/CustomMarketInput.tsx webview/src/marketplace/MarketplaceCard.tsx webview/src/marketplace/MarketplaceApp.tsx
git commit -m "refactor: migrate Marketplace components to Tailwind

Replaced Ant Design components with Tailwind CSS and lucide-react.
- CustomMarketInput, MarketplaceCard, MarketplaceApp migrated
"
```

---

## 阶段 4：依赖清理和验证（30 分钟）

### Task 4.1: 删除 Ant Design 依赖

**Files:**
- Modify: `package.json` (根目录)

**Step 1: 卸载 Ant Design 依赖**

```bash
npm uninstall antd @ant-design/icons
```

预期输出：依赖成功卸载。

**Step 2: 验证 package.json**

```bash
cat package.json | grep -E "(antd|ant-design)"
```

预期结果：无输出（已删除）。

**Step 3: 提交变更**

```bash
git add package.json package-lock.json
git commit -m "refactor: remove antd and @ant-design/icons

Successfully migrated all components to Tailwind CSS and lucide-react.
"
```

---

### Task 4.2: 删除 antd-theme 文件

**Files:**
- Delete: `webview/src/theme/antd-theme.ts`

**Step 1: 删除文件**

```bash
rm webview/src/theme/antd-theme.ts
```

**Step 2: 提交变更**

```bash
git add webview/src/theme/antd-theme.ts
git commit -m "refactor: remove unused antd-theme file

No longer needed after migrating to Tailwind CSS.
"
```

---

### Task 4.3: 删除备份的样式文件

**Files:**
- Delete: `webview/src/index.css.backup`

**Step 1: 删除备份文件**

```bash
rm webview/src/index.css.backup
```

**Step 2: 提交变更**

```bash
git add webview/src/index.css.backup
git commit -m "chore: remove backup css file

Clean up temporary backup file.
"
```

---

### Task 4.4: 最终构建测试

**Step 1: 清理并重新构建**

```bash
rm -rf webview/dist/
npm run build-webview
```

预期输出：构建成功，无错误。

**Step 2: 检查打包体积**

```bash
du -sh webview/dist/
ls -lhS webview/dist/*.js | head -10
```

预期结果：
- 总体积 < 1MB
- 单个 JS 文件 < 500KB
- 无 .map 文件

**Step 3: 验证构建产物**

```bash
ls -la webview/dist/
```

预期结果：
- sidebar.js
- details.js
- marketplace.js
- 对应的 .css 文件
- 无 .map 文件

**Step 4: 记录最终体积**

```bash
echo "=== Build Size Report ===" > build-size-report.txt
echo "Date: $(date)" >> build-size-report.txt
echo "" >> build-size-report.txt
echo "Total size:" >> build-size-report.txt
du -sh webview/dist/ >> build-size-report.txt
echo "" >> build-size-report.txt
echo "JS files:" >> build-size-report.txt
ls -lh webview/dist/*.js >> build-size-report.txt
echo "" >> build-size-report.txt
echo "CSS files:" >> build-size-report.txt
ls -lh webview/dist/*.css >> build-size-report.txt
cat build-size-report.txt
```

**Step 5: 提交报告**

```bash
git add build-size-report.txt
git commit -m "docs: add build size report

Final bundle size after Tailwind CSS migration.
"
```

---

## 验收检查清单

### 体积检查
- [ ] webview/dist/ 总大小 < 1MB
- [ ] 单个 JS 文件 < 500KB
- [ ] 无 source maps (.map 文件)
- [ ] 相比原始 5.4MB 减少 80%+

### 功能检查
- [ ] 侧边栏插件列表正常显示
- [ ] 搜索功能正常
- [ ] 安装/卸载/启用/禁用功能正常
- [ ] 插件详情页正常显示
- [ ] README 渲染正常
- [ ] 市场管理功能正常
- [ ] 添加自定义市场正常

### 主题检查
- [ ] VS Code 亮色主题适配正常
- [ ] VS Code 暗色主题适配正常
- [ ] 高对比度主题适配正常
- [ ] 文字对比度符合 WCAG AA 标准

### 性能检查
- [ ] 首次加载时间减少 40%+
- [ ] 运行时内存占用减少 30%+
- [ ] 无明显卡顿或延迟

### 代码检查
- [ ] 无 Ant Design 导入残留
- [ ] 无 @ant-design/icons 导入残留
- [ ] 所有组件使用 lucide-react 图标
- [ ] 所有样式使用 Tailwind CSS
- [ ] TypeScript 无类型错误

---

## 回滚计划

如果迁移遇到严重问题：

```bash
# 回滚到迁移前状态
git log --oneline | head -10  # 找到迁移前的 commit
git reset --hard <commit-hash>

# 或者使用分支回滚
git checkout master
git branch -D feature/tailwind-migration
```

---

## 下一步

完成实施后：

1. **测试：** 在 VS Code 中加载扩展并测试所有功能
2. **文档：** 更新 CLAUDE.md 中的 UI 约定（移除 Ant Design 相关内容）
3. **发布：** 创建 GitHub PR 并进行代码审查

---

**计划版本：** 1.0
**创建日期：** 2026-03-03
**预计时间：** 2-3 天
**复杂度：** 高（涉及所有 UI 组件重写）
