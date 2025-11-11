'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface Topic {
  id: number
  name: string
  count: number
  trend: string
  emoji: string
}

const MOCK_TOPICS: Topic[] = [
  { id: 1, name: 'Crypto', count: 42, trend: '+12%', emoji: '₿' },
  { id: 2, name: 'Politics', count: 38, trend: '+8%', emoji: '🗳️' },
  { id: 3, name: 'Sports', count: 29, trend: '+5%', emoji: '⚽' },
  { id: 4, name: 'Tech', count: 24, trend: '+15%', emoji: '💻' },
  { id: 5, name: 'Finance', count: 19, trend: '+3%', emoji: '💰' },
]

export function HotTopics() {
  return (
    <Card variant="dark" className="p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
        <span className="text-lg">🔥</span>
        Hot Topics
      </h3>
      <div className="space-y-2">
        {MOCK_TOPICS.map((topic) => (
          <Link
            key={topic.id}
            href={`/markets?category=${topic.name.toLowerCase()}`}
            className="flex items-center justify-between p-2 rounded-md hover:bg-surface-elevated transition-colors group"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{topic.emoji}</span>
              <span className="text-text-primary font-medium text-sm group-hover:text-brand-primary transition-colors">
                {topic.name}
              </span>
              <Badge variant="dark" className="text-xs">
                {topic.count}
              </Badge>
            </div>
            <span className="text-xs text-status-success font-medium">
              {topic.trend}
            </span>
          </Link>
        ))}
      </div>
    </Card>
  )
}
