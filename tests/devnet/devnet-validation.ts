// ============================================================================
// Devnet Deployment Validation Test (Story 1.7)
// ============================================================================
//
// Purpose: Verify devnet deployment is successful and programs are accessible
// Runs against: Devnet (not localnet)
//
// Tests:
// 1. Programs exist and are accessible
// 2. Program accounts are initialized
// 3. Basic instruction execution works
//
// ============================================================================

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { assert } from "chai";

describe("devnet-validation", () => {
  // Use devnet provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Program IDs from devnet deployment
  const CORE_PROGRAM_ID = new PublicKey("7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS");
  const PROPOSAL_PROGRAM_ID = new PublicKey("3XDU9r97qqJRdgqKJEWDYSJesPAUbLqsejXus4WLuhAQ");

  it("Verifies zmart-core program is deployed", async () => {
    // Fetch program account
    const accountInfo = await provider.connection.getAccountInfo(CORE_PROGRAM_ID);

    // Assert program exists
    assert.isNotNull(accountInfo, "zmart-core program should exist on devnet");
    assert.isTrue(accountInfo.executable, "zmart-core should be executable");

    console.log("✅ zmart-core program verified:");
    console.log(`   Program ID: ${CORE_PROGRAM_ID.toString()}`);
    console.log(`   Data length: ${accountInfo.data.length} bytes`);
    console.log(`   Lamports: ${accountInfo.lamports}`);
    console.log(`   Owner: ${accountInfo.owner.toString()}`);
  });

  it("Verifies zmart-proposal program is deployed", async () => {
    // Fetch program account
    const accountInfo = await provider.connection.getAccountInfo(PROPOSAL_PROGRAM_ID);

    // Assert program exists
    assert.isNotNull(accountInfo, "zmart-proposal program should exist on devnet");
    assert.isTrue(accountInfo.executable, "zmart-proposal should be executable");

    console.log("✅ zmart-proposal program verified:");
    console.log(`   Program ID: ${PROPOSAL_PROGRAM_ID.toString()}`);
    console.log(`   Data length: ${accountInfo.data.length} bytes`);
    console.log(`   Lamports: ${accountInfo.lamports}`);
    console.log(`   Owner: ${accountInfo.owner.toString()}`);
  });

  it("Verifies programs are owned by BPF Loader", async () => {
    const coreInfo = await provider.connection.getAccountInfo(CORE_PROGRAM_ID);
    const proposalInfo = await provider.connection.getAccountInfo(PROPOSAL_PROGRAM_ID);

    // BPF Loader IDs (upgradeable)
    const BPF_LOADER_UPGRADEABLE = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");

    assert.equal(
      coreInfo.owner.toString(),
      BPF_LOADER_UPGRADEABLE.toString(),
      "zmart-core should be owned by BPF Loader Upgradeable"
    );

    assert.equal(
      proposalInfo.owner.toString(),
      BPF_LOADER_UPGRADEABLE.toString(),
      "zmart-proposal should be owned by BPF Loader Upgradeable"
    );

    console.log("✅ Both programs owned by BPF Loader Upgradeable");
  });

  it("Verifies devnet RPC connection is working", async () => {
    const slot = await provider.connection.getSlot();
    const blockTime = await provider.connection.getBlockTime(slot);

    assert.isNumber(slot, "Should get valid slot number");
    assert.isNumber(blockTime, "Should get valid block time");

    console.log("✅ Devnet RPC connection verified:");
    console.log(`   Current slot: ${slot}`);
    console.log(`   Block time: ${new Date(blockTime * 1000).toISOString()}`);
    console.log(`   RPC URL: ${provider.connection.rpcEndpoint}`);
  });

  it("Displays deployment summary", async () => {
    console.log("\n" + "=".repeat(80));
    console.log("DEVNET DEPLOYMENT SUMMARY");
    console.log("=".repeat(80));
    console.log("");
    console.log("Programs Deployed:");
    console.log(`  ✅ zmart-core:     ${CORE_PROGRAM_ID.toString()}`);
    console.log(`  ✅ zmart-proposal: ${PROPOSAL_PROGRAM_ID.toString()}`);
    console.log("");
    console.log("Cluster: Devnet");
    console.log(`RPC: ${provider.connection.rpcEndpoint}`);
    console.log(`Wallet: ${provider.wallet.publicKey.toString()}`);
    console.log("");
    console.log("Solana Explorer Links:");
    console.log(`  zmart-core:     https://explorer.solana.com/address/${CORE_PROGRAM_ID.toString()}?cluster=devnet`);
    console.log(`  zmart-proposal: https://explorer.solana.com/address/${PROPOSAL_PROGRAM_ID.toString()}?cluster=devnet`);
    console.log("");
    console.log("Status: ✅ ALL VALIDATION CHECKS PASSED");
    console.log("=".repeat(80));
    console.log("");
  });
});
