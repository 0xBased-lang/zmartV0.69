'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { TrendingUp, Users, Activity, DollarSign } from 'lucide-react'

interface Stat {
  id: string
  label: string
  value: string
  change?: string
  icon: React.ReactNode
  color: string
}

interface PlatformStats {
  activeMarkets: number
  totalVolume: string
  activeUsers: number
  totalTrades: number
}

export function QuickStats() {
  const [stats, setStats] = useState<PlatformStats>({
    activeMarkets: 0,
    totalVolume: '$0',
    activeUsers: 0,
    totalTrades: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch real markets from backend via proxy
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/proxy'
        const response = await fetch(`${apiUrl}/api/markets`)

        if (!response.ok) {
          throw new Error('Failed to fetch markets')
        }

        const data = await response.json()
        const markets = data.markets || []

        // Calculate real active markets count
        const activeCount = Array.isArray(markets)
          ? markets.filter((m: any) => m.status === 'ACTIVE' || m.state === 2).length
          : 0

        setStats({
          activeMarkets: activeCount,
          totalVolume: 'Coming soon',
          activeUsers: 0, // TODO: Add backend endpoint
          totalTrades: 0, // TODO: Add backend endpoint
        })
      } catch (error) {
        console.error('[QuickStats] Failed to fetch stats:', error)
        // Fallback to zero on error
        setStats({
          activeMarkets: 0,
          totalVolume: '$0',
          activeUsers: 0,
          totalTrades: 0,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const displayStats: Stat[] = [
    {
      id: 'markets',
      label: 'Active Markets',
      value: loading ? '...' : stats.activeMarkets.toString(),
      icon: <Activity className="w-4 h-4" />,
      color: 'text-brand-primary',
    },
    {
      id: 'volume',
      label: '24h Volume',
      value: stats.totalVolume,
      icon: <DollarSign className="w-4 h-4" />,
      color: 'text-status-success',
    },
    {
      id: 'users',
      label: 'Active Users',
      value: loading ? '...' : stats.activeUsers > 0 ? stats.activeUsers.toLocaleString() : 'Coming soon',
      icon: <Users className="w-4 h-4" />,
      color: 'text-brand-accent',
    },
    {
      id: 'trades',
      label: '24h Trades',
      value: loading ? '...' : stats.totalTrades > 0 ? stats.totalTrades.toLocaleString() : 'Coming soon',
      icon: <TrendingUp className="w-4 h-4" />,
      color: 'text-status-warning',
    },
  ]
  return (
    <Card variant="dark" className="p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-3">
        Platform Stats
      </h3>
      <div className="space-y-3">
        {displayStats.map((stat) => (
          <div
            key={stat.id}
            className="p-3 rounded-md bg-surface-elevated border border-border-default hover:border-border-interactive transition-colors"
          >
            <div className="flex items-start justify-between mb-1">
              <div className={stat.color}>{stat.icon}</div>
              {stat.change && (
                <span className="text-xs text-status-success font-medium">
                  {stat.change}
                </span>
              )}
            </div>
            <div className="mt-2">
              <div className="text-xl font-bold text-text-primary">
                {stat.value}
              </div>
              <div className="text-xs text-text-tertiary mt-0.5">
                {stat.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
