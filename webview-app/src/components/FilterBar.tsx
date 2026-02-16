import React from 'react';
import { Select, Space } from 'antd';
import { FilterOutlined, AppstoreOutlined } from '@ant-design/icons';

interface FilterBarProps {
  status: string;
  marketplace: string;
  marketplaces: string[];
  onFilterChange: (status: string, marketplace: string) => void;
}

const statusOptions = [
  { label: '全部', value: 'all' },
  { label: '已安装', value: 'installed' },
  { label: '未安装', value: 'not-installed' },
  { label: '可升级', value: 'upgradable' }
];

const FilterBar: React.FC<FilterBarProps> = ({
  status,
  marketplace,
  marketplaces,
  onFilterChange
}) => {
  const handleStatusChange = (value: string) => {
    onFilterChange(value, marketplace);
  };

  const handleMarketplaceChange = (value: string) => {
    onFilterChange(status, value);
  };

  const marketplaceOptions = marketplaces.map(mp => ({
    label: mp === 'all' ? '全部市场' : mp,
    value: mp
  }));

  return (
    <Space className="filter-bar-antd">
      <Select
        value={status}
        onChange={handleStatusChange}
        options={statusOptions}
        prefix={<FilterOutlined />}
        style={{ minWidth: 120 }}
        placeholder="状态筛选"
      />
      <Select
        value={marketplace}
        onChange={handleMarketplaceChange}
        options={marketplaceOptions}
        prefix={<AppstoreOutlined />}
        style={{ minWidth: 140 }}
        placeholder="市场筛选"
      />
    </Space>
  );
};

export default FilterBar;
