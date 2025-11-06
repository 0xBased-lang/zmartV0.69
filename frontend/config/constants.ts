export const SOLANA_NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK as 'devnet' | 'mainnet-beta';
export const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
export const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || '';

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const APP_NAME = 'ZMART';
export const APP_DESCRIPTION = 'Decentralized Prediction Markets on Solana';
