/**
 * API Client Service for ZMART V0.69
 *
 * Features:
 * - 1-hour wallet token caching (reduces signing friction)
 * - Automatic token injection
 * - Type-safe API methods
 * - Error handling with user-friendly messages
 * - Request/response interceptors
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// API response types
export interface Market {
  id: string;
  creator: string;
  question: string;
  description: string;
  state: 'PROPOSED' | 'APPROVED' | 'ACTIVE' | 'RESOLVING' | 'DISPUTED' | 'FINALIZED';
  priceYes: number;
  priceNo: number;
  totalShares: number;
  liquidityParameter: number;
  createdAt: string;
  activatedAt?: string;
  resolutionTime?: string;
  finalizedAt?: string;
  outcome?: boolean;
}

export interface Position {
  userId: string;
  marketId: string;
  sharesYes: number;
  sharesNo: number;
  totalCost: number;
  unrealizedPnL: number;
  realizedPnL: number;
}

export interface Trade {
  id: string;
  marketId: string;
  trader: string;
  outcome: 'YES' | 'NO';
  shares: number;
  cost: number;
  price: number;
  timestamp: string;
}

export interface Discussion {
  id: string;
  marketId: string;
  author: string;
  content: string;
  parentId?: string;
  upvotes: number;
  downvotes: number;
  isFlagged: boolean;
  createdAt: string;
  replies?: Discussion[];
}

export interface UserStats {
  totalTrades: number;
  totalVolume: number;
  winRate: number;
  totalPnL: number;
  activePositions: number;
}

// Token cache interface
interface TokenCache {
  token: string;
  expiresAt: number;
}

/**
 * API Client with token caching
 */
export class APIClient {
  private client: AxiosInstance;
  private tokenCache: Map<string, TokenCache> = new Map();
  private readonly TOKEN_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Setup request/response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor - inject token
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const walletAddress = this.getCurrentWalletAddress();
        if (walletAddress) {
          const token = await this.getOrRefreshToken(walletAddress);
          if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        return Promise.reject(this.formatError(error));
      }
    );
  }

  /**
   * Get current wallet address from browser context
   */
  private getCurrentWalletAddress(): string | null {
    if (typeof window === 'undefined') return null;

    // This will be set by the wallet provider component
    const walletState = (window as any).__WALLET_STATE__;
    return walletState?.publicKey?.toBase58() || null;
  }

  /**
   * Get cached token or request new one
   */
  private async getOrRefreshToken(walletAddress: string): Promise<string | null> {
    const cached = this.tokenCache.get(walletAddress);
    const now = Date.now();

    // Return cached token if still valid
    if (cached && cached.expiresAt > now) {
      return cached.token;
    }

    // Request new token (user will sign message)
    try {
      const newToken = await this.requestWalletToken(walletAddress);
      if (newToken) {
        this.tokenCache.set(walletAddress, {
          token: newToken,
          expiresAt: now + this.TOKEN_CACHE_DURATION,
        });
        return newToken;
      }
    } catch (error) {
      console.error('[API] Failed to get wallet token:', error);
    }

    return null;
  }

  /**
   * Request wallet signature for authentication
   */
  private async requestWalletToken(walletAddress: string): Promise<string | null> {
    if (typeof window === 'undefined') return null;

    // This will trigger wallet signing
    const signMessage = (window as any).__WALLET_SIGN_MESSAGE__;
    if (!signMessage) {
      console.warn('[API] Wallet sign function not available');
      return null;
    }

    try {
      const message = `Sign this message to authenticate with ZMART.\n\nWallet: ${walletAddress}\nTimestamp: ${Date.now()}`;
      const signature = await signMessage(message);

      // Exchange signature for JWT token
      const response = await this.client.post('/auth/wallet', {
        walletAddress,
        message,
        signature,
      });

      return response.data.token;
    } catch (error) {
      console.error('[API] Wallet authentication failed:', error);
      return null;
    }
  }

  /**
   * Format API errors for user consumption
   */
  private formatError(error: AxiosError): Error {
    if (error.response) {
      const status = error.response.status;
      const data: any = error.response.data;

      switch (status) {
        case 400:
          return new Error(data.message || 'Invalid request');
        case 401:
          return new Error('Unauthorized. Please connect your wallet.');
        case 403:
          return new Error('Access denied');
        case 404:
          return new Error('Resource not found');
        case 429:
          return new Error('Too many requests. Please try again later.');
        case 500:
          return new Error('Server error. Please try again.');
        default:
          return new Error(data.message || 'An error occurred');
      }
    } else if (error.request) {
      return new Error('Network error. Please check your connection.');
    } else {
      return new Error(error.message || 'An error occurred');
    }
  }

  /**
   * Clear token cache (on wallet disconnect)
   */
  clearTokenCache(walletAddress?: string): void {
    if (walletAddress) {
      this.tokenCache.delete(walletAddress);
    } else {
      this.tokenCache.clear();
    }
  }

  // ============================================================================
  // API Methods
  // ============================================================================

  /**
   * Get all markets with optional filters
   */
  async getMarkets(params?: {
    state?: Market['state'];
    creator?: string;
    limit?: number;
    offset?: number;
  }): Promise<Market[]> {
    const response = await this.client.get('/markets', { params });
    return response.data;
  }

  /**
   * Get single market by ID
   */
  async getMarket(marketId: string): Promise<Market> {
    const response = await this.client.get(`/markets/${marketId}`);
    return response.data;
  }

  /**
   * Get user's positions
   */
  async getPositions(userId: string): Promise<Position[]> {
    const response = await this.client.get(`/users/${userId}/positions`);
    return response.data;
  }

  /**
   * Get position for specific market
   */
  async getPosition(userId: string, marketId: string): Promise<Position> {
    const response = await this.client.get(`/users/${userId}/positions/${marketId}`);
    return response.data;
  }

  /**
   * Get trades for a market
   */
  async getTrades(marketId: string, limit = 50): Promise<Trade[]> {
    const response = await this.client.get(`/markets/${marketId}/trades`, {
      params: { limit },
    });
    return response.data;
  }

  /**
   * Get user's trade history
   */
  async getUserTrades(userId: string, limit = 50): Promise<Trade[]> {
    const response = await this.client.get(`/users/${userId}/trades`, {
      params: { limit },
    });
    return response.data;
  }

  /**
   * Get discussions for a market
   */
  async getDiscussions(marketId: string): Promise<Discussion[]> {
    const response = await this.client.get(`/markets/${marketId}/discussions`);
    return response.data;
  }

  /**
   * Post a new discussion
   */
  async postDiscussion(
    marketId: string,
    content: string,
    parentId?: string
  ): Promise<Discussion> {
    const response = await this.client.post(`/markets/${marketId}/discussions`, {
      content,
      parentId,
    });
    return response.data;
  }

  /**
   * Vote on a discussion post
   */
  async voteDiscussion(
    marketId: string,
    discussionId: string,
    vote: 'up' | 'down'
  ): Promise<void> {
    await this.client.post(`/markets/${marketId}/discussions/${discussionId}/vote`, {
      vote,
    });
  }

  /**
   * Flag a discussion post
   */
  async flagDiscussion(marketId: string, discussionId: string, reason: string): Promise<void> {
    await this.client.post(`/markets/${marketId}/discussions/${discussionId}/flag`, {
      reason,
    });
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<UserStats> {
    const response = await this.client.get(`/users/${userId}/stats`);
    return response.data;
  }

  /**
   * Submit proposal vote (off-chain aggregation)
   */
  async submitProposalVote(marketId: string, approve: boolean): Promise<void> {
    await this.client.post(`/markets/${marketId}/vote`, {
      approve,
    });
  }

  /**
   * Submit dispute vote (off-chain aggregation)
   */
  async submitDisputeVote(marketId: string, supportDispute: boolean): Promise<void> {
    await this.client.post(`/markets/${marketId}/dispute/vote`, {
      supportDispute,
    });
  }
}

// Singleton instance
let apiClient: APIClient | null = null;

/**
 * Get or create API client instance
 */
export function getAPIClient(): APIClient {
  if (!apiClient) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    apiClient = new APIClient(apiUrl);
  }
  return apiClient;
}

/**
 * Clear API client (call on wallet disconnect)
 */
export function clearAPIClient(walletAddress?: string): void {
  if (apiClient) {
    apiClient.clearTokenCache(walletAddress);
  }
}
