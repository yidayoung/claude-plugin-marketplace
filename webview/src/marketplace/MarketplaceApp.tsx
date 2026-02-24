// vscode-extension/webview/src/marketplace/MarketplaceApp.tsx

import { useState, useEffect, useMemo } from 'react';
import { message } from 'antd';
import { StarOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useL10n } from '@/l10n';
import { useVSCodeTheme, getVSCodeColors } from './useVSCodeTheme';
import { MarketplaceHeader } from './MarketplaceHeader';
import { CustomMarketInput } from './CustomMarketInput';
import { MarketplaceSection } from './MarketplaceSection';
import type { LocalizedMarketplace } from './config';

interface MarketplaceListMessage {
  type: 'marketplaceList';
  payload: {
    marketplaces: Array<{ name: string; stars: number }>;
    builtinStars?: Record<string, number>;  // 所有内置市场的 stars（包括未安装的）
  };
}

interface BuiltinMarketsMessage {
  type: 'builtinMarkets';
  payload: {
    markets: LocalizedMarketplace[];
  };
}

function MarketplaceApp() {
  const { t, locale } = useL10n();
  const [inputValue, setInputValue] = useState('');
  const [addedMarketplaces, setAddedMarketplaces] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);
  const [builtinMarkets, setBuiltinMarkets] = useState<LocalizedMarketplace[]>([]);
  // 后端提供的 stars 数据 (marketplaceName -> stars)
  const [serverStars, setServerStars] = useState<Record<string, number>>({});
  const theme = useVSCodeTheme();
  const colors = getVSCodeColors(theme);

  // 从内置市场列表中提取精选和全部市场，并合并后端的 stars 数据
  const featuredMarkets = useMemo(() => {
    return builtinMarkets
      .filter(m => m.featured)
      .map(m => ({
        ...m,
        stars: serverStars[m.name] ?? m.stars
      }));
  }, [builtinMarkets, serverStars]);

  const allMarkets = useMemo(() => {
    return builtinMarkets.map(m => ({
      ...m,
      stars: serverStars[m.name] ?? m.stars
    }));
  }, [builtinMarkets, serverStars]);

  // 本地化市场
  const localizedFeaturedMarkets = useMemo(() =>
    featuredMarkets.map(m => ({
      ...m,
      displayName: locale === 'zh-cn' ? m.displayName : m.displayNameEn,
      description: locale === 'zh-cn' ? m.description : m.descriptionEn
    })),
    [featuredMarkets, locale]
  );

  const localizedAllMarkets = useMemo(() =>
    allMarkets.map(m => ({
      ...m,
      displayName: locale === 'zh-cn' ? m.displayName : m.displayNameEn,
      description: locale === 'zh-cn' ? m.description : m.descriptionEn
    })),
    [allMarkets, locale]
  );

  // 监听来自 extension 的消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('[MarketplaceApp] Received message:', event.data);
      const msg = event.data as MarketplaceListMessage | BuiltinMarketsMessage;

      if (msg.type === 'marketplaceList') {
        console.log('[MarketplaceApp] marketplaceList:', msg.payload);
        // 从新的格式中提取市场名称和 stars
        const marketplaceNames = new Set(msg.payload.marketplaces.map(m => m.name));
        const stars: Record<string, number> = {};
        msg.payload.marketplaces.forEach(m => {
          stars[m.name] = m.stars;
        });

        // 合并内置市场的 stars 数据（包括未安装的市场）
        if (msg.payload.builtinStars) {
          Object.assign(stars, msg.payload.builtinStars);
        }

        setAddedMarketplaces(marketplaceNames);
        setServerStars(stars);
        // 清除所有 loading 状态，因为操作已完成
        setLoading(null);
      }

      if (msg.type === 'builtinMarkets') {
        console.log('[MarketplaceApp] builtinMarkets:', msg.payload.markets?.length);
        setBuiltinMarkets(msg.payload.markets);
      }
    };

    window.addEventListener('message', handleMessage);

    // 发送 ready 消息通知 extension 已准备好
    console.log('[MarketplaceApp] Sending ready message');
    window.vscode.postMessage({ type: 'ready' });

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // 添加自定义市场
  const handleAddMarketplace = () => {
    const source = inputValue.trim();
    if (!source) {
      message.warning(t('marketplace.discover.inputPlaceholder'));
      return;
    }

    setLoading('custom');
    window.vscode.postMessage({
      type: 'addMarketplace',
      payload: { source }
    });
    setInputValue('');
    // loading 会在收到 marketplaceList 消息后清除
  };

  // 添加推荐市场
  const handleAddRecommended = (source: string, name: string) => {
    setLoading(name);
    window.vscode.postMessage({
      type: 'addRecommendedMarketplace',
      payload: { source }
    });
    // loading 会在收到 marketplaceList 消息后清除
  };

  // 卸载市场
  const handleRemoveMarketplace = (marketName: string) => {
    setLoading(marketName);
    window.vscode.postMessage({
      type: 'removeMarketplace',
      payload: { marketplaceName: marketName }
    });
    // loading 会在收到 marketplaceList 消息后清除
  };

  return (
    <div style={{
      padding: '24px',
      maxWidth: '1100px',
      margin: '0 auto',
      background: colors.background,
      minHeight: '100vh'
    }}>
      {/* 页头 */}
      <MarketplaceHeader theme={theme} />

      {/* 自定义市场添加 */}
      <div style={{ marginBottom: '24px' }}>
        <CustomMarketInput
          value={inputValue}
          onChange={setInputValue}
          onAdd={handleAddMarketplace}
          isLoading={loading === 'custom'}
          theme={theme}
        />
      </div>

      {/* 精选市场 */}
      <MarketplaceSection
        title={t('marketplace.discover.featuredMarkets')}
        icon={<StarOutlined />}
        iconColor="#F59E0B"
        markets={localizedFeaturedMarkets}
        theme={theme}
        addedMarketplaces={addedMarketplaces}
        loading={loading}
        onAdd={handleAddRecommended}
        onRemove={handleRemoveMarketplace}
      />

      {/* 全部市场 */}
      <MarketplaceSection
        title={t('marketplace.discover.allMarkets')}
        icon={<ThunderboltOutlined />}
        iconColor="#7C3AED"
        markets={localizedAllMarkets}
        theme={theme}
        addedMarketplaces={addedMarketplaces}
        loading={loading}
        onAdd={handleAddRecommended}
        onRemove={handleRemoveMarketplace}
      />
    </div>
  );
}

export default MarketplaceApp;
