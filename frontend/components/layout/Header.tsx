'use client';

import Link from 'next/link';
import { WalletButton } from '@/components/wallet/WalletButton';
import { NavMenu } from '@/components/navigation/NavMenu';
import { MobileNav } from '@/components/navigation/MobileNav';

export function Header() {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-border-default bg-surface-card/95 backdrop-blur shadow-glow">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center shadow-glow">
            <span className="text-text-primary-inverse font-bold text-lg">Z</span>
          </div>
          <span className="font-display font-bold text-xl text-text-primary hidden sm:block">ZMART</span>
        </Link>

        {/* Desktop Navigation */}
        <NavMenu />

        {/* Right Section */}
        <div className="flex items-center gap-4">
          <WalletButton />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
