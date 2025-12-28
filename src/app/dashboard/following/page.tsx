'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, UserMinus, TrendingUp, Activity, Settings } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

export default function FollowingPage() {
    const queryClient = useQueryClient();
    const [newFollowAddress, setNewFollowAddress] = useState('');

    // Get following list
    const { data: following, isLoading } = useQuery({
        queryKey: ['following'],
        queryFn: async () => {
            const res = await fetch('/api/follow?type=following');
            return res.json();
        },
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
            queryClient.invalidateQueries({ queryKey: ['following'] });
            setNewFollowAddress('');
        },
    });

    // Unfollow mutation
    const unfollowMutation = useMutation({
        mutationFn: async (followId: string) => {
            const res = await fetch(`/api/follow/${followId}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to unfollow trader');
            }

            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['following'] });
        },
    });

    const handleFollow = () => {
        if (!newFollowAddress.trim()) return;
        followMutation.mutate(newFollowAddress.trim());
    };

    const handleUnfollow = (followId: string) => {
        if (confirm('Are you sure you want to unfollow this trader?')) {
            unfollowMutation.mutate(followId);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Following</h1>
                <p className="text-gray-600 mt-1">
                    Manage traders you're following and copy trading settings
                </p>
            </div>

            {/* Add New Trader */}
            <div className="card">
                <h2 className="text-xl font-semibold mb-4">Follow a Trader</h2>
                <div className="flex gap-4">
                    <input
                        type="text"
                        placeholder="Enter trader wallet address (0x...)"
                        value={newFollowAddress}
                        onChange={(e) => setNewFollowAddress(e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <button
                        onClick={handleFollow}
                        disabled={!newFollowAddress.trim() || followMutation.isPending}
                        className="btn-primary whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <UserPlus className="h-5 w-5 mr-2" />
                        Follow
                    </button>
                </div>
                {followMutation.isError && (
                    <p className="text-red-600 text-sm mt-2">
                        {followMutation.error.message}
                    </p>
                )}
                {followMutation.isSuccess && (
                    <p className="text-green-600 text-sm mt-2">
                        Successfully followed trader!
                    </p>
                )}
            </div>

            {/* Following List */}
            {isLoading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="text-gray-600 mt-4">Loading...</p>
                </div>
            ) : following?.data?.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                    {following.data.map((follow: any) => (
                        <div key={follow.id} className="card">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    {/* Trader Info */}
                                    <div className="flex items-center mb-4">
                                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-lg">
                                            {follow.following?.address?.slice(2, 4).toUpperCase()}
                                        </div>
                                        <div className="ml-4">
                                            <p className="font-semibold text-gray-900">
                                                {follow.following?.address?.slice(0, 6)}...
                                                {follow.following?.address?.slice(-4)}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                Following since{' '}
                                                {new Date(follow.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Copy Settings */}
                                    {follow.copySettings && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                            <div className="p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-center text-sm text-gray-600 mb-1">
                                                    <Activity className="h-4 w-4 mr-1" />
                                                    Status
                                                </div>
                                                <p className="font-semibold">
                                                    {follow.copySettings.enabled ? (
                                                        <span className="text-green-600">Active</span>
                                                    ) : (
                                                        <span className="text-gray-600">Paused</span>
                                                    )}
                                                </p>
                                            </div>

                                            <div className="p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-center text-sm text-gray-600 mb-1">
                                                    <TrendingUp className="h-4 w-4 mr-1" />
                                                    Copy Amount
                                                </div>
                                                <p className="font-semibold">
                                                    {follow.copySettings.copyPercentage}% of trades
                                                </p>
                                            </div>

                                            <div className="p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-center text-sm text-gray-600 mb-1">
                                                    <Settings className="h-4 w-4 mr-1" />
                                                    Delay
                                                </div>
                                                <p className="font-semibold">
                                                    {follow.copySettings.delayMs
                                                        ? `${follow.copySettings.delayMs}ms`
                                                        : 'Instant'}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Market Filters */}
                                    {follow.copySettings && (
                                        <div className="flex flex-wrap gap-2">
                                            {follow.copySettings.onlyMarkets?.length > 0 && (
                                                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                                    {follow.copySettings.onlyMarkets.length} markets only
                                                </span>
                                            )}
                                            {follow.copySettings.excludeMarkets?.length > 0 && (
                                                <span className="text-xs px-2 py-1 bg-orange-100 text-orange-800 rounded">
                                                    {follow.copySettings.excludeMarkets.length} markets excluded
                                                </span>
                                            )}
                                            {follow.copySettings.onlyOutcomes?.length > 0 && (
                                                <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">
                                                    Only {follow.copySettings.onlyOutcomes.join(', ')}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-2 ml-4">
                                    <Link
                                        href={`/dashboard/following/${follow.id}`}
                                        className="btn-secondary text-sm"
                                    >
                                        <Settings className="h-4 w-4 mr-1" />
                                        Configure
                                    </Link>
                                    <button
                                        onClick={() => handleUnfollow(follow.id)}
                                        disabled={unfollowMutation.isPending}
                                        className="btn-secondary text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                                    >
                                        <UserMinus className="h-4 w-4 mr-1" />
                                        Unfollow
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card text-center py-12">
                    <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Not following anyone yet
                    </h3>
                    <p className="text-gray-600 mb-6">
                        Start by entering a trader's wallet address above
                    </p>
                </div>
            )}
        </div>
    );
}
