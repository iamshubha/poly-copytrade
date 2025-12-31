'use client';

import { UserPlus, UserCheck, TrendingUp, Activity, DollarSign, Users, Globe } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import Link from 'next/link';

export interface TraderStats {
  roi?: number;
  totalTrades: number;
  winRate: number;
  totalVolume: number;
  followers?: number;
  totalProfit?: number;
  avgProfit?: number;
}

export interface Trader {
  id: string;
  address: string;
  stats: TraderStats;
  createdAt?: string;
  isFollowing?: boolean;
  isPolymarket?: boolean;
}

export interface TraderCardProps {
  trader: Trader;
  onFollow: (traderId: string) => void;
  isFollowPending?: boolean;
  source?: 'polymarket' | 'internal';
}

export function TraderCard({ trader, onFollow, isFollowPending = false, source = 'internal' }: TraderCardProps) {
  const traderROI = trader.stats?.roi || 0;

  return (
    <Card variant="default" padding="md" hoverable className="transition-shadow">
      {/* Trader Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-2xl">
            {trader.address.slice(2, 4).toUpperCase()}
          </div>
          <div className="ml-4">
            <div className="flex items-center gap-2">
              <p className="font-bold text-lg text-gray-900">
                {trader.address.slice(0, 6)}...{trader.address.slice(-4)}
              </p>
              {trader.isPolymarket && (
                <Badge variant="info" size="sm">
                  <Globe className="h-3 w-3 mr-1" />
                  Polymarket
                </Badge>
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
            <Link href="/dashboard/following">
              <Button variant="secondary" size="sm">
                <UserCheck className="h-4 w-4 mr-1" />
                Following
              </Button>
            </Link>
          ) : (
            <Button
              onClick={() => onFollow(trader.id)}
              disabled={isFollowPending}
              loading={isFollowPending}
              size="sm"
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Follow
            </Button>
          )
        ) : (
          <Button
            onClick={() => onFollow(trader.address)}
            disabled={isFollowPending}
            loading={isFollowPending}
            size="sm"
          >
            <UserPlus className="h-4 w-4 mr-1" />
            Follow
          </Button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {trader.isPolymarket && trader.stats.roi !== undefined && (
          <StatCard
            icon={<TrendingUp className="h-3 w-3" />}
            label="ROI"
            value={`${traderROI >= 0 ? '+' : ''}${traderROI.toFixed(2)}%`}
            colorClass="yellow"
            valueColor={traderROI >= 0 ? 'text-yellow-900' : 'text-red-900'}
          />
        )}

        {source === 'internal' && trader.stats.followers !== undefined && (
          <StatCard
            icon={<Users className="h-3 w-3" />}
            label="Followers"
            value={trader.stats.followers.toString()}
            colorClass="blue"
          />
        )}

        <StatCard
          icon={<Activity className="h-3 w-3" />}
          label="Trades"
          value={trader.stats.totalTrades.toString()}
          colorClass="purple"
        />

        <StatCard
          icon={<TrendingUp className="h-3 w-3" />}
          label="Win Rate"
          value={`${trader.stats.winRate.toFixed(1)}%`}
          colorClass="green"
        />

        <StatCard
          icon={<DollarSign className="h-3 w-3" />}
          label="Volume"
          value={`$${(trader.stats.totalVolume || 0).toLocaleString()}`}
          colorClass="indigo"
        />

        {source === 'internal' && trader.stats.totalProfit !== undefined && (
          <>
            <StatCard
              icon={<TrendingUp className="h-3 w-3" />}
              label="Total Profit"
              value={`$${trader.stats.totalProfit.toFixed(2)}`}
              colorClass="pink"
              valueColor={trader.stats.totalProfit >= 0 ? 'text-pink-900' : 'text-red-900'}
            />

            {trader.stats.avgProfit !== undefined && (
              <StatCard
                icon={<Activity className="h-3 w-3" />}
                label="Avg Profit"
                value={`$${trader.stats.avgProfit.toFixed(2)}`}
                colorClass="orange"
                valueColor={trader.stats.avgProfit >= 0 ? 'text-orange-900' : 'text-red-900'}
              />
            )}
          </>
        )}
      </div>
    </Card>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  colorClass: string;
  valueColor?: string;
}

function StatCard({ icon, label, value, colorClass, valueColor }: StatCardProps) {
  return (
    <div className={`p-3 bg-gradient-to-br from-${colorClass}-50 to-${colorClass}-100 rounded-lg`}>
      <div className={`flex items-center text-xs text-${colorClass}-700 mb-1`}>
        {icon}
        <span className="ml-1">{label}</span>
      </div>
      <p className={`text-lg font-bold ${valueColor || `text-${colorClass}-900`}`}>
        {value}
      </p>
    </div>
  );
}
