'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, UserCheck, TrendingUp, Activity, DollarSign, Users, Globe, Database } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

export default function TradersPage() {
    const queryClient = useQueryClient();
    const [sortBy, setSortBy] = useState<'roi' | 'volume' | 'trades' | 'winRate' | 'followers' | 'profit'>('volume');
    const [source, setSource] = useState<'polymarket' | 'internal'>('polymarket');

    // Get Polymarket traders (using Data API)
    const { data: polymarketData, isLoading: polymarketLoading } = useQuery({
        queryKey: ['polymarket-traders', sortBy],
        queryFn: async () => {
            const res = await fetch(`/api/traders/polymarket?minVolume=100&minTrades=5&sortBy=${sortBy}&limit=50`);
            if (!res.ok) throw new Error('Failed to fetch Polymarket traders');
            return res.json();
        },
        enabled: source === 'polymarket',
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Get internal traders
    const { data: internalData, isLoading: internalLoading } = useQuery({
        queryKey: ['traders', sortBy],
        queryFn: async () => {
            const res = await fetch(`/api/traders?sortBy=${sortBy}&limit=50`);
            if (!res.ok) throw new Error('Failed to fetch internal traders');
            return res.json();
        },
        enabled: source === 'internal',
    });

    // Follow mutation
    const followMutation = useMutation({
        mutationFn: async (followingId: string) => {
            const res = await fetch('/api/follow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ followingId }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to follow trader');
            }

            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['traders'] });
            queryClient.invalidateQueries({ queryKey: ['following'] });
            queryClient.invalidateQueries({ queryKey: ['polymarket-traders'] });
        },
    });

    const handleFollow = (traderId: string) => {
        followMutation.mutate(traderId);
    };

    const isLoading = source === 'polymarket' ? polymarketLoading : internalLoading;

    // Process data based on source
    const traders = source === 'polymarket'
        ? (polymarketData?.data?.traders || [])
        : (internalData?.data?.traders || []);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Discover Traders</h1>
                <p className="text-gray-600 mt-1">
                    Find and follow successful Polymarket traders to copy their strategies
                </p>
            </div>

            {/* Source Toggle */}
            <div className="card">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Data Source:</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSource('polymarket')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${source === 'polymarket'
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                <Globe className="h-4 w-4 mr-2" />
                                Polymarket Leaders
                            </button>
                            <button
                                onClick={() => setSource('internal')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${source === 'internal'
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                <Database className="h-4 w-4 mr-2" />
                                Internal Users
                            </button>
                        </div>
                    </div>
                    <div className="text-sm text-gray-600">
                        {traders.length} traders found
                    </div>
                </div>
            </div>

            {/* Sort Options */}
            <div className="card">
                <p className="text-sm font-medium text-gray-700 mb-2">Sort by:</p>
                <div className="flex gap-2 flex-wrap">
                    {(source === 'polymarket' ? [
                        { value: 'roi', label: 'ROI (Return on Investment)' },
                        { value: 'volume', label: 'Trading Volume' },
                        { value: 'trades', label: 'Number of Trades' },
                        { value: 'winRate', label: 'Win Rate' },
                    ] : [
                        { value: 'followers', label: 'Most Followers' },
                        { value: 'trades', label: 'Most Trades' },
                        { value: 'volume', label: 'Highest Volume' },
                        { value: 'winRate', label: 'Win Rate' },
                        { value: 'profit', label: 'Profit' },
                    ]).map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setSortBy(option.value as any)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${sortBy === option.value
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Traders List */}
            {isLoading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="text-gray-600 mt-4">Loading traders...</p>
                </div>
            ) : traders.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {traders.map((trader: any) => {
                        const traderROI = trader.stats?.roi || 0;

                        return (
                            <div key={trader.id} className="card hover:shadow-lg transition-shadow">
                                {/* Trader Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center">
                                        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-2xl">
                                            {trader.address.slice(2, 4).toUpperCase()}
                                        </div>
                                        <div className="ml-4">
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-lg text-gray-900">
                                                    {trader.address.slice(0, 6)}...{trader.address.slice(-4)}
                                                </p>
                                                {trader.isPolymarket && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                        <Globe className="h-3 w-3 mr-1" />
                                                        Polymarket
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                {trader.createdAt
                                                    ? `Member since ${new Date(trader.createdAt).toLocaleDateString()}`
                                                    : 'Polymarket Trader'
                                                }
                                            </p>
                                        </div>
                                    </div>

                                    {source === 'internal' ? (
                                        trader.isFollowing ? (
                                            <Link
                                                href="/dashboard/following"
                                                className="btn-secondary flex items-center text-sm"
                                            >
                                                <UserCheck className="h-4 w-4 mr-1" />
                                                Following
                                            </Link>
                                        ) : (
                                            <button
                                                onClick={() => handleFollow(trader.id)}
                                                disabled={followMutation.isPending}
                                                className="btn-primary flex items-center text-sm disabled:opacity-50"
                                            >
                                                <UserPlus className="h-4 w-4 mr-1" />
                                                Follow
                                            </button>
                                        )
                                    ) : (
                                        <button
                                            onClick={() => handleFollow(trader.address)}
                                            disabled={followMutation.isPending}
                                            className="btn-primary flex items-center text-sm disabled:opacity-50"
                                        >
                                            <UserPlus className="h-4 w-4 mr-1" />
                                            Follow
                                        </button>
                                    )}
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {trader.isPolymarket && (
                                        <div className="p-3 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg">
                                            <div className="flex items-center text-xs text-yellow-700 mb-1">
                                                <TrendingUp className="h-3 w-3 mr-1" />
                                                ROI
                                            </div>
                                            <p className={`text-lg font-bold ${traderROI >= 0 ? 'text-yellow-900' : 'text-red-900'
                                                }`}>
                                                {traderROI >= 0 ? '+' : ''}{traderROI.toFixed(2)}%
                                            </p>
                                        </div>
                                    )}

                                    {source === 'internal' && (
                                        <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                                            <div className="flex items-center text-xs text-blue-700 mb-1">
                                                <Users className="h-3 w-3 mr-1" />
                                                Followers
                                            </div>
                                            <p className="text-lg font-bold text-blue-900">
                                                {trader.stats.followers}
                                            </p>
                                        </div>
                                    )}

                                    <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                                        <div className="flex items-center text-xs text-purple-700 mb-1">
                                            <Activity className="h-3 w-3 mr-1" />
                                            Trades
                                        </div>
                                        <p className="text-lg font-bold text-purple-900">
                                            {trader.stats.totalTrades}
                                        </p>
                                    </div>

                                    <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                                        <div className="flex items-center text-xs text-green-700 mb-1">
                                            <TrendingUp className="h-3 w-3 mr-1" />
                                            Win Rate
                                        </div>
                                        <p className="text-lg font-bold text-green-900">
                                            {trader.stats.winRate.toFixed(1)}%
                                        </p>
                                    </div>

                                    <div className="p-3 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg">
                                        <div className="flex items-center text-xs text-indigo-700 mb-1">
                                            <DollarSign className="h-3 w-3 mr-1" />
                                            Volume
                                        </div>
                                        <p className="text-lg font-bold text-indigo-900">
                                            ${(trader.stats.totalVolume || 0).toLocaleString()}
                                        </p>
                                    </div>

                                    {source === 'internal' && (
                                        <>
                                            <div className="p-3 bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg">
                                                <div className="flex items-center text-xs text-pink-700 mb-1">
                                                    <TrendingUp className="h-3 w-3 mr-1" />
                                                    Total Profit
                                                </div>
                                                <p className={`text-lg font-bold ${trader.stats.totalProfit >= 0
                                                        ? 'text-pink-900'
                                                        : 'text-red-900'
                                                    }`}>
                                                    ${trader.stats.totalProfit.toFixed(2)}
                                                </p>
                                            </div>

                                            <div className="p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
                                                <div className="flex items-center text-xs text-orange-700 mb-1">
                                                    <Activity className="h-3 w-3 mr-1" />
                                                    Avg Profit
                                                </div>
                                                <p className={`text-lg font-bold ${trader.stats.avgProfit >= 0
                                                        ? 'text-orange-900'
                                                        : 'text-red-900'
                                                    }`}>
                                                    ${trader.stats.avgProfit.toFixed(2)}
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Performance Badge */}
                                {(trader.isPolymarket && traderROI > 20) && (
                                    <div className="mt-3 flex items-center gap-2">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                            ⭐ Top ROI
                                        </span>
                                    </div>
                                )}
                                {(source === 'internal' && trader.stats.winRate > 60) && (
                                    <div className="mt-3 flex items-center gap-2">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            🔥 High Performer
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="card text-center py-12">
                    <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No Traders Available
                    </h3>
                    <p className="text-gray-600">
                        {source === 'polymarket'
                            ? 'Unable to load Polymarket leaders at the moment. Please try again later.'
                            : 'There are no traders with active trades yet. Check back later!'
                        }
                    </p>
                </div>
            )}

            {followMutation.isError && (
                <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
                    <p className="text-red-800 text-sm">
                        {followMutation.error.message}
                    </p>
                </div>
            )}

            {followMutation.isSuccess && (
                <div className="fixed bottom-4 right-4 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg">
                    <p className="text-green-800 text-sm">
                        Successfully followed trader!
                    </p>
                </div>
            )}
        </div>
    );
}
