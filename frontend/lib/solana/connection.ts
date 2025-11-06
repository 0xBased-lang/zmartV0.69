import { Connection, clusterApiUrl } from '@solana/web3.js';
import { SOLANA_RPC_URL, SOLANA_NETWORK } from '@/config/constants';

export const connection = new Connection(
  SOLANA_RPC_URL || clusterApiUrl(SOLANA_NETWORK),
  'confirmed'
);
