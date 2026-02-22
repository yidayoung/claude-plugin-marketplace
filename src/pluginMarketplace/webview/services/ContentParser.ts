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
  OutputStyleInfo,
  HookConfig
} from '../messages/types';
import { parseFrontmatter, getCustomPaths } from '@shared/utils/parseUtils';

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
              const jsonConfig = JSON.parse(content);
              results.push(...configParser(jsonConfig, customPath));
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
          const jsonConfig = JSON.parse(content);
          results.push(...configParser(jsonConfig, defaultFullPath));
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

  /**
   * 解析 Agents
   */
  async parseAgents(pluginPath: string, configJson?: any): Promise<AgentInfo[]> {
    const agents: AgentInfo[] = [];

    // 获取自定义路径
    const customPaths = getCustomPaths(configJson?.agents, pluginPath);

    // 收集所有要搜索的 agents 目录
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
        // 目录不存在，继续下一个
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
      // 没有 frontmatter，返回基本信息
      return { name: agentName, description: '' };
    }

    return {
      name: frontmatter.name || agentName,
      description: frontmatter.description || '',
      model: frontmatter.model,
    };
  }

  /**
   * 解析 Commands
   */
  async parseCommands(pluginPath: string, configJson?: any): Promise<CommandInfo[]> {
    const commands: CommandInfo[] = [];

    // 获取自定义路径
    const customPaths = getCustomPaths(configJson?.commands, pluginPath);

    // 收集所有要搜索的 commands 目录
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
            // 避免重复
            if (!commands.find(c => c.name === command.name)) {
              command.filePath = commandPath;
              commands.push(command);
            }
          } catch {
            // 即使无法解析，也添加基础信息
            const name = entry.replace(/\.md$/, '');
            if (!commands.find(c => c.name === name)) {
              commands.push({ name, filePath: commandPath });
            }
          }
        }
      } catch {
        // 目录不存在，继续下一个
      }
    }

    return commands;
  }

  /**
   * 解析单个 Command 的 Markdown 文件
   */
  private parseCommandMarkdown(commandName: string, content: string): CommandInfo {
    // 尝试从 frontmatter 获取描述
    const frontmatter = parseFrontmatter(content);
    if (frontmatter) {
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

  /**
   * 解析 Hooks
   */
  async parseHooks(pluginPath: string, configJson?: any): Promise<HookInfo[]> {
    const hooks: HookInfo[] = [];

    // 首先检查 plugin.json 中是否有内联的 hooks 配置
    if (configJson?.hooks) {
      // hooks 可能是路径字符串，也可能是内联配置对象
      if (typeof configJson.hooks === 'string') {
        // 是路径，读取文件
        try {
          const hooksPath = path.join(pluginPath, configJson.hooks.replace(/^\.\//, ''));
          const content = await fs.readFile(hooksPath, 'utf-8');
          const config = JSON.parse(content) as { hooks?: Record<string, any[]> };
          if (config.hooks) {
            hooks.push(...this.parseHooksConfig(config.hooks, hooksPath));
          }
        } catch {
          // 忽略错误
        }
      } else if (typeof configJson.hooks === 'object') {
        // 内联配置，没有文件路径
        hooks.push(...this.parseHooksConfig(configJson.hooks));
      }
    }

    // 如果没有从 plugin.json 获取到 hooks，尝试默认位置
    if (hooks.length === 0) {
      const hooksJsonPath = path.join(pluginPath, 'hooks', 'hooks.json');
      try {
        const content = await fs.readFile(hooksJsonPath, 'utf-8');
        const config = JSON.parse(content) as { hooks?: Record<string, any[]> };
        if (config.hooks) {
          hooks.push(...this.parseHooksConfig(config.hooks, hooksJsonPath));
        }
      } catch {
        // hooks.json 不存在或解析失败
      }
    }

    return hooks;
  }

  /**
   * 解析 hooks 配置对象
   */
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
   * 解析 MCP Servers
   */
  async parseMcps(pluginPath: string, configJson?: any): Promise<McpInfo[]> {
    const mcps: McpInfo[] = [];

    // 首先检查 plugin.json 中是否有 mcpServers 配置
    if (configJson?.mcpServers) {
      if (typeof configJson.mcpServers === 'string') {
        // 是路径，读取文件
        try {
          const mcpPath = path.join(pluginPath, configJson.mcpServers.replace(/^\.\//, ''));
          const content = await fs.readFile(mcpPath, 'utf-8');
          mcps.push(...this.parseMcpConfig(JSON.parse(content), mcpPath));
        } catch {
          // 忽略错误
        }
      } else if (typeof configJson.mcpServers === 'object') {
        // 内联配置，没有文件路径
        mcps.push(...this.parseMcpConfig(configJson.mcpServers));
      }
    }

    // 如果没有从 plugin.json 获取到 mcp，尝试默认位置
    if (mcps.length === 0) {
      const mcpJsonPath = path.join(pluginPath, '.mcp.json');
      try {
        const content = await fs.readFile(mcpJsonPath, 'utf-8');
        mcps.push(...this.parseMcpConfig(JSON.parse(content), mcpJsonPath));
      } catch {
        // .mcp.json 不存在或解析失败
      }
    }

    return mcps;
  }

  /**
   * 解析 MCP 配置对象
   */
  private parseMcpConfig(config: any, filePath?: string): McpInfo[] {
    const mcps: McpInfo[] = [];
    // .mcp.json 可能是 { "mcpServers": { ... } } 或直接服务配置
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
   * 解析 LSP Servers
   */
  async parseLsps(pluginPath: string, configJson?: any): Promise<LspInfo[]> {
    const lsps: LspInfo[] = [];

    // 首先检查 plugin.json 中是否有 lspServers 配置
    if (configJson?.lspServers) {
      if (typeof configJson.lspServers === 'string') {
        // 是路径，读取文件
        try {
          const lspPath = path.join(pluginPath, configJson.lspServers.replace(/^\.\//, ''));
          const content = await fs.readFile(lspPath, 'utf-8');
          lsps.push(...this.parseLspConfig(JSON.parse(content), lspPath));
        } catch {
          // 忽略错误
        }
      } else if (typeof configJson.lspServers === 'object') {
        // 内联配置，没有文件路径
        lsps.push(...this.parseLspConfig(configJson.lspServers));
      }
    }

    // 如果没有从 plugin.json 获取到 lsp，尝试默认位置
    if (lsps.length === 0) {
      const lspJsonPath = path.join(pluginPath, '.lsp.json');
      try {
        const content = await fs.readFile(lspJsonPath, 'utf-8');
        lsps.push(...this.parseLspConfig(JSON.parse(content), lspJsonPath));
      } catch {
        // .lsp.json 不存在或解析失败
      }
    }

    return lsps;
  }

  /**
   * 解析 LSP 配置对象
   */
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

    // 获取自定义路径
    const customPaths = getCustomPaths(configJson?.outputStyles, pluginPath);

    // 收集所有要搜索的 outputStyles 路径
    const searchPaths: string[] = [...customPaths, path.join(pluginPath, 'outputStyles')];

    for (const styleBasePath of searchPaths) {
      try {
        await fs.access(styleBasePath);
        const entries = await fs.readdir(styleBasePath, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.name.startsWith('.')) continue;

          const styleName = entry.name;
          const stylePath = path.join(styleBasePath, entry.name);

          // 检查是文件还是目录
          try {
            const stat = await fs.stat(stylePath);
            outputStyles.push({
              name: styleName,
              type: stat.isDirectory() ? 'directory' : 'file',
              filePath: stylePath
            });
          } catch {
            // 无法获取状态，默认添加为目录
            outputStyles.push({
              name: styleName,
              type: 'directory',
              filePath: stylePath
            });
          }
        }
      } catch {
        // 路径不存在，继续下一个
      }
    }

    return outputStyles;
  }
}
