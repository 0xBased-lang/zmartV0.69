import { AppLayout } from '@/components/layout/AppLayout';

/**
 * Layout for authenticated app pages
 * Uses AppLayout wrapper with header, footer, and consistent spacing
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
