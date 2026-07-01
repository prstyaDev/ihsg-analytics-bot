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
import { retryWithBackoff } from '../utils/retry';

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
let lastResetDate: string | null = null; // Track last reset date (YYYY-MM-DD)

// ────────────────────────────────────────────────────────────────────
// Format milliseconds to human-readable interval string
// ────────────────────────────────────────────────────────────────────
function formatInterval(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  if (minutes === 0) {
    return `${seconds} second(s)`;
  } else if (seconds === 0) {
    return `${minutes} minute(s)`;
  } else {
    return `${minutes} minute(s) ${seconds} second(s)`;
  }
}

// ────────────────────────────────────────────────────────────────────
// HTML Notification Formatting Utilities
// ────────────────────────────────────────────────────────────────────

/**
 * Format currency value with Indonesian Rupiah formatting
 * @param value - Numeric value to format
 * @returns Formatted string (e.g., "5.600")
 */
function formatCurrency(value: number): string {
  return value.toLocaleString('id-ID');
}

/**
 * Format percentage with sign and color indicator
 * @param value - Percentage value (can be string or number)
 * @returns Formatted string with emoji indicator
 */
function formatPercentage(value: string | number): string {
  if (value === 'N/A' || value === null || value === undefined) {
    return 'N/A';
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return 'N/A';
  
  const emoji = numValue >= 0 ? '🟢' : '🔴';
  const sign = numValue >= 0 ? '+' : '';
  return `${emoji} ${sign}${numValue.toFixed(2)}%`;
}

/**
 * Get emoji for alert condition
 * @param condition - 'ABOVE' or 'BELOW'
 * @returns Appropriate emoji
 */
function getConditionEmoji(condition: 'ABOVE' | 'BELOW'): string {
  return condition === 'ABOVE' ? '🟢' : '🔴';
}

/**
 * Get alert type badge with emoji
 * @param alertType - 'STATIC', 'PERCENTAGE', or 'TRAILING_STOP'
 * @returns HTML formatted badge
 */
function getAlertTypeBadge(alertType: string): string {
  switch (alertType) {
    case 'STATIC':
      return '🎯 <b>PRICE ALERT</b>';
    case 'PERCENTAGE':
      return '📊 <b>PERCENTAGE ALERT</b>';
    case 'TRAILING_STOP':
      return '🛡️ <b>TRAILING STOP</b>';
    default:
      return '🔔 <b>ALERT</b>';
  }
}

/**
 * Format volume with K/M/B suffixes for readability
 * @param volume - Volume value
 * @returns Formatted string
 */
function formatVolume(volume: number | string): string {
  if (volume === 'N/A' || volume === null || volume === undefined) {
    return 'N/A';
  }
  
  const numVolume = typeof volume === 'string' ? parseFloat(volume) : volume;
  if (isNaN(numVolume)) return 'N/A';
  
  if (numVolume >= 1_000_000_000) {
    return `${(numVolume / 1_000_000_000).toFixed(2)}B`;
  } else if (numVolume >= 1_000_000) {
    return `${(numVolume / 1_000_000).toFixed(2)}M`;
  } else if (numVolume >= 1_000) {
    return `${(numVolume / 1_000).toFixed(2)}K`;
  }
  return numVolume.toLocaleString('id-ID');
}

/**
 * Format single alert notification in premium HTML style
 * Uses Telegram HTML parse mode with monospace tables for alignment
 * 
 * @param alert - Alert row from database
 * @param currentPrice - Current stock price
 * @param marketData - Market data from GoAPI
 * @returns HTML formatted notification string
 */
function formatSingleAlertHTML(
  alert: AlertRow,
  currentPrice: number,
  marketData: any
): string {
  const symbol = alert.symbol.toUpperCase();
  const conditionEmoji = getConditionEmoji(alert.condition);
  const alertBadge = getAlertTypeBadge(alert.alert_type);
  
  // Extract market data with fallbacks
  const change = marketData?.change ?? 0;
  const changePercent = marketData?.change_pct ?? marketData?.changePct ?? 0;
  const volume = marketData?.volume ?? 'N/A';
  const open = marketData?.open ?? 'N/A';
  const high = marketData?.high ?? 'N/A';
  const low = marketData?.low ?? 'N/A';
  
  // Build HTML message
  let html = `${alertBadge}\n\n`;
  html += `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Stock symbol header
  html += `📈 <b>${symbol}</b>\n`;
  html += `💰 <b>Rp ${formatCurrency(currentPrice)}</b> ${formatPercentage(changePercent)}\n\n`;
  
  // Alert-specific details
  switch (alert.alert_type) {
    case 'STATIC': {
      const conditionText = alert.condition === 'ABOVE' ? 'naik di atas' : 'turun di bawah';
      html += `${conditionEmoji} <b>Kondisi:</b> Harga ${conditionText}\n`;
      html += `🎯 <b>Target:</b> Rp ${formatCurrency(alert.target_price)}\n\n`;
      break;
    }
    
    case 'PERCENTAGE': {
      const conditionText = alert.condition === 'ABOVE' ? 'Naik' : 'Turun';
      const basePrice = alert.base_price || 0;
      const percentage = alert.percentage || 0;
      const diff = ((currentPrice - basePrice) / basePrice * 100).toFixed(2);
      
      html += `${conditionEmoji} <b>Kondisi:</b> ${conditionText} ${percentage}%\n`;
      html += `📍 <b>Harga Base:</b> Rp ${formatCurrency(basePrice)}\n`;
      html += `🎯 <b>Target:</b> Rp ${formatCurrency(alert.target_price)}\n`;
      html += `📊 <b>Perubahan:</b> ${diff}%\n\n`;
      break;
    }
    
    case 'TRAILING_STOP': {
      const dayHigh = alert.day_high_price || 0;
      const percentage = alert.percentage || 0;
      const threshold = dayHigh * (1 - percentage / 100);
      const dropPercent = ((dayHigh - currentPrice) / dayHigh * 100).toFixed(2);
      
      html += `🔴 <b>Kondisi:</b> Turun ${percentage}% dari high\n`;
      html += `🏔️ <b>Day High:</b> Rp ${formatCurrency(dayHigh)}\n`;
      html += `🎯 <b>Threshold:</b> Rp ${formatCurrency(threshold)}\n`;
      html += `📉 <b>Drop:</b> ${dropPercent}%\n\n`;
      break;
    }
  }
  
  // Market data table using monospace
  html += `<b>📊 DATA PASAR</b>\n`;
  html += `<pre>`;
  html += `Open     : Rp ${typeof open === 'number' ? formatCurrency(open) : open}\n`;
  html += `High     : Rp ${typeof high === 'number' ? formatCurrency(high) : high}\n`;
  html += `Low      : Rp ${typeof low === 'number' ? formatCurrency(low) : low}\n`;
  html += `Perubahan: ${change >= 0 ? '+' : ''}${change} (${typeof changePercent === 'number' ? changePercent.toFixed(2) : changePercent}%)\n`;
  html += `Volume   : ${formatVolume(volume)}`;
  html += `</pre>\n\n`;
  
  // Footer
  html += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  html += `✅ <i>Alert ini telah dinonaktifkan</i>`;
  
  return html;
}

/**
 * Format batch alerts notification in compact HTML style
 * Groups multiple alerts for a single user into one message
 * 
 * @param alerts - Array of triggered alerts with price and market data
 * @param chatId - User's chat ID (for logging/debugging)
 * @returns HTML formatted batch notification string
 */
function formatBatchAlertsHTML(
  alerts: Array<{ alert: AlertRow; price: number; data: any }>,
  chatId: string
): string {
  const alertCount = alerts.length;
  
  // Header
  let html = `🔔 <b>BATCH ALERT TRIGGERED</b>\n\n`;
  html += `Anda memiliki <b>${alertCount} alert</b> yang terpicu!\n\n`;
  html += `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Process each alert (compact format)
  alerts.forEach((item, index) => {
    const { alert, price, data } = item;
    const symbol = alert.symbol.toUpperCase();
    const conditionEmoji = getConditionEmoji(alert.condition);
    const changePercent = data?.change_pct ?? data?.changePct ?? 0;
    
    // Alert header with emoji and type
    html += `${index + 1}. ${conditionEmoji} <b>${symbol}</b>`;
    
    // Alert type badge (compact)
    if (alert.alert_type === 'PERCENTAGE') {
      html += ` 📊`;
    } else if (alert.alert_type === 'TRAILING_STOP') {
      html += ` 🛡️`;
    }
    
    html += `\n`;
    
    // Price and condition (compact single line)
    html += `   💰 Rp ${formatCurrency(price)} ${formatPercentage(changePercent)}\n`;
    
    // Condition details (compact)
    if (alert.alert_type === 'STATIC') {
      const condition = alert.condition === 'ABOVE' ? 'di atas' : 'di bawah';
      html += `   🎯 Target ${condition} Rp ${formatCurrency(alert.target_price)}\n`;
    } else if (alert.alert_type === 'PERCENTAGE') {
      const percentage = alert.percentage || 0;
      const condition = alert.condition === 'ABOVE' ? '+' : '-';
      html += `   📊 ${condition}${percentage}% dari Rp ${formatCurrency(alert.base_price || 0)}\n`;
    } else if (alert.alert_type === 'TRAILING_STOP') {
      const percentage = alert.percentage || 0;
      html += `   🛡️ Drop ${percentage}% dari high Rp ${formatCurrency(alert.day_high_price || 0)}\n`;
    }
    
    // Spacing between alerts
    if (index < alertCount - 1) {
      html += `\n`;
    }
  });
  
  // Summary footer
  html += `\n━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Summary statistics
  const totalValue = alerts.reduce((sum, item) => sum + item.price, 0);
  const avgPrice = totalValue / alertCount;
  
  html += `<b>📈 RINGKASAN</b>\n`;
  html += `<code>`;
  html += `Total Alert  : ${alertCount}\n`;
  html += `Rata-rata    : Rp ${formatCurrency(Math.round(avgPrice))}\n`;
  html += `Status       : Semua dinonaktifkan`;
  html += `</code>\n\n`;
  
  html += `✅ <i>Semua alert telah dinonaktifkan</i>`;
  
  return html;
}

// ────────────────────────────────────────────────────────────────────
// Send Single Alert Notification (HTML Format)
// ────────────────────────────────────────────────────────────────────
async function sendSingleAlertNotification(
  alert: AlertRow,
  currentPrice: number,
  marketData: any
): Promise<boolean> {
  try {
    const symbol = alert.symbol.toUpperCase();
    const message = formatSingleAlertHTML(alert, currentPrice, marketData);
    
    await bot.telegram.sendMessage(alert.chat_id, message, { 
      parse_mode: 'HTML' 
    });
    
    console.log(`[AlertWorker] ✅ Single alert notification sent to chat ${alert.chat_id} for ${symbol} (${alert.alert_type})`);
    return true;
  } catch (err: any) {
    // Handle common Telegram errors
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
// Send Batch Alert Notification (HTML Format)
// ────────────────────────────────────────────────────────────────────
async function sendBatchAlertNotification(
  alerts: Array<{ alert: AlertRow; price: number; data: any }>,
  chatId: string
): Promise<boolean> {
  try {
    const message = formatBatchAlertsHTML(alerts, chatId);
    
    await bot.telegram.sendMessage(chatId, message, { 
      parse_mode: 'HTML' 
    });
    
    const symbols = alerts.map(item => item.alert.symbol).join(', ');
    console.log(`[AlertWorker] ✅ Batch notification sent to chat ${chatId} for ${alerts.length} alerts (${symbols})`);
    return true;
  } catch (err: any) {
    // Handle common Telegram errors
    if (err?.response?.error_code === 403) {
      console.warn(`[AlertWorker] ⚠️  User ${chatId} blocked the bot. Skipping notification.`);
    } else if (err?.response?.error_code === 400) {
      console.warn(`[AlertWorker] ⚠️  Invalid chat_id ${chatId}. Skipping notification.`);
    } else {
      console.error(`[AlertWorker] ❌ Failed to send batch notification to ${chatId}:`, err?.message);
    }
    return false;
  }
}

// ────────────────────────────────────────────────────────────────────
// Fetch Stock Price from GoAPI with Exponential Backoff Retry
// ────────────────────────────────────────────────────────────────────
async function fetchStockPrice(symbol: string): Promise<{ price: number; data: any } | null> {
  try {
    // Wrap GoAPI call with exponential backoff retry (3 retries, 1s → 2s → 4s)
    const result = await retryWithBackoff(
      async () => {
        const { data } = await api.get('/stock/idx/prices', {
          params: { symbols: symbol.toUpperCase() }
        });
        
        const result = data?.data?.results?.[0] || data?.data || data;
        const price = result?.close ?? result?.price ?? null;
        
        // Throw error if no price data found (will trigger retry)
        if (price === null || price === undefined) {
          throw new Error(`No price data found for ${symbol}`);
        }
        
        return { price: Number(price), data: result };
      },
      {
        maxRetries: 3,
        baseDelay: 1000,
        operationName: `GoAPI price fetch for ${symbol}`
      }
    );
    
    return result;
    
  } catch (err: any) {
    // All retries exhausted or unrecoverable error
    const errorMsg = err?.message || 'Unknown error';
    
    // Distinguish between retry exhaustion and immediate failures
    if (errorMsg.includes('after') && errorMsg.includes('attempts')) {
      console.error(
        `[AlertWorker] ❌ Failed to fetch price for ${symbol} after exhausting retries. ` +
        `Skipping this symbol.`
      );
    } else {
      console.error(
        `[AlertWorker] ❌ Failed to fetch price for ${symbol}: ${errorMsg}`
      );
    }
    
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
    
    // Step 3: Accumulator for triggered alerts grouped by chat_id
    const triggeredAlertsByUser = new Map<string, Array<{ alert: AlertRow; price: number; data: any }>>();
    
    let checkedCount = 0;
    
    // Step 4: Process each symbol's alerts (accumulate, don't send yet)
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
        
        // Update trailing stop day highs for this symbol
        await updateTrailingStopDayHighs(symbol, price);
        
        // Check each alert for this symbol
        for (const alert of alerts) {
          checkedCount++;
          
          const alertTypeLabel = `[${alert.alert_type}]`;
          const isTriggered = checkAlertCondition(alert, price);
          
          if (isTriggered) {
            console.log(
              `[AlertWorker] 🎯 Alert triggered! ${alertTypeLabel} ${symbol} ${alert.condition} ${alert.target_price} ` +
              `(current: ${price})`
            );
            
            // Accumulate triggered alert by chat_id
            const chatId = alert.chat_id;
            if (!triggeredAlertsByUser.has(chatId)) {
              triggeredAlertsByUser.set(chatId, []);
            }
            triggeredAlertsByUser.get(chatId)!.push({
              alert,
              price,
              data: marketData
            });
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
    
    // Step 5: Send batch notifications and deactivate alerts
    let notificationsSent = 0;
    let alertsDeactivated = 0;
    
    if (triggeredAlertsByUser.size > 0) {
      console.log(`[AlertWorker] 📨 Processing notifications for ${triggeredAlertsByUser.size} user(s)...`);
      
      for (const [chatId, alertItems] of triggeredAlertsByUser.entries()) {
        const alertCount = alertItems.length;
        let notificationSuccess = false;
        
        try {
          if (alertCount === 1) {
            // Single alert - use single template
            const { alert, price, data } = alertItems[0];
            console.log(`[AlertWorker] 📤 Sending single alert notification to ${chatId} for ${alert.symbol}`);
            notificationSuccess = await sendSingleAlertNotification(alert, price, data);
          } else {
            // Multiple alerts - use batch template
            console.log(`[AlertWorker] 📤 Sending batch notification to ${chatId} for ${alertCount} alerts`);
            notificationSuccess = await sendBatchAlertNotification(alertItems, chatId);
          }
          
          if (notificationSuccess) {
            notificationsSent++;
          }
          
        } catch (notifErr: any) {
          console.error(`[AlertWorker] ❌ Error sending notification to ${chatId}:`, notifErr?.message);
        }
        
        // Deactivate all alerts for this user (regardless of notification success)
        for (const { alert } of alertItems) {
          try {
            const { error: deactivateError } = await deactivateAlert(alert.id);
            
            if (deactivateError) {
              console.error(`[AlertWorker] ❌ Failed to deactivate alert ${alert.id}:`, deactivateError);
            } else {
              alertsDeactivated++;
              console.log(`[AlertWorker] ✅ Alert ${alert.id} (${alert.symbol}) deactivated`);
            }
          } catch (deactivateErr: any) {
            console.error(`[AlertWorker] ❌ Exception deactivating alert ${alert.id}:`, deactivateErr?.message);
          }
        }
      }
    }
    
    console.log(
      `[AlertWorker] ✅ Alert check cycle completed. ` +
      `Checked: ${checkedCount}, Triggered: ${alertsDeactivated}, Notifications: ${notificationsSent}`
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
  const intervalMs = env.ALERT_CHECK_INTERVAL_MS;
  const intervalFormatted = formatInterval(intervalMs);
  
  console.log('[AlertWorker] 🚀 Initializing alert worker...');
  console.log(`[AlertWorker] ⏰ Check interval: ${intervalFormatted}`);
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
  
  // Set up periodic checks using configurable interval
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
  }, intervalMs);
  
  console.log(`[AlertWorker] ✅ Worker started successfully. Running check cycles every ${intervalFormatted}...`);
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
