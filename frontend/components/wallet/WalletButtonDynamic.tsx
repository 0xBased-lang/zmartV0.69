'use client';

import dynamic from 'next/dynamic';

/**
 * Dynamic import of WalletMultiButton with SSR disabled
 *
 * This prevents React hydration errors caused by the Solana wallet adapter
 * accessing browser-specific APIs (window, localStorage) during SSR.
 *
 * The component will only render on the client side after initial page load.
 */
export const WalletMultiButtonDynamic = dynamic(
  async () => {
    const { WalletMultiButton } = await import('@solana/wallet-adapter-react-ui');
    return WalletMultiButton;
  },
  {
    ssr: false,
    loading: () => (
      <button
        className="!bg-brand-primary !text-text-primary-inverse !rounded-lg !px-4 !py-2 !font-medium shadow-glow !transition-all !duration-200 !cursor-wait opacity-70"
        disabled
      >
        Loading Wallet...
      </button>
    ),
  }
);
