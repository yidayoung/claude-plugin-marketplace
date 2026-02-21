# 代码重构设计文档

**日期**: 2026-02-22
**目标**: 优化大文件的可维护性，减少代码重复
**范围**: PluginDetailsService.ts (1286行) 和 SidebarApp.tsx (659行)

---

## 概述

对项目中两个最大文件进行模块化重构：
- **PluginDetailsService.ts**: 职责分离，提取路径解析和内容解析逻辑
- **SidebarApp.tsx**: 提取自定义 hooks 和纯函数，分离渲染与业务逻辑

**设计原则**:
- 单一职责原则
- DRY (Don't Repeat Yourself)
- 向后兼容 - 保持现有 API 不变

---

## 一、PluginDetailsService.ts 重构

### 1.1 当前问题

| 问题 | 位置 | 严重性 |
|------|------|--------|
| 职责过多 - 同时处理缓存、路径查找、文件解析、GitHub API | 整个类 | 高 |
| 解析模式重复 - `parseMcps/parseLsps/parseHooks` 结构相似 | 行 1059-1161 | 中 |
| 路径查找逻辑复杂 - `getPluginPath` 超过 120 行 | 行 479-599 | 中 |

### 1.2 目标架构

```
PluginDetailsService (协调器，~400 行)
    ├── PluginPathResolver (路径查找，~150 行)
    ├── ContentParser (内容解析，~300 行)
    │   └── 使用统一的解析模式消除重复
    └── FileParser (已存在，配置解析)
```

### 1.3 新增模块

#### PluginPathResolver

**文件**: `src/pluginMarketplace/webview/services/PluginPathResolver.ts`

**职责**:
- 在文件系统中查找插件路径
- 支持缓存目录、市场目录、项目目录

**接口**:
```typescript
export class PluginPathResolver {
  async findPluginPath(pluginName: string): Promise<string | null>
  async getLocalMarketPath(pluginName: string, marketplace: string): Promise<string | null>
  private searchInCacheDir(pluginName: string): Promise<string | null>
  private searchInMarketplacesDir(pluginName: string): Promise<string | null>
  private searchInProjectDir(pluginName: string): Promise<string | null>
}
```

#### ContentParser

**文件**: `src/pluginMarketplace/webview/services/ContentParser.ts`

**职责**:
- 解析插件的各种内容 (skills, agents, commands, hooks, mcps, lsps, outputStyles)
- 使用统一的解析模式消除重复

**核心设计** - 统一解析接口:
```typescript
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
}

export class ContentParser {
  async parseDirectory<T>(
    pluginPath: string,
    config: DirectoryParseConfig<T>
  ): Promise<T[]>

  parseSkills(pluginPath: string, configJson?: any): Promise<SkillInfo[]>
  parseAgents(pluginPath: string, configJson?: any): Promise<AgentInfo[]>
  parseCommands(pluginPath: string, configJson?: any): Promise<CommandInfo[]>
  parseHooks(pluginPath: string, configJson?: any): Promise<HookInfo[]>
  parseMcps(pluginPath: string, configJson?: any): Promise<McpInfo[]>
  parseLsps(pluginPath: string, configJson?: any): Promise<LspInfo[]>
  parseOutputStyles(pluginPath: string, configJson?: any): Promise<OutputStyleInfo[]>
}
```

**消除重复示例**:
```typescript
// 重构前：parseMcps 和 parseLsps 有几乎相同的结构
private async parseMcps(pluginPath: string, configJson?: any): Promise<McpInfo[]> {
  const mcps: McpInfo[] = [];
  if (configJson?.mcpServers) {
    if (typeof configJson.mcpServers === 'string') {
      // 读取文件...
    } else if (typeof configJson.mcpServers === 'object') {
      mcps.push(...this.parseMcpConfig(configJson.mcpServers));
    }
  }
  if (mcps.length === 0) {
    const mcpJsonPath = path.join(pluginPath, '.mcp.json');
    // ...
  }
  return mcps;
}

// 重构后：使用统一解析模式
async parseMcps(pluginPath: string, configJson?: any): Promise<McpInfo[]> {
  return this.parseDirectory(pluginPath, {
    defaultPath: '.mcp.json',
    customPaths: this.getCustomPaths(configJson?.mcpServers, pluginPath),
    parser: (path, content) => this.parseMcpConfig(JSON.parse(content), path),
    isInlineConfig: (cfg) => typeof cfg === 'object' && cfg !== null
  });
}
```

### 1.4 重构后的 PluginDetailsService

```typescript
// 行数: 1286 → ~400
export class PluginDetailsService {
  private pathResolver: PluginPathResolver;
  private contentParser: ContentParser;
  private cache: Map<string, DetailCacheEntry>;

  constructor(private context: vscode.ExtensionContext) {
    this.pathResolver = new PluginPathResolver();
    this.contentParser = new ContentParser();
  }

  // 公共 API 保持不变
  async getPluginDetail(name: string, marketplace: string, isInstalled: boolean): Promise<PluginDetailData> {
    const cacheKey = `${name}@${marketplace}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    const data = isInstalled
      ? this.getInstalledPluginDetail(name, marketplace)
      : this.getRemotePluginDetail(name, marketplace);

    this.cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }

  // 委托给专门的服务
  private async getInstalledPluginDetail(name: string, marketplace: string) {
    const pluginPath = await this.pathResolver.findPluginPath(name);
    if (!pluginPath) {
      return this.getRemotePluginDetail(name, marketplace);
    }

    const configJson = await this.readPluginConfig(pluginPath);
    const [readme, skills, agents, ...] = await Promise.all([
      this.readReadme(pluginPath),
      this.contentParser.parseSkills(pluginPath, configJson),
      this.contentParser.parseAgents(pluginPath, configJson),
      // ...
    ]);

    return { /* ... */ };
  }
}
```

---

## 二、SidebarApp.tsx 重构

### 2.1 当前问题

| 问题 | 位置 | 严重性 |
|------|------|--------|
| 渲染与逻辑混合 | 整个组件 | 高 |
| 重复的悬停处理 | `renderPluginItem`, `renderSection` | 中 |
| 状态管理分散 | 多个 useState | 中 |

### 2.2 目标架构

```
SidebarApp.tsx (主组件，~200 行)
    ├── hooks/
    │   ├── usePluginData.ts (数据加载和状态管理)
    │   ├── usePluginFilter.ts (过滤逻辑)
    │   └── useHoverState.ts (悬停状态管理)
    ├── utils/
    │   └── pluginGrouping.ts (分组和排序纯函数)
    └── components/
        ├── PluginItem.tsx (插件项)
        └── PluginSection.tsx (分组)
```

### 2.3 新增模块

#### usePluginData Hook

**文件**: `webview/src/hooks/usePluginData.ts`

**职责**: 管理插件数据的加载和状态

```typescript
export function usePluginData() {
  const [state, setState] = useState<AppState>({
    plugins: [],
    marketplaces: [],
    loading: true,
    error: null,
    filter: { keyword: '', status: 'all', marketplace: 'all' }
  });

  const loadPlugins = useCallback(() => {
    vscode.postMessage({ type: 'getPlugins', payload: {} });
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      switch (event.data.type) {
        case 'plugins':
          setState(prev => ({ ...prev, plugins: event.data.payload.plugins, loading: false }));
          break;
        case 'error':
          setState(prev => ({ ...prev, error: event.data.payload.message, loading: false }));
          break;
        // ...
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return { state, loadPlugins, setState };
}
```

#### usePluginFilter Hook

**文件**: `webview/src/hooks/usePluginFilter.ts`

**职责**: 处理插件过滤和分组逻辑

```typescript
export function usePluginFilter(plugins: PluginData[], filter: FilterState) {
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

  const groupedPlugins = useMemo(() => {
    return groupPlugins(filteredPlugins);
  }, [filteredPlugins]);

  return { filteredPlugins, groupedPlugins };
}

// 纯函数 - 可单独测试
function filterByKeyword(plugins: PluginData[], keyword: string) {
  const lower = keyword.toLowerCase();
  return plugins.filter(p =>
    p.name.toLowerCase().includes(lower) ||
    p.description.toLowerCase().includes(lower)
  );
}

function groupPlugins(plugins: PluginData[]) {
  const installed = plugins.filter(p => p.installed);
  const byMarketplace: Record<string, PluginData[]> = {};

  plugins.forEach(p => {
    if (!byMarketplace[p.marketplace]) {
      byMarketplace[p.marketplace] = [];
    }
    byMarketplace[p.marketplace].push(p);
  });

  return { installed, byMarketplace };
}
```

#### useHoverState Hook

**文件**: `webview/src/hooks/useHoverState.ts`

**职责**: 管理鼠标悬停状态

```typescript
export function useHoverState() {
  const [hoveredItems, setHoveredItems] = useState<Set<string>>(new Set());

  const isHovered = useCallback((id: string) => hoveredItems.has(id), [hoveredItems]);

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

#### PluginItem 组件

**文件**: `webview/src/components/PluginItem.tsx`

**职责**: 渲染单个插件项

```typescript
interface PluginItemProps {
  plugin: PluginData;
  isHovered: boolean;
  onHoverChange: (id: string, hovered: boolean) => void;
  onAction: (action: string, plugin: PluginData) => void;
}

export const PluginItem: React.FC<PluginItemProps> = memo(({
  plugin,
  isHovered,
  onHoverChange,
  onAction
}) => {
  const statusIcon = useMemo(() => getStatusIcon(plugin), [plugin]);
  const actionMenu = useMemo(() => getActionMenu(plugin, onAction), [plugin, onAction]);

  return (
    <div
      className="plugin-item"
      onMouseEnter={() => onHoverChange(`plugin-${plugin.name}`, true)}
      onMouseLeave={() => onHoverChange(`plugin-${plugin.name}`, false)}
    >
      {/* 渲染内容 */}
    </div>
  );
});
```

### 2.4 重构后的 SidebarApp

```typescript
// 行数: 659 → ~200
const SidebarApp: React.FC = () => {
  const { state, loadPlugins, setState } = usePluginData();
  const { groupedPlugins } = usePluginFilter(state.plugins, state.filter);
  const { isHovered, setHovered } = useHoverState();

  const stats = useMemo(() => ({
    installed: state.plugins.filter(p => p.installed).length,
    enabled: state.plugins.filter(p => p.installed && p.enabled !== false).length,
    updatable: state.plugins.filter(p => p.updateAvailable).length,
    total: state.plugins.length
  }), [state.plugins]);

  return (
    <Flex vertical>
      <SearchBar value={state.filter.keyword} onChange={handleSearch} />
      <StatsBar stats={stats} />
      <PluginList groupedPlugins={groupedPlugins} isHovered={isHovered} setHovered={setHovered} />
    </Flex>
  );
};
```

---

## 三、公共工具函数提取

### 3.1 文件操作工具

**文件**: `src/shared/utils/fileUtils.ts`

```typescript
export async function tryReadFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

export async function findFileInPaths(
  fileName: string,
  searchPaths: string[]
): Promise<string | null> {
  for (const basePath of searchPaths) {
    const filePath = path.join(basePath, fileName);
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      continue;
    }
  }
  return null;
}

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

### 3.2 解析工具

**文件**: `src/shared/utils/parseUtils.ts`

```typescript
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

export function parseGitHubRepo(url: string): { owner: string; repo: string } | null {
  const shortMatch = url.match(/^([^/]+)\/([^/]+?)(\.git)?$/);
  if (shortMatch && !url.includes('github.com') && !url.includes(':')) {
    return { owner: shortMatch[1], repo: shortMatch[2].replace(/\.git$/, '') };
  }

  const fullMatch = url.match(/github\.com[:/]([^/]+)\/(.+?)(\.git)?$/);
  if (fullMatch) {
    return { owner: fullMatch[1], repo: fullMatch[2].replace(/\.git$/, '') };
  }

  return null;
}

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

---

## 四、实施计划

### 阶段 1: 提取公共工具函数
- [ ] 创建 `src/shared/utils/` 目录
- [ ] 实现 `fileUtils.ts`
- [ ] 实现 `parseUtils.ts`
- [ ] 添加单元测试

### 阶段 2: 重构 PluginDetailsService
- [ ] 创建 `PluginPathResolver`
- [ ] 创建 `ContentParser` 统一解析模式
- [ ] 重构 `PluginDetailsService` 使用新模块
- [ ] 添加单元测试

### 阶段 3: 重构 SidebarApp
- [ ] 创建 `webview/src/hooks/` 目录
- [ ] 实现 `usePluginData`
- [ ] 实现 `usePluginFilter`
- [ ] 实现 `useHoverState`
- [ ] 创建 `PluginItem` 和 `PluginSection` 组件
- [ ] 重构 `SidebarApp` 使用新 hooks

### 阶段 4: 测试和验证
- [ ] 运行所有测试
- [ ] 手动测试 webview 功能
- [ ] 性能基准测试
- [ ] 更新文档

---

## 五、预期收益

| 指标 | 当前 | 重构后 | 改进 |
|------|------|--------|------|
| PluginDetailsService 行数 | 1286 | ~400 | -69% |
| SidebarApp 行数 | 659 | ~200 | -70% |
| 代码重复 (解析模式) | 6 处相似 | 1 个统一模式 | -83% |
| 可测试函数数 | ~5 | ~20 | +300% |
| 圈复杂度 (平均) | 高 | 中-低 | 显著改善 |

---

## 六、风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 引入 bug | 中 | 完善单元测试，渐进式重构 |
| API 变更影响调用方 | 低 | 保持公共 API 不变 |
| 性能退化 | 低 | 基准测试，优化热点路径 |

---

## 七、后续优化建议

1. **handlers.ts (588 行)**: 可以按消息类型拆分为独立的处理器
2. **PluginDataStore.ts (506 行)**: 可以考虑引入 Repository 模式
3. **类型安全**: 考虑使用 stricter types 替代 `any`
