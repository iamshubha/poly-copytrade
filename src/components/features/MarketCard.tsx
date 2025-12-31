'use client';

import { DollarSign, TrendingUp, Clock } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import Link from 'next/link';

export interface Market {
  id?: string;
  title: string;
  description?: string;
  imageUrl?: string;
  volume: number;
  liquidity: number;
  outcomesPrices: number[];
  endDate?: string;
  category?: string;
  tags?: string[];
}

export interface MarketCardProps {
  market: Market;
  showImage?: boolean;
}

export function MarketCard({ market, showImage = true }: MarketCardProps) {
  const hasId = market.id && market.id !== 'N/A';
  
  const CardWrapper = hasId
    ? ({ children }: { children: React.ReactNode }) => (
        <Link href={`/markets/${market.id}`}>
          <Card variant="default" padding="md" hoverable>
            {children}
          </Card>
        </Link>
      )
    : ({ children }: { children: React.ReactNode }) => (
        <Card variant="default" padding="md">
          {children}
        </Card>
      );

  return (
    <CardWrapper>
      {/* Market Image */}
      {showImage && market.imageUrl && (
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
        <Badge variant="warning" size="sm" className="mb-2">
          Detail view unavailable
        </Badge>
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
          <Badge variant="info" size="sm">
            {market.category}
          </Badge>
          {market.tags?.slice(0, 2).map((tag: string) => (
            <Badge key={tag} variant="default" size="sm">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </CardWrapper>
  );
}
