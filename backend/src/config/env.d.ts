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
        readonly backendKeypairPath: string | undefined;
        readonly backendAuthorityPrivateKey: string | undefined;
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
        readonly projectId: string | undefined;
        readonly projectSecret: string | undefined;
        readonly gatewayUrl: string | undefined;
        readonly pinataApiKey: string | undefined;
        readonly pinataSecretKey: string | undefined;
        readonly pinataGatewayUrl: string | undefined;
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
    readonly marketMonitor: {
        readonly enabled: boolean;
        readonly cronSchedule: string;
        readonly batchSize: number;
        readonly debugMode: boolean;
        readonly dryRun: boolean;
    };
    readonly logging: {
        readonly level: string;
    };
};
export default config;
//# sourceMappingURL=env.d.ts.map