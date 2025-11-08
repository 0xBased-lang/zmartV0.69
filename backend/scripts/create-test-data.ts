// ============================================================
// Create Test Data Script
// ============================================================
// Purpose: Populate database with sample users, markets, and votes
// Usage: ts-node scripts/create-test-data.ts

import { createClient } from "@supabase/supabase-js";
import { Keypair } from "@solana/web3.js";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase credentials");
  console.error("   SUPABASE_URL:", SUPABASE_URL ? "✅" : "❌");
  console.error("   SUPABASE_SERVICE_ROLE_KEY:", SUPABASE_SERVICE_ROLE_KEY ? "✅" : "❌");
  process.exit(1);
}

// Use service role key to bypass RLS for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ============================================================
// Test Data Configuration
// ============================================================

const TEST_USERS = [
  { name: "Alice", wallet: Keypair.generate().publicKey.toBase58() },
  { name: "Bob", wallet: Keypair.generate().publicKey.toBase58() },
  { name: "Charlie", wallet: Keypair.generate().publicKey.toBase58() },
  { name: "Dave", wallet: Keypair.generate().publicKey.toBase58() },
  { name: "Eve", wallet: Keypair.generate().publicKey.toBase58() },
];

const TEST_MARKETS = [
  {
    question: "Will Bitcoin reach $100k by end of 2025?",
    category: "crypto",
    description: "Bitcoin price prediction market",
    state: "PROPOSED",
    b_parameter: 1000000000, // 1 SOL (9 decimals)
    initial_liquidity: 1000000000,
  },
  {
    question: "Will Solana flip Ethereum in 2025?",
    category: "crypto",
    description: "Solana vs Ethereum market cap comparison",
    state: "PROPOSED",
    b_parameter: 500000000, // 0.5 SOL
    initial_liquidity: 500000000,
  },
  {
    question: "Will Trump win the 2025 election?",
    category: "politics",
    description: "US Presidential election prediction",
    state: "PROPOSED",
    b_parameter: 2000000000, // 2 SOL
    initial_liquidity: 2000000000,
  },
  {
    question: "Will GPT-5 be released in 2025?",
    category: "crypto", // Changed from 'tech' to match schema constraint
    description: "OpenAI GPT-5 release prediction",
    state: "PROPOSED",
    b_parameter: 750000000, // 0.75 SOL
    initial_liquidity: 750000000,
  },
  {
    question: "Will Argentina win World Cup 2026?",
    category: "sports",
    description: "FIFA World Cup winner prediction",
    state: "PROPOSED",
    b_parameter: 1500000000, // 1.5 SOL
    initial_liquidity: 1500000000,
  },
];

// ============================================================
// Main Function
// ============================================================

async function main() {
  console.log("=".repeat(60));
  console.log("Creating Test Data...");
  console.log("=".repeat(60));

  try {
    // ========================================
    // 1. Create Users
    // ========================================
    console.log("\n[1/4] Creating test users...");
    const userResults = [];

    for (const user of TEST_USERS) {
      const { data, error } = await supabase
        .from("users")
        .upsert(
          {
            wallet: user.wallet, // Primary key is 'wallet' not 'wallet_address'
            created_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: "wallet" }
        )
        .select()
        .single();

      if (error) {
        console.error(`   ❌ Failed to create user ${user.name}:`, error.message);
      } else {
        console.log(`   ✅ Created user: ${user.name} (${user.wallet.slice(0, 8)}...)`);
        userResults.push(data);
      }
    }

    console.log(`   ✅ Created ${userResults.length}/${TEST_USERS.length} users`);

    // ========================================
    // 2. Create Markets
    // ========================================
    console.log("\n[2/4] Creating test markets...");
    const marketResults = [];

    for (let i = 0; i < TEST_MARKETS.length; i++) {
      const market = TEST_MARKETS[i];
      const creator = TEST_USERS[i % TEST_USERS.length]; // Rotate creators

      // Generate a fake on-chain address (for testing only)
      const onChainAddress = Keypair.generate().publicKey.toBase58();

      const { data, error } = await supabase
        .from("markets")
        .insert({
          id: `market-${Date.now()}-${i}`, // UUID-like ID
          on_chain_address: onChainAddress,
          question: market.question,
          description: market.description,
          category: market.category,
          creator_wallet: creator.wallet,
          state: market.state,
          b_parameter: market.b_parameter.toString(),
          initial_liquidity: market.initial_liquidity.toString(),
          current_liquidity: market.initial_liquidity.toString(),
          shares_yes: "0",
          shares_no: "0",
          total_volume: "0",
          proposal_likes: 0,
          proposal_dislikes: 0,
          dispute_agree: 0,
          dispute_disagree: 0,
          created_at: new Date().toISOString(),
          is_cancelled: false,
        })
        .select()
        .single();

      if (error) {
        console.error(`   ❌ Failed to create market:`, error.message);
      } else {
        console.log(`   ✅ Created market: ${market.question.slice(0, 50)}...`);
        marketResults.push(data);
      }
    }

    console.log(`   ✅ Created ${marketResults.length}/${TEST_MARKETS.length} markets`);

    // ========================================
    // 3. Create Proposal Votes
    // ========================================
    console.log("\n[3/4] Creating proposal votes...");
    let voteCount = 0;

    for (const market of marketResults) {
      // Each market gets 3-5 votes (70% approval rate target)
      const numVotes = 3 + Math.floor(Math.random() * 3);
      const numLikes = Math.ceil(numVotes * 0.75); // ~75% approval
      const numDislikes = numVotes - numLikes;

      const voters = TEST_USERS.slice(0, numVotes);

      for (let i = 0; i < voters.length; i++) {
        const vote = i < numLikes; // First voters like, rest dislike

        const { error } = await supabase.from("proposal_votes").insert({
          market_id: market.id,
          user_wallet: voters[i].wallet,
          vote,
          voted_at: new Date(Date.now() - (numVotes - i) * 60000).toISOString(), // Stagger by 1 min
        });

        if (error) {
          console.error(`   ❌ Failed to create vote:`, error.message);
        } else {
          voteCount++;
        }
      }

      console.log(
        `   ✅ Market "${market.question.slice(0, 40)}...": ${numLikes} likes, ${numDislikes} dislikes`
      );
    }

    console.log(`   ✅ Created ${voteCount} proposal votes`);

    // ========================================
    // 4. Create Sample Discussions
    // ========================================
    console.log("\n[4/4] Creating sample discussions...");
    let discussionCount = 0;

    const SAMPLE_COMMENTS = [
      "This market looks promising!",
      "I think YES is undervalued right now",
      "What's the source for this claim?",
      "Based on historical data, this seems likely",
      "I disagree, here's why...",
      "Has anyone considered the regulatory impact?",
    ];

    for (const market of marketResults) {
      // Each market gets 2-4 comments
      const numComments = 2 + Math.floor(Math.random() * 3);

      for (let i = 0; i < numComments; i++) {
        const commenter = TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];
        const comment = SAMPLE_COMMENTS[Math.floor(Math.random() * SAMPLE_COMMENTS.length)];

        const { error } = await supabase.from("discussions").insert({
          market_id: market.id,
          user_wallet: commenter.wallet,
          content: comment,
          created_at: new Date(Date.now() - (numComments - i) * 120000).toISOString(), // Stagger by 2 min
        });

        if (error) {
          console.error(`   ❌ Failed to create discussion:`, error.message);
        } else {
          discussionCount++;
        }
      }
    }

    console.log(`   ✅ Created ${discussionCount} discussion comments`);

    // ========================================
    // Summary
    // ========================================
    console.log("\n" + "=".repeat(60));
    console.log("Test Data Creation Complete!");
    console.log("=".repeat(60));
    console.log(`✅ Users: ${userResults.length}`);
    console.log(`✅ Markets: ${marketResults.length}`);
    console.log(`✅ Votes: ${voteCount}`);
    console.log(`✅ Discussions: ${discussionCount}`);
    console.log("=".repeat(60));

    // ========================================
    // Display Sample Data
    // ========================================
    console.log("\nSample Market for Testing:");
    console.log("-".repeat(60));
    if (marketResults.length > 0) {
      const sampleMarket = marketResults[0];
      console.log(`Market ID: ${sampleMarket.id}`);
      console.log(`Question: ${sampleMarket.question}`);
      console.log(`Creator: ${sampleMarket.creator_wallet.slice(0, 8)}...`);
      console.log(`State: ${sampleMarket.state}`);

      // Get votes for this market
      const { data: votes } = await supabase
        .from("proposal_votes")
        .select("*")
        .eq("market_id", sampleMarket.id);

      const likes = votes?.filter((v) => v.vote === true).length || 0;
      const dislikes = votes?.filter((v) => v.vote === false).length || 0;
      const total = likes + dislikes;
      const approvalRate = total > 0 ? ((likes / total) * 100).toFixed(1) : "0";

      console.log(`Votes: ${likes} likes, ${dislikes} dislikes (${approvalRate}% approval)`);
    }
    console.log("-".repeat(60));

    console.log("\n✅ Test data ready for integration testing!");
    console.log("\nNext Steps:");
    console.log("1. Test API endpoints:");
    console.log("   curl http://localhost:4000/api/markets");
    console.log("2. Test Vote Aggregator:");
    console.log("   (Runs automatically every 5 minutes)");
    console.log("3. Check WebSocket broadcasts:");
    console.log("   (Listen to ws://localhost:4001)");
  } catch (error) {
    console.error("\n❌ Error creating test data:", error);
    process.exit(1);
  }
}

// Run main function
main();
