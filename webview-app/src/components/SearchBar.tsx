import React from 'react';
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

interface SearchBarProps {
  onSearch: (keyword: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [keyword, setKeyword] = React.useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setKeyword(value);
    onSearch(value);
  };

  return (
    <Input
      placeholder="搜索插件名称、描述..."
      value={keyword}
      onChange={handleInputChange}
      prefix={<SearchOutlined />}
      allowClear
      size="large"
      className="search-bar-antd"
    />
  );
};

export default SearchBar;
