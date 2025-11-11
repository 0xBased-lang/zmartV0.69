'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Markets', href: '/markets' },
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Create Market', href: '/markets/create' },
] as const;

export function NavMenu() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex items-center gap-6">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'text-sm font-medium transition-colors hover:text-brand-primary',
              isActive ? 'text-brand-primary' : 'text-text-secondary'
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
