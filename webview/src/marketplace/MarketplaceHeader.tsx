// vscode-extension/webview/src/marketplace/MarketplaceHeader.tsx



import { useL10n } from '@/l10n';
import { type VSCodeTheme, getVSCodeColors } from './useVSCodeTheme';

const { Title, Text } = Typography;

interface MarketplaceHeaderProps {
  theme: VSCodeTheme;
}

export function MarketplaceHeader({ theme }: MarketplaceHeaderProps) {
  const { t } = useL10n();
  const colors = getVSCodeColors(theme);

  return (
    <div style={{ marginBottom: '24px', textAlign: 'center' }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '56px',
          height: '56px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
          marginBottom: '12px',
          boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
        }}
      >
        <ThunderboltOutlined style={{ fontSize: '24px', color: '#FFFFFF' }} />
      </div>
      <Title
        level={2}
        style={{
          margin: '0 0 4px 0',
          fontSize: '24px',
          fontWeight: 600,
          color: colors.textPrimary
        }}
      >
        {t('marketplace.discover.title')}
      </Title>
      <Text type="secondary" style={{ fontSize: '13px' }}>
        {t('marketplace.discover.subtitle')}
      </Text>
    </div>
  );
}
