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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Discussion</h2>
        {proposalId && (
          <Link
            href={`/proposals/${proposalId}`}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View Full Proposal →
          </Link>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="text-center py-8 text-gray-500">
          <p>Failed to load discussions</p>
          <p className="text-sm mt-1">Please try refreshing the page</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && discussions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No discussions yet</p>
          <p className="text-sm mt-1">Be the first to comment on this market</p>
        </div>
      )}

      {/* Discussion Preview */}
      {!isLoading && !error && discussions.length > 0 && (
        <div className="space-y-4">
          {discussions.map((discussion) => (
          <div
            key={discussion.id}
            className="border-l-2 border-gray-200 pl-4 py-2"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-gray-600">
                  {discussion.author.slice(0, 6)}...
                  {discussion.author.slice(-4)}
                </span>
                <span className="text-xs text-gray-500">
                  {formatTimeAgo(discussion.timestamp)}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
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
                {discussion.votes}
              </div>
            </div>
            <p className="text-sm text-gray-700">{discussion.content}</p>
          </div>
        ))}
        </div>
      )}

      {/* View More Link */}
      {!isLoading && !error && discussions.length > 0 && proposalId ? (
        <div className="mt-6 text-center">
          <Link
            href={`/proposals/${proposalId}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors font-medium"
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
