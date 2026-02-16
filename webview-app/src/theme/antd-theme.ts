// Ant Design 主题配置 - 适配 VSCode 变量
import type { ThemeConfig } from 'antd';

export const antdTheme: ThemeConfig = {
  token: {
    // 主色 - 使用 VSCode 链接颜色
    colorPrimary: 'var(--vscode-textLink-foreground)',
    colorSuccess: 'var(--vscode-terminal-ansiGreen)',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: 'var(--vscode-textLink-foreground)',

    // 字体
    fontFamily: 'var(--vscode-font-family)',
    fontSize: 13,

    // 圆角
    borderRadius: 6,

    // 边框
    lineWidth: 1,

    // 间距
    marginXS: 8,
    marginSM: 12,
    margin: 16,
    marginMD: 20,
    marginLG: 24,
  },

  components: {
    // Input 组件
    Input: {
      colorBgContainer: 'var(--vscode-input-background)',
      colorBorder: 'var(--vscode-input-border)',
      colorText: 'var(--vscode-input-foreground)',
      colorTextPlaceholder: 'var(--vscode-input-placeholderForeground)',
      borderRadius: 6,
      activeBorderColor: 'var(--vscode-textLink-foreground)',
      hoverBorderColor: 'var(--vscode-input-border)',
    },

    // Select 组件
    Select: {
      colorBgContainer: 'var(--vscode-input-background)',
      colorBorder: 'var(--vscode-input-border)',
      colorText: 'var(--vscode-input-foreground)',
      colorTextPlaceholder: 'var(--vscode-input-placeholderForeground)',
      optionSelectedBg: 'var(--vscode-list-hoverBackground)',
      borderRadius: 6,
    },

    // Button 组件
    Button: {
      colorPrimary: 'var(--vscode-button-background)',
      colorPrimaryHover: 'var(--vscode-button-hoverBackground)',
      colorTextLightSolid: 'var(--vscode-button-foreground)',
      borderRadius: 6,
      fontWeight: 500,
    },

    // Card 组件
    Card: {
      colorBgContainer: 'var(--vscode-editor-background)',
      colorBorderSecondary: 'var(--vscode-widget-border)',
      borderRadiusLG: 8,
    },

    // Tabs 组件
    Tabs: {
      colorBorder: 'var(--vscode-widget-border)',
      itemActiveColor: 'var(--vscode-textLink-foreground)',
      itemSelectedColor: 'var(--vscode-textLink-foreground)',
      itemHoverColor: 'var(--vscode-textLink-foreground)',
    },

    // Tag 组件
    Tag: {
      borderRadiusSM: 12,
    },
  },
};
