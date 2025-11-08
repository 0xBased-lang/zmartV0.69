export declare const config: {
    readonly node: {
        readonly env: string;
        readonly isDevelopment: boolean;
        readonly isProduction: boolean;
        readonly isTest: boolean;
    };
    readonly solana: {
        readonly rpcUrl: string;
        readonly programIds: {
            readonly core: string;
            readonly proposal: string;
        };
        readonly backendKeypairPath: string;
    };
    readonly supabase: {
        readonly url: string;
        readonly anonKey: string;
        readonly serviceRoleKey: string;
    };
    readonly redis: {
        readonly url: string;
    };
    readonly ipfs: {
        readonly projectId: string;
        readonly projectSecret: string;
        readonly gatewayUrl: string;
    };
    readonly api: {
        readonly port: number;
        readonly host: string;
        readonly corsOrigins: string[];
    };
    readonly websocket: {
        readonly port: number;
    };
    readonly services: {
        readonly voteAggregationInterval: number;
        readonly ipfsSnapshotCron: string;
        readonly minProposalVotes: number;
        readonly proposalApprovalThreshold: number;
        readonly disputeThreshold: number;
    };
    readonly logging: {
        readonly level: string;
    };
};
export default config;
//# sourceMappingURL=env.d.ts.map