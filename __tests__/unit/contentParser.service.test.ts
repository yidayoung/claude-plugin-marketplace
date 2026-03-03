// src/pluginMarketplace/webview/services/__tests__/ContentParser.test.ts

import { ContentParser } from '../../src/pluginMarketplace/webview/services/ContentParser';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as fsTypes from 'fs';

jest.mock('fs/promises');

// 创建一个模拟的 Dirent 对象
const createDirent = (name: string, isDir: boolean): fsTypes.Dirent => {
  return {
    name,
    isDirectory: () => isDir,
    isFile: () => !isDir,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isSymbolicLink: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    parentPath: '',
    path: '',
  } as fsTypes.Dirent;
};

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

    it('should parse skill with allowed-tools field', () => {
      const content = `---
name: test-skill
description: Test description
allowed-tools:
  - Tool1
  - Tool2
---
Content here`;

      const result = (parser as any).parseSkillMarkdown('test', content);
      expect(result).toEqual({
        name: 'test-skill',
        description: 'Test description',
        tools: undefined,
        allowedTools: ['Tool1', 'Tool2'],
        disableModelInvocation: false
      });
    });

    it('should parse skill with disable-model-invocation', () => {
      const content = `---
name: test-skill
description: Test description
disable-model-invocation: true
---
Content here`;

      const result = (parser as any).parseSkillMarkdown('test', content);
      expect(result).toEqual({
        name: 'test-skill',
        description: 'Test description',
        tools: undefined,
        allowedTools: undefined,
        disableModelInvocation: true
      });
    });

    it('should use skillName when frontmatter name is missing', () => {
      const content = `---
description: Test description
---
Content here`;

      const result = (parser as any).parseSkillMarkdown('fallback-name', content);
      expect(result).toEqual({
        name: 'fallback-name',
        description: 'Test description',
        tools: undefined,
        allowedTools: undefined,
        disableModelInvocation: false
      });
    });
  });

  describe('parseAgentMarkdown', () => {
    it('should parse agent with frontmatter', () => {
      const content = `---
name: test-agent
description: Test description
model: claude-3-opus
---
Content here`;

      const result = (parser as any).parseAgentMarkdown('agent-name', content);
      expect(result).toEqual({
        name: 'test-agent',
        description: 'Test description',
        model: 'claude-3-opus'
      });
    });

    it('should return basic info for agent without frontmatter', () => {
      const content = 'Just plain content';
      const result = (parser as any).parseAgentMarkdown('agent-name', content);
      expect(result).toEqual({
        name: 'agent-name',
        description: ''
      });
    });
  });

  describe('parseCommandMarkdown', () => {
    it('should parse command with frontmatter description', () => {
      const content = `---
description: Test description from frontmatter
---
Content here`;

      const result = (parser as any).parseCommandMarkdown('test-command', content);
      expect(result).toEqual({
        name: 'test-command',
        description: 'Test description from frontmatter'
      });
    });

    it('should parse command from first line', () => {
      const content = `This is the first line
Second line`;

      const result = (parser as any).parseCommandMarkdown('test-command', content);
      expect(result).toEqual({
        name: 'test-command',
        description: 'This is the first line'
      });
    });

    it('should handle empty content', () => {
      const content = '';
      const result = (parser as any).parseCommandMarkdown('test-command', content);
      expect(result).toEqual({
        name: 'test-command',
        description: undefined
      });
    });
  });

  describe('parseSkills', () => {
    it('should return empty array when no skills found', async () => {
      (fs.readdir as jest.Mock).mockRejectedValue(new Error('not found'));
      const result = await parser.parseSkills('/fake/path');
      expect(result).toEqual([]);
    });

    it('should parse skills from default path', async () => {
      const mockContent = `---
name: skill1
description: Test skill 1
---
Content`;

      (fs.readdir as jest.Mock).mockResolvedValue(['skill1']);
      (fs.readFile as jest.Mock).mockResolvedValue(mockContent);
      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });

      const result = await parser.parseSkills('/plugin/path');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('skill1');
    });

    it('should parse skills from custom path in configJson', async () => {
      const mockContent = `---
name: custom-skill
description: Custom skill
---
Content`;

      const configJson = {
        skills: './custom-skills'
      };

      (fs.readdir as jest.Mock)
        .mockResolvedValueOnce(['custom-skill'])
        .mockResolvedValueOnce(['SKILL.md']);
      (fs.readFile as jest.Mock).mockResolvedValue(mockContent);
      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });

      const result = await parser.parseSkills('/plugin/path', configJson);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('custom-skill');
    });
  });

  describe('parseAgents', () => {
    it('should return empty array when no agents found', async () => {
      (fs.readdir as jest.Mock).mockRejectedValue(new Error('not found'));
      const result = await parser.parseAgents('/fake/path');
      expect(result).toEqual([]);
    });

    it('should parse agents from directory', async () => {
      const mockContent = `---
name: agent1
description: Test agent 1
---
Content`;

      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue(['agent1.md']);
      (fs.readFile as jest.Mock).mockResolvedValue(mockContent);

      const result = await parser.parseAgents('/plugin/path');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('agent1');
    });

    it('should ignore hidden files', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue(['.hidden.md', 'visible.md']);

      // 设置 readFile 的 mock，根据文件路径返回不同结果
      (fs.readFile as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('.hidden.md')) {
          return Promise.reject(new Error('hidden'));
        }
        return Promise.resolve('content');
      });

      const result = await parser.parseAgents('/plugin/path');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('visible');
    });
  });

  describe('parseCommands', () => {
    it('should return empty array when no commands found', async () => {
      (fs.readdir as jest.Mock).mockRejectedValue(new Error('not found'));
      const result = await parser.parseCommands('/fake/path');
      expect(result).toEqual([]);
    });

    it('should parse commands from directory', async () => {
      const mockContent = `---
description: Test command 1
---
Content`;

      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue(['command1.md']);

      // 设置 readFile 的 mock，返回正确的 mock content
      (fs.readFile as jest.Mock).mockResolvedValue(mockContent);

      const result = await parser.parseCommands('/plugin/path');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('command1');
      expect(result[0].description).toBe('Test command 1');
    });
  });

  describe('parseHooksConfig', () => {
    it('should parse hooks configuration', () => {
      const hooksConfig = {
        'PostToolUse': [
          {
            type: 'command',
            command: 'npm run compile',
            pattern: 'src/**/*.ts'
          }
        ]
      };

      const result = (parser as any).parseHooksConfig(hooksConfig, '/hooks/hooks.json');
      expect(result).toHaveLength(1);
      expect(result[0].event).toBe('PostToolUse');
      expect(result[0].hooks).toHaveLength(1);
      expect(result[0].hooks[0].type).toBe('command');
      expect(result[0].filePath).toBe('/hooks/hooks.json');
    });

    it('should handle inline config (no filePath)', () => {
      const hooksConfig = {
        'PreToolUse': [
          {
            type: 'skill',
            skill: 'validator'
          }
        ]
      };

      const result = (parser as any).parseHooksConfig(hooksConfig);
      expect(result).toHaveLength(1);
      expect(result[0].event).toBe('PreToolUse');
      expect(result[0].filePath).toBeUndefined();
    });
  });

  describe('parseMcpConfig', () => {
    it('should parse MCP configuration', () => {
      const mcpConfig = {
        mcpServers: {
          'test-server': {
            command: 'node',
            args: ['server.js'],
            description: 'Test MCP server'
          }
        }
      };

      const result = (parser as any).parseMcpConfig(mcpConfig, '/.mcp.json');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('test-server');
      expect(result[0].command).toBe('node');
      expect(result[0].args).toEqual(['server.js']);
      expect(result[0].filePath).toBe('/.mcp.json');
    });

    it('should parse direct server config without mcpServers wrapper', () => {
      const mcpConfig = {
        'direct-server': {
          command: 'python',
          args: ['-m', 'server']
        }
      };

      const result = (parser as any).parseMcpConfig(mcpConfig);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('direct-server');
    });
  });

  describe('parseLspConfig', () => {
    it('should parse LSP configuration', () => {
      const lspConfig = {
        'typescript': {
          command: 'typescript-language-server',
          args: ['--stdio']
        },
        'python': {
          command: 'pylsp'
        }
      };

      const result = (parser as any).parseLspConfig(lspConfig, '/.lsp.json');
      expect(result).toHaveLength(2);
      expect(result[0].language).toBe('typescript');
      expect(result[0].command).toBe('typescript-language-server');
      expect(result[1].language).toBe('python');
      expect(result[1].command).toBe('pylsp');
      expect(result[0].filePath).toBe('/.lsp.json');
    });

    it('should use language name as default command', () => {
      const lspConfig = {
        'javascript': {
          args: ['--stdio']
        }
      };

      const result = (parser as any).parseLspConfig(lspConfig);
      expect(result).toHaveLength(1);
      expect(result[0].command).toBe('javascript');
    });
  });

  describe('parseOutputStyles', () => {
    it('should return empty array when no output styles found', async () => {
      (fs.readdir as jest.Mock).mockRejectedValue(new Error('not found'));
      const result = await parser.parseOutputStyles('/fake/path');
      expect(result).toEqual([]);
    });

    it('should parse output styles from directory', async () => {
      const mockEntries = [createDirent('style1', true), createDirent('style2.md', false)];

      (fs.readdir as jest.Mock).mockResolvedValue(mockEntries);
      (fs.stat as jest.Mock)
        .mockImplementation((filePath: string) => {
          if (filePath.includes('style1')) {
            return Promise.resolve({ isDirectory: () => true });
          }
          return Promise.resolve({ isDirectory: () => false });
        });
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      const result = await parser.parseOutputStyles('/plugin/path');
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('style1');
      expect(result[0].type).toBe('directory');
      expect(result[1].name).toBe('style2.md');
      expect(result[1].type).toBe('file');
    });

    it('should ignore hidden files', async () => {
      const mockEntries = [createDirent('.hidden', true), createDirent('visible', true)];

      (fs.readdir as jest.Mock).mockResolvedValue(mockEntries);
      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      const result = await parser.parseOutputStyles('/plugin/path');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('visible');
    });
  });

  describe('parseDirectory', () => {
    it('should parse directory with custom paths', async () => {
      const config = {
        defaultPath: 'default-dir',
        customPaths: ['/custom/path'],
        parser: (filePath: string, content: string) => ({ name: path.basename(filePath) }),
        filePattern: (name: string) => name.endsWith('.md')
      };

      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });
      (fs.readdir as jest.Mock).mockResolvedValue([createDirent('file1.md', false)]);
      (fs.readFile as jest.Mock).mockResolvedValue('content');
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      const result = await parser.parseDirectory('/plugin', config);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('file1.md');
    });

    it('should fall back to default path when custom paths yield no results', async () => {
      const config = {
        defaultPath: 'default-dir',
        customPaths: ['/nonexistent/path'],
        parser: (filePath: string, content: string) => ({ name: path.basename(filePath) }),
        filePattern: (name: string) => name.endsWith('.md')
      };

      // access 调用失败（自定义路径不存在）
      (fs.access as jest.Mock).mockRejectedValue(new Error('not found'));
      // stat 调用成功（默认路径存在）
      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });
      (fs.readdir as jest.Mock).mockResolvedValue([createDirent('file2.md', false)]);
      (fs.readFile as jest.Mock).mockResolvedValue('content');

      const result = await parser.parseDirectory('/plugin', config);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('file2.md');
    });

    it('should filter files using filePattern', async () => {
      const config = {
        defaultPath: 'default-dir',
        customPaths: ['/custom/path'],
        parser: (filePath: string, content: string) => ({ name: path.basename(filePath) }),
        filePattern: (name: string) => name.startsWith('important-')
      };

      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });
      (fs.readdir as jest.Mock).mockResolvedValue([
        createDirent('important-file.md', false),
        createDirent('ignored-file.md', false)
      ]);
      (fs.readFile as jest.Mock).mockResolvedValue('content');
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      const result = await parser.parseDirectory('/plugin', config);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('important-file.md');
    });
  });
});
