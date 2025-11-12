'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Clock, TrendingUp, MessageSquare, Trophy, Activity as ActivityIcon, Plus } from 'lucide-react'
import { createLogger } from '@/lib/utils/debug-logger'

const log = createLogger('RecentActivity')

interface ActivityItem {
  id: string
  type: 'trade' | 'resolution' | 'creation'
  user: string
  action: string
  market: string
  marketId: string
  time: string
  amount?: string
}

const ACTIVITY_ICONS = {
  trade: <TrendingUp className="w-3.5 h-3.5 text-brand-primary" />,
  resolution: <Clock className="w-3.5 h-3.5 text-status-info" />,
  creation: <Plus className="w-3.5 h-3.5 text-status-success" />,
}

// Helper to format relative time
function getRelativeTime(timestamp: string): string {
  const now = new Date().getTime()
  const time = new Date(timestamp).getTime()
  const diff = Math.floor((now - time) / 1000) // seconds

  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    log.info('Component mounted')

    const fetchActivity = async () => {
      const startTime = performance.now()
      try {
        setLoading(true)
        setError(null)

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
        const url = `${apiUrl}/api/markets/activity?limit=20`
        log.debug('Fetching activity', { url })

        const response = await fetch(url)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        const duration = performance.now() - startTime

        log.info(`Received ${data.activities?.length || 0} activity items`, {
          count: data.activities?.length,
          duration: `${duration.toFixed(2)}ms`
        })

        setActivities(data.activities || [])
        log.debug('State updated successfully')
      } catch (err) {
        const duration = performance.now() - startTime
        log.error('Failed to fetch activity', err, { duration: `${duration.toFixed(2)}ms` })
        setError('Failed to load activity')
        setActivities([])
      } finally {
        setLoading(false)
      }
    }

    fetchActivity()

    // Refresh activity every 30 seconds
    log.debug('Setting up auto-refresh (30s interval)')
    const interval = setInterval(() => {
      log.debug('Auto-refresh triggered')
      fetchActivity()
    }, 30000)

    return () => {
      log.info('Component unmounting')
      clearInterval(interval)
    }
  }, [])

  if (loading) {
    return (
      <Card variant="dark" className="p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <ActivityIcon className="w-4 h-4 text-brand-primary" />
          Recent Activity
        </h3>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
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
          <ActivityIcon className="w-4 h-4 text-brand-primary" />
          Recent Activity
        </h3>
        <div className="text-xs text-status-error text-center py-4">{error}</div>
      </Card>
    )
  }

  return (
    <Card variant="dark" className="p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
        <ActivityIcon className="w-4 h-4 text-brand-primary" />
        Recent Activity
      </h3>
      {activities.length === 0 ? (
        <div className="text-xs text-text-tertiary text-center py-8">
          No recent activity yet
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-hide">
          {activities.map((activity) => (
          <div
            key={activity.id}
            className="p-2.5 rounded-md hover:bg-surface-elevated transition-colors border border-transparent hover:border-border-default"
          >
            <div className="flex items-start gap-2">
              {/* Icon */}
              <div className="mt-0.5">{ACTIVITY_ICONS[activity.type]}</div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-medium text-brand-primary">
                    {activity.user}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {activity.action}
                  </span>
                  {activity.amount && (
                    <Badge variant="dark" className="text-xs">
                      {activity.amount}
                    </Badge>
                  )}
                </div>
                <Link
                  href={`/markets/${activity.marketId}`}
                  className="text-xs text-text-primary hover:text-brand-primary transition-colors line-clamp-1 mt-1 block"
                >
                  {activity.market}
                </Link>
                <div className="text-xs text-text-tertiary mt-1">
                  {getRelativeTime(activity.time)}
                </div>
              </div>
            </div>
          </div>
        ))}
        </div>
      )}
    </Card>
  )
}
