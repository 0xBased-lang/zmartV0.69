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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-primary/5 via-surface-background to-brand-accent/5">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          {/* Hero Section */}
          <h1 className="text-5xl md:text-6xl font-display font-bold text-text-primary mb-6">
            Predict. Trade. Win.
          </h1>
          <p className="text-xl text-text-secondary mb-8 max-w-2xl mx-auto">
            ZMART is a decentralized prediction market platform built on Solana.
            Trade on real-world events and earn rewards for accurate predictions.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/markets"
              className="inline-flex items-center justify-center px-8 py-3 bg-brand-primary text-text-primary-inverse font-semibold rounded-lg hover:bg-brand-accent shadow-glow hover:shadow-glow-lg transition-all duration-200"
            >
              Explore Markets
            </Link>
            <Link
              href="/markets/create"
              className="inline-flex items-center justify-center px-8 py-3 border-2 border-brand-primary text-brand-primary font-semibold rounded-lg hover:bg-brand-primary/10 shadow-glow transition-all duration-200"
            >
              Create Market
            </Link>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
            {/* Wallet Status */}
            <div className="bg-surface-card p-4 rounded-lg shadow-glow border border-border-default">
              <div className="text-sm text-text-tertiary mb-2">Wallet</div>
              <div className="flex items-center justify-center gap-2">
                <span
                  className={connected ? 'text-status-success' : 'text-text-disabled'}
                >
                  {connected ? '✅' : '○'}
                </span>
                <span className="text-text-primary font-medium">
                  {connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
            </div>

            {/* Database Status */}
            <div className="bg-surface-card p-4 rounded-lg shadow-glow border border-border-default">
              <div className="text-sm text-text-tertiary mb-2">Database</div>
              <div className="flex items-center justify-center gap-2">
                <span
                  className={
                    dbConnected
                      ? 'text-status-success'
                      : checking
                      ? 'text-status-warning'
                      : 'text-status-error'
                  }
                >
                  {dbConnected ? '✅' : checking ? '⏳' : '❌'}
                </span>
                <span className="text-text-primary font-medium">
                  {checking
                    ? 'Checking...'
                    : dbConnected
                    ? 'Connected'
                    : 'Failed'}
                </span>
              </div>
            </div>

            {/* Auth Status */}
            <div className="bg-surface-card p-4 rounded-lg shadow-glow border border-border-default">
              <div className="text-sm text-text-tertiary mb-2">Authentication</div>
              <div className="flex items-center justify-center gap-2">
                <span
                  className={
                    isAuthenticated
                      ? 'text-status-success'
                      : authLoading
                      ? 'text-status-warning'
                      : 'text-text-disabled'
                  }
                >
                  {isAuthenticated ? '✅' : authLoading ? '⏳' : '○'}
                </span>
                <span className="text-text-primary font-medium">
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
            <div className="mb-8 bg-surface-elevated p-6 rounded-lg border border-brand-primary/20 shadow-glow max-w-md mx-auto">
              <h3 className="font-semibold text-sm mb-3 text-brand-primary">
                Welcome Back!
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Wallet:</span>
                  <span className="font-mono text-text-primary truncate ml-2">
                    {user.wallet.slice(0, 4)}...{user.wallet.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Member Since:</span>
                  <span className="text-text-primary">
                    {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Reputation:</span>
                  <span className="text-text-primary">{user.reputation_score}</span>
                </div>
              </div>
            </div>
          )}

          {/* Day 18 Complete Badge */}
          <div className="bg-status-success/10 border border-status-success/20 rounded-lg p-6 max-w-md mx-auto shadow-glow">
            <h3 className="font-semibold text-sm mb-2 text-status-success">
              Day 18 Complete ✅
            </h3>
            <div className="space-y-1 text-xs text-text-secondary">
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
