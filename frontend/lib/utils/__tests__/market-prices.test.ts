/**
 * Market Price Utilities Tests
 *
 * Verify LMSR price calculations match expected values
 */

import { describe, it, expect } from '@jest/globals';
import { calculateMarketPrices, marketToState } from '../market-prices';
import type { Market } from '@/types/market';

describe('Market Price Utilities', () => {
  describe('marketToState', () => {
    it('should convert Market data to MarketState', () => {
      const mockMarket: Partial<Market> = {
        q_yes: '100000000000', // 100 shares (9 decimals)
        q_no: '100000000000', // 100 shares
        liquidity_parameter: '1000000000000', // 1000 liquidity
      };

      const state = marketToState(mockMarket as Market);

      expect(state.qYes).toBe(100000000000n);
      expect(state.qNo).toBe(100000000000n);
      expect(state.liquidity).toBe(1000000000000n);
    });
  });

  describe('calculateMarketPrices', () => {
    it('should calculate 50-50 prices for equal shares', () => {
      const mockMarket: Partial<Market> = {
        market_id: 'test1',
        q_yes: '100000000000', // 100 shares
        q_no: '100000000000', // 100 shares
        liquidity_parameter: '1000000000000', // 1000 liquidity
      };

      const prices = calculateMarketPrices(mockMarket as Market);

      // Equal shares should give ~50% each
      expect(prices.yesPrice).toBeCloseTo(50, 0);
      expect(prices.noPrice).toBeCloseTo(50, 0);
      // Sum should be ~100%
      expect(prices.probabilitySum).toBeCloseTo(100, 0);
    });

    it('should calculate higher YES price when YES has more shares', () => {
      const mockMarket: Partial<Market> = {
        market_id: 'test2',
        q_yes: '200000000000', // 200 shares (more YES)
        q_no: '100000000000', // 100 shares
        liquidity_parameter: '1000000000000', // 1000 liquidity
      };

      const prices = calculateMarketPrices(mockMarket as Market);

      // More YES shares → higher YES price
      expect(prices.yesPrice).toBeGreaterThan(50);
      expect(prices.noPrice).toBeLessThan(50);
      // Should sum to ~100%
      expect(prices.probabilitySum).toBeCloseTo(100, 0);
    });

    it('should calculate higher NO price when NO has more shares', () => {
      const mockMarket: Partial<Market> = {
        market_id: 'test3',
        q_yes: '100000000000', // 100 shares
        q_no: '200000000000', // 200 shares (more NO)
        liquidity_parameter: '1000000000000', // 1000 liquidity
      };

      const prices = calculateMarketPrices(mockMarket as Market);

      // More NO shares → higher NO price
      expect(prices.yesPrice).toBeLessThan(50);
      expect(prices.noPrice).toBeGreaterThan(50);
      // Should sum to ~100%
      expect(prices.probabilitySum).toBeCloseTo(100, 0);
    });

    it('should handle extreme price scenarios', () => {
      const mockMarket: Partial<Market> = {
        market_id: 'test4',
        q_yes: '500000000000', // 500 shares (very high YES)
        q_no: '10000000000', // 10 shares (very low NO)
        liquidity_parameter: '1000000000000', // 1000 liquidity
      };

      const prices = calculateMarketPrices(mockMarket as Market);

      // YES should be very high
      expect(prices.yesPrice).toBeGreaterThan(70);
      // NO should be very low
      expect(prices.noPrice).toBeLessThan(30);
      // Should still sum to ~100%
      expect(prices.probabilitySum).toBeCloseTo(100, 0);
    });

    it('should enforce price bounds (1% - 99%)', () => {
      const mockMarket: Partial<Market> = {
        market_id: 'test5',
        q_yes: '1000000000000', // Very high YES
        q_no: '1000000000', // Very low NO
        liquidity_parameter: '1000000000000', // 1000 liquidity
      };

      const prices = calculateMarketPrices(mockMarket as Market);

      // Prices should be clamped to valid range
      expect(prices.yesPrice).toBeGreaterThanOrEqual(1);
      expect(prices.yesPrice).toBeLessThanOrEqual(99);
      expect(prices.noPrice).toBeGreaterThanOrEqual(1);
      expect(prices.noPrice).toBeLessThanOrEqual(99);
    });
  });
});
