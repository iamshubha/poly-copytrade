'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Save, Shield, DollarSign, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
    const queryClient = useQueryClient();
    const [settings, setSettings] = useState<any>(null);

    const { data, isLoading } = useQuery({
        queryKey: ['user-settings'],
        queryFn: async () => {
            const res = await fetch('/api/user/settings');
            const json = await res.json();
            setSettings(json.data);
            return json.data;
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch('/api/user/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-settings'] });
            toast.success('Settings saved successfully');
        },
        onError: () => {
            toast.error('Failed to save settings');
        },
    });

    const handleSave = () => {
        if (settings) {
            updateMutation.mutate(settings);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-600 mt-1">
                    Configure your copy trading parameters and risk management
                </p>
            </div>

            {/* Risk Management */}
            <div className="card">
                <div className="flex items-center mb-6">
                    <Shield className="h-6 w-6 text-primary-600 mr-2" />
                    <h2 className="text-xl font-semibold">Risk Management</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Max Copy Percentage (%)
                        </label>
                        <input
                            type="number"
                            value={settings?.maxCopyPercentage || 10}
                            onChange={(e) =>
                                setSettings({
                                    ...settings,
                                    maxCopyPercentage: parseFloat(e.target.value),
                                })
                            }
                            className="input"
                            min="1"
                            max="100"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                            Maximum % of balance to use per trade
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Max Open Positions
                        </label>
                        <input
                            type="number"
                            value={settings?.maxOpenPositions || 50}
                            onChange={(e) =>
                                setSettings({
                                    ...settings,
                                    maxOpenPositions: parseInt(e.target.value),
                                })
                            }
                            className="input"
                            min="1"
                            max="100"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                            Maximum number of concurrent positions
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Min Trade Amount (USDC)
                        </label>
                        <input
                            type="number"
                            value={settings?.minTradeAmount || 1}
                            onChange={(e) =>
                                setSettings({
                                    ...settings,
                                    minTradeAmount: parseFloat(e.target.value),
                                })
                            }
                            className="input"
                            min="0.1"
                            step="0.1"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                            Minimum amount for each trade
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Max Trade Amount (USDC)
                        </label>
                        <input
                            type="number"
                            value={settings?.maxTradeAmount || ''}
                            onChange={(e) =>
                                setSettings({
                                    ...settings,
                                    maxTradeAmount: e.target.value ? parseFloat(e.target.value) : null,
                                })
                            }
                            className="input"
                            placeholder="No limit"
                            min="1"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                            Maximum amount per trade (optional)
                        </p>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Max Daily Loss (USDC)
                        </label>
                        <input
                            type="number"
                            value={settings?.maxDailyLoss || ''}
                            onChange={(e) =>
                                setSettings({
                                    ...settings,
                                    maxDailyLoss: e.target.value ? parseFloat(e.target.value) : null,
                                })
                            }
                            className="input"
                            placeholder="No limit"
                            min="1"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                            Stop trading if daily loss exceeds this amount (optional)
                        </p>
                    </div>
                </div>
            </div>

            {/* Copy Settings */}
            <div className="card">
                <div className="flex items-center mb-6">
                    <DollarSign className="h-6 w-6 text-primary-600 mr-2" />
                    <h2 className="text-xl font-semibold">Copy Settings</h2>
                </div>

                <div className="space-y-6">
                    <div>
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-sm font-medium text-gray-700">
                                    Auto Copy Enabled
                                </label>
                                <p className="text-sm text-gray-500">
                                    Automatically copy trades from followed traders
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings?.autoCopyEnabled || false}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            autoCopyEnabled: e.target.checked,
                                        })
                                    }
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Copy Delay (seconds)
                        </label>
                        <input
                            type="number"
                            value={settings?.copyDelay || 0}
                            onChange={(e) =>
                                setSettings({
                                    ...settings,
                                    copyDelay: parseInt(e.target.value),
                                })
                            }
                            className="input"
                            min="0"
                            max="300"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                            Delay before copying trades (0 = immediate)
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Slippage Tolerance (%)
                        </label>
                        <input
                            type="number"
                            value={settings?.slippageTolerance || 0.5}
                            onChange={(e) =>
                                setSettings({
                                    ...settings,
                                    slippageTolerance: parseFloat(e.target.value),
                                })
                            }
                            className="input"
                            min="0.1"
                            max="10"
                            step="0.1"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                            Maximum acceptable price slippage
                        </p>
                    </div>
                </div>
            </div>

            {/* Notifications */}
            <div className="card">
                <div className="flex items-center mb-6">
                    <Clock className="h-6 w-6 text-primary-600 mr-2" />
                    <h2 className="text-xl font-semibold">Notifications</h2>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="text-sm font-medium text-gray-700">
                                Email Notifications
                            </label>
                            <p className="text-sm text-gray-500">
                                Receive email updates about your trades
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings?.emailNotifications || false}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        emailNotifications: e.target.checked,
                                    })
                                }
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <label className="text-sm font-medium text-gray-700">
                                Trade Notifications
                            </label>
                            <p className="text-sm text-gray-500">
                                Get notified when trades are executed
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings?.tradeNotifications || false}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        tradeNotifications: e.target.checked,
                                    })
                                }
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    className="btn btn-primary px-6 py-3 inline-flex items-center disabled:opacity-50"
                >
                    <Save className="h-5 w-5 mr-2" />
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
}
