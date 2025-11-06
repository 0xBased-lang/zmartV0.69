/**
 * useTrade Hook - Blockchain Transaction Execution
 *
 * Handles complete trade execution flow:
 * 1. Build Solana transaction
 * 2. Request wallet signature
 * 3. Submit to blockchain
 * 4. Monitor confirmation
 * 5. Update UI on success/failure
 *
 * --ultrathink Analysis:
 * - Transaction state machine (7 states)
 * - Error recovery with typed errors
 * - Optimistic UI updates
 * - React Query cache invalidation
 * - Multi-wallet support
 */

'use client';

import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { useQueryClient } from '@tanstack/react-query';
import {
  Outcome,
  TradeAction,
  type TradeResult,
  fromFixedPoint,
} from '@/lib/lmsr';

/**
 * Transaction execution states
 */
export enum TransactionState {
  /** No active transaction */
  IDLE = 'idle',
  /** Building transaction */
  BUILDING = 'building',
  /** Awaiting wallet signature */
  CONFIRMING = 'confirming',
  /** Submitting to blockchain */
  SUBMITTING = 'submitting',
  /** Waiting for blockchain confirmation */
  CONFIRMING_TX = 'confirming_tx',
  /** Transaction successful */
  SUCCESS = 'success',
  /** Transaction failed */
  ERROR = 'error',
}

/**
 * Typed transaction errors
 */
export class TransactionError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'TransactionError';
  }
}

/**
 * Transaction execution parameters
 */
export interface ExecuteTradeParams {
  marketId: string;
  action: TradeAction;
  outcome: Outcome;
  quantity: bigint;
  tradeResult: TradeResult;
  maxSlippage: number; // Percentage (0-100)
}

/**
 * Transaction execution result
 */
export interface ExecuteTradeResult {
  signature: string;
  slot: number;
}

/**
 * Hook return type
 */
export interface UseTradeReturn {
  /** Current transaction state */
  state: TransactionState;
  /** Transaction signature (if submitted) */
  signature: string | null;
  /** Error details (if failed) */
  error: TransactionError | null;
  /** Execute trade transaction */
  executeTrade: (params: ExecuteTradeParams) => Promise<ExecuteTradeResult | null>;
  /** Reset to idle state */
  reset: () => void;
  /** Retry failed transaction */
  retry: () => Promise<ExecuteTradeResult | null>;
}

/**
 * Transaction execution hook with complete lifecycle management
 *
 * @example
 * ```tsx
 * const { state, signature, error, executeTrade, reset } = useTrade();
 *
 * const handleTrade = async () => {
 *   try {
 *     const result = await executeTrade({
 *       marketId: 'abc123',
 *       action: TradeAction.BUY,
 *       outcome: Outcome.YES,
 *       quantity: toFixedPoint(10),
 *       tradeResult,
 *       maxSlippage: 1
 *     });
 *     console.log('Transaction:', result.signature);
 *   } catch (err) {
 *     console.error('Trade failed:', err);
 *   }
 * };
 * ```
 */
export function useTrade(): UseTradeReturn {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const queryClient = useQueryClient();

  // State
  const [state, setState] = useState<TransactionState>(TransactionState.IDLE);
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<TransactionError | null>(null);
  const [lastParams, setLastParams] = useState<ExecuteTradeParams | null>(null);

  /**
   * Build Solana transaction for trade execution
   *
   * NOTE: This is a MOCK implementation until Solana programs are deployed.
   * The structure matches what the real implementation will look like.
   */
  const buildTransaction = useCallback(
    async (params: ExecuteTradeParams): Promise<Transaction> => {
      if (!publicKey) {
        throw new TransactionError(
          'Wallet not connected',
          'WALLET_NOT_CONNECTED',
          false
        );
      }

      setState(TransactionState.BUILDING);

      try {
        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash('confirmed');

        // Create transaction
        const transaction = new Transaction({
          recentBlockhash: blockhash,
          feePayer: publicKey,
        });

        // TODO: Add actual program instructions when deployed
        // This is the STRUCTURE that will be used:
        //
        // const marketPubkey = new PublicKey(params.marketId);
        //
        // // Add compute budget (LMSR calculations need more compute)
        // const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
        //   units: 200_000 // Sufficient for LMSR math
        // });
        // transaction.add(computeBudgetIx);
        //
        // // Add priority fee for faster confirmation
        // const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
        //   microLamports: 1 // 1 microlamport per compute unit
        // });
        // transaction.add(priorityFeeIx);
        //
        // // Build trade instruction (buy or sell)
        // const tradeIx = await program.methods
        //   .executeTrade(
        //     params.action === TradeAction.BUY ? { buy: {} } : { sell: {} },
        //     params.outcome === Outcome.YES ? { yes: {} } : { no: {} },
        //     params.quantity,
        //     params.tradeResult.finalAmount, // Max cost or min proceeds
        //   )
        //   .accounts({
        //     market: marketPubkey,
        //     user: publicKey,
        //     userPosition: userPositionPDA,
        //     systemProgram: SystemProgram.programId,
        //   })
        //   .instruction();
        //
        // transaction.add(tradeIx);

        // MOCK: For now, just return empty transaction
        // This allows UI testing without actual program
        console.log('[MOCK] Building transaction:', {
          marketId: params.marketId,
          action: params.action,
          outcome: params.outcome,
          quantity: fromFixedPoint(params.quantity),
          cost: fromFixedPoint(params.tradeResult.finalAmount),
        });

        return transaction;
      } catch (err) {
        throw new TransactionError(
          `Failed to build transaction: ${err instanceof Error ? err.message : 'Unknown error'}`,
          'BUILD_FAILED',
          true
        );
      }
    },
    [connection, publicKey]
  );

  /**
   * Request signature from wallet
   */
  const requestSignature = useCallback(
    async (transaction: Transaction): Promise<Transaction> => {
      if (!signTransaction) {
        throw new TransactionError(
          'Wallet does not support signing',
          'WALLET_NO_SIGN',
          false
        );
      }

      setState(TransactionState.CONFIRMING);

      try {
        const signedTransaction = await signTransaction(transaction);
        return signedTransaction;
      } catch (err) {
        // User rejected signature
        if (err instanceof Error && err.message.includes('User rejected')) {
          throw new TransactionError(
            'Transaction signature rejected by user',
            'USER_REJECTED',
            true
          );
        }

        throw new TransactionError(
          `Failed to sign transaction: ${err instanceof Error ? err.message : 'Unknown error'}`,
          'SIGN_FAILED',
          true
        );
      }
    },
    [signTransaction]
  );

  /**
   * Submit transaction to blockchain
   */
  const submitTransaction = useCallback(
    async (signedTransaction: Transaction): Promise<string> => {
      setState(TransactionState.SUBMITTING);

      try {
        // MOCK: For now, simulate transaction submission
        // Real implementation would be:
        // const signature = await connection.sendRawTransaction(
        //   signedTransaction.serialize(),
        //   {
        //     skipPreflight: false,
        //     preflightCommitment: 'confirmed',
        //   }
        // );

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Generate mock signature
        const mockSignature = Array.from({ length: 88 }, () =>
          'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789'.charAt(
            Math.floor(Math.random() * 58)
          )
        ).join('');

        console.log('[MOCK] Transaction submitted:', mockSignature);

        return mockSignature;
      } catch (err) {
        throw new TransactionError(
          `Failed to submit transaction: ${err instanceof Error ? err.message : 'Unknown error'}`,
          'SUBMIT_FAILED',
          true
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /**
   * Wait for transaction confirmation
   */
  const confirmTransaction = useCallback(
    async (signature: string): Promise<number> => {
      setState(TransactionState.CONFIRMING_TX);

      try {
        // MOCK: Simulate confirmation wait
        // Real implementation would be:
        // const confirmation = await connection.confirmTransaction(
        //   signature,
        //   'confirmed'
        // );
        //
        // if (confirmation.value.err) {
        //   throw new Error('Transaction failed on-chain');
        // }
        //
        // return confirmation.context.slot;

        // Simulate blockchain confirmation (2-3 seconds)
        await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 1000));

        const mockSlot = Math.floor(Date.now() / 400); // Mock slot number

        console.log('[MOCK] Transaction confirmed at slot:', mockSlot);

        return mockSlot;
      } catch (err) {
        throw new TransactionError(
          `Transaction confirmation failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
          'CONFIRMATION_FAILED',
          false // Not recoverable after submission
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /**
   * Invalidate relevant queries after successful trade
   */
  const invalidateQueries = useCallback(
    (marketId: string) => {
      // Invalidate market data (prices updated)
      queryClient.invalidateQueries({ queryKey: ['market', marketId] });
      queryClient.invalidateQueries({ queryKey: ['market-state', marketId] });

      // Invalidate user position
      if (publicKey) {
        queryClient.invalidateQueries({
          queryKey: ['position', marketId, publicKey.toBase58()],
        });
      }

      // Invalidate market list (volume changed)
      queryClient.invalidateQueries({ queryKey: ['markets'] });
    },
    [queryClient, publicKey]
  );

  /**
   * Execute complete trade flow
   */
  const executeTrade = useCallback(
    async (params: ExecuteTradeParams): Promise<ExecuteTradeResult | null> => {
      // Save params for retry
      setLastParams(params);
      setError(null);

      try {
        // 1. Build transaction
        const transaction = await buildTransaction(params);

        // 2. Request signature
        const signedTransaction = await requestSignature(transaction);

        // 3. Submit to blockchain
        const txSignature = await submitTransaction(signedTransaction);
        setSignature(txSignature);

        // 4. Wait for confirmation
        const slot = await confirmTransaction(txSignature);

        // 5. Update UI
        setState(TransactionState.SUCCESS);

        // 6. Invalidate queries
        invalidateQueries(params.marketId);

        return {
          signature: txSignature,
          slot,
        };
      } catch (err) {
        const error =
          err instanceof TransactionError
            ? err
            : new TransactionError(
                err instanceof Error ? err.message : 'Unknown error',
                'UNKNOWN_ERROR',
                true
              );

        setError(error);
        setState(TransactionState.ERROR);
        return null;
      }
    },
    [buildTransaction, requestSignature, submitTransaction, confirmTransaction, invalidateQueries]
  );

  /**
   * Retry failed transaction
   */
  const retry = useCallback(async (): Promise<ExecuteTradeResult | null> => {
    if (!lastParams) {
      throw new Error('No transaction to retry');
    }

    return executeTrade(lastParams);
  }, [lastParams, executeTrade]);

  /**
   * Reset to idle state
   */
  const reset = useCallback(() => {
    setState(TransactionState.IDLE);
    setSignature(null);
    setError(null);
    setLastParams(null);
  }, []);

  return {
    state,
    signature,
    error,
    executeTrade,
    reset,
    retry,
  };
}
