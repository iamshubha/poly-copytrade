'use client';

import { useQuery } from '@tanstack/react-query';
import { Search, TrendingUp, Clock, DollarSign, ArrowUpDown } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

export default function MarketsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('volume');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const { data: markets, isLoading } = useQuery({
        queryKey: ['markets', searchQuery, categoryFilter, sortBy, sortOrder],
        queryFn: async () => {
            const params = new URLSearchParams({
                active: 'true',
                limit: '50',
                sortBy,
                sortOrder,
            });
            
            if (searchQuery) {
                params.append('search', searchQuery);
            }
            
            if (categoryFilter !== 'all') {
                params.append('category', categoryFilter);
            }

            const res = await fetch(`/api/markets?${params}`);
            return res.json();
        },
        refetchInterval: 30000, // Refetch every 30 seconds for real-time data
    });

    const categories = [
        'all',
        'politics',
        'sports',
        'crypto',
        'entertainment',
        'business',
        'science',
        'other',
    ];

    const sortOptions = [
        { value: 'volume', label: 'Volume' },
        { value: 'liquidity', label: 'Liquidity' },
        { value: 'end_date', label: 'End Date' },
        { value: 'created_at', label: 'Recently Created' },
    ];

    const toggleSortOrder = () => {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Markets</h1>
                <p className="text-gray-600 mt-1">
                    Browse and trade on active prediction markets
                </p>
            </div>

            {/* Filters */}
            <div className="card space-y-4">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search markets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                </div>

                {/* Categories */}
                <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                        <button
                            key={category}
                            onClick={() => setCategoryFilter(category)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                categoryFilter === category
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Sorting Controls */}
                <div className="flex items-center gap-4 pt-2 border-t">
                    <span className="text-sm font-medium text-gray-700">Sort by:</span>
                    <div className="flex items-center gap-2 flex-1">
                        {sortOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setSortBy(option.value)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    sortBy === option.value
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                        <button
                            onClick={toggleSortOrder}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex items-center gap-1"
                            title={sortOrder === 'asc' ? 'Sort Ascending' : 'Sort Descending'}
                        >
                            <ArrowUpDown className="h-4 w-4" />
                            {sortOrder === 'asc' ? '↑' : '↓'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Markets Grid */}
            {isLoading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="text-gray-600 mt-4">Loading markets...</p>
                </div>
            ) : markets?.data?.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {markets.data.map((market: any) => {
                        const hasId = !!market.id;
                        const CardWrapper: any = hasId ? Link : 'div';
                        const cardProps = hasId
                            ? { href: `/dashboard/markets/${market.id}` }
                            : {};
                        return (
                        <CardWrapper
                            key={market.id || market.title}
                            {...cardProps}
                            className={`card hover:shadow-lg transition-shadow ${!hasId ? 'opacity-95 cursor-default' : ''}`}
                        >
                            {/* Market Image */}
                            {market.imageUrl && (
                                <img
                                    src={market.imageUrl}
                                    alt={market.title}
                                    className="w-full h-48 object-cover rounded-lg mb-4"
                                />
                            )}

                            {/* Market Title */}
                            <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2">
                                {market.title}
                            </h3>

                            {!hasId && (
                                <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-1 inline-block mb-2">
                                    Detail view unavailable for this market
                                </p>
                            )}

                            {/* Market Description */}
                            {market.description && (
                                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                    {market.description}
                                </p>
                            )}

                            {/* Market Stats */}
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="flex items-center text-sm">
                                    <DollarSign className="h-4 w-4 text-gray-400 mr-1" />
                                    <span className="text-gray-600">
                                        Vol: ${(market.volume / 1000).toFixed(1)}k
                                    </span>
                                </div>
                                <div className="flex items-center text-sm">
                                    <TrendingUp className="h-4 w-4 text-gray-400 mr-1" />
                                    <span className="text-gray-600">
                                        Liq: ${(market.liquidity / 1000).toFixed(1)}k
                                    </span>
                                </div>
                            </div>

                            {/* Market Prices */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                    <p className="text-xs text-gray-600 mb-1">Yes</p>
                                    <p className="text-lg font-bold text-green-600">
                                        {(market.outcomesPrices[0] * 100).toFixed(1)}¢
                                    </p>
                                </div>
                                <div className="flex-1 text-right">
                                    <p className="text-xs text-gray-600 mb-1">No</p>
                                    <p className="text-lg font-bold text-red-600">
                                        {(market.outcomesPrices[1] * 100).toFixed(1)}¢
                                    </p>
                                </div>
                            </div>

                            {/* End Date */}
                            {market.endDate && (
                                <div className="flex items-center text-sm text-gray-500 mt-3">
                                    <Clock className="h-4 w-4 mr-1" />
                                    <span>
                                        Ends {new Date(market.endDate).toLocaleDateString()}
                                    </span>
                                </div>
                            )}

                            {/* Category Tags */}
                            {market.category && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-primary-100 text-primary-800">
                                        {market.category}
                                    </span>
                                    {market.tags?.slice(0, 2).map((tag: string) => (
                                        <span
                                            key={tag}
                                            className="inline-flex px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </CardWrapper>
                        );
                    })}
                </div>
            ) : (
                <div className="card text-center py-12">
                    <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No markets found
                    </h3>
                    <p className="text-gray-600">
                        Try adjusting your search or filter criteria
                    </p>
                    <div className="mt-4">
                        <button
                            onClick={() => { setSearchQuery(''); setCategoryFilter('all'); }}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                        >
                            Reset filters
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
