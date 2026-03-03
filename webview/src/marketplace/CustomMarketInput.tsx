import { Search, Plus, Loader2 } from 'lucide-react';
import type { ChangeEvent } from 'react';
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
    <div className="p-6 rounded-xl border border-border bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-base font-semibold flex items-center gap-2.5 text-foreground mb-1">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
            <Search className="w-4 h-4 text-primary" />
          </div>
          {t('marketplace.discover.addCustom')}
        </h3>
        <p className="text-xs text-text-secondary ml-9">
          {t('marketplace.discover.customMarketplaceDescription')}
        </p>
      </div>

      {/* Input Group */}
      <div className="flex gap-3">
        <label htmlFor="custom-market-input" className="sr-only">
          {t('marketplace.discover.addCustom')}
        </label>
        <input
          id="custom-market-input"
          type="text"
          inputMode="url"
          placeholder={t('marketplace.discover.inputPlaceholder')}
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAdd()}
          className="flex-1 px-4 py-2.5 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
          disabled={isLoading}
        />
        <button
          onClick={onAdd}
          disabled={isLoading || !value.trim()}
          className="inline-flex min-w-[100px] items-center justify-center gap-2 rounded-lg bg-btn-bg px-5 py-2.5 text-sm font-semibold text-btn-fg transition-all duration-200 hover:bg-btn-hover hover:shadow-md focus:outline-none focus:ring-2 focus:ring-focus-border disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {isLoading ? '' : t('marketplace.discover.addButton')}
        </button>
      </div>
    </div>
  );
}
