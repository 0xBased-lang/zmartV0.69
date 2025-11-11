'use client';

import { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey, Transaction } from '@solana/web3.js';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { ButtonSpinner } from '@/components/ui/LoadingSpinner';

interface ClaimButtonProps {
  marketId: string;
  marketState: string;
  outcome: boolean | null; // true = YES won, false = NO won, null = not resolved
  userYesShares: number;
  userNoShares: number;
  className?: string;
}

/**
 * Button to claim winnings from finalized markets
 *
 * Requirements:
 * - Market must be in FINALIZED state
 * - User must have shares in winning outcome
 * - One-time claim per user per market
 */
export function ClaimButton({
  marketId,
  marketState,
  outcome,
  userYesShares,
  userNoShares,
  className
}: ClaimButtonProps) {
  const { publicKey, wallet, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  // Check if user can claim
  const canClaim =
    marketState === 'FINALIZED' &&
    outcome !== null &&
    ((outcome === true && userYesShares > 0) || (outcome === false && userNoShares > 0)) &&
    !claimed;

  // Calculate potential winnings
  const winningShares = outcome === true ? userYesShares : userNoShares;

  const handleClaim = async () => {
    if (!publicKey || !wallet || !signTransaction || !canClaim) {
      toast.error('Cannot claim. Please check requirements.');
      return;
    }

    setClaiming(true);

    try {
      // Build claim_payout transaction
      // TODO: Replace with actual Anchor program integration

      // For now, show success message (will be replaced with real transaction)
      toast.success(
        `Claimed ${winningShares.toFixed(2)} ${outcome ? 'YES' : 'NO'} shares!`,
        { duration: 5000 }
      );

      setClaimed(true);

      // TODO: Actual implementation:
      // 1. Get program instance
      // 2. Get market account PDA
      // 3. Get user position PDA
      // 4. Build claim_payout instruction
      // 5. Sign and send transaction
      // 6. Wait for confirmation
      // 7. Update UI

      /*
      const programId = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID!);

      const [marketPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('market'), Buffer.from(marketId)],
        programId
      );

      const [userPositionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('position'), marketPda.toBuffer(), publicKey.toBuffer()],
        programId
      );

      const provider = new AnchorProvider(
        connection,
        wallet.adapter as any,
        { commitment: 'confirmed' }
      );

      const program = new Program(IDL, programId, provider);

      const tx = await program.methods
        .claimPayout()
        .accounts({
          market: marketPda,
          userPosition: userPositionPda,
          user: publicKey,
        })
        .transaction();

      const signed = await signTransaction(tx);
      const signature = await connection.sendRawTransaction(signed.serialize());

      await connection.confirmTransaction(signature, 'confirmed');

      toast.success(`Claimed winnings! Signature: ${signature.slice(0, 8)}...`);
      setClaimed(true);
      */

    } catch (error) {
      console.error('Claim failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('rejected')) {
        toast.error('Transaction cancelled');
      } else if (errorMessage.includes('insufficient')) {
        toast.error('Insufficient SOL for transaction fees');
      } else {
        toast.error(`Claim failed: ${errorMessage}`);
      }
    } finally {
      setClaiming(false);
    }
  };

  // Don't show button if cannot claim
  if (!canClaim && !claimed) {
    return null;
  }

  // Already claimed
  if (claimed) {
    return (
      <div className={cn('bg-green-50 border border-green-200 rounded-lg p-4', className)}>
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="text-green-900 font-medium">
            Winnings Claimed!
          </span>
        </div>
      </div>
    );
  }

  // Can claim
  return (
    <div className={cn('space-y-3', className)}>
      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">
              Congratulations! You Won! 🎉
            </h4>
            <p className="text-sm text-blue-800">
              You have {winningShares.toFixed(2)} winning {outcome ? 'YES' : 'NO'} shares.
              Click below to claim your payout.
            </p>
          </div>
        </div>
      </div>

      {/* Claim button */}
      <button
        onClick={handleClaim}
        disabled={claiming}
        className={cn(
          'w-full px-6 py-3 font-semibold rounded-lg transition-all',
          'bg-gradient-to-r from-green-600 to-emerald-600 text-white',
          'hover:from-green-700 hover:to-emerald-700',
          'focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'flex items-center justify-center gap-2'
        )}
      >
        {claiming ? (
          <>
            <ButtonSpinner />
            <span>Claiming Winnings...</span>
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Claim Winnings</span>
          </>
        )}
      </button>

      {/* Help text */}
      <p className="text-xs text-gray-500 text-center">
        You will receive SOL equivalent to your winning shares
      </p>
    </div>
  );
}
