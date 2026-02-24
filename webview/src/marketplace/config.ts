// vscode-extension/webview/src/marketplace/config.ts

/**
 * 推荐市场配置
 * 用于市场发现面板展示推荐市场
 */
export interface RecommendedMarketplace {
  id: string;
  name: string;
  displayName: string;
  displayNameEn: string;
  description: string;
  descriptionEn: string;
  source: string;
  url: string; // GitHub URL
  icon: string;
  category?: 'official' | 'community' | 'experimental';
  featured?: boolean;
}

/**
 * 推荐市场列表
 *
 * @example 添加新市场
 * {
 *   id: 'github-com/owner/repo',
 *   name: 'repo-name',
 *   displayName: '中文名称',
 *   displayNameEn: 'English Name',
 *   description: '简短描述',
 *   descriptionEn: 'Short description',
 *   source: 'github.com/owner/repo',
 *   url: 'https://github.com/owner/repo',
 *   icon: '🚀',
 *   category: 'community',
 *   featured: true
 * }
 */
export const RECOMMENDED_MARKETPLACES: RecommendedMarketplace[] = [
  // === 官方市场 ===
  {
    id: 'anthropics/claude-plugins-official',
    name: 'claude-plugins-official',
    displayName: 'Anthropic 官方插件',
    displayNameEn: 'Anthropic Official Plugins',
    description: 'Anthropic 官方维护的插件集合，提供稳定可靠的官方插件',
    descriptionEn: 'Officially maintained plugins by Anthropic',
    source: 'github.com/anthropics/claude-plugins-official',
    url: 'https://github.com/anthropics/claude-plugins-official',
    icon: '🔷',
    category: 'official',
    featured: true
  },

  // === 社区市场 ===
  {
    id: 'claude-automation/claude-plugin-marketplace',
    name: 'claude-plugin-marketplace',
    displayName: '社区插件市场',
    displayNameEn: 'Community Plugin Marketplace',
    description: '社区驱动的插件发现与分享平台，探索更多优质插件',
    descriptionEn: 'Community-driven plugin discovery platform',
    source: 'github.com/claude-automation/claude-plugin-marketplace',
    url: 'https://github.com/claude-automation/claude-plugin-marketplace',
    icon: '🌟',
    category: 'community',
    featured: true
  },
  {
    id: 'obra/superpowers-marketplace',
    name: 'superpowers-marketplace',
    displayName: 'Superpowers 技能市场',
    displayNameEn: 'Superpowers Skills',
    description: '自动化技能和工作流合集，提升 Claude Code 使用效率',
    descriptionEn: 'Automation skills and workflows for Claude Code',
    source: 'github.com/obra/superpowers-marketplace',
    url: 'https://github.com/obra/superpowers-marketplace',
    icon: '⚡',
    category: 'community',
    featured: true
  },
  {
    id: 'affaan-m/everything-claude-code',
    name: 'everything-claude-code',
    displayName: 'Everything Claude Code',
    displayNameEn: 'Everything Claude Code',
    description: 'Claude Code 资源大全，包含教程、技巧和最佳实践',
    descriptionEn: 'Comprehensive resources for Claude Code',
    source: 'github.com/affaan-m/everything-claude-code',
    url: 'https://github.com/affaan-m/everything-claude-code',
    icon: '📚',
    category: 'community'
  },
  {
    id: 'nextlevelbuilder/ui-ux-pro-max-skill',
    name: 'ui-ux-pro-max-skill',
    displayName: 'UI/UX Pro Max',
    displayNameEn: 'UI/UX Pro Max',
    description: '专业 UI/UX 设计指南，包含 50+ 风格、97 种配色方案',
    descriptionEn: 'Professional UI/UX design guide with 50+ styles',
    source: 'github.com/nextlevelbuilder/ui-ux-pro-max-skill',
    url: 'https://github.com/nextlevelbuilder/ui-ux-pro-max-skill',
    icon: '🎨',
    category: 'community'
  },

  // === 实验性市场 ===
  {
    id: 'example/experimental-market',
    name: 'experimental-market',
    displayName: '实验性插件市场',
    displayNameEn: 'Experimental Plugins',
    description: '探索前沿实验性插件，功能可能不稳定',
    descriptionEn: 'Cutting-edge experimental plugins',
    source: 'github.com/example/experimental-market',
    url: 'https://github.com/example/experimental-market',
    icon: '🧪',
    category: 'experimental'
  }
];

/**
 * 市场分类配置
 */
export const MARKETPLACE_CATEGORIES = {
  official: {
    label: '官方',
    labelEn: 'Official',
    icon: '🔷',
    color: '#7C3AED',
    description: '官方维护的稳定插件',
    descriptionEn: 'Officially maintained plugins'
  },
  community: {
    label: '社区',
    labelEn: 'Community',
    icon: '🌟',
    color: '#22C55E',
    description: '社区驱动的插件',
    descriptionEn: 'Community-driven plugins'
  },
  experimental: {
    label: '实验性',
    labelEn: 'Experimental',
    icon: '🧪',
    color: '#F59E0B',
    description: '实验性功能，可能不稳定',
    descriptionEn: 'Experimental features'
  }
} as const;

/**
 * 获取市场分类列表
 */
export function getMarketplaceCategories() {
  return Object.entries(MARKETPLACE_CATEGORIES).map(([key, value]) => ({
    key,
    ...value
  }));
}

/**
 * 根据分类过滤市场
 */
export function getMarketsByCategory(category: string): RecommendedMarketplace[] {
  return RECOMMENDED_MARKETPLACES.filter(m => m.category === category);
}

/**
 * 获取精选市场
 */
export function getFeaturedMarkets(): RecommendedMarketplace[] {
  return RECOMMENDED_MARKETPLACES.filter(m => m.featured);
}
