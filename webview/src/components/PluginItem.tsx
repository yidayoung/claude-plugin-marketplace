import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Download,
  Trash2,
  Power,
  PowerOff,
  RefreshCw,
  MoreVertical,
  Plus
} from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from './Button';
import { useL10n } from '../l10n';
import { PluginData } from '../hooks';

// 声明全局 vscode API
declare const vscode: {
  postMessage: (message: any) => void;
  getState: () => any;
  setState: (state: any) => void;
};

interface PluginItemProps {
  plugin: PluginData;
  isHovered: boolean;
  onHoverChange: (id: string, hovered: boolean) => void;
}

export function PluginItem({ plugin, isHovered, onHoverChange }: PluginItemProps) {
  const { t } = useL10n();
  const [showMenu, setShowMenu] = useState(false);

  const handleInstall = () => {
    vscode.postMessage({
      type: 'installPlugin',
      payload: { pluginName: plugin.name, marketplace: plugin.marketplace, scope: 'user' }
    });
  };

  const handleUninstall = () => {
    vscode.postMessage({
      type: 'uninstallPlugin',
      payload: { pluginName: plugin.name }
    });
  };

  const handleEnable = () => {
    vscode.postMessage({
      type: 'enablePlugin',
      payload: { pluginName: plugin.name, marketplace: plugin.marketplace }
    });
  };

  const handleDisable = () => {
    vscode.postMessage({
      type: 'disablePlugin',
      payload: { pluginName: plugin.name, marketplace: plugin.marketplace }
    });
  };

  const handleUpdate = () => {
    vscode.postMessage({
      type: 'updatePlugin',
      payload: { pluginName: plugin.name, marketplace: plugin.marketplace }
    });
  };

  const handleOpenDetails = () => {
    vscode.postMessage({
      type: 'openDetails',
      payload: { pluginName: plugin.name, marketplace: plugin.marketplace }
    });
  };

  const statusIcon = plugin.updateAvailable
    ? <RefreshCw className="w-4 h-4 text-yellow-500" />
    : plugin.enabled === false
      ? <XCircle className="w-4 h-4 text-muted-foreground" />
      : <CheckCircle2 className="w-4 h-4 text-green-500" />;

  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-3 py-2 rounded-md",
        "hover:bg-muted/50 transition-colors duration-200",
        "cursor-pointer"
      )}
      onMouseEnter={() => onHoverChange(plugin.name, true)}
      onMouseLeave={() => onHoverChange(plugin.name, false)}
      onClick={handleOpenDetails}
    >
      {/* Status Icon */}
      <div className="shrink-0">
        {statusIcon}
      </div>

      {/* Plugin Name */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">
          {plugin.name}
        </div>
      </div>

      {/* Action Buttons - Show on Hover */}
      {isHovered && (
        <div className="flex items-center gap-1 shrink-0">
          {plugin.installed ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  if (plugin.enabled === false) {
                    handleEnable();
                  } else {
                    handleDisable();
                  }
                }}
                title={plugin.enabled === false ? t('item.enable') : t('item.disable')}
              >
                {plugin.enabled === false ? (
                  <Power className="w-4 h-4" />
                ) : (
                  <PowerOff className="w-4 h-4" />
                )}
              </Button>

              {plugin.updateAvailable && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpdate();
                  }}
                  title={t('item.update')}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUninstall();
                }}
                title={t('item.uninstall')}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="primary"
              onClick={(e) => {
                e.stopPropagation();
                handleInstall();
              }}
              title={t('item.install')}
            >
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
