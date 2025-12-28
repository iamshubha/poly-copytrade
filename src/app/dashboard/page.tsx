'use client';

import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Activity, DollarSign } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
    const { data: session } = useSession();

    const { data: stats } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            // Fetch dashboard statistics
            const [tradesRes, followingRes, copiedTradesRes] = await Promise.all([
                fetch('/api/trades?limit=10'),
                fetch('/api/follow?type=following'),
                fetch('/api/trades/copied?limit=10'),
            ]);

            const [trades, following, copiedTrades] = await Promise.all([
                tradesRes.json(),
                followingRes.json(),
                copiedTradesRes.json(),
            ]);

            return { trades, following, copiedTrades };
        },
    });

    const { data: markets } = useQuery({
        queryKey: ['markets'],
        queryFn: async () => {
            const res = await fetch('/api/markets?limit=5&active=true');
            return res.json();
        },
    });

    return (
        <div className="space-y-6">
            {/* Welcome */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Welcome back!</h1>
                <p className="text-gray-600 mt-1">
                    {session?.user?.address.slice(0, 6)}...{session?.user?.address.slice(-4)}
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Trades</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {stats?.trades?.data?.total || 0}
                            </p>
                        </div>
                        <Activity className="h-12 w-12 text-primary-600 opacity-20" />
                    </div>
                    <div className="mt-2 flex items-center text-sm">
                        <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                        <span className="text-green-500">12%</span>
                        <span className="text-gray-600 ml-1">vs last week</span>
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Following</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {stats?.following?.data?.length || 0}
                            </p>
                        </div>
                        <TrendingUp className="h-12 w-12 text-blue-600 opacity-20" />
                    </div>
                    <div className="mt-2">
                        <Link
                            href="/dashboard/following"
                            className="text-sm text-primary-600 hover:text-primary-700"
                        >
                            Manage →
                        </Link>
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Copied Trades</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {stats?.copiedTrades?.data?.total || 0}
                            </p>
                        </div>
                        <DollarSign className="h-12 w-12 text-green-600 opacity-20" />
                    </div>
                    <div className="mt-2 flex items-center text-sm">
                        <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                        <span className="text-green-500">8%</span>
                        <span className="text-gray-600 ml-1">success rate</span>
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total P&L</p>
                            <p className="text-2xl font-bold text-green-600">+$1,234</p>
                        </div>
                        <TrendingUp className="h-12 w-12 text-green-600 opacity-20" />
                    </div>
                    <div className="mt-2 flex items-center text-sm">
                        <span className="text-gray-600">All time</span>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Trades */}
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold">Recent Trades</h2>
                        <Link
                            href="/dashboard/trades"
                            className="text-sm text-primary-600 hover:text-primary-700"
                        >
                            View all →
                        </Link>
                    </div>

                    {stats?.trades?.data?.trades?.length > 0 ? (
                        <div className="space-y-3">
                            {stats.trades.data.trades.slice(0, 5).map((trade: any) => (
                                <div
                                    key={trade.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                >
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900 truncate">
                                            {trade.marketTitle}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            {trade.side} {trade.outcomeName} · ${trade.amount}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span
                                            className={`inline-flex px-2 py-1 text-xs font-medium rounded ${trade.status === 'COMPLETED'
                                                    ? 'bg-green-100 text-green-800'
                                                    : trade.status === 'FAILED'
                                                        ? 'bg-red-100 text-red-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                }`}
                                        >
                                            {trade.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            No trades yet. Start by following a trader!
                        </div>
                    )}
                </div>

                {/* Active Markets */}
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold">Active Markets</h2>
                        <Link
                            href="/dashboard/markets"
                            className="text-sm text-primary-600 hover:text-primary-700"
                        >
                            View all →
                        </Link>
                    </div>

                    {markets?.data?.length > 0 ? (
                        <div className="space-y-3">
                            {markets.data.slice(0, 5).map((market: any) => (
                                <Link
                                    key={market.id}
                                    href={`/dashboard/markets/${market.id}`}
                                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <p className="font-medium text-gray-900 truncate">
                                        {market.title}
                                    </p>
                                    <div className="flex items-center justify-between mt-2 text-sm">
                                        <span className="text-gray-600">
                                            Volume: ${(market.volume / 1000).toFixed(1)}k
                                        </span>
                                        <div className="flex space-x-2">
                                            <span className="text-green-600 font-medium">
                                                Yes {(market.outcomesPrices[0] * 100).toFixed(0)}¢
                                            </span>
                                            <span className="text-red-600 font-medium">
                                                No {(market.outcomesPrices[1] * 100).toFixed(0)}¢
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            Loading markets...
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="card">
                <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link
                        href="/dashboard/following"
                        className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-600 hover:bg-primary-50 transition-colors text-center"
                    >
                        <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary-600" />
                        <p className="font-medium text-gray-900">Follow a Trader</p>
                        <p className="text-sm text-gray-600 mt-1">
                            Start copying successful strategies
                        </p>
                    </Link>

                    <Link
                        href="/dashboard/markets"
                        className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-600 hover:bg-primary-50 transition-colors text-center"
                    >
                        <Activity className="h-8 w-8 mx-auto mb-2 text-primary-600" />
                        <p className="font-medium text-gray-900">Browse Markets</p>
                        <p className="text-sm text-gray-600 mt-1">
                            Explore active prediction markets
                        </p>
                    </Link>

                    <Link
                        href="/dashboard/settings"
                        className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-600 hover:bg-primary-50 transition-colors text-center"
                    >
                        <DollarSign className="h-8 w-8 mx-auto mb-2 text-primary-600" />
                        <p className="font-medium text-gray-900">Configure Settings</p>
                        <p className="text-sm text-gray-600 mt-1">
                            Set your risk parameters
                        </p>
                    </Link>
                </div>
            </div>
        </div>
    );
}
