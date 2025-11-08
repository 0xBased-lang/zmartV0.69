/**
 * Event Parser
 *
 * Parses Solana transaction logs into typed events.
 */

import { logger } from '../utils/logger';
import {
  ProgramEvent,
  MarketCreatedEvent,
  TradeExecutedEvent,
  MarketStateChangedEvent,
  MarketResolvedEvent,
  DisputeRaisedEvent,
  DisputeResolvedEvent,
  VoteSubmittedEvent,
  ProposalApprovedEvent,
  WinningsClaimedEvent,
  HeliusWebhookPayload
} from '../types/events';

/**
 * Parse Helius webhook payload into program events
 */
export function parseHeliusWebhook(payload: HeliusWebhookPayload): ProgramEvent[] {
  const events: ProgramEvent[] = [];

  try {
    const { signature, slot, timestamp, instructions } = payload;

    // Find our program instructions
    const programId = process.env.PROGRAM_ID!;
    const programInstructions = instructions.filter(ix => ix.programId === programId);

    for (const instruction of programInstructions) {
      const event = parseInstruction(instruction, signature, slot, timestamp);
      if (event) {
        events.push(event);
      }
    }

  } catch (error) {
    logger.error('Error parsing Helius webhook', {
      error: error instanceof Error ? error.message : 'Unknown error',
      signature: payload.signature
    });
  }

  return events;
}

/**
 * Parse individual instruction into event
 */
function parseInstruction(
  instruction: any,
  signature: string,
  slot: number,
  timestamp: number
): ProgramEvent | null {
  try {
    // Decode instruction data (base58)
    const data = Buffer.from(instruction.data, 'base64');

    // First byte is the instruction discriminator
    const discriminator = data[0];

    const baseEvent = {
      txSignature: signature,
      slot,
      timestamp,
      blockTime: timestamp
    };

    // Parse based on discriminator
    // NOTE: These discriminators should match your Anchor program
    switch (discriminator) {
      case 0: // create_market
        return parseMarketCreated(data, instruction.accounts, baseEvent);

      case 1: // buy_shares
      case 2: // sell_shares
        return parseTradeExecuted(data, instruction.accounts, baseEvent, discriminator);

      case 3: // approve_proposal
        return parseProposalApproved(data, instruction.accounts, baseEvent);

      case 4: // resolve_market
        return parseMarketResolved(data, instruction.accounts, baseEvent);

      case 5: // raise_dispute
        return parseDisputeRaised(data, instruction.accounts, baseEvent);

      case 6: // resolve_dispute
        return parseDisputeResolved(data, instruction.accounts, baseEvent);

      case 7: // claim_winnings
        return parseWinningsClaimed(data, instruction.accounts, baseEvent);

      case 8: // aggregate_proposal_votes
      case 9: // aggregate_dispute_votes
        return parseVoteSubmitted(data, instruction.accounts, baseEvent, discriminator);

      default:
        logger.warn('Unknown instruction discriminator', { discriminator, signature });
        return null;
    }

  } catch (error) {
    logger.error('Error parsing instruction', {
      error: error instanceof Error ? error.message : 'Unknown error',
      signature
    });
    return null;
  }
}

/**
 * Parse MarketCreated event
 */
function parseMarketCreated(
  data: Buffer,
  accounts: string[],
  baseEvent: any
): MarketCreatedEvent {
  // Parse instruction data
  // Format: [discriminator(1), question_len(4), question(?), liquidity(8)]

  let offset = 1; // Skip discriminator

  const questionLen = data.readUInt32LE(offset);
  offset += 4;

  const question = data.slice(offset, offset + questionLen).toString('utf8');
  offset += questionLen;

  const liquidity = data.readBigUInt64LE(offset).toString();

  return {
    ...baseEvent,
    type: 'MarketCreated',
    marketPubkey: accounts[1], // market account
    creator: accounts[0], // creator/payer
    question,
    liquidity,
    initialSharesYes: '0',
    initialSharesNo: '0'
  };
}

/**
 * Parse TradeExecuted event
 */
function parseTradeExecuted(
  data: Buffer,
  accounts: string[],
  baseEvent: any,
  discriminator: number
): TradeExecutedEvent {
  // Parse instruction data
  // Format: [discriminator(1), outcome(1), shares(8), max_cost(8)]

  let offset = 1; // Skip discriminator

  const outcome = data[offset] === 0 ? 'YES' : 'NO';
  offset += 1;

  const shares = data.readBigUInt64LE(offset).toString();
  offset += 8;

  const maxCost = data.readBigUInt64LE(offset).toString();

  const side = discriminator === 1 ? 'BUY' : 'SELL';

  return {
    ...baseEvent,
    type: 'TradeExecuted',
    marketPubkey: accounts[1], // market account
    trader: accounts[0], // trader/payer
    side,
    outcome,
    shares,
    cost: maxCost, // Actual cost would be in logs
    priceBefore: '500000000', // Would parse from logs
    priceAfter: '500000000',  // Would parse from logs
    feeProtocol: '0',
    feeCreator: '0',
    feeStakers: '0'
  };
}

/**
 * Parse ProposalApproved event
 */
function parseProposalApproved(
  data: Buffer,
  accounts: string[],
  baseEvent: any
): ProposalApprovedEvent {
  // Parse instruction data
  // Format: [discriminator(1), proposal_id_len(4), proposal_id(?), likes(4), dislikes(4)]

  let offset = 1; // Skip discriminator

  const proposalIdLen = data.readUInt32LE(offset);
  offset += 4;

  const proposalId = data.slice(offset, offset + proposalIdLen).toString('utf8');
  offset += proposalIdLen;

  const likes = data.readUInt32LE(offset);
  offset += 4;

  const dislikes = data.readUInt32LE(offset);

  return {
    ...baseEvent,
    type: 'ProposalApproved',
    proposalId,
    likes,
    dislikes,
    totalVotes: likes + dislikes
  };
}

/**
 * Parse MarketResolved event
 */
function parseMarketResolved(
  data: Buffer,
  accounts: string[],
  baseEvent: any
): MarketResolvedEvent {
  // Parse instruction data
  // Format: [discriminator(1), outcome(1)]

  let offset = 1; // Skip discriminator

  const outcomeVal = data[offset];
  const outcome = outcomeVal === 0 ? 'YES' : outcomeVal === 1 ? 'NO' : 'INVALID';

  const resolvingAt = baseEvent.timestamp;
  const disputeDeadline = resolvingAt + (48 * 60 * 60); // 48 hours

  return {
    ...baseEvent,
    type: 'MarketResolved',
    marketPubkey: accounts[1], // market account
    resolver: accounts[0], // resolver
    outcome,
    resolvingAt,
    disputeDeadline
  };
}

/**
 * Parse DisputeRaised event
 */
function parseDisputeRaised(
  data: Buffer,
  accounts: string[],
  baseEvent: any
): DisputeRaisedEvent {
  return {
    ...baseEvent,
    type: 'DisputeRaised',
    marketPubkey: accounts[1], // market account
    disputer: accounts[0], // disputer
    originalOutcome: 'YES' // Would parse from market state
  };
}

/**
 * Parse DisputeResolved event
 */
function parseDisputeResolved(
  data: Buffer,
  accounts: string[],
  baseEvent: any
): DisputeResolvedEvent {
  // Parse instruction data
  // Format: [discriminator(1), outcome_changed(1), support(4), reject(4)]

  let offset = 1; // Skip discriminator

  const outcomeChanged = data[offset] === 1;
  offset += 1;

  const supportVotes = data.readUInt32LE(offset);
  offset += 4;

  const rejectVotes = data.readUInt32LE(offset);

  return {
    ...baseEvent,
    type: 'DisputeResolved',
    marketPubkey: accounts[1],
    outcomeChanged,
    newOutcome: outcomeChanged ? 'NO' : undefined, // Would parse from data
    supportVotes,
    rejectVotes
  };
}

/**
 * Parse VoteSubmitted event
 */
function parseVoteSubmitted(
  data: Buffer,
  accounts: string[],
  baseEvent: any,
  discriminator: number
): VoteSubmittedEvent {
  const voteType = discriminator === 8 ? 'PROPOSAL' : 'DISPUTE';

  // Parse based on vote type
  let offset = 1;

  if (voteType === 'PROPOSAL') {
    const proposalIdLen = data.readUInt32LE(offset);
    offset += 4;

    const proposalId = data.slice(offset, offset + proposalIdLen).toString('utf8');
    offset += proposalIdLen;

    const likes = data.readUInt32LE(offset);
    offset += 4;

    const dislikes = data.readUInt32LE(offset);

    return {
      ...baseEvent,
      type: 'VoteSubmitted',
      voteType,
      proposalId,
      voter: 'AGGREGATED', // Vote aggregation, not individual
      choice: `${likes} likes, ${dislikes} dislikes`,
      weight: likes + dislikes
    };

  } else {
    const supportVotes = data.readUInt32LE(offset);
    offset += 4;

    const rejectVotes = data.readUInt32LE(offset);

    return {
      ...baseEvent,
      type: 'VoteSubmitted',
      voteType,
      marketPubkey: accounts[1],
      voter: 'AGGREGATED',
      choice: `${supportVotes} support, ${rejectVotes} reject`,
      weight: supportVotes + rejectVotes
    };
  }
}

/**
 * Parse WinningsClaimed event
 */
function parseWinningsClaimed(
  data: Buffer,
  accounts: string[],
  baseEvent: any
): WinningsClaimedEvent {
  // Parse instruction data
  // Format: [discriminator(1), amount(8), shares_yes(8), shares_no(8)]

  let offset = 1; // Skip discriminator

  const amount = data.readBigUInt64LE(offset).toString();
  offset += 8;

  const sharesYes = data.readBigUInt64LE(offset).toString();
  offset += 8;

  const sharesNo = data.readBigUInt64LE(offset).toString();

  return {
    ...baseEvent,
    type: 'WinningsClaimed',
    marketPubkey: accounts[1],
    user: accounts[0],
    amount,
    sharesYes,
    sharesNo
  };
}
