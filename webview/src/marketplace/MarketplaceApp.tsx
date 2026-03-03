import { useState, useEffect, useMemo } from 'react';
import { Star, Zap } from 'lucide-react';
import { useL10n } from '@/l10n';
import { useVSCodeTheme } from './useVSCodeTheme';
import { MarketplaceHeader } from './MarketplaceHeader';
import { CustomMarketInput } from './CustomMarketInput';
import { MarketplaceSection } from './MarketplaceSection';
import type { LocalizedMarketplace } from './config';

interface MarketplaceListMessage {
  type: 'marketplaceList';
  payload: {
    marketplaces: Array<{ name: string; stars: number }>;
    builtinStars?: Record<string, number>;
  };
}

interface BuiltinMarketsMessage {
  type: 'builtinMarkets';
  payload: {
    markets: LocalizedMarketplace[];
  };
}

declare const windowVscode: {
  vscode: {
    postMessage: (message: any) => void;
  };
};

export default function MarketplaceApp() {
  const { t, locale } = useL10n();
  const [inputValue, setInputValue] = useState('');
  const [addedMarketplaces, setAddedMarketplaces] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);
  const [builtinMarkets, setBuiltinMarkets] = useState<LocalizedMarketplace[]>([]);
  const [serverStars, setServerStars] = useState<Record<string, number>>({});
  const theme = useVSCodeTheme();

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

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('[MarketplaceApp] Received message:', event.data);
      const msg = event.data as MarketplaceListMessage | BuiltinMarketsMessage;

      if (msg.type === 'marketplaceList') {
        console.log('[MarketplaceApp] marketplaceList:', msg.payload);
        const marketplaceNames = new Set(msg.payload.marketplaces.map(m => m.name));
        const stars: Record<string, number> = {};
        msg.payload.marketplaces.forEach(m => {
          stars[m.name] = m.stars;
        });

        if (msg.payload.builtinStars) {
          Object.assign(stars, msg.payload.builtinStars);
        }

        setAddedMarketplaces(marketplaceNames);
        setServerStars(stars);
        setLoading(null);
      }

      if (msg.type === 'builtinMarkets') {
        console.log('[MarketplaceApp] builtinMarkets:', msg.payload.markets?.length);
        setBuiltinMarkets(msg.payload.markets);
      }
    };

    window.addEventListener('message', handleMessage);

    console.log('[MarketplaceApp] Sending ready message');
    if (windowVscode.vscode) {
      windowVscode.vscode.postMessage({ type: 'ready' });
    }

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleAddMarketplace = () => {
    const source = inputValue.trim();
    if (!source) {
      alert(t('marketplace.discover.inputPlaceholder'));
      return;
    }

    setLoading('custom');
    if (windowVscode.vscode) {
      windowVscode.vscode.postMessage({
        type: 'addMarketplace',
        payload: { source }
      });
    }
    setInputValue('');
  };

  const handleAddRecommended = (source: string, name: string) => {
    setLoading(name);
    if (windowVscode.vscode) {
      windowVscode.vscode.postMessage({
        type: 'addRecommendedMarketplace',
        payload: { source }
      });
    }
  };

  const handleRemoveMarketplace = (marketName: string) => {
    setLoading(marketName);
    if (windowVscode.vscode) {
      windowVscode.vscode.postMessage({
        type: 'removeMarketplace',
        payload: { marketplaceName: marketName }
      });
    }
  };

  return (
    <div className="p-6 max-w-[1100px] mx-auto bg-background min-h-screen">
      {/* 页头 */}
      <MarketplaceHeader theme={theme} />

      {/* 自定义市场添加 */}
      <div className="mb-6">
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
        icon={<Star className="w-4 h-4" />}
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
        icon={<Zap className="w-4 h-4" />}
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
