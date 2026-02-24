// vscode-extension/webview/src/marketplace/config.ts

/**
 * 推荐市场配置类型
 * 与 extension/src/pluginMarketplace/data/MarketplaceConfig.ts 中的 BuiltinMarketplace 保持同步
 */
export interface RecommendedMarketplace {
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
 * 市场本地化信息（带扩展数据）
 */
export interface LocalizedMarketplace extends Omit<RecommendedMarketplace, 'displayName' | 'description'> {
  displayName: string;
  description: string;
  stars?: number; // GitHub stars（异步获取，不在配置中）
}

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
