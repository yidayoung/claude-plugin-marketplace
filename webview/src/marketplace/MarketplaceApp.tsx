import { useState, useEffect, useMemo } from 'react';
import { Star, Zap } from 'lucide-react';
import { useL10n } from '@/l10n';
import { useVSCodeTheme } from './useVSCodeTheme';
import { MarketplaceHeader } from './MarketplaceHeader';
import { CustomMarketInput } from './CustomMarketInput';
import { MarketplaceSection } from './MarketplaceSection';
import { MarketplaceSkeleton } from './MarketplaceSkeleton';
import { MarketplaceEmptyState } from './MarketplaceEmptyState';
import type { LocalizedMarketplace } from './config';
import { logger } from '@/shared/utils/logger';

interface MarketplaceListMessage {
  type: 'marketplaceList';
  payload: {
    marketplaces: Array<{ name: string; stars?: number }>;
    builtinStars?: Record<string, number | undefined>;
  };
}

interface BuiltinMarketsMessage {
  type: 'builtinMarkets';
  payload: {
    markets: LocalizedMarketplace[];
  };
}

interface ErrorMessage {
  type: 'error';
  payload?: {
    message?: string;
  };
}

// 声明全局 vscode API
declare const vscode: {
  postMessage: (message: any) => void;
};

export default function MarketplaceApp() {
  const { t, locale } = useL10n();
  const [inputValue, setInputValue] = useState('');
  const [addedMarketplaces, setAddedMarketplaces] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [builtinMarkets, setBuiltinMarkets] = useState<LocalizedMarketplace[]>([]);
  const [serverStars, setServerStars] = useState<Partial<Record<string, number>>>({});
  const [refreshingStars, setRefreshingStars] = useState(false);
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
      logger.debug('[MarketplaceApp] Received message:', event.data);
      const msg = event.data as MarketplaceListMessage | BuiltinMarketsMessage | ErrorMessage;

      if (msg.type === 'marketplaceList') {
        logger.debug('[MarketplaceApp] marketplaceList:', msg.payload);
        const marketplaceNames = new Set(msg.payload.marketplaces.map(m => m.name));
        const stars: Partial<Record<string, number>> = {};
        msg.payload.marketplaces.forEach(m => {
          if (typeof m.stars === 'number') {
            stars[m.name] = m.stars;
          }
        });

        if (msg.payload.builtinStars) {
          for (const [name, value] of Object.entries(msg.payload.builtinStars)) {
            if (typeof value === 'number') {
              stars[name] = value;
            }
          }
        }

        setAddedMarketplaces(marketplaceNames);
        setServerStars(stars);
        setLoading(null);
        setRefreshingStars(false);
      }

      if (msg.type === 'builtinMarkets') {
        logger.debug('[MarketplaceApp] builtinMarkets:', msg.payload.markets?.length);
        setBuiltinMarkets(msg.payload.markets || []);
        setInitialLoading(false);
        setError(null);
      }

      if (msg.type === 'error') {
        setRefreshingStars(false);
      }
    };

    window.addEventListener('message', handleMessage);

    logger.debug('[MarketplaceApp] Sending ready message');
    if (vscode) {
      vscode.postMessage({ type: 'ready' });
    }

    // Set a timeout for initial loading
    const timeoutId = setTimeout(() => {
      if (initialLoading) {
        setError('timeout');
        setInitialLoading(false);
      }
    }, 10000); // 10 second timeout

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timeoutId);
    };
  }, [initialLoading]);

  const handleAddMarketplace = () => {
    const source = inputValue.trim();
    if (!source) {
      alert(t('marketplace.discover.inputPlaceholder'));
      return;
    }

    setLoading('custom');
    if (vscode) {
      vscode.postMessage({
        type: 'addMarketplace',
        payload: { source }
      });
    }
    setInputValue('');
  };

  const handleAddRecommended = (source: string, name: string) => {
    setLoading(name);
    if (vscode) {
      vscode.postMessage({
        type: 'addRecommendedMarketplace',
        payload: { source }
      });
    }
  };

  const handleRemoveMarketplace = (marketName: string) => {
    setLoading(marketName);
    if (vscode) {
      vscode.postMessage({
        type: 'removeMarketplace',
        payload: { marketplaceName: marketName }
      });
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-[1200px] bg-background p-4 md:p-6">
      <a
        href="#marketplace-main"
        className="absolute -left-[9999px] top-2 z-50 rounded-md bg-primary px-3 py-2 text-primary-fg focus:left-2"
      >
        Skip to content
      </a>

      <MarketplaceHeader
        theme={theme}
        totalMarkets={localizedAllMarkets.length}
        addedMarkets={addedMarketplaces.size}
        isRefreshingStars={refreshingStars}
        onRefreshStars={() => {
          setRefreshingStars(true);
          if (vscode) {
            vscode.postMessage({ type: 'refreshMarketplaceStars' });
          }
        }}
      />

      <main id="marketplace-main">
      <div className="mb-6">
        <CustomMarketInput
          value={inputValue}
          onChange={setInputValue}
          onAdd={handleAddMarketplace}
          isLoading={loading === 'custom'}
          theme={theme}
        />
      </div>

      {initialLoading && (
        <MarketplaceSkeleton count={6} theme={theme} />
      )}

      {error && !initialLoading && (
        <MarketplaceEmptyState
          type="error"
          theme={theme}
          onRetry={() => {
            setError(null);
            setInitialLoading(true);
            if (vscode) {
              vscode.postMessage({ type: 'ready' });
            }
          }}
        />
      )}

      {!initialLoading && !error && (
        <>
          {localizedFeaturedMarkets.length > 0 ? (
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
          ) : (
            !initialLoading && (
              <MarketplaceEmptyState
                type="no-markets"
                theme={theme}
              />
            )
          )}

          {localizedAllMarkets.length > 0 ? (
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
          ) : null}
        </>
      )}
      </main>
    </div>
  );
}
