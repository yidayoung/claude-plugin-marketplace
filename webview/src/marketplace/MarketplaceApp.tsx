// vscode-extension/webview/src/marketplace/MarketplaceApp.tsx

import { useState, useEffect } from 'react';
import { Input, Button, Typography, Space, message, Tag, Row, Col } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  StarOutlined
} from '@ant-design/icons';
import { useL10n } from '@/l10n';
import {
  RECOMMENDED_MARKETPLACES,
  MARKETPLACE_CATEGORIES,
  getFeaturedMarkets,
  getMarketplaceCategories
} from './config';

const { Title, Text, Paragraph } = Typography;

// 声明全局 vscode API
declare const vscode: {
  postMessage: (message: any) => void;
  getState: () => any;
  setState: (state: any) => void;
};

interface MarketplaceListMessage {
  type: 'marketplaceList';
  payload: {
    marketplaces: string[];
  };
}

const MarketplaceApp: React.FC = () => {
  const { t } = useL10n();
  const [inputValue, setInputValue] = useState('');
  const [addedMarketplaces, setAddedMarketplaces] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);
  const categories = getMarketplaceCategories();

  // 监听来自 extension 的消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data as MarketplaceListMessage;
      if (msg.type === 'marketplaceList') {
        setAddedMarketplaces(new Set(msg.payload.marketplaces));
      }
    };

    window.addEventListener('message', handleMessage);

    // 发送 ready 消息通知 extension 已准备好
    vscode.postMessage({ type: 'ready' });

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // 添加自定义市场
  const handleAddMarketplace = async () => {
    const source = inputValue.trim();
    if (!source) {
      message.warning(t('marketplace.discover.inputPlaceholder'));
      return;
    }

    setLoading('custom');
    vscode.postMessage({
      type: 'addMarketplace',
      payload: { source }
    });
    setInputValue('');
    setLoading(null);
  };

  // 添加推荐市场
  const handleAddRecommended = async (source: string, id: string) => {
    setLoading(id);
    vscode.postMessage({
      type: 'addRecommendedMarketplace',
      payload: { source }
    });
    setLoading(null);
  };

  // 检查市场是否已添加
  const isMarketplaceAdded = (source: string): boolean => {
    const name = source.includes('/') ? source.split('/').pop() : source;
    return addedMarketplaces.has(name || '');
  };

  // 渲染市场卡片
  const renderMarketCard = (market: typeof RECOMMENDED_MARKETPLACES[0]) => {
    const isAdded = isMarketplaceAdded(market.source);
    const isLoading = loading === market.id;
    const categoryConfig = MARKETPLACE_CATEGORIES[market.category || 'community'];

    return (
      <div
        key={market.id}
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.08), 0 4px 10px rgba(0,0,0,0.04)';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.borderColor = categoryConfig.color + '40';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.borderColor = '#E5E7EB';
        }}
      >
        {/* 顶部装饰条 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: categoryConfig.color
          }}
        />

        {/* 精选标签 */}
        {market.featured && (
          <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
            <Tag
              icon={<StarOutlined />}
              style={{
                margin: 0,
                background: '#FEF3C7',
                border: 'none',
                color: '#D97706',
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '4px'
              }}
            >
              {t('marketplace.discover.featured') || '精选'}
            </Tag>
          </div>
        )}

        {/* 主内容区 */}
        <div style={{ marginTop: market.featured ? '16px' : '8px' }}>
          {/* 图标和名称 */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: categoryConfig.color + '15',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                flexShrink: 0
              }}
            >
              {market.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text
                strong
                style={{
                  fontSize: '16px',
                  color: '#111827',
                  display: 'block',
                  marginBottom: '2px'
                }}
              >
                {market.displayName}
              </Text>
              <Text
                type="secondary"
                style={{ fontSize: '12px', color: '#6B7280' }}
              >
                {market.displayNameEn}
              </Text>
            </div>
          </div>

          {/* 分类标签 */}
          <div style={{ marginBottom: '12px' }}>
            <Tag
              style={{
                margin: 0,
                background: categoryConfig.color + '15',
                border: 'none',
                color: categoryConfig.color,
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '4px'
              }}
            >
              {categoryConfig.icon} {categoryConfig.label}
            </Tag>
          </div>

          {/* 描述 */}
          <Paragraph
            style={{
              margin: '0 0 12px 0',
              fontSize: '13px',
              color: '#6B7280',
              lineHeight: '1.5',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {market.description}
          </Paragraph>

          {/* 来源 */}
          <Text
            code
            style={{
              fontSize: '11px',
              color: '#9CA3AF',
              background: '#F3F4F6',
              padding: '2px 6px',
              borderRadius: '4px',
              marginBottom: '16px',
              display: 'inline-block'
            }}
          >
            {market.source}
          </Text>

          {/* 操作按钮 */}
          <Button
            type={isAdded ? 'default' : 'primary'}
            size="small"
            icon={isAdded ? <CheckCircleOutlined /> : <PlusOutlined />}
            disabled={isAdded}
            loading={isLoading}
            onClick={() => handleAddRecommended(market.source, market.id)}
            style={{
              width: '100%',
              height: '36px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            {isAdded
              ? (t('marketplace.discover.addedButton') || '已添加')
              : (t('marketplace.discover.addButton') || '添加')
            }
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      padding: '32px',
      maxWidth: '1200px',
      margin: '0 auto',
      background: '#F9FAFB',
      minHeight: '100vh'
    }}>
      {/* 页头 */}
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
            marginBottom: '16px',
            boxShadow: '0 8px 25px rgba(124, 58, 237, 0.25)'
          }}
        >
          <ThunderboltOutlined style={{ fontSize: '32px', color: '#FFFFFF' }} />
        </div>
        <Title
          level={2}
          style={{
            margin: '0 0 8px 0',
            fontSize: '28px',
            fontWeight: 700,
            color: '#111827'
          }}
        >
          {t('marketplace.discover.title') || '发现市场'}
        </Title>
        <Text style={{ fontSize: '15px', color: '#6B7280' }}>
          {t('marketplace.discover.subtitle') || '探索优质插件市场，扩展 Claude Code 的能力'}
        </Text>
      </div>

      {/* 自定义市场添加 */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <Text
            strong
            style={{ fontSize: '15px', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <SearchOutlined />
            {t('marketplace.discover.addCustom') || '添加自定义市场'}
          </Text>
        </div>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder={t('marketplace.discover.inputPlaceholder') || 'owner/repo 或 URL'}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onPressEnter={handleAddMarketplace}
            size="large"
            style={{ height: '44px', borderRadius: '10px 0 0 10px' }}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddMarketplace}
            loading={loading === 'custom'}
            size="large"
            style={{
              height: '44px',
              borderRadius: '0 10px 10px 0',
              paddingLeft: '24px',
              paddingRight: '24px',
              fontSize: '15px'
            }}
          >
            {t('marketplace.discover.addButton') || '添加'}
          </Button>
        </Space.Compact>
      </div>

      {/* 分类筛选 */}
      <div style={{ marginBottom: '24px' }}>
        <Space size={12} wrap>
          {categories.map(cat => (
            <Tag
              key={cat.key}
              style={{
                margin: 0,
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '13px',
                background: '#FFFFFF',
                border: '1px solid #E5E7EB',
                color: '#374151',
                cursor: 'pointer'
              }}
            >
              {cat.icon} {cat.label}
            </Tag>
          ))}
        </Space>
      </div>

      {/* 精选市场 */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '20px'
        }}>
          <StarOutlined style={{ color: '#F59E0B', fontSize: '18px' }} />
          <Text strong style={{ fontSize: '17px', color: '#111827' }}>
            {t('marketplace.discover.featuredMarkets') || '精选市场'}
          </Text>
        </div>
        <Row gutter={[16, 16]}>
          {getFeaturedMarkets().map(market => (
            <Col key={market.id} xs={24} sm={12} lg={8}>
              {renderMarketCard(market)}
            </Col>
          ))}
        </Row>
      </div>

      {/* 全部市场 */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '20px'
        }}>
          <ThunderboltOutlined style={{ color: '#7C3AED', fontSize: '18px' }} />
          <Text strong style={{ fontSize: '17px', color: '#111827' }}>
            {t('marketplace.discover.allMarkets') || '全部市场'}
          </Text>
        </div>
        <Row gutter={[16, 16]}>
          {RECOMMENDED_MARKETPLACES.map(market => (
            <Col key={market.id} xs={24} sm={12} lg={8}>
              {renderMarketCard(market)}
            </Col>
          ))}
        </Row>
      </div>
    </div>
  );
};

export default MarketplaceApp;
