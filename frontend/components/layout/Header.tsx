'use client';

import { WalletButton } from '@/components/wallet/WalletButton';

export function Header() {
  return (
    <header className="border-b bg-white sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">ZMART</h1>
          <p className="text-xs text-gray-500">Decentralized Prediction Markets</p>
        </div>
        <WalletButton />
      </div>
    </header>
  );
}
