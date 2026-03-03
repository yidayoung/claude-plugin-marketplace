module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 基础颜色
        background: 'var(--vscode-editor-background)',
        foreground: 'var(--vscode-editor-foreground)',
        border: 'var(--vscode-panel-border)',

        // 按钮颜色
        'btn-bg': 'var(--vscode-button-background)',
        'btn-fg': 'var(--vscode-button-foreground)',
        'btn-hover': 'var(--vscode-button-hoverBackground)',
        'btn-secondary-bg': 'var(--vscode-button-secondaryBackground)',
        'btn-secondary-fg': 'var(--vscode-button-secondaryForeground)',
        'btn-secondary-hover': 'var(--vscode-button-secondaryHoverBackground)',

        // 输入框颜色
        'input-bg': 'var(--vscode-input-background)',
        'input-fg': 'var(--vscode-input-foreground)',
        'input-border': 'var(--vscode-input-border)',
        'input-placeholder': 'var(--vscode-input-placeholderForeground)',

        // 焦点颜色
        'focus-border': 'var(--vscode-focusBorder)',

        // Badge 颜色
        'badge-bg': 'var(--vscode-badge-background)',
        'badge-fg': 'var(--vscode-badge-foreground)',

        // 状态颜色
        'error-fg': 'var(--vscode-errorForeground)',
        'warning-fg': 'var(--vscode-editorWarning-foreground)',
        'info-fg': 'var(--vscode-infoForeground)',
        'success-fg': 'var(--vscode-terminal-ansiGreen)', // 使用终端绿色表示成功

        // 文本颜色
        'text-secondary': 'var(--vscode-descriptionForeground)',
        'text-muted': 'var(--vscode-sideBarTitle-foreground)',

        // 悬停背景
        'hover-bg': 'var(--vscode-toolbar-hoverBackground)',
        'list-hover': 'var(--vscode-list-hoverBackground)',
        'list-active': 'var(--vscode-list-activeSelectionBackground)',

        // 保留原有别名（向后兼容）
        primary: 'var(--vscode-textLink-foreground)',
        'primary-hover': 'var(--vscode-textLink-activeForeground)',
        secondary: 'var(--vscode-descriptionForeground)',
        muted: 'var(--vscode-sideBar-background)',
        'muted-foreground': 'var(--vscode-descriptionForeground)',
        accent: 'var(--vscode-textLink-foreground)',
        destructive: 'var(--vscode-errorForeground)',
        card: 'var(--vscode-editor-background)',
        'card-foreground': 'var(--vscode-editor-foreground)',
        popover: 'var(--vscode-editor-background)',
        'popover-foreground': 'var(--vscode-editor-foreground)',
      },
      borderRadius: {
        DEFAULT: '2px', // VS Code 使用更小的圆角
        md: '3px',
        lg: '4px',
      },
    },
  },
  plugins: [],
};
