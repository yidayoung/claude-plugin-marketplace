// vscode-extension/webview/src/details/ComponentsSection.tsx

import React from 'react';
import { Typography, Collapse, Tag, Space, Alert } from 'antd';
import { useL10n } from '../l10n';
import {
  ThunderboltOutlined,
  RobotOutlined,
  ApiOutlined,
  CodeOutlined,
  ControlOutlined,
  BulbOutlined,
  FileOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import type { PluginDetailData } from './DetailsApp';

const { Title } = Typography;

const { Panel } = Collapse;

interface ComponentsSectionProps {
  plugin: PluginDetailData;
  onOpenFile: (filePath: string) => void;
}

interface ClickableTagProps {
  children: React.ReactNode;
  filePath?: string;
  onOpenFile?: (filePath: string) => void;
  color?: string;
}

const ClickableTag: React.FC<ClickableTagProps> = ({ children, filePath, onOpenFile, color }) => {
  const handleClick = () => {
    if (filePath && onOpenFile) {
      onOpenFile(filePath);
    }
  };

  const style = filePath ? { cursor: 'pointer' } : undefined;

  return (
    <Tag
      color={color}
      style={style}
      onClick={handleClick}
    >
      {children}
    </Tag>
  );
};

const ComponentsSection: React.FC<ComponentsSectionProps> = ({ plugin, onOpenFile }) => {
  const { t } = useL10n();
  const hasSkills = plugin.skills?.length || 0;
  const hasAgents = plugin.agents?.length || 0;
  const hasHooks = plugin.hooks?.length || 0;
  const hasMcps = plugin.mcps?.length || 0;
  const hasCommands = plugin.commands?.length || 0;
  const hasLsps = plugin.lsps?.length || 0;
  const hasOutputStyles = plugin.outputStyles?.length || 0;

  const total = hasSkills + hasAgents + hasHooks + hasMcps + hasCommands + hasLsps + hasOutputStyles;

  // 如果没有任何内容且是远程源，显示提示
  if (total === 0) {
    if (plugin.isRemoteSource && plugin.repository?.url) {
      return (
        <Space direction="vertical" size={12} style={{
          padding: 16,
          background: 'var(--vscode-sideBar-background)',
          borderRadius: 8,
          border: '1px solid var(--vscode-panel-border)',
          width: '100%'
        }}>
          <Title level={5} style={{ margin: 0 }}>{t('components.title')}</Title>
          <Alert
            type="info"
            icon={<InfoCircleOutlined />}
            message={t('components.notParsed')}
            description={
              <span>
                {t('components.remoteHint')}{' '}
                <a
                  href={plugin.repository.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--vscode-textLink-foreground)' }}
                >
                  {t('components.githubRepo')}
                </a>
                {' '}{t('components.viewDetails')}
              </span>
            }
            showIcon
          />
        </Space>
      );
    }
    return null;
  }

  return (
    <Space orientation="vertical" size={12} style={{
      padding: 16,
      background: 'var(--vscode-sideBar-background)',
      borderRadius: 8,
      border: '1px solid var(--vscode-panel-border)',
      width: '100%'
    }}>
      <Title level={5} style={{ margin: 0 }}>{t('components.title')}</Title>
      <Collapse
        ghost
        defaultActiveKey={['skills', 'agents', 'commands', 'hooks', 'mcps', 'lsps', 'outputStyles']}
      >
        {hasSkills > 0 && (
          <Panel
            header={<Space><ThunderboltOutlined /> Skills ({hasSkills})</Space>}
            key="skills"
          >
            <Space orientation="vertical" size={8} style={{ width: '100%' }}>
              {plugin.skills?.map(skill => (
                <Space key={skill.name} orientation="vertical" size={4}>
                  <ClickableTag color="blue" filePath={skill.filePath} onOpenFile={onOpenFile}>
                    {skill.name}
                  </ClickableTag>
                  {skill.description && (
                    <span style={{ color: 'var(--vscode-descriptionForeground)' }}>
                      {skill.description}
                    </span>
                  )}
                </Space>
              ))}
            </Space>
          </Panel>
        )}

        {hasAgents > 0 && (
          <Panel
            header={<Space><RobotOutlined /> Agents ({hasAgents})</Space>}
            key="agents"
          >
            <Space orientation="vertical" size={8} style={{ width: '100%' }}>
              {plugin.agents?.map(agent => (
                <Space key={agent.name} orientation="vertical" size={4}>
                  <ClickableTag color="cyan" filePath={agent.filePath} onOpenFile={onOpenFile}>
                    {agent.name}
                  </ClickableTag>
                  {agent.description && (
                    <span style={{ color: 'var(--vscode-descriptionForeground)' }}>
                      {agent.description}
                    </span>
                  )}
                </Space>
              ))}
            </Space>
          </Panel>
        )}

        {hasCommands > 0 && (
          <Panel
            header={<Space><CodeOutlined /> Commands ({hasCommands})</Space>}
            key="commands"
          >
            <Space orientation="vertical" size={8} style={{ width: '100%' }}>
              {plugin.commands?.map(cmd => (
                <Space key={cmd.name} orientation="vertical" size={4}>
                  <ClickableTag color="orange" filePath={cmd.filePath} onOpenFile={onOpenFile}>
                    /{cmd.name}
                  </ClickableTag>
                  {cmd.description && (
                    <span style={{ color: 'var(--vscode-descriptionForeground)' }}>
                      {cmd.description}
                    </span>
                  )}
                </Space>
              ))}
            </Space>
          </Panel>
        )}

        {hasHooks > 0 && (
          <Panel
            header={<Space><ControlOutlined /> Hooks ({hasHooks})</Space>}
            key="hooks"
          >
            <Space orientation="vertical" size={8} style={{ width: '100%' }}>
              {plugin.hooks?.map(hook => (
                <Space key={hook.event} size={8} wrap>
                  <ClickableTag color="purple" filePath={hook.filePath} onOpenFile={onOpenFile}>
                    {hook.event}
                  </ClickableTag>
                  <span>{t('components.handlersCount', String(hook.hooks.length))}</span>
                </Space>
              ))}
            </Space>
          </Panel>
        )}

        {hasMcps > 0 && (
          <Panel
            header={<Space><ApiOutlined /> MCPs ({hasMcps})</Space>}
            key="mcps"
          >
            <Space orientation="vertical" size={8} style={{ width: '100%' }}>
              {plugin.mcps?.map(mcp => (
                <ClickableTag key={mcp.name} color="green" filePath={mcp.filePath} onOpenFile={onOpenFile}>
                  {mcp.name}
                </ClickableTag>
              ))}
            </Space>
          </Panel>
        )}

        {hasLsps > 0 && (
          <Panel
            header={<Space><BulbOutlined /> LSPs ({hasLsps})</Space>}
            key="lsps"
          >
            <Space orientation="vertical" size={8} style={{ width: '100%' }}>
              {plugin.lsps?.map(lsp => (
                <ClickableTag key={lsp.language} color="gold" filePath={lsp.filePath} onOpenFile={onOpenFile}>
                  {lsp.language}
                </ClickableTag>
              ))}
            </Space>
          </Panel>
        )}

        {hasOutputStyles > 0 && (
          <Panel
            header={<Space><FileOutlined /> Output Styles ({hasOutputStyles})</Space>}
            key="outputStyles"
          >
            <Space orientation="vertical" size={8} style={{ width: '100%' }}>
              {plugin.outputStyles?.map(style => (
                <ClickableTag key={style.name} color="lime" filePath={style.filePath} onOpenFile={onOpenFile}>
                  {style.name}
                </ClickableTag>
              ))}
            </Space>
          </Panel>
        )}
      </Collapse>
    </Space>
  );
};

export default ComponentsSection;
