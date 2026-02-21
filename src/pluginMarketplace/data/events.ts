// vscode-extension/src/pluginMarketplace/data/events.ts

import { EventEmitter } from 'events';
import { Disposable } from 'vscode';
import { StoreEvent, PluginStatusChangeEvent, PluginDetailUpdateEvent } from './types';

class StoreEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // 支持多个监听器
  }

  // 发射市场变更事件
  emitMarketplaceChange() {
    this.emit(StoreEvent.MarketplaceChange);
  }

  // 发射插件状态变更事件
  emitPluginStatusChange(event: PluginStatusChangeEvent) {
    this.emit(StoreEvent.PluginStatusChange, event);
  }

  // 发射插件详情更新事件
  emitPluginDetailUpdate(event: PluginDetailUpdateEvent) {
    this.emit(StoreEvent.PluginDetailUpdate, event);
  }

  // 订阅事件，返回 VS Code Disposable
  onEvent(event: StoreEvent, callback: (...args: any[]) => void): Disposable {
    this.on(event, callback);
    return new Disposable(() => this.off(event, callback));
  }
}

// 单例导出
export const storeEvents = new StoreEventEmitter();
