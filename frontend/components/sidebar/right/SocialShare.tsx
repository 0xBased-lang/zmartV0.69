'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Twitter, Send, Share2, Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface SocialShareProps {
  marketId?: string
  marketQuestion?: string
}

export function SocialShare({ marketId, marketQuestion }: SocialShareProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const url = marketId
      ? `${window.location.origin}/markets/${marketId}`
      : window.location.href

    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleTwitterShare = () => {
    const text = marketQuestion
      ? `Check out this prediction market: ${marketQuestion}`
      : 'Check out ZMART - Decentralized Prediction Markets'
    const url = marketId
      ? `${window.location.origin}/markets/${marketId}`
      : window.location.origin
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      '_blank'
    )
  }

  const handleTelegramShare = () => {
    const text = marketQuestion || 'Check out ZMART Prediction Markets'
    const url = marketId
      ? `${window.location.origin}/markets/${marketId}`
      : window.location.origin
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      '_blank'
    )
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: marketQuestion || 'ZMART Prediction Market',
          url: marketId
            ? `${window.location.origin}/markets/${marketId}`
            : window.location.href,
        })
      } catch (err) {
        // User cancelled or share failed
        console.log('Share failed:', err)
      }
    }
  }

  return (
    <Card variant="dark" className="p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
        <Share2 className="w-4 h-4 text-brand-primary" />
        Share
      </h3>
      <div className="space-y-2">
        {/* Twitter */}
        <Button
          variant="darkSecondary"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={handleTwitterShare}
        >
          <Twitter className="w-4 h-4" />
          Share on Twitter
        </Button>

        {/* Telegram */}
        <Button
          variant="darkSecondary"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={handleTelegramShare}
        >
          <Send className="w-4 h-4" />
          Share on Telegram
        </Button>

        {/* Native Share (Mobile) */}
        {typeof navigator !== 'undefined' && navigator.share && (
          <Button
            variant="darkSecondary"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={handleNativeShare}
          >
            <Share2 className="w-4 h-4" />
            Share
          </Button>
        )}

        {/* Copy Link */}
        <Button
          variant="darkSecondary"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-status-success" />
              Link Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy Link
            </>
          )}
        </Button>
      </div>
    </Card>
  )
}
