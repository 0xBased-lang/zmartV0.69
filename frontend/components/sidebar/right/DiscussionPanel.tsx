'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageSquare, ThumbsUp, Reply } from 'lucide-react'

interface Comment {
  id: string
  user: string
  avatar: string
  content: string
  likes: number
  time: string
  replies?: number
}

const MOCK_COMMENTS: Comment[] = [
  {
    id: '1',
    user: 'alice.eth',
    avatar: '👩',
    content: 'Strong fundamentals support this outcome. The technical analysis shows clear momentum.',
    likes: 12,
    time: '2h ago',
    replies: 3,
  },
  {
    id: '2',
    user: 'bob.sol',
    avatar: '👨',
    content: 'Not convinced yet. Need to see more data before making a decision.',
    likes: 5,
    time: '4h ago',
    replies: 1,
  },
  {
    id: '3',
    user: 'charlie.eth',
    avatar: '🦊',
    content: 'Historical patterns suggest this is highly probable. Similar events in the past had 80%+ success rate.',
    likes: 18,
    time: '6h ago',
    replies: 5,
  },
]

interface DiscussionPanelProps {
  marketId?: string
}

export function DiscussionPanel({ marketId }: DiscussionPanelProps) {
  return (
    <Card variant="dark" className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-brand-primary" />
          Discussion
        </h3>
        <Button variant="primary" size="sm" className="text-xs">
          + Comment
        </Button>
      </div>

      {/* Comments */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-hide">
        {MOCK_COMMENTS.map((comment) => (
          <div
            key={comment.id}
            className="p-3 rounded-md bg-surface-elevated border border-border-default hover:border-border-interactive transition-colors"
          >
            {/* User Info */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">{comment.avatar}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-brand-primary truncate">
                  {comment.user}
                </div>
                <div className="text-xs text-text-tertiary">{comment.time}</div>
              </div>
            </div>

            {/* Content */}
            <p className="text-xs text-text-secondary leading-relaxed mb-2">
              {comment.content}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-1 text-xs text-text-tertiary hover:text-brand-primary transition-colors">
                <ThumbsUp className="w-3 h-3" />
                {comment.likes}
              </button>
              {comment.replies && comment.replies > 0 && (
                <button className="flex items-center gap-1 text-xs text-text-tertiary hover:text-brand-primary transition-colors">
                  <Reply className="w-3 h-3" />
                  {comment.replies}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* View All Link */}
      <div className="mt-3 pt-3 border-t border-border-default">
        <Button
          variant="darkGhost"
          size="sm"
          className="w-full text-xs"
        >
          View All Comments →
        </Button>
      </div>
    </Card>
  )
}
