import { Zap } from 'lucide-react';
import { useL10n } from '@/l10n';
import { type VSCodeTheme, getVSCodeColors } from './useVSCodeTheme';

interface MarketplaceHeaderProps {
  theme: VSCodeTheme;
}

export function MarketplaceHeader({ theme }: MarketplaceHeaderProps) {
  const { t } = useL10n();

  return (
    <div className="mb-6 text-center">
      <div
        className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 shadow-lg"
        style={{
          background: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
          boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
        }}
      >
        <Zap className="w-6 h-6 text-white" />
      </div>
      <h2 className="text-2xl font-semibold m-0 mb-1">
        {t('marketplace.discover.title')}
      </h2>
      <p className="text-sm text-muted-foreground">
        {t('marketplace.discover.subtitle')}
      </p>
    </div>
  );
}
