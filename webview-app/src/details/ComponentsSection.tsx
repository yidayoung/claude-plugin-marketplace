// webview-app/src/details/ComponentsSection.tsx

import React from 'react';
import { Typography, Collapse, Tag } from 'antd';
import {
  ThunderboltOutlined,
  ApiOutlined,
  CodeOutlined,
  ControlOutlined
} from '@ant-design/icons';
import type { PluginDetailData } from './DetailsApp';

const { Title } = Typography;

const { Panel } = Collapse;

interface ComponentsSectionProps {
  plugin: PluginDetailData;
}

const ComponentsSection: React.FC<ComponentsSectionProps> = ({ plugin }) => {
  const hasSkills = plugin.skills?.length || 0;
  const hasHooks = plugin.hooks?.length || 0;
  const hasMcps = plugin.mcps?.length || 0;
  const hasCommands = plugin.commands?.length || 0;

  const total = hasSkills + hasHooks + hasMcps + hasCommands;

  if (total === 0) {
    return null;
  }

  return (
    <div className="detail-section">
      <Title level={5}>插件内容</Title>
      <Collapse
        ghost
        defaultActiveKey={['skills', 'hooks', 'mcps', 'commands']}
      >
        {hasSkills > 0 && (
          <Panel
            header={
              <span>
                <ThunderboltOutlined /> Skills ({hasSkills})
              </span>
            }
            key="skills"
          >
            {plugin.skills?.map(skill => (
              <div key={skill.name} style={{ marginBottom: 8 }}>
                <Tag color="blue">{skill.name}</Tag>
                <span style={{ marginLeft: 8 }}>{skill.description}</span>
                {skill.category && <Tag style={{ marginLeft: 8 }}>{skill.category}</Tag>}
              </div>
            ))}
          </Panel>
        )}

        {hasHooks > 0 && (
          <Panel
            header={
              <span>
                <ControlOutlined /> Hooks ({hasHooks})
              </span>
            }
            key="hooks"
          >
            {plugin.hooks?.map(hook => (
              <div key={hook.name} style={{ marginBottom: 8 }}>
                <Tag color="purple">{hook.name}</Tag>
                <span style={{ marginLeft: 8 }}>{hook.description || ''}</span>
                {hook.events?.length && (
                  <div style={{ marginTop: 4, marginLeft: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--vscode-descriptionForeground)' }}>
                      事件: {hook.events.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </Panel>
        )}

        {hasMcps > 0 && (
          <Panel
            header={
              <span>
                <ApiOutlined /> MCPs ({hasMcps})
              </span>
            }
            key="mcps"
          >
            {plugin.mcps?.map(mcp => (
              <div key={mcp.name} style={{ marginBottom: 8 }}>
                <Tag color="green">{mcp.name}</Tag>
                <span style={{ marginLeft: 8 }}>{mcp.description || ''}</span>
              </div>
            ))}
          </Panel>
        )}

        {hasCommands > 0 && (
          <Panel
            header={
              <span>
                <CodeOutlined /> Commands ({hasCommands})
              </span>
            }
            key="commands"
          >
            {plugin.commands?.map(cmd => (
              <div key={cmd.name} style={{ marginBottom: 8 }}>
                <Tag color="orange">{cmd.name}</Tag>
                <span style={{ marginLeft: 8 }}>{cmd.description || ''}</span>
              </div>
            ))}
          </Panel>
        )}
      </Collapse>
    </div>
  );
};

export default ComponentsSection;
