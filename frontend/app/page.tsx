'use client';

import { Header } from '@/components/layout/Header';
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
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-4xl font-bold text-primary">ZMART v0.69</h1>
          <p className="text-gray-600 mt-2">Connect your wallet to get started!</p>

          <div className="mt-6 space-y-3">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-sm mb-3 text-gray-700">System Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Wallet:</span>
                  <span className={connected ? 'text-green-600 font-medium' : 'text-gray-400'}>
                    {connected ? '✅ Connected' : '⭕ Disconnected'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Database:</span>
                  <span className={dbConnected ? 'text-green-600 font-medium' : checking ? 'text-yellow-600' : 'text-red-600 font-medium'}>
                    {checking ? '⏳ Checking...' : dbConnected ? '✅ Connected' : '❌ Failed'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Auth:</span>
                  <span className={isAuthenticated ? 'text-green-600 font-medium' : authLoading ? 'text-yellow-600' : 'text-gray-400'}>
                    {authLoading ? '⏳ Loading...' : isAuthenticated ? '✅ Authenticated' : '⭕ Not authenticated'}
                  </span>
                </div>
              </div>
            </div>

            {user && (
              <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
                <h3 className="font-semibold text-sm mb-3 text-primary-700">User Profile</h3>
                <div className="space-y-2 text-xs">
                  <div className="bg-white p-2 rounded font-mono truncate">
                    <span className="text-gray-500 text-[10px]">Wallet:</span>
                    <div className="truncate text-gray-800 mt-0.5">{user.wallet}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white p-2 rounded">
                      <div className="text-gray-500 text-[10px]">Created</div>
                      <div className="text-gray-800 mt-0.5">{new Date(user.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="bg-white p-2 rounded">
                      <div className="text-gray-500 text-[10px]">Last Seen</div>
                      <div className="text-gray-800 mt-0.5">{new Date(user.last_seen_at).toLocaleTimeString()}</div>
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded">
                    <div className="text-gray-500 text-[10px]">Reputation</div>
                    <div className="text-gray-800 mt-0.5">{user.reputation_score}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-semibold text-sm mb-2 text-green-700">Day 17 Complete ✅</h3>
              <div className="space-y-1 text-xs text-green-600">
                <p>✅ Supabase integration</p>
                <p>✅ TypeScript types generated</p>
                <p>✅ Wallet-based authentication</p>
                <p>✅ Database query helpers</p>
                <p>✅ User profile management</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
