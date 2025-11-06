export type { Database } from '@/lib/supabase/types';

// User types
export type User = {
  wallet: string;
  created_at: string;
  last_seen_at: string;
  twitter_handle: string | null;
  reputation_score: number;
};

// Market types
export type Market = {
  market_id: string;
  title: string;
  description: string;
  state: number;
  created_at: string;
  end_time: string;
  outcome: number | null;
};

// Discussion types
export type Discussion = {
  discussion_id: string;
  market_id: string;
  wallet: string;
  content: string;
  created_at: string;
  upvotes: number;
};

// Position types
export type Position = {
  position_id: string;
  market_id: string;
  wallet: string;
  shares_yes: number;
  shares_no: number;
  created_at: string;
};
