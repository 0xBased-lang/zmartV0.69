'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface Topic {
  id: string
  name: string
  count: number
  trend: string
  emoji: string
}

export function HotTopics() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true)
        setError(null)

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
        const response = await fetch(`${apiUrl}/api/markets/categories`)

        if (!response.ok) {
          throw new Error('Failed to fetch categories')
        }

        const data = await response.json()
        setTopics(data.categories || [])
      } catch (err) {
        console.error('Error fetching categories:', err)
        setError('Failed to load categories')
        setTopics([])
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()

    // Refresh every 5 minutes
    const interval = setInterval(fetchCategories, 300000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Card variant="dark" className="p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <span className="text-lg">🔥</span>
          Hot Topics
        </h3>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={`skeleton-${i}`} className="h-10 bg-surface-elevated rounded animate-pulse" />
          ))}
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card variant="dark" className="p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <span className="text-lg">🔥</span>
          Hot Topics
        </h3>
        <div className="text-xs text-status-error text-center py-4">{error}</div>
      </Card>
    )
  }

  return (
    <Card variant="dark" className="p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
        <span className="text-lg">🔥</span>
        Hot Topics
      </h3>
      {topics.length === 0 ? (
        <div className="text-xs text-text-tertiary text-center py-8">
          No categories yet
        </div>
      ) : (
        <div className="space-y-2">
          {topics.map((topic) => (
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
      )}
    </Card>
  )
}
