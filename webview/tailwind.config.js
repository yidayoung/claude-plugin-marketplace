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
