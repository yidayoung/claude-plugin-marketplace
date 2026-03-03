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
    <div className="space-y-1">
      <div
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer",
          "hover:bg-muted/50 transition-colors duration-200"
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
        <span className="flex items-center text-xs">
          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </span>
        <span className="font-medium text-sm text-foreground">{title}</span>
        <span className="text-sm text-muted-foreground">({count})</span>
        {actions && (
          <div
            className={cn(
              "ml-auto flex items-center gap-0.5",
              "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
              isHovered && "opacity-100"
            )}
          >
            {actions}
          </div>
        )}
      </div>
      {isExpanded && <div className="pl-4">{children}</div>}
    </div>
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
        variant="ghost"
        onClick={handleRefreshMarket}
        title={t('section.refreshMarket')}
      >
        <RefreshCw className="w-3 h-3" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleRemoveMarket}
        title={t('section.removeMarket')}
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </>
  );
}
