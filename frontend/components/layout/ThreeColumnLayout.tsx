'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ThreeColumnLayoutProps {
  leftSidebar?: ReactNode
  rightSidebar?: ReactNode
  children: ReactNode
  hideLeftSidebar?: boolean
  hideRightSidebar?: boolean
  className?: string
}

/**
 * Three-Column Layout Component
 *
 * Responsive layout with optional left and right sidebars:
 * - Mobile (<lg): Single column, sidebars hidden by default
 * - Desktop (≥lg): Three columns (20% | 60% | 20%)
 *
 * @param leftSidebar - Content for left sidebar (hot topics, trending)
 * @param rightSidebar - Content for right sidebar (comments, activity)
 * @param children - Main content area
 * @param hideLeftSidebar - Conditionally hide left sidebar
 * @param hideRightSidebar - Conditionally hide right sidebar
 */
export function ThreeColumnLayout({
  leftSidebar,
  rightSidebar,
  children,
  hideLeftSidebar = false,
  hideRightSidebar = false,
  className,
}: ThreeColumnLayoutProps) {
  return (
    <div className={cn('mx-auto max-w-[1800px] px-4 py-6', className)}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar - 20% width on desktop */}
        {!hideLeftSidebar && leftSidebar && (
          <aside className="hidden lg:block lg:col-span-2 xl:col-span-2">
            <div className="sticky top-20 space-y-4">
              {leftSidebar}
            </div>
          </aside>
        )}

        {/* Main Content - 60% width on desktop, full width on mobile */}
        <main
          className={cn(
            'lg:col-span-8',
            hideLeftSidebar && hideRightSidebar && 'lg:col-span-12',
            hideLeftSidebar && !hideRightSidebar && 'lg:col-span-10',
            !hideLeftSidebar && hideRightSidebar && 'lg:col-span-10'
          )}
        >
          {children}
        </main>

        {/* Right Sidebar - 20% width on desktop */}
        {!hideRightSidebar && rightSidebar && (
          <aside className="hidden lg:block lg:col-span-2 xl:col-span-2">
            <div className="sticky top-20 space-y-4">
              {rightSidebar}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
