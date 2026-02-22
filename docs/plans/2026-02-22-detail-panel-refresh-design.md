# 详情面板状态刷新机制设计

**日期**: 2026-02-22
**作者**: Claude
**状态**: 已批准

## 问题背景

当前详情面板的状态刷新存在以下问题：

1. **时序混乱**：`statusUpdate` 事件到达时，React 组件状态可能还未初始化
2. **数据流不一致**：有些地方尝试更新本地状态，有些地方重新拉取数据
3. **前端缓存管理缺失**：前端有自己的状态，但没有统一的失效机制
4. **卸载操作时序错误**：`uninstallPlugin` 传入空字符串导致状态更新失败

## 设计目标

实现一个清晰、一致的状态刷新机制：

- **单一数据源**：所有插件状态由 `PluginDataStore` 维护
- **事件驱动**：状态变更通过事件通知前端
- **失效机制**：前端标记缓存失效，触发重新拉取
- **智能刷新**：面板可见时立即刷新，不可见时延迟刷新

## 架构设计

### 数据流

```
┌─────────────────────────────────────────────────────────────┐
│                    PluginDataStore (Extension)              │
│  - 维护插件详情缓存（5分钟 TTL）                              │
│  - 执行状态变更操作（install/uninstall/enable/disable）       │
│  - 更新内部状态                                              │
│  - 发射 PluginStatusChange 事件                              │
└─────────────────────────────────────────────────────────────┘
                            ↓ 事件通知
┌─────────────────────────────────────────────────────────────┐
│              PluginDetailsPanel (Extension → Webview)         │
│  - 订阅 Store 事件                                            │
│  - 转发 statusUpdate 消息到 webview                            │
│  - 处理 refreshPluginDetail 请求                               │
└─────────────────────────────────────────────────────────────┘
                            ↓ 消息传递
┌─────────────────────────────────────────────────────────────┐
│                    DetailsApp (React Webview)                │
│  - 维护 needsRefresh 失效标记                                  │
│  - 收到 statusUpdate 时标记失效                                │
│  - 如果可见且需要刷新 → 调用 loadPluginDetail()                │
│  - 重新拉取数据并重新渲染                                       │
└─────────────────────────────────────────────────────────────┘
```

### 状态变更流程

```
1. 用户点击"卸载"按钮
2. DetailsApp 发送 uninstallPlugin 消息
3. PluginDetailsPanel 调用 dataStore.uninstallPlugin()
4. PluginDataStore:
   a. 执行 CLI 命令
   b. 查找正确的 marketplace（对于 uninstall）
   c. 更新内部状态（pluginList, installedStatus）
   d. 清除详情缓存（pluginDetails.delete(key)）
   e. 发射 PluginStatusChange 事件
5. PluginDetailsPanel 收到事件，发送 statusUpdate 消息
6. DetailsApp 收到 statusUpdate:
   a. 设置 needsRefresh = true
   b. 如果面板可见 → 立即请求刷新
   c. 如果面板不可见 → 等下次打开时刷新
7. DetailsApp 发送 refreshPluginDetail 消息
8. PluginDetailsPanel 调用 loadPluginDetail(forceRefresh=true)
9. Store 重新加载插件详情（从缓存或数据源）
10. DetailsApp 收到 pluginDetail 消息，更新 UI
```

## 实现细节

### 1. React 组件状态

```typescript
const [plugin, setPlugin] = useState<PluginDetailData | null>(null);
const [needsRefresh, setNeedsRefresh] = useState(false);
const [loading, setLoading] = useState(true);
```

### 2. 事件处理

```typescript
case 'statusUpdate':
  console.log('[DetailsApp] Status changed, marking refresh needed');
  setNeedsRefresh(true);
  // 面板始终可见（WebviewPanel），立即刷新
  requestRefresh();
  break;
```

### 3. 刷新请求

```typescript
const requestRefresh = () => {
  console.log('[DetailsApp] Requesting plugin detail refresh');
  vscode.postMessage({
    type: 'refreshPluginDetail'
  });
};
```

### 4. 数据加载

```typescript
case 'pluginDetail':
  console.log('[DetailsApp] Received plugin detail data');
  setPlugin(message.payload.plugin);
  setNeedsRefresh(false);  // 重置失效标记
  setLoading(false);
  break;
```

### 5. Extension 端修复

**关键修复**：在 `executePluginOperation` 中，对于 `uninstall` 操作：

```typescript
// 对于 uninstall，先查找 marketplace
let effectiveMarketplace = marketplace;
if (operation === 'uninstall') {
  effectiveMarketplace = marketplace || this.findPluginMarketplace(pluginName) || '';
}

// 用正确的 marketplace 更新状态
this.updateInstalledStatus(pluginName, effectiveMarketplace, statusChanges[operation]);

// 然后发射事件
if (effectiveMarketplace) {
  storeEvents.emitPluginStatusChange({...});
}
```

## 优势

✅ **单一数据源**：所有状态都在 Store 中，前端不维护业务状态
✅ **清晰的数据流**：状态变更 → 事件通知 → 失效标记 → 重新拉取
✅ **一致性**：所有操作（install/uninstall/enable/disable）走统一流程
✅ **可维护性**：逻辑清晰，易于理解和调试
✅ **性能优化**：智能刷新，避免不必要的请求

## 测试验证

1. **卸载插件**：侧边栏和详情面板都正确更新
2. **安装插件**：详情面板显示新状态
3. **启用/禁用**：详情面板按钮状态更新
4. **时序验证**：事件到达时组件已初始化

## 后续优化

- 考虑添加面板可见性 API（如果 WebviewPanel 支持）
- 考虑添加防抖机制，避免频繁刷新
- 考虑添加错误处理和重试机制
