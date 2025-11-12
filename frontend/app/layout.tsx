import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { DebugPanel } from '@/components/dev/DebugPanel'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'ZMART - Decentralized Prediction Markets',
  description: 'Trade predictions on Solana with LMSR market making',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <Providers>
          {children}
          <DebugPanel />
        </Providers>
      </body>
    </html>
  )
}
