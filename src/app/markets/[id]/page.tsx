'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, DollarSign, TrendingUp, Clock, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface Market {
    id: string;
    conditionId?: string;
    title: string;
    description?: string;
    imageUrl?: string;
    volume: number;
    liquidity: number;
    outcomes: string[];
    outcomesPrices: number[];
    endDate?: string;
    category?: string;
    tags?: string[];
    active?: boolean;

    marketSlug?: string;
    market_slug?: string;
}

export default function MarketDetailPage() {
    const params = useParams();
    const router = useRouter();
    const marketId = params.id as string;

    const { data: market, isLoading, error } = useQuery({
        queryKey: ["market", marketId],
        queryFn: async () => {
            const response = await fetch(`/api/markets/${marketId}`);
            if (!response.ok) {
                throw new Error("Failed to fetch market");
            }
            const data = await response.json();
            return data.data as Market;
        },
        enabled: !!marketId,
        refetchInterval: 30000, // Refetch every 30 seconds for real-time price updates
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !market) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-4xl mx-auto p-6">
                    <button
                        onClick={() => router.push("/markets")}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Markets
                    </button>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                        <p className="text-red-800 font-semibold">Market not found</p>
                        <p className="text-red-600 text-sm mt-2">
                            The market you&apos;re looking for doesn&apos;t exist or has been removed.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const slug = market.marketSlug || market.market_slug;
    const polymarketUrl = slug
        ? `https://polymarket.com/event/${slug}`
        : `https://polymarket.com/`;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <button
                        onClick={() => router.push("/markets")}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Markets
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Market Image */}
                        {market.imageUrl && (
                            <Card padding="none" className="overflow-hidden">
                                <img
                                    src={market.imageUrl}
                                    alt={market.title}
                                    className="w-full h-64 object-cover"
                                />
                            </Card>
                        )}

                        {/* Market Info */}
                        <Card padding="lg">
                            <div className="space-y-4">
                                <div className="flex items-start justify-between">
                                    <h1 className="text-3xl font-bold text-gray-900">
                                        {market.title}
                                    </h1>
                                    {market.active && (
                                        <Badge variant="success">Active</Badge>
                                    )}
                                </div>

                                {market.description && (
                                    <p className="text-gray-700 leading-relaxed">
                                        {market.description}
                                    </p>
                                )}

                                {/* Tags */}
                                {(market.category || market.tags?.length) && (
                                    <div className="flex flex-wrap gap-2">
                                        {market.category && (
                                            <Badge variant="info" size="md">
                                                {market.category}
                                            </Badge>
                                        )}
                                        {market.tags?.map((tag: string) => (
                                            <Badge key={tag} variant="default" size="md">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                )}

                                {/* External Link */}
                                <div className="pt-4 border-t">
                                    <a
                                        href={polymarketUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        View on Polymarket
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Market Prices */}
                        <Card padding="lg">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                Current Prices
                            </h2>
                            <div className="space-y-3">
                                {market.outcomes.map((outcome, idx) => (
                                    <div
                                        key={idx}
                                        className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium text-gray-900">
                                                {outcome}
                                            </span>
                                            <Badge
                                                variant={idx === 0 ? "success" : "error"}
                                                size="sm"
                                            >
                                                {(market.outcomesPrices[idx] * 100).toFixed(1)}¢
                                            </Badge>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${
                                                    idx === 0 ? 'bg-green-500' : 'bg-red-500'
                                                }`}
                                                style={{
                                                    width: `${market.outcomesPrices[idx] * 100}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        {/* Market Stats */}
                        <Card padding="lg">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                Market Statistics
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex items-center text-gray-600 mb-1">
                                        <DollarSign className="h-5 w-5 mr-2" />
                                        <span className="text-sm font-medium">Volume</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900 ml-7">
                                        ${(market.volume / 1000).toFixed(1)}k
                                    </p>
                                </div>

                                <div className="pt-4 border-t">
                                    <div className="flex items-center text-gray-600 mb-1">
                                        <TrendingUp className="h-5 w-5 mr-2" />
                                        <span className="text-sm font-medium">Liquidity</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900 ml-7">
                                        ${(market.liquidity / 1000).toFixed(1)}k
                                    </p>
                                </div>

                                {market.endDate && (
                                    <div className="pt-4 border-t">
                                        <div className="flex items-center text-gray-600 mb-1">
                                            <Clock className="h-5 w-5 mr-2" />
                                            <span className="text-sm font-medium">End Date</span>
                                        </div>
                                        <p className="text-lg font-semibold text-gray-900 ml-7">
                                            {new Date(market.endDate).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            })}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Trade Button */}
                        <Card padding="lg" className="bg-gradient-to-br from-blue-50 to-purple-50">
                            <h3 className="font-semibold text-gray-900 mb-2">
                                Want to trade this market?
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Sign in to follow traders and copy their trades on this market
                            </p>
                            <Button
                                onClick={() => router.push('/auth/signin')}
                                variant="primary"
                                fullWidth
                            >
                                Sign In to Trade
                            </Button>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}

