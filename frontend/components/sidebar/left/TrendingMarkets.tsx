'use client'

import { useState, useEffect } from 'react'
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

export function TrendingMarkets() {
  const [trending, setTrending] = useState<TrendingMarket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        setLoading(true)
        setError(null)

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
        const response = await fetch(`${apiUrl}/api/markets/trending?limit=3`)

        if (!response.ok) {
          throw new Error('Failed to fetch trending markets')
        }

        const data = await response.json()
        setTrending(data.trending || [])
      } catch (err) {
        console.error('Error fetching trending markets:', err)
        setError('Failed to load trending markets')
        setTrending([])
      } finally {
        setLoading(false)
      }
    }

    fetchTrending()

    // Refresh every 2 minutes
    const interval = setInterval(fetchTrending, 120000)
    return () => clearInterval(interval)
  }, [])
  if (loading) {
    return (
      <Card variant="dark" className="p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-brand-primary" />
          Trending Markets
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={`skeleton-${i}`} className="h-20 bg-surface-elevated rounded animate-pulse" />
          ))}
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card variant="dark" className="p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-brand-primary" />
          Trending Markets
        </h3>
        <div className="text-xs text-status-error text-center py-4">{error}</div>
      </Card>
    )
  }

  return (
    <Card variant="dark" className="p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-brand-primary" />
        Trending Markets
      </h3>
      {trending.length === 0 ? (
        <div className="text-xs text-text-tertiary text-center py-8">
          No trending markets yet
        </div>
      ) : (
        <div className="space-y-3">
          {trending.map((market) => (
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
      )}
    </Card>
  )
}
