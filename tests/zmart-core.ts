import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ZmartCore } from "../target/types/zmart_core";

describe("zmart-core", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ZmartCore as Program<ZmartCore>;

  it("Initialize GlobalConfig", async () => {
    console.log("\n🚀 Initializing GlobalConfig...");
    console.log("Program ID:", program.programId.toString());
    console.log("Admin:", provider.wallet.publicKey.toString());

    // Derive GlobalConfig PDA
    const [globalConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("global-config")],
      program.programId
    );

    console.log("GlobalConfig PDA:", globalConfigPda.toString());

    // Check if already initialized
    try {
      const account = await program.account.globalConfig.fetch(globalConfigPda);
      console.log("\n✅ Already initialized!");
      console.log("Admin:", account.admin.toString());
      console.log("Default LMSR B:", account.defaultLmsrBValue.toString());
      return;
    } catch (e) {
      console.log("\n⏳ Not initialized, creating...\n");
    }

    // Initialize GlobalConfig
    try {
      const tx = await program.methods
        .initializeGlobalConfig()
        .rpc();

      await provider.connection.confirmTransaction(tx, "confirmed");

      console.log("\n✅ GlobalConfig initialized successfully!");
      console.log("Transaction:", tx);

      // Verify initialization
      const account = await program.account.globalConfig.fetch(globalConfigPda);
      console.log("\n📋 Verification:");
      console.log("Admin:", account.admin.toString());
      console.log("Default LMSR B:", account.defaultLmsrBValue.toString());
      console.log("Fee BPS:", account.protocolFeeBps.toString());
      console.log("Paused:", account.paused);

    } catch (error) {
      console.error("\n❌ Error initializing GlobalConfig:");
      console.error(error);
      throw error;
    }
  });
});
