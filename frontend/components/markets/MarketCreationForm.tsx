'use client';

import { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { getProgram, deriveMarketPDA, deriveGlobalConfigPDA } from '@/lib/solana/transactions';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface MarketCreationFormProps {
  onSuccess?: (marketId: string) => void;
  className?: string;
}

/**
 * Market Creation Form Component
 *
 * Creates a new prediction market in PROPOSED state.
 * Requires wallet connection and SOL for transaction fees.
 *
 * Markets go through this lifecycle:
 * PROPOSED → (voting) → APPROVED → ACTIVE → trading...
 */
export function MarketCreationForm({ onSuccess, className }: MarketCreationFormProps) {
  const { connected, publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  // Form state
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [expiryDays, setExpiryDays] = useState('7');
  const [liquiditySOL, setLiquiditySOL] = useState('1.0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation
  const errors: { [key: string]: string } = {};

  if (question && question.length < 10) {
    errors.question = 'Question must be at least 10 characters';
  }
  if (question && question.length > 200) {
    errors.question = 'Question must be less than 200 characters';
  }
  if (description && description.length > 1000) {
    errors.description = 'Description must be less than 1000 characters';
  }
  const liquidityNum = parseFloat(liquiditySOL);
  if (liquidityNum < 0.1 || liquidityNum > 100) {
    errors.liquidity = 'Liquidity must be between 0.1 and 100 SOL';
  }
  const expiryNum = parseInt(expiryDays);
  if (expiryNum < 1 || expiryNum > 365) {
    errors.expiry = 'Expiry must be between 1 and 365 days';
  }

  const canSubmit =
    connected &&
    question.trim().length >= 10 &&
    description.trim().length > 0 &&
    category.trim().length > 0 &&
    Object.keys(errors).length === 0 &&
    !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit || !publicKey || !signTransaction) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate unique market ID (32 bytes)
      const marketId = new Uint8Array(32);
      crypto.getRandomValues(marketId);
      const marketIdHex = Buffer.from(marketId).toString('hex');

      console.log('[MarketCreation] Creating market:', {
        question,
        marketId: marketIdHex,
        liquidity: liquidityNum,
      });

      // Calculate parameters
      const initialLiquidity = BigInt(Math.floor(liquidityNum * 1_000_000_000)); // SOL to lamports
      const bParameter = initialLiquidity; // Use liquidity as b parameter for now

      // Create IPFS hash placeholder (46 bytes)
      // TODO: In production, upload metadata to IPFS first
      const metadata = {
        question,
        description,
        category,
        expiryTimestamp: Date.now() + expiryNum * 24 * 60 * 60 * 1000,
        createdAt: Date.now(),
      };
      const ipfsHash = new Uint8Array(46);
      // Fill with placeholder data (in production, this would be the actual IPFS CID)
      const metadataStr = JSON.stringify(metadata).substring(0, 46);
      for (let i = 0; i < Math.min(metadataStr.length, 46); i++) {
        ipfsHash[i] = metadataStr.charCodeAt(i);
      }

      // Get Anchor program
      const program = getProgram(connection, { publicKey, signTransaction });
      const programId = program.programId;

      // Derive PDAs
      const [marketPDA] = deriveMarketPDA(programId, marketIdHex);
      const [globalConfigPDA] = deriveGlobalConfigPDA(programId);

      console.log('[MarketCreation] PDAs:', {
        market: marketPDA.toBase58(),
        globalConfig: globalConfigPDA.toBase58(),
      });

      // Build create_market instruction
      const ix = await program.methods
        .createMarket(
          Array.from(marketId),
          new BN(bParameter.toString()),
          new BN(initialLiquidity.toString()),
          Array.from(ipfsHash)
        )
        .accounts({
          creator: publicKey,
          market: marketPDA,
          globalConfig: globalConfigPDA,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      // Build transaction
      const transaction = new Transaction();
      transaction.add(ix);

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      transaction.feePayer = publicKey;

      // Sign transaction
      const signedTx = await signTransaction(transaction);

      // Submit to blockchain
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      console.log('[MarketCreation] Transaction submitted:', signature);

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');

      if (confirmation.value.err) {
        throw new Error('Transaction failed on blockchain');
      }

      console.log('[MarketCreation] Transaction confirmed!');

      toast.success('Market created successfully! 🎉');

      // Reset form
      setQuestion('');
      setDescription('');
      setCategory('');
      setExpiryDays('7');
      setLiquiditySOL('1.0');

      // Callback
      onSuccess?.(marketIdHex);

    } catch (err) {
      console.error('[MarketCreation] Failed:', err);

      let errorMessage = 'Failed to create market';
      if (err instanceof Error) {
        if (err.message.includes('User rejected')) {
          errorMessage = 'Transaction cancelled by user';
        } else if (err.message.includes('insufficient')) {
          errorMessage = 'Insufficient SOL balance';
        } else {
          errorMessage = err.message;
        }
      }

      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      {/* Question */}
      <div>
        <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
          Market Question <span className="text-red-500">*</span>
        </label>
        <input
          id="question"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Will Bitcoin reach $100,000 by end of 2025?"
          className={cn(
            'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            errors.question ? 'border-red-500' : 'border-gray-300'
          )}
          maxLength={200}
          disabled={isSubmitting}
        />
        <div className="flex justify-between mt-1">
          <span className="text-sm text-gray-500">
            {question.length}/200 characters
          </span>
          {errors.question && (
            <span className="text-sm text-red-600">{errors.question}</span>
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Provide details about resolution criteria, sources, and any important context..."
          className={cn(
            'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            errors.description ? 'border-red-500' : 'border-gray-300'
          )}
          rows={4}
          maxLength={1000}
          disabled={isSubmitting}
        />
        <div className="flex justify-between mt-1">
          <span className="text-sm text-gray-500">
            {description.length}/1000 characters
          </span>
          {errors.description && (
            <span className="text-sm text-red-600">{errors.description}</span>
          )}
        </div>
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
          Category <span className="text-red-500">*</span>
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isSubmitting}
        >
          <option value="">Select a category</option>
          <option value="crypto">Crypto</option>
          <option value="politics">Politics</option>
          <option value="sports">Sports</option>
          <option value="technology">Technology</option>
          <option value="finance">Finance</option>
          <option value="entertainment">Entertainment</option>
          <option value="science">Science</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Expiry & Liquidity Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Expiry */}
        <div>
          <label htmlFor="expiry" className="block text-sm font-medium text-gray-700 mb-2">
            Expiry (days) <span className="text-red-500">*</span>
          </label>
          <input
            id="expiry"
            type="number"
            value={expiryDays}
            onChange={(e) => setExpiryDays(e.target.value)}
            min="1"
            max="365"
            className={cn(
              'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              errors.expiry ? 'border-red-500' : 'border-gray-300'
            )}
            disabled={isSubmitting}
          />
          {errors.expiry && (
            <span className="text-sm text-red-600 mt-1 block">{errors.expiry}</span>
          )}
        </div>

        {/* Initial Liquidity */}
        <div>
          <label htmlFor="liquidity" className="block text-sm font-medium text-gray-700 mb-2">
            Initial Liquidity (SOL) <span className="text-red-500">*</span>
          </label>
          <input
            id="liquidity"
            type="number"
            value={liquiditySOL}
            onChange={(e) => setLiquiditySOL(e.target.value)}
            min="0.1"
            max="100"
            step="0.1"
            className={cn(
              'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              errors.liquidity ? 'border-red-500' : 'border-gray-300'
            )}
            disabled={isSubmitting}
          />
          {errors.liquidity && (
            <span className="text-sm text-red-600 mt-1 block">{errors.liquidity}</span>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Higher liquidity = less price impact for traders
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 text-sm mb-2">
          ℹ️ How Market Creation Works
        </h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Your market starts in <strong>PROPOSED</strong> state</li>
          <li>• Community votes on proposal (approval requires 70%+ likes)</li>
          <li>• If approved, market transitions to <strong>ACTIVE</strong> for trading</li>
          <li>• Initial liquidity determines price sensitivity (LMSR parameter)</li>
          <li>• You&apos;ll receive 2% of all trading fees as creator</li>
        </ul>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!canSubmit}
        className={cn(
          'w-full px-6 py-4 text-lg font-semibold rounded-lg transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          canSubmit
            ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        )}
      >
        {isSubmitting
          ? 'Creating Market...'
          : !connected
            ? 'Connect Wallet to Create'
            : 'Create Market'}
      </button>

      {/* Requirements */}
      {!connected && (
        <div className="text-center text-sm text-gray-600 bg-gray-50 rounded-lg p-4">
          <p>Connect your Solana wallet to create a market</p>
          <p className="text-xs mt-1 text-gray-500">
            Estimated cost: ~{liquidityNum} SOL (liquidity) + 0.001 SOL (fees)
          </p>
        </div>
      )}
    </form>
  );
}
