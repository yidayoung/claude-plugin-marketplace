import { Inbox, SearchX, RefreshCw, AlertCircle } from 'lucide-react';
import { useL10n } from '@/l10n';
import { type VSCodeTheme } from './useVSCodeTheme';

interface MarketplaceEmptyStateProps {
  type: 'no-markets' | 'no-results' | 'error' | 'loading';
  theme: VSCodeTheme;
  onRetry?: () => void;
}

export function MarketplaceEmptyState({ type, theme, onRetry }: MarketplaceEmptyStateProps) {
  const { t } = useL10n();

  const states = {
    'no-markets': {
      icon: Inbox,
      title: t('marketplace.discover.noMarketsTitle') || 'No Marketplaces Available',
      description: t('marketplace.discover.noMarketsDescription') || 'Check back later for new plugin marketplaces.',
      color: 'text-text-secondary',
      bgColor: 'bg-card/50',
      action: null
    },
    'no-results': {
      icon: SearchX,
      title: t('marketplace.discover.noResultsTitle') || 'No Results Found',
      description: t('marketplace.discover.noResultsDescription') || 'Try adjusting your search or filters.',
      color: 'text-text-secondary',
      bgColor: 'bg-card/50',
      action: null
    },
    'error': {
      icon: AlertCircle,
      title: t('marketplace.discover.errorTitle') || 'Something Went Wrong',
      description: t('marketplace.discover.errorDescription') || 'Failed to load marketplaces. Please try again.',
      color: 'text-error-fg',
      bgColor: 'bg-error-bg/10',
      action: {
        label: t('marketplace.discover.retryButton') || 'Retry',
        onClick: onRetry,
        icon: RefreshCw
      }
    },
    'loading': {
      icon: RefreshCw,
      title: t('marketplace.discover.loadingTitle') || 'Loading Marketplaces...',
      description: t('marketplace.discover.loadingDescription') || 'Please wait while we fetch the latest marketplaces.',
      color: 'text-primary',
      bgColor: 'bg-primary/5',
      action: null
    }
  };

  const state = states[type];
  const Icon = state.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      {/* Animated Icon Container */}
      <div
        className={`w-24 h-24 rounded-2xl flex items-center justify-center mb-6 shadow-lg backdrop-blur-sm transition-all duration-300 ${
          type === 'loading' ? 'animate-spin-slow' : 'hover:scale-110'
        }`}
        style={{
          backgroundColor: state.bgColor,
          border: `1px solid ${type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(124, 58, 237, 0.1)'}`
        }}
      >
        <Icon className={`w-12 h-12 ${state.color} ${type === 'loading' ? 'animate-pulse' : ''}`} />
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold text-foreground mb-3 text-center">
        {state.title}
      </h3>

      {/* Description */}
      <p className="text-sm text-text-secondary text-center max-w-md mb-6 leading-relaxed">
        {state.description}
      </p>

      {/* Action Button */}
      {state.action && state.action.onClick && (
        <button
          onClick={state.action.onClick}
          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg bg-primary text-primary-fg hover:bg-primary/90 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
        >
          {state.action.icon && <state.action.icon className="w-4 h-4" />}
          {state.action.label}
        </button>
      )}
    </div>
  );
}
