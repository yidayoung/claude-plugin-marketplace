// vscode-extension/webview/src/marketplace/MarketplaceSection.tsx


import { type VSCodeTheme, getVSCodeColors } from './useVSCodeTheme';
import { MarketplaceCard } from './MarketplaceCard';
import { type RecommendedMarketplace } from './config';
import type { ReactNode } from 'react';

const { Text } = Typography;

interface MarketplaceSectionProps {
  title: string;
  icon: ReactNode;
  iconColor: string;
  markets: RecommendedMarketplace[];
  theme: VSCodeTheme;
  addedMarketplaces: Set<string>;
  loading: string | null;
  onAdd: (source: string, name: string) => void;
  onRemove: (name: string) => void;
}

export function MarketplaceSection({
  title,
  icon,
  iconColor,
  markets,
  theme,
  addedMarketplaces,
  loading,
  onAdd,
  onRemove
}: MarketplaceSectionProps) {
  const colors = getVSCodeColors(theme);

  const isMarketplaceAdded = (market: RecommendedMarketplace): boolean => {
    // 尝试多种可能的名称匹配方式
    const possibleNames: string[] = [];

    // 1. 配置中的 name 字段
    if (market.name) {
      possibleNames.push(market.name);
    }

    // 2. 从 source 提取的 repo 部分 (owner/repo -> repo)
    if (market.source.includes('/')) {
      const repoPart = market.source.split('/').pop()!;
      possibleNames.push(repoPart);

      // 3. 从 source 提取的 owner 部分 (owner/repo -> owner)
      const ownerPart = market.source.split('/')[0];
      possibleNames.push(ownerPart);
    } else {
      possibleNames.push(market.source);
    }

    // 4. 从 id 提取 (对于 id 格式为 owner/repo 的情况)
    if (market.id.includes('/')) {
      const ownerFromId = market.id.split('/')[0];
      const repoFromId = market.id.split('/')[1];
      possibleNames.push(ownerFromId);
      possibleNames.push(repoFromId);
    }

    // 检查是否有任何匹配
    return possibleNames.some(name => name && addedMarketplaces.has(name));
  };

  return (
    <div style={{ marginBottom: '32px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '16px'
      }}>
        <span style={{ color: iconColor, fontSize: '16px', display: 'flex', alignItems: 'center' }}>
          {icon}
        </span>
        <Text strong style={{ fontSize: '15px', color: colors.textPrimary }}>
          {title}
        </Text>
      </div>
      <Row gutter={[12, 12]}>
        {markets.map(market => (
          <Col key={market.id} xs={24} sm={12} lg={8}>
            <MarketplaceCard
              market={market}
              isAdded={isMarketplaceAdded(market)}
              isLoading={loading === market.name}
              theme={theme}
              onAdd={onAdd}
              onRemove={onRemove}
            />
          </Col>
        ))}
      </Row>
    </div>
  );
}
