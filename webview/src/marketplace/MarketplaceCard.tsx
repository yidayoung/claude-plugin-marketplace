// vscode-extension/webview/src/marketplace/MarketplaceCard.tsx

import { Button, Typography, Tag, Card, Flex } from 'antd';
import { DeleteOutlined, PlusOutlined, GithubOutlined, StarOutlined, LinkOutlined } from '@ant-design/icons';
import { useL10n } from '@/l10n';
import { MARKETPLACE_CATEGORIES, type LocalizedMarketplace } from './config';
import { getVSCodeColors, type VSCodeTheme } from './useVSCodeTheme';

const { Text, Paragraph } = Typography;

// 声明全局 vscode API
declare const vscode: {
  postMessage: (message: any) => void;
};

// 格式化星数显示
function formatStars(stars: number): string {
  if (stars >= 1000) {
    return (stars / 1000).toFixed(1) + 'k';
  }
  return stars.toString();
}

interface MarketplaceCardProps {
  market: LocalizedMarketplace;
  isAdded: boolean;
  isLoading: boolean;
  theme: VSCodeTheme;
  onAdd: (source: string, name: string) => void;
  onRemove: (name: string) => void;
}

export function MarketplaceCard({ market, isAdded, isLoading, theme, onAdd, onRemove }: MarketplaceCardProps) {
  const { t, locale } = useL10n();
  const colors = getVSCodeColors(theme);
  const categoryConfig = MARKETPLACE_CATEGORIES[market.category || 'community' as keyof typeof MARKETPLACE_CATEGORIES];

  // 获取本地化的分类标签
  const getCategoryLabel = (): string => {
    if (locale === 'zh-cn') {
      return categoryConfig.label;
    }
    return categoryConfig.labelEn;
  };

  const handleOpenUrl = () => {
    vscode.postMessage({
      type: 'openExternal',
      payload: { url: market.url }
    });
  };

  return (
    <Card
      size="small"
      style={{
        borderColor: colors.cardBorder,
        background: colors.cardBackground,
        boxShadow: colors.shadow,
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
      styles={{
        body: { padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }
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
            color={categoryConfig.color}
            style={{ margin: 0, fontSize: '10px', padding: '2px 6px' }}
          >
            {t('marketplace.discover.featured')}
          </Tag>
        </div>
      )}

      {/* 主内容区 */}
      <div style={{ marginTop: market.featured ? '12px' : '8px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* 图标和名称行 */}
        <Flex justify="space-between" align="start" style={{ marginBottom: '8px' }}>
          <Flex align="center" gap="small" style={{ flex: 1, minWidth: 0 }}>
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
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text strong style={{ fontSize: '14px' }} ellipsis={{ tooltip: market.displayName }}>
                {market.displayName}
              </Text>
              {market.stars !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <StarOutlined style={{ fontSize: '11px', color: '#F59E0B' }} />
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    {formatStars(market.stars)}
                  </Text>
                </div>
              )}
            </div>
          </Flex>

          {/* GitHub 链接图标 */}
          <Button
            type="text"
            icon={<GithubOutlined />}
            onClick={handleOpenUrl}
            style={{ color: colors.textSecondary, flexShrink: 0 }}
            title={market.url}
          />
        </Flex>

        {/* 分类标签 */}
        <div style={{ marginBottom: '8px' }}>
          <Tag color={categoryConfig.color} style={{ margin: 0, fontSize: '10px' }}>
            {categoryConfig.icon} {getCategoryLabel()}
          </Tag>
        </div>

        {/* 描述 */}
        <Paragraph
          type="secondary"
          style={{
            margin: '0 0 12px 0',
            fontSize: '12px',
            minHeight: '40px',
            maxHeight: '40px',
            lineHeight: '20px'
          }}
          ellipsis={{ rows: 2 }}
        >
          {market.description}
        </Paragraph>

        {/* 操作按钮 */}
        <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
          <Button
            size="small"
            icon={<LinkOutlined />}
            onClick={handleOpenUrl}
            style={{ flex: 1 }}
          >
            View
          </Button>
          {isAdded ? (
            <Button
              size="small"
              icon={<DeleteOutlined />}
              loading={isLoading}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(market.name);
              }}
              style={{ flex: 1 }}
            >
              {t('marketplace.discover.uninstallButton')}
            </Button>
          ) : (
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              loading={isLoading}
              onClick={(e) => {
                e.stopPropagation();
                onAdd(market.source, market.name);
              }}
              style={{ flex: 1 }}
            >
              {t('marketplace.discover.addButton')}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
