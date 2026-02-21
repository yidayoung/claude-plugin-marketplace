# 插件数据管理重构设计

## 目标

重构插件数据管理系统，实现分层加载、精确缓存失效和事件驱动的数据更新。

## 当前问题

1. **启动时加载过多**: `CacheManager.getAllPlugins()` 会合并所有市场的所有插件，即使只是展示 Sidebar
2. **缓存粒度太粗**: `invalidate()` 清除所有缓存，而实际上只需清除相关插件
3. **详情数据重复解析**: 每次打开详情都重新解析文件（虽然有 5 分钟缓存）
4. **数据层级不清晰**: 市场 → 插件 → 详情（skills/agents 等）三层没有明确分离

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      PluginDataStore                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   内存缓存层                            │  │
│  │  • marketplaces: Map<string, MarketplaceInfo>         │  │
│  │  • pluginList: Map<string, PluginInfo[]>             │  │
│  │  • pluginDetails: Map<string, PluginDetailData>      │  │
│  │  • installedStatus: Map<string, InstalledStatus>     │  │
│  │  • pendingRequests: Map<string, Promise<T>>          │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   事件发射器                            │  │
│  │  • onMarketplaceChange                                │  │
│  │  • onPluginStatusChange (安装/卸载/启用/禁用)          │  │
│  │  • onPluginDetailUpdate                               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        SidebarWebview  PluginDetailsPanel  MessageHandlers
```

### 数据分层

| 数据类型 | 加载时机 | 缓存策略 | 失效条件 |
|---------|---------|---------|---------|
| 市场列表 | VS 启动时 | 内存缓存，永不失效 | 添加/删除市场时 |
| 插件列表（基本信息） | VS 启动时 | 内存缓存，永不失效 | 市场 update 时 |
| 插件详情（含 skills/agents） | 首次打开详情时 | 内存缓存，5 分钟 TTL | 刷新市场时 |
| 安装/启用状态 | VS 启动时 | 内存缓存，永不失效 | 安装/卸载/启用/禁用操作后 |
| GitHub stars | 详情页打开后异步 | 内存缓存，会话期间有效 | 刷新市场时 |

### 请求去重

```typescript
// 防止重复请求的关键实现
private pendingRequests = new Map<string, Promise<any>>();

async getPluginDetail(pluginName: string, marketplace: string) {
  const key = `detail:${pluginName}@${marketplace}`;

  // 如果已有进行中的请求，返回现有 Promise
  if (this.pendingRequests.has(key)) {
    return this.pendingRequests.get(key)!;
  }

  const promise = this.fetchPluginDetail(pluginName, marketplace)
    .finally(() => this.pendingRequests.delete(key));

  this.pendingRequests.set(key, promise);
  return promise;
}
```

### 事件通知机制

```typescript
// 当插件状态改变时，自动通知所有订阅者
async installPlugin(name: string, marketplace: string) {
  await execClaudeCommand(...);

  // 1. 更新缓存
  this.updateInstalledStatus(name, { installed: true });

  // 2. 发射事件
  this.events.emit('pluginStatusChange', {
    pluginName: name,
    marketplace,
    change: 'installed'
  });

  // 3. Sidebar 监听事件 → 刷新树节点
  // 4. 详情页监听事件 → 刷新状态按钮
}
```

## 目录结构

```
src/pluginMarketplace/
├── data/
│   ├── PluginDataStore.ts          # 核心 Store
│   ├── DataLoader.ts                # 数据加载器
│   ├── CacheManager.ts              # 缓存管理（重构）
│   ├── events.ts                    # 事件定义
│   └── types.ts                     # 数据类型定义
├── webview/
│   ├── messages/
│   │   └── handlers.ts              # 使用 Store
│   └── services/
│       ├── PluginDataService.ts     # 简化为 Store 的门面
│       └── PluginDetailsService.ts  # 合并到 DataLoader
└── pluginTreeProvider.ts            # 监听 Store 事件
```

## 核心组件

### PluginDataStore

单一数据源，管理所有插件数据。

**职责:**
- 维护内存缓存
- 提供数据访问接口
- 发射数据变更事件
- 管理进行中的请求（去重）

**主要方法:**
```typescript
class PluginDataStore {
  // 初始化：加载启动时需要的数据
  async initialize(): Promise<void>

  // 市场管理
  getMarketplaces(): MarketplaceInfo[]
  addMarketplace(source: string): Promise<void>
  removeMarketplace(name: string): Promise<void>
  updateMarketplace(name: string): Promise<void>

  // 插件列表（基本信息）
  getPluginList(marketplace?: string): PluginInfo[]
  refreshPluginList(marketplace?: string): Promise<void>

  // 插件详情
  getPluginDetail(name: string, marketplace: string): Promise<PluginDetailData>
  invalidatePluginDetail(name: string, marketplace?: string): void

  // 插件操作
  installPlugin(name: string, marketplace: string, scope: PluginScope): Promise<void>
  uninstallPlugin(name: string): Promise<void>
  enablePlugin(name: string, marketplace: string): Promise<void>
  disablePlugin(name: string, marketplace: string): Promise<void>

  // 事件订阅
  on(event: StoreEvent, callback: (...args: any[]) => void): Disposable
}
```

### DataLoader

负责从文件系统和 CLI 加载数据。

**职责:**
- 解析市场配置文件
- 解析插件详情（README、skills、agents 等）
- 执行 CLI 命令
- 获取 GitHub stars

### CacheManager (重构)

简化为纯粹的缓存管理器，不负责数据加载。

**职责:**
- 管理缓存过期
- 提供缓存读写接口
- 支持精确失效（按 key）

### 事件系统

```typescript
enum StoreEvent {
  MarketplaceChange = 'marketplaceChange',      // 市场列表变更
  PluginStatusChange = 'pluginStatusChange',    // 插件状态变更（安装/卸载/启用/禁用）
  PluginDetailUpdate = 'pluginDetailUpdate',    // 插件详情更新（如 stars 加载完成）
}

interface PluginStatusChangeEvent {
  pluginName: string
  marketplace: string
  change: 'installed' | 'uninstalled' | 'enabled' | 'disabled'
}
```

## 数据流

### 启动流程

```
extension.ts
  └── PluginDataStore.initialize()
      ├── DataLoader.loadMarketplaces()
      │   └── 解析 known_marketplaces.json
      ├── DataLoader.loadInstalledPlugins()
      │   └── 解析 installed_plugins.json + settings.json
      └── DataLoader.loadPluginList()
          └── 遍历市场，解析 marketplace.json

PluginTreeProvider
  └── 订阅 PluginDataStore 事件
```

### 打开详情页流程

```
用户点击插件
  └── PluginDetailsPanel.createOrShow()
      └── PluginDataStore.getPluginDetail(name, marketplace)
          ├── 检查缓存 → 命中则返回
          ├── 检查 pendingRequests → 进行中则返回现有 Promise
          └── 启动新请求
              ├── DataLoader.parsePluginDetail()
              │   ├── 读取 README
              │   ├── 解析 skills/agents/commands/hooks 等
              │   └── 返回详情（不含 stars）
              └── 立即返回详情
                  └── 后台异步：DataLoader.fetchGitHubStars()
                      └── 完成后发射 PluginDetailUpdate 事件
```

### 插件操作流程

```
用户点击安装
  └── MessageHandler.handleInstallPlugin()
      └── PluginDataStore.installPlugin()
          ├── execClaudeCommand('plugin install ...')
          ├── 更新 installedStatus 缓存
          └── 发射 PluginStatusChange 事件
              ├── PluginTreeProvider 收到 → 刷新树节点
              └── PluginDetailsPanel 收到 → 更新按钮状态
```

## 关键设计决策

1. **单一数据源**: 所有数据通过 `PluginDataStore` 访问，避免数据不一致
2. **懒加载详情**: 只有打开详情时才解析 skills/agents 等内容
3. **精确缓存失效**: 操作后只更新相关数据，不调用全局 `invalidate()`
4. **异步 stars 不阻塞**: 发起请求后立即返回详情，后续通过事件更新
5. **请求去重**: 同一数据的并发请求共享同一个 Promise
6. **事件驱动**: 数据变更通过事件通知，各组件自主决定如何响应

## 兼容性

- 保持现有 API 接口不变（`PluginDataService`、`PluginDetailsService` 作为门面）
- 逐步迁移，先实现新 Store，再替换旧实现
- Webview 消息协议保持不变

## 测试策略

1. **单元测试**: DataLoader 的各个解析方法
2. **集成测试**: PluginDataStore 的数据流和事件发射
3. **端到端测试**: 安装/卸载流程，验证 UI 正确更新
