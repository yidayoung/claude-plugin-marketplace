# Code Refactoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 重构 PluginDetailsService.ts (1286行) 和 SidebarApp.tsx (659行)，提取公共逻辑，提高可维护性并减少代码重复

**Architecture:** 采用模块化重构方案 - PluginDetailsService 拆分为 PluginPathResolver 和 ContentParser，SidebarApp 提取自定义 hooks 和纯函数

**Tech Stack:** TypeScript, React, VS Code Extension API, Jest

---

## 阶段 1: 提取公共工具函数

### Task 1: 创建共享工具目录结构

**Files:**
- Create: `src/shared/utils/fileUtils.ts`
- Create: `src/shared/utils/parseUtils.ts`
- Create: `src/shared/utils/__tests__/fileUtils.test.ts`

**Step 1: 创建 src/shared/utils 目录**

```bash
mkdir -p src/shared/utils/__tests__
```

**Step 2: 创建 fileUtils.ts - 文件读取工具**

```typescript
// src/shared/utils/fileUtils.ts
import * as fs from 'fs/promises';

/**
 * 安全读取文件，失败时返回 null
 */
export async function tryReadFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * 在多个路径中查找文件
 */
export async function findFileInPaths(
  fileName: string,
  searchPaths: string[]
): Promise<string | null> {
  for (const basePath of searchPaths) {
    const filePath = basePath + '/' + fileName;
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * 带默认值的访问函数
 */
export async function accessWithDefault<T>(
  fn: () => Promise<T>,
  defaultValue: T
): Promise<T> {
  try {
    return await fn();
  } catch {
    return defaultValue;
  }
}
```

**Step 3: 创建 parseUtils.ts - 解析工具**

```typescript
// src/shared/utils/parseUtils.ts
import * as path from 'path';

/**
 * 解析 Markdown frontmatter
 */
export function parseFrontmatter(content: string): Record<string, any> | null {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) return null;

  try {
    const yaml = require('yaml');
    return yaml.parse(frontmatterMatch[1]);
  } catch {
    return null;
  }
}

/**
 * 解析 GitHub 仓库地址
 */
export function parseGitHubRepo(url: string): { owner: string; repo: string } | null {
  // 简写格式: owner/repo
  const shortMatch = url.match(/^([^/]+)\/([^/]+?)(\.git)?$/);
  if (shortMatch && !url.includes('github.com') && !url.includes(':')) {
    return { owner: shortMatch[1], repo: shortMatch[2].replace(/\.git$/, '') };
  }

  // 完整 URL 格式
  const fullMatch = url.match(/github\.com[:/]([^/]+)\/(.+?)(\.git)?$/);
  if (fullMatch) {
    return { owner: fullMatch[1], repo: fullMatch[2].replace(/\.git$/, '') };
  }

  return null;
}

/**
 * 从 plugin.json 获取自定义路径配置
 */
export function getCustomPaths(
  config: string | string[] | undefined,
  basePath: string
): string[] {
  if (!config) return [];

  const configs = Array.isArray(config) ? config : [config];
  const paths: string[] = [];

  for (const cfg of configs) {
    if (typeof cfg === 'string') {
      const relativePath = cfg.startsWith('./') ? cfg.slice(2) : cfg;
      paths.push(path.join(basePath, relativePath));
    }
  }

  return paths;
}
```

**Step 4: 创建 fileUtils 单元测试**

```typescript
// src/shared/utils/__tests__/fileUtils.test.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { tryReadFile, findFileInPaths, accessWithDefault } from '../fileUtils';

// Mock fs module
jest.mock('fs/promises');

describe('fileUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('tryReadFile', () => {
    it('should return file content when file exists', async () => {
      (fs.readFile as jest.Mock).mockResolvedValueOnce('file content');
      const result = await tryReadFile('/path/to/file.txt');
      expect(result).toBe('file content');
    });

    it('should return null when file does not exist', async () => {
      (fs.readFile as jest.Mock).mockRejectedValueOnce(new Error('not found'));
      const result = await tryReadFile('/path/to/nonexistent.txt');
      expect(result).toBeNull();
    });
  });

  describe('findFileInPaths', () => {
    it('should return path when file found', async () => {
      (fs.access as jest.Mock).mockResolvedValueOnce(undefined);
      const result = await findFileInPaths('test.txt', ['/path1', '/path2']);
      expect(result).toBe('/path1/test.txt');
    });

    it('should return null when file not found in any path', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('not found'));
      const result = await findFileInPaths('test.txt', ['/path1', '/path2']);
      expect(result).toBeNull();
    });
  });

  describe('accessWithDefault', () => {
    it('should return function result on success', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await accessWithDefault(fn, 'default');
      expect(result).toBe('success');
    });

    it('should return default value on error', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('error'));
      const result = await accessWithDefault(fn, 'default');
      expect(result).toBe('default');
    });
  });
});
```

**Step 5: 运行测试验证通过**

```bash
npm test -- src/shared/utils/__tests__/fileUtils.test.ts
```

Expected: PASS (3/5 tests passing, may need fs mocking adjustment)

**Step 6: 提交**

```bash
git add src/shared/utils/
git commit -m "feat: add shared utility functions for file operations and parsing

- Add tryReadFile, findFileInPaths, accessWithDefault
- Add parseFrontmatter, parseGitHubRepo, getCustomPaths
- Add unit tests for fileUtils

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 2: 更新 PluginDetailsService 使用新的工具函数

**Files:**
- Modify: `src/pluginMarketplace/webview/services/PluginDetailsService.ts:1241-1253`
- Modify: `src/pluginMarketplace/webview/services/PluginDetailsService.ts:696-710`
- Modify: `src/pluginMarketplace/webview/services/PluginDetailsService.ts:808-828`

**Step 1: 替换 parseFrontmatter 为导入版本**

在文件顶部添加导入：
```typescript
// 在文件顶部 import 区域添加
import { parseFrontmatter, parseGitHubRepo, getCustomPaths } from '../../../shared/utils/parseUtils';
```

删除原有的 parseFrontmatter 方法 (行 1241-1253):
```typescript
// 删除这个私有方法
private parseFrontmatter(markdown: string): Record<string, any> | null {
  // ...
}
```

更新调用点 - 将 `this.parseFrontmatter` 改为 `parseFrontmatter`

**Step 2: 替换 parseGitHubRepo 为导入版本**

删除原有的 parseGitHubRepo 方法 (行 696-710)

更新调用点 `fetchPluginStarsAsync` 中:
```typescript
// 更新前
const repoInfo = this.parseGitHubRepo(market.source.repo);

// 更新后
const repoInfo = parseGitHubRepo(market.source.repo);
if (!repoInfo) {
  return null;
}
const stars = await this.fetchGitHubStars(repoInfo.owner, repoInfo.repo);
```

**Step 3: 替换 getCustomPaths 为导入版本**

删除原有的 getCustomPaths 方法 (行 808-828)

更新所有调用点：
```typescript
// 更新前
const customPaths = this.getCustomPaths(configJson?.skills, pluginPath);

// 更新后
const customPaths = getCustomPaths(configJson?.skills, pluginPath);
```

**Step 4: 运行测试确保无破坏性变更**

```bash
npm test
npm run compile
```

Expected: 所有测试通过，编译成功

**Step 5: 提交**

```bash
git add src/pluginMarketplace/webview/services/PluginDetailsService.ts
git commit -m "refactor: use shared utility functions in PluginDetailsService

- Replace parseFrontmatter with shared version
- Replace parseGitHubRepo with shared version
- Replace getCustomPaths with shared version
- Remove duplicate utility methods

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## 阶段 2: 创建 ContentParser - 统一解析模式

### Task 3: 创建 ContentParser 基础结构

**Files:**
- Create: `src/pluginMarketplace/webview/services/ContentParser.ts`
- Create: `src/pluginMarketplace/webview/services/__tests__/ContentParser.test.ts`

**Step 1: 创建 ContentParser.ts 文件**

```typescript
// src/pluginMarketplace/webview/services/ContentParser.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  SkillInfo,
  AgentInfo,
  CommandInfo,
  HookInfo,
  McpInfo,
  LspInfo,
  OutputStyleInfo
} from '../messages/types';
import { parseFrontmatter, getCustomPaths } from '../../../shared/utils/parseUtils';

/**
 * 目录解析配置
 */
interface DirectoryParseConfig<T> {
  // 默认目录路径
  defaultPath: string;
  // 从 plugin.json 获取的自定义路径
  customPaths?: string[];
  // 解析函数
  parser: (filePath: string, content: string) => T | null;
  // 文件匹配函数
  filePattern?: (name: string) => boolean;
  // 是否支持内联配置
  isInlineConfig?: (config: any) => boolean;
  // 配置解析函数 (用于 JSON 配置)
  configParser?: (config: any, filePath?: string) => T[];
}

/**
 * 内容解析器
 * 统一解析插件的各种内容类型，消除重复的解析模式
 */
export class ContentParser {
  /**
   * 统一的目录解析方法
   * 消除 parseMcps/parseLsps/parseHooks 中的重复代码
   */
  async parseDirectory<T>(
    pluginPath: string,
    config: DirectoryParseConfig<T>
  ): Promise<T[]> {
    const results: T[] = [];
    const { defaultPath, customPaths, parser, filePattern, isInlineConfig, configParser } = config;

    // 处理自定义路径
    if (customPaths && customPaths.length > 0) {
      for (const customPath of customPaths) {
        try {
          await fs.access(customPath);
          // 如果是目录，读取并解析
          const stat = await fs.stat(customPath);
          if (stat.isDirectory()) {
            const entries = await fs.readdir(customPath, { withFileTypes: true });
            for (const entry of entries) {
              if (filePattern && !filePattern(entry.name)) continue;
              const filePath = path.join(customPath, entry.name);
              try {
                const content = await fs.readFile(filePath, 'utf-8');
                const parsed = parser(filePath, content);
                if (parsed) results.push(parsed);
              } catch {
                continue;
              }
            }
          } else {
            // 是文件
            const content = await fs.readFile(customPath, 'utf-8');
            const parsed = parser(customPath, content);
            if (parsed && configParser) {
              const config = JSON.parse(content);
              results.push(...configParser(config, customPath));
            } else if (parsed) {
              results.push(parsed);
            }
          }
        } catch {
          continue;
        }
      }
    }

    // 如果从自定义路径获取到结果，直接返回
    if (results.length > 0) {
      return results;
    }

    // 尝试默认路径
    const defaultFullPath = path.join(pluginPath, defaultPath);
    try {
      const stat = await fs.stat(defaultFullPath);
      if (stat.isDirectory()) {
        const entries = await fs.readdir(defaultFullPath, { withFileTypes: true });
        for (const entry of entries) {
          if (filePattern && !filePattern(entry.name)) continue;
          const filePath = path.join(defaultFullPath, entry.name);
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            const parsed = parser(filePath, content);
            if (parsed) results.push(parsed);
          } catch {
            continue;
          }
        }
      } else {
        const content = await fs.readFile(defaultFullPath, 'utf-8');
        if (configParser) {
          const config = JSON.parse(content);
          results.push(...configParser(config, defaultFullPath));
        }
      }
    } catch {
      // 默认路径不存在
    }

    return results;
  }

  /**
   * 解析 Skills
   */
  async parseSkills(pluginPath: string, configJson?: any): Promise<SkillInfo[]> {
    const skills: SkillInfo[] = [];

    // 获取自定义路径
    const customPaths = getCustomPaths(configJson?.skills, pluginPath);

    // 处理自定义路径
    for (const skillPath of customPaths) {
      const parsed = await this.parseSkillPath(skillPath);
      for (const skill of parsed) {
        if (!skills.find(s => s.name === skill.name)) {
          skills.push(skill);
        }
      }
    }

    // 如果没有从自定义路径获取到 skills，尝试默认路径
    if (skills.length === 0) {
      const defaultSkillsPath = path.join(pluginPath, 'skills');
      const parsedFromDefault = await this.parseSkillPath(defaultSkillsPath);
      for (const skill of parsedFromDefault) {
        if (!skills.find(s => s.name === skill.name)) {
          skills.push(skill);
        }
      }
    }

    return skills;
  }

  /**
   * 解析单个 skill 路径
   */
  private async parseSkillPath(skillPath: string): Promise<SkillInfo[]> {
    const skills: SkillInfo[] = [];

    try {
      await fs.access(skillPath);

      // 检查是否是 skill 目录本身
      const ownSkillMdPath = path.join(skillPath, 'SKILL.md');
      try {
        const content = await fs.readFile(ownSkillMdPath, 'utf-8');
        const skillName = path.basename(skillPath);
        const skill = this.parseSkillMarkdown(skillName, content);
        if (skill) {
          skill.filePath = ownSkillMdPath;
          skills.push(skill);
          return skills;
        }
      } catch {
        // 不是 skill 目录，继续作为集合目录处理
      }

      // 作为 skills 集合目录处理
      const entries = await fs.readdir(skillPath, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const subSkillPath = path.join(skillPath, entry.name);
        const subSkillMdPath = path.join(subSkillPath, 'SKILL.md');

        try {
          const content = await fs.readFile(subSkillMdPath, 'utf-8');
          const skill = this.parseSkillMarkdown(entry.name, content);
          if (skill) {
            skill.filePath = subSkillMdPath;
            skills.push(skill);
          }
        } catch {
          continue;
        }
      }
    } catch {
      // 路径不存在
    }

    return skills;
  }

  /**
   * 解析单个 Skill 的 Markdown 文件
   */
  private parseSkillMarkdown(skillName: string, content: string): SkillInfo | null {
    const frontmatter = parseFrontmatter(content);
    if (!frontmatter) return null;

    return {
      name: frontmatter.name || skillName,
      description: frontmatter.description || '',
      tools: frontmatter.tools,
      allowedTools: frontmatter.allowedTools || frontmatter['allowed-tools'],
      disableModelInvocation: frontmatter['disable-model-invocation'] === true,
    };
  }

  // 其他解析方法 (parseAgents, parseCommands, etc.) 将在后续任务中添加
}
```

**Step 2: 创建基础测试文件**

```typescript
// src/pluginMarketplace/webview/services/__tests__/ContentParser.test.ts
import { ContentParser } from '../ContentParser';
import * as fs from 'fs/promises';

jest.mock('fs/promises');

describe('ContentParser', () => {
  let parser: ContentParser;

  beforeEach(() => {
    parser = new ContentParser();
    jest.clearAllMocks();
  });

  describe('parseSkillMarkdown', () => {
    it('should parse skill with frontmatter', () => {
      const content = `---
name: test-skill
description: Test description
tools:
  - Tool1
  - Tool2
---
Content here`;

      // 使用私有方法测试
      const result = (parser as any).parseSkillMarkdown('test', content);
      expect(result).toEqual({
        name: 'test-skill',
        description: 'Test description',
        tools: ['Tool1', 'Tool2'],
        allowedTools: undefined,
        disableModelInvocation: false
      });
    });

    it('should return null for content without frontmatter', () => {
      const content = 'Just plain content';
      const result = (parser as any).parseSkillMarkdown('test', content);
      expect(result).toBeNull();
    });
  });

  describe('parseSkills', () => {
    it('should return empty array when no skills found', async () => {
      (fs.readdir as jest.Mock).mockRejectedValue(new Error('not found'));
      const result = await parser.parseSkills('/fake/path');
      expect(result).toEqual([]);
    });
  });
});
```

**Step 3: 运行测试**

```bash
npm test -- ContentParser.test.ts
```

Expected: PASS

**Step 4: 提交**

```bash
git add src/pluginMarketplace/webview/services/ContentParser.ts
git add src/pluginMarketplace/webview/services/__tests__/ContentParser.test.ts
git commit -m "feat: add ContentParser with unified parsing pattern

- Add DirectoryParseConfig interface for consistent parsing
- Implement parseSkills method
- Add unit tests for skill parsing

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 4: 添加 ContentParser 的其他解析方法

**Files:**
- Modify: `src/pluginMarketplace/webview/services/ContentParser.ts`

**Step 1: 添加 Agents 解析方法**

在 ContentParser 类中添加：

```typescript
/**
 * 解析 Agents
 */
async parseAgents(pluginPath: string, configJson?: any): Promise<AgentInfo[]> {
  const agents: AgentInfo[] = [];
  const customPaths = getCustomPaths(configJson?.agents, pluginPath);
  const searchDirs: string[] = [...customPaths, path.join(pluginPath, 'agents')];

  for (const agentsDir of searchDirs) {
    try {
      await fs.access(agentsDir);
      const entries = await fs.readdir(agentsDir);

      for (const entry of entries) {
        if (!entry.endsWith('.md') || entry.startsWith('.')) continue;

        const agentPath = path.join(agentsDir, entry);
        try {
          const content = await fs.readFile(agentPath, 'utf-8');
          const agentName = entry.replace(/\.md$/, '');
          const agent = this.parseAgentMarkdown(agentName, content);
          if (agent && !agents.find(a => a.name === agent.name)) {
            agent.filePath = agentPath;
            agents.push(agent);
          }
        } catch {
          continue;
        }
      }
    } catch {
      continue;
    }
  }

  return agents;
}

/**
 * 解析单个 Agent 的 Markdown 文件
 */
private parseAgentMarkdown(agentName: string, content: string): AgentInfo | null {
  const frontmatter = parseFrontmatter(content);
  if (!frontmatter) {
    return { name: agentName, description: '' };
  }

  return {
    name: frontmatter.name || agentName,
    description: frontmatter.description || '',
    model: frontmatter.model,
  };
}
```

**Step 2: 添加 Commands 解析方法**

```typescript
/**
 * 解析 Commands
 */
async parseCommands(pluginPath: string, configJson?: any): Promise<CommandInfo[]> {
  const commands: CommandInfo[] = [];
  const customPaths = getCustomPaths(configJson?.commands, pluginPath);
  const searchDirs: string[] = [...customPaths, path.join(pluginPath, 'commands')];

  for (const commandsDir of searchDirs) {
    try {
      await fs.access(commandsDir);
      const entries = await fs.readdir(commandsDir);

      for (const entry of entries) {
        if (!entry.endsWith('.md') || entry.startsWith('.')) continue;

        const commandPath = path.join(commandsDir, entry);
        try {
          const content = await fs.readFile(commandPath, 'utf-8');
          const commandName = entry.replace(/\.md$/, '');
          const command = this.parseCommandMarkdown(commandName, content);
          if (!commands.find(c => c.name === command.name)) {
            command.filePath = commandPath;
            commands.push(command);
          }
        } catch {
          const name = entry.replace(/\.md$/, '');
          if (!commands.find(c => c.name === name)) {
            commands.push({ name, filePath: commandPath });
          }
        }
      }
    } catch {
      continue;
    }
  }

  return commands;
}

/**
 * 解析单个 Command 的 Markdown 文件
 */
private parseCommandMarkdown(commandName: string, content: string): CommandInfo {
  const frontmatter = parseFrontmatter(content);
  if (frontmatter) {
    return {
      name: commandName,
      description: frontmatter.description,
    };
  }

  const firstLine = content.split('\n').find(line => line.trim() && !line.startsWith('#'));
  return {
    name: commandName,
    description: firstLine?.trim().replace(/^#\s*/, ''),
  };
}
```

**Step 3: 使用统一模式添加 Hooks/MCPs/LSPs 解析**

```typescript
/**
 * 解析 Hooks (使用统一模式)
 */
async parseHooks(pluginPath: string, configJson?: any): Promise<HookInfo[]> {
  const hooks: HookInfo[] = [];

  // 处理内联配置
  if (configJson?.hooks && typeof configJson.hooks === 'object') {
    hooks.push(...this.parseHooksConfig(configJson.hooks));
    return hooks;
  }

  // 使用统一解析模式
  const customPaths = getCustomPaths(configJson?.hooks, pluginPath);
  return this.parseDirectory<HookInfo>(pluginPath, {
    defaultPath: 'hooks/hooks.json',
    customPaths,
    parser: (filePath, content) => {
      const config = JSON.parse(content);
      const parsed = this.parseHooksConfig(config.hooks, filePath);
      return parsed.length > 0 ? parsed[0] : null;
    },
    configParser: (config, filePath) => this.parseHooksConfig(config.hooks || config, filePath)
  });
}

private parseHooksConfig(hooksConfig: Record<string, any[]>, filePath?: string): HookInfo[] {
  const hooks: HookInfo[] = [];
  for (const [event, hookConfigs] of Object.entries(hooksConfig)) {
    const configs = Array.isArray(hookConfigs) ? hookConfigs : [hookConfigs];
    const hookInfo: HookInfo = {
      event,
      hooks: configs.map((c: any) => ({
        type: c.type,
        matcher: c.matcher,
        command: c.command,
        skill: c.skill,
        async: c.async,
      })),
    };
    if (filePath) {
      hookInfo.filePath = filePath;
    }
    hooks.push(hookInfo);
  }
  return hooks;
}

/**
 * 解析 MCPs (使用统一模式)
 */
async parseMcps(pluginPath: string, configJson?: any): Promise<McpInfo[]> {
  const customPaths = getCustomPaths(configJson?.mcpServers, pluginPath);

  // 处理内联配置
  if (configJson?.mcpServers && typeof configJson.mcpServers === 'object') {
    return this.parseMcpConfig(configJson.mcpServers);
  }

  return this.parseDirectory<McpInfo>(pluginPath, {
    defaultPath: '.mcp.json',
    customPaths,
    parser: () => null, // 由 configParser 处理
    configParser: (config, filePath) => this.parseMcpConfig(config.mcpServers || config, filePath)
  });
}

private parseMcpConfig(config: any, filePath?: string): McpInfo[] {
  const mcps: McpInfo[] = [];
  const servers = config.mcpServers || config;

  if (typeof servers === 'object') {
    for (const [name, serverConfig] of Object.entries(servers)) {
      if (typeof serverConfig === 'object' && serverConfig !== null) {
        const cfg = serverConfig as any;
        const mcpInfo: McpInfo = {
          name,
          command: cfg.command,
          args: cfg.args,
          env: cfg.env,
          description: cfg.description || cfg.url || cfg.type,
          type: cfg.type,
          url: cfg.url,
        };
        if (filePath) {
          mcpInfo.filePath = filePath;
        }
        mcps.push(mcpInfo);
      }
    }
  }
  return mcps;
}

/**
 * 解析 LSPs (使用统一模式)
 */
async parseLsps(pluginPath: string, configJson?: any): Promise<LspInfo[]> {
  const customPaths = getCustomPaths(configJson?.lspServers, pluginPath);

  // 处理内联配置
  if (configJson?.lspServers && typeof configJson.lspServers === 'object') {
    return this.parseLspConfig(configJson.lspServers);
  }

  return this.parseDirectory<LspInfo>(pluginPath, {
    defaultPath: '.lsp.json',
    customPaths,
    parser: () => null,
    configParser: (config, filePath) => this.parseLspConfig(config, filePath)
  });
}

private parseLspConfig(config: any, filePath?: string): LspInfo[] {
  const lsps: LspInfo[] = [];
  if (typeof config === 'object') {
    for (const [language, lspConfig] of Object.entries(config)) {
      if (typeof lspConfig === 'object' && lspConfig !== null) {
        const lspInfo: LspInfo = {
          language,
          command: (lspConfig as any).command || language,
          args: (lspConfig as any).args,
          extensionToLanguage: (lspConfig as any).extensionToLanguage,
        };
        if (filePath) {
          lspInfo.filePath = filePath;
        }
        lsps.push(lspInfo);
      }
    }
  }
  return lsps;
}

/**
 * 解析 Output Styles
 */
async parseOutputStyles(pluginPath: string, configJson?: any): Promise<OutputStyleInfo[]> {
  const outputStyles: OutputStyleInfo[] = [];
  const customPaths = getCustomPaths(configJson?.outputStyles, pluginPath);
  const searchPaths: string[] = [...customPaths, path.join(pluginPath, 'outputStyles')];

  for (const styleBasePath of searchPaths) {
    try {
      await fs.access(styleBasePath);
      const entries = await fs.readdir(styleBasePath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;

        const stylePath = path.join(styleBasePath, entry.name);
        try {
          const stat = await fs.stat(stylePath);
          outputStyles.push({
            name: entry.name,
            type: stat.isDirectory() ? 'directory' : 'file',
            filePath: stylePath
          });
        } catch {
          outputStyles.push({
            name: entry.name,
            type: 'directory',
            filePath: stylePath
          });
        }
      }
    } catch {
      continue;
    }
  }

  return outputStyles;
}
```

**Step 4: 运行测试**

```bash
npm test -- ContentParser.test.ts
npm run compile
```

Expected: PASS

**Step 5: 提交**

```bash
git add src/pluginMarketplace/webview/services/ContentParser.ts
git commit -m "feat: add remaining ContentParser methods

- Add parseAgents, parseCommands methods
- Add parseHooks, parseMcps, parseLsps using unified pattern
- Add parseOutputStyles method
- Eliminates code duplication in parsing logic

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 5: 创建 PluginPathResolver

**Files:**
- Create: `src/pluginMarketplace/webview/services/PluginPathResolver.ts`
- Create: `src/pluginMarketplace/webview/services/__tests__/PluginPathResolver.test.ts`

**Step 1: 创建 PluginPathResolver.ts**

```typescript
// src/pluginMarketplace/webview/services/PluginPathResolver.ts
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * 插件路径解析器
 * 负责在文件系统中查找插件路径
 */
export class PluginPathResolver {
  constructor(private context: vscode.ExtensionContext) {}

  /**
   * 查找插件安装路径
   * 在所有市场目录中搜索插件
   */
  async findPluginPath(pluginName: string): Promise<string | null> {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (!homeDir) return null;

    const cacheBasePath = path.join(homeDir, '.claude', 'plugins', 'cache');

    // 搜索路径列表：缓存目录和市场目录
    const searchPaths = [
      cacheBasePath,
      path.join(homeDir, '.claude', 'plugins', 'marketplaces'),
    ];

    for (const basePath of searchPaths) {
      const result = await this.searchInBasePath(basePath, pluginName);
      if (result) return result;
    }

    // 尝试项目目录
    return this.searchInProjectDir(pluginName);
  }

  /**
   * 获取插件的本地市场源路径
   */
  async getLocalMarketPath(pluginName: string, marketplace: string): Promise<string | null> {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (!homeDir) return null;

    const marketplacePath = path.join(homeDir, '.claude', 'plugins', 'marketplaces', marketplace);
    const marketplaceJsonPath = path.join(marketplacePath, '.claude-plugin', 'marketplace.json');

    try {
      const marketplaceContent = await fs.readFile(marketplaceJsonPath, 'utf-8');
      const marketplaceConfig = JSON.parse(marketplaceContent);

      const pluginConfig = marketplaceConfig.plugins?.find((p: any) => p.name === pluginName);
      if (!pluginConfig) return null;

      const source = pluginConfig.source;

      // 处理相对路径 source
      if (typeof source === 'string' && source.startsWith('./')) {
        const relativePath = source.slice(2);
        const fullPath = path.join(marketplacePath, relativePath);

        try {
          await fs.access(fullPath);
          return fullPath;
        } catch {
          return null;
        }
      }

      // 远程 Git 仓库
      if (typeof source === 'object') {
        return null;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * 在基础路径下搜索插件
   */
  private async searchInBasePath(basePath: string, pluginName: string): Promise<string | null> {
    try {
      const marketplaces = await fs.readdir(basePath, { withFileTypes: true });

      for (const market of marketplaces) {
        if (!market.isDirectory()) continue;

        const marketPath = path.join(basePath, market.name);

        const result = await this.searchInMarketPath(marketPath, pluginName);
        if (result) return result;
      }
    } catch {
      // 忽略错误
    }

    return null;
  }

  /**
   * 在单个市场目录下搜索插件
   */
  private async searchInMarketPath(marketPath: string, pluginName: string): Promise<string | null> {
    try {
      const items = await fs.readdir(marketPath, { withFileTypes: true });

      for (const item of items) {
        if (!item.isDirectory()) continue;

        // 检查是否是目标插件目录（可能带版本号后缀）
        if (item.name === pluginName || item.name.startsWith(pluginName + '@')) {
          const pluginDirPath = path.join(marketPath, item.name);

          // 验证这是有效的插件目录
          if (await this.isValidPluginDir(pluginDirPath)) {
            return pluginDirPath;
          }

          // 尝试查找版本子目录
          const subResult = await this.searchInVersionSubdir(pluginDirPath);
          if (subResult) return subResult;
        }
      }
    } catch {
      // 忽略错误
    }

    return null;
  }

  /**
   * 验证是否是有效的插件目录
   */
  private async isValidPluginDir(dirPath: string): Promise<boolean> {
    const configPaths = [
      path.join(dirPath, 'package.json'),
      path.join(dirPath, 'plugin.json'),
      path.join(dirPath, '.claude-plugin', 'plugin.json'),
    ];

    for (const configPath of configPaths) {
      try {
        await fs.access(configPath);
        return true;
      } catch {
        continue;
      }
    }

    return false;
  }

  /**
   * 在版本子目录中搜索
   */
  private async searchInVersionSubdir(pluginDirPath: string): Promise<string | null> {
    try {
      const subItems = await fs.readdir(pluginDirPath, { withFileTypes: true });
      for (const subItem of subItems) {
        if (!subItem.isDirectory()) continue;

        const subDirPath = path.join(pluginDirPath, subItem.name);

        const subConfigPaths = [
          path.join(subDirPath, 'package.json'),
          path.join(subDirPath, 'plugin.json'),
          path.join(subDirPath, '.claude-plugin', 'plugin.json'),
          path.join(subDirPath, 'README.md'),
          path.join(subDirPath, 'readme.md'),
        ];

        for (const subConfigPath of subConfigPaths) {
          try {
            await fs.access(subConfigPath);
            return subDirPath;
          } catch {
            continue;
          }
        }
      }

      // 如果插件目录本身有 README.md
      for (const name of ['README.md', 'readme.md', 'Readme.md']) {
        try {
          await fs.access(path.join(pluginDirPath, name));
          return pluginDirPath;
        } catch {
          continue;
        }
      }
    } catch {
      // 忽略错误
    }

    return null;
  }

  /**
   * 在项目目录中搜索插件
   */
  private async searchInProjectDir(pluginName: string): Promise<string | null> {
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspacePath) return null;

    const projectPluginPath = path.join(workspacePath, '.claude', 'plugins', pluginName);
    try {
      await fs.access(projectPluginPath);
      return projectPluginPath;
    } catch {
      return null;
    }
  }
}
```

**Step 2: 创建测试文件**

```typescript
// src/pluginMarketplace/webview/services/__tests__/PluginPathResolver.test.ts
import { PluginPathResolver } from '../PluginPathResolver';
import * as vscode from 'vscode';
import * as fs from 'fs/promises';

jest.mock('vscode');
jest.mock('fs/promises');

describe('PluginPathResolver', () => {
  let resolver: PluginPathResolver;
  let mockContext: any;

  beforeEach(() => {
    mockContext = {};
    resolver = new PluginPathResolver(mockContext);
    jest.clearAllMocks();
  });

  describe('findPluginPath', () => {
    it('should return null when HOME is not defined', async () => {
      const originalHome = process.env.HOME;
      delete process.env.HOME;
      delete process.env.USERPROFILE;

      const result = await resolver.findPluginPath('test-plugin');

      process.env.HOME = originalHome;
      expect(result).toBeNull();
    });
  });

  describe('isValidPluginDir', () => {
    it('should return true when package.json exists', async () => {
      (fs.access as jest.Mock).mockResolvedValueOnce(undefined);
      const result = await (resolver as any).isValidPluginDir('/path/to/plugin');
      expect(result).toBe(true);
    });

    it('should return false when no config file exists', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('not found'));
      const result = await (resolver as any).isValidPluginDir('/path/to/plugin');
      expect(result).toBe(false);
    });
  });
});
```

**Step 3: 运行测试**

```bash
npm test -- PluginPathResolver.test.ts
```

Expected: PASS

**Step 4: 提交**

```bash
git add src/pluginMarketplace/webview/services/PluginPathResolver.ts
git add src/pluginMarketplace/webview/services/__tests__/PluginPathResolver.test.ts
git commit -m "feat: add PluginPathResolver for path resolution

- Extract path finding logic from PluginDetailsService
- Support cache, marketplace, and project directories
- Add unit tests

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 6: 重构 PluginDetailsService 使用新模块

**Files:**
- Modify: `src/pluginMarketplace/webview/services/PluginDetailsService.ts`

**Step 1: 更新导入和构造函数**

```typescript
// 在文件顶部添加导入
import { PluginPathResolver } from './PluginPathResolver';
import { ContentParser } from './ContentParser';
import { tryReadFile } from '../../../shared/utils/fileUtils';
import { parseFrontmatter, parseGitHubRepo, getCustomPaths, parseRepository as parseRepositoryUtil } from '../../../shared/utils/parseUtils';

export class PluginDetailsService {
  private cache = new Map<string, DetailCacheEntry>();
  private readonly CACHE_TTL = 5 * 60 * 1000;
  private pathResolver: PluginPathResolver;
  private contentParser: ContentParser;

  constructor(private context: vscode.ExtensionContext) {
    this.pathResolver = new PluginPathResolver(context);
    this.contentParser = new ContentParser();
  }
```

**Step 2: 简化 getInstalledPluginDetail 方法**

替换现有实现 (行 185-262)：

```typescript
public async getInstalledPluginDetail(pluginName: string, marketplace: string): Promise<PluginDetailData> {
  // 使用路径解析器查找插件
  const pluginPath = await this.pathResolver.findPluginPath(pluginName);
  if (!pluginPath) {
    console.log(`[PluginDetailsService] Plugin ${pluginName} not found locally, fetching from remote`);
    return this.getRemotePluginDetail(pluginName, marketplace);
  }

  // 读取配置文件
  const configJson = await this.readPluginConfig(pluginPath);

  // 读取 README
  const readme = await this.readReadme(pluginPath);

  // 使用内容解析器解析插件内容
  const [skills, agents, commands, hooks, mcps, lsps, outputStyles] = await Promise.all([
    this.contentParser.parseSkills(pluginPath, configJson),
    this.contentParser.parseAgents(pluginPath, configJson),
    this.contentParser.parseCommands(pluginPath, configJson),
    this.contentParser.parseHooks(pluginPath, configJson),
    this.contentParser.parseMcps(pluginPath, configJson),
    this.contentParser.parseLsps(pluginPath, configJson),
    this.contentParser.parseOutputStyles(pluginPath, configJson),
  ]);

  // 如果没有内容，尝试从远程获取
  if (!readme && skills.length === 0 && agents.length === 0 && commands.length === 0) {
    console.log(`[PluginDetailsService] Plugin ${pluginName} has no local content, fetching from remote`);
    return this.getRemotePluginDetail(pluginName, marketplace);
  }

  // 获取安装状态
  const { FileParser } = await import('./FileParser');
  const parser = new FileParser();
  const [installedPlugins, enabledMap] = await Promise.all([
    parser.parseInstalledPlugins(),
    parser.parseEnabledPlugins()
  ]);

  const installedInfo = installedPlugins.find(p => p.name === pluginName && p.marketplace === marketplace);
  const key = `${pluginName}@${marketplace}`;
  const isEnabled = enabledMap.get(key);
  const actualMarketplace = installedInfo?.marketplace || marketplace;

  const repository = configJson ? parseRepositoryUtil(configJson) : undefined;
  const dependencies = configJson ? this.parseDependencies(configJson) : [];

  return {
    name: configJson?.name || pluginName,
    description: configJson?.description || '',
    version: configJson?.version || '0.0.0',
    author: configJson?.author?.name || configJson?.author,
    homepage: configJson?.homepage,
    category: configJson?.keywords?.[0],
    marketplace: actualMarketplace,
    installed: true,
    enabled: isEnabled ?? true,
    scope: installedInfo?.scope,
    readme,
    skills,
    agents,
    hooks,
    mcps,
    commands,
    lsps,
    outputStyles,
    repository,
    dependencies,
    license: configJson?.license,
    localPath: pluginPath
  };
}
```

**Step 3: 简化 getRemotePluginDetail 方法**

更新方法使用新的解析器 (主要修改行 348-394)：

```typescript
// 使用路径解析器获取本地市场路径
const localMarketPath = await this.pathResolver.getLocalMarketPath(pluginName, marketplace);

if (localMarketPath) {
  try {
    // 读取配置文件
    try {
      const configPath = path.join(localMarketPath, '.claude-plugin', 'plugin.json');
      const configContent = await fs.readFile(configPath, 'utf-8');
      configJson = JSON.parse(configContent);
      license = configJson?.license;
      if (configJson?.repository) {
        repository = parseRepositoryUtil(configJson);
      }
    } catch {
      // 配置文件不存在，继续
    }

    // 读取 README
    readme = await this.readReadme(localMarketPath);

    // 使用内容解析器
    [skills, agents, commands, hooks, mcps, lsps, outputStyles] = await Promise.all([
      this.contentParser.parseSkills(localMarketPath, configJson),
      this.contentParser.parseAgents(localMarketPath, configJson),
      this.contentParser.parseCommands(localMarketPath, configJson),
      this.contentParser.parseHooks(localMarketPath, configJson),
      this.contentParser.parseMcps(localMarketPath, configJson),
      this.contentParser.parseLsps(localMarketPath, configJson),
      this.contentParser.parseOutputStyles(localMarketPath, configJson),
    ]);
  } catch (error) {
    console.error(`[PluginDetailsService] Local read failed:`, error);
  }
}
```

**Step 4: 删除已迁移的方法**

删除以下私有方法（已被移到其他模块）：
- `getPluginPath` (行 479-599) - 已移到 PluginPathResolver
- `parseSkills` (行 721-749) - 已移到 ContentParser
- `parseSkillPath` (行 757-803) - 已移到 ContentParser
- `parseAgents` (行 851-895) - 已移到 ContentParser
- `parseAgentMarkdown` (行 900-912) - 已移到 ContentParser
- `parseCommands` (行 919-960) - 已移到 ContentParser
- `parseCommandMarkdown` (行 965-981) - 已移到 ContentParser
- `parseHooks` (行 988-1027) - 已移到 ContentParser
- `parseHooksConfig` (行 1032-1052) - 已移到 ContentParser
- `parseMcps` (行 1059-1091) - 已移到 ContentParser
- `parseMcpConfig` (行 1096-1122) - 已移到 ContentParser
- `parseLsps` (行 1129-1161) - 已移到 ContentParser
- `parseLspConfig` (行 1166-1185) - 已移到 ContentParser
- `parseOutputStyles` (行 1192-1235) - 已移到 ContentParser
- `parseFrontmatter` (行 1241-1253) - 已移到 shared/utils
- `parseGitHubRepo` (行 696-710) - 已移到 shared/utils
- `getCustomPaths` (行 808-828) - 已移到 shared/utils

**Step 5: 简化 readReadme 使用 tryReadFile**

```typescript
public async readReadme(pluginPath: string): Promise<string> {
  const readmeLocations = [pluginPath, path.join(pluginPath, '.claude-plugin')];
  const readmeNames = ['README.md', 'readme.md', 'Readme.md'];

  for (const baseLocation of readmeLocations) {
    for (const name of readmeNames) {
      const content = await tryReadFile(path.join(baseLocation, name));
      if (content) return content;
    }
  }
  return '';
}
```

**Step 6: 简化 readPluginConfig 使用 tryReadFile**

```typescript
private async readPluginConfig(pluginPath: string): Promise<any> {
  const configPaths = [
    path.join(pluginPath, 'package.json'),
    path.join(pluginPath, 'plugin.json'),
    path.join(pluginPath, '.claude-plugin', 'plugin.json'),
  ];

  for (const configPath of configPaths) {
    const content = await tryReadFile(configPath);
    if (content) {
      try {
        return JSON.parse(content);
      } catch {
        continue;
      }
    }
  }
  return undefined;
}
```

**Step 7: 更新 parseRepository 使用共享版本**

```typescript
public parseRepository(packageJson: any): RepositoryInfo | undefined {
  return parseRepositoryUtil(packageJson);
}
```

**Step 8: 运行测试和编译**

```bash
npm test
npm run compile
```

Expected: 所有测试通过，编译成功

**Step 9: 提交**

```bash
git add src/pluginMarketplace/webview/services/PluginDetailsService.ts
git commit -m "refactor: simplify PluginDetailsService using new modules

- Use PluginPathResolver for path resolution
- Use ContentParser for all content parsing
- Use shared utility functions
- Remove ~800 lines of duplicate code
- File size: 1286 -> ~400 lines (-69%)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## 阶段 3: 重构 SidebarApp.tsx

### Task 7: 创建 React hooks 目录和基础 hooks

**Files:**
- Create: `webview/src/hooks/usePluginData.ts`
- Create: `webview/src/hooks/usePluginFilter.ts`
- Create: `webview/src/hooks/useHoverState.ts`
- Create: `webview/src/hooks/index.ts`

**Step 1: 创建 hooks 目录**

```bash
mkdir -p webview/src/hooks
```

**Step 2: 创建 usePluginData.ts**

```typescript
// webview/src/hooks/usePluginData.ts
import { useState, useEffect, useCallback } from 'react';

interface PluginData {
  name: string;
  description: string;
  version: string;
  author?: string;
  homepage?: string;
  category?: string;
  marketplace: string;
  installed: boolean;
  enabled?: boolean;
  scope?: 'user' | 'project' | 'local';
  updateAvailable?: boolean;
}

interface MarketplaceData {
  name: string;
  pluginCount?: number;
}

interface AppState {
  plugins: PluginData[];
  marketplaces: MarketplaceData[];
  loading: boolean;
  error: string | null;
  filter: {
    keyword: string;
    status: string;
    marketplace: string;
  };
}

declare const vscode: {
  postMessage: (message: any) => void;
  getState: () => any;
  setState: (state: any) => void;
};

export function usePluginData() {
  const [state, setState] = useState<AppState>({
    plugins: [],
    marketplaces: [],
    loading: true,
    error: null,
    filter: {
      keyword: '',
      status: 'all',
      marketplace: 'all'
    }
  });

  const loadPlugins = useCallback(() => {
    vscode.postMessage({
      type: 'getPlugins',
      payload: {}
    });
  }, []);

  useEffect(() => {
    loadPlugins();
  }, [loadPlugins]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.type) {
        case 'plugins':
          setState(prev => ({
            ...prev,
            plugins: message.payload.plugins,
            marketplaces: message.payload.marketplaces.map((name: string) => ({
              name,
              pluginCount: message.payload.plugins.filter((p: PluginData) => p.marketplace === name).length
            })),
            loading: false
          }));
          break;

        case 'installSuccess':
        case 'uninstallSuccess':
        case 'enableSuccess':
        case 'disableSuccess':
          loadPlugins();
          break;

        case 'error':
          setState(prev => ({
            ...prev,
            error: message.payload.message,
            loading: false
          }));
          break;

        case 'refresh':
          loadPlugins();
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [loadPlugins]);

  return { state, loadPlugins, setState };
}
```

**Step 3: 创建 usePluginFilter.ts**

```typescript
// webview/src/hooks/usePluginFilter.ts
import { useMemo } from 'react';

interface PluginData {
  name: string;
  description: string;
  marketplace: string;
  installed: boolean;
  enabled?: boolean;
  updateAvailable?: boolean;
}

interface FilterState {
  keyword: string;
  status: string;
  marketplace: string;
}

interface GroupedPlugins {
  installed: PluginData[];
  byMarketplace: Record<string, PluginData[]>;
}

// 纯函数 - 按关键词过滤
function filterByKeyword(plugins: PluginData[], keyword: string): PluginData[] {
  const lower = keyword.toLowerCase();
  return plugins.filter(p =>
    p.name.toLowerCase().includes(lower) ||
    p.description.toLowerCase().includes(lower)
  );
}

// 纯函数 - 按状态过滤
function filterByStatus(plugins: PluginData[], status: string): PluginData[] {
  switch (status) {
    case 'installed':
      return plugins.filter(p => p.installed);
    case 'not-installed':
      return plugins.filter(p => !p.installed);
    case 'upgradable':
      return plugins.filter(p => p.updateAvailable);
    default:
      return plugins;
  }
}

// 纯函数 - 按市场过滤
function filterByMarketplace(plugins: PluginData[], marketplace: string): PluginData[] {
  if (marketplace === 'all') return plugins;
  return plugins.filter(p => p.marketplace === marketplace);
}

// 纯函数 - 分组插件
function groupPlugins(plugins: PluginData[]): GroupedPlugins {
  const installed = plugins.filter(p => p.installed);

  // 排序已安装插件
  installed.sort((a, b) => {
    const getPriority = (p: PluginData) => {
      let score = 0;
      if (p.installed) score += 100;
      if (p.enabled !== false) score += 50;
      if (p.updateAvailable) score += 20;
      return score;
    };

    const priorityA = getPriority(a);
    const priorityB = getPriority(b);

    if (priorityA !== priorityB) {
      return priorityB - priorityA;
    }

    return a.name.localeCompare(b.name);
  });

  // 按市场分组
  const byMarketplace: Record<string, PluginData[]> = {};
  plugins.forEach(p => {
    if (!byMarketplace[p.marketplace]) {
      byMarketplace[p.marketplace] = [];
    }
    byMarketplace[p.marketplace].push(p);
  });

  return { installed, byMarketplace };
}

export function usePluginFilter(plugins: PluginData[], filter: FilterState) {
  // 应用所有过滤条件
  const filteredPlugins = useMemo(() => {
    let result = [...plugins];

    if (filter.keyword) {
      result = filterByKeyword(result, filter.keyword);
    }

    if (filter.status !== 'all') {
      result = filterByStatus(result, filter.status);
    }

    if (filter.marketplace !== 'all') {
      result = filterByMarketplace(result, filter.marketplace);
    }

    return result;
  }, [plugins, filter]);

  // 分组结果
  const groupedPlugins = useMemo(() => {
    return groupPlugins(filteredPlugins);
  }, [filteredPlugins]);

  return { filteredPlugins, groupedPlugins };
}

// 导出纯函数用于测试
export const __private__ = {
  filterByKeyword,
  filterByStatus,
  filterByMarketplace,
  groupPlugins
};
```

**Step 4: 创建 useHoverState.ts**

```typescript
// webview/src/hooks/useHoverState.ts
import { useState, useCallback } from 'react';

export function useHoverState() {
  const [hoveredItems, setHoveredItems] = useState<Set<string>>(new Set());

  const isHovered = useCallback((id: string) => {
    return hoveredItems.has(id);
  }, [hoveredItems]);

  const setHovered = useCallback((id: string, hovered: boolean) => {
    setHoveredItems(prev => {
      const newSet = new Set(prev);
      if (hovered) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  }, []);

  return { isHovered, setHovered };
}
```

**Step 5: 创建 index.ts 导出所有 hooks**

```typescript
// webview/src/hooks/index.ts
export { usePluginData } from './usePluginData';
export { usePluginFilter } from './usePluginFilter';
export { useHoverState } from './useHoverState';
```

**Step 6: 提交**

```bash
git add webview/src/hooks/
git commit -m "feat: add React hooks for SidebarApp refactoring

- Add usePluginData: manages plugin data loading and state
- Add usePluginFilter: handles filtering and grouping logic
- Add useHoverState: manages hover state
- Extract pure functions for better testability

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 8: 创建可复用的 React 组件

**Files:**
- Create: `webview/src/components/PluginItem.tsx`
- Create: `webview/src/components/PluginSection.tsx`
- Create: `webview/src/components/index.ts`

**Step 1: 创建 components 目录**

```bash
mkdir -p webview/src/components
```

**Step 2: 创建 PluginItem.tsx**

```typescript
// webview/src/components/PluginItem.tsx
import React, { memo, useMemo } from 'react';
import { Button, Flex, Typography, Dropdown } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  PoweroffOutlined,
  ReloadOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  DeleteOutlined,
  SyncOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Text } = Typography;

declare const vscode: {
  postMessage: (message: any) => void;
};

export interface PluginData {
  name: string;
  description: string;
  version: string;
  author?: string;
  homepage?: string;
  category?: string;
  marketplace: string;
  installed: boolean;
  enabled?: boolean;
  scope?: 'user' | 'project' | 'local';
  updateAvailable?: boolean;
}

interface PluginItemProps {
  plugin: PluginData;
  isHovered: boolean;
  onHoverChange: (id: string, hovered: boolean) => void;
}

export const PluginItem: React.FC<PluginItemProps> = memo(({
  plugin,
  isHovered,
  onHoverChange
}) => {
  const statusIcon = useMemo(() => {
    if (plugin.updateAvailable) {
      return <SyncOutlined style={{ color: '#faad14' }} />;
    }
    if (plugin.enabled === false) {
      return <CloseCircleOutlined style={{ color: 'var(--vscode-disabledForeground)' }} />;
    }
    return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
  }, [plugin.updateAvailable, plugin.enabled]);

  const getActionMenu = useMemo((): MenuProps => {
    const items: MenuProps['items'] = [];

    if (plugin.installed) {
      if (plugin.enabled === false) {
        items.push({
          key: 'enable',
          label: '启用',
          icon: <PoweroffOutlined />,
          onClick: () => vscode.postMessage({
            type: 'enablePlugin',
            payload: { pluginName: plugin.name, marketplace: plugin.marketplace }
          })
        });
      } else {
        items.push({
          key: 'disable',
          label: '禁用',
          icon: <PoweroffOutlined />,
          onClick: () => vscode.postMessage({
            type: 'disablePlugin',
            payload: { pluginName: plugin.name, marketplace: plugin.marketplace }
          })
        });
      }
      if (plugin.updateAvailable) {
        items.push({
          key: 'update',
          label: '更新',
          icon: <ReloadOutlined />,
          onClick: () => vscode.postMessage({
            type: 'updatePlugin',
            payload: { pluginName: plugin.name, marketplace: plugin.marketplace }
          })
        });
      }
      items.push({ type: 'divider' });
      items.push({
        key: 'uninstall',
        label: '卸载',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => vscode.postMessage({
          type: 'uninstallPlugin',
          payload: { pluginName: plugin.name }
        })
      });
    } else {
      items.push({
        key: 'install',
        label: '安装',
        icon: <PlusOutlined />,
        onClick: () => vscode.postMessage({
          type: 'installPlugin',
          payload: { pluginName: plugin.name, marketplace: plugin.marketplace, scope: 'user' }
        })
      });
    }
    items.push({
      key: 'info',
      label: '查看详情',
      icon: <InfoCircleOutlined />,
      onClick: () => vscode.postMessage({
        type: 'openDetails',
        payload: { pluginName: plugin.name, marketplace: plugin.marketplace }
      })
    });

    return { items };
  }, [plugin]);

  const handleClick = () => {
    vscode.postMessage({
      type: 'openDetails',
      payload: { pluginName: plugin.name, marketplace: plugin.marketplace }
    });
  };

  return (
    <div
      onClick={handleClick}
      style={{
        marginBottom: 2,
        padding: '6px 8px',
        borderRadius: 4,
        cursor: 'pointer',
        transition: 'background 0.15s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--vscode-list-hoverBackground)';
        onHoverChange(`plugin-${plugin.name}`, true);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        onHoverChange(`plugin-${plugin.name}`, false);
      }}
    >
      <Flex align="center" gap={8}>
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 16 }}>
          {statusIcon}
        </div>
        <Flex vertical gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Flex align="baseline" gap={6}>
            <Text strong style={{ fontSize: 13 }}>{plugin.name}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>v{plugin.version}</Text>
          </Flex>
          <Text type="secondary" ellipsis style={{ fontSize: 11 }}>
            {plugin.description}
          </Text>
        </Flex>
        <div
          style={{
            display: 'flex',
            gap: 2,
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.15s'
          }}
        >
          {plugin.installed ? (
            <>
              {plugin.enabled === false && (
                <Button
                  type="text"
                  size="small"
                  icon={<PoweroffOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    vscode.postMessage({
                      type: 'enablePlugin',
                      payload: { pluginName: plugin.name, marketplace: plugin.marketplace }
                    });
                  }}
                  title="启用"
                  style={{ padding: '0 4px', minWidth: 'auto' }}
                />
              )}
              {plugin.updateAvailable && (
                <Button
                  type="text"
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    vscode.postMessage({
                      type: 'updatePlugin',
                      payload: { pluginName: plugin.name, marketplace: plugin.marketplace }
                    });
                  }}
                  title="更新"
                  style={{ padding: '0 4px', minWidth: 'auto' }}
                />
              )}
              <Dropdown menu={getActionMenu} trigger={['click']}>
                <Button
                  type="text"
                  size="small"
                  icon={<SettingOutlined />}
                  onClick={(e) => e.stopPropagation()}
                  title="更多操作"
                  style={{ padding: '0 4px', minWidth: 'auto' }}
                />
              </Dropdown>
            </>
          ) : (
            <>
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  vscode.postMessage({
                    type: 'installPlugin',
                    payload: { pluginName: plugin.name, marketplace: plugin.marketplace, scope: 'user' }
                  });
                }}
                style={{ fontSize: 12 }}
              >
                安装
              </Button>
              <Dropdown menu={getActionMenu} trigger={['click']}>
                <Button
                  type="text"
                  size="small"
                  icon={<SettingOutlined />}
                  onClick={(e) => e.stopPropagation()}
                  title="更多操作"
                  style={{ padding: '0 4px', minWidth: 'auto' }}
                />
              </Dropdown>
            </>
          )}
        </div>
      </Flex>
    </div>
  );
});

PluginItem.displayName = 'PluginItem';
```

**Step 3: 创建 PluginSection.tsx**

```typescript
// webview/src/components/PluginSection.tsx
import React, { memo } from 'react';
import { Space, Flex, Typography, Button } from 'antd';
import { CaretDownOutlined, CaretUpOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons';

const { Text } = Typography;

declare const vscode: {
  postMessage: (message: any) => void;
};

export interface PluginData {
  name: string;
  description: string;
  version: string;
  marketplace: string;
  installed: boolean;
  enabled?: boolean;
  updateAvailable?: boolean;
}

interface PluginSectionProps {
  title: string;
  count: number;
  sectionKey: string;
  isExpanded: boolean;
  isHovered: boolean;
  onToggle: (key: string) => void;
  onHoverChange: (key: string, hovered: boolean) => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const PluginSection: React.FC<PluginSectionProps> = memo(({
  title,
  count,
  sectionKey,
  isExpanded,
  isHovered,
  onToggle,
  onHoverChange,
  children,
  actions
}) => {
  return (
    <Space direction="vertical" size={4} style={{ width: '100%' }}>
      <Flex
        align="center"
        gap={4}
        style={{
          padding: '4px 8px',
          borderRadius: 4,
          cursor: 'pointer',
          transition: 'background 0.15s'
        }}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button')) {
            return;
          }
          onToggle(sectionKey);
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--vscode-toolbar-hoverBackground)';
          onHoverChange(sectionKey, true);
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          onHoverChange(sectionKey, false);
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', fontSize: 10 }}>
          {isExpanded ? <CaretDownOutlined /> : <CaretUpOutlined />}
        </span>
        <Text strong>{title}</Text>
        <Text type="secondary">({count})</Text>
        {actions && (
          <div
            style={{
              marginLeft: 'auto',
              display: 'flex',
              gap: 2,
              opacity: isHovered ? 1 : 0,
              transition: 'opacity 0.15s'
            }}
          >
            {actions}
          </div>
        )}
      </Flex>
      {isExpanded && <div style={{ paddingLeft: 16 }}>{children}</div>}
    </Space>
  );
});

PluginSection.displayName = 'PluginSection';
```

**Step 4: 创建 index.ts 导出组件**

```typescript
// webview/src/components/index.ts
export { PluginItem } from './PluginItem';
export type { PluginData as PluginItemData } from './PluginItem';
export { PluginSection } from './PluginSection';
```

**Step 5: 提交**

```bash
git add webview/src/components/
git commit -m "feat: add reusable React components for SidebarApp

- Add PluginItem: renders individual plugin with actions
- Add PluginSection: renders expandable section
- Use React.memo for performance optimization

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 9: 重构 SidebarApp.tsx 使用新的 hooks 和组件

**Files:**
- Modify: `webview/src/sidebar/SidebarApp.tsx`

**Step 1: 更新导入**

在文件顶部添加新的导入：

```typescript
import { usePluginData, usePluginFilter, useHoverState } from '../hooks';
import { PluginItem, PluginSection } from '../components';
```

**Step 2: 简化组件主体**

替换整个组件实现：

```typescript
const SidebarApp: React.FC = () => {
  // 使用自定义 hooks
  const { state, loadPlugins, setState } = usePluginData();
  const { groupedPlugins } = usePluginFilter(state.plugins, state.filter);
  const { isHovered, setHovered } = useHoverState();

  // 展开/折叠状态
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(
    new Set(['installed', 'available'])
  );

  // 统计数据
  const stats = React.useMemo(() => {
    const installed = state.plugins.filter(p => p.installed).length;
    const enabled = state.plugins.filter(p => p.installed && p.enabled !== false).length;
    const updatable = state.plugins.filter(p => p.updateAvailable).length;
    return { installed, enabled, updatable, total: state.plugins.length };
  }, [state.plugins]);

  // 搜索处理
  const handleSearch = (keyword: string) => {
    setState(prev => ({
      ...prev,
      filter: { ...prev.filter, keyword }
    }));
  };

  // 折叠/展开处理
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // 渲染市场操作按钮
  const renderMarketActions = (marketName: string) => (
    <>
      <Button
        type="text"
        size="small"
        icon={<ReloadOutlined />}
        onClick={(e) => {
          e.stopPropagation();
          vscode.postMessage({
            type: 'executeCommand',
            payload: { command: 'claudePluginMarketplace.refreshMarketplace', args: [marketName] }
          });
        }}
        title="刷新市场"
        style={{ padding: '0 4px', minWidth: 20 }}
      />
      <Button
        type="text"
        size="small"
        icon={<DeleteOutlined />}
        onClick={(e) => {
          e.stopPropagation();
          vscode.postMessage({
            type: 'executeCommand',
            payload: { command: 'claudePluginMarketplace.removeMarketplace', args: [marketName] }
          });
        }}
        title="删除市场"
        danger
        style={{ padding: '0 4px', minWidth: 20 }}
      />
    </>
  );

  // 加载状态
  if (state.loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Spin size="small" tip="加载中..." />
      </div>
    );
  }

  // 错误状态
  if (state.error) {
    return (
      <div style={{ padding: 8 }}>
        <Alert
          type="error"
          message={state.error}
          showIcon
          closable
        />
      </div>
    );
  }

  // 设置菜单项
  const settingsMenuItems: MenuProps['items'] = [
    {
      key: 'refresh',
      label: '刷新',
      icon: <ReloadOutlined />,
      onClick: loadPlugins
    },
    {
      key: 'addMarketplace',
      label: '添加市场',
      icon: <AppstoreOutlined />,
      onClick: () => {
        vscode.postMessage({
          type: 'executeCommand',
          payload: { command: 'claudePluginMarketplace.addMarketplace' }
        });
      }
    },
    {
      type: 'divider'
    },
    {
      key: 'updateAll',
      label: '全部更新',
      icon: <SyncOutlined />,
      onClick: () => {
        state.plugins.filter(p => p.updateAvailable).forEach(p => {
          vscode.postMessage({
            type: 'updatePlugin',
            payload: { pluginName: p.name, marketplace: p.marketplace }
          });
        });
      }
    }
  ];

  return (
    <>
      <Flex vertical style={{ height: '100%', overflow: 'hidden' }}>
        {/* 搜索栏 + 设置按钮 */}
        <Flex align="center" gap={4} style={{ padding: '6px 8px' }}>
          <Input
            placeholder="搜索插件..."
            value={state.filter.keyword}
            onChange={(e) => handleSearch(e.target.value)}
            prefix={<SearchOutlined />}
            allowClear
            size="small"
            style={{ flex: 1 }}
          />
          <Dropdown menu={{ items: settingsMenuItems }} trigger={['click']} placement="bottomRight">
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
              title="更多操作"
              style={{ width: 28, height: 28, padding: 0 }}
            />
          </Dropdown>
        </Flex>

        {/* 统计信息 */}
        <Flex justify="space-between" style={{ padding: '0 8px' }}>
          <Text type="secondary" style={{ fontSize: 11 }}>
            <CheckCircleOutlined style={{ marginRight: 4 }} />
            已安装 {stats.installed} / 启用 {stats.enabled}
          </Text>
          {stats.updatable > 0 && (
            <Text style={{ fontSize: 11, color: '#faad14' }}>
              <SyncOutlined style={{ marginRight: 4 }} />
              {stats.updatable} 个可更新
            </Text>
          )}
        </Flex>

        <Divider style={{ margin: '8px 0' }} />

        {/* 插件列表 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
          {groupedPlugins.installed.length === 0 && Object.keys(groupedPlugins.byMarketplace).length === 0 ? (
            <Empty
              description={state.filter.keyword ? '没有找到匹配的插件' : '暂无插件'}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <>
              {groupedPlugins.installed.length > 0 && (
                <PluginSection
                  title="已安装"
                  count={groupedPlugins.installed.length}
                  sectionKey="installed"
                  isExpanded={expandedSections.has('installed')}
                  isHovered={isHovered('section-installed')}
                  onToggle={toggleSection}
                  onHoverChange={setHovered}
                >
                  {groupedPlugins.installed.map(p => (
                    <PluginItem
                      key={p.name}
                      plugin={p}
                      isHovered={isHovered(`plugin-${p.name}`)}
                      onHoverChange={setHovered}
                    />
                  ))}
                </PluginSection>
              )}

              {Object.keys(groupedPlugins.byMarketplace).map(marketName => {
                const plugins = groupedPlugins.byMarketplace[marketName];
                return (
                  <PluginSection
                    key={marketName}
                    title={marketName}
                    count={plugins.length}
                    sectionKey={`market-${marketName}`}
                    isExpanded={expandedSections.has(`market-${marketName}`)}
                    isHovered={isHovered(`section-market-${marketName}`)}
                    onToggle={toggleSection}
                    onHoverChange={setHovered}
                    actions={renderMarketActions(marketName)}
                  >
                    {plugins.map(p => (
                      <PluginItem
                        key={p.name}
                        plugin={p}
                        isHovered={isHovered(`plugin-${p.name}`)}
                        onHoverChange={setHovered}
                      />
                    ))}
                  </PluginSection>
                );
              })}
            </>
          )}
        </div>
      </Flex>
    </>
  );
};
```

**Step 3: 删除不再需要的代码**

删除以下内容（已被新组件替换）：
- `renderPluginItem` 函数 (行 259-427)
- `renderSection` 函数 (行 430-491)
- `groupedPlugins` useMemo (行 110-163)
- `stats` useMemo (行 166-171)
- 消息处理 useEffect 中的重复逻辑 (简化后保留在 usePluginData 中)

**Step 4: 编译 webview**

```bash
npm run build-webview
```

Expected: 编译成功，无错误

**Step 5: 提交**

```bash
git add webview/src/sidebar/SidebarApp.tsx webview/dist/
git commit -m "refactor: simplify SidebarApp using hooks and components

- Use usePluginData for data management
- Use usePluginFilter for filtering and grouping
- Use useHoverState for hover state
- Use PluginItem and PluginSection components
- File size: 659 -> ~200 lines (-70%)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## 阶段 4: 测试和验证

### Task 10: 运行完整测试套件

**Files:**
- Test: All project files

**Step 1: 运行所有单元测试**

```bash
npm test
```

Expected: 所有测试通过

**Step 2: 编译整个项目**

```bash
npm run compile
npm run build-webview
```

Expected: 编译成功，无错误

**Step 3: 运行测试覆盖率**

```bash
npm run test:coverage
```

Expected: 覆盖率报告显示新增模块有良好覆盖

**Step 4: 提交测试更新**

```bash
git add __tests__/
git commit -m "test: add tests for refactored modules

- Add tests for fileUtils
- Add tests for ContentParser
- Add tests for PluginPathResolver
- Ensure backward compatibility

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 11: 手动验证和文档更新

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md` (如果存在)

**Step 1: 更新 CLAUDE.md**

在项目结构部分添加新文件：

```markdown
## Project Structure

...
├── src/
│   ├── shared/
│   │   └── utils/                    # 共享工具函数
│   │       ├── fileUtils.ts          # 文件操作工具
│   │       └── parseUtils.ts         # 解析工具
│   └── pluginMarketplace/
│       └── webview/
│           └── services/
│               ├── PluginPathResolver.ts  # 路径解析
│               ├── ContentParser.ts       # 内容解析
│               └── PluginDetailsService.ts # 详情服务 (简化)
└── webview/
    └── src/
        ├── hooks/                    # React 自定义 hooks
        │   ├── usePluginData.ts      # 数据管理
        │   ├── usePluginFilter.ts    # 过滤逻辑
        │   └── useHoverState.ts      # 悬停状态
        └── components/               # 可复用组件
            ├── PluginItem.tsx        # 插件项
            └── PluginSection.tsx     # 分组
```

**Step 2: 添加重构说明**

在 CLAUDE.md 中添加：

```markdown
## Refactoring Notes

### Code Organization

- **Shared Utils**: Common utilities in `src/shared/utils/` are used across the extension
- **Content Parsing**: `ContentParser` provides a unified parsing interface, eliminating code duplication
- **React Hooks**: Custom hooks in `webview/src/hooks/` separate logic from UI

### Adding New Content Types

To add a new content type (e.g., "widgets"):

1. Add parsing method to `ContentParser`:
```typescript
async parseWidgets(pluginPath: string, configJson?: any): Promise<WidgetInfo[]> {
  return this.parseDirectory<WidgetInfo>(pluginPath, {
    defaultPath: 'widgets/widgets.json',
    customPaths: getCustomPaths(configJson?.widgets, pluginPath),
    parser: (path, content) => /* ... */,
    configParser: (config, filePath) => /* ... */
  });
}
```

2. Update `PluginDetailsService` to call the new parser:
```typescript
const widgets = await this.contentParser.parseWidgets(pluginPath, configJson);
```

3. Add the type to `PluginDetailData` interface
```

**Step 3: 功能测试**

启动 VS Code 开发模式测试：

```bash
# 按 F5 或运行
code . --extensionDevelopmentPath=$PWD
```

测试清单：
- [ ] 插件列表正确显示
- [ ] 搜索功能正常工作
- [ ] 安装/卸载功能正常
- [ ] 启用/禁用功能正常
- [ ] 插件详情页正常显示
- [ ] 折叠/展开功能正常
- [ ] 悬停效果正常

**Step 4: 提交文档更新**

```bash
git add CLAUDE.md README.md
git commit -m "docs: update documentation for refactored code

- Document new file structure
- Add refactoring notes
- Add guide for adding new content types

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 12: 性能验证和最终提交

**Files:**
- Create: `docs/plans/2026-02-22-code-refactoring-summary.md`

**Step 1: 创建重构总结文档**

```markdown
# Code Refactoring Summary

**日期**: 2026-02-22
**状态**: 完成

## 重构成果

### 文件行数变化

| 文件 | 重构前 | 重构后 | 变化 |
|------|--------|--------|------|
| PluginDetailsService.ts | 1286 行 | ~400 行 | -69% |
| SidebarApp.tsx | 659 行 | ~200 行 | -70% |
| 新增文件 | 0 | 10 个 | +1000+ 行 |

### 新增模块

#### Extension 端
- `src/shared/utils/fileUtils.ts` - 文件操作工具
- `src/shared/utils/parseUtils.ts` - 解析工具
- `src/pluginMarketplace/webview/services/PluginPathResolver.ts` - 路径解析
- `src/pluginMarketplace/webview/services/ContentParser.ts` - 统一内容解析

#### Webview 端
- `webview/src/hooks/usePluginData.ts` - 数据管理
- `webview/src/hooks/usePluginFilter.ts` - 过滤逻辑
- `webview/src/hooks/useHoverState.ts` - 悬停状态
- `webview/src/components/PluginItem.tsx` - 插件项组件
- `webview/src/components/PluginSection.tsx` - 分组组件

### 代码质量改进

1. **消除重复**: 解析模式从 6 处相似代码减少到 1 个统一模式
2. **职责分离**: 每个模块职责单一，易于理解和维护
3. **可测试性**: 纯函数和独立模块便于单元测试
4. **可复用性**: hooks 和组件可在其他地方复用

### 向后兼容

- 保持所有公共 API 不变
- 无破坏性变更
- 现有功能全部正常工作

## 下一步建议

1. **handlers.ts (588 行)**: 可按消息类型拆分为独立处理器
2. **PluginDataStore.ts (506 行)**: 可考虑引入 Repository 模式
3. **类型安全**: 使用 stricter types 替代 `any`
4. **性能监控**: 添加性能指标收集
```

**Step 2: 最终提交所有更改**

```bash
git add docs/plans/2026-02-22-code-refactoring-summary.md
git commit -m "docs: add code refactoring summary

Document the completed refactoring work with metrics and outcomes.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

**Step 3: 创建标签 (可选)**

```bash
git tag -a v0.1.0-refactor -m "Code refactoring completion"
git push origin v0.1.0-refactor
```

---

## 完成

重构完成！主要成果：
- ✅ PluginDetailsService.ts: 1286 → ~400 行 (-69%)
- ✅ SidebarApp.tsx: 659 → ~200 行 (-70%)
- ✅ 提取 10 个新模块
- ✅ 消除代码重复
- ✅ 提高可测试性
- ✅ 保持向后兼容
