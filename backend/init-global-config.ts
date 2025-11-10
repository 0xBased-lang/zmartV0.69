import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";

async function main() {
  console.log("🚀 Initializing GlobalConfig...\n");

  // Setup
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const walletPath = process.env.HOME + "/.config/solana/id.json";
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );

  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  // Load program
  const programId = new PublicKey("B5LimwoBn4aAqFmJsV1KtrxDbtEjaZ9WeNrfDWmJc42Z");
  const idl = JSON.parse(fs.readFileSync("./target/idl/zmart_core.json", "utf-8"));
  const program = new anchor.Program(idl, programId, provider);

  console.log("Program ID:", programId.toString());
  console.log("Admin:", walletKeypair.publicKey.toString());

  // Derive PDA
  const [globalConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("global-config")],
    programId
  );

  console.log("GlobalConfig PDA:", globalConfigPda.toString(), "\n");

  // Check if already initialized
  try {
    const account = await program.account.globalConfig.fetch(globalConfigPda);
    console.log("✅ Already initialized!");
    console.log("Admin:", account.admin.toString());
    console.log("Default LMSR B:", account.defaultLmsrBValue.toString());
    console.log("Fee BPS:", account.protocolFeeBps.toString());
    console.log("Paused:", account.paused);
    return;
  } catch (e) {
    console.log("⏳ Not initialized, creating...\n");
  }

  // Initialize
  try {
    const tx = await program.methods
      .initializeGlobalConfig()
      .accounts({
        admin: walletKeypair.publicKey,
        globalConfig: globalConfigPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    await connection.confirmTransaction(tx, "confirmed");

    console.log("✅ GlobalConfig initialized!");
    console.log("Transaction:", tx, "\n");

    // Verify
    const account = await program.account.globalConfig.fetch(globalConfigPda);
    console.log("📋 Verification:");
    console.log("Admin:", account.admin.toString());
    console.log("Default LMSR B:", account.defaultLmsrBValue.toString());
    console.log("Fee BPS:", account.protocolFeeBps.toString());
    console.log("Paused:", account.paused);
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
