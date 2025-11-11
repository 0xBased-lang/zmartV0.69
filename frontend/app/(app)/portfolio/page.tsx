'use client';

import { PortfolioSummary } from '@/components/portfolio/PortfolioSummary';

export default function PortfolioPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Your Portfolio</h1>
        <p className="text-gray-600 mt-2">
          Track your positions and winnings
        </p>
      </div>

      <PortfolioSummary />
    </div>
  );
}
