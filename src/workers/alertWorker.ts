import axios from 'axios';
import { bot } from '../bot';
import { env } from '../config/env';
import { 
  getActiveAlertsGroupedBySymbol, 
  deactivateAlert, 
  AlertRow,
  getTrailingStopAlerts,
  updateDayHigh,
  resetTrailingStopDayHighs
} from '../db';
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
let lastResetDate: string | null = null; // Track last reset date (YYYY-MM-DD)

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
    const changePercent = marketData?.change_pct || marketData?.changePct || 'N/A';
    const volume = marketData?.volume || 'N/A';
    const change = marketData?.change || 'N/A';
    
    let message = '';

    // Format message based on alert type
    switch (alert.alert_type) {
      case 'STATIC': {
        const condition = alert.condition === 'ABOVE' ? 'naik di atas' : 'turun di bawah';
        message = `🔔 *Alert Triggered!*\n\n` +
          `📈 *Saham:* ${symbol}\n` +
          `💰 *Harga Saat Ini:* Rp ${currentPrice.toLocaleString('id-ID')}\n` +
          `🎯 *Target Anda:* ${condition} Rp ${alert.target_price.toLocaleString('id-ID')}\n\n` +
          `📊 *Data Pasar:*\n` +
          `• Perubahan: ${change} (${changePercent}%)\n` +
          `• Volume: ${volume}\n\n` +
          `✅ Alert ini telah dinonaktifkan.`;
        break;
      }

      case 'PERCENTAGE': {
        const condition = alert.condition === 'ABOVE' ? 'naik' : 'turun';
        const basePrice = alert.base_price || 0;
        const percentage = alert.percentage || 0;
        message = `🔔 *Alert Persentase Triggered!*\n\n` +
          `📈 *Saham:* ${symbol}\n` +
          `📊 *Kondisi:* ${condition.charAt(0).toUpperCase() + condition.slice(1)} ${percentage}% dari harga base\n` +
          `💰 *Harga Base:* Rp ${basePrice.toLocaleString('id-ID')} (saat dibuat)\n` +
          `🎯 *Target:* Rp ${alert.target_price.toLocaleString('id-ID')}\n` +
          `💹 *Harga Saat Ini:* Rp ${currentPrice.toLocaleString('id-ID')}\n\n` +
          `📊 *Data Pasar:*\n` +
          `• Perubahan: ${change} (${changePercent}%)\n` +
          `• Volume: ${volume}\n\n` +
          `✅ Alert ini telah dinonaktifkan.`;
        break;
      }

      case 'TRAILING_STOP': {
        const dayHigh = alert.day_high_price || 0;
        const percentage = alert.percentage || 0;
        const threshold = dayHigh * (1 - percentage / 100);
        message = `🔔 *Trailing Stop Alert Triggered!*\n\n` +
          `📈 *Saham:* ${symbol}\n` +
          `📉 *Kondisi:* Turun ${percentage}% dari harga tertinggi hari ini\n` +
          `🏔️ *Harga Tertinggi Hari Ini:* Rp ${dayHigh.toLocaleString('id-ID')}\n` +
          `🎯 *Threshold:* Rp ${threshold.toLocaleString('id-ID')}\n` +
          `💹 *Harga Saat Ini:* Rp ${currentPrice.toLocaleString('id-ID')}\n\n` +
          `📊 *Data Pasar:*\n` +
          `• Perubahan: ${change} (${changePercent}%)\n` +
          `• Volume: ${volume}\n\n` +
          `✅ Alert ini telah dinonaktifkan.`;
        break;
      }

      default: {
        // Fallback to static message
        const condition = alert.condition === 'ABOVE' ? 'naik di atas' : 'turun di bawah';
        message = `🔔 *Alert Triggered!*\n\n` +
          `📈 *Saham:* ${symbol}\n` +
          `💰 *Harga Saat Ini:* Rp ${currentPrice.toLocaleString('id-ID')}\n` +
          `🎯 *Target Anda:* ${condition} Rp ${alert.target_price.toLocaleString('id-ID')}\n\n` +
          `✅ Alert ini telah dinonaktifkan.`;
        break;
      }
    }
    
    await bot.telegram.sendMessage(alert.chat_id, message, { 
      parse_mode: 'Markdown' 
    });
    
    console.log(`[AlertWorker] ✅ Notification sent to chat ${alert.chat_id} for ${symbol} (${alert.alert_type})`);
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
  switch (alert.alert_type) {
    case 'STATIC':
    case 'PERCENTAGE': {
      // Both STATIC and PERCENTAGE use target_price comparison (PERCENTAGE is converted at creation)
      if (alert.condition === 'ABOVE') {
        return currentPrice >= alert.target_price;
      } else if (alert.condition === 'BELOW') {
        return currentPrice <= alert.target_price;
      }
      return false;
    }

    case 'TRAILING_STOP': {
      // Trailing stop: trigger when price drops below threshold
      // Threshold = day_high_price * (1 - percentage/100)
      if (!alert.day_high_price || !alert.percentage) {
        console.warn(`[AlertWorker] ⚠️  Trailing stop alert ${alert.id} missing day_high_price or percentage`);
        return false;
      }

      const threshold = alert.day_high_price * (1 - alert.percentage / 100);
      const isTriggered = currentPrice <= threshold;

      if (isTriggered) {
        console.log(
          `[AlertWorker] 🎯 Trailing stop triggered: ${alert.symbol} ` +
          `current=${currentPrice}, dayHigh=${alert.day_high_price}, threshold=${threshold.toFixed(2)}`
        );
      }

      return isTriggered;
    }

    default: {
      console.warn(`[AlertWorker] ⚠️  Unknown alert type: ${alert.alert_type}`);
      return false;
    }
  }
}

// ────────────────────────────────────────────────────────────────────
// Update Trailing Stop Day Highs for a Symbol
// ────────────────────────────────────────────────────────────────────
async function updateTrailingStopDayHighs(symbol: string, currentPrice: number): Promise<void> {
  try {
    // Fetch all active trailing stop alerts for this symbol
    const { data: trailingAlerts, error } = await getTrailingStopAlerts(symbol);

    if (error) {
      console.error(`[AlertWorker] ❌ Failed to fetch trailing stops for ${symbol}:`, error);
      return;
    }

    if (!trailingAlerts || trailingAlerts.length === 0) {
      return; // No trailing stops for this symbol
    }

    // Update day high for each trailing stop if current price is higher
    for (const alert of trailingAlerts) {
      const currentHigh = alert.day_high_price || 0;

      // Initialize day high if null (first check of the day)
      if (currentHigh === 0 || currentHigh === null) {
        const { error: updateError } = await updateDayHigh(alert.id, currentPrice);
        if (!updateError) {
          console.log(
            `[AlertWorker] 📈 Day high initialized for ${symbol} alert ${alert.id}: ${currentPrice}`
          );
        }
      } 
      // Update if current price exceeds day high
      else if (currentPrice > currentHigh) {
        const { error: updateError } = await updateDayHigh(alert.id, currentPrice);
        if (!updateError) {
          console.log(
            `[AlertWorker] 📈 Day high updated for ${symbol} alert ${alert.id}: ` +
            `${currentHigh} → ${currentPrice}`
          );
        }
      }
    }
  } catch (err: any) {
    console.error(`[AlertWorker] ❌ Error updating trailing stops for ${symbol}:`, err?.message);
  }
}

// ────────────────────────────────────────────────────────────────────
// Check and Reset Day Highs at Market Open (09:00 WIB)
// ────────────────────────────────────────────────────────────────────
async function checkAndResetDayHighs(): Promise<void> {
  try {
    // Get current date in WIB timezone (YYYY-MM-DD format)
    const now = new Date();
    const wibDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const currentDate = wibDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentHour = wibDate.getHours();
    const currentMinute = wibDate.getMinutes();

    // Check if we're at market open time (09:00 WIB)
    const isMarketOpenTime = currentHour === 9 && currentMinute >= 0 && currentMinute < 5;

    // Only reset if:
    // 1. We're within market open window (09:00-09:05 WIB)
    // 2. We haven't already reset today
    if (isMarketOpenTime && lastResetDate !== currentDate) {
      console.log(`[AlertWorker] 🔄 Market open detected (${currentDate} 09:00 WIB), resetting day highs...`);

      const { data: resetAlerts, error } = await resetTrailingStopDayHighs();

      if (error) {
        console.error('[AlertWorker] ❌ Failed to reset day highs:', error);
        return;
      }

      const count = resetAlerts?.length || 0;
      lastResetDate = currentDate; // Update last reset tracking

      console.log(
        `[AlertWorker] ✅ Day highs reset completed: ${count} trailing stop alert(s) reset at ${currentDate} 09:00 WIB`
      );
    }
  } catch (err: any) {
    console.error('[AlertWorker] ❌ Error in checkAndResetDayHighs():', err?.message);
  }
}

// ────────────────────────────────────────────────────────────────────
// Main Alert Checking Logic
// ────────────────────────────────────────────────────────────────────
export async function checkAlerts(): Promise<void> {
  try {
    console.log('[AlertWorker] 🔍 Starting alert check cycle...');
    
    // Step 1: Check and reset day highs at market open (09:00 WIB)
    await checkAndResetDayHighs();
    
    // Step 2: Fetch all active alerts grouped by symbol
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
    
    // Step 3: Process each symbol's alerts
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
        
        // Step 4: Update trailing stop day highs for this symbol
        await updateTrailingStopDayHighs(symbol, price);
        
        // Step 5: Check each alert for this symbol
        for (const alert of alerts) {
          checkedCount++;
          
          const alertTypeLabel = `[${alert.alert_type}]`;
          const isTriggered = checkAlertCondition(alert, price);
          
          if (isTriggered) {
            console.log(
              `[AlertWorker] 🎯 Alert triggered! ${alertTypeLabel} ${symbol} ${alert.condition} ${alert.target_price} ` +
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
