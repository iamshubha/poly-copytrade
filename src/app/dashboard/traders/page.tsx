'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Globe, Database } from 'lucide-react';
import { useState } from 'react';
import { TraderCard } from '@/components/features/TraderCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

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
            <Card>
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Data Source:</p>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => setSource('polymarket')}
                                variant={source === 'polymarket' ? 'primary' : 'outline'}
                                size="sm"
                            >
                                <Globe className="h-4 w-4 mr-2" />
                                Polymarket Leaders
                            </Button>
                            <Button
                                onClick={() => setSource('internal')}
                                variant={source === 'internal' ? 'primary' : 'outline'}
                                size="sm"
                            >
                                <Database className="h-4 w-4 mr-2" />
                                Internal Users
                            </Button>
                        </div>
                    </div>
                    <div className="text-sm text-gray-600">
                        {traders.length} traders found
                    </div>
                </div>
            </Card>

            {/* Sort Options */}
            <Card>
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
                        <Button
                            key={option.value}
                            onClick={() => setSortBy(option.value as any)}
                            variant={sortBy === option.value ? 'primary' : 'outline'}
                            size="sm"
                        >
                            {option.label}
                        </Button>
                    ))}
                </div>
            </Card>

            {/* Traders List */}
            {isLoading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="text-gray-600 mt-4">Loading traders...</p>
                </div>
            ) : traders.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {traders.map((trader: any) => (
                        <TraderCard
                            key={trader.id}
                            trader={trader}
                            onFollow={handleFollow}
                            isFollowPending={followMutation.isPending}
                            source={source}
                        />
                    ))}
                </div>
            ) : (
                <Card className="text-center py-12">
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
                </Card>
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
