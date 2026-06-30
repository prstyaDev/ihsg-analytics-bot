// ────────────────────────────────────────────────────────────────────
// Trading Hours Utility for Indonesian Stock Exchange (IDX)
// ────────────────────────────────────────────────────────────────────
// Trading Hours: Monday-Friday, 09:00-16:00 WIB (UTC+7)
// Market closed on weekends and public holidays (holidays not checked)
// ────────────────────────────────────────────────────────────────────

/**
 * Check if the Indonesian Stock Exchange (IDX) is currently open for trading.
 * Trading hours: Monday-Friday, 09:00-16:00 WIB (UTC+7)
 * 
 * @returns {boolean} True if market is open, false otherwise
 */
export function isMarketOpen(): boolean {
  try {
    // Get current time in WIB (UTC+7)
    const now = new Date();
    
    // Convert to WIB by adding 7 hours to UTC
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const wibHours = (utcHours + 7) % 24;
    
    // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const dayOfWeek = now.getUTCDay();
    
    // Check if it's a weekday (Monday = 1 to Friday = 5)
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    
    if (!isWeekday) {
      return false;
    }
    
    // Convert time to minutes since midnight for easier comparison
    const currentTimeInMinutes = wibHours * 60 + utcMinutes;
    const marketOpenTime = 9 * 60; // 09:00 = 540 minutes
    const marketCloseTime = 16 * 60; // 16:00 = 960 minutes
    
    // Check if current time is within trading hours
    const isWithinTradingHours = 
      currentTimeInMinutes >= marketOpenTime && 
      currentTimeInMinutes < marketCloseTime;
    
    return isWithinTradingHours;
  } catch (err) {
    console.error('[TradingHours] Error checking market status:', err);
    return false; // Fail safe - assume market is closed on error
  }
}

/**
 * Get human-readable market status message
 * 
 * @returns {string} Market status description
 */
export function getMarketStatus(): string {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const wibHours = (utcHours + 7) % 24;
  
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const currentTimeInMinutes = wibHours * 60 + utcMinutes;
  const marketOpenTime = 9 * 60;
  const marketCloseTime = 16 * 60;
  
  if (!isWeekday) {
    return 'Market Closed (Weekend)';
  }
  
  if (currentTimeInMinutes < marketOpenTime) {
    return 'Market Closed (Before Trading Hours)';
  }
  
  if (currentTimeInMinutes >= marketCloseTime) {
    return 'Market Closed (After Trading Hours)';
  }
  
  return 'Market Open';
}

/**
 * Get the next market open time (for logging/debugging purposes)
 * 
 * @returns {string} Human-readable next market open time
 */
export function getNextMarketOpen(): string {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const wibHours = (utcHours + 7) % 24;
  const currentTimeInMinutes = wibHours * 60 + utcMinutes;
  const marketOpenTime = 9 * 60;
  
  // If it's a weekday and before 09:00, market opens today
  if (dayOfWeek >= 1 && dayOfWeek <= 5 && currentTimeInMinutes < marketOpenTime) {
    return 'Today at 09:00 WIB';
  }
  
  // If it's Friday after hours or Saturday, next open is Monday
  if (dayOfWeek === 5 && currentTimeInMinutes >= marketOpenTime) {
    return 'Monday at 09:00 WIB';
  }
  
  if (dayOfWeek === 6) {
    return 'Monday at 09:00 WIB';
  }
  
  // If it's Sunday, next open is Monday
  if (dayOfWeek === 0) {
    return 'Monday at 09:00 WIB';
  }
  
  // Otherwise, next open is tomorrow at 09:00
  return 'Tomorrow at 09:00 WIB';
}
