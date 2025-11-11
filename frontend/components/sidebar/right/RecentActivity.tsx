'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Clock, TrendingUp, MessageSquare, Trophy, Activity as ActivityIcon } from 'lucide-react'

interface ActivityItem {
  id: string
  type: 'trade' | 'comment' | 'resolution' | 'win'
  user: string
  action: string
  market: string
  marketId: string
  time: string
  amount?: string
}

const MOCK_ACTIVITY: ActivityItem[] = [
  {
    id: '1',
    type: 'trade',
    user: 'alice.eth',
    action: 'bought 100 YES shares',
    market: 'Bitcoin $100k by 2025?',
    marketId: '1',
    time: '2m ago',
    amount: '$500',
  },
  {
    id: '2',
    type: 'comment',
    user: 'bob.sol',
    action: 'commented on',
    market: 'AI surpass humans by 2030?',
    marketId: '2',
    time: '5m ago',
  },
  {
    id: '3',
    type: 'win',
    user: 'charlie.eth',
    action: 'won',
    market: 'Will ETH hit $5k?',
    marketId: '3',
    time: '12m ago',
    amount: '$1,250',
  },
  {
    id: '4',
    type: 'trade',
    user: 'diana.sol',
    action: 'sold 50 NO shares',
    market: 'Recession in 2025?',
    marketId: '4',
    time: '18m ago',
    amount: '$250',
  },
  {
    id: '5',
    type: 'resolution',
    user: 'oracle.eth',
    action: 'resolved',
    market: 'Election prediction',
    marketId: '5',
    time: '25m ago',
  },
]

const ACTIVITY_ICONS = {
  trade: <TrendingUp className="w-3.5 h-3.5 text-brand-primary" />,
  comment: <MessageSquare className="w-3.5 h-3.5 text-brand-accent" />,
  resolution: <Clock className="w-3.5 h-3.5 text-status-info" />,
  win: <Trophy className="w-3.5 h-3.5 text-status-success" />,
}

export function RecentActivity() {
  return (
    <Card variant="dark" className="p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
        <ActivityIcon className="w-4 h-4 text-brand-primary" />
        Recent Activity
      </h3>
      <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-hide">
        {MOCK_ACTIVITY.map((activity) => (
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
                  {activity.time}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
