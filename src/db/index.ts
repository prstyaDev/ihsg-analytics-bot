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

// ────────────────────────────────────────────────────────────────────
// Alert Accessor Functions
// ────────────────────────────────────────────────────────────────────
export async function getActiveAlerts() {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('is_active', true);
    
    if (error) {
      console.error('[DB] getActiveAlerts error:', error.message);
      return { data: null, error };
    }
    
    return { data: data as AlertRow[], error: null };
  } catch (err: any) {
    console.error('[DB] getActiveAlerts exception:', err?.message);
    return { data: null, error: err };
  }
}

export async function getAlertsByUser(chatId: string) {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('chat_id', chatId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[DB] getAlertsByUser error:', error.message);
      return { data: null, error };
    }
    
    return { data: data as AlertRow[], error: null };
  } catch (err: any) {
    console.error('[DB] getAlertsByUser exception:', err?.message);
    return { data: null, error: err };
  }
}

export async function createAlert(
  chatId: string,
  symbol: string,
  targetPrice: number,
  condition: 'ABOVE' | 'BELOW'
) {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .insert({
        chat_id: chatId,
        symbol: symbol.toUpperCase(),
        target_price: targetPrice,
        condition,
        is_active: true
      })
      .select();
    
    if (error) {
      console.error('[DB] createAlert error:', error.message);
      return { data: null, error };
    }
    
    console.log(`[DB] Alert created: ${symbol} ${condition} ${targetPrice} for chat ${chatId}`);
    return { data: data as AlertRow[], error: null };
  } catch (err: any) {
    console.error('[DB] createAlert exception:', err?.message);
    return { data: null, error: err };
  }
}

export async function deleteAlert(chatId: string, symbol: string) {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .delete()
      .eq('chat_id', chatId)
      .eq('symbol', symbol.toUpperCase())
      .eq('is_active', true)
      .select();
    
    if (error) {
      console.error('[DB] deleteAlert error:', error.message);
      return { data: null, error };
    }
    
    console.log(`[DB] Alert(s) deleted: ${symbol} for chat ${chatId}`);
    return { data: data as AlertRow[], error: null };
  } catch (err: any) {
    console.error('[DB] deleteAlert exception:', err?.message);
    return { data: null, error: err };
  }
}

export async function deactivateAlert(alertId: number) {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .update({ is_active: false })
      .eq('id', alertId)
      .select();
    
    if (error) {
      console.error('[DB] deactivateAlert error:', error.message);
      return { data: null, error };
    }
    
    console.log(`[DB] Alert deactivated: ID ${alertId}`);
    return { data: data as AlertRow[], error: null };
  } catch (err: any) {
    console.error('[DB] deactivateAlert exception:', err?.message);
    return { data: null, error: err };
  }
}

export async function getActiveAlertsGroupedBySymbol() {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('is_active', true);
    
    if (error) {
      console.error('[DB] getActiveAlertsGroupedBySymbol error:', error.message);
      return { data: null, error };
    }
    
    // Group alerts by symbol for efficient price checking
    const grouped = new Map<string, AlertRow[]>();
    
    if (data) {
      (data as AlertRow[]).forEach((alert) => {
        const symbol = alert.symbol.toUpperCase();
        if (!grouped.has(symbol)) {
          grouped.set(symbol, []);
        }
        grouped.get(symbol)!.push(alert);
      });
    }
    
    return { data: grouped, error: null };
  } catch (err: any) {
    console.error('[DB] getActiveAlertsGroupedBySymbol exception:', err?.message);
    return { data: null, error: err };
  }
}
