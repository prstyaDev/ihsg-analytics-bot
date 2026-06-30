import axios from 'axios';
import { bot } from '../bot';
import { env } from '../config/env';
import { getActiveAlertsGroupedBySymbol, deactivateAlert, AlertRow } from '../db';
import { isMarketOpen, getMarketStatus } from '../utils/tradingHours';

// ────────────────────────────────────────────────────────────────────
// GoAPI Client Configuration
// ────────────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: 'https://api.goapi.io',
  headers: {
    'X-API-KEY': env.GOAPI_KEY,
    'Accept': 'application/json'
  },
  timeout: 30000
});

// ────────────────────────────────────────────────────────────────────
// Worker State Management
// ────────────────────────────────────────────────────────────────────
let workerInterval: NodeJS.Timeout | null = null;
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// ────────────────────────────────────────────────────────────────────
// Send Alert Notification to User via Telegram
// ────────────────────────────────────────────────────────────────────
async function sendAlertNotification(
  alert: AlertRow,
  currentPrice: number,
  marketData: any
): Promise<boolean> {
  try {
    const symbol = alert.symbol.toUpperCase();
    const condition = alert.condition === 'ABOVE' ? 'naik di atas' : 'turun di bawah';
    const changePercent = marketData?.change_pct || marketData?.changePct || 'N/A';
    const volume = marketData?.volume || 'N/A';
    const change = marketData?.change || 'N/A';
    
    // Format rich notification message
    const message = `🔔 *Alert Triggered!*\n\n` +
      `📈 *Saham:* ${symbol}\n` +
      `💰 *Harga Saat Ini:* Rp ${currentPrice.toLocaleString('id-ID')}\n` +
      `🎯 *Target Anda:* ${condition} Rp ${alert.target_price.toLocaleString('id-ID')}\n\n` +
      `📊 *Data Pasar:*\n` +
      `• Perubahan: ${change} (${changePercent}%)\n` +
      `• Volume: ${volume}\n\n` +
      `✅ Alert ini telah dinonaktifkan.`;
    
    await bot.telegram.sendMessage(alert.chat_id, message, { 
      parse_mode: 'Markdown' 
    });
    
    console.log(`[AlertWorker] ✅ Notification sent to chat ${alert.chat_id} for ${symbol}`);
    return true;
  } catch (err: any) {
    // Handle common errors (user blocked bot, chat not found, etc.)
    if (err?.response?.error_code === 403) {
      console.warn(`[AlertWorker] ⚠️  User ${alert.chat_id} blocked the bot. Skipping notification.`);
    } else if (err?.response?.error_code === 400) {
      console.warn(`[AlertWorker] ⚠️  Invalid chat_id ${alert.chat_id}. Skipping notification.`);
    } else {
      console.error(`[AlertWorker] ❌ Failed to send notification to ${alert.chat_id}:`, err?.message);
    }
    return false;
  }
}

// ────────────────────────────────────────────────────────────────────
// Fetch Stock Price from GoAPI
// ────────────────────────────────────────────────────────────────────
async function fetchStockPrice(symbol: string): Promise<{ price: number; data: any } | null> {
  try {
    const { data } = await api.get('/stock/idx/prices', {
      params: { symbols: symbol.toUpperCase() }
    });
    
    const result = data?.data?.results?.[0] || data?.data || data;
    const price = result?.close ?? result?.price ?? null;
    
    if (price === null || price === undefined) {
      console.warn(`[AlertWorker] ⚠️  No price data found for ${symbol}`);
      return null;
    }
    
    return { price: Number(price), data: result };
  } catch (err: any) {
    console.error(`[AlertWorker] ❌ Failed to fetch price for ${symbol}:`, err?.message);
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────
// Check Individual Alert Against Current Price
// ────────────────────────────────────────────────────────────────────
function checkAlertCondition(alert: AlertRow, currentPrice: number): boolean {
  if (alert.condition === 'ABOVE') {
    return currentPrice >= alert.target_price;
  } else if (alert.condition === 'BELOW') {
    return currentPrice <= alert.target_price;
  }
  return false;
}

// ────────────────────────────────────────────────────────────────────
// Main Alert Checking Logic
// ────────────────────────────────────────────────────────────────────
export async function checkAlerts(): Promise<void> {
  try {
    console.log('[AlertWorker] 🔍 Starting alert check cycle...');
    
    // Fetch all active alerts grouped by symbol
    const { data: alertsMap, error } = await getActiveAlertsGroupedBySymbol();
    
    if (error) {
      console.error('[AlertWorker] ❌ Failed to fetch alerts from database:', error);
      return;
    }
    
    if (!alertsMap || alertsMap.size === 0) {
      console.log('[AlertWorker] ℹ️  No active alerts to check.');
      return;
    }
    
    console.log(`[AlertWorker] 📋 Found ${alertsMap.size} unique symbols with active alerts`);
    
    // Process each symbol's alerts
    let triggeredCount = 0;
    let checkedCount = 0;
    
    for (const [symbol, alerts] of alertsMap.entries()) {
      try {
        console.log(`[AlertWorker] 🔎 Checking ${alerts.length} alert(s) for ${symbol}...`);
        
        // Fetch current price for this symbol
        const priceData = await fetchStockPrice(symbol);
        
        if (!priceData) {
          console.warn(`[AlertWorker] ⚠️  Skipping ${symbol} - price unavailable`);
          continue;
        }
        
        const { price, data: marketData } = priceData;
        console.log(`[AlertWorker] 💹 ${symbol} current price: ${price}`);
        
        // Check each alert for this symbol
        for (const alert of alerts) {
          checkedCount++;
          
          const isTriggered = checkAlertCondition(alert, price);
          
          if (isTriggered) {
            console.log(
              `[AlertWorker] 🎯 Alert triggered! ${symbol} ${alert.condition} ${alert.target_price} ` +
              `(current: ${price})`
            );
            
            // Send notification to user
            const notificationSent = await sendAlertNotification(alert, price, marketData);
            
            // Deactivate alert regardless of notification success
            const { error: deactivateError } = await deactivateAlert(alert.id);
            
            if (deactivateError) {
              console.error(`[AlertWorker] ❌ Failed to deactivate alert ${alert.id}:`, deactivateError);
            } else {
              triggeredCount++;
              console.log(`[AlertWorker] ✅ Alert ${alert.id} deactivated successfully`);
            }
          }
        }
        
        // Small delay between API calls to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (symbolErr: any) {
        // Graceful degradation: log error and continue with next symbol
        console.error(`[AlertWorker] ❌ Error processing alerts for ${symbol}:`, symbolErr?.message);
        continue;
      }
    }
    
    console.log(
      `[AlertWorker] ✅ Alert check cycle completed. ` +
      `Checked: ${checkedCount}, Triggered: ${triggeredCount}`
    );
    
  } catch (err: any) {
    console.error('[AlertWorker] ❌ Fatal error in checkAlerts():', err?.message);
    // Don't throw - allow worker to continue in next cycle
  }
}

// ────────────────────────────────────────────────────────────────────
// Start Alert Worker with Trading Hours Scheduler
// ────────────────────────────────────────────────────────────────────
export function startAlertWorker(): void {
  console.log('[AlertWorker] 🚀 Initializing alert worker...');
  console.log(`[AlertWorker] ⏰ Check interval: ${CHECK_INTERVAL_MS / 1000 / 60} minutes`);
  console.log('[AlertWorker] 🕒 Trading hours: Mon-Fri 09:00-16:00 WIB');
  
  // Initial market status check
  const initialStatus = getMarketStatus();
  console.log(`[AlertWorker] 📊 Current market status: ${initialStatus}`);
  
  // Run immediately if market is open
  if (isMarketOpen()) {
    console.log('[AlertWorker] ✅ Market is open - running initial check...');
    checkAlerts().catch(err => {
      console.error('[AlertWorker] ❌ Error in initial check:', err?.message);
    });
  } else {
    console.log('[AlertWorker] 🔒 Market is closed - waiting for next cycle...');
  }
  
  // Set up periodic checks
  workerInterval = setInterval(() => {
    const marketStatus = getMarketStatus();
    
    if (isMarketOpen()) {
      console.log('[AlertWorker] ✅ Market is open - running scheduled check...');
      checkAlerts().catch(err => {
        console.error('[AlertWorker] ❌ Error in scheduled check:', err?.message);
      });
    } else {
      console.log(`[AlertWorker] 🔒 Market is closed (${marketStatus}) - skipping check`);
    }
  }, CHECK_INTERVAL_MS);
  
  console.log('[AlertWorker] ✅ Worker started successfully');
}

// ────────────────────────────────────────────────────────────────────
// Stop Alert Worker (for graceful shutdown)
// ────────────────────────────────────────────────────────────────────
export function stopAlertWorker(): void {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log('[AlertWorker] 🛑 Worker stopped');
  }
}
