import { useMemo } from 'react';
import { PluginData, FilterState } from './usePluginData';

export function usePluginFilter(plugins: PluginData[], filter: FilterState) {
  const filteredPlugins = useMemo(() => {
    let result = [...plugins];

    // 关键词过滤
    if (filter.keyword) {
      const keyword = filter.keyword.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(keyword) ||
        p.description.toLowerCase().includes(keyword)
      );
    }

    // 状态过滤
    if (filter.status === 'installed') {
      result = result.filter(p => p.installed);
    } else if (filter.status === 'not-installed') {
      result = result.filter(p => !p.installed);
    } else if (filter.status === 'upgradable') {
      result = result.filter(p => p.updateAvailable);
    }

    // 市场过滤
    if (filter.marketplace && filter.marketplace !== 'all') {
      result = result.filter(p => p.marketplace === filter.marketplace);
    }

    return result;
  }, [plugins, filter]);

  const groupedPlugins = useMemo(() => {
    // 已安装插件
    const installed = filteredPlugins.filter(p => p.installed);

    // 排序已安装插件（按优先级）
    installed.sort((a, b) => {
      const getPriority = (p: PluginData) => {
        let score = 0;
        if (p.installed) score += 100;
        if (p.enabled !== false) score += 50;
        if (p.updateAvailable) score += 20;
        return score;
      };

      const priorityA = getPriority(a);
      const priorityB = getPriority(b);

      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }

      return a.name.localeCompare(b.name);
    });

    // 按市场分组
    const byMarketplace: Record<string, PluginData[]> = {};
    filteredPlugins.forEach(p => {
      if (!byMarketplace[p.marketplace]) {
        byMarketplace[p.marketplace] = [];
      }
      byMarketplace[p.marketplace].push(p);
    });

    return { installed, byMarketplace };
  }, [filteredPlugins]);

  const stats = useMemo(() => {
    const installedCount = plugins.filter(p => p.installed).length;
    const enabledCount = plugins.filter(p => p.installed && p.enabled !== false).length;
    const updatableCount = plugins.filter(p => p.updateAvailable).length;
    return {
      installed: installedCount,
      enabled: enabledCount,
      updatable: updatableCount,
      total: plugins.length
    };
  }, [plugins]);

  return { filteredPlugins, groupedPlugins, stats };
}
