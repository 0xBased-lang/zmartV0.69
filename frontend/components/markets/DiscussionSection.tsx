'use client';

import Link from 'next/link';

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
  // MOCK: Sample discussion data
  // TODO: Fetch actual discussions from Supabase
  const discussions = [
    {
      id: '1',
      author: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      content:
        'This market looks interesting. The resolution criteria are clear and the timeframe is reasonable.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      votes: 12,
    },
    {
      id: '2',
      author: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA3',
      content:
        'I have concerns about the data source. Is there a backup if the primary source becomes unavailable?',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      votes: 8,
    },
    {
      id: '3',
      author: 'C5v68qLr9V7aBkK9dRMZvE4FcA9sPmG4',
      content:
        'Great market! The liquidity looks good and the prices seem fair based on current information.',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      votes: 15,
    },
  ];

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

      {/* Discussion Preview */}
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

      {/* View More Link */}
      {proposalId ? (
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
      ) : (
        <div className="mt-6 text-center text-sm text-gray-500">
          No proposal linked to this market
        </div>
      )}

      {/* MOCK Indicator */}
      <p className="text-xs text-gray-500 mt-4 text-center">
        💬 Mock data - real discussions coming soon
      </p>
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
