import { RSI, MACD, SMA, EMA } from 'technicalindicators';

// ════════════════════════════════════════════════════════════════════════════════
// TYPESCRIPT INTERFACES
// ════════════════════════════════════════════════════════════════════════════════

/**
 * RSI (Relative Strength Index) calculation result
 */
export interface RSIResult {
  value: number | null;
  interpretation: 'OVERBOUGHT' | 'OVERSOLD' | 'NEUTRAL';
  message: string;
}

/**
 * MACD (Moving Average Convergence Divergence) calculation result
 */
export interface MACDResult {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
  interpretation: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  message: string;
}

/**
 * Moving Averages calculation result
 */
export interface MAResult {
  sma20: number | null;
  sma50: number | null;
  ema20: number | null;
  message: string;
}

/**
 * Support and Resistance levels result
 */
export interface SRResult {
  resistance: number;
  support: number;
  currentPosition: 'NEAR_RESISTANCE' | 'NEAR_SUPPORT' | 'MID_RANGE';
  message: string;
}

/**
 * Complete technical indicator analysis result
 */
export interface TechnicalIndicatorResult {
  symbol: string;
  dataPoints: number;
  rsi: RSIResult;
  macd: MACDResult;
  movingAverages: MAResult;
  supportResistance: SRResult;
  warnings: string[];
}

// ════════════════════════════════════════════════════════════════════════════════
// CONFIGURATION CONSTANTS
// ════════════════════════════════════════════════════════════════════════════════

/** RSI thresholds - designed for future customization */
const RSI_CONFIG = {
  PERIOD: 14,
  OVERBOUGHT_THRESHOLD: 70,
  OVERSOLD_THRESHOLD: 30,
};

/** MACD configuration */
const MACD_CONFIG = {
  FAST_PERIOD: 12,
  SLOW_PERIOD: 26,
  SIGNAL_PERIOD: 9,
};

/** Moving Average periods */
const MA_CONFIG = {
  SMA_SHORT: 20,
  SMA_LONG: 50,
  EMA_SHORT: 20,
};

/** Support/Resistance proximity percentage */
const SR_CONFIG = {
  PROXIMITY_PERCENT: 2, // Within 2% considered "near"
};

// ════════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Parse historical data array and extract closing prices
 * @param rawData - Raw historical data from GoAPI
 * @returns Array of closing prices sorted chronologically (oldest first)
 */
export function parseHistoricalData(rawData: any[]): number[] {
  console.log(`[Technical] Parsing historical data: ${rawData.length} records`);
  
  if (!Array.isArray(rawData) || rawData.length === 0) {
    console.warn('[Technical] Empty or invalid historical data array');
    return [];
  }

  // Sort by date ascending (oldest first) - required for technical indicators
  const sorted = [...rawData].sort((a, b) => {
    const dateA = new Date(a.date || a.Date || '').getTime();
    const dateB = new Date(b.date || b.Date || '').getTime();
    return dateA - dateB;
  });

  // Extract closing prices
  const closingPrices = sorted
    .map((item) => {
      const close = item.close || item.Close || item.price || item.Price;
      return close ? Number(close) : null;
    })
    .filter((price): price is number => price !== null && !isNaN(price));

  console.log(`[Technical] Extracted ${closingPrices.length} valid closing prices`);
  return closingPrices;
}

// ════════════════════════════════════════════════════════════════════════════════
// INDICATOR CALCULATION FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Calculate RSI (Relative Strength Index) with interpretation
 * @param closingPrices - Array of closing prices
 * @returns RSI result with Indonesian interpretation
 */
export function calculateRSI(closingPrices: number[]): RSIResult {
  console.log(`[Technical] Calculating RSI with ${closingPrices.length} data points`);

  // Validate sufficient data
  if (closingPrices.length < RSI_CONFIG.PERIOD) {
    console.warn(`[Technical] Insufficient data for RSI: ${closingPrices.length} < ${RSI_CONFIG.PERIOD}`);
    return {
      value: null,
      interpretation: 'NEUTRAL',
      message: `Data tidak cukup untuk menghitung RSI (minimal ${RSI_CONFIG.PERIOD} hari diperlukan)`,
    };
  }

  try {
    // Calculate RSI using technicalindicators library
    const rsiValues = RSI.calculate({
      values: closingPrices,
      period: RSI_CONFIG.PERIOD,
    });

    // Get the most recent RSI value
    const latestRSI = rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : null;

    if (latestRSI === null || latestRSI === undefined) {
      console.warn('[Technical] RSI calculation returned null');
      return {
        value: null,
        interpretation: 'NEUTRAL',
        message: 'RSI tidak dapat dihitung dari data yang tersedia',
      };
    }

    // Round to 2 decimal places
    const roundedRSI = Math.round(latestRSI * 100) / 100;

    // Determine interpretation
    let interpretation: 'OVERBOUGHT' | 'OVERSOLD' | 'NEUTRAL';
    let message: string;

    if (roundedRSI >= RSI_CONFIG.OVERBOUGHT_THRESHOLD) {
      interpretation = 'OVERBOUGHT';
      message = `RSI ${roundedRSI} - Kondisi Jenuh Beli (Overbought). Potensi koreksi harga ke bawah.`;
    } else if (roundedRSI <= RSI_CONFIG.OVERSOLD_THRESHOLD) {
      interpretation = 'OVERSOLD';
      message = `RSI ${roundedRSI} - Kondisi Jenuh Jual (Oversold). Potensi rebound harga ke atas.`;
    } else {
      interpretation = 'NEUTRAL';
      
      // Provide nuanced interpretation for neutral zone
      if (roundedRSI > 60) {
        message = `RSI ${roundedRSI} - Momentum bullish, mendekati zona jenuh beli.`;
      } else if (roundedRSI < 40) {
        message = `RSI ${roundedRSI} - Momentum bearish, mendekati zona jenuh jual.`;
      } else {
        message = `RSI ${roundedRSI} - Momentum seimbang, belum ada sinyal ekstrem.`;
      }
    }

    console.log(`[Technical] RSI calculated: ${roundedRSI} (${interpretation})`);
    return {
      value: roundedRSI,
      interpretation,
      message,
    };
  } catch (error: any) {
    console.error('[Technical] RSI calculation error:', error.message);
    return {
      value: null,
      interpretation: 'NEUTRAL',
      message: 'Terjadi kesalahan saat menghitung RSI',
    };
  }
}

/**
 * Calculate MACD (Moving Average Convergence Divergence) with interpretation
 * @param closingPrices - Array of closing prices
 * @returns MACD result with Indonesian interpretation
 */
export function calculateMACD(closingPrices: number[]): MACDResult {
  console.log(`[Technical] Calculating MACD with ${closingPrices.length} data points`);

  // Validate sufficient data (need at least slow period + signal period)
  const minRequired = MACD_CONFIG.SLOW_PERIOD + MACD_CONFIG.SIGNAL_PERIOD;
  if (closingPrices.length < minRequired) {
    console.warn(`[Technical] Insufficient data for MACD: ${closingPrices.length} < ${minRequired}`);
    return {
      macd: null,
      signal: null,
      histogram: null,
      interpretation: 'NEUTRAL',
      message: `Data tidak cukup untuk menghitung MACD (minimal ${minRequired} hari diperlukan)`,
    };
  }

  try {
    // Calculate MACD using technicalindicators library
    const macdResults = MACD.calculate({
      values: closingPrices,
      fastPeriod: MACD_CONFIG.FAST_PERIOD,
      slowPeriod: MACD_CONFIG.SLOW_PERIOD,
      signalPeriod: MACD_CONFIG.SIGNAL_PERIOD,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    });

    // Get the most recent MACD values
    const latest = macdResults.length > 0 ? macdResults[macdResults.length - 1] : null;

    if (!latest || latest.MACD === undefined || latest.signal === undefined) {
      console.warn('[Technical] MACD calculation returned null');
      return {
        macd: null,
        signal: null,
        histogram: null,
        interpretation: 'NEUTRAL',
        message: 'MACD tidak dapat dihitung dari data yang tersedia',
      };
    }

    // Round values to 2 decimal places
    const macd = Math.round(latest.MACD * 100) / 100;
    const signal = Math.round(latest.signal * 100) / 100;
    const histogram = latest.histogram !== undefined ? Math.round(latest.histogram * 100) / 100 : 0;

    // Determine interpretation
    let interpretation: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    let message: string;

    if (histogram > 0) {
      interpretation = 'BULLISH';
      if (macd > signal && histogram > 0.5) {
        message = `MACD ${macd} di atas Signal ${signal} - Sinyal beli kuat (Bullish Crossover). Momentum positif.`;
      } else {
        message = `MACD ${macd} di atas Signal ${signal} - Momentum bullish, trend naik.`;
      }
    } else if (histogram < 0) {
      interpretation = 'BEARISH';
      if (macd < signal && histogram < -0.5) {
        message = `MACD ${macd} di bawah Signal ${signal} - Sinyal jual kuat (Bearish Crossover). Momentum negatif.`;
      } else {
        message = `MACD ${macd} di bawah Signal ${signal} - Momentum bearish, trend turun.`;
      }
    } else {
      interpretation = 'NEUTRAL';
      message = `MACD ${macd} mendekati Signal ${signal} - Momentum seimbang, potensi perubahan trend.`;
    }

    console.log(`[Technical] MACD calculated: ${macd}, Signal: ${signal}, Histogram: ${histogram} (${interpretation})`);
    return {
      macd,
      signal,
      histogram,
      interpretation,
      message,
    };
  } catch (error: any) {
    console.error('[Technical] MACD calculation error:', error.message);
    return {
      macd: null,
      signal: null,
      histogram: null,
      interpretation: 'NEUTRAL',
      message: 'Terjadi kesalahan saat menghitung MACD',
    };
  }
}

/**
 * Calculate Moving Averages (SMA and EMA) with warnings for insufficient data
 * @param closingPrices - Array of closing prices
 * @returns Moving averages result with Indonesian interpretation
 */
export function calculateMovingAverages(closingPrices: number[]): MAResult {
  console.log(`[Technical] Calculating Moving Averages with ${closingPrices.length} data points`);

  const result: MAResult = {
    sma20: null,
    sma50: null,
    ema20: null,
    message: '',
  };

  const warnings: string[] = [];

  try {
    // Calculate SMA 20
    if (closingPrices.length >= MA_CONFIG.SMA_SHORT) {
      const sma20Values = SMA.calculate({
        values: closingPrices,
        period: MA_CONFIG.SMA_SHORT,
      });
      if (sma20Values.length > 0) {
        result.sma20 = Math.round(sma20Values[sma20Values.length - 1] * 100) / 100;
        console.log(`[Technical] SMA 20: ${result.sma20}`);
      }
    } else {
      warnings.push(`SMA 20 tidak dapat dihitung (data hanya ${closingPrices.length} hari, minimal ${MA_CONFIG.SMA_SHORT})`);
    }

    // Calculate SMA 50 - will likely be unavailable with 30-day data
    if (closingPrices.length >= MA_CONFIG.SMA_LONG) {
      const sma50Values = SMA.calculate({
        values: closingPrices,
        period: MA_CONFIG.SMA_LONG,
      });
      if (sma50Values.length > 0) {
        result.sma50 = Math.round(sma50Values[sma50Values.length - 1] * 100) / 100;
        console.log(`[Technical] SMA 50: ${result.sma50}`);
      }
    } else {
      warnings.push(`SMA 50 tidak dapat dihitung (data hanya ${closingPrices.length} hari, minimal ${MA_CONFIG.SMA_LONG})`);
    }

    // Calculate EMA 20
    if (closingPrices.length >= MA_CONFIG.EMA_SHORT) {
      const ema20Values = EMA.calculate({
        values: closingPrices,
        period: MA_CONFIG.EMA_SHORT,
      });
      if (ema20Values.length > 0) {
        result.ema20 = Math.round(ema20Values[ema20Values.length - 1] * 100) / 100;
        console.log(`[Technical] EMA 20: ${result.ema20}`);
      }
    } else {
      warnings.push(`EMA 20 tidak dapat dihitung (data hanya ${closingPrices.length} hari, minimal ${MA_CONFIG.EMA_SHORT})`);
    }

    // Generate interpretation message
    const currentPrice = closingPrices[closingPrices.length - 1];
    const messageParts: string[] = [];

    if (result.sma20 !== null) {
      if (currentPrice > result.sma20) {
        messageParts.push(`Harga di atas SMA 20 (${result.sma20}) - Trend jangka pendek bullish`);
      } else {
        messageParts.push(`Harga di bawah SMA 20 (${result.sma20}) - Trend jangka pendek bearish`);
      }
    }

    if (result.ema20 !== null) {
      if (currentPrice > result.ema20) {
        messageParts.push(`Harga di atas EMA 20 (${result.ema20}) - Momentum positif`);
      } else {
        messageParts.push(`Harga di bawah EMA 20 (${result.ema20}) - Momentum negatif`);
      }
    }

    if (result.sma50 !== null) {
      if (currentPrice > result.sma50) {
        messageParts.push(`Harga di atas SMA 50 (${result.sma50}) - Trend jangka menengah bullish`);
      } else {
        messageParts.push(`Harga di bawah SMA 50 (${result.sma50}) - Trend jangka menengah bearish`);
      }
    }

    if (messageParts.length > 0) {
      result.message = messageParts.join('. ') + '.';
    } else {
      result.message = 'Moving averages tidak dapat dihitung dengan data yang tersedia.';
    }

    if (warnings.length > 0) {
      result.message += ' ⚠️ ' + warnings.join('. ');
    }

    console.log(`[Technical] Moving Averages calculated with ${warnings.length} warning(s)`);
  } catch (error: any) {
    console.error('[Technical] Moving Averages calculation error:', error.message);
    result.message = 'Terjadi kesalahan saat menghitung Moving Averages';
  }

  return result;
}

/**
 * Calculate Support and Resistance levels from historical data
 * @param closingPrices - Array of closing prices
 * @param currentPrice - Current stock price
 * @returns Support/Resistance result with Indonesian interpretation
 */
export function calculateSupportResistance(closingPrices: number[], currentPrice: number): SRResult {
  console.log(`[Technical] Calculating Support/Resistance with ${closingPrices.length} data points, current price: ${currentPrice}`);

  // Find highest and lowest prices in the period
  const resistance = Math.max(...closingPrices);
  const support = Math.min(...closingPrices);

  // Calculate position relative to S/R levels
  const range = resistance - support;
  const pricePosition = (currentPrice - support) / range;

  // Determine proximity to levels
  let currentPosition: 'NEAR_RESISTANCE' | 'NEAR_SUPPORT' | 'MID_RANGE';
  let message: string;

  const proximityThreshold = SR_CONFIG.PROXIMITY_PERCENT / 100;

  if (pricePosition >= 1 - proximityThreshold) {
    currentPosition = 'NEAR_RESISTANCE';
    message = `Harga saat ini (${currentPrice.toLocaleString('id-ID')}) mendekati Resistance (${resistance.toLocaleString('id-ID')}). Potensi koreksi atau breakout ke atas.`;
  } else if (pricePosition <= proximityThreshold) {
    currentPosition = 'NEAR_SUPPORT';
    message = `Harga saat ini (${currentPrice.toLocaleString('id-ID')}) mendekati Support (${support.toLocaleString('id-ID')}). Potensi rebound atau breakdown ke bawah.`;
  } else {
    currentPosition = 'MID_RANGE';
    const percentFromSupport = Math.round(pricePosition * 100);
    message = `Harga saat ini (${currentPrice.toLocaleString('id-ID')}) berada di tengah range. Support: ${support.toLocaleString('id-ID')}, Resistance: ${resistance.toLocaleString('id-ID')} (${percentFromSupport}% dari bawah).`;
  }

  console.log(`[Technical] S/R: Support=${support}, Resistance=${resistance}, Position=${currentPosition}`);

  return {
    resistance,
    support,
    currentPosition,
    message,
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN ANALYSIS FUNCTION
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Perform complete technical indicator analysis on historical stock data
 * @param symbol - Stock symbol (e.g., 'BBCA')
 * @param historicalData - Raw historical data array from GoAPI
 * @returns Complete technical analysis result
 */
export function analyzeTechnicalIndicators(
  symbol: string,
  historicalData: any[]
): TechnicalIndicatorResult {
  console.log(`[Technical] Starting analysis for ${symbol.toUpperCase()}`);

  const warnings: string[] = [];

  // Parse historical data
  const closingPrices = parseHistoricalData(historicalData);

  if (closingPrices.length === 0) {
    console.error(`[Technical] No valid closing prices for ${symbol}`);
    return {
      symbol: symbol.toUpperCase(),
      dataPoints: 0,
      rsi: {
        value: null,
        interpretation: 'NEUTRAL',
        message: 'Data historis tidak tersedia',
      },
      macd: {
        macd: null,
        signal: null,
        histogram: null,
        interpretation: 'NEUTRAL',
        message: 'Data historis tidak tersedia',
      },
      movingAverages: {
        sma20: null,
        sma50: null,
        ema20: null,
        message: 'Data historis tidak tersedia',
      },
      supportResistance: {
        resistance: 0,
        support: 0,
        currentPosition: 'MID_RANGE',
        message: 'Data historis tidak tersedia',
      },
      warnings: ['Data historis tidak tersedia untuk analisis teknikal'],
    };
  }

  const currentPrice = closingPrices[closingPrices.length - 1];

  // Calculate all indicators
  const rsi = calculateRSI(closingPrices);
  const macd = calculateMACD(closingPrices);
  const movingAverages = calculateMovingAverages(closingPrices);
  const supportResistance = calculateSupportResistance(closingPrices, currentPrice);

  // Collect warnings
  if (rsi.value === null) {
    warnings.push(rsi.message);
  }
  if (macd.macd === null) {
    warnings.push(macd.message);
  }
  if (movingAverages.message.includes('⚠️')) {
    // Extract warning portion
    const warningMatch = movingAverages.message.match(/⚠️\s*(.+)/);
    if (warningMatch) {
      warnings.push(warningMatch[1]);
    }
  }

  console.log(`[Technical] Analysis complete for ${symbol}: ${closingPrices.length} data points, ${warnings.length} warning(s)`);

  return {
    symbol: symbol.toUpperCase(),
    dataPoints: closingPrices.length,
    rsi,
    macd,
    movingAverages,
    supportResistance,
    warnings,
  };
}
