'use client'

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

const MOCK_STATS: Stat[] = [
  {
    id: 'markets',
    label: 'Active Markets',
    value: '1,247',
    change: '+12%',
    icon: <Activity className="w-4 h-4" />,
    color: 'text-brand-primary',
  },
  {
    id: 'volume',
    label: '24h Volume',
    value: '$2.4M',
    change: '+18%',
    icon: <DollarSign className="w-4 h-4" />,
    color: 'text-status-success',
  },
  {
    id: 'users',
    label: 'Active Users',
    value: '8,542',
    change: '+5%',
    icon: <Users className="w-4 h-4" />,
    color: 'text-brand-accent',
  },
  {
    id: 'trades',
    label: '24h Trades',
    value: '15.2K',
    change: '+23%',
    icon: <TrendingUp className="w-4 h-4" />,
    color: 'text-status-warning',
  },
]

export function QuickStats() {
  return (
    <Card variant="dark" className="p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-3">
        Platform Stats
      </h3>
      <div className="space-y-3">
        {MOCK_STATS.map((stat) => (
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
