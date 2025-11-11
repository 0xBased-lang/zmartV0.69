'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'

interface RelatedMarket {
  id: string
  question: string
  yesPrice: number
  category: string
}

const MOCK_RELATED: RelatedMarket[] = [
  {
    id: '6',
    question: 'Will Ethereum reach $10k by end of 2025?',
    yesPrice: 0.35,
    category: 'Crypto',
  },
  {
    id: '7',
    question: 'Will Solana surpass Ethereum in TVL?',
    yesPrice: 0.22,
    category: 'Crypto',
  },
  {
    id: '8',
    question: 'Will DeFi TVL exceed $500B in 2025?',
    yesPrice: 0.48,
    category: 'Finance',
  },
]

interface RelatedMarketsProps {
  currentMarketId?: string
  category?: string
}

export function RelatedMarkets({
  currentMarketId,
  category,
}: RelatedMarketsProps) {
  // Filter out current market if provided
  const markets = MOCK_RELATED.filter((m) => m.id !== currentMarketId)

  return (
    <Card variant="dark" className="p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-brand-primary" />
        Related Markets
      </h3>
      <div className="space-y-3">
        {markets.map((market) => (
          <Link
            key={market.id}
            href={`/markets/${market.id}`}
            className="block p-3 rounded-md hover:bg-surface-elevated transition-all border border-transparent hover:border-border-interactive group"
          >
            <div className="space-y-2">
              {/* Question */}
              <p className="text-xs text-text-primary font-medium line-clamp-2 group-hover:text-brand-primary transition-colors">
                {market.question}
              </p>

              {/* Category and Price */}
              <div className="flex items-center justify-between">
                <Badge variant="dark" className="text-xs">
                  {market.category}
                </Badge>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-text-tertiary">YES</span>
                  <span className="text-sm font-bold text-trading-yes">
                    {(market.yesPrice * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}

        {/* View More Link */}
        <Link
          href={category ? `/markets?category=${category}` : '/markets'}
          className="block text-center text-xs text-brand-primary hover:text-brand-primaryHover font-medium py-2"
        >
          View More →
        </Link>
      </div>
    </Card>
  )
}
