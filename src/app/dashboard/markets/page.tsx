'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useState, useEffect, useRef, useMemo } from 'react';
import { MarketCard } from '@/components/features/MarketCard';
import { MarketFilters } from '@/components/features/MarketFilters';
import { Search } from 'lucide-react';

export default function MarketsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [displaySearchQuery, setDisplaySearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedTopic, setSelectedTopic] = useState('all');
    const [sortBy, setSortBy] = useState('volume'); // volume = Trending

    // Track previous prices for change detection
    const previousPricesRef = useRef<Map<string, number[]>>(new Map());
    const [priceChanges, setPriceChanges] = useState<Map<string, 'up' | 'down' | null>>(new Map());

    // Refs for infinite scroll
    const observerTarget = useRef(null);
    const autoLoadCount = useRef(0);
    const MAX_AUTO_LOADS = 2;

    // Debounced search handler
    const debouncedSetSearch = useMemo(
        () => {
            let timeoutId: NodeJS.Timeout;
            return (value: string) => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    setSearchQuery(value);
                }, 300);
            };
        },
        []
    );

    // Infinite query for markets
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        error
    } = useInfiniteQuery({
        queryKey: ['dashboard-markets', searchQuery, selectedCategory, selectedTopic, sortBy],
        queryFn: async ({ pageParam = 0 }) => {
            const params = new URLSearchParams({
                limit: '20',
                offset: pageParam.toString(),
                sortBy,
                sortOrder: 'desc',
            });

            // Category filter (hide other categories if not "all")
            if (selectedCategory !== 'all') {
                const hideCategories: string[] = [];
                const allCategories = ['politics', 'sports', 'crypto', 'finance', 'geopolitics', 'earnings', 'tech', 'culture', 'world', 'economy', 'elections'];
                allCategories.forEach(cat => {
                    if (cat !== selectedCategory) {
                        hideCategories.push(cat);
                    }
                });
                if (hideCategories.length > 0) {
                    params.append('hideCategories', hideCategories.join(','));
                }
            }

            // Topic filter
            if (selectedTopic !== 'all') {
                params.append('tag', selectedTopic);
            }

            // Search filter
            if (searchQuery) {
                params.append('search', searchQuery);
            }

            console.log('[Dashboard Markets] Fetching with params:', params.toString());
            const res = await fetch(`/api/markets?${params}`);

            if (!res.ok) {
                throw new Error(`Failed to fetch markets: ${res.status}`);
            }

            const json = await res.json();

            return {
                data: json.data?.data || [],
                total: json.data?.total || 0,
                availableTags: json.data?.availableTags || [],
                nextOffset: pageParam + 20
            };
        },
        getNextPageParam: (lastPage, allPages) => {
            const loadedCount = allPages.reduce((sum, page) => sum + page.data.length, 0);
            return loadedCount < lastPage.total ? lastPage.nextOffset : undefined;
        },
        initialPageParam: 0,
        refetchInterval: 5000, // Refetch every 5 seconds for real-time data
        refetchIntervalInBackground: false,
    });

    const markets = data?.pages.flatMap(page => page.data) || [];
    const totalMarkets = data?.pages[0]?.total || 0;
    const availableTopics = data?.pages[0]?.availableTags || [];

    // Detect price changes
    useEffect(() => {
        const newChanges = new Map<string, 'up' | 'down' | null>();

        markets.forEach((market: any) => {
            if (!market.outcomesPrices || market.outcomesPrices.length === 0) return;

            const currentPrice = market.outcomesPrices[0];
            const previousPrices = previousPricesRef.current.get(market.id);

            if (previousPrices && previousPrices.length > 0) {
                const previousPrice = previousPrices[0];
                if (currentPrice > previousPrice) {
                    newChanges.set(market.id, 'up');
                } else if (currentPrice < previousPrice) {
                    newChanges.set(market.id, 'down');
                }
            }

            previousPricesRef.current.set(market.id, market.outcomesPrices);
        });

        if (newChanges.size > 0) {
            setPriceChanges(newChanges);
            const timer = setTimeout(() => {
                setPriceChanges(new Map());
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [markets]);

    // Intersection Observer for infinite scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    if (autoLoadCount.current < MAX_AUTO_LOADS) {
                        console.log('[Dashboard Markets] Auto-loading next page', autoLoadCount.current + 1);
                        autoLoadCount.current += 1;
                        fetchNextPage();
                    }
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    // Reset auto-load count when filters change
    useEffect(() => {
        autoLoadCount.current = 0;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [searchQuery, selectedCategory, selectedTopic, sortBy]);

    return (
        <div className="space-y-0">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Markets</h1>
                <p className="text-gray-600 mt-1">
                    Browse and trade on active prediction markets
                </p>
            </div>

            {/* Polymarket-Style Filters */}
            <div className="bg-white rounded-lg shadow-sm mb-6 -mx-6">
                <MarketFilters
                    searchQuery={displaySearchQuery}
                    onSearchChange={(value) => {
                        setDisplaySearchQuery(value);
                        debouncedSetSearch(value);
                    }}
                    selectedCategory={selectedCategory}
                    onCategorySelect={(category) => {
                        setSelectedCategory(category);
                        autoLoadCount.current = 0;
                    }}
                    selectedTopic={selectedTopic}
                    availableTopics={availableTopics}
                    onTopicSelect={(topic) => {
                        setSelectedTopic(topic);
                        autoLoadCount.current = 0;
                    }}
                    sortBy={sortBy}
                    onSortChange={(sort) => {
                        setSortBy(sort);
                        autoLoadCount.current = 0;
                    }}
                />
            </div>

            {/* Markets Grid */}
            {isLoading ? (
                <div className="text-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 mt-4">Loading markets...</p>
                </div>
            ) : markets.length > 0 ? (
                <>
                    {/* Results Info with Connection Status */}
                    <div className="mb-4 flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                            Showing {markets.length} of {totalMarkets} markets
                        </span>
                        <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${isFetchingNextPage ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} />
                            <span className="text-gray-600">
                                {isFetchingNextPage ? 'Updating...' : 'Live'}
                            </span>
                        </div>
                    </div>

                    {/* Markets Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {markets.map((market: any) => (
                            <div
                                key={market.id}
                                className={`transition-all duration-300 ${priceChanges.get(market.id) === 'up'
                                        ? 'animate-price-up'
                                        : priceChanges.get(market.id) === 'down'
                                            ? 'animate-price-down'
                                            : ''
                                    }`}
                            >
                                <MarketCard
                                    market={market}
                                    showImage={true}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Auto-load trigger */}
                    {autoLoadCount.current < MAX_AUTO_LOADS && hasNextPage && (
                        <div ref={observerTarget} className="h-4 w-full" />
                    )}

                    {/* Loading indicator during auto-load */}
                    {isFetchingNextPage && autoLoadCount.current < MAX_AUTO_LOADS && (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="text-gray-600 mt-2 text-sm">Loading more markets...</p>
                        </div>
                    )}

                    {/* Load More Button */}
                    {autoLoadCount.current >= MAX_AUTO_LOADS && hasNextPage && (
                        <div className="flex justify-center py-8">
                            <button
                                onClick={() => fetchNextPage()}
                                disabled={isFetchingNextPage}
                                className="px-6 py-2.5 bg-white border-2 border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isFetchingNextPage ? (
                                    <span className="flex items-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
                                        Loading...
                                    </span>
                                ) : (
                                    'Load More'
                                )}
                            </button>
                        </div>
                    )}

                    {/* End of list */}
                    {!hasNextPage && markets.length > 0 && (
                        <div className="text-center py-8 text-sm text-gray-500">
                            End of results
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-20 bg-white rounded-lg border border-gray-200">
                    <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 mb-2">
                        No markets found
                    </h3>
                    <p className="text-gray-600 mb-6">
                        Try adjusting your filters or search query
                    </p>
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setDisplaySearchQuery('');
                            setSelectedCategory('all');
                            setSelectedTopic('all');
                            autoLoadCount.current = 0;
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Reset Filters
                    </button>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="text-center py-12 bg-red-50 rounded-lg border border-red-200">
                    <div className="text-red-500 mb-4 text-4xl">⚠️</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Failed to load markets
                    </h3>
                    <p className="text-gray-600 mb-4">
                        {error instanceof Error ? error.message : 'An error occurred'}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Retry
                    </button>
                </div>
            )}
        </div>
    );
}
