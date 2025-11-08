import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ZmartCore } from "../target/types/zmart_core";
import { SystemProgram, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert } from "chai";

describe("Initialize Global Config", () => {
  // Configure the client to use devnet
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Load program manually instead of using workspace
  const programId = new PublicKey("7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS");
  const idl = require("../target/idl/zmart_core.json");
  const program = new Program(idl, programId, provider) as Program<ZmartCore>;

  const admin = provider.wallet.publicKey;

  console.log("\n" + "=".repeat(60));
  console.log("Global Config Initialization Test");
  console.log("=".repeat(60));
  console.log(`Program ID: ${program.programId.toString()}`);
  console.log(`Admin: ${admin.toString()}`);
  console.log(`Cluster: ${provider.connection.rpcEndpoint}`);

  // Derive global config PDA
  const [globalConfigPDA, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("global-config")],
    program.programId
  );

  console.log(`Global Config PDA: ${globalConfigPDA.toString()}`);
  console.log(`Bump: ${bump}`);

  it("Checks wallet balance", async () => {
    const balance = await provider.connection.getBalance(admin);
    console.log(`\nWallet Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

    assert.isTrue(
      balance > 0.1 * LAMPORTS_PER_SOL,
      "Insufficient balance! Need at least 0.1 SOL for initialization"
    );
  });

  it("Checks if global config already exists", async () => {
    try {
      const existingConfig = await provider.connection.getAccountInfo(globalConfigPDA);

      if (existingConfig) {
        console.log("\n⚠️  Global Config already exists!");
        console.log(`   Size: ${existingConfig.data.length} bytes`);
        console.log(`   Owner: ${existingConfig.owner.toString()}`);

        // Try to fetch and display the config
        try {
          const config = await program.account.globalConfig.fetch(globalConfigPDA);
          console.log("\n📋 Existing Config:");
          console.log(`   Admin: ${config.admin.toString()}`);
          console.log(`   Backend Authority: ${config.backendAuthority.toString()}`);
          console.log(`   Protocol Fee Wallet: ${config.protocolFeeWallet.toString()}`);
          console.log(`   Protocol Fee: ${config.protocolFeeBps} bps (${config.protocolFeeBps / 100}%)`);
          console.log(`   Resolver Fee: ${config.resolverRewardBps} bps (${config.resolverRewardBps / 100}%)`);
          console.log(`   LP Fee: ${config.liquidityProviderFeeBps} bps (${config.liquidityProviderFeeBps / 100}%)`);
          console.log(`   Paused: ${config.isPaused}`);

          console.log("\n✅ Skipping initialization (already complete)");
          this.skip();
        } catch (fetchError) {
          console.error("   Error fetching config data:", fetchError);
          throw new Error("Global config exists but cannot be decoded!");
        }
      } else {
        console.log("\n✅ Global Config does not exist yet - ready to initialize");
      }
    } catch (error) {
      // RPC errors are expected when account doesn't exist
      if (error.message?.includes("could not find account")) {
        console.log("\n✅ Global Config does not exist yet - ready to initialize");
      } else {
        throw error;
      }
    }
  });

  it("Initializes global config with default parameters", async () => {
    console.log("\n" + "=".repeat(60));
    console.log("Initializing Global Config...");
    console.log("=".repeat(60));

    const backendAuthority = admin; // Can be different in production
    const protocolFeeWallet = admin; // Can be different in production

    console.log(`\nParameters:`);
    console.log(`   Admin: ${admin.toString()}`);
    console.log(`   Backend Authority: ${backendAuthority.toString()}`);
    console.log(`   Protocol Fee Wallet: ${protocolFeeWallet.toString()}`);

    console.log(`\nDefault Configuration:`);
    console.log(`   Protocol Fee: 3% (300 bps)`);
    console.log(`   Resolver Fee: 2% (200 bps)`);
    console.log(`   LP Fee: 5% (500 bps)`);
    console.log(`   Total Trading Fee: 10% (1000 bps)`);
    console.log(`   Proposal Approval Threshold: 70% (7000 bps)`);
    console.log(`   Dispute Success Threshold: 60% (6000 bps)`);
    console.log(`   Min Resolution Delay: 24 hours (86400s)`);
    console.log(`   Dispute Period: 3 days (259200s)`);
    console.log(`   Min Resolver Reputation: 80% (8000 bps)`);

    try {
      console.log(`\n⏳ Sending transaction...`);

      const tx = await program.methods
        .initializeGlobalConfig(backendAuthority)
        .accounts({
          admin: admin,
          globalConfig: globalConfigPDA,
          protocolFeeWallet: protocolFeeWallet,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log(`\n✅ Transaction confirmed!`);
      console.log(`   Signature: ${tx}`);
      console.log(`   Explorer: https://explorer.solana.com/tx/${tx}?cluster=devnet`);

      // Wait for confirmation
      console.log(`\n⏳ Waiting for account data to be available...`);
      await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (error) {
      console.error(`\n❌ Transaction failed:`, error);

      if (error.logs) {
        console.log(`\n📋 Program Logs:`);
        error.logs.forEach((log, i) => console.log(`   ${i + 1}. ${log}`));
      }

      // Check if it's an "already initialized" error
      if (error.message?.includes("already in use") || error.message?.includes("custom program error: 0x0")) {
        console.log(`\n⚠️  Account already initialized - this is OK!`);
        console.log(`   Continuing to verification...`);
      } else {
        throw error;
      }
    }
  });

  it("Verifies global config was initialized correctly", async () => {
    console.log("\n" + "=".repeat(60));
    console.log("Verifying Initialization...");
    console.log("=".repeat(60));

    // Fetch the global config account
    const config = await program.account.globalConfig.fetch(globalConfigPDA);

    console.log(`\n✅ Global Config Account Fetched Successfully!`);
    console.log(`\n📋 Configuration Details:`);
    console.log(`   PDA: ${globalConfigPDA.toString()}`);
    console.log(`   Bump: ${config.bump}`);
    console.log(`\n👤 Authorities:`);
    console.log(`   Admin: ${config.admin.toString()}`);
    console.log(`   Backend: ${config.backendAuthority.toString()}`);
    console.log(`   Protocol Fee Wallet: ${config.protocolFeeWallet.toString()}`);
    console.log(`\n💰 Fee Structure:`);
    console.log(`   Protocol: ${config.protocolFeeBps} bps (${config.protocolFeeBps / 100}%)`);
    console.log(`   Resolver: ${config.resolverRewardBps} bps (${config.resolverRewardBps / 100}%)`);
    console.log(`   LP: ${config.liquidityProviderFeeBps} bps (${config.liquidityProviderFeeBps / 100}%)`);

    const totalFee = config.protocolFeeBps + config.resolverRewardBps + config.liquidityProviderFeeBps;
    console.log(`   Total: ${totalFee} bps (${totalFee / 100}%)`);

    console.log(`\n🗳️  Voting Thresholds:`);
    console.log(`   Proposal Approval: ${config.proposalApprovalThreshold} bps (${config.proposalApprovalThreshold / 100}%)`);
    console.log(`   Dispute Success: ${config.disputeSuccessThreshold} bps (${config.disputeSuccessThreshold / 100}%)`);

    console.log(`\n⏱️  Time Limits:`);
    console.log(`   Min Resolution Delay: ${config.minResolutionDelay}s (${config.minResolutionDelay / 3600}h)`);
    console.log(`   Dispute Period: ${config.disputePeriod}s (${config.disputePeriod / 86400}d)`);

    console.log(`\n⭐ Reputation:`);
    console.log(`   Min Resolver: ${config.minResolverReputation} bps (${config.minResolverReputation / 100}%)`);

    console.log(`\n🔐 State:`);
    console.log(`   Paused: ${config.isPaused}`);

    // Assertions
    assert.equal(config.admin.toString(), admin.toString(), "Admin mismatch");
    assert.equal(config.protocolFeeBps, 300, "Protocol fee should be 3%");
    assert.equal(config.resolverRewardBps, 200, "Resolver fee should be 2%");
    assert.equal(config.liquidityProviderFeeBps, 500, "LP fee should be 5%");
    assert.equal(totalFee, 1000, "Total fee should be 10%");
    assert.equal(config.proposalApprovalThreshold, 7000, "Proposal threshold should be 70%");
    assert.equal(config.disputeSuccessThreshold, 6000, "Dispute threshold should be 60%");
    assert.equal(config.minResolutionDelay.toNumber(), 86400, "Min resolution delay should be 24h");
    assert.equal(config.disputePeriod.toNumber(), 259200, "Dispute period should be 3 days");
    assert.equal(config.minResolverReputation, 8000, "Min resolver reputation should be 80%");
    assert.equal(config.isPaused, false, "Should not be paused initially");

    console.log(`\n✅ All validations passed!`);
  });

  it("Verifies account can be fetched via RPC", async () => {
    console.log(`\n⏳ Fetching account via RPC...`);

    const accountInfo = await provider.connection.getAccountInfo(globalConfigPDA);

    assert.isNotNull(accountInfo, "Global config account should exist");
    assert.equal(accountInfo.owner.toString(), program.programId.toString(), "Wrong owner");
    assert.isTrue(accountInfo.data.length > 0, "Account should have data");

    console.log(`\n✅ RPC Verification Successful!`);
    console.log(`   Owner: ${accountInfo.owner.toString()}`);
    console.log(`   Size: ${accountInfo.data.length} bytes`);
    console.log(`   Lamports: ${(accountInfo.lamports / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
  });

  after(() => {
    console.log("\n" + "=".repeat(60));
    console.log("🎉 Global Config Initialization Complete!");
    console.log("=".repeat(60));
    console.log(`\n📋 Summary:`);
    console.log(`   PDA: ${globalConfigPDA.toString()}`);
    console.log(`   Admin: ${admin.toString()}`);
    console.log(`   Ready for: Market creation and trading`);
    console.log(`\n💡 Next Steps:`);
    console.log(`   1. Create a test market`);
    console.log(`   2. Test trading on devnet`);
    console.log(`   3. Test frontend integration`);
    console.log("=".repeat(60) + "\n");
  });
});
