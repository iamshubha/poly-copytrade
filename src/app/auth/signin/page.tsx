'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { SiweMessage } from 'siwe';
import { Wallet } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SignInPage() {
    const [loading, setLoading] = useState(false);
    const [address, setAddress] = useState('');
    const [walletType, setWalletType] = useState<'metamask' | 'phantom' | null>(null);
    const router = useRouter();

    const getProvider = (type: 'metamask' | 'phantom') => {
        if (type === 'phantom' && window.phantom?.ethereum) {
            return window.phantom.ethereum;
        }
        if (type === 'metamask' && window.ethereum) {
            return window.ethereum;
        }
        return null;
    };

    const handleConnectWallet = async (type: 'metamask' | 'phantom') => {
        try {
            setLoading(true);
            setWalletType(type);

            const provider = getProvider(type);

            if (!provider) {
                if (type === 'phantom') {
                    toast.error('Please install Phantom wallet');
                    window.open('https://phantom.app/', '_blank');
                } else {
                    toast.error('Please install MetaMask');
                    window.open('https://metamask.io', '_blank');
                }
                return;
            }

            console.log('[Auth] Using provider:', type);

            // For Phantom, check if Ethereum is supported
            if (type === 'phantom' && provider) {
                console.log('[Auth] Phantom provider detected');
                // Check if connected to Ethereum network
                try {
                    const chainId = await provider.request({ method: 'eth_chainId' });
                    console.log('[Auth] Current chain ID:', chainId);
                } catch (e: any) {
                    console.warn('[Auth] Could not get chain ID:', e.message);
                    toast.error('Please enable Ethereum in your Phantom wallet settings');
                    return;
                }
            }

            // Request account access
            console.log('[Auth] Requesting accounts...');
            const accounts = await provider.request({
                method: 'eth_requestAccounts',
            });

            // Convert to checksum address (EIP-55 format)
            const userAddress = accounts[0].toLowerCase();
            console.log('[Auth] Connected address:', userAddress);
            setAddress(userAddress);

            // Get nonce from server
            console.log('[Auth] Requesting nonce...');
            const nonceRes = await fetch('/api/auth/nonce', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: userAddress }),
            });

            if (!nonceRes.ok) {
                const errorText = await nonceRes.text();
                console.error('[Auth] Nonce request failed:', errorText);
                toast.error('Failed to get authentication nonce');
                return;
            }

            const nonceData = await nonceRes.json();
            console.log('[Auth] Nonce response:', nonceData);
            const nonce = nonceData.data.nonce;

            // Create SIWE message
            console.log('[Auth] Creating SIWE message...');
            const message = new SiweMessage({
                domain: window.location.host,
                address: userAddress,
                statement: 'Sign in to CopyTrade Platform',
                uri: window.location.origin,
                version: '1',
                chainId: 1,
                nonce,
            });

            const preparedMessage = message.prepareMessage();
            console.log('[Auth] Message to sign:', preparedMessage);

            // Sign message
            console.log('[Auth] Requesting signature...');
            const signature = await provider.request({
                method: 'personal_sign',
                params: [preparedMessage, userAddress],
            });

            console.log('[Auth] Signature received:', signature.substring(0, 20) + '...');

            // Authenticate with NextAuth
            console.log('[Auth] Authenticating with NextAuth...');
            const result = await signIn('credentials', {
                message: JSON.stringify(message),
                signature,
                redirect: false,
            });

            console.log('[Auth] NextAuth result:', result);

            if (result?.error) {
                console.error('[Auth] Authentication failed:', result.error);
                toast.error(`Authentication failed: ${result.error}`);
                return;
            }

            toast.success(`Successfully signed in with ${type === 'phantom' ? 'Phantom' : 'MetaMask'}!`);
            router.push('/dashboard');
        } catch (error: any) {
            console.error('[Auth] Sign in error:', error);

            // More detailed error messages
            let errorMessage = 'Failed to sign in';
            if (error.code === 4001) {
                errorMessage = 'You rejected the signature request';
            } else if (error.code === -32002) {
                errorMessage = 'Request already pending. Please check your wallet';
            } else if (error.code === -32603) {
                errorMessage = 'Internal error. Please enable Ethereum in Phantom settings';
            } else if (error.message?.includes('eth_requestAccounts')) {
                errorMessage = 'Please enable Ethereum network in your Phantom wallet';
            } else if (error.message?.includes('Unexpected error')) {
                if (type === 'phantom') {
                    errorMessage = 'Please make sure Ethereum is enabled in Phantom wallet settings. Go to Settings → Manage Networks → Enable Ethereum';
                } else {
                    errorMessage = 'Unexpected wallet error: ' + error.message;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }

            toast.error(errorMessage, { duration: 5000 });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="max-w-md w-full">
                <div className="card text-center">
                    <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Wallet className="h-8 w-8 text-white" />
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Sign In to CopyTrade
                    </h1>
                    <p className="text-gray-600 mb-8">
                        Connect your wallet to start copy trading
                    </p>

                    {address && (
                        <div className="mb-4 p-3 bg-green-50 rounded-lg">
                            <p className="text-sm text-green-800">
                                Connected: {address.slice(0, 6)}...{address.slice(-4)}
                            </p>
                        </div>
                    )}

                    <div className="space-y-3">
                        <button
                            onClick={() => handleConnectWallet('phantom')}
                            disabled={loading}
                            className="btn btn-primary w-full py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading && walletType === 'phantom' ? (
                                <>
                                    <svg
                                        className="animate-spin h-5 w-5"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        ></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                    </svg>
                                    Connecting...
                                </>
                            ) : (
                                <>
                                    <svg className="w-6 h-6" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M96.7 81.3c7.4-11.9 4.2-21.9-3.5-31.2-2.7-3.3-8.3-9.7-8.3-9.7s-1.8 13-10.3 20.6c-8.5 7.6-15.2 7.4-24.9 7.6-9.7.2-21.5 3.1-28.7 13.4-7.2 10.3-9.7 22.5-2.3 34.4 7.4 11.9 20.6 18.2 34 18.2 13.4 0 36.6-41.4 44-53.3Z" fill="#AB9FF2" />
                                    </svg>
                                    Connect Phantom Wallet
                                </>
                            )}
                        </button>

                        <button
                            onClick={() => handleConnectWallet('metamask')}
                            disabled={loading}
                            className="btn bg-gray-700 hover:bg-gray-800 text-white w-full py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading && walletType === 'metamask' ? (
                                <>
                                    <svg
                                        className="animate-spin h-5 w-5"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        ></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                    </svg>
                                    Connecting...
                                </>
                            ) : (
                                <>
                                    <svg className="w-6 h-6" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M36.5 5L23 16l2.5-6z" fill="#E17726" />
                                        <path d="M3.5 5L17 16l-2.5-6z" fill="#E27625" />
                                        <path d="M31 28l-3.5 5.5 7.5 2 2-7z" fill="#E27625" />
                                        <path d="M3 28.5l2 7 7.5-2L9 28z" fill="#E27625" />
                                        <path d="M15.5 18L13 22l7.5.5V18z" fill="#E27625" />
                                        <path d="M24.5 18l-4 4.5 7.5-.5-3.5-4z" fill="#E27625" />
                                    </svg>
                                    Connect MetaMask
                                </>
                            )}
                        </button>
                    </div>

                    <div className="mt-6 text-sm text-gray-600">
                        <p>Don&apos;t have a wallet?</p>
                        <div className="flex gap-4 justify-center mt-2">
                            <a
                                href="https://phantom.app/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-600 hover:text-primary-700 font-medium"
                            >
                                Get Phantom →
                            </a>
                            <a
                                href="https://metamask.io"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-600 hover:text-primary-700 font-medium"
                            >
                                Get MetaMask →
                            </a>
                        </div>
                    </div>

                    <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-gray-700">
                        <strong>Note for Phantom users:</strong> Enable Ethereum in Phantom by going to Settings → Manage Networks → Turn on Ethereum
                    </div>
                </div>

                <div className="mt-6 text-center text-sm text-gray-600">
                    <p>
                        By connecting, you agree to our{' '}
                        <a href="#" className="text-primary-600 hover:text-primary-700">
                            Terms of Service
                        </a>{' '}
                        and{' '}
                        <a href="#" className="text-primary-600 hover:text-primary-700">
                            Privacy Policy
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}

// Extend Window interface for TypeScript
declare global {
    interface Window {
        ethereum?: any;
        phantom?: {
            ethereum?: any;
            solana?: any;
        };
    }
}
