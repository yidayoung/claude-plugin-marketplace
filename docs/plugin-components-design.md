# 插件子项展示设计文档

## 1. 概述

本文档描述插件详情面板中展示插件子组件（Skills、Agents、Commands、Hooks、MCPs、LSPs）的完整设计方案。

### 1.1 目标

让用户在查看插件详情时，能够清晰地了解该插件包含哪些功能组件：
- 有哪些 Skills 可用，它们做什么
- 有哪些 Agents，用途是什么
- 有哪些用户命令
- 配置了哪些 Hooks
- 提供了哪些 MCP 和 LSP 服务

### 1.2 现状

- **UI 层**：已基本完成展示框架（`ComponentsSection.tsx`）
- **类型定义**：有基础接口但不够完整
- **后端解析**：所有解析方法都是空实现，返回空数组

---

## 2. 插件目录结构

基于 Claude Code 官方文档和本地实际插件分析：

```
插件根目录/
├── .claude-plugin/
│   ├── plugin.json          # 插件清单（必需）
│   └── marketplace.json     # 市场信息（可选）
│
├── skills/                  # Agent Skills
│   └── skill-name/
│       └── SKILL.md         # 必须是 SKILL.md（全大写）
│
├── agents/                  # Subagents
│   └── agent-name.md        # 文件名即 agent 名称
│
├── commands/                # User Commands (slash commands)
│   └── command-name.md      # 文件名即命令名
│
├── hooks/                   # Hooks
│   ├── hooks.json           # Hooks 配置
│   └── *.sh, *.cmd          # Hook 脚本文件
│
├── .mcp.json               # MCP Servers 配置（可选）
├── .lsp.json               # LSP Servers 配置（可选）
│
├── README.md               # 插件文档
└── package.json            # npm 包配置（可选，可包含 claude 配置）
```

### 2.1 各目录说明

| 目录 | 用途 | 文件格式 | 命名规范 |
|------|------|----------|----------|
| `skills/` | Agent Skills（模型自动调用） | Markdown + YAML frontmatter | 目录名/SKILL.md |
| `agents/` | Subagents（用户显式调用） | Markdown + YAML frontmatter | agent-name.md |
| `commands/` | 用户斜杠命令 | Markdown + YAML frontmatter | command-name.md |
| `hooks/` | 事件钩子 | JSON 配置 + 脚本 | hooks.json |
| `.mcp.json` | MCP 服务器 | JSON 配置 | - |
| `.lsp.json` | LSP 服务器 | JSON 配置 | - |

---

## 3. 数据结构设计

### 3.1 类型定义

```typescript
/**
 * Skill 信息（Agent Skills）
 * 来源: skills/*/SKILL.md
 */
export interface SkillInfo {
  name: string;              // 从 YAML frontmatter 的 name 字段
  description: string;       // 从 YAML frontmatter 的 description 字段
  tools?: string[];          // 允许使用的工具列表（可选）
  allowedTools?: string[];   // tools 的别名（可选）
  disableModelInvocation?: boolean; // 是否禁用模型调用
  category?: string;         // 分类标签（可选）
}

/**
 * Agent 信息（Subagents）
 * 来源: agents/*.md
 */
export interface AgentInfo {
  name: string;              // 从 YAML frontmatter 的 name 字段
  description: string;       // 从 YAML frontmatter 的 description 字段
  model?: string;            // 模型配置（如 "inherit" 或具体模型）
  category?: string;         // 分类标签（可选）
}

/**
 * Command 信息（User Commands）
 * 来源: commands/*.md
 */
export interface CommandInfo {
  name: string;              // 文件名（去掉 .md 后缀）
  description?: string;      // 从 frontmatter 或首行提取
}

/**
 * Hook 信息
 * 来源: hooks/hooks.json
 */
export interface HookInfo {
  event: string;             // 事件名称（SessionStart, PostToolUse 等）
  hooks: HookConfig[];       // 该事件的 hook 配置列表
}

export interface HookConfig {
  type: string;              // "command" 或 "skill"
  matcher?: string;          // 事件匹配模式
  command?: string;          // 命令路径
  skill?: string;            // skill 名称
  async?: boolean;           // 是否异步执行
}

/**
 * MCP Server 信息
 * 来源: .mcp.json 或 package.json 的 claude.mcps
 */
export interface McpInfo {
  name: string;              // MCP 名称
  command?: string;          // 启动命令
  args?: string[];           // 命令参数
  env?: Record<string, string>; // 环境变量
  description?: string;      // 描述（从配置或推断）
}

/**
 * LSP Server 信息
 * 来源: .lsp.json 或 package.json 的 claude.lsp
 */
export interface LspInfo {
  language: string;          // 支持的语言
  command: string;           // LSP 服务器命令
  args?: string[];           // 命令参数
  extensionToLanguage?: Record<string, string>; // 扩展名到语言的映射
}
```

### 3.2 更新 PluginDetailData

```typescript
export interface PluginDetailData extends PluginData {
  // 详情特有字段
  readme?: string;
  skills?: SkillInfo[];
  agents?: AgentInfo[];      // 新增
  commands?: CommandInfo[];
  hooks?: HookInfo[];        // 修改为更详细的结构
  mcps?: McpInfo[];
  lsps?: LspInfo[];          // 新增
  repository?: RepositoryInfo;
  dependencies?: string[];
  license?: string;
}
```

---

## 4. 后端解析逻辑设计

### 4.1 解析方法概览

| 方法 | 输入 | 输出 | 说明 |
|------|------|------|------|
| `parseSkills()` | pluginPath | `SkillInfo[]` | 扫描 skills/ 目录，解析 SKILL.md |
| `parseAgents()` | pluginPath | `AgentInfo[]` | 扫描 agents/ 目录，解析 .md 文件 |
| `parseCommands()` | pluginPath | `CommandInfo[]` | 扫描 commands/ 目录 |
| `parseHooks()` | pluginPath | `HookInfo[]` | 解析 hooks/hooks.json |
| `parseMcps()` | pluginPath | `McpInfo[]` | 解析 .mcp.json |
| `parseLsps()` | pluginPath | `LspInfo[]` | 解析 .lsp.json |

### 4.2 解析实现细节

#### 4.2.1 parseSkills()

```typescript
/**
 * 解析 Skills
 * 目录结构: skills/skill-name/SKILL.md
 * 文件格式: Markdown with YAML frontmatter
 */
private async parseSkills(pluginPath: string): Promise<SkillInfo[]> {
  const skillsDir = path.join(pluginPath, 'skills');
  const skills: SkillInfo[] = [];

  try {
    // 检查 skills 目录是否存在
    await fs.access(skillsDir);

    // 读取所有子目录
    const entries = await fs.readdir(skillsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillPath = path.join(skillsDir, entry.name);
      const skillMarkdownPath = path.join(skillPath, 'SKILL.md');

      try {
        // 读取 SKILL.md
        const content = await fs.readFile(skillMarkdownPath, 'utf-8');
        const skill = this.parseSkillMarkdown(entry.name, content);
        if (skill) {
          skills.push(skill);
        }
      } catch {
        // 该 skill 没有 SKILL.md，跳过
        continue;
      }
    }
  } catch {
    // skills 目录不存在，返回空数组
  }

  return skills;
}

/**
 * 解析单个 Skill 的 Markdown 文件
 */
private parseSkillMarkdown(skillName: string, content: string): SkillInfo | null {
  // 提取 YAML frontmatter（在 --- 之间）
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return null;

  try {
    // 使用 yaml 解析（或手动解析简单字段）
    const frontmatter = this.parseSimpleYaml(frontmatterMatch[1]);

    return {
      name: frontmatter.name || skillName,
      description: frontatter.description || '',
      tools: frontmatter.tools,
      allowedTools: frontmatter.allowedTools || frontmatter['allowed-tools'],
      disableModelInvocation: frontmatter['disable-model-invocation'],
    };
  } catch {
    return null;
  }
}

/**
 * 简单的 YAML 解析器（仅解析我们需要的基本字段）
 * 避免引入 yaml 依赖
 */
private parseSimpleYaml(yamlString: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = yamlString.split('\n');

  for (const line of lines) {
    const match = line.match(/^(\w[-\w]*):\s*(.+)$/);
    if (match) {
      const [, key, value] = match;
      // 去除引号
      const cleanValue = value.replace(/^["']|["']$/g, '');
      result[key] = cleanValue;
    }
  }

  return result;
}
```

#### 4.2.2 parseAgents()

```typescript
/**
 * 解析 Agents
 * 目录结构: agents/agent-name.md
 */
private async parseAgents(pluginPath: string): Promise<AgentInfo[]> {
  const agentsDir = path.join(pluginPath, 'agents');
  const agents: AgentInfo[] = [];

  try {
    await fs.access(agentsDir);
    const entries = await fs.readdir(agentsDir);

    for (const entry of entries) {
      if (!entry.endsWith('.md')) continue;

      const agentPath = path.join(agentsDir, entry);
      try {
        const content = await fs.readFile(agentPath, 'utf-8');
        const agentName = entry.replace(/\.md$/, '');
        const agent = this.parseAgentMarkdown(agentName, content);
        if (agent) {
          agents.push(agent);
        }
      } catch {
        continue;
      }
    }
  } catch {
    // agents 目录不存在
  }

  return agents;
}

private parseAgentMarkdown(agentName: string, content: string): AgentInfo | null {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return null;

  try {
    const frontmatter = this.parseSimpleYaml(frontmatterMatch[1]);

    return {
      name: frontmatter.name || agentName,
      description: frontmatter.description || '',
      model: frontmatter.model,
    };
  } catch {
    return null;
  }
}
```

#### 4.2.3 parseCommands()

```typescript
/**
 * 解析 Commands
 * 目录结构: commands/command-name.md
 */
private async parseCommands(pluginPath: string): Promise<CommandInfo[]> {
  const commandsDir = path.join(pluginPath, 'commands');
  const commands: CommandInfo[] = [];

  try {
    await fs.access(commandsDir);
    const entries = await fs.readdir(commandsDir);

    for (const entry of entries) {
      if (!entry.endsWith('.md')) continue;

      const commandPath = path.join(commandsDir, entry);
      try {
        const content = await fs.readFile(commandPath, 'utf-8');
        const commandName = entry.replace(/\.md$/, '');
        const command = this.parseCommandMarkdown(commandName, content);
        if (command) {
          commands.push(command);
        }
      } catch {
        // 即使无法解析，也添加基础信息
        commands.push({
          name: entry.replace(/\.md$/, ''),
        });
      }
    }
  } catch {
    // commands 目录不存在
  }

  return commands;
}

private parseCommandMarkdown(commandName: string, content: string): CommandInfo {
  // 尝试从 frontmatter 获取描述
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const frontmatter = this.parseSimpleYaml(frontmatterMatch[1]);
    return {
      name: commandName,
      description: frontmatter.description,
    };
  }

  // 尝试从第一行获取描述
  const firstLine = content.split('\n').find(line => line.trim() && !line.startsWith('#'));
  return {
    name: commandName,
    description: firstLine?.trim().replace(/^#\s*/, ''),
  };
}
```

#### 4.2.4 parseHooks()

```typescript
/**
 * 解析 Hooks
 * 文件: hooks/hooks.json
 */
private async parseHooks(pluginPath: string): Promise<HookInfo[]> {
  const hooksJsonPath = path.join(pluginPath, 'hooks', 'hooks.json');
  const hooks: HookInfo[] = [];

  try {
    const content = await fs.readFile(hooksJsonPath, 'utf-8');
    const config = JSON.parse(content) as { hooks?: Record<string, any[]> };

    if (config.hooks) {
      for (const [event, hookConfigs] of Object.entries(config.hooks)) {
        hooks.push({
          event,
          hooks: Array.isArray(hookConfigs) ? hookConfigs : [hookConfigs],
        });
      }
    }
  } catch {
    // hooks.json 不存在或解析失败
  }

  return hooks;
}
```

#### 4.2.5 parseMcps()

```typescript
/**
 * 解析 MCP Servers
 * 文件: .mcp.json
 */
private async parseMcps(pluginPath: string): Promise<McpInfo[]> {
  const mcpJsonPath = path.join(pluginPath, '.mcp.json');
  const mcps: McpInfo[] = [];

  try {
    const content = await fs.readFile(mcpJsonPath, 'utf-8');
    const config = JSON.parse(content);

    // .mcp.json 格式可能是: { "mcpServers": { ... } }
    // 或者直接是服务配置对象
    const servers = config.mcpServers || config;

    for (const [name, serverConfig] of Object.entries(servers)) {
      if (typeof serverConfig === 'object') {
        mcps.push({
          name,
          command: (serverConfig as any).command,
          args: (serverConfig as any).args,
          env: (serverConfig as any).env,
          description: (serverConfig as any).description,
        });
      }
    }
  } catch {
    // .mcp.json 不存在或解析失败
  }

  return mcps;
}
```

#### 4.2.6 parseLsps()

```typescript
/**
 * 解析 LSP Servers
 * 文件: .lsp.json
 */
private async parseLsps(pluginPath: string): Promise<LspInfo[]> {
  const lspJsonPath = path.join(pluginPath, '.lsp.json');
  const lsps: LspInfo[] = [];

  try {
    const content = await fs.readFile(lspJsonPath, 'utf-8');
    const config = JSON.parse(content);

    for (const [language, lspConfig] of Object.entries(config)) {
      if (typeof lspConfig === 'object') {
        lsps.push({
          language,
          command: (lspConfig as any).command,
          args: (lspConfig as any).args,
          extensionToLanguage: (lspConfig as any).extensionToLanguage,
        });
      }
    }
  } catch {
    // .lsp.json 不存在或解析失败
  }

  return lsps;
}
```

### 4.3 修改 getInstalledPluginDetail()

```typescript
public async getInstalledPluginDetail(pluginName: string, marketplace: string): Promise<PluginDetailData> {
  const pluginPath = await this.getPluginPath(pluginName);
  if (!pluginPath) {
    throw new Error(`找不到插件 ${pluginName} 的安装目录`);
  }

  const configJson = await this.readPluginConfig(pluginPath);
  const readme = await this.readReadme(pluginPath);

  // 解析所有组件（改为异步）
  const [skills, agents, commands, hooks, mcps, lsps] = await Promise.all([
    this.parseSkills(pluginPath),
    this.parseAgents(pluginPath),
    this.parseCommands(pluginPath),
    this.parseHooks(pluginPath),
    this.parseMcps(pluginPath),
    this.parseLsps(pluginPath),
  ]);

  const repository = this.parseRepository(configJson);
  const dependencies = this.parseDependencies(configJson);

  return {
    name: configJson.name || pluginName,
    description: configJson.description || '',
    version: configJson.version || '0.0.0',
    author: configJson.author?.name || configJson.author,
    homepage: configJson.homepage,
    category: configJson.keywords?.[0],
    marketplace: 'installed',
    installed: true,
    readme,
    skills,
    agents,      // 新增
    commands,
    hooks,
    mcps,
    lsps,        // 新增
    repository,
    dependencies,
    license: configJson.license
  };
}
```

---

## 5. 前端 UI 设计

### 5.1 UI 组件结构

```
ComponentsSection
├── Section Header (插件内容)
└── Collapse
    ├── Skills Panel
    │   └── Skill Item (name, description, tools tags)
    ├── Agents Panel
    │   └── Agent Item (name, description, model tag)
    ├── Commands Panel
    │   └── Command Item (name, description)
    ├── Hooks Panel
    │   └── Hook Item (event name, matcher, hooks list)
    ├── MCPs Panel
    │   └── MCP Item (name, command, args)
    └── LSPs Panel
        └── LSP Item (language, command)
```

### 5.2 样式设计

#### 5.2.1 容器样式

```typescript
// 使用 VS Code 主题变量
const sectionStyle = {
  padding: 16,
  background: 'var(--vscode-editor-background)',
  borderRadius: 8,
  border: '1px solid var(--vscode-panel-border)',
};
```

#### 5.2.2 图标方案

| 组件 | Ant Design 图标 | 颜色 |
|------|----------------|------|
| Skills | `ThunderboltOutlined` | blue |
| Agents | `RobotOutlined` | cyan |
| Commands | `CodeOutlined` | orange |
| Hooks | `ControlOutlined` | purple |
| MCPs | `ApiOutlined` | green |
| LSPs | `BulbOutlined` | gold |

### 5.3 更新 ComponentsSection.tsx

需要添加 Agents 和 LSPs 的展示面板：

```typescript
// 添加新的图标导入
import {
  ThunderboltOutlined,
  RobotOutlined,      // 新增：Agents
  CodeOutlined,
  ControlOutlined,
  ApiOutlined,
  BulbOutlined        // 新增：LSPs
} from '@ant-design/icons';

// 添加计数
const hasAgents = plugin.agents?.length || 0;
const hasLsps = plugin.lsps?.length || 0;

// 添加 Agents Panel
{hasAgents > 0 && (
  <Panel
    header={<Space><RobotOutlined /> Agents ({hasAgents})</Space>}
    key="agents"
  >
    {/* Agents 列表 */}
  </Panel>
)}

// 添加 LSPs Panel
{hasLsps > 0 && (
  <Panel
    header={<Space><BulbOutlined /> LSP Servers ({hasLsps})</Space>}
    key="lsps"
  >
    {/* LSPs 列表 */}
  </Panel>
)}
```

---

## 6. 实现计划

### Phase 1: 后端解析逻辑
1. 实现 `parseSimpleYaml()` 辅助方法
2. 实现 `parseSkills()` - 解析 skills 目录
3. 实现 `parseAgents()` - 解析 agents 目录
4. 实现 `parseCommands()` - 解析 commands 目录
5. 实现 `parseHooks()` - 解析 hooks.json
6. 实现 `parseMcps()` - 解析 .mcp.json
7. 实现 `parseLsps()` - 解析 .lsp.json

### Phase 2: 类型定义更新
1. 更新 `types.ts` 中的接口定义
2. 添加缺失的字段（如 agents, lsps）

### Phase 3: 前端 UI 完善
1. 在 `ComponentsSection.tsx` 中添加 Agents 面板
2. 在 `ComponentsSection.tsx` 中添加 LSPs 面板
3. 优化各子项的展示样式

### Phase 4: 测试
1. 使用已安装的 superpowers 插件测试
2. 验证各类型组件都能正确解析和展示

---

## 7. 边缘情况处理

### 7.1 文件不存在
- 各组件目录可能不存在，需要 try-catch 处理
- 返回空数组而非抛出异常

### 7.2 解析失败
- YAML frontmatter 可能格式不正确
- 使用简单解析器，仅提取必要字段
- 解析失败时提供默认值

### 7.3 性能考虑
- 使用 `Promise.all` 并行读取各组件
- 对大文件可能需要限制读取大小

### 7.4 远程插件
- 远程插件（未安装）无法读取本地文件
- 返回空数组，可能从 marketplace API 获取元数据（未来优化）

---

## 8. 未来优化方向

1. **Marketplace API 增强**：让市场源返回组件元数据，无需下载即可查看
2. **组件搜索**：允许用户搜索特定 skill 或 command
3. **组件预览**：点击 skill/command 可查看完整内容
4. **使用统计**：显示各组件的使用频率（需本地统计支持）
5. **依赖关系**：显示组件之间的依赖关系

