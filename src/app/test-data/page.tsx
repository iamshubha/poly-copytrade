'use client';

import { useEffect, useState } from 'react';

export default function TestDataPage() {
    const [markets, setMarkets] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/markets?limit=5')
            .then(res => res.json())
            .then(data => {
                console.log('Markets data:', data);
                setMarkets(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching markets:', err);
                setError(err.message);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold mb-4">Loading...</h1>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">🧪 Data Test Page</h1>
            
            <div className="mb-6 p-4 bg-gray-100 rounded">
                <h2 className="text-xl font-semibold mb-2">API Response Status</h2>
                <p><strong>Success:</strong> {markets?.success ? '✅ Yes' : '❌ No'}</p>
                <p><strong>Data Count:</strong> {markets?.data?.length || 0}</p>
            </div>

            {markets?.data?.length > 0 ? (
                <div className="space-y-4">
                    <h2 className="text-2xl font-bold">Markets ({markets.data.length})</h2>
                    {markets.data.map((market: any, index: number) => (
                        <div key={market.id || index} className="border p-4 rounded-lg bg-white shadow">
                            <h3 className="text-lg font-semibold mb-2">{market.title}</h3>
                            <div className="text-sm text-gray-600 space-y-1">
                                <p><strong>ID:</strong> {market.id}</p>
                                <p><strong>Volume:</strong> ${market.volume?.toLocaleString()}</p>
                                <p><strong>Liquidity:</strong> ${market.liquidity?.toLocaleString()}</p>
                                <p><strong>Outcomes:</strong> {market.outcomes?.join(', ')}</p>
                                <p><strong>Prices:</strong> {market.outcomesPrices?.map((p: number) => (p * 100).toFixed(1) + '%').join(' / ')}</p>
                                <p><strong>End Date:</strong> {market.endDate}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-8 border rounded-lg text-center">
                    <p className="text-xl text-gray-600">No markets data received</p>
                </div>
            )}

            <div className="mt-8 p-4 bg-gray-100 rounded">
                <h3 className="font-bold mb-2">Raw API Response:</h3>
                <pre className="text-xs overflow-auto max-h-96 bg-white p-4 rounded">
                    {JSON.stringify(markets, null, 2)}
                </pre>
            </div>
        </div>
    );
}
