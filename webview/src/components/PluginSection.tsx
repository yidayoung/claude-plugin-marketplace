import React from 'react';
import { ChevronDown, ChevronUp, RefreshCw, Trash2 } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from './Button';
import { useL10n } from '../l10n';

// 声明全局 vscode API
declare const vscode: {
  postMessage: (message: any) => void;
  getState: () => any;
  setState: (state: any) => void;
};

interface PluginSectionProps {
  title: string;
  count: number;
  sectionKey: string;
  isExpanded: boolean;
  isHovered: boolean;
  onToggle: (sectionKey: string) => void;
  onHoverChange: (id: string, hovered: boolean) => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function PluginSection({
  title,
  count,
  sectionKey,
  isExpanded,
  isHovered,
  onToggle,
  onHoverChange,
  children,
  actions
}: PluginSectionProps) {
  return (
    <section className="space-y-2">
      <div
        className={cn(
          'group flex items-center gap-2 rounded-lg border border-border/60 bg-card/55 px-2.5 py-1.5',
          'cursor-pointer transition-colors duration-200 hover:bg-hover-bg/60',
          isHovered && 'bg-hover-bg/60'
        )}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button')) {
            return;
          }
          onToggle(sectionKey);
        }}
        onMouseEnter={() => onHoverChange(`section-${sectionKey}`, true)}
        onMouseLeave={() => onHoverChange(`section-${sectionKey}`, false)}
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-muted/40 text-text-secondary">
          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold tracking-wide text-foreground">{title}</p>
        </div>

        <div className="ml-auto flex items-center gap-1">
          {actions && (
            <div
              className={cn(
                'flex items-center gap-0.5 transition-opacity duration-200',
                isHovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              )}
            >
              {actions}
            </div>
          )}

          <span className="rounded-full border border-border/70 bg-muted/45 px-1.5 py-0.5 text-[10px] leading-none text-text-secondary">
            {count}
          </span>
        </div>
      </div>

      {isExpanded && <div className="space-y-2 pl-1">{children}</div>}
    </section>
  );
}

interface MarketSectionActionsProps {
  marketName: string;
}

export function MarketSectionActions({ marketName }: MarketSectionActionsProps) {
  const { t } = useL10n();

  const handleRefreshMarket = (e: React.MouseEvent) => {
    e.stopPropagation();
    vscode.postMessage({
      type: 'executeCommand',
      payload: { command: 'claudePluginMarketplace.refreshMarketplace', args: [marketName] }
    });
  };

  const handleRemoveMarket = (e: React.MouseEvent) => {
    e.stopPropagation();
    vscode.postMessage({
      type: 'executeCommand',
      payload: { command: 'claudePluginMarketplace.removeMarketplace', args: [marketName] }
    });
  };

  return (
    <>
      <Button
        size="sm"
        variant="icon"
        onClick={handleRefreshMarket}
        title={t('section.refreshMarket')}
      >
        <RefreshCw className="h-3 w-3" />
      </Button>
      <Button
        size="sm"
        variant="icon"
        onClick={handleRemoveMarket}
        title={t('section.removeMarket')}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </>
  );
}
