# GlobalConfig Initialization Workaround

**Issue:** IDL account resolution is not working with current Anchor setup.

**Solution:** Use Anchor test framework which handles initialization correctly.

## Quick Init

```bash
# Create a simple test file
cat > tests/zmart-core.ts << 'TEST'
import * as anchor from "@coral-xyz/anchor";

describe("zmart-core", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  it("Initialize GlobalConfig", async () => {
    const program = anchor.workspace.ZmartCore;
    
    const [pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("global-config")],
      program.programId
    );

    try {
      await program.account.globalConfig.fetch(pda);
      console.log("Already initialized!");
      return;
    } catch {}

    await program.methods
      .initializeGlobalConfig()
      .rpc();

    console.log("✅ Initialized!");
  });
});
TEST

# Run the test
anchor test --skip-build --skip-deploy
```

## Alternative: Manual via Solana CLI

Once initialized, proceed with:
```bash
cd backend
npm run test:devnet:lifecycle
```

## Status

✅ Both bugs fixed and deployed
✅ Program working on devnet
⏳ GlobalConfig needs initialization (one-time)
✅ Tests ready to run after init
