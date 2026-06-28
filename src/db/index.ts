import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

// ────────────────────────────────────────────────────────────────────
// TypeScript Database Interfaces
// ────────────────────────────────────────────────────────────────────
export interface WatchlistRow {
  id: number;
  chat_id: string;
  symbol: string;
  created_at: string;
}

export interface PortfolioRow {
  id: number;
  chat_id: string;
  symbol: string;
  average_price: number;
  total_lot: number;
  created_at: string;
}

export interface AlertRow {
  id: number;
  chat_id: string;
  symbol: string;
  target_price: number;
  condition: 'ABOVE' | 'BELOW';
  is_active: boolean;
  created_at: string;
}

// ────────────────────────────────────────────────────────────────────
// Supabase Client Singleton (Service Role Key bypasses RLS)
// ────────────────────────────────────────────────────────────────────
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

console.log('[Database] Supabase client initialized');

// ────────────────────────────────────────────────────────────────────
// Connection Healthcheck
// ────────────────────────────────────────────────────────────────────
export async function testConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('watchlist').select('id').limit(1);
    
    if (error) {
      console.error('[Database] Connection test failed:', error.message);
      return { success: false, error: error.message };
    }
    
    console.log('[Database] Connection test successful');
    return { success: true };
  } catch (err: any) {
    console.error('[Database] Connection test exception:', err?.message);
    return { success: false, error: err?.message || 'Unknown error' };
  }
}

// ────────────────────────────────────────────────────────────────────
// Watchlist Accessor Functions
// ────────────────────────────────────────────────────────────────────
export async function checkWatchlistExists(chatId: string, symbol: string) {
  const { data, error } = await supabase
    .from('watchlist')
    .select('id')
    .eq('chat_id', chatId)
    .eq('symbol', symbol)
    .maybeSingle();
  
  if (error) {
    console.error('[DB] checkWatchlistExists error:', error.message);
  }
  
  return { data, error };
}

export async function addToWatchlist(chatId: string, symbol: string) {
  const { data, error } = await supabase
    .from('watchlist')
    .insert({ chat_id: chatId, symbol })
    .select();
  
  if (error) {
    console.error('[DB] addToWatchlist error:', error.message);
  }
  
  return { data, error };
}

export async function getWatchlist(chatId: string) {
  const { data, error } = await supabase
    .from('watchlist')
    .select('symbol')
    .eq('chat_id', chatId);
  
  if (error) {
    console.error('[DB] getWatchlist error:', error.message);
  }
  
  return { data, error };
}

export async function removeFromWatchlist(chatId: string, symbol: string) {
  const { data, error } = await supabase
    .from('watchlist')
    .delete()
    .eq('chat_id', chatId)
    .eq('symbol', symbol)
    .select();
  
  if (error) {
    console.error('[DB] removeFromWatchlist error:', error.message);
  }
  
  return { data, error };
}
