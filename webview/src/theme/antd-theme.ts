// Ant Design 主题配置 - 适配 VSCode 变量（支持明暗主题）
import type { ThemeConfig } from 'antd';

// 主题配置工厂函数 - 支持动态读取 VSCode 主题变量
export const createAntdTheme = (): ThemeConfig => ({
  token: {
    // 主色 - 使用 VSCode 按钮颜色
    colorPrimary: 'var(--vscode-button-background)',
    colorPrimaryHover: 'var(--vscode-button-hoverBackground)',
    colorPrimaryActive: 'var(--vscode-button-background)',
    colorSuccess: 'var(--vscode-terminal-ansiGreen)',
    colorWarning: 'var(--vscode-editorWarning-foreground)',
    colorError: 'var(--vscode-errorForeground)',
    colorInfo: 'var(--vscode-textLink-foreground)',

    // 文字颜色
    colorText: 'var(--vscode-foreground)',
    colorTextSecondary: 'var(--vscode-descriptionForeground)',
    colorTextTertiary: 'var(--vscode-descriptionForeground)',
    colorTextQuaternary: 'var(--vscode-descriptionForeground)',
    colorTextPlaceholder: 'var(--vscode-input-placeholderForeground)',

    // 背景色
    colorBgContainer: 'var(--vscode-sideBar-background)',
    colorBgElevated: 'var(--vscode-dropdown-background)',
    colorBgLayout: 'var(--vscode-sideBar-background)',
    colorBgSpotlight: 'var(--vscode-list-activeSelectionBackground)',

    // 边框
    colorBorder: 'var(--vscode-widget-border)',
    colorBorderSecondary: 'var(--vscode-widget-border)',

    // 填充
    colorFillContent: 'var(--vscode-list-hoverBackground)',
    colorFillAlter: 'var(--vscode-list-inactiveSelectionBackground)',
    colorFillQuaternary: 'var(--vscode-toolbar-hoverBackground)',

    // 禁用状态
    colorTextDisabled: 'var(--vscode-disabledForeground)',
    colorBgContainerDisabled: 'var(--vscode-input-background)',

    // 字体
    fontFamily: 'var(--vscode-font-family)',
    fontSize: 13,
    lineHeight: 1.5,

    // 圆角
    borderRadius: 6,
    borderRadiusOuter: 8,

    // 边框宽度
    lineWidth: 1,
    lineWidthBold: 2,

    // 间距
    marginXS: 8,
    marginSM: 12,
    margin: 16,
    marginMD: 20,
    marginLG: 24,
    marginXL: 32,
  },

  components: {
    // Typography 组件 - 标题、段落、文本
    Typography: {
      colorText: 'var(--vscode-foreground)',
      colorTextSecondary: 'var(--vscode-descriptionForeground)',
      colorTextDescription: 'var(--vscode-descriptionForeground)',
      colorTextHeading: 'var(--vscode-foreground)',
      colorTextLightSolid: 'var(--vscode-list-activeSelectionForeground)',
      lineHeight: 1.5,
    },

    // Input 组件
    Input: {
      colorBgContainer: 'var(--vscode-input-background)',
      colorBorder: 'var(--vscode-input-border)',
      colorText: 'var(--vscode-input-foreground)',
      colorTextPlaceholder: 'var(--vscode-input-placeholderForeground)',
      borderRadius: 6,
      activeBorderColor: 'var(--vscode-focusBorder)',
      hoverBorderColor: 'var(--vscode-input-border)',
      colorPrimaryHover: 'var(--vscode-focusBorder)',
    },

    // Select 组件
    Select: {
      colorBgContainer: 'var(--vscode-input-background)',
      colorBorder: 'var(--vscode-input-border)',
      colorText: 'var(--vscode-input-foreground)',
      colorTextPlaceholder: 'var(--vscode-input-placeholderForeground)',
      optionSelectedBg: 'var(--vscode-list-activeSelectionBackground)',
      optionActiveBg: 'var(--vscode-list-hoverBackground)',
      borderRadius: 6,
      selectorBg: 'var(--vscode-input-background)',
    },

    // Button 组件
    Button: {
      colorPrimary: 'var(--vscode-button-background)',
      colorPrimaryHover: 'var(--vscode-button-hoverBackground)',
      colorPrimaryActive: 'var(--vscode-button-background)',
      colorTextLightSolid: 'var(--vscode-button-foreground)',
      defaultBg: 'var(--vscode-button-secondaryBackground)',
      defaultColor: 'var(--vscode-button-secondaryForeground)',
      defaultBorderColor: 'var(--vscode-widget-border)',
      defaultHoverBg: 'var(--vscode-button-secondaryHoverBackground)',
      defaultHoverColor: 'var(--vscode-button-secondaryForeground)',
      defaultHoverBorderColor: 'var(--vscode-widget-border)',
      defaultActiveBg: 'var(--vscode-button-secondaryBackground)',
      defaultActiveColor: 'var(--vscode-button-secondaryForeground)',
      defaultActiveBorderColor: 'var(--vscode-widget-border)',
      borderRadius: 6,
      fontWeight: 500,
      controlHeight: 28,
      controlHeightSM: 24,
      controlHeightLG: 36,
    },

    // Card 组件
    Card: {
      colorBgContainer: 'var(--vscode-editor-background)',
      colorBorderSecondary: 'var(--vscode-panel-border)',
      borderRadiusLG: 8,
    },

    // Tabs 组件
    Tabs: {
      colorBorder: 'var(--vscode-widget-border)',
      itemActiveColor: 'var(--vscode-textLink-foreground)',
      itemSelectedColor: 'var(--vscode-textLink-foreground)',
      itemHoverColor: 'var(--vscode-textLink-foreground)',
      colorBgContainer: 'transparent',
    },

    // Tag 组件
    Tag: {
      borderRadiusSM: 12,
      colorBgContainer: 'var(--vscode-input-background)',
      colorBorder: 'var(--vscode-widget-border)',
    },

    // Dropdown 组件
    Dropdown: {
      colorBgElevated: 'var(--vscode-dropdown-background)',
      borderRadiusLG: 6,
    },

    // Menu 组件（用于 Dropdown 菜单）
    Menu: {
      colorBgContainer: 'var(--vscode-dropdown-background)',
      colorItemBg: 'transparent',
      colorItemText: 'var(--vscode-foreground)',
      colorItemBgSelected: 'var(--vscode-list-activeSelectionBackground)',
      colorItemTextSelected: 'var(--vscode-list-activeSelectionForeground)',
      colorItemBgHover: 'var(--vscode-list-hoverBackground)',
      colorItemTextHover: 'var(--vscode-foreground)',
      colorItemTextDisabled: 'var(--vscode-disabledForeground)',
      itemBorderRadius: 4,
    },

    // Collapse 组件
    Collapse: {
      colorBgContainer: 'transparent',
      colorBorder: 'var(--vscode-panel-border)',
      colorText: 'var(--vscode-foreground)',
      colorTextHeading: 'var(--vscode-foreground)',
      headerBg: 'transparent',
      contentBg: 'transparent',
    },

    // Divider 组件
    Divider: {
      colorBorder: 'var(--vscode-widget-border)',
      margin: 12,
      marginXS: 8,
      marginSM: 8,
    },

    // Alert 组件
    Alert: {
      colorSuccess: 'var(--vscode-terminal-ansiGreen)',
      colorWarning: 'var(--vscode-editorWarning-foreground)',
      colorError: 'var(--vscode-errorForeground)',
      colorInfo: 'var(--vscode-textLink-foreground)',
      borderRadius: 6,
    },

    // Tooltip 组件
    Tooltip: {
      colorBgElevated: 'var(--vscode-editorHoverWidget-background)',
      colorText: 'var(--vscode-editorHoverWidget-foreground)',
      borderRadius: 4,
    },

    // Empty 组件
    Empty: {
      colorText: 'var(--vscode-descriptionForeground)',
    },

    // Spin 组件
    Spin: {
      colorPrimary: 'var(--vscode-textLink-foreground)',
    },

    // Switch 组件
    Switch: {
      colorPrimary: 'var(--vscode-button-background)',
      colorPrimaryHover: 'var(--vscode-button-hoverBackground)',
      colorBgContainer: 'var(--vscode-input-background)',
      colorBorder: 'var(--vscode-input-border)',
    },
  },
});

// 导出默认主题（兼容旧代码）
export const antdTheme = createAntdTheme();
