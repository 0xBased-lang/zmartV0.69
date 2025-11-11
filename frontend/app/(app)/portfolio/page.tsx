'use client';

import { PortfolioSummary } from '@/components/portfolio/PortfolioSummary';
import { ThreeColumnLayout } from '@/components/layout/ThreeColumnLayout';
import { HotTopics, TrendingMarkets, QuickStats } from '@/components/sidebar/left';
import { RecentActivity, SocialShare } from '@/components/sidebar/right';

export default function PortfolioPage() {
  return (
    <ThreeColumnLayout
      leftSidebar={
        <>
          <QuickStats />
          <HotTopics />
          <TrendingMarkets />
        </>
      }
      rightSidebar={
        <>
          <RecentActivity />
          <SocialShare />
        </>
      }
    >
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-text-primary">Your Portfolio</h1>
        <p className="text-text-secondary mt-2">
          Track your positions and winnings
        </p>
      </div>

      <PortfolioSummary />
    </ThreeColumnLayout>
  );
}
