'use client';

import { Search, SlidersHorizontal, Bookmark } from 'lucide-react';

interface MarketFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
  selectedTopic: string;
  availableTopics: { tag: string; count: number }[];
  onTopicSelect: (topic: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

export function MarketFilters({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategorySelect,
  selectedTopic,
  availableTopics,
  onTopicSelect,
  sortBy,
  onSortChange,
}: MarketFiltersProps) {
  // Main category navigation (like Polymarket's top nav)
  const categories = [
    { id: 'all', label: 'All', icon: null },
    { id: 'politics', label: 'Politics', icon: null },
    { id: 'sports', label: 'Sports', icon: null },
    { id: 'crypto', label: 'Crypto', icon: null },
    { id: 'finance', label: 'Finance', icon: null },
    { id: 'geopolitics', label: 'Geopolitics', icon: null },
    { id: 'earnings', label: 'Earnings', icon: null },
    { id: 'tech', label: 'Tech', icon: null },
    { id: 'culture', label: 'Culture', icon: null },
    { id: 'world', label: 'World', icon: null },
    { id: 'economy', label: 'Economy', icon: null },
    { id: 'elections', label: 'Elections', icon: null },
  ];

  // Frequency/Sort options (Trending, Breaking, New)
  const sortOptions = [
    { value: 'volume', label: 'Trending', icon: '📈' },
    { value: 'created_at', label: 'New', icon: '🆕' },
    { value: 'end_date', label: 'Ending Soon', icon: '⏰' },
  ];

  return (
    <div className="space-y-0 border-b border-gray-200 bg-white">
      {/* Top Row: Frequency/Sort tabs (Trending, New, etc.) */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-1">
          {sortOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onSortChange(option.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                sortBy === option.value
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span className="mr-1">{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>

        {/* Search and Actions */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search polymarket"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 pr-4 py-2 w-64 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
            <SlidersHorizontal className="h-5 w-5" />
          </button>
          <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
            <Bookmark className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Category Navigation (Politics, Sports, Crypto, etc.) */}
      <div className="flex items-center gap-6 px-4 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategorySelect(category.id)}
            className={`py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              selectedCategory === category.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Topic Pills (All, Trump, Venezuela, etc.) */}
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-300">
          <button
            onClick={() => onTopicSelect('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              selectedTopic === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {availableTopics.slice(0, 20).map(({ tag }) => (
            <button
              key={tag}
              onClick={() => onTopicSelect(tag)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedTopic === tag
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
