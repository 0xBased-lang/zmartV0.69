'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface TrendingMarket {
  id: string
  question: string
  yesPrice: number
  change24h: number
  volume24h: number
}

const MOCK_TRENDING: TrendingMarket[] = [
  {
    id: '1',
    question: 'Will Bitcoin hit $100k by end of 2025?',
    yesPrice: 0.72,
    change24h: 8.5,
    volume24h: 12500,
  },
  {
    id: '2',
    question: 'Will AI surpass human intelligence by 2030?',
    yesPrice: 0.45,
    change24h: -3.2,
    volume24h: 8900,
  },
  {
    id: '3',
    question: 'Will there be a recession in 2025?',
    yesPrice: 0.38,
    change24h: 15.3,
    volume24h: 15200,
  },
]

export function TrendingMarkets() {
  return (
    <Card variant="dark" className="p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-brand-primary" />
        Trending Markets
      </h3>
      <div className="space-y-3">
        {MOCK_TRENDING.map((market) => (
          <Link
            key={market.id}
            href={`/markets/${market.id}`}
            className="block p-3 rounded-md hover:bg-surface-elevated transition-all group border border-transparent hover:border-border-interactive"
          >
            <div className="space-y-2">
              {/* Question */}
              <p className="text-xs text-text-primary font-medium line-clamp-2 group-hover:text-brand-primary transition-colors">
                {market.question}
              </p>

              {/* Price and Change */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-trading-yes">
                    {(market.yesPrice * 100).toFixed(0)}%
                  </span>
                  <Badge
                    variant={market.change24h >= 0 ? 'success' : 'error'}
                    className="text-xs flex items-center gap-1"
                  >
                    {market.change24h >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {Math.abs(market.change24h).toFixed(1)}%
                  </Badge>
                </div>
              </div>

              {/* Volume */}
              <div className="text-xs text-text-tertiary">
                Vol: ${(market.volume24h / 1000).toFixed(1)}K
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  )
}
