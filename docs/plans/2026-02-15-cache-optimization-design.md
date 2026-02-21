# 缓存优化设计文档

**日期**: 2026-02-15
**作者**: Claude Code
**状态**: 设计阶段

## 问题背景

当前 VSCode 插件市场扩展每次操作都会调用 Claude CLI 命令获取数据，导致：
- 界面卡顿，CLI 启动时间不稳定
- 重复调用 `claude plugin list --json` 等命令
- 用户体验不佳

## 设计目标

1. **快速响应**: 读取操作直接解析本地文件，无 CLI 开销
2. **API 兼容**: 修改操作仍使用 CLI 命令确保数据正确性
3. **简单缓存**: 内存缓存，手动/显示时刷新

## 数据源策略

### 文件路径

| 文件 | 用途 |
|------|------|
| `~/.claude/plugins/installed_plugins.json` | 已安装插件列表 |
| `~/.claude/settings.json` | 用户级别启用状态 |
| `{project}/.claude/settings.local.json` | 项目级别启用状态 |
| `~/.claude/plugins/known_marketplaces.json` | 市场列表 |
| `~/.claude/plugins/marketplaces/{name}/.claude-plugin/marketplace.json` | 市场插件配置 |

### 读取 vs 修改操作

```
读取操作 (文件解析)          修改操作 (CLI)
─────────────────────        ───────────────────
✅ 已安装插件列表              🔧 plugin install
✅ 启用/禁用状态               🔧 plugin uninstall
✅ 市场列表                   🔧 plugin enable
✅ 市场插件列表               🔧 plugin disable
                             🔧 marketplace add
                             🔧 marketplace remove
                             🔧 marketplace update
```

## 架构设计

### CacheManager

新增缓存管理类，负责从文件读取数据：

```typescript
class CacheManager {
  // 缓存
  private installedCache: InstalledPlugin[];
  private enabledCache: Map<string, boolean>;
  private marketplacesCache: MarketplaceInfo[];
  private marketplacePluginsCache: Map<string, PluginInfo[]>;

  // 读取方法
  loadInstalledPlugins(): Promise<InstalledPlugin[]>
  loadEnabledPlugins(): Promise<Map<string, boolean>>
  loadMarketplaces(): Promise<MarketplaceInfo[]>
  loadMarketplacePlugins(name: string): Promise<PluginInfo[]>

  // 合并方法
  getAllPluginsWithStatus(): Promise<PluginInfo[]>

  // 缓存控制
  invalidate(): void
}
```

### PluginDataService

重构数据服务，分离读取和修改操作：

```typescript
class PluginDataService {
  private cache: CacheManager;

  // 读取操作 (文件)
  getInstalledPlugins(): Promise<InstalledPlugin[]>
  getMarketplaces(): Promise<MarketplaceInfo[]>
  getAllPlugins(): Promise<PluginInfo[]>

  // 修改操作 (CLI)
  installPlugin(name, marketplace, scope): Promise<void>
  uninstallPlugin(name): Promise<void>
  enablePlugin(name, marketplace): Promise<void>
  disablePlugin(name, marketplace): Promise<void>
  addMarketplace(source): Promise<void>
  removeMarketplace(name): Promise<void>
  updateMarketplace(name): Promise<void>
}
```

## 类型定义

### 已安装插件 (installed_plugins.json)

```typescript
interface InstalledPluginData {
  version: 2;
  plugins: {
    "name@marketplace": Array<{
      scope: 'user' | 'project' | 'local';
      installPath: string;
      version: string;
      installedAt: string;
      lastUpdated: string;
      gitCommitSha?: string;
    }>;
  };
}
```

### 启用状态 (settings.json)

```typescript
interface SettingsData {
  enabledPlugins?: {
    "name@marketplace": boolean;
  };
}
```

### 市场信息 (known_marketplaces.json)

```typescript
interface KnownMarketplace {
  source: {
    source: 'github' | 'git' | 'directory' | 'url';
    repo?: string;
    path?: string;
    url?: string;
  };
  installLocation: string;
  lastUpdated: string;
  autoUpdate?: boolean;
}
```

### 完整插件状态

```typescript
interface PluginStatus {
  installed: boolean;
  enabled: boolean;      // 新增
  scope?: PluginScope;
  version?: string;
  updateAvailable?: boolean;
}
```

## 刷新策略

| 触发时机 | 行为 |
|---------|------|
| 面板显示时 | 重新读取文件 |
| 手动刷新按钮 | 清除缓存，重新读取 |
| 修改操作后 | 清除缓存，下次读取时重新加载 |

## 实现步骤

1. 创建 `FileParser` 类 - 解析本地 JSON 文件
2. 创建 `CacheManager` 类 - 管理内存缓存
3. 重构 `PluginDataService` - 分离读取和修改操作
4. 更新 Webview 消息处理器 - 支持启用/禁用操作
5. 添加刷新按钮 - 手动刷新功能

## 文件结构

```
src/pluginMarketplace/
├── webview/
│   └── services/
│       ├── PluginDataService.ts      (重构)
│       ├── CacheManager.ts           (新增)
│       └── FileParser.ts             (新增)
└── types.ts                          (更新类型)
```
