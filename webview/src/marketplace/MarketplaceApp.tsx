// vscode-extension/webview/src/marketplace/MarketplaceApp.tsx

import { useState, useEffect } from 'react';
import { Input, Button, Divider, Typography, Space, Card, message } from 'antd';
import { AppstoreOutlined, PlusOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

// 声明全局 vscode API
declare const vscode: {
  postMessage: (message: any) => void;
  getState: () => any;
  setState: (state: any) => void;
};

// 推荐市场列表
const RECOMMENDED_MARKETPLACES = [
  {
    id: 'anthropics/claude-plugins-official',
    name: 'claude-plugins-official',
    displayName: 'Anthropic 官方插件',
    description: 'Anthropic 官方维护的插件集合',
    source: 'github.com/anthropics/claude-plugins-official',
    icon: '🔷'
  },
  {
    id: 'claude-automation/claude-plugin-marketplace',
    name: 'claude-plugin-marketplace',
    displayName: '社区插件市场',
    description: '社区驱动的插件发现与分享平台',
    source: 'github.com/claude-automation/claude-plugin-marketplace',
    icon: '🌟'
  }
];

interface MarketplaceAppProps {
  t: Record<string, string>;
}

interface MarketplaceListMessage {
  type: 'marketplaceList';
  payload: {
    marketplaces: string[];
  };
}

const MarketplaceApp: React.FC<MarketplaceAppProps> = ({ t }) => {
  const [inputValue, setInputValue] = useState('');
  const [addedMarketplaces, setAddedMarketplaces] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // 监听来自 extension 的消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data as MarketplaceListMessage;
      if (msg.type === 'marketplaceList') {
        setAddedMarketplaces(new Set(msg.payload.marketplaces));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // 添加自定义市场
  const handleAddMarketplace = () => {
    const source = inputValue.trim();
    if (!source) {
      message.warning(t['marketplace.discover.inputPlaceholder'] || '请输入市场来源');
      return;
    }

    setLoading(true);
    vscode.postMessage({
      type: 'addMarketplace',
      payload: { source }
    });
    // 不清空输入，方便用户看到输入的内容
    setLoading(false);
  };

  // 添加推荐市场
  const handleAddRecommended = (source: string) => {
    setLoading(true);
    vscode.postMessage({
      type: 'addRecommendedMarketplace',
      payload: { source }
    });
    setLoading(false);
  };

  // 检查市场是否已添加
  const isMarketplaceAdded = (source: string): boolean => {
    // 从 source 提取市场名称
    const name = source.includes('/') ? source.split('/').pop() : source;
    return addedMarketplaces.has(name || '');
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      {/* 标题 */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={3} style={{ margin: 0 }}>
          <AppstoreOutlined style={{ marginRight: '8px' }} />
          {t['marketplace.discover.title'] || '发现市场'}
        </Title>
      </div>

      {/* 自定义市场添加 */}
      <Card
        title={t['marketplace.discover.addCustom'] || '添加自定义市场'}
        style={{ marginBottom: '24px' }}
      >
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder={t['marketplace.discover.inputPlaceholder'] || 'owner/repo 或 URL'}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onPressEnter={handleAddMarketplace}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddMarketplace}
            loading={loading}
          >
            {t['marketplace.discover.addButton'] || '添加'}
          </Button>
        </Space.Compact>
      </Card>

      <Divider />

      {/* 推荐市场 */}
      <div>
        <Title level={4} style={{ marginBottom: '16px' }}>
          {t['marketplace.discover.recommended'] || '推荐市场'}
        </Title>

        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {RECOMMENDED_MARKETPLACES.map((marketplace) => {
            const isAdded = isMarketplaceAdded(marketplace.source);

            return (
              <Card
                key={marketplace.id}
                size="small"
                extra={
                  <Button
                    type={isAdded ? 'default' : 'primary'}
                    size="small"
                    disabled={isAdded}
                    onClick={() => handleAddRecommended(marketplace.source)}
                  >
                    {isAdded
                      ? (t['marketplace.discover.addedButton'] || '已添加')
                      : (t['marketplace.discover.addButton'] || '添加')
                    }
                  </Button>
                }
              >
                <Space direction="vertical" size={0} style={{ width: '100%' }}>
                  <Text strong style={{ fontSize: '14px' }}>
                    {marketplace.icon} {marketplace.displayName}
                  </Text>
                  <Paragraph style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
                    {marketplace.description}
                  </Paragraph>
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    {marketplace.source}
                  </Text>
                </Space>
              </Card>
            );
          })}
        </Space>
      </div>
    </div>
  );
};

export default MarketplaceApp;
