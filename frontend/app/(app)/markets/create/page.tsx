'use client';

import { useRouter } from 'next/navigation';
import { MarketCreationForm } from '@/components/markets/MarketCreationForm';

export default function CreateMarketPage() {
  const router = useRouter();

  const handleSuccess = (marketId: string) => {
    // Redirect to the new market page after creation
    router.push(`/markets/${marketId}`);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create a Market</h1>
        <p className="text-gray-600 mt-2">
          Submit a new prediction market for community voting
        </p>
      </div>

      <MarketCreationForm onSuccess={handleSuccess} />
    </div>
  );
}
