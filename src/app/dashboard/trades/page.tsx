'use client';

import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';
import { useState } from 'react';

export default function TradesPage() {
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterSide, setFilterSide] = useState<string>('all');

    const { data: trades, isLoading } = useQuery({
        queryKey: ['trades', filterStatus],
        queryFn: async () => {
            const params = new URLSearchParams({
                limit: '100',
            });

            if (filterStatus !== 'all') {
                params.append('status', filterStatus);
            }

            const res = await fetch(`/api/trades?${params}`);
            return res.json();
        },
    });

    const { data: copiedTrades, isLoading: copiedLoading } = useQuery({
        queryKey: ['copiedTrades'],
        queryFn: async () => {
            const res = await fetch('/api/trades/copied?limit=100');
            return res.json();
        },
    });

    const filteredTrades = trades?.data?.trades?.filter((trade: any) => {
        if (filterSide !== 'all' && trade.side !== filterSide) return false;
        return true;
    }) || [];

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return <CheckCircle className="h-5 w-5 text-green-600" />;
            case 'FAILED':
                return <XCircle className="h-5 w-5 text-red-600" />;
            case 'PENDING':
            case 'PROCESSING':
                return <Loader className="h-5 w-5 text-yellow-600 animate-spin" />;
            default:
                return <Clock className="h-5 w-5 text-gray-400" />;
        }
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            COMPLETED: 'bg-green-100 text-green-800',
            FAILED: 'bg-red-100 text-red-800',
            PENDING: 'bg-yellow-100 text-yellow-800',
            PROCESSING: 'bg-blue-100 text-blue-800',
        };
        return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Trades</h1>
                <p className="text-gray-600 mt-1">
                    View your trading history and copied trades
                </p>
            </div>

            {/* Filters */}
            <div className="card">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Status Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Status
                        </label>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                            <option value="all">All Status</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="PENDING">Pending</option>
                            <option value="PROCESSING">Processing</option>
                            <option value="FAILED">Failed</option>
                        </select>
                    </div>

                    {/* Side Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Side
                        </label>
                        <select
                            value={filterSide}
                            onChange={(e) => setFilterSide(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                            <option value="all">All Sides</option>
                            <option value="BUY">Buy</option>
                            <option value="SELL">Sell</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Trades</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {trades?.data?.total || 0}
                            </p>
                        </div>
                        <TrendingUp className="h-10 w-10 text-primary-600" />
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Copied Trades</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {copiedTrades?.data?.total || 0}
                            </p>
                        </div>
                        <TrendingDown className="h-10 w-10 text-blue-600" />
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Success Rate</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {trades?.data?.trades
                                    ? (
                                          (trades.data.trades.filter((t: any) => t.status === 'COMPLETED')
                                              .length /
                                              trades.data.trades.length) *
                                          100
                                      ).toFixed(0)
                                    : 0}
                                %
                            </p>
                        </div>
                        <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                </div>
            </div>

            {/* My Trades */}
            <div className="card">
                <h2 className="text-xl font-semibold mb-4">My Trades</h2>
                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="text-gray-600 mt-4">Loading trades...</p>
                    </div>
                ) : filteredTrades.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Market
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Side
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Outcome
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Amount
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Shares
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Price
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredTrades.map((trade: any) => (
                                    <tr key={trade.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {new Date(trade.createdAt).toLocaleDateString()}
                                            <br />
                                            <span className="text-gray-500 text-xs">
                                                {new Date(trade.createdAt).toLocaleTimeString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                                            <div className="truncate" title={trade.marketTitle}>
                                                {trade.marketTitle}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    trade.side === 'BUY'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800'
                                                }`}
                                            >
                                                {trade.side === 'BUY' ? (
                                                    <TrendingUp className="h-3 w-3 mr-1" />
                                                ) : (
                                                    <TrendingDown className="h-3 w-3 mr-1" />
                                                )}
                                                {trade.side}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {trade.outcomeName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                            ${trade.amount.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                            {trade.shares.toFixed(4)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                            {(trade.price * 100).toFixed(1)}¢
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex items-center justify-center">
                                                {getStatusIcon(trade.status)}
                                                <span
                                                    className={`ml-2 inline-flex px-2 py-1 text-xs font-medium rounded ${getStatusBadge(
                                                        trade.status
                                                    )}`}
                                                >
                                                    {trade.status}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No trades yet
                        </h3>
                        <p className="text-gray-600">
                            Your trading history will appear here
                        </p>
                    </div>
                )}
            </div>

            {/* Copied Trades */}
            <div className="card">
                <h2 className="text-xl font-semibold mb-4">Copied Trades</h2>
                {copiedLoading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="text-gray-600 mt-4">Loading copied trades...</p>
                    </div>
                ) : copiedTrades?.data?.copiedTrades?.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Market
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Side
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Amount
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Copy %
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {copiedTrades.data.copiedTrades.map((trade: any) => (
                                    <tr key={trade.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {new Date(trade.createdAt).toLocaleDateString()}
                                            <br />
                                            <span className="text-gray-500 text-xs">
                                                {new Date(trade.createdAt).toLocaleTimeString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                                            <div className="truncate" title={trade.marketTitle}>
                                                {trade.marketTitle}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    trade.side === 'BUY'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800'
                                                }`}
                                            >
                                                {trade.side === 'BUY' ? (
                                                    <TrendingUp className="h-3 w-3 mr-1" />
                                                ) : (
                                                    <TrendingDown className="h-3 w-3 mr-1" />
                                                )}
                                                {trade.side}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                            ${trade.amount.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                            {trade.copyPercentage}%
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex items-center justify-center">
                                                {getStatusIcon(trade.status)}
                                                <span
                                                    className={`ml-2 inline-flex px-2 py-1 text-xs font-medium rounded ${getStatusBadge(
                                                        trade.status
                                                    )}`}
                                                >
                                                    {trade.status}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <TrendingDown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No copied trades yet
                        </h3>
                        <p className="text-gray-600">
                            Follow a trader to start copying their trades
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
