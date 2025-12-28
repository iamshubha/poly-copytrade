'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    TrendingUp,
    Home,
    BarChart3,
    Users,
    Settings,
    Bell,
    LogOut,
    Menu,
    X
} from 'lucide-react';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
        }
    }, [status, router]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!session) {
        return null;
    }

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: Home },
        { name: 'Markets', href: '/dashboard/markets', icon: BarChart3 },
        { name: 'Following', href: '/dashboard/following', icon: Users },
        { name: 'Trades', href: '/dashboard/trades', icon: TrendingUp },
        { name: 'Settings', href: '/dashboard/settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div
                className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex items-center justify-between h-16 px-6 border-b">
                    <div className="flex items-center space-x-2">
                        <TrendingUp className="h-8 w-8 text-primary-600" />
                        <span className="text-xl font-bold">CopyTrade</span>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <nav className="mt-6 px-3">
                    {navigation.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="flex items-center px-3 py-2 mb-1 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <Icon className="h-5 w-5 mr-3" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="absolute bottom-0 w-full p-4 border-t">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold text-sm">
                                {session.user.address.slice(2, 4).toUpperCase()}
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-gray-900">
                                    {session.user.address.slice(0, 6)}...{session.user.address.slice(-4)}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => signOut()}
                            className="text-gray-400 hover:text-gray-600"
                            title="Sign out"
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="lg:pl-64">
                {/* Top bar */}
                <div className="sticky top-0 z-10 bg-white border-b">
                    <div className="flex items-center justify-between h-16 px-4 sm:px-6">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden"
                        >
                            <Menu className="h-6 w-6" />
                        </button>

                        <div className="flex items-center space-x-4 ml-auto">
                            <button className="relative p-2 text-gray-400 hover:text-gray-600">
                                <Bell className="h-6 w-6" />
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Page content */}
                <main className="p-4 sm:p-6">{children}</main>
            </div>
        </div>
    );
}
