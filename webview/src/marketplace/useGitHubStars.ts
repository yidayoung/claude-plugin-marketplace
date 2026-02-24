// vscode-extension/webview/src/marketplace/useGitHubStars.ts

import { useState, useEffect, useRef } from 'react';
import type { LocalizedMarketplace } from './config';

interface GitHubStarsMessage {
  type: 'githubStars';
  payload: {
    marketplace: string;
    stars: number;
  };
}

const STARS_CACHE_KEY = 'github_stars_cache';
const STARS_LAST_REFRESH_KEY = 'github_stars_last_refresh'; // 上次刷新时间戳
// Stars 缓存存储 7 天，但每小时会在后台刷新一次

interface StarsCache {
  [key: string]: {
    stars: number;
    timestamp: number;
  };
}

/**
 * 从 localStorage 读取缓存的星数
 */
function getStarsCache(): StarsCache {
  try {
    const cached = localStorage.getItem(STARS_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // ignore
  }
  return {};
}

/**
 * 保存星数到 localStorage
 */
function saveStarsCache(cache: StarsCache): void {
  try {
    localStorage.setItem(STARS_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

/**
 * 获取市场的星数（带缓存）
 * 只要缓存存在就返回，不管是否过期（过期会在后台刷新）
 */
function getCachedStars(marketName: string): number | undefined {
  const cache = getStarsCache();
  const entry = cache[marketName];
  if (entry) {
    return entry.stars;
  }
  return undefined;
}

/**
 * 检查是否需要在本次会话中刷新 stars
 * 如果距离上次刷新超过 1 小时，则返回 true
 */
function shouldRefreshStars(): boolean {
  try {
    const lastRefresh = localStorage.getItem(STARS_LAST_REFRESH_KEY);
    if (!lastRefresh) {
      return true; // 从未刷新过
    }
    const ONE_HOUR = 60 * 60 * 1000;
    return Date.now() - parseInt(lastRefresh, 10) > ONE_HOUR;
  } catch {
    return true;
  }
}

/**
 * 标记已执行过刷新
 */
function markStarsRefreshed(): void {
  try {
    localStorage.setItem(STARS_LAST_REFRESH_KEY, Date.now().toString());
  } catch {
    // ignore
  }
}

/**
 * Hook: 异步加载市场星数
 * @param markets - 市场列表
 * @returns 带星数的市场列表
 */
export function useGitHubStars(markets: LocalizedMarketplace[]): LocalizedMarketplace[] {
  const [marketsWithStars, setMarketsWithStars] = useState<LocalizedMarketplace[]>([]);

  // 使用 ref 跟踪已请求的市场，避免重复请求
  const requestedRef = useRef<Set<string>>(new Set());

  // 是否已经执行过本次会话的刷新
  const hasRefreshedThisSession = useRef(false);

  // 当 markets 参数变化时，同步更新 marketsWithStars
  useEffect(() => {
    // 如果传入的 markets 为空，不更新（等待数据加载）
    if (markets.length === 0) {
      return;
    }

    // 使用现有的 stars 数据（如果有的话），否则使用缓存
    const updated = markets.map(market => {
      const existing = marketsWithStars.find(m => m.name === market.name);
      return {
        ...market,
        stars: existing?.stars ?? getCachedStars(market.name) ?? market.stars
      };
    });

    setMarketsWithStars(updated);
  }, [markets]);

  // 请求星数的 effect
  useEffect(() => {
    // 检查是否需要执行本次会话的刷新
    const shouldDoSessionRefresh = shouldRefreshStars() && !hasRefreshedThisSession.current;

    // 为没有缓存的市场，或会话首次刷新时，请求星数
    const needsUpdate = markets.filter(market => {
      // 会话刷新时，所有 GitHub 市场都需要刷新
      if (shouldDoSessionRefresh) {
        return market.url.includes('github.com');
      }
      // 跳过已经请求过的市场
      if (requestedRef.current.has(market.name)) {
        return false;
      }
      // 为没有缓存的市场请求
      const cachedStars = getCachedStars(market.name);
      return cachedStars === undefined;
    });

    if (needsUpdate.length === 0) {
      return;
    }

    // 标记这些市场为已请求
    needsUpdate.forEach(m => requestedRef.current.add(m.name));

    // 标记已执行会话刷新
    if (shouldDoSessionRefresh) {
      hasRefreshedThisSession.current = true;
      markStarsRefreshed();
    }

    // 通知 extension 异步获取星数
    needsUpdate.forEach(market => {
      // 只对 GitHub 市场请求星数
      if (market.url.includes('github.com')) {
        window.vscode.postMessage({
          type: 'fetchGitHubStars',
          payload: {
            marketplace: market.name,
            url: market.url
          }
        });
      }
    });
  }, [markets]);

  // 监听星数更新消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data as GitHubStarsMessage;
      if (msg.type === 'githubStars') {
        const { marketplace, stars } = msg.payload;

        // 更新缓存
        const cache = getStarsCache();
        cache[marketplace] = { stars, timestamp: Date.now() };
        saveStarsCache(cache);

        // 更新状态
        setMarketsWithStars(prev => prev.map(m =>
          m.name === marketplace ? { ...m, stars } : m
        ));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return marketsWithStars;
}
