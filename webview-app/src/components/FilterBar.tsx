import React from 'react';
import './FilterBar.css';

interface FilterBarProps {
  status: string;
  marketplace: string;
  marketplaces: string[];
  onFilterChange: (status: string, marketplace: string) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  status,
  marketplace,
  marketplaces,
  onFilterChange
}) => {
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange(e.target.value, marketplace);
  };

  const handleMarketplaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange(status, e.target.value);
  };

  return (
    <div className="filter-bar">
      <select value={status} onChange={handleStatusChange} className="filter-select">
        <option value="all">全部</option>
        <option value="installed">已安装</option>
        <option value="not-installed">未安装</option>
        <option value="upgradable">可升级</option>
      </select>

      <select value={marketplace} onChange={handleMarketplaceChange} className="filter-select">
        {marketplaces.map(mp => (
          <option key={mp} value={mp}>
            {mp === 'all' ? '全部市场' : mp}
          </option>
        ))}
      </select>
    </div>
  );
};

export default FilterBar;