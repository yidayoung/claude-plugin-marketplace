import { useState } from 'react';
import { Zap, Bot, Code, Settings, Database, Lightbulb, File, Info, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '../components';
import { useL10n } from '../l10n';
import type { PluginDetailData } from './DetailsApp';

interface ComponentsSectionProps {
  plugin: PluginDetailData;
  onOpenFile: (filePath: string) => void;
}

interface ClickableTagProps {
  children: React.ReactNode;
  filePath?: string;
  onOpenFile?: (filePath: string) => void;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'blue' | 'cyan' | 'orange' | 'purple' | 'green' | 'gold' | 'lime';
}

function ClickableTag({ children, filePath, onOpenFile, variant = 'default' }: ClickableTagProps) {
  const variantStyles: Record<string, string> = {
    default: 'bg-muted text-muted-foreground',
    success: 'bg-green-500/10 text-green-500',
    warning: 'bg-yellow-500/10 text-yellow-500',
    error: 'bg-destructive/10 text-destructive',
    blue: 'bg-blue-500/10 text-blue-500',
    cyan: 'bg-cyan-500/10 text-cyan-500',
    orange: 'bg-orange-500/10 text-orange-500',
    purple: 'bg-purple-500/10 text-purple-500',
    green: 'bg-green-500/10 text-green-500',
    gold: 'bg-amber-500/10 text-amber-500',
    lime: 'bg-lime-500/10 text-lime-500',
  };

  const handleClick = () => {
    if (filePath && onOpenFile) {
      onOpenFile(filePath);
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${variantStyles[variant]}`}
      onClick={handleClick}
    >
      {children}
    </span>
  );
}

export default function ComponentsSection({ plugin, onOpenFile }: ComponentsSectionProps) {
  const { t } = useL10n();
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(['skills', 'agents', 'commands', 'hooks', 'mcps', 'lsps', 'outputStyles'])
  );

  const toggleSection = (key: string) => {
    const newSet = new Set(openSections);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setOpenSections(newSet);
  };

  const hasSkills = plugin.skills?.length || 0;
  const hasAgents = plugin.agents?.length || 0;
  const hasHooks = plugin.hooks?.length || 0;
  const hasMcps = plugin.mcps?.length || 0;
  const hasCommands = plugin.commands?.length || 0;
  const hasLsps = plugin.lsps?.length || 0;
  const hasOutputStyles = plugin.outputStyles?.length || 0;

  const total = hasSkills + hasAgents + hasHooks + hasMcps + hasCommands + hasLsps + hasOutputStyles;

  if (total === 0) {
    if (plugin.isRemoteSource && plugin.repository?.url) {
      return (
        <div className="p-4 rounded-lg border border-border bg-card">
          <h5 className="text-base font-semibold m-0">{t('components.title')}</h5>
          <div className="mt-3 p-3 rounded bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-start gap-2 text-sm">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-500">{t('components.notParsed')}</p>
                <p className="text-muted-foreground mt-1">
                  {t('components.remoteHint')}{' '}
                  <a
                    href={plugin.repository.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {t('components.githubRepo')}
                  </a>
                  {' '}{t('components.viewDetails')}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <h5 className="text-base font-semibold m-0">{t('components.title')}</h5>

      <div className="space-y-2 mt-3">
        {hasSkills > 0 && (
          <CollapsibleSection
            title={<><Zap className="w-4 h-4" /> Skills ({hasSkills})</>}
            isOpen={openSections.has('skills')}
            onToggle={() => toggleSection('skills')}
          >
            <div className="space-y-2">
              {plugin.skills?.map(skill => (
                <div key={skill.name} className="space-y-1">
                  <ClickableTag variant="blue" filePath={skill.filePath} onOpenFile={onOpenFile}>
                    {skill.name}
                  </ClickableTag>
                  {skill.description && (
                    <p className="text-xs text-muted-foreground ml-2">{skill.description}</p>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {hasAgents > 0 && (
          <CollapsibleSection
            title={<><Bot className="w-4 h-4" /> Agents ({hasAgents})</>}
            isOpen={openSections.has('agents')}
            onToggle={() => toggleSection('agents')}
          >
            <div className="space-y-2">
              {plugin.agents?.map(agent => (
                <div key={agent.name} className="space-y-1">
                  <ClickableTag variant="cyan" filePath={agent.filePath} onOpenFile={onOpenFile}>
                    {agent.name}
                  </ClickableTag>
                  {agent.description && (
                    <p className="text-xs text-muted-foreground ml-2">{agent.description}</p>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {hasCommands > 0 && (
          <CollapsibleSection
            title={<><Code className="w-4 h-4" /> Commands ({hasCommands})</>}
            isOpen={openSections.has('commands')}
            onToggle={() => toggleSection('commands')}
          >
            <div className="space-y-2">
              {plugin.commands?.map(cmd => (
                <div key={cmd.name} className="space-y-1">
                  <ClickableTag variant="orange" filePath={cmd.filePath} onOpenFile={onOpenFile}>
                    /{cmd.name}
                  </ClickableTag>
                  {cmd.description && (
                    <p className="text-xs text-muted-foreground ml-2">{cmd.description}</p>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {hasHooks > 0 && (
          <CollapsibleSection
            title={<><Settings className="w-4 h-4" /> Hooks ({hasHooks})</>}
            isOpen={openSections.has('hooks')}
            onToggle={() => toggleSection('hooks')}
          >
            <div className="space-y-2">
              {plugin.hooks?.map(hook => (
                <div key={hook.event} className="flex items-center gap-2 flex-wrap">
                  <ClickableTag variant="purple" filePath={hook.filePath} onOpenFile={onOpenFile}>
                    {hook.event}
                  </ClickableTag>
                  <span className="text-xs text-muted-foreground">{t('components.handlersCount', String(hook.hooks.length))}</span>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {hasMcps > 0 && (
          <CollapsibleSection
            title={<><Database className="w-4 h-4" /> MCPs ({hasMcps})</>}
            isOpen={openSections.has('mcps')}
            onToggle={() => toggleSection('mcps')}
          >
            <div className="flex flex-wrap gap-2">
              {plugin.mcps?.map(mcp => (
                <ClickableTag key={mcp.name} variant="green" filePath={mcp.filePath} onOpenFile={onOpenFile}>
                  {mcp.name}
                </ClickableTag>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {hasLsps > 0 && (
          <CollapsibleSection
            title={<><Lightbulb className="w-4 h-4" /> LSPs ({hasLsps})</>}
            isOpen={openSections.has('lsps')}
            onToggle={() => toggleSection('lsps')}
          >
            <div className="flex flex-wrap gap-2">
              {plugin.lsps?.map(lsp => (
                <ClickableTag key={lsp.language} variant="gold" filePath={lsp.filePath} onOpenFile={onOpenFile}>
                  {lsp.language}
                </ClickableTag>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {hasOutputStyles > 0 && (
          <CollapsibleSection
            title={<><File className="w-4 h-4" /> Output Styles ({hasOutputStyles})</>}
            isOpen={openSections.has('outputStyles')}
            onToggle={() => toggleSection('outputStyles')}
          >
            <div className="flex flex-wrap gap-2">
              {plugin.outputStyles?.map(style => (
                <ClickableTag key={style.name} variant="lime" filePath={style.filePath} onOpenFile={onOpenFile}>
                  {style.name}
                </ClickableTag>
              ))}
            </div>
          </CollapsibleSection>
        )}
      </div>
    </div>
  );
}

interface CollapsibleSectionProps {
  title: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({ title, isOpen, onToggle, children }: CollapsibleSectionProps) {
  return (
    <div className="border border-border rounded-md overflow-hidden">
      <button
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <span className="text-sm font-medium">{title}</span>
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {isOpen && <div className="p-3 pt-0">{children}</div>}
    </div>
  );
}
