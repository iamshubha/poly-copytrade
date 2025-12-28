import Link from 'next/link';
import { ArrowRight, TrendingUp, Shield, Zap, Users } from 'lucide-react';

export default function HomePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Header */}
            <header className="border-b bg-white/80 backdrop-blur-sm">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <TrendingUp className="h-8 w-8 text-primary-600" />
                        <span className="text-2xl font-bold text-gray-900">CopyTrade</span>
                    </div>
                    <nav className="hidden md:flex space-x-8">
                        <Link href="#features" className="text-gray-600 hover:text-gray-900">
                            Features
                        </Link>
                        <Link href="#how-it-works" className="text-gray-600 hover:text-gray-900">
                            How It Works
                        </Link>
                        <Link href="/dashboard" className="btn btn-primary px-6 py-2">
                            Launch App
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Hero */}
            <section className="container mx-auto px-4 py-20 text-center">
                <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                    Copy Elite Traders on
                    <span className="text-primary-600"> Polymarket</span>
                </h1>
                <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                    Automatically mirror the trades of successful Polymarket traders. Set your
                    own rules, manage risk, and profit from their expertise.
                </p>
                <div className="flex justify-center space-x-4">
                    <Link
                        href="/dashboard"
                        className="btn btn-primary px-8 py-4 text-lg inline-flex items-center"
                    >
                        Get Started
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                    <Link
                        href="#how-it-works"
                        className="btn btn-secondary px-8 py-4 text-lg"
                    >
                        Learn More
                    </Link>
                </div>

                {/* Stats */}
                <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                    <div className="card text-center">
                        <div className="text-4xl font-bold text-primary-600 mb-2">$10M+</div>
                        <div className="text-gray-600">Total Volume</div>
                    </div>
                    <div className="card text-center">
                        <div className="text-4xl font-bold text-primary-600 mb-2">5,000+</div>
                        <div className="text-gray-600">Active Users</div>
                    </div>
                    <div className="card text-center">
                        <div className="text-4xl font-bold text-primary-600 mb-2">95%</div>
                        <div className="text-gray-600">Success Rate</div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section id="features" className="bg-white py-20">
                <div className="container mx-auto px-4">
                    <h2 className="text-4xl font-bold text-center mb-12">Features</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="card">
                            <Zap className="h-12 w-12 text-primary-600 mb-4" />
                            <h3 className="text-xl font-semibold mb-2">Real-Time Copying</h3>
                            <p className="text-gray-600">
                                Trades are copied automatically within seconds of execution. Never
                                miss a profitable opportunity.
                            </p>
                        </div>
                        <div className="card">
                            <Shield className="h-12 w-12 text-primary-600 mb-4" />
                            <h3 className="text-xl font-semibold mb-2">Risk Management</h3>
                            <p className="text-gray-600">
                                Set maximum trade sizes, daily loss limits, and position caps to
                                protect your capital.
                            </p>
                        </div>
                        <div className="card">
                            <Users className="h-12 w-12 text-primary-600 mb-4" />
                            <h3 className="text-xl font-semibold mb-2">Follow Multiple Traders</h3>
                            <p className="text-gray-600">
                                Diversify by following multiple successful traders with custom
                                allocation rules for each.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="py-20">
                <div className="container mx-auto px-4">
                    <h2 className="text-4xl font-bold text-center mb-12">How It Works</h2>
                    <div className="max-w-3xl mx-auto space-y-8">
                        <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-xl">
                                1
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
                                <p className="text-gray-600">
                                    Sign in with your Ethereum wallet. No signup required.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-xl">
                                2
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold mb-2">Find Elite Traders</h3>
                                <p className="text-gray-600">
                                    Browse successful traders, view their performance, and select who to
                                    follow.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-xl">
                                3
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold mb-2">Configure Settings</h3>
                                <p className="text-gray-600">
                                    Set your risk parameters, trade size, and copying preferences.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-xl">
                                4
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold mb-2">Start Copying</h3>
                                <p className="text-gray-600">
                                    Sit back and watch as trades are automatically copied to your wallet.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="bg-primary-600 text-white py-20">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-4xl font-bold mb-6">Ready to Start Copy Trading?</h2>
                    <p className="text-xl mb-8 max-w-2xl mx-auto">
                        Join thousands of traders who are already profiting from elite strategies.
                    </p>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center px-8 py-4 bg-white text-primary-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                    >
                        Launch App Now
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-12">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div>
                            <div className="flex items-center space-x-2 mb-4">
                                <TrendingUp className="h-6 w-6" />
                                <span className="text-xl font-bold">CopyTrade</span>
                            </div>
                            <p className="text-gray-400">
                                The premier copy trading platform for Polymarket.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Product</h4>
                            <ul className="space-y-2 text-gray-400">
                                <li>Features</li>
                                <li>Pricing</li>
                                <li>Security</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Resources</h4>
                            <ul className="space-y-2 text-gray-400">
                                <li>Documentation</li>
                                <li>API</li>
                                <li>Support</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Legal</h4>
                            <ul className="space-y-2 text-gray-400">
                                <li>Terms of Service</li>
                                <li>Privacy Policy</li>
                                <li>Disclaimer</li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
                        © 2024 CopyTrade. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}
