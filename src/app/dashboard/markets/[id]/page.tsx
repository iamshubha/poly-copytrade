"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, TrendingUp, DollarSign, Users, Calendar } from "lucide-react";
import Image from "next/image";

interface Market {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  outcomes: string[];
  outcomesPrices: number[];
  volume: number;
  liquidity: number;
  active: boolean;
  closed: boolean;
  endDate: string;
  category: string;
  tags: string[];
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={() => router.push("/dashboard/markets")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Markets
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800 font-semibold">Market not found</p>
          <p className="text-red-600 text-sm mt-2">
            The market you're looking for doesn't exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header with back button */}
      <button
        onClick={() => router.push("/dashboard/markets")}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Markets
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Market Image and Title */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start gap-6">
            {market.imageUrl && (
              <div className="relative w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                <Image
                  src={market.imageUrl}
                  alt={market.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                  {market.category}
                </span>
                {market.closed && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                    Closed
                  </span>
                )}
                {!market.closed && market.active && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                    Active
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                {market.title}
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>
                  Ends: {new Date(market.endDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Market Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Volume</p>
              <p className="text-xl font-semibold text-gray-900">
                ${market.volume.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Liquidity</p>
              <p className="text-xl font-semibold text-gray-900">
                ${market.liquidity.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Market ID</p>
              <p className="text-sm font-mono text-gray-700">
                {market.id.substring(0, 10)}...
              </p>
            </div>
          </div>
        </div>

        {/* Market Description */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            Description
          </h2>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
            {market.description}
          </p>
        </div>

        {/* Current Prices */}
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Current Prices
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {market.outcomes.map((outcome, index) => (
              <div
                key={index}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900">{outcome}</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {(market.outcomesPrices[index] * 100).toFixed(1)}¢
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${market.outcomesPrices[index] * 100}%`,
                    }}
                  ></div>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  {(market.outcomesPrices[index] * 100).toFixed(1)}% probability
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tags */}
        {market.tags && market.tags.length > 0 && (
          <div className="p-6 bg-gray-50 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {market.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-white border border-gray-200 text-gray-700 text-sm rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex gap-4">
        <button
          className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={market.closed || !market.active}
        >
          {market.closed ? "Market Closed" : "Place Trade"}
        </button>
        <button
          onClick={() => {
            const slug = market.marketSlug || market.market_slug;
            if (slug) {
              window.open(`https://polymarket.com/event/${slug}`, '_blank');
            } else {
              alert('Market slug not available');
            }
          }}
          className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
        >
          View on Polymarket
        </button>
      </div>
    </div>
  );
}
