// vscode-extension/src/pluginMarketplace/data/MarketplaceConfig.ts

/**
 * 内置推荐市场配置
 * 这是唯一的真相来源，extension 和 webview 都使用这个配置
 */
export interface BuiltinMarketplace {
  id: string;
  name: string;
  displayName: string;
  displayNameEn: string;
  description: string;
  descriptionEn: string;
  source: string;
  url: string;
  icon: string;
  category: 'official' | 'community' | 'experimental';
  featured: boolean;
}

/**
 * 内置推荐市场列表
 *
 * 添加新市场时，在此添加配置即可
 */
export const BUILTIN_MARKETPLACES: BuiltinMarketplace[] = [
  // === 官方市场 ===
  {
    id: 'anthropics/claude-plugins-official',
    name: 'claude-plugins-official',
    displayName: 'Anthropic 官方插件',
    displayNameEn: 'Anthropic Official Plugins',
    description: 'Anthropic 官方维护的插件集合，提供稳定可靠的官方功能，如前端设计指引和代码审查工具',
    descriptionEn: 'Officially maintained plugins by Anthropic, including Frontend Design and Code Review tools',
    source: 'anthropics/claude-plugins-official',
    url: 'https://github.com/anthropics/claude-plugins-official',
    icon: '🔷',
    category: 'official',
    featured: true
  },

  // === 社区市场 ===
  {
    id: 'obra/superpowers-marketplace',
    name: 'superpowers-marketplace',
    displayName: 'Superpowers 技能',
    displayNameEn: 'Superpowers Skills',
    description: '极受欢迎的 AI 代理开发方法论插件，支持 TDD 驱动的微任务规划',
    descriptionEn: 'Agentic skills framework for Claude Code, supporting TDD-driven micro-tasks',
    source: 'obra/superpowers-marketplace',
    url: 'https://github.com/obra/superpowers-marketplace',
    icon: '⚡',
    category: 'community',
    featured: true
  },
  {
    id: 'yamadashy/repomix',
    name: 'repomix',
    displayName: 'Repomix 官方插件',
    displayNameEn: 'Repomix Official Plugins',
    description: '打包项目信息到文件，可以粘贴到chat中使用',
    descriptionEn: 'Pack project information into a file and paste it into chat for use',
    source: 'yamadashy/repomix',
    url: 'https://github.com/yamadashy/repomix',
    icon: '📦',
    category: 'community',
    featured: false
  },
  {
    id: 'wshobson/agents',
    name: 'agents',
    displayName: '生产级 Agent 编排',
    displayNameEn: 'Production-ready Agent Orchestration',
    description: '提供 73 个专注插件和 112 个专业代理，优化 Token 使用并支持精细化安装',
    descriptionEn: 'Orchestration with 73 focused plugins and 112 specialized agents, optimized for token usage',
    source: 'wshobson/agents',
    url: 'https://github.com/wshobson/agents',
    icon: '🤖',
    category: 'community',
    featured: false
  },
  {
    id: 'nextlevelbuilder/ui-ux-pro-max-skill',
    name: 'ui-ux-pro-max-skill',
    displayName: 'UI/UX Pro Max',
    displayNameEn: 'UI/UX Pro Max',
    description: '专业 UI/UX 设计智能，包含 67 种风格、96 种配色方案、57 种字体搭配、25 种图表和 13 种技术栈指南',
    descriptionEn: 'Professional UI/UX design intelligence with 67 styles, 96 palettes, 57 font pairings, 25 charts, and 13 stack guidelines',
    source: 'nextlevelbuilder/ui-ux-pro-max-skill',
    url: 'https://github.com/nextlevelbuilder/ui-ux-pro-max-skill',
    icon: '🎨',
    category: 'community',
    featured: true
  },
  {
    id: 'affaan-m/everything-claude-code',
    name: 'everything-claude-code',
    displayName: 'everything-claude-code',
    displayNameEn: 'Everything Claude Code',
    description: '精选 Claude Code 实用插件集合，涵盖开发效率、代码质量等多种场景',
    descriptionEn: 'Curated collection of practical plugins for Claude Code, covering development efficiency and code quality',
    source: 'affaan-m/everything-claude-code',
    url: 'https://github.com/affaan-m/everything-claude-code',
    icon: '📚',
    category: 'community',
    featured: false
  },
  {
    id: 'jeremylongshore/claude-code-plugins-plus-skills',
    name: 'claude-code-plugins-plus-skills',
    displayName: 'Claude Code 插件增强集',
    displayNameEn: 'Claude Code Plugins Plus Skills',
    description: '丰富的插件和技能集合，扩展 Claude Code 的功能边界',
    descriptionEn: 'Rich collection of plugins and skills to extend Claude Code capabilities',
    source: 'jeremylongshore/claude-code-plugins-plus-skills',
    url: 'https://github.com/jeremylongshore/claude-code-plugins-plus-skills',
    icon: '🔌',
    category: 'community',
    featured: false
  },

  // === 实验性市场 ===
  {
    id: 'thedotmack/claude-mem',
    name: 'thedotmack',
    displayName: 'claude-mem',
    displayNameEn: 'claude-mem',
    description: '为 Claude Code 添加跨会话持久记忆，记住您的开发偏好',
    descriptionEn: 'Adds persistent memory across sessions to remember developer preferences',
    source: 'thedotmack/claude-mem',
    url: 'https://github.com/thedotmack/claude-mem',
    icon: '🧠',
    category: 'experimental',
    featured: false
  }
];
