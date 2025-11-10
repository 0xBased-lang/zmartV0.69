/**
 * Market Data Generator
 *
 * Generates test markets, trades, and votes for integration testing.
 */

import * as anchor from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';

export interface MarketParams {
  bParameter?: anchor.BN; // Liquidity sensitivity (100-1000 SOL)
  initialLiquidity?: anchor.BN; // Initial liquidity (0.1-100 SOL)
  question?: string;
  state?: number; // Market state (0-5)
}

export interface MarketData {
  id: number[];
  pda: PublicKey;
  bParameter: anchor.BN;
  initialLiquidity: anchor.BN;
  ipfsHash: number[];
  question: string;
  creator: Keypair;
}

export interface TradeParams {
  outcome: boolean; // YES (true) or NO (false)
  amount: anchor.BN; // Amount to spend (in lamports)
}

export interface TradeData {
  id: string;
  marketId: number[];
  user: Keypair;
  outcome: boolean;
  amount: anchor.BN;
  description: string;
}

export interface VoteData {
  id: string;
  marketId: number[];
  user: Keypair;
  isLike: boolean; // true = like, false = dislike
  voteType: 'proposal' | 'dispute';
}

export class MarketGenerator {
  private programId: PublicKey;
  private marketCounter: number = 0;

  constructor(programId: PublicKey) {
    this.programId = programId;
  }

  /**
   * Generate a single market
   * @param params Market parameters
   * @returns Market data
   */
  generateMarket(params: MarketParams = {}): MarketData {
    const id = this.generateMarketId();

    // Default parameters
    const bParameter = params.bParameter || new anchor.BN(100_000_000_000); // 100 SOL
    const initialLiquidity = params.initialLiquidity || new anchor.BN(100_000_000); // 0.1 SOL
    const question = params.question || this.generateRandomQuestion();

    // Derive PDA
    const [pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('market'), Buffer.from(id)],
      this.programId
    );

    // Generate IPFS hash from question
    const ipfsHash = this.createIpfsHash(question);

    // Generate creator keypair
    const creator = Keypair.generate();

    return {
      id,
      pda,
      bParameter,
      initialLiquidity,
      ipfsHash,
      question,
      creator,
    };
  }

  /**
   * Generate multiple markets
   * @param count Number of markets
   * @param params Market parameters (applied to all)
   * @returns Array of market data
   */
  generateMarkets(count: number, params: MarketParams = {}): MarketData[] {
    console.log(`\n📦 Generating ${count} test markets...`);

    const markets: MarketData[] = [];

    for (let i = 0; i < count; i++) {
      // Vary parameters slightly for each market
      const marketParams = {
        ...params,
        bParameter: params.bParameter || this.randomBParameter(),
        initialLiquidity: params.initialLiquidity || this.randomInitialLiquidity(),
        question: params.question || this.generateRandomQuestion(),
      };

      markets.push(this.generateMarket(marketParams));
    }

    console.log(`✅ Generated ${count} markets`);
    return markets;
  }

  /**
   * Generate trades for a market
   * @param market Market data
   * @param userCount Number of unique users trading
   * @param tradesPerUser Average trades per user
   * @returns Array of trade data
   */
  generateTrades(
    market: MarketData,
    userCount: number,
    tradesPerUser: number = 2
  ): TradeData[] {
    console.log(`\n💸 Generating trades for market ${this.formatMarketId(market.id)}...`);
    console.log(`   Users: ${userCount}, Trades per user: ${tradesPerUser}`);

    const trades: TradeData[] = [];
    let tradeCounter = 0;

    for (let i = 0; i < userCount; i++) {
      const user = Keypair.generate();

      // Generate trades for this user
      for (let j = 0; j < tradesPerUser; j++) {
        const outcome = Math.random() > 0.5; // Random YES/NO
        const amount = this.randomTradeAmount(market.bParameter);

        trades.push({
          id: `trade-${tradeCounter++}`,
          marketId: market.id,
          user,
          outcome,
          amount,
          description: `User${i + 1} buys ${outcome ? 'YES' : 'NO'} shares (${this.formatAmount(amount)} SOL)`,
        });
      }
    }

    console.log(`✅ Generated ${trades.length} trades`);
    return trades;
  }

  /**
   * Generate votes for a proposal
   * @param market Market data
   * @param voteCount Number of votes
   * @param approvalRate Approval rate (0-1)
   * @returns Array of vote data
   */
  generateProposalVotes(
    market: MarketData,
    voteCount: number,
    approvalRate: number = 0.75
  ): VoteData[] {
    console.log(`\n🗳️  Generating proposal votes for market ${this.formatMarketId(market.id)}...`);
    console.log(`   Total votes: ${voteCount}, Approval rate: ${(approvalRate * 100).toFixed(0)}%`);

    const votes: VoteData[] = [];
    const likeCount = Math.floor(voteCount * approvalRate);

    for (let i = 0; i < voteCount; i++) {
      const user = Keypair.generate();
      const isLike = i < likeCount;

      votes.push({
        id: `vote-${i}`,
        marketId: market.id,
        user,
        isLike,
        voteType: 'proposal',
      });
    }

    console.log(`✅ Generated ${votes.length} votes (${likeCount} likes, ${voteCount - likeCount} dislikes)`);
    return votes;
  }

  /**
   * Generate dispute votes
   * @param market Market data
   * @param voteCount Number of votes
   * @param disputeSuccessRate Success rate (0-1)
   * @returns Array of vote data
   */
  generateDisputeVotes(
    market: MarketData,
    voteCount: number,
    disputeSuccessRate: number = 0.6
  ): VoteData[] {
    console.log(`\n🗳️  Generating dispute votes for market ${this.formatMarketId(market.id)}...`);
    console.log(`   Total votes: ${voteCount}, Success rate: ${(disputeSuccessRate * 100).toFixed(0)}%`);

    const votes: VoteData[] = [];
    const supportCount = Math.floor(voteCount * disputeSuccessRate);

    for (let i = 0; i < voteCount; i++) {
      const user = Keypair.generate();
      const isLike = i < supportCount;

      votes.push({
        id: `dispute-vote-${i}`,
        marketId: market.id,
        user,
        isLike,
        voteType: 'dispute',
      });
    }

    console.log(`✅ Generated ${votes.length} dispute votes (${supportCount} support, ${voteCount - supportCount} reject)`);
    return votes;
  }

  /**
   * Generate random trade pattern
   * @param market Market data
   * @param patternType Pattern type
   * @returns Array of trade data
   */
  generateTradePattern(
    market: MarketData,
    patternType: 'all-yes' | 'all-no' | 'alternating' | 'random' | 'whale',
    userCount: number = 10
  ): TradeData[] {
    console.log(`\n🎯 Generating '${patternType}' trade pattern...`);

    const trades: TradeData[] = [];

    for (let i = 0; i < userCount; i++) {
      const user = Keypair.generate();
      let outcome: boolean;
      let amount: anchor.BN;

      switch (patternType) {
        case 'all-yes':
          outcome = true;
          amount = this.randomTradeAmount(market.bParameter);
          break;

        case 'all-no':
          outcome = false;
          amount = this.randomTradeAmount(market.bParameter);
          break;

        case 'alternating':
          outcome = i % 2 === 0;
          amount = this.randomTradeAmount(market.bParameter);
          break;

        case 'whale':
          outcome = Math.random() > 0.5;
          amount = i === 0
            ? market.bParameter.divn(10) // First user is whale (10% of b)
            : this.randomTradeAmount(market.bParameter); // Others normal
          break;

        case 'random':
        default:
          outcome = Math.random() > 0.5;
          amount = this.randomTradeAmount(market.bParameter);
          break;
      }

      trades.push({
        id: `pattern-trade-${i}`,
        marketId: market.id,
        user,
        outcome,
        amount,
        description: `User${i + 1} ${i === 0 && patternType === 'whale' ? '(WHALE) ' : ''}buys ${outcome ? 'YES' : 'NO'} (${this.formatAmount(amount)} SOL)`,
      });
    }

    console.log(`✅ Generated ${trades.length} trades for pattern: ${patternType}`);
    return trades;
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  /**
   * Generate unique market ID
   * @returns 32-byte market ID
   */
  private generateMarketId(): number[] {
    const id = new Array(32).fill(0);
    const counter = this.marketCounter++;

    // Encode counter in first 4 bytes (little-endian)
    id[0] = counter & 0xff;
    id[1] = (counter >> 8) & 0xff;
    id[2] = (counter >> 16) & 0xff;
    id[3] = (counter >> 24) & 0xff;

    return id;
  }

  /**
   * Create IPFS hash from string (mock)
   * @param text Text to hash
   * @returns 46-byte hash (IPFS CIDv0 format)
   */
  private createIpfsHash(text: string): number[] {
    const hash = new Array(46).fill(0);

    // Simple hash: use text length and first characters
    for (let i = 0; i < Math.min(text.length, 46); i++) {
      hash[i] = text.charCodeAt(i) % 256;
    }

    return hash;
  }

  /**
   * Generate random question
   * @returns Question string
   */
  private generateRandomQuestion(): string {
    const subjects = ['BTC', 'ETH', 'SOL', 'AAPL', 'TSLA', 'GOOGL'];
    const actions = ['reach', 'exceed', 'surpass', 'hit', 'break'];
    const prices = ['$100k', '$10k', '$1k', '$200', '$500', '$1000'];
    const timeframes = ['2025', '2026', 'Q1 2025', 'Q4 2025', 'end of year'];

    const subject = subjects[Math.floor(Math.random() * subjects.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const price = prices[Math.floor(Math.random() * prices.length)];
    const timeframe = timeframes[Math.floor(Math.random() * timeframes.length)];

    return `Will ${subject} ${action} ${price} by ${timeframe}?`;
  }

  /**
   * Generate random b parameter
   * @returns BN value (100-1000 SOL)
   */
  private randomBParameter(): anchor.BN {
    const minB = 100; // 100 SOL
    const maxB = 1000; // 1000 SOL
    const b = Math.floor(Math.random() * (maxB - minB + 1)) + minB;
    return new anchor.BN(b * 1_000_000_000); // Convert to lamports
  }

  /**
   * Generate random initial liquidity
   * @returns BN value (0.1-100 SOL)
   */
  private randomInitialLiquidity(): anchor.BN {
    const values = [0.1, 0.5, 1, 5, 10, 50, 100]; // SOL
    const value = values[Math.floor(Math.random() * values.length)];
    return new anchor.BN(value * 1_000_000_000); // Convert to lamports
  }

  /**
   * Generate random trade amount
   * @param bParameter Market b parameter
   * @returns BN value (0.1% - 5% of b)
   */
  private randomTradeAmount(bParameter: anchor.BN): anchor.BN {
    const minPercent = 0.001; // 0.1% of b
    const maxPercent = 0.05; // 5% of b
    const percent = Math.random() * (maxPercent - minPercent) + minPercent;

    return bParameter.muln(Math.floor(percent * 10000)).divn(10000);
  }

  /**
   * Format market ID for display
   * @param id Market ID
   * @returns Formatted string
   */
  private formatMarketId(id: number[]): string {
    return `[${id[0]},${id[1]},${id[2]},${id[3]}...]`;
  }

  /**
   * Format amount for display
   * @param amount Amount in lamports
   * @returns Formatted string
   */
  private formatAmount(amount: anchor.BN): string {
    return (amount.toNumber() / 1_000_000_000).toFixed(4);
  }
}

/**
 * Create a market generator instance
 * @param programId Program ID
 * @returns Configured market generator
 */
export function createMarketGenerator(programId: PublicKey): MarketGenerator {
  return new MarketGenerator(programId);
}
