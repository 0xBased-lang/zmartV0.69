/**
 * Event Parser Tests
 *
 * Unit tests for parsing Helius webhooks into typed events.
 */

import { parseHeliusWebhook } from '../src/parsers/eventParser';
import { HeliusWebhookPayload } from '../src/types/events';

describe('Event Parser', () => {
  const PROGRAM_ID = process.env.PROGRAM_ID || '7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS';

  describe('parseHeliusWebhook', () => {
    it('should return empty array for payload with no program instructions', () => {
      const payload: HeliusWebhookPayload = {
        accountData: [],
        description: 'Test transaction',
        events: {},
        fee: 5000,
        feePayer: 'test123',
        instructions: [
          {
            accounts: [],
            data: 'dGVzdA==', // 'test' in base64
            programId: 'System111111111111111111111111111111111111',
            innerInstructions: []
          }
        ],
        nativeTransfers: [],
        signature: 'test_signature_1',
        slot: 123456,
        source: 'test',
        timestamp: 1234567890,
        tokenTransfers: [],
        transactionError: null,
        type: 'test'
      };

      const events = parseHeliusWebhook(payload);
      expect(events).toEqual([]);
    });

    it('should parse MarketCreated event', () => {
      // Create instruction data for create_market
      const questionBytes = Buffer.from('Will BTC reach $100k?', 'utf8');
      const instructionData = Buffer.concat([
        Buffer.from([0]), // discriminator = 0 (create_market)
        Buffer.from([questionBytes.length, 0, 0, 0]), // question length (little-endian u32)
        questionBytes,
        Buffer.from([0x00, 0xca, 0x9a, 0x3b, 0x00, 0x00, 0x00, 0x00]) // liquidity = 1,000,000,000 (1 SOL)
      ]);

      const payload: HeliusWebhookPayload = {
        accountData: [],
        description: 'Create market',
        events: {},
        fee: 5000,
        feePayer: 'creator123',
        instructions: [
          {
            accounts: [
              'creator123', // creator/payer
              'market456'   // market account
            ],
            data: instructionData.toString('base64'),
            programId: PROGRAM_ID,
            innerInstructions: []
          }
        ],
        nativeTransfers: [],
        signature: 'create_market_sig',
        slot: 123456,
        source: 'test',
        timestamp: 1234567890,
        tokenTransfers: [],
        transactionError: null,
        type: 'test'
      };

      const events = parseHeliusWebhook(payload);

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'MarketCreated',
        marketPubkey: 'market456',
        creator: 'creator123',
        question: 'Will BTC reach $100k?',
        liquidity: '1000000000',
        txSignature: 'create_market_sig',
        slot: 123456
      });
    });

    it('should parse TradeExecuted event for buy', () => {
      // Create instruction data for buy_shares
      const instructionData = Buffer.concat([
        Buffer.from([1]), // discriminator = 1 (buy_shares)
        Buffer.from([0]), // outcome = 0 (YES)
        Buffer.from([0x10, 0x27, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]), // shares = 10,000
        Buffer.from([0x00, 0xca, 0x9a, 0x3b, 0x00, 0x00, 0x00, 0x00])  // max_cost = 1,000,000,000
      ]);

      const payload: HeliusWebhookPayload = {
        accountData: [],
        description: 'Buy shares',
        events: {},
        fee: 5000,
        feePayer: 'trader123',
        instructions: [
          {
            accounts: [
              'trader123', // trader/payer
              'market456'  // market account
            ],
            data: instructionData.toString('base64'),
            programId: PROGRAM_ID,
            innerInstructions: []
          }
        ],
        nativeTransfers: [],
        signature: 'buy_shares_sig',
        slot: 123457,
        source: 'test',
        timestamp: 1234567891,
        tokenTransfers: [],
        transactionError: null,
        type: 'test'
      };

      const events = parseHeliusWebhook(payload);

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'TradeExecuted',
        marketPubkey: 'market456',
        trader: 'trader123',
        side: 'BUY',
        outcome: 'YES',
        shares: '10000',
        cost: '1000000000',
        txSignature: 'buy_shares_sig'
      });
    });

    it('should parse TradeExecuted event for sell', () => {
      // Create instruction data for sell_shares
      const instructionData = Buffer.concat([
        Buffer.from([2]), // discriminator = 2 (sell_shares)
        Buffer.from([1]), // outcome = 1 (NO)
        Buffer.from([0x10, 0x27, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]), // shares = 10,000
        Buffer.from([0x00, 0xca, 0x9a, 0x3b, 0x00, 0x00, 0x00, 0x00])  // max_cost = 1,000,000,000
      ]);

      const payload: HeliusWebhookPayload = {
        accountData: [],
        description: 'Sell shares',
        events: {},
        fee: 5000,
        feePayer: 'trader123',
        instructions: [
          {
            accounts: [
              'trader123', // trader/payer
              'market456'  // market account
            ],
            data: instructionData.toString('base64'),
            programId: PROGRAM_ID,
            innerInstructions: []
          }
        ],
        nativeTransfers: [],
        signature: 'sell_shares_sig',
        slot: 123458,
        source: 'test',
        timestamp: 1234567892,
        tokenTransfers: [],
        transactionError: null,
        type: 'test'
      };

      const events = parseHeliusWebhook(payload);

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'TradeExecuted',
        side: 'SELL',
        outcome: 'NO'
      });
    });

    it('should handle multiple instructions in one transaction', () => {
      // Create two market creation instructions
      const question1 = Buffer.from('Question 1', 'utf8');
      const question2 = Buffer.from('Question 2', 'utf8');

      const instruction1 = Buffer.concat([
        Buffer.from([0]),
        Buffer.from([question1.length, 0, 0, 0]),
        question1,
        Buffer.from([0x00, 0xca, 0x9a, 0x3b, 0x00, 0x00, 0x00, 0x00])
      ]);

      const instruction2 = Buffer.concat([
        Buffer.from([0]),
        Buffer.from([question2.length, 0, 0, 0]),
        question2,
        Buffer.from([0x00, 0xca, 0x9a, 0x3b, 0x00, 0x00, 0x00, 0x00])
      ]);

      const payload: HeliusWebhookPayload = {
        accountData: [],
        description: 'Multiple markets',
        events: {},
        fee: 5000,
        feePayer: 'creator123',
        instructions: [
          {
            accounts: ['creator123', 'market1'],
            data: instruction1.toString('base64'),
            programId: PROGRAM_ID,
            innerInstructions: []
          },
          {
            accounts: ['creator123', 'market2'],
            data: instruction2.toString('base64'),
            programId: PROGRAM_ID,
            innerInstructions: []
          }
        ],
        nativeTransfers: [],
        signature: 'multi_sig',
        slot: 123459,
        source: 'test',
        timestamp: 1234567893,
        tokenTransfers: [],
        transactionError: null,
        type: 'test'
      };

      const events = parseHeliusWebhook(payload);

      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('MarketCreated');
      expect(events[1].type).toBe('MarketCreated');
    });

    it('should handle unknown discriminators gracefully', () => {
      const instructionData = Buffer.from([99]); // Unknown discriminator

      const payload: HeliusWebhookPayload = {
        accountData: [],
        description: 'Unknown instruction',
        events: {},
        fee: 5000,
        feePayer: 'test123',
        instructions: [
          {
            accounts: [],
            data: instructionData.toString('base64'),
            programId: PROGRAM_ID,
            innerInstructions: []
          }
        ],
        nativeTransfers: [],
        signature: 'unknown_sig',
        slot: 123460,
        source: 'test',
        timestamp: 1234567894,
        tokenTransfers: [],
        transactionError: null,
        type: 'test'
      };

      const events = parseHeliusWebhook(payload);

      // Should return empty array for unknown instruction
      expect(events).toEqual([]);
    });
  });
});
