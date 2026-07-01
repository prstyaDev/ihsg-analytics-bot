// ════════════════════════════════════════════════════════════════════════════════
// BANDARMOLOGI & FOREIGN FLOW ANALYSIS UTILITY
// ════════════════════════════════════════════════════════════════════════════════
// Quantitative analysis engine for market maker detection and foreign capital tracking
// Provides institutional trading pattern classification and liquidity flow interpretation

// ════════════════════════════════════════════════════════════════════════════════
// TYPESCRIPT INTERFACES
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Individual broker trading data
 */
export interface BrokerData {
  broker_code: string;
  broker_name?: string;
  buy_volume?: number;
  sell_volume?: number;
  buy_value?: number;
  sell_value?: number;
  buy_frequency?: number;
  sell_frequency?: number;
}

/**
 * Broker summary analysis result
 */
export interface BrokerAnalysisResult {
  classification: 'BIG_ACCUMULATION' | 'BIG_DISTRIBUTION' | 'NEUTRAL';
  topBuyers: BrokerData[];
  topSellers: BrokerData[];
  netBuyVolume: number;
  netSellVolume: number;
  accumulationScore: number; // Percentage (0-100)
  message: string;
  warnings: string[];
}

/**
 * Foreign flow data for a specific period
 */
export interface ForeignFlowData {
  date?: string;
  foreign_buy?: number;
  foreign_sell?: number;
  foreign_net?: number;
}

/**
 * Foreign flow analysis result
 */
export interface ForeignFlowResult {
  daily: {
    net: number;
    interpretation: 'INFLOW' | 'OUTFLOW' | 'NEUTRAL';
  };
  weekly: {
    net: number;
    interpretation: 'INFLOW' | 'OUTFLOW' | 'NEUTRAL';
  };
  monthly: {
    net: number;
    interpretation: 'INFLOW' | 'OUTFLOW' | 'NEUTRAL';
  };
  trend: 'STRONG_INFLOW' | 'MODERATE_INFLOW' | 'NEUTRAL' | 'MODERATE_OUTFLOW' | 'STRONG_OUTFLOW';
  message: string;
  warnings: string[];
}

/**
 * Combined liquidity flow analysis (Broker + Foreign)
 */
export interface LiquidityFlowAnalysis {
  symbol: string;
  date: string;
  broker: BrokerAnalysisResult;
  foreign: ForeignFlowResult;
  overallSentiment: 'VERY_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'VERY_BEARISH';
  summary: string;
}

// ════════════════════════════════════════════════════════════════════════════════
// CONFIGURATION CONSTANTS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Broker analysis thresholds
 */
const BROKER_CONFIG = {
  TOP_COUNT: 3, // Number of top brokers to analyze
  ACCUMULATION_THRESHOLD: 55, // Percentage for BIG_ACCUMULATION classification
  DISTRIBUTION_THRESHOLD: 55, // Percentage for BIG_DISTRIBUTION classification
  MIN_VOLUME_THRESHOLD: 1000000, // Minimum volume to consider (1M shares)
};

/**
 * Foreign flow thresholds (in Rupiah)
 */
const FOREIGN_CONFIG = {
  DAILY_THRESHOLD: 1_000_000_000, // 1 billion IDR
  WEEKLY_THRESHOLD: 5_000_000_000, // 5 billion IDR
  MONTHLY_THRESHOLD: 10_000_000_000, // 10 billion IDR
  STRONG_THRESHOLD_MULTIPLIER: 2, // 2x threshold for "STRONG" classification
};

// ════════════════════════════════════════════════════════════════════════════════
// BROKER SUMMARY ANALYSIS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Analyze broker trading patterns to detect accumulation or distribution
 * Classification based on Top 3 broker net position relative to total volume
 * 
 * @param rawData - Raw broker data from GoAPI
 * @returns Broker analysis with classification and interpretation
 */
export function analyzeBrokerSummary(rawData: any): BrokerAnalysisResult {
  const warnings: string[] = [];
  
  console.log('[Bandar Engine] Starting broker summary analysis...');
  
  // Defensive parsing: Extract broker array from various possible structures
  let brokerArray: any[] = [];
  
  if (Array.isArray(rawData)) {
    brokerArray = rawData;
  } else if (rawData?.data?.results) {
    brokerArray = rawData.data.results;
  } else if (rawData?.data) {
    brokerArray = Array.isArray(rawData.data) ? rawData.data : [];
  } else if (rawData?.results) {
    brokerArray = rawData.results;
  }
  
  console.log(`[Bandar Engine] Parsed ${brokerArray.length} broker records`);
  
  // Graceful degradation: Return NEUTRAL if no data
  if (!Array.isArray(brokerArray) || brokerArray.length === 0) {
    console.warn('[Bandar Engine] No broker data available - returning NEUTRAL');
    warnings.push('Data broker tidak tersedia atau kosong');
    
    return {
      classification: 'NEUTRAL',
      topBuyers: [],
      topSellers: [],
      netBuyVolume: 0,
      netSellVolume: 0,
      accumulationScore: 50,
      message: 'Data broker tidak tersedia untuk analisis bandarmologi.',
      warnings,
    };
  }
  
  // Parse and normalize broker data
  const parsedBrokers: BrokerData[] = brokerArray.map((broker) => ({
    broker_code: broker.broker_code || broker.code || 'UNKNOWN',
    broker_name: broker.broker_name || broker.name || '',
    buy_volume: Number(broker.buy_volume || broker.buyVolume || 0),
    sell_volume: Number(broker.sell_volume || broker.sellVolume || 0),
    buy_value: Number(broker.buy_value || broker.buyValue || 0),
    sell_value: Number(broker.sell_value || broker.sellValue || 0),
    buy_frequency: Number(broker.buy_frequency || broker.buyFrequency || 0),
    sell_frequency: Number(broker.sell_frequency || broker.sellFrequency || 0),
  }));
  
  // Sort brokers by buy volume (descending)
  const topBuyers = [...parsedBrokers]
    .sort((a, b) => (b.buy_volume || 0) - (a.buy_volume || 0))
    .slice(0, BROKER_CONFIG.TOP_COUNT);
  
  // Sort brokers by sell volume (descending)
  const topSellers = [...parsedBrokers]
    .sort((a, b) => (b.sell_volume || 0) - (a.sell_volume || 0))
    .slice(0, BROKER_CONFIG.TOP_COUNT);
  
  console.log(`[Bandar Engine] Top ${BROKER_CONFIG.TOP_COUNT} buyers:`, 
    topBuyers.map(b => `${b.broker_code}(${b.buy_volume})`).join(', '));
  console.log(`[Bandar Engine] Top ${BROKER_CONFIG.TOP_COUNT} sellers:`, 
    topSellers.map(b => `${b.broker_code}(${b.sell_volume})`).join(', '));
  
  // Calculate total volumes for top brokers
  const topBuyVolume = topBuyers.reduce((sum, b) => sum + (b.buy_volume || 0), 0);
  const topSellVolume = topSellers.reduce((sum, b) => sum + (b.sell_volume || 0), 0);
  const combinedTopVolume = topBuyVolume + topSellVolume;
  
  console.log(`[Bandar Engine] Top buy volume: ${topBuyVolume}, Top sell volume: ${topSellVolume}`);
  
  // Calculate accumulation score (0-100, where 100 = pure accumulation)
  let accumulationScore = 50; // Default neutral
  if (combinedTopVolume > 0) {
    accumulationScore = (topBuyVolume / combinedTopVolume) * 100;
  }
  
  console.log(`[Bandar Engine] Accumulation score: ${accumulationScore.toFixed(2)}%`);
  
  // Classify based on accumulation score
  let classification: 'BIG_ACCUMULATION' | 'BIG_DISTRIBUTION' | 'NEUTRAL' = 'NEUTRAL';
  
  if (accumulationScore >= BROKER_CONFIG.ACCUMULATION_THRESHOLD) {
    classification = 'BIG_ACCUMULATION';
  } else if (accumulationScore <= (100 - BROKER_CONFIG.DISTRIBUTION_THRESHOLD)) {
    classification = 'BIG_DISTRIBUTION';
  }
  
  console.log(`[Bandar Engine] Classification: ${classification}`);
  
  // Generate Indonesian interpretation message
  let message = '';
  
  switch (classification) {
    case 'BIG_ACCUMULATION':
      message = `🟢 **AKUMULASI KUAT** terdeteksi!\n\n` +
        `Top ${BROKER_CONFIG.TOP_COUNT} broker pembeli mendominasi dengan ${accumulationScore.toFixed(1)}% dari total volume aktif. ` +
        `Ini mengindikasikan bandar atau institusi besar sedang mengumpulkan saham secara agresif.\n\n` +
        `**Top Buyers:**\n` +
        topBuyers.map((b, i) => 
          `${i + 1}. ${b.broker_code}${b.broker_name ? ` (${b.broker_name})` : ''} - ` +
          `Volume Buy: ${(b.buy_volume || 0).toLocaleString('id-ID')} lot`
        ).join('\n');
      break;
      
    case 'BIG_DISTRIBUTION':
      message = `🔴 **DISTRIBUSI KUAT** terdeteksi!\n\n` +
        `Top ${BROKER_CONFIG.TOP_COUNT} broker penjual mendominasi dengan ${(100 - accumulationScore).toFixed(1)}% dari total volume aktif. ` +
        `Ini mengindikasikan bandar atau institusi besar sedang melepas saham secara masif.\n\n` +
        `**Top Sellers:**\n` +
        topSellers.map((b, i) => 
          `${i + 1}. ${b.broker_code}${b.broker_name ? ` (${b.broker_name})` : ''} - ` +
          `Volume Sell: ${(b.sell_volume || 0).toLocaleString('id-ID')} lot`
        ).join('\n');
      break;
      
    case 'NEUTRAL':
      message = `⚪ **NETRAL** - Tidak ada pola akumulasi atau distribusi yang signifikan.\n\n` +
        `Volume buy dan sell dari top broker relatif seimbang (${accumulationScore.toFixed(1)}% vs ${(100 - accumulationScore).toFixed(1)}%). ` +
        `Pasar sedang dalam kondisi wait-and-see atau konsolidasi.`;
      break;
  }
  
  // Add warning if total volume is suspiciously low
  if (combinedTopVolume < BROKER_CONFIG.MIN_VOLUME_THRESHOLD) {
    warnings.push('Volume trading rendah - hasil analisis mungkin kurang reliable');
  }
  
  return {
    classification,
    topBuyers,
    topSellers,
    netBuyVolume: topBuyVolume,
    netSellVolume: topSellVolume,
    accumulationScore,
    message,
    warnings,
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// FOREIGN FLOW ANALYSIS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Analyze foreign capital flow patterns across multiple timeframes
 * Tracks net foreign position for 1-day, 5-day, and 20-day periods
 * 
 * @param rawData - Raw foreign flow data from GoAPI
 * @returns Foreign flow analysis with trend interpretation
 */
export function analyzeForeignFlow(rawData: any): ForeignFlowResult {
  const warnings: string[] = [];
  
  console.log('[Bandar Engine] Starting foreign flow analysis...');
  
  // Defensive parsing: Extract foreign flow array
  let flowArray: any[] = [];
  
  if (Array.isArray(rawData)) {
    flowArray = rawData;
  } else if (rawData?.data?.results) {
    flowArray = rawData.data.results;
  } else if (rawData?.data) {
    flowArray = Array.isArray(rawData.data) ? rawData.data : [];
  } else if (rawData?.results) {
    flowArray = rawData.results;
  }
  
  console.log(`[Bandar Engine] Parsed ${flowArray.length} foreign flow records`);
  
  // Graceful degradation: Return NEUTRAL if no data
  if (!Array.isArray(flowArray) || flowArray.length === 0) {
    console.warn('[Bandar Engine] No foreign flow data available - returning NEUTRAL');
    warnings.push('Data foreign flow tidak tersedia');
    
    return {
      daily: { net: 0, interpretation: 'NEUTRAL' },
      weekly: { net: 0, interpretation: 'NEUTRAL' },
      monthly: { net: 0, interpretation: 'NEUTRAL' },
      trend: 'NEUTRAL',
      message: 'Data foreign flow tidak tersedia untuk analisis.',
      warnings,
    };
  }
  
  // Parse and sort by date (most recent first)
  const parsedFlow: ForeignFlowData[] = flowArray
    .map((flow) => ({
      date: flow.date || flow.trading_date || '',
      foreign_buy: Number(flow.foreign_buy || flow.foreignBuy || 0),
      foreign_sell: Number(flow.foreign_sell || flow.foreignSell || 0),
      foreign_net: Number(flow.foreign_net || flow.foreignNet || 
        ((flow.foreign_buy || 0) - (flow.foreign_sell || 0))),
    }))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  
  console.log(`[Bandar Engine] Sorted ${parsedFlow.length} flow records by date`);
  
  // Helper function to interpret net flow
  const interpretFlow = (net: number, threshold: number): 'INFLOW' | 'OUTFLOW' | 'NEUTRAL' => {
    if (net > threshold) return 'INFLOW';
    if (net < -threshold) return 'OUTFLOW';
    return 'NEUTRAL';
  };
  
  // Calculate 1-day (most recent)
  const dailyNet = parsedFlow[0]?.foreign_net || 0;
  const dailyInterpretation = interpretFlow(dailyNet, FOREIGN_CONFIG.DAILY_THRESHOLD);
  
  console.log(`[Bandar Engine] Daily net: ${dailyNet} (${dailyInterpretation})`);
  
  // Calculate 5-day cumulative (last 5 trading days)
  const weeklyData = parsedFlow.slice(0, 5);
  const weeklyNet = weeklyData.reduce((sum, flow) => sum + (flow.foreign_net || 0), 0);
  const weeklyInterpretation = interpretFlow(weeklyNet, FOREIGN_CONFIG.WEEKLY_THRESHOLD);
  
  console.log(`[Bandar Engine] Weekly net (5 days): ${weeklyNet} (${weeklyInterpretation})`);
  
  // Calculate 20-day cumulative (last 20 trading days)
  const monthlyData = parsedFlow.slice(0, 20);
  const monthlyNet = monthlyData.reduce((sum, flow) => sum + (flow.foreign_net || 0), 0);
  const monthlyInterpretation = interpretFlow(monthlyNet, FOREIGN_CONFIG.MONTHLY_THRESHOLD);
  
  console.log(`[Bandar Engine] Monthly net (20 days): ${monthlyNet} (${monthlyInterpretation})`);
  
  // Determine overall trend based on timeframe alignment
  let trend: 'STRONG_INFLOW' | 'MODERATE_INFLOW' | 'NEUTRAL' | 'MODERATE_OUTFLOW' | 'STRONG_OUTFLOW' = 'NEUTRAL';
  
  // Strong trend: All 3 timeframes aligned + monthly exceeds strong threshold
  if (dailyInterpretation === 'INFLOW' && weeklyInterpretation === 'INFLOW' && monthlyInterpretation === 'INFLOW') {
    trend = monthlyNet > (FOREIGN_CONFIG.MONTHLY_THRESHOLD * FOREIGN_CONFIG.STRONG_THRESHOLD_MULTIPLIER)
      ? 'STRONG_INFLOW'
      : 'MODERATE_INFLOW';
  } else if (dailyInterpretation === 'OUTFLOW' && weeklyInterpretation === 'OUTFLOW' && monthlyInterpretation === 'OUTFLOW') {
    trend = monthlyNet < -(FOREIGN_CONFIG.MONTHLY_THRESHOLD * FOREIGN_CONFIG.STRONG_THRESHOLD_MULTIPLIER)
      ? 'STRONG_OUTFLOW'
      : 'MODERATE_OUTFLOW';
  } else if (weeklyInterpretation === 'INFLOW' || monthlyInterpretation === 'INFLOW') {
    trend = 'MODERATE_INFLOW';
  } else if (weeklyInterpretation === 'OUTFLOW' || monthlyInterpretation === 'OUTFLOW') {
    trend = 'MODERATE_OUTFLOW';
  }
  
  console.log(`[Bandar Engine] Overall trend: ${trend}`);
  
  // Generate Indonesian interpretation message
  let message = '';
  
  switch (trend) {
    case 'STRONG_INFLOW':
      message = `🟢 **FOREIGN BUYING SANGAT KUAT!**\n\n` +
        `Investor asing melakukan akumulasi konsisten di semua timeframe:\n` +
        `• Harian: Rp ${dailyNet.toLocaleString('id-ID')} (${dailyNet > 0 ? 'Net Buy' : 'Net Sell'})\n` +
        `• Mingguan (5 hari): Rp ${weeklyNet.toLocaleString('id-ID')} (Net Buy)\n` +
        `• Bulanan (20 hari): Rp ${monthlyNet.toLocaleString('id-ID')} (Net Buy)\n\n` +
        `Ini adalah sinyal bullish yang sangat kuat - asing sedang mengumpulkan posisi besar secara agresif.`;
      break;
      
    case 'MODERATE_INFLOW':
      message = `🟢 **FOREIGN BUYING MODERAT**\n\n` +
        `Investor asing menunjukkan minat beli yang positif:\n` +
        `• Harian: Rp ${dailyNet.toLocaleString('id-ID')}\n` +
        `• Mingguan (5 hari): Rp ${weeklyNet.toLocaleString('id-ID')}\n` +
        `• Bulanan (20 hari): Rp ${monthlyNet.toLocaleString('id-ID')}\n\n` +
        `Tren positif terlihat di beberapa timeframe - asing mulai masuk secara bertahap.`;
      break;
      
    case 'STRONG_OUTFLOW':
      message = `🔴 **FOREIGN SELLING SANGAT KUAT!**\n\n` +
        `Investor asing melakukan distribusi konsisten di semua timeframe:\n` +
        `• Harian: Rp ${dailyNet.toLocaleString('id-ID')} (Net Sell)\n` +
        `• Mingguan (5 hari): Rp ${weeklyNet.toLocaleString('id-ID')} (Net Sell)\n` +
        `• Bulanan (20 hari): Rp ${monthlyNet.toLocaleString('id-ID')} (Net Sell)\n\n` +
        `Ini adalah sinyal bearish yang kuat - asing sedang melepas posisi secara masif.`;
      break;
      
    case 'MODERATE_OUTFLOW':
      message = `🔴 **FOREIGN SELLING MODERAT**\n\n` +
        `Investor asing menunjukkan tekanan jual:\n` +
        `• Harian: Rp ${dailyNet.toLocaleString('id-ID')}\n` +
        `• Mingguan (5 hari): Rp ${weeklyNet.toLocaleString('id-ID')}\n` +
        `• Bulanan (20 hari): Rp ${monthlyNet.toLocaleString('id-ID')}\n\n` +
        `Tren negatif terlihat di beberapa timeframe - asing mulai keluar secara bertahap.`;
      break;
      
    case 'NEUTRAL':
      message = `⚪ **FOREIGN FLOW NETRAL**\n\n` +
        `Aktivitas investor asing tidak menunjukkan tren yang jelas:\n` +
        `• Harian: Rp ${dailyNet.toLocaleString('id-ID')}\n` +
        `• Mingguan (5 hari): Rp ${weeklyNet.toLocaleString('id-ID')}\n` +
        `• Bulanan (20 hari): Rp ${monthlyNet.toLocaleString('id-ID')}\n\n` +
        `Asing sedang wait-and-see atau melakukan rotasi sektor.`;
      break;
  }
  
  // Add warning if data is insufficient
  if (parsedFlow.length < 5) {
    warnings.push('Data kurang dari 5 hari - analisis weekly/monthly mungkin tidak akurat');
  }
  if (parsedFlow.length < 20) {
    warnings.push('Data kurang dari 20 hari - analisis monthly mungkin tidak lengkap');
  }
  
  return {
    daily: { net: dailyNet, interpretation: dailyInterpretation },
    weekly: { net: weeklyNet, interpretation: weeklyInterpretation },
    monthly: { net: monthlyNet, interpretation: monthlyInterpretation },
    trend,
    message,
    warnings,
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// COMBINED LIQUIDITY ANALYSIS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Combine broker summary and foreign flow analyses into unified liquidity assessment
 * Provides overall market sentiment based on institutional trading patterns
 * 
 * @param symbol - Stock symbol
 * @param brokerData - Raw broker data from GoAPI
 * @param foreignData - Raw foreign flow data from GoAPI
 * @returns Combined liquidity flow analysis with overall sentiment
 */
export function combineLiquidityAnalysis(
  symbol: string,
  brokerData: any,
  foreignData: any
): LiquidityFlowAnalysis {
  console.log(`[Bandar Engine] Combining liquidity analysis for ${symbol}`);
  
  const broker = analyzeBrokerSummary(brokerData);
  const foreign = analyzeForeignFlow(foreignData);
  
  // Determine overall sentiment by combining both analyses
  let overallSentiment: 'VERY_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'VERY_BEARISH' = 'NEUTRAL';
  
  // Scoring system: -2 to +2 for each factor
  let sentimentScore = 0;
  
  // Broker classification scoring
  if (broker.classification === 'BIG_ACCUMULATION') {
    sentimentScore += 2;
  } else if (broker.classification === 'BIG_DISTRIBUTION') {
    sentimentScore -= 2;
  }
  
  // Foreign flow trend scoring
  if (foreign.trend === 'STRONG_INFLOW') {
    sentimentScore += 2;
  } else if (foreign.trend === 'MODERATE_INFLOW') {
    sentimentScore += 1;
  } else if (foreign.trend === 'MODERATE_OUTFLOW') {
    sentimentScore -= 1;
  } else if (foreign.trend === 'STRONG_OUTFLOW') {
    sentimentScore -= 2;
  }
  
  console.log(`[Bandar Engine] Sentiment score: ${sentimentScore}`);
  
  // Map score to sentiment
  if (sentimentScore >= 3) {
    overallSentiment = 'VERY_BULLISH';
  } else if (sentimentScore >= 1) {
    overallSentiment = 'BULLISH';
  } else if (sentimentScore <= -3) {
    overallSentiment = 'VERY_BEARISH';
  } else if (sentimentScore <= -1) {
    overallSentiment = 'BEARISH';
  }
  
  console.log(`[Bandar Engine] Overall sentiment: ${overallSentiment}`);
  
  // Generate comprehensive summary
  let summary = `📊 **ANALISIS LIQUIDITY FLOW - ${symbol}**\n\n`;
  
  summary += `**SENTIMEN INSTITUSIONAL: ${overallSentiment}**\n\n`;
  
  summary += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  summary += `🏦 **BANDARMOLOGI (Broker Summary)**\n`;
  summary += `${broker.message}\n\n`;
  
  if (broker.warnings.length > 0) {
    summary += `⚠️ Catatan Broker:\n${broker.warnings.map(w => `• ${w}`).join('\n')}\n\n`;
  }
  
  summary += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  summary += `🌍 **FOREIGN FLOW (Asing)**\n`;
  summary += `${foreign.message}\n\n`;
  
  if (foreign.warnings.length > 0) {
    summary += `⚠️ Catatan Foreign:\n${foreign.warnings.map(w => `• ${w}`).join('\n')}\n\n`;
  }
  
  summary += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  summary += `💡 **KESIMPULAN**\n`;
  
  switch (overallSentiment) {
    case 'VERY_BULLISH':
      summary += `✅ Sinyal SANGAT BULLISH! Baik bandar lokal maupun asing sedang mengakumulasi saham ini secara agresif. ` +
        `Ini adalah indikasi kuat bahwa institusi besar percaya pada prospek jangka menengah-panjang saham ini.`;
      break;
      
    case 'BULLISH':
      summary += `✅ Sinyal BULLISH. Ada indikasi positif dari aktivitas institusional, meskipun tidak semua indikator sejalan. ` +
        `Ini bisa menjadi peluang entry yang baik jika didukung oleh analisis fundamental dan teknikal.`;
      break;
      
    case 'BEARISH':
      summary += `⚠️ Sinyal BEARISH. Ada tekanan jual dari institusi yang perlu diwaspadai. ` +
        `Sebaiknya hindari averaging down dan tunggu konfirmasi reversal sebelum entry.`;
      break;
      
    case 'VERY_BEARISH':
      summary += `🚨 Sinyal SANGAT BEARISH! Baik bandar lokal maupun asing sedang melakukan distribusi masif. ` +
        `Ini adalah red flag serius - hindari saham ini atau pertimbangkan cut loss jika sudah hold.`;
      break;
      
    case 'NEUTRAL':
      summary += `⚪ Sinyal NETRAL. Tidak ada pola institusional yang jelas saat ini. ` +
        `Saham sedang dalam fase konsolidasi atau wait-and-see. Tunggu katalyst atau konfirmasi tren sebelum action.`;
      break;
  }
  
  const currentDate = new Date().toISOString().split('T')[0];
  
  return {
    symbol,
    date: currentDate,
    broker,
    foreign,
    overallSentiment,
    summary,
  };
}
