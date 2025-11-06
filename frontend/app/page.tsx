'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/lib/hooks/useAuth';
import { useSupabaseStatus } from '@/lib/hooks/useSupabase';
import { useWallet } from '@solana/wallet-adapter-react';

export default function Home() {
  const { connected } = useWallet();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { connected: dbConnected, checking } = useSupabaseStatus();

  return (
    <>
      <Header />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          {/* Hero Section */}
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Predict. Trade. Win.
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            ZMART is a decentralized prediction market platform built on Solana.
            Trade on real-world events and earn rewards for accurate predictions.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/markets"
              className="inline-flex items-center justify-center px-8 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
            >
              Explore Markets
            </Link>
            <Link
              href="/markets/create"
              className="inline-flex items-center justify-center px-8 py-3 border-2 border-primary text-primary font-semibold rounded-lg hover:bg-primary/10 transition-colors"
            >
              Create Market
            </Link>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
            {/* Wallet Status */}
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-500 mb-2">Wallet</div>
              <div className="flex items-center justify-center gap-2">
                <span
                  className={connected ? 'text-green-500' : 'text-gray-400'}
                >
                  {connected ? '✅' : '○'}
                </span>
                <span className="text-gray-800 font-medium">
                  {connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
            </div>

            {/* Database Status */}
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-500 mb-2">Database</div>
              <div className="flex items-center justify-center gap-2">
                <span
                  className={
                    dbConnected
                      ? 'text-green-500'
                      : checking
                      ? 'text-yellow-500'
                      : 'text-red-500'
                  }
                >
                  {dbConnected ? '✅' : checking ? '⏳' : '❌'}
                </span>
                <span className="text-gray-800 font-medium">
                  {checking
                    ? 'Checking...'
                    : dbConnected
                    ? 'Connected'
                    : 'Failed'}
                </span>
              </div>
            </div>

            {/* Auth Status */}
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-500 mb-2">Authentication</div>
              <div className="flex items-center justify-center gap-2">
                <span
                  className={
                    isAuthenticated
                      ? 'text-green-500'
                      : authLoading
                      ? 'text-yellow-500'
                      : 'text-gray-400'
                  }
                >
                  {isAuthenticated ? '✅' : authLoading ? '⏳' : '○'}
                </span>
                <span className="text-gray-800 font-medium">
                  {authLoading
                    ? 'Loading...'
                    : isAuthenticated
                    ? 'Authenticated'
                    : 'Not Authenticated'}
                </span>
              </div>
            </div>
          </div>

          {/* User Profile (if authenticated) */}
          {user && (
            <div className="mb-8 bg-primary-50 p-6 rounded-lg border border-primary-200 max-w-md mx-auto">
              <h3 className="font-semibold text-sm mb-3 text-primary-700">
                Welcome Back!
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Wallet:</span>
                  <span className="font-mono text-gray-800 truncate ml-2">
                    {user.wallet.slice(0, 4)}...{user.wallet.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Member Since:</span>
                  <span className="text-gray-800">
                    {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Reputation:</span>
                  <span className="text-gray-800">{user.reputation_score}</span>
                </div>
              </div>
            </div>
          )}

          {/* Day 18 Complete Badge */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 max-w-md mx-auto">
            <h3 className="font-semibold text-sm mb-2 text-green-700">
              Day 18 Complete ✅
            </h3>
            <div className="space-y-1 text-xs text-green-600">
              <p>✅ Consistent layout structure</p>
              <p>✅ Desktop & mobile navigation</p>
              <p>✅ Footer with links</p>
              <p>✅ Page routing working</p>
              <p>✅ Responsive sidebar</p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
