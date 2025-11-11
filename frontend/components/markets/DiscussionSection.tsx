'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getDiscussions } from '@/lib/supabase/database';

interface DiscussionSectionProps {
  marketId: string;
  proposalId: string | null;
}

/**
 * Discussion section showing preview and link to proposal
 * Read-only for v1, links to full proposal page
 */
export function DiscussionSection({
  marketId,
  proposalId,
}: DiscussionSectionProps) {
  // Fetch real discussions from Supabase
  const { data: discussions = [], isLoading, error } = useQuery({
    queryKey: ['discussions', marketId],
    queryFn: () => getDiscussions(marketId),
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  return (
    <div className="bg-surface-card rounded-lg shadow-glow border border-border-default p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-display font-bold text-text-primary">Discussion</h2>
        {proposalId && (
          <Link
            href={`/proposals/${proposalId}`}
            className="text-sm text-brand-primary hover:text-brand-accent font-medium transition-colors"
          >
            View Full Proposal →
          </Link>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="text-center py-8 text-text-secondary">
          <p>Failed to load discussions</p>
          <p className="text-sm mt-1">Please try refreshing the page</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && discussions.length === 0 && (
        <div className="text-center py-8 text-text-secondary">
          <p>No discussions yet</p>
          <p className="text-sm mt-1">Be the first to comment on this market</p>
        </div>
      )}

      {/* Discussion Preview */}
      {!isLoading && !error && discussions.length > 0 && (
        <div className="space-y-4">
          {discussions.map((discussion) => (
          <div
            key={discussion.discussion_id}
            className="border-l-2 border-border-subtle pl-4 py-2"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-text-tertiary">
                  {discussion.wallet.slice(0, 6)}...
                  {discussion.wallet.slice(-4)}
                </span>
                <span className="text-xs text-text-tertiary">
                  {formatTimeAgo(new Date(discussion.created_at))}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-text-tertiary">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 15l7-7 7 7"
                  />
                </svg>
                {discussion.upvotes}
              </div>
            </div>
            <p className="text-sm text-text-secondary">{discussion.content}</p>
          </div>
        ))}
        </div>
      )}

      {/* View More Link */}
      {!isLoading && !error && discussions.length > 0 && proposalId ? (
        <div className="mt-6 text-center">
          <Link
            href={`/proposals/${proposalId}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary/10 border border-brand-primary/20 text-brand-primary rounded-lg hover:bg-brand-primary/20 shadow-glow transition-all duration-200 font-medium"
          >
            <span>View All Discussions</span>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Format timestamp as relative time
 */
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 2592000)}mo ago`;
}
