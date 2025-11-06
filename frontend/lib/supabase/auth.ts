import { supabase } from './client';
import type { User } from '@/types/database';

/**
 * Create or update user profile using wallet address
 * @param wallet - Solana wallet address
 */
export async function upsertUser(wallet: string): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        wallet,
        last_seen_at: new Date().toISOString(),
      } as any,
      {
        onConflict: 'wallet',
      }
    )
    .select()
    .single();

  if (error) {
    console.error('Failed to upsert user:', error);
    throw error;
  }

  return data as User;
}

/**
 * Get user profile by wallet address
 * @param wallet - Solana wallet address
 */
export async function getUser(wallet: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('wallet', wallet)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = not found (expected for new users)
    console.error('Failed to get user:', error);
    throw error;
  }

  return data as User | null;
}

/**
 * Update user's last seen timestamp
 * @param wallet - Solana wallet address
 */
export async function updateLastSeen(wallet: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    // @ts-expect-error - Placeholder types until actual Supabase types are generated
    .update({ last_seen_at: new Date().toISOString() })
    .eq('wallet', wallet);

  if (error) {
    console.error('Failed to update last seen:', error);
  }
}
