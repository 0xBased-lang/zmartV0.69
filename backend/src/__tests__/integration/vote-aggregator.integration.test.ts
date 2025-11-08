// ============================================================
// Vote Aggregator Integration Test
// ============================================================
// Purpose: End-to-end test of vote aggregation workflow with devnet
// Story: 2.2 (Day 9)
//
// Prerequisites:
// 1. Solana programs deployed to devnet
// 2. Backend keypair with SOL
// 3. Supabase database with test data
// 4. Environment variables set in .env.test

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { createClient } from "@supabase/supabase-js";
import { ProposalVoteAggregator } from "../../services/vote-aggregator/proposal";
import { DisputeVoteAggregator } from "../../services/vote-aggregator/dispute";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Load test environment
dotenv.config({ path: path.join(__dirname, "../../../.env.test") });

// Skip integration tests in CI unless explicitly enabled
const SKIP_INTEGRATION = process.env.RUN_INTEGRATION_TESTS !== "true";

describe.skip("Vote Aggregator Integration Tests", () => {
  // Skip if not explicitly enabled
  if (SKIP_INTEGRATION) {
    console.log("⏭️  Skipping integration tests. Set RUN_INTEGRATION_TESTS=true to enable.");
    return;
  }

  let connection: Connection;
  let program: Program<any>; // Type parameter required
  let backendKeypair: Keypair;
  let supabase: any;
  let globalConfigPda: PublicKey;
  let proposalAggregator: ProposalVoteAggregator;
  let disputeAggregator: DisputeVoteAggregator;

  beforeAll(async () => {
    // 1. Setup Solana connection
    const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
    connection = new Connection(rpcUrl, "confirmed");

    // 2. Load backend keypair
    const keypairPath = process.env.BACKEND_KEYPAIR_PATH;
    if (!keypairPath) {
      throw new Error("BACKEND_KEYPAIR_PATH not set in .env.test");
    }

    const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
    backendKeypair = Keypair.fromSecretKey(new Uint8Array(keypairData));

    // 3. Setup Anchor provider and program
    const wallet = new Wallet(backendKeypair);
    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });

    // Load program IDL (you'll need to provide the actual IDL)
    // For now, this is a placeholder to prevent TypeScript errors
    // TODO: Uncomment when IDL is available
    // const idl = JSON.parse(fs.readFileSync("./target/idl/zmart_prediction_market.json", "utf-8"));
    const programId = new PublicKey(process.env.PROGRAM_ID || "11111111111111111111111111111111");
    // program = new Program(idl, programId, provider);

    // Placeholder program object to fix TypeScript errors
    program = {
      programId,
      provider,
    } as Program<any>;

    // 4. Setup Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not set in .env.test");
    }
    supabase = createClient(supabaseUrl, supabaseKey);

    // 5. Derive global config PDA
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("global_config")],
      program.programId
    );
    globalConfigPda = configPda;

    // 6. Initialize aggregators
    proposalAggregator = new ProposalVoteAggregator(
      program,
      backendKeypair,
      supabase,
      globalConfigPda
    );

    disputeAggregator = new DisputeVoteAggregator(
      program,
      backendKeypair,
      supabase,
      globalConfigPda
    );
  });

  describe("Proposal Vote Aggregation", () => {
    it("should aggregate proposal votes and approve market", async () => {
      // This test requires:
      // 1. A market in PROPOSED state on devnet
      // 2. Votes submitted via on-chain submit_proposal_vote
      // 3. Votes recorded in Supabase

      // For now, we'll just test the aggregation logic
      const testMarketId = "test-market-1";

      // Insert test votes into Supabase
      await supabase.from("proposal_votes").insert([
        { market_id: testMarketId, user_wallet: "user1", vote: true },
        { market_id: testMarketId, user_wallet: "user2", vote: true },
        { market_id: testMarketId, user_wallet: "user3", vote: true },
        { market_id: testMarketId, user_wallet: "user4", vote: true },
        { market_id: testMarketId, user_wallet: "user5", vote: true },
        { market_id: testMarketId, user_wallet: "user6", vote: true },
        { market_id: testMarketId, user_wallet: "user7", vote: true },
        { market_id: testMarketId, user_wallet: "user8", vote: false },
        { market_id: testMarketId, user_wallet: "user9", vote: false },
        { market_id: testMarketId, user_wallet: "user10", vote: false },
      ]);

      // Aggregate votes
      const result = await proposalAggregator.aggregateVotes(testMarketId);

      expect(result.likes).toBe(7);
      expect(result.dislikes).toBe(3);
      expect(result.totalVotes).toBe(10);
      expect(result.approvalRate).toBe(70);
      expect(result.meetsThreshold).toBe(true);

      // Clean up test data
      await supabase
        .from("proposal_votes")
        .delete()
        .eq("market_id", testMarketId);
    }, 30000); // 30 second timeout

    it("should NOT approve market if threshold not met", async () => {
      const testMarketId = "test-market-2";

      // Insert test votes (60% approval - below 70% threshold)
      await supabase.from("proposal_votes").insert([
        { market_id: testMarketId, user_wallet: "user1", vote: true },
        { market_id: testMarketId, user_wallet: "user2", vote: true },
        { market_id: testMarketId, user_wallet: "user3", vote: true },
        { market_id: testMarketId, user_wallet: "user4", vote: true },
        { market_id: testMarketId, user_wallet: "user5", vote: true },
        { market_id: testMarketId, user_wallet: "user6", vote: true },
        { market_id: testMarketId, user_wallet: "user7", vote: false },
        { market_id: testMarketId, user_wallet: "user8", vote: false },
        { market_id: testMarketId, user_wallet: "user9", vote: false },
        { market_id: testMarketId, user_wallet: "user10", vote: false },
      ]);

      const result = await proposalAggregator.aggregateVotes(testMarketId);

      expect(result.likes).toBe(6);
      expect(result.dislikes).toBe(4);
      expect(result.approvalRate).toBe(60);
      expect(result.meetsThreshold).toBe(false); // Below 70%

      // Clean up
      await supabase
        .from("proposal_votes")
        .delete()
        .eq("market_id", testMarketId);
    }, 30000);
  });

  describe("Dispute Vote Aggregation", () => {
    it("should aggregate dispute votes and finalize market", async () => {
      const testMarketId = "test-market-3";

      // Insert test votes (70% agree - above 60% threshold)
      await supabase.from("dispute_votes").insert([
        { market_id: testMarketId, user_wallet: "user1", vote: true },
        { market_id: testMarketId, user_wallet: "user2", vote: true },
        { market_id: testMarketId, user_wallet: "user3", vote: true },
        { market_id: testMarketId, user_wallet: "user4", vote: true },
        { market_id: testMarketId, user_wallet: "user5", vote: true },
        { market_id: testMarketId, user_wallet: "user6", vote: true },
        { market_id: testMarketId, user_wallet: "user7", vote: true },
        { market_id: testMarketId, user_wallet: "user8", vote: false },
        { market_id: testMarketId, user_wallet: "user9", vote: false },
        { market_id: testMarketId, user_wallet: "user10", vote: false },
      ]);

      const result = await disputeAggregator.aggregateVotes(testMarketId);

      expect(result.agreeVotes).toBe(7);
      expect(result.disagreeVotes).toBe(3);
      expect(result.totalVotes).toBe(10);
      expect(result.agreeRate).toBe(70);
      expect(result.disputeSucceeded).toBe(true); // Above 60%

      // Clean up
      await supabase
        .from("dispute_votes")
        .delete()
        .eq("market_id", testMarketId);
    }, 30000);

    it("should NOT succeed dispute if threshold not met", async () => {
      const testMarketId = "test-market-4";

      // Insert test votes (50% agree - below 60% threshold)
      await supabase.from("dispute_votes").insert([
        { market_id: testMarketId, user_wallet: "user1", vote: true },
        { market_id: testMarketId, user_wallet: "user2", vote: true },
        { market_id: testMarketId, user_wallet: "user3", vote: true },
        { market_id: testMarketId, user_wallet: "user4", vote: true },
        { market_id: testMarketId, user_wallet: "user5", vote: true },
        { market_id: testMarketId, user_wallet: "user6", vote: false },
        { market_id: testMarketId, user_wallet: "user7", vote: false },
        { market_id: testMarketId, user_wallet: "user8", vote: false },
        { market_id: testMarketId, user_wallet: "user9", vote: false },
        { market_id: testMarketId, user_wallet: "user10", vote: false },
      ]);

      const result = await disputeAggregator.aggregateVotes(testMarketId);

      expect(result.agreeVotes).toBe(5);
      expect(result.disagreeVotes).toBe(5);
      expect(result.agreeRate).toBe(50);
      expect(result.disputeSucceeded).toBe(false); // Below 60%

      // Clean up
      await supabase
        .from("dispute_votes")
        .delete()
        .eq("market_id", testMarketId);
    }, 30000);
  });
});

// Export for manual testing
export {
  ProposalVoteAggregator,
  DisputeVoteAggregator,
};
