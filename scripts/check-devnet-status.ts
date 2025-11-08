// ============================================================
// Devnet Status Checker
// ============================================================
// Purpose: Check program deployment, global config, and test markets
// Usage: npx ts-node scripts/check-devnet-status.ts

import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import * as fs from "fs";
import * as path from "path";

// Load IDL
const idlPath = path.join(__dirname, "../target/idl/zmart_core.json");
const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));

// Constants
const PROGRAM_ID = new PublicKey("7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS");
const RPC_URL = "https://api.devnet.solana.com";

async function main() {
  console.log("=".repeat(60));
  console.log("Devnet Status Check");
  console.log("=".repeat(60));

  // Setup connection
  const connection = new Connection(RPC_URL, "confirmed");

  // Load wallet
  const walletPath = path.join(process.env.HOME!, ".config/solana/id.json");
  const walletKeypair = anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );
  const wallet = new Wallet(walletKeypair);

  // Create provider
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  // Create program
  const program = new Program(idl, PROGRAM_ID, provider);

  console.log("\n1. Program Deployment:");
  console.log(`   Program ID: ${PROGRAM_ID.toString()}`);

  try {
    const programInfo = await connection.getAccountInfo(PROGRAM_ID);
    if (programInfo) {
      console.log(`   ✅ Program deployed (${(programInfo.lamports / 1e9).toFixed(2)} SOL)`);
    } else {
      console.log(`   ❌ Program not found`);
      return;
    }
  } catch (error: any) {
    console.log(`   ❌ Error checking program: ${error.message}`);
    return;
  }

  console.log("\n2. Global Config:");

  // Derive global config PDA
  const [globalConfigPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("global_config")],
    PROGRAM_ID
  );

  console.log(`   PDA: ${globalConfigPDA.toString()}`);

  try {
    const globalConfig = await program.account.globalConfig.fetch(globalConfigPDA);
    console.log(`   ✅ Global Config initialized`);
    console.log(`      Admin: ${globalConfig.admin.toString()}`);
    console.log(`      Protocol Fee: ${globalConfig.protocolFeeBps} bps`);
    console.log(`      Creator Fee: ${globalConfig.creatorFeeBps} bps`);
    console.log(`      Staker Fee: ${globalConfig.stakerFeeBps} bps`);
    console.log(`      Min Liquidity: ${globalConfig.minLiquidity.toString()}`);
    console.log(`      Voting Period: ${globalConfig.proposalVotingPeriodSeconds}s`);
    console.log(`      Dispute Period: ${globalConfig.disputeVotingPeriodSeconds}s`);
    console.log(`      Paused: ${globalConfig.paused}`);
  } catch (error: any) {
    console.log(`   ❌ Global Config not initialized: ${error.message}`);
    console.log(`   Run: anchor run initialize-global-config`);
  }

  console.log("\n3. Test Markets:");

  try {
    // Try to find market accounts
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        {
          memcmp: {
            offset: 0, // Account discriminator
            bytes: "CtP6Kc2yPVdk", // MarketAccount discriminator (base58)
          },
        },
      ],
    });

    console.log(`   Found ${accounts.length} markets`);

    if (accounts.length > 0) {
      for (let i = 0; i < Math.min(accounts.length, 3); i++) {
        const account = accounts[i];
        console.log(`\n   Market ${i + 1}:`);
        console.log(`      Address: ${account.pubkey.toString()}`);

        try {
          const marketData = await program.account.marketAccount.fetch(account.pubkey);
          console.log(`      Question: ${marketData.question}`);
          console.log(`      State: ${Object.keys(marketData.state)[0]}`);
          console.log(`      Creator: ${marketData.creator.toString()}`);
          console.log(`      Total YES Shares: ${marketData.totalYesShares.toString()}`);
          console.log(`      Total NO Shares: ${marketData.totalNoShares.toString()}`);
          console.log(`      Liquidity Param: ${marketData.liquidityParameter.toString()}`);
        } catch (error: any) {
          console.log(`      ❌ Error fetching market data: ${error.message}`);
        }
      }
    } else {
      console.log(`   ❌ No markets found`);
      console.log(`   Create one with: anchor run create-market`);
    }
  } catch (error: any) {
    console.log(`   ❌ Error checking markets: ${error.message}`);
  }

  console.log("\n4. Wallet Status:");
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`   Address: ${wallet.publicKey.toString()}`);
  console.log(`   Balance: ${(balance / 1e9).toFixed(4)} SOL`);

  console.log("\n" + "=".repeat(60));
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
