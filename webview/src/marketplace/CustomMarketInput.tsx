import { Search, Plus } from 'lucide-react';
import { Input, Button } from '../components';
import { useL10n } from '@/l10n';
import { type VSCodeTheme } from './useVSCodeTheme';

interface CustomMarketInputProps {
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
  isLoading: boolean;
  theme: VSCodeTheme;
}

export function CustomMarketInput({ value, onChange, onAdd, isLoading }: CustomMarketInputProps) {
  const { t } = useL10n();

  return (
    <div className="p-5 rounded-lg border border-border bg-card shadow-sm mb-4">
      <div className="mb-3">
        <span className="text-sm font-semibold flex items-center gap-2">
          <Search className="w-4 h-4" />
          {t('marketplace.discover.addCustom')}
        </span>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder={t('marketplace.discover.inputPlaceholder')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAdd()}
          className="flex-1"
        />
        <Button
          variant="primary"
          onClick={onAdd}
          disabled={isLoading}
        >
          <Plus className="w-4 h-4 mr-1" />
          {t('marketplace.discover.addButton')}
        </Button>
      </div>
    </div>
  );
}
