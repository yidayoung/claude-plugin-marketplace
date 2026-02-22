/**
 * ContentParser 单元测试
 *
 * 测试 ContentParser 和 parseFrontmatter 函数
 */

import { ContentParser } from '../../src/pluginMarketplace/webview/services/ContentParser';
import { parseFrontmatter } from '../../src/shared/utils/parseUtils';

describe('parseFrontmatter', () => {
  describe('解析 pr-review-toolkit agent 的 frontmatter', () => {
    const codeReviewerContent = `---
name: code-reviewer
description: Use this agent when you need to review code for adherence to project guidelines, style guides, and best practices. This agent should be used proactively after writing or modifying code, especially before committing changes or creating pull requests. It will check for style violations, potential issues, and ensure code follows the established patterns in CLAUDE.md. Also the agent needs to know which files to focus on for the review. In most cases this will recently completed work which is unstaged in git (can be retrieved by doing a git diff). However there can be cases where this is different, make sure to specify this as the agent input when calling the agent. \\n\\nExamples:\\n<example>\\nContext: The user has just implemented a new feature with several TypeScript files.\\nuser: "I've added the new authentication feature. Can you check if everything looks good?"\\nassistant: "I'll use the Task tool to launch the code-reviewer agent to review your recent changes."\\n<commentary>\\nSince the user has completed a feature and wants validation, use the code-reviewer agent to ensure the code meets project standards.\\n</commentary>\\n</example>\\n<example>\\nContext: The assistant has just written a new utility function.\\nuser: "Please create a function to validate email addresses"\\nassistant: "Here's the email validation function:"\\n<function call omitted for brevity>\\nassistant: "Now I'll use the Task tool to launch the code-reviewer agent to review this implementation."\\n<commentary>\\nProactively use the code-reviewer agent after writing new code to catch issues early.\\n</commentary>\\n</example>\\n<example>\\nContext: The user is about to create a PR.\\nuser: "I think I'm ready to create a PR for this feature"\\nassistant: "Before creating the PR, I'll use the Task tool to launch the code-reviewer agent to ensure all code meets our standards."\\n<commentary>\\nProactively review code before PR creation to avoid review comments and iterations.\\n</commentary>\\n</example>
model: opus
color: green
---

You are an expert code reviewer specializing in modern software development across multiple languages and frameworks.`;

    const commentAnalyzerContent = `---
name: comment-analyzer
description: Use this agent when you need to analyze code comments for accuracy, completeness, and long-term maintainability.
model: inherit
color: green
---

You are a meticulous code comment analyzer with deep expertise in technical documentation.`;

    it('应正确解析 code-reviewer 的多行描述', () => {
      const result = parseFrontmatter(codeReviewerContent);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('code-reviewer');
      expect(result?.description).toBeDefined();
      expect(result?.description).toContain('review code for adherence to project guidelines');
      expect(result?.model).toBe('opus');
      expect(result?.color).toBe('green');
    });

    it('应正确解析 comment-analyzer 的描述', () => {
      const result = parseFrontmatter(commentAnalyzerContent);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('comment-analyzer');
      expect(result?.description).toBe('Use this agent when you need to analyze code comments for accuracy, completeness, and long-term maintainability.');
      expect(result?.model).toBe('inherit');
    });

    it('描述应该是非空字符串', () => {
      const result = parseFrontmatter(codeReviewerContent);

      expect(result?.description).toBeTruthy();
      expect(typeof result?.description).toBe('string');
      expect(result?.description.length).toBeGreaterThan(0);
    });
  });

  describe('解析简单 frontmatter', () => {
    it('应解析基本的 frontmatter', () => {
      const content = `---
name: test-skill
description: A simple test skill
---

Content here`;

      const result = parseFrontmatter(content);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('test-skill');
      expect(result?.description).toBe('A simple test skill');
    });

    it('应处理没有 frontmatter 的内容', () => {
      const content = `Just some content without frontmatter`;

      const result = parseFrontmatter(content);

      expect(result).toBeNull();
    });
  });
});

describe('ContentParser - parseAgentMarkdown', () => {
  let parser: ContentParser;

  beforeEach(() => {
    parser = new ContentParser();
  });

  describe('解析 pr-review-toolkit agent 内容', () => {
    const codeReviewerContent = `---
name: code-reviewer
description: Use this agent when you need to review code for adherence to project guidelines, style guides, and best practices.
model: opus
color: green
---

You are an expert code reviewer.`;

    it('应正确解析 code-reviewer agent', () => {
      // 使用私有方法的测试方式 - 通过公共方法测试
      // 由于 parseAgentMarkdown 是私有方法，我们需要通过 parseAgents 来测试
      // 但这需要文件系统，所以我们直接测试解析逻辑

      const frontmatter = parseFrontmatter(codeReviewerContent);

      expect(frontmatter).not.toBeNull();
      expect(frontmatter?.name).toBe('code-reviewer');
      expect(frontmatter?.description).toContain('review code for adherence');
      expect(frontmatter?.model).toBe('opus');
    });
  });
});
