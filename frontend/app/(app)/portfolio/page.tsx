'use client';

import { useWallet } from '@solana/wallet-adapter-react';

export default function PortfolioPage() {
  const { connected } = useWallet();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Your Portfolio</h1>
        <p className="text-gray-600 mt-2">
          Track your positions and winnings
        </p>
      </div>

      {!connected ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-800 mb-2">
            Connect Your Wallet
          </h3>
          <p className="text-blue-700 text-sm">
            Connect your wallet to view your portfolio and trading positions.
          </p>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-semibold text-yellow-800 mb-2">
            🚧 Coming Soon
          </h3>
          <p className="text-yellow-700 text-sm">
            Portfolio tracking will be implemented in Day 21.
          </p>
        </div>
      )}
    </div>
  );
}
