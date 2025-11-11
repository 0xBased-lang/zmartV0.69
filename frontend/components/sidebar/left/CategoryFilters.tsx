'use client'

import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Category {
  id: string
  name: string
  icon: string
  color: string
}

const CATEGORIES: Category[] = [
  { id: 'all', name: 'All Markets', icon: '🌐', color: 'text-brand-primary' },
  { id: 'crypto', name: 'Crypto', icon: '₿', color: 'text-status-warning' },
  { id: 'politics', name: 'Politics', icon: '🗳️', color: 'text-brand-secondary' },
  { id: 'sports', name: 'Sports', icon: '⚽', color: 'text-status-success' },
  { id: 'tech', name: 'Technology', icon: '💻', color: 'text-brand-accent' },
  { id: 'finance', name: 'Finance', icon: '💰', color: 'text-status-warning' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: 'text-brand-secondary' },
  { id: 'science', name: 'Science', icon: '🔬', color: 'text-brand-accent' },
]

export function CategoryFilters() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentCategory = searchParams.get('category') || 'all'

  return (
    <Card variant="dark" className="p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-3">
        Categories
      </h3>
      <div className="space-y-1">
        {CATEGORIES.map((category) => {
          const isActive = currentCategory === category.id
          return (
            <Link
              key={category.id}
              href={
                category.id === 'all'
                  ? '/markets'
                  : `/markets?category=${category.id}`
              }
              className={cn(
                'flex items-center gap-3 p-2 rounded-md transition-all',
                isActive
                  ? 'bg-surface-elevated border border-border-interactive text-text-primary font-medium'
                  : 'hover:bg-surface-elevated text-text-secondary hover:text-text-primary'
              )}
            >
              <span className={cn('text-base', category.color)}>
                {category.icon}
              </span>
              <span className="text-sm">{category.name}</span>
            </Link>
          )
        })}
      </div>
    </Card>
  )
}
