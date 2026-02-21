# GitHub 星标加载优化实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 修复 GitHub 星标获取逻辑,使其带缓存、异步加载、不阻塞插件信息展示

**架构:**
1. 添加 GitHub 星标独立缓存层(1小时TTL)
2. 星标获取改为异步后台进行,带5秒超时
3. 前端显示:未获取显示"加载中",获取失败不显示星标
4. 移除星标获取对README的依赖条件

**技术栈:** TypeScript, Node.js fetch, VS Code Extension API, React

---

## 问题分析总结

**根本原因:**
- `fetchGitHubStars()` 在网络问题时会超时(无超时设置)
- 失败后返回 `0`,导致所有插件显示相同星数
- 星标获取依赖 `!readme` 条件,应该独立获取
- 无缓存机制,每次都请求GitHub API
- 同步 await 阻塞整个插件详情加载

**影响范围:**
- 文件: `vscode-extension/src/pluginMarketplace/webview/services/PluginDetailsService.ts`
- 文件: `vscode-extension/webview/src/details/DetailHeader.tsx`
- 类型: `vscode-extension/src/pluginMarketplace/webview/messages/types.ts`

---

## Task 1: 添加星标缓存结构和类型定义

**文件:**
- 修改: `vscode-extension/src/pluginMarketplace/webview/messages/types.ts:276-280`

**目标:** 修改 `RepositoryInfo` 类型,使 `stars` 可以表示三种状态

**步骤 1: 修改类型定义**

在 `types.ts` 中修改 `RepositoryInfo` 接口:

```typescript
/**
 * 仓库信息
 */
export interface RepositoryInfo {
  type: 'github' | 'gitlab' | 'other';
  url: string;
  stars?: number | null;  // undefined: 未尝试获取 | null: 获取失败 | number: 星标数
}
```

**步骤 2: 提交**

```bash
git add vscode-extension/src/pluginMarketplace/webview/messages/types.ts
git commit -m "refactor: update RepositoryInfo.stars type to support loading state"
```

---

## Task 2: 添加星标缓存层到 PluginDetailsService

**文件:**
- 修改: `vscode-extension/src/pluginMarketplace/webview/services/PluginDetailsService.ts:32-40`

**目标:** 添加星标缓存实例变量

**步骤 1: 添加缓存结构**

在类顶部添加缓存接口和变量:

```typescript
/**
 * GitHub 星标缓存条目
 */
interface StarsCacheEntry {
  stars: number | null;  // null 表示获取失败
  timestamp: number;
}

export class PluginDetailsService {
  // ... 现有变量 ...
  // GitHub 星标缓存，键为 "owner/repo"，缓存时间更长（1小时）
  private starsCache = new Map<string, StarsCacheEntry>();
  private readonly STARS_CACHE_TTL = 60 * 60 * 1000;
  // GitHub API 请求超时时间（5秒）
  private readonly GITHUB_API_TIMEOUT = 5000;
```

**步骤 2: 提交**

```bash
git add vscode-extension/src/pluginMarketplace/webview/services/PluginDetailsService.ts
git commit -m "feat: add stars cache to PluginDetailsService"
```

---

## Task 3: 重构 fetchGitHubStars 方法

**文件:**
- 修改: `vscode-extension/src/pluginMarketplace/webview/services/PluginDetailsService.ts:559-570`

**目标:** 添加缓存、超时、返回 null 表示失败

**步骤 1: 完全重写方法**

```typescript
/**
 * 获取 GitHub stars 数(带缓存和超时)
 * @returns number: 星标数 | null: 获取失败
 */
private async fetchGitHubStars(owner: string, repo: string): Promise<number | null> {
  const cacheKey = `${owner}/${repo}`;

  // 检查缓存
  const cached = this.starsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < this.STARS_CACHE_TTL) {
    return cached.stars;
  }

  try {
    // 使用 Promise.race 添加超时控制
    const response = await Promise.race([
      fetch(`https://api.github.com/repos/${owner}/${repo}`),
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), this.GITHUB_API_TIMEOUT)
      )
    ]) as Response;

    if (response.ok) {
      const data = (await response.json()) as { stargazers_count?: number };
      const stars = data.stargazers_count ?? null;

      // 更新缓存(即使是 null 也缓存,避免重复请求失败的仓库)
      this.starsCache.set(cacheKey, {
        stars,
        timestamp: Date.now()
      });

      return stars;
    }
  } catch (error) {
    console.log(`[PluginDetailsService] Failed to fetch stars for ${cacheKey}:`, error);
  }

  // 请求失败,缓存 null 避免重复请求
  this.starsCache.set(cacheKey, {
    stars: null,
    timestamp: Date.now()
  });

  return null;
}
```

**步骤 2: 提交**

```bash
git add vscode-extension/src/pluginMarketplace/webview/services/PluginDetailsService.ts
git commit -m "refactor: add cache and timeout to fetchGitHubStars"
```

---

## Task 4: 移除星标获取对 README 的依赖

**文件:**
- 修改: `vscode-extension/src/pluginMarketplace/webview/services/PluginDetailsService.ts:338-351`

**目标:** 只要有 GitHub 仓库就异步获取星标,不等待结果

**步骤 1: 重构 getRemotePluginDetail 中的星标获取逻辑**

找到这段代码(约第 338-351 行):

```typescript
// 如果本地没有找到，尝试从 GitHub 获取 README
if (!readme && market.source.source === 'github' && market.source.repo) {
  const t7 = Date.now();
  const repoInfo = this.parseGitHubRepo(market.source.repo);
  readme = await this.fetchGitHubReadme(repoInfo.owner, repoInfo.repo, pluginName);
  if (!repository) {
    repository = {
      type: 'github',
      url: `https://github.com/${repoInfo.owner}/${repoInfo.repo}`,
      stars: await this.fetchGitHubStars(repoInfo.owner, repoInfo.repo)
    };
  }
  console.log(`[PluginDetailsService] GitHub fetch took ${Date.now() - t7}ms`);
}
```

替换为:

```typescript
// 如果本地没有找到，尝试从 GitHub 获取 README
if (!readme && market.source.source === 'github' && market.source.repo) {
  const t7 = Date.now();
  const repoInfo = this.parseGitHubRepo(market.source.repo);
  readme = await this.fetchGitHubReadme(repoInfo.owner, repoInfo.repo, pluginName);
  console.log(`[PluginDetailsService] GitHub README fetch took ${Date.now() - t7}ms`);
}

// 如果是 GitHub 市场,异步获取星标(不阻塞)
if (market.source.source === 'github' && market.source.repo) {
  const repoInfo = this.parseGitHubRepo(market.source.repo);
  if (!repository) {
    repository = {
      type: 'github',
      url: `https://github.com/${repoInfo.owner}/${repoInfo.repo}`
    };
  }

  // 异步获取星标,不等待结果
  this.fetchGitHubStars(repoInfo.owner, repoInfo.repo)
    .then(stars => {
      if (repository) {
        repository.stars = stars;
      }
    })
    .catch(() => {
      // 错误已在 fetchGitHubStars 中处理
    });
}
```

**步骤 2: 提交**

```bash
git add vscode-extension/src/pluginMarketplace/webview/services/PluginDetailsService.ts
git commit -m "refactor: make stars fetching async and independent from README"
```

---

## Task 5: 更新前端显示逻辑

**文件:**
- 修改: `vscode-extension/webview/src/details/DetailHeader.tsx:92-96`

**目标:** 区分 undefined(未获取) 和 null(获取失败) 的显示

**步骤 1: 修改星标显示逻辑**

找到这段代码(约第 89-97 行):

```typescript
<Text type="secondary" style={{ fontSize: 13 }}>
  {plugin.author && `作者: ${plugin.author} · `}
  来自 {plugin.marketplace}
  {plugin.repository?.stars && (
    <span>
      {' '}· <StarFilled style={{ color: '#faad14' }} /> {plugin.repository.stars}
    </span>
  )}
</Text>
```

替换为:

```typescript
<Text type="secondary" style={{ fontSize: 13 }}>
  {plugin.author && `作者: ${plugin.author} · `}
  来自 {plugin.marketplace}
  {plugin.repository?.stars === undefined && (
    <span style={{ color: 'var(--vscode-descriptionForeground)' }}>
      {' '}· 星标加载中...
    </span>
  )}
  {plugin.repository?.stars !== undefined && plugin.repository.stars !== null && (
    <span>
      {' '}· <StarFilled style={{ color: '#faad14' }} /> {plugin.repository.stars}
    </span>
  )}
</Text>
```

**步骤 2: 重新构建 webview**

```bash
npm run build-webview
```

**步骤 3: 提交**

```bash
git add vscode-extension/webview/src/details/DetailHeader.tsx
git add vscode-extension/webview/dist
git commit -m "feat: distinguish loading state for GitHub stars in UI"
```

---

## Task 6: 清理缓存方法(可选)

**文件:**
- 修改: `vscode-extension/src/pluginMarketplace/webview/services/PluginDetailsService.ts:76-90`

**目标:** 在 `clearCache` 方法中同时清理星标缓存

**步骤 1: 更新 clearCache 方法**

```typescript
/**
 * 清除指定插件的缓存
 */
clearCache(pluginName: string, marketplace?: string): void {
  if (marketplace) {
    this.cache.delete(`${pluginName}@${marketplace}`);
    this.localPathCache.delete(`${pluginName}@${marketplace}`);
  } else {
    // 清除所有匹配的缓存
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${pluginName}@`)) {
        this.cache.delete(key);
        this.localPathCache.delete(key);
      }
    }
  }
}

/**
 * 清除星标缓存(用于手动刷新)
 */
clearStarsCache(owner?: string, repo?: string): void {
  if (owner && repo) {
    this.starsCache.delete(`${owner}/${repo}`);
  } else {
    this.starsCache.clear();
  }
}
```

**步骤 2: 提交**

```bash
git add vscode-extension/src/pluginMarketplace/webview/services/PluginDetailsService.ts
git commit -m "feat: add clearStarsCache method"
```

---

## Task 7: 验证和测试

**文件:** 新建测试文件或手动验证

**步骤 1: 手动验证场景**

1. **正常情况(网络良好)**
   - 打开插件详情
   - 预期: 先显示"星标加载中...",然后显示实际星数
   - 刷新插件详情
   - 预期: 星标立即显示(使用缓存)

2. **网络问题情况**
   - 断开网络或设置代理限制
   - 打开插件详情
   - 预期: 插件信息正常显示,星标显示"加载中..."然后消失(不显示0)

3. **多个插件**
   - 浏览多个来自同一仓库的插件
   - 预期: 第二个插件立即显示星标(缓存生效)

4. **已安装插件**
   - 查看已安装插件详情
   - 预期: 星标异步加载,不影响插件信息显示

**步骤 2: 检查控制台日志**

打开开发者工具,检查:
- `[PluginDetailsService] Failed to fetch stars` 日志应该出现(网络问题时)
- GitHub API 请求应该在 5 秒内超时
- 不应该有长时间阻塞

**步骤 3: 性能验证**

- 测量插件详情加载时间(应该 < 2秒)
- 测量星标获取超时时间(应该 ≈ 5秒)

---

## 验收标准

✅ 插件详情加载不因网络问题而延迟
✅ 网络失败时星标不显示 0,而是不显示
✅ 星标有加载状态提示("星标加载中...")
✅ 同一仓库的插件共享缓存(1小时有效)
✅ GitHub API 请求有 5 秒超时
✅ 星标获取失败不影响插件信息展示

---

## 实施注意事项

1. **保持向后兼容** - `stars?: number | null` 保持可选,旧代码仍可工作
2. **渐进增强** - 星标是补充信息,不是核心功能
3. **错误静默** - 网络失败不影响用户使用,只在控制台记录日志
4. **缓存持久化** - 当前缓存仅在内存中,重启 VS Code 后会丢失(可后续改进)

---

## 后续优化建议(非本次范围)

1. 持久化星标缓存到 `globalState`
2. 支持手动刷新星标
3. 添加星标获取失败的 toast 提示(可选)
4. 支持代理配置访问 GitHub API
