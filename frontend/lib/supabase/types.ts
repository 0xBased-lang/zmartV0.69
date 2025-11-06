/**
 * Supabase Database Types
 *
 * NOTE: These are placeholder types. Generate actual types with:
 * pnpm types:generate
 *
 * Or manually:
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          wallet: string
          created_at: string
          last_seen_at: string
          twitter_handle: string | null
          reputation_score: number
        }
        Insert: {
          wallet: string
          created_at?: string
          last_seen_at?: string
          twitter_handle?: string | null
          reputation_score?: number
        }
        Update: {
          wallet?: string
          created_at?: string
          last_seen_at?: string
          twitter_handle?: string | null
          reputation_score?: number
          [key: string]: any  // Allow additional fields for flexibility
        }
      }
      markets: {
        Row: {
          market_id: string
          title: string
          description: string
          state: number
          created_at: string
          end_time: string
          outcome: number | null
        }
        Insert: {
          market_id: string
          title: string
          description: string
          state?: number
          created_at?: string
          end_time: string
          outcome?: number | null
        }
        Update: {
          market_id?: string
          title?: string
          description?: string
          state?: number
          created_at?: string
          end_time?: string
          outcome?: number | null
        }
      }
      discussions: {
        Row: {
          discussion_id: string
          market_id: string
          wallet: string
          content: string
          created_at: string
          upvotes: number
        }
        Insert: {
          discussion_id?: string
          market_id: string
          wallet: string
          content: string
          created_at?: string
          upvotes?: number
        }
        Update: {
          discussion_id?: string
          market_id?: string
          wallet?: string
          content?: string
          created_at?: string
          upvotes?: number
        }
      }
      positions: {
        Row: {
          position_id: string
          market_id: string
          wallet: string
          shares_yes: number
          shares_no: number
          created_at: string
        }
        Insert: {
          position_id?: string
          market_id: string
          wallet: string
          shares_yes?: number
          shares_no?: number
          created_at?: string
        }
        Update: {
          position_id?: string
          market_id?: string
          wallet?: string
          shares_yes?: number
          shares_no?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
