import * as anchor from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

/**
 * ZMART v0.69 - Devnet Initialization Script
 *
 * This script initializes the GlobalConfig account on devnet with default
 * settings. Run after deploying the program to devnet.
 *
 * Usage:
 *   ANCHOR_PROVIDER_URL="https://api.devnet.solana.com" \
 *   ANCHOR_WALLET="~/.config/solana/id.json" \
 *   npx ts-node scripts/initialize-devnet.ts
 */

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  console.log("🚀 ZMART Devnet Initialization");
  console.log("================================");
  console.log(`Wallet: ${provider.wallet.publicKey.toString()}`);
  console.log(`Network: ${provider.connection.rpcEndpoint}`);

  // Program ID (matches Anchor.toml)
  const PROGRAM_ID = new PublicKey("7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS");

  // Create program interface
  const program = new anchor.Program(
    {
      version: "0.1.0",
      name: "zmart_core",
      instructions: [],
    } as any,
    PROGRAM_ID,
    provider
  );

  // Backend authority (using the same wallet for now)
  const backendAuthority = provider.wallet.publicKey;

  // Derive GlobalConfig PDA
  const [globalConfigPda, _] = PublicKey.findProgramAddressSync(
    [Buffer.from("global_config")],
    PROGRAM_ID
  );

  console.log(`\n📍 GlobalConfig PDA: ${globalConfigPda.toString()}`);
  console.log(`📍 Backend Authority: ${backendAuthority.toString()}`);

  try {
    // Check if already initialized
    try {
      const accountInfo = await provider.connection.getAccountInfo(globalConfigPda);
      if (accountInfo) {
        console.log("\n✅ GlobalConfig already initialized!");
        console.log(`   Owner: ${accountInfo.owner.toString()}`);
        console.log(`   Size: ${accountInfo.data.length} bytes`);
        return;
      }
    } catch (e) {
      // Account doesn't exist, continue with initialization
    }

    console.log("\n⏳ Initializing GlobalConfig...");

    // Build the instruction manually since we don't have the IDL
    const instruction = {
      programId: PROGRAM_ID,
      keys: [
        {
          pubkey: globalConfigPda,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: provider.wallet.publicKey,
          isSigner: true,
          isWritable: true,
        },
        {
          pubkey: anchor.web3.SystemProgram.programId,
          isSigner: false,
          isWritable: false,
        },
      ],
      data: Buffer.concat([
        // Anchor discriminator for initialize_global_config (8 bytes)
        // This is computed from: anchor.BorshInstructionCoder.discriminator("initialize_global_config")
        Buffer.from([209, 152, 116, 27, 178, 252, 129, 108]), // Placeholder - needs actual discriminator
        // backend_authority (32 bytes)
        backendAuthority.toBuffer(),
      ]),
    };

    console.log("\n❌ Note: IDL not generated during deployment.");
    console.log("   To complete initialization, use Anchor CLI client SDK.");
    console.log("\n   Or deploy the program with:");
    console.log("   anchor build --idl target/idl");
    console.log("   anchor deploy --provider.cluster devnet");

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main().catch(console.error);
