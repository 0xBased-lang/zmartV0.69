'use client'

import { useState, useEffect } from 'react'
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

interface RelatedMarketsProps {
  currentMarketId?: string
  category?: string
}

export function RelatedMarkets({
  currentMarketId,
  category,
}: RelatedMarketsProps) {
  const [markets, setMarkets] = useState<RelatedMarket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRelated = async () => {
      try {
        setLoading(true)
        setError(null)

        if (!currentMarketId) {
          setMarkets([])
          setLoading(false)
          return
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
        const response = await fetch(`${apiUrl}/api/markets/${currentMarketId}/related?limit=3`)

        if (!response.ok) {
          throw new Error('Failed to fetch related markets')
        }

        const data = await response.json()
        setMarkets(data.related || [])
      } catch (err) {
        console.error('Error fetching related markets:', err)
        setError('Failed to load related markets')
        setMarkets([])
      } finally {
        setLoading(false)
      }
    }

    fetchRelated()
  }, [currentMarketId])

  if (loading) {
    return (
      <Card variant="dark" className="p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-primary" />
          Related Markets
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={`skeleton-${i}`} className="h-16 bg-surface-elevated rounded animate-pulse" />
          ))}
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card variant="dark" className="p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-primary" />
          Related Markets
        </h3>
        <div className="text-xs text-status-error text-center py-4">{error}</div>
      </Card>
    )
  }

  return (
    <Card variant="dark" className="p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-brand-primary" />
        Related Markets
      </h3>
      {markets.length === 0 ? (
        <div className="text-xs text-text-tertiary text-center py-8">
          No related markets found
        </div>
      ) : (
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
      )}
    </Card>
  )
}
