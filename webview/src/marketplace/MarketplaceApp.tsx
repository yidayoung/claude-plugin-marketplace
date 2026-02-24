// vscode-extension/webview/src/marketplace/MarketplaceApp.tsx

import { useState, useEffect } from 'react';
import { Input, Button, Typography, Space, message, Tag, Row, Col } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  DeleteOutlined,
  GithubOutlined,
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

// VS Code 主题变量类型
type VSCodeTheme = 'light' | 'dark' | 'hc-light' | 'hc-dark';

// 获取 VS Code 主题颜色
function getVSCodeColors(theme: VSCodeTheme = 'dark') {
  const colors = {
    light: {
      background: 'var(--vscode-editor-background)',
      foreground: 'var(--vscode-editor-foreground)',
      cardBackground: 'var(--vscode-editor-background)',
      cardBorder: 'var(--vscode-sideBar-border)',
      textPrimary: 'var(--vscode-editor-foreground)',
      textSecondary: 'var(--vscode-descriptionForeground)',
      inputBackground: 'var(--vscode-input-background)',
      inputBorder: 'var(--vscode-input-border)',
      buttonPrimary: 'var(--vscode-button-background)',
      buttonPrimaryHover: 'var(--vscode-button-hoverBackground)',
      shadow: 'rgba(0, 0, 0, 0.08)',
      shadowHover: 'rgba(0, 0, 0, 0.15)'
    },
    dark: {
      background: 'var(--vscode-editor-background)',
      foreground: 'var(--vscode-editor-foreground)',
      cardBackground: 'var(--vscode-sideBar-background)',
      cardBorder: 'var(--vscode-sideBar-border)',
      textPrimary: 'var(--vscode-sideBar-foreground)',
      textSecondary: 'var(--vscode-descriptionForeground)',
      inputBackground: 'var(--vscode-input-background)',
      inputBorder: 'var(--vscode-input-border)',
      buttonPrimary: 'var(--vscode-button-background)',
      buttonPrimaryHover: 'var(--vscode-button-hoverBackground)',
      shadow: 'rgba(0, 0, 0, 0.2)',
      shadowHover: 'rgba(0, 0, 0, 0.4)'
    },
    'hc-light': {
      background: 'var(--vscode-editor-background)',
      foreground: 'var(--vscode-editor-foreground)',
      cardBackground: 'var(--vscode-editor-background)',
      cardBorder: 'var(--vscode-contrastActiveBorder)',
      textPrimary: 'var(--vscode-editor-foreground)',
      textSecondary: 'var(--vscode-descriptionForeground)',
      inputBackground: 'var(--vscode-editor-background)',
      inputBorder: 'var(--vscode-contrastActiveBorder)',
      buttonPrimary: 'var(--vscode-button-background)',
      buttonPrimaryHover: 'var(--vscode-button-hoverBackground)',
      shadow: 'transparent',
      shadowHover: 'transparent'
    },
    'hc-dark': {
      background: 'var(--vscode-editor-background)',
      foreground: 'var(--vscode-editor-foreground)',
      cardBackground: 'var(--vscode-editor-background)',
      cardBorder: 'var(--vscode-contrastActiveBorder)',
      textPrimary: 'var(--vscode-editor-foreground)',
      textSecondary: 'var(--vscode-descriptionForeground)',
      inputBackground: 'var(--vscode-editor-background)',
      inputBorder: 'var(--vscode-contrastActiveBorder)',
      buttonPrimary: 'var(--vscode-button-background)',
      buttonPrimaryHover: 'var(--vscode-button-hoverBackground)',
      shadow: 'transparent',
      shadowHover: 'transparent'
    }
  };
  return colors[theme] || colors.dark;
}

const MarketplaceApp: React.FC = () => {
  const { t } = useL10n();
  const [inputValue, setInputValue] = useState('');
  const [addedMarketplaces, setAddedMarketplaces] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);
  const [theme, setTheme] = useState<VSCodeTheme>('dark');
  const categories = getMarketplaceCategories();
  const colors = getVSCodeColors(theme);

  // 检测主题变化
  useEffect(() => {
    const detectTheme = () => {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(isDark ? 'dark' : 'light');
    };
    detectTheme();
    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', detectTheme);
    return () => {
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', detectTheme);
    };
  }, []);

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

  // 卸载市场
  const handleUninstallMarketplace = async (marketName: string) => {
    setLoading(marketName);
    vscode.postMessage({
      type: 'removeMarketplace',
      payload: { marketplaceName: marketName }
    });
    setLoading(null);
  };

  // 打开 GitHub 链接
  const handleOpenUrl = (url: string) => {
    vscode.postMessage({
      type: 'openExternal',
      payload: { url }
    });
  };

  // 检查市场是否已添加
  const isMarketplaceAdded = (source: string): boolean => {
    const name = source.includes('/') ? source.split('/').pop() : source;
    return addedMarketplaces.has(name || '');
  };

  // 渲染市场卡片
  const renderMarketCard = (market: typeof RECOMMENDED_MARKETPLACES[0]) => {
    const isAdded = isMarketplaceAdded(market.source);
    const isLoading = loading === market.name;
    const categoryConfig = MARKETPLACE_CATEGORIES[market.category || 'community'];

    return (
      <div
        key={market.id}
        style={{
          background: colors.cardBackground,
          borderRadius: '12px',
          padding: '16px',
          border: `1px solid ${colors.cardBorder}`,
          boxShadow: colors.shadow,
          transition: 'all 0.2s ease',
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = colors.shadowHover;
          e.currentTarget.style.borderColor = categoryConfig.color + '60';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = colors.shadow;
          e.currentTarget.style.borderColor = colors.cardBorder;
        }}
      >
        {/* 顶部装饰条 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: categoryConfig.color
          }}
        />

        {/* 精选标签 */}
        {market.featured && (
          <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
            <Tag
              icon={<StarOutlined />}
              style={{
                margin: 0,
                background: categoryConfig.color + '25',
                border: 'none',
                color: categoryConfig.color,
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '4px'
              }}
            >
              {t('marketplace.discover.featured') || '精选'}
            </Tag>
          </div>
        )}

        {/* 主内容区 */}
        <div style={{ marginTop: market.featured ? '12px' : '8px' }}>
          {/* 图标和名称行 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: categoryConfig.color + '20',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  flexShrink: 0
                }}
              >
                {market.icon}
              </div>
              <div>
                <Text
                  strong
                  style={{
                    fontSize: '14px',
                    color: colors.textPrimary,
                    display: 'block',
                    lineHeight: '1.4'
                  }}
                >
                  {market.displayName}
                </Text>
                <Text
                  style={{ fontSize: '11px', color: colors.textSecondary }}
                >
                  {market.displayNameEn}
                </Text>
              </div>
            </div>

            {/* GitHub 链接图标 */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleOpenUrl(market.url);
              }}
              style={{
                color: colors.textSecondary,
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = categoryConfig.color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = colors.textSecondary;
              }}
            >
              <GithubOutlined style={{ fontSize: '16px' }} />
            </div>
          </div>

          {/* 分类标签 */}
          <div style={{ marginBottom: '8px' }}>
            <Tag
              style={{
                margin: 0,
                background: categoryConfig.color + '20',
                border: 'none',
                color: categoryConfig.color,
                fontSize: '10px',
                padding: '1px 6px',
                borderRadius: '4px'
              }}
            >
              {categoryConfig.icon} {categoryConfig.label}
            </Tag>
          </div>

          {/* 描述 - 固定高度 */}
          <Paragraph
            style={{
              margin: '0 0 12px 0',
              fontSize: '12px',
              color: colors.textSecondary,
              lineHeight: '1.5',
              height: '36px',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {market.description}
          </Paragraph>

          {/* 底部操作栏 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* 来源文本 - 缩短显示 */}
            <Text
              code
              style={{
                fontSize: '10px',
                color: colors.textSecondary,
                background: colors.inputBackground,
                padding: '2px 6px',
                borderRadius: '4px',
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {market.source}
            </Text>

            {/* 操作按钮 */}
            {isAdded ? (
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                disabled={isLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  handleUninstallMarketplace(market.name);
                }}
                style={{
                  height: '28px',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
              >
                {t('marketplace.discover.uninstallButton') || '卸载'}
              </Button>
            ) : (
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                disabled={isLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddRecommended(market.source, market.id);
                }}
                style={{
                  height: '28px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  minWidth: '60px'
                }}
              >
                {t('marketplace.discover.addButton') || '添加'}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      padding: '24px',
      maxWidth: '1100px',
      margin: '0 auto',
      background: colors.background,
      minHeight: '100vh'
    }}>
      {/* 页头 */}
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: `linear-gradient(135deg, ${colors.cardBackground === '#1e1e1e' ? '#7C3AED' : '#7C3AED'} 0%, ${colors.cardBackground === '#1e1e1e' ? '#A78BFA' : '#A78BFA'} 100%)`,
            marginBottom: '12px',
            boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
          }}
        >
          <ThunderboltOutlined style={{ fontSize: '24px', color: '#FFFFFF' }} />
        </div>
        <Title
          level={2}
          style={{
            margin: '0 0 4px 0',
            fontSize: '24px',
            fontWeight: 600,
            color: colors.textPrimary
          }}
        >
          {t('marketplace.discover.title') || '发现市场'}
        </Title>
        <Text style={{ fontSize: '13px', color: colors.textSecondary }}>
          {t('marketplace.discover.subtitle') || '探索优质插件市场，扩展 Claude Code 的能力'}
        </Text>
      </div>

      {/* 自定义市场添加 */}
      <div
        style={{
          background: colors.cardBackground,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          border: `1px solid ${colors.cardBorder}`,
          boxShadow: colors.shadow
        }}
      >
        <div style={{ marginBottom: '12px' }}>
          <Text
            strong
            style={{ fontSize: '14px', color: colors.textPrimary, display: 'flex', alignItems: 'center', gap: '8px' }}
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
            style={{
              background: colors.inputBackground,
              border: `1px solid ${colors.inputBorder}`,
              borderRadius: '8px 0 0 8px',
              color: colors.textPrimary
            }}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddMarketplace}
            loading={loading === 'custom'}
            size="large"
            style={{
              height: '38px',
              borderRadius: '0 8px 8px 0',
              paddingLeft: '16px',
              paddingRight: '16px',
              fontSize: '14px'
            }}
          >
            {t('marketplace.discover.addButton') || '添加'}
          </Button>
        </Space.Compact>
      </div>

      {/* 分类筛选 */}
      <div style={{ marginBottom: '20px' }}>
        <Space size={8} wrap>
          {categories.map(cat => (
            <Tag
              key={cat.key}
              style={{
                margin: 0,
                padding: '4px 12px',
                borderRadius: '16px',
                fontSize: '12px',
                background: colors.cardBackground,
                border: `1px solid ${colors.cardBorder}`,
                color: colors.textSecondary
              }}
            >
              {cat.icon} {cat.label}
            </Tag>
          ))}
        </Space>
      </div>

      {/* 精选市场 */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '16px'
        }}>
          <StarOutlined style={{ color: '#F59E0B', fontSize: '16px' }} />
          <Text strong style={{ fontSize: '15px', color: colors.textPrimary }}>
            {t('marketplace.discover.featuredMarkets') || '精选市场'}
          </Text>
        </div>
        <Row gutter={[12, 12]}>
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
          gap: '6px',
          marginBottom: '16px'
        }}>
          <ThunderboltOutlined style={{ color: '#7C3AED', fontSize: '16px' }} />
          <Text strong style={{ fontSize: '15px', color: colors.textPrimary }}>
            {t('marketplace.discover.allMarkets') || '全部市场'}
          </Text>
        </div>
        <Row gutter={[12, 12]}>
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
