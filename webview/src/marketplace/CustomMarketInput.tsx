// vscode-extension/webview/src/marketplace/CustomMarketInput.tsx

import { Input, Button, Space, Typography, Card } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useL10n } from '@/l10n';
import { type VSCodeTheme, getVSCodeColors } from './useVSCodeTheme';

const { Text } = Typography;

interface CustomMarketInputProps {
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
  isLoading: boolean;
  theme: VSCodeTheme;
}

export function CustomMarketInput({ value, onChange, onAdd, isLoading, theme }: CustomMarketInputProps) {
  const { t } = useL10n();
  const colors = getVSCodeColors(theme);

  return (
    <Card
      size="small"
      style={{
        borderColor: colors.cardBorder,
        background: colors.cardBackground,
        boxShadow: colors.shadow
      }}
      styles={{ body: { padding: '20px' } }}
    >
      <div style={{ marginBottom: '12px' }}>
        <Text
          strong
          style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <SearchOutlined />
          {t('marketplace.discover.addCustom')}
        </Text>
      </div>
      <Space.Compact style={{ width: '100%' }}>
        <Input
          placeholder={t('marketplace.discover.inputPlaceholder')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPressEnter={onAdd}
          size="large"
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onAdd}
          loading={isLoading}
          size="large"
        >
          {t('marketplace.discover.addButton')}
        </Button>
      </Space.Compact>
    </Card>
  );
}
