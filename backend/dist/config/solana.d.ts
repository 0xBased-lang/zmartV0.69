import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
/**
 * Get or create Solana connection
 * @returns Solana connection instance
 */
export declare function getConnection(): Connection;
/**
 * Load backend authority keypair from file
 * @returns Backend keypair
 */
export declare function getBackendKeypair(): Keypair;
/**
 * Get Anchor provider
 * @returns Anchor provider instance
 */
export declare function getProvider(): AnchorProvider;
/**
 * Get program IDs
 * @returns Program IDs for core and proposal programs
 */
export declare function getProgramIds(): {
    core: PublicKey;
    proposal: PublicKey;
};
/**
 * Test Solana connection
 * @returns True if connection successful
 */
export declare function testSolanaConnection(): Promise<boolean>;
/**
 * Check backend keypair balance
 * @returns Balance in lamports
 */
export declare function getBackendBalance(): Promise<number>;
declare const _default: {
    getConnection: typeof getConnection;
    getBackendKeypair: typeof getBackendKeypair;
    getProvider: typeof getProvider;
    getProgramIds: typeof getProgramIds;
    testSolanaConnection: typeof testSolanaConnection;
    getBackendBalance: typeof getBackendBalance;
};
export default _default;
//# sourceMappingURL=solana.d.ts.map