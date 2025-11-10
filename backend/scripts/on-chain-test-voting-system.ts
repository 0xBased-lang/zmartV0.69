/**
 * COMPREHENSIVE ON-CHAIN VOTING SYSTEM TEST
 *
 * Purpose: Execute complete voting workflow with exhaustive documentation
 * Coverage:
 *   1. Initialize GlobalConfig (if needed)
 *   2. Create test market
 *   3. Submit 10 proposal votes (7 like, 3 dislike)
 *   4. Aggregate votes
 *   5. Verify market state = APPROVED
 *
 * Documentation: Every transaction, state change, and inconsistency logged
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { ZmartCore } from "../target/types/zmart_core";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// Configuration
// ============================================================================

const DEVNET_RPC = "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey("7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS");
const TEST_ID = `TEST-${new Date().toISOString().split('T')[0]}-VOTING-${Date.now()}`;
const RESULTS_DIR = path.join(__dirname, "../../docs/on-chain-testing/03-TEST-RESULTS");

// ============================================================================
// Test Documentation Structure
// ============================================================================

interface TransactionDoc {
  testId: string;
  transactionNumber: number;
  instruction: string;
  preState: any;
  submission: any;
  execution: any;
  logs: string[];
  postState: any;
  validation: any;
  performance: any;
  inconsistencies: any[];
}

interface TestRunDoc {
  testId: string;
  testName: string;
  startTime: string;
  endTime?: string;
  network: string;
  programId: string;
  programVersion: string;
  environment: any;
  transactions: TransactionDoc[];
  summary: any;
  errors: any[];
  inconsistencies: any[];
}

// ============================================================================
// Utility Functions
// ============================================================================

class TestDocumenter {
  private testDoc: TestRunDoc;
  private txCounter: number = 0;

  constructor() {
    this.testDoc = {
      testId: TEST_ID,
      testName: "Voting System Complete Workflow",
      startTime: new Date().toISOString(),
      network: "devnet",
      programId: PROGRAM_ID.toBase58(),
      programVersion: process.env.GIT_COMMIT || "unknown",
      environment: {},
      transactions: [],
      summary: {},
      errors: [],
      inconsistencies: [],
    };
  }

  async captureEnvironment(connection: Connection) {
    const slot = await connection.getSlot();
    const blockTime = await connection.getBlockTime(slot);
    const version = await connection.getVersion();

    this.testDoc.environment = {
      rpcEndpoint: DEVNET_RPC,
      commitmentLevel: connection.commitment,
      slotHeight: slot,
      blockTime: blockTime,
      clusterVersion: version,
      timestamp: new Date().toISOString(),
    };
  }

  async capturePreState(connection: Connection, accounts: { [key: string]: PublicKey }): Promise<any> {
    const state: any = {};

    for (const [name, address] of Object.entries(accounts)) {
      try {
        const accountInfo = await connection.getAccountInfo(address);
        state[name] = {
          address: address.toBase58(),
          exists: accountInfo !== null,
          lamports: accountInfo?.lamports || 0,
          owner: accountInfo?.owner.toBase58() || "none",
          dataLength: accountInfo?.data.length || 0,
        };

        // Try to fetch account data if it's a PDA
        try {
          const accountData = await connection.getAccountInfo(address);
          if (accountData) {
            state[name].rawData = accountData.data.toString('base64');
          }
        } catch (e) {
          // Ignore if account doesn't exist or can't be deserialized
        }
      } catch (error) {
        state[name] = {
          address: address.toBase58(),
          exists: false,
          error: (error as Error).message,
        };
      }
    }

    return state;
  }

  async capturePostState(connection: Connection, accounts: { [key: string]: PublicKey }): Promise<any> {
    // Same as capturePreState
    return this.capturePreState(connection, accounts);
  }

  async documentTransaction(
    connection: Connection,
    instruction: string,
    preState: any,
    signature: string,
    accounts: { [key: string]: PublicKey },
    instructionData: any
  ): Promise<TransactionDoc> {
    this.txCounter++;

    const submittedAt = new Date().toISOString();
    const submittedSlot = await connection.getSlot();

    console.log(`[TX ${this.txCounter}] Waiting for confirmation: ${signature}`);

    // Wait for confirmation with detailed tracking
    const startTime = Date.now();
    const result = await connection.confirmTransaction(signature, 'confirmed');
    const confirmTime = Date.now() - startTime;

    // Get transaction details
    const tx = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      throw new Error(`Transaction not found: ${signature}`);
    }

    // Extract logs
    const logs = tx.meta?.logMessages || [];

    // Calculate compute units
    const computeUnits = tx.meta?.computeUnitsConsumed || 0;
    const fee = tx.meta?.fee || 0;

    // Get post-transaction state
    const postState = await this.capturePostState(connection, accounts);

    // Analyze state changes
    const stateChanges = this.compareStates(preState, postState);

    // Build transaction document
    const txDoc: TransactionDoc = {
      testId: TEST_ID,
      transactionNumber: this.txCounter,
      instruction,
      preState,
      submission: {
        signature,
        submittedAt,
        submittedSlot,
        accounts: Object.entries(accounts).map(([name, pubkey]) => ({
          name,
          pubkey: pubkey.toBase58(),
        })),
        instructionData,
      },
      execution: {
        status: result.value.err ? 'failed' : 'success',
        confirmationStatus: 'confirmed',
        confirmedSlot: tx.slot,
        confirmationTimeMs: confirmTime,
        computeUnitsConsumed: computeUnits,
        feePaidLamports: fee,
        feePaidSol: fee / LAMPORTS_PER_SOL,
      },
      logs,
      postState,
      validation: {
        stateChanges,
        expectedChanges: this.getExpectedChanges(instruction),
        validationResult: this.validateStateChanges(instruction, stateChanges),
      },
      performance: {
        transactionTime: confirmTime,
        computeUnits,
        feeEfficiency: fee / computeUnits,
      },
      inconsistencies: this.detectInconsistencies(instruction, stateChanges),
    };

    this.testDoc.transactions.push(txDoc);

    // Print summary
    console.log(`[TX ${this.txCounter}] ${instruction}`);
    console.log(`  Status: ${txDoc.execution.status}`);
    console.log(`  Time: ${confirmTime}ms`);
    console.log(`  CU: ${computeUnits}`);
    console.log(`  Fee: ${fee} lamports`);
    console.log(`  Changes: ${Object.keys(stateChanges).length} accounts modified`);

    if (txDoc.inconsistencies.length > 0) {
      console.log(`  ⚠️  Inconsistencies detected: ${txDoc.inconsistencies.length}`);
    }

    return txDoc;
  }

  private compareStates(before: any, after: any): any {
    const changes: any = {};

    for (const accountName in after) {
      const beforeAccount = before[accountName];
      const afterAccount = after[accountName];

      if (!beforeAccount || !afterAccount) continue;

      const accountChanges: any = {};

      // Check lamports
      if (beforeAccount.lamports !== afterAccount.lamports) {
        accountChanges.lamports = {
          before: beforeAccount.lamports,
          after: afterAccount.lamports,
          delta: afterAccount.lamports - beforeAccount.lamports,
        };
      }

      // Check existence
      if (beforeAccount.exists !== afterAccount.exists) {
        accountChanges.created = !beforeAccount.exists && afterAccount.exists;
        accountChanges.deleted = beforeAccount.exists && !afterAccount.exists;
      }

      // Check data length
      if (beforeAccount.dataLength !== afterAccount.dataLength) {
        accountChanges.dataLength = {
          before: beforeAccount.dataLength,
          after: afterAccount.dataLength,
          delta: afterAccount.dataLength - beforeAccount.dataLength,
        };
      }

      if (Object.keys(accountChanges).length > 0) {
        changes[accountName] = accountChanges;
      }
    }

    return changes;
  }

  private getExpectedChanges(instruction: string): string[] {
    const expectations: { [key: string]: string[] } = {
      'initialize_global_config': ['global_config created', 'global_config lamports increased'],
      'create_market': ['market_account created', 'market_account lamports increased'],
      'submit_proposal_vote': ['vote_record created', 'vote_record lamports increased'],
      'aggregate_proposal_votes': ['market_account data changed'],
      'approve_proposal': ['market_account state changed to APPROVED'],
    };

    return expectations[instruction] || [];
  }

  private validateStateChanges(instruction: string, changes: any): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Instruction-specific validation
    if (instruction === 'submit_proposal_vote') {
      if (!changes.vote_record?.created) {
        issues.push('VoteRecord account should have been created');
      }
      if (!changes.vote_record?.lamports) {
        issues.push('VoteRecord should have rent-exempt lamports');
      }
    }

    if (instruction === 'aggregate_proposal_votes') {
      if (!changes.market_account) {
        issues.push('MarketAccount should have been modified');
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  private detectInconsistencies(instruction: string, changes: any): any[] {
    const inconsistencies: any[] = [];

    // Check for unexpected state changes
    for (const [accountName, accountChanges] of Object.entries(changes)) {
      const change = accountChanges as any;

      // Check for unexpected lamport changes
      if (change.lamports && change.lamports.delta < 0) {
        // Account lost lamports (might be expected for fee payer)
        if (accountName !== 'payer') {
          inconsistencies.push({
            severity: 'medium',
            account: accountName,
            issue: 'Unexpected lamport decrease',
            details: change.lamports,
          });
        }
      }

      // Check for unexpected account deletions
      if (change.deleted) {
        inconsistencies.push({
          severity: 'high',
          account: accountName,
          issue: 'Account unexpectedly deleted',
          details: 'Account existed before but not after transaction',
        });
      }
    }

    return inconsistencies;
  }

  finalize(success: boolean, summary: any) {
    this.testDoc.endTime = new Date().toISOString();
    this.testDoc.summary = {
      ...summary,
      success,
      totalTransactions: this.txCounter,
      totalInconsistencies: this.testDoc.inconsistencies.length,
      totalErrors: this.testDoc.errors.length,
    };
  }

  addError(error: Error, context: string) {
    this.testDoc.errors.push({
      context,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }

  addInconsistency(inconsistency: any) {
    this.testDoc.inconsistencies.push({
      ...inconsistency,
      timestamp: new Date().toISOString(),
    });
  }

  save() {
    // Ensure results directory exists
    if (!fs.existsSync(RESULTS_DIR)) {
      fs.mkdirSync(RESULTS_DIR, { recursive: true });
    }

    const date = new Date().toISOString().split('T')[0];
    const dateDir = path.join(RESULTS_DIR, date);

    if (!fs.existsSync(dateDir)) {
      fs.mkdirSync(dateDir, { recursive: true });
    }

    const filename = path.join(dateDir, `${TEST_ID}.json`);
    fs.writeFileSync(filename, JSON.stringify(this.testDoc, null, 2));

    console.log(`\n✅ Test documentation saved to: ${filename}`);
    return filename;
  }

  printSummary() {
    console.log('\n' + '='.repeat(80));
    console.log('TEST EXECUTION SUMMARY');
    console.log('='.repeat(80));
    console.log(`Test ID: ${this.testDoc.testId}`);
    console.log(`Test Name: ${this.testDoc.testName}`);
    console.log(`Start Time: ${this.testDoc.startTime}`);
    console.log(`End Time: ${this.testDoc.endTime}`);
    console.log(`Total Transactions: ${this.txCounter}`);
    console.log(`Total Errors: ${this.testDoc.errors.length}`);
    console.log(`Total Inconsistencies: ${this.testDoc.inconsistencies.length}`);
    console.log(`Result: ${this.testDoc.summary.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log('='.repeat(80) + '\n');
  }
}

// ============================================================================
// Test Execution
// ============================================================================

async function runVotingSystemTest() {
  const documenter = new TestDocumenter();

  try {
    console.log('\n' + '='.repeat(80));
    console.log('ZMART VOTING SYSTEM ON-CHAIN TEST');
    console.log('='.repeat(80) + '\n');

    // Setup connection and program
    const connection = new Connection(DEVNET_RPC, 'confirmed');
    const wallet = new Wallet(Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(
        fs.readFileSync(
          path.join(process.env.HOME!, '.config/solana/id.json'),
          'utf-8'
        )
      ))
    ));

    const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
    anchor.setProvider(provider);

    const program = anchor.workspace.ZmartCore as Program<ZmartCore>;

    // Capture environment
    await documenter.captureEnvironment(connection);

    console.log('Environment:');
    console.log(`  RPC: ${DEVNET_RPC}`);
    console.log(`  Wallet: ${wallet.publicKey.toBase58()}`);
    console.log(`  Program: ${PROGRAM_ID.toBase58()}`);
    console.log(`  Slot: ${documenter.testDoc.environment.slotHeight}`);
    console.log();

    // ========================================================================
    // STEP 1: Initialize GlobalConfig (if needed)
    // ========================================================================

    console.log('[STEP 1] Checking GlobalConfig...');

    const [globalConfigPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('global_config')],
      PROGRAM_ID
    );

    const globalConfigInfo = await connection.getAccountInfo(globalConfigPDA);

    if (!globalConfigInfo) {
      console.log('GlobalConfig not found. Initializing...');

      const preState = await documenter.capturePreState(connection, {
        global_config: globalConfigPDA,
        authority: wallet.publicKey,
      });

      const tx = await program.methods
        .initializeGlobalConfig(wallet.publicKey)
        .accounts({
          globalConfig: globalConfigPDA,
          authority: wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      await documenter.documentTransaction(
        connection,
        'initialize_global_config',
        preState,
        tx,
        {
          global_config: globalConfigPDA,
          authority: wallet.publicKey,
        },
        {
          backend_authority: wallet.publicKey.toBase58(),
        }
      );

      console.log('✅ GlobalConfig initialized\n');
    } else {
      console.log('✅ GlobalConfig already exists\n');
    }

    // ========================================================================
    // STEP 2: Create Test Market
    // ========================================================================

    console.log('[STEP 2] Creating test market...');

    const marketId = Keypair.generate().publicKey.toBytes().slice(0, 32);
    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), Buffer.from(marketId)],
      PROGRAM_ID
    );

    const ipfsHash = Buffer.from('QmTest1234567890TestIPFSHash1234567890Test1');

    const preStateMarket = await documenter.capturePreState(connection, {
      market: marketPDA,
      creator: wallet.publicKey,
      global_config: globalConfigPDA,
    });

    const txMarket = await program.methods
      .createMarket(
        Array.from(marketId),
        new anchor.BN(1000_000_000_000), // b = 1000 USDC
        new anchor.BN(1000_000_000_000), // initial liquidity = 1000 USDC
        Array.from(ipfsHash)
      )
      .accounts({
        market: marketPDA,
        globalConfig: globalConfigPDA,
        creator: wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    await documenter.documentTransaction(
      connection,
      'create_market',
      preStateMarket,
      txMarket,
      {
        market: marketPDA,
        creator: wallet.publicKey,
        global_config: globalConfigPDA,
      },
      {
        market_id: Array.from(marketId),
        b_parameter: '1000000000000',
        initial_liquidity: '1000000000000',
        ipfs_question_hash: ipfsHash.toString('hex'),
      }
    );

    console.log(`✅ Market created: ${marketPDA.toBase58()}\n`);

    // ========================================================================
    // STEP 3: Submit 10 Votes (7 like, 3 dislike)
    // ========================================================================

    console.log('[STEP 3] Submitting 10 votes...');

    const voters: Keypair[] = [];
    const votes = [true, true, true, true, true, true, true, false, false, false]; // 7 likes, 3 dislikes

    for (let i = 0; i < 10; i++) {
      const voter = Keypair.generate();
      voters.push(voter);

      // Airdrop some SOL to voter
      const airdropSig = await connection.requestAirdrop(voter.publicKey, 0.1 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(airdropSig);

      const [voteRecordPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('vote_record'),
          marketPDA.toBuffer(),
          voter.publicKey.toBuffer(),
          Buffer.from('proposal'),
        ],
        PROGRAM_ID
      );

      const preStateVote = await documenter.capturePreState(connection, {
        vote_record: voteRecordPDA,
        voter: voter.publicKey,
        market: marketPDA,
      });

      const txVote = await program.methods
        .submitProposalVote(votes[i])
        .accounts({
          voteRecord: voteRecordPDA,
          market: marketPDA,
          voter: voter.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([voter])
        .rpc();

      await documenter.documentTransaction(
        connection,
        'submit_proposal_vote',
        preStateVote,
        txVote,
        {
          vote_record: voteRecordPDA,
          voter: voter.publicKey,
          market: marketPDA,
        },
        {
          vote: votes[i],
          vote_type: votes[i] ? 'LIKE' : 'DISLIKE',
        }
      );

      console.log(`  Vote ${i + 1}/10: ${votes[i] ? 'LIKE' : 'DISLIKE'} by ${voter.publicKey.toBase58().slice(0, 8)}...`);
    }

    console.log('✅ All 10 votes submitted\n');

    // ========================================================================
    // STEP 4: Aggregate Votes
    // ========================================================================

    console.log('[STEP 4] Aggregating votes...');

    const preStateAggregate = await documenter.capturePreState(connection, {
      market: marketPDA,
      backend_authority: wallet.publicKey,
      global_config: globalConfigPDA,
    });

    const txAggregate = await program.methods
      .aggregateProposalVotes(7, 3) // 7 likes, 3 dislikes
      .accounts({
        market: marketPDA,
        globalConfig: globalConfigPDA,
        backendAuthority: wallet.publicKey,
      })
      .rpc();

    await documenter.documentTransaction(
      connection,
      'aggregate_proposal_votes',
      preStateAggregate,
      txAggregate,
      {
        market: marketPDA,
        backend_authority: wallet.publicKey,
        global_config: globalConfigPDA,
      },
      {
        final_likes: 7,
        final_dislikes: 3,
        approval_percentage: '70%',
      }
    );

    console.log('✅ Votes aggregated\n');

    // ========================================================================
    // STEP 5: Verify Market State
    // ========================================================================

    console.log('[STEP 5] Verifying market state...');

    const marketAccount = await program.account.marketAccount.fetch(marketPDA);
    const currentState = marketAccount.state;

    console.log(`  Current State: ${JSON.stringify(currentState)}`);
    console.log(`  Expected State: APPROVED`);

    // Check if state is APPROVED (enum value 1)
    const stateMatches = JSON.stringify(currentState) === JSON.stringify({ approved: {} });

    if (stateMatches) {
      console.log('✅ Market state is APPROVED\n');
    } else {
      console.log('❌ Market state is NOT APPROVED\n');
      documenter.addInconsistency({
        severity: 'critical',
        issue: 'Market state mismatch',
        expected: 'APPROVED',
        actual: JSON.stringify(currentState),
      });
    }

    // ========================================================================
    // Finalize and Save
    // ========================================================================

    documenter.finalize(stateMatches, {
      marketCreated: true,
      votesSubmitted: 10,
      votesLike: 7,
      votesDislike: 3,
      votesAggregated: true,
      marketApproved: stateMatches,
    });

    documenter.printSummary();
    const savedPath = documenter.save();

    console.log('\nTest execution complete!');
    console.log(`Full results: ${savedPath}`);

  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    documenter.addError(error as Error, 'Test execution');
    documenter.finalize(false, { error: (error as Error).message });
    documenter.printSummary();
    documenter.save();
    throw error;
  }
}

// ============================================================================
// Main Execution
// ============================================================================

runVotingSystemTest()
  .then(() => {
    console.log('\n✅ All tests completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  });
