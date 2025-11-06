import Link from 'next/link';

interface EmptyStateProps {
  hasFilters?: boolean;
}

/**
 * Empty state shown when no markets are found
 * Shows different messages based on whether filters are active
 */
export function EmptyState({ hasFilters = false }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">🔍</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {hasFilters ? 'No markets found' : 'No markets yet'}
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        {hasFilters
          ? 'Try adjusting your filters to see more markets.'
          : 'Be the first to create a prediction market!'}
      </p>
      {!hasFilters && (
        <Link
          href="/markets/create"
          className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
        >
          Create Market
        </Link>
      )}
    </div>
  );
}
