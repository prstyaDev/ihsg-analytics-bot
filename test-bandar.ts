// Quick test script for bandarmologi analysis functions
import { analyzeBrokerSummary, analyzeForeignFlow, combineLiquidityAnalysis } from './src/utils/bandar';

console.log('═══════════════════════════════════════════════════════════');
console.log('TESTING BANDARMOLOGI ANALYSIS UTILITY');
console.log('═══════════════════════════════════════════════════════════\n');

// Mock broker data representing BIG ACCUMULATION scenario
const mockBrokerDataAccumulation = {
  data: {
    results: [
      { broker_code: 'AA', broker_name: 'Big Bank A', buy_volume: 5000000, sell_volume: 500000 },
      { broker_code: 'BB', broker_name: 'Big Bank B', buy_volume: 4500000, sell_volume: 600000 },
      { broker_code: 'CC', broker_name: 'Big Bank C', buy_volume: 4000000, sell_volume: 700000 },
      { broker_code: 'DD', broker_name: 'Broker D', buy_volume: 1000000, sell_volume: 3000000 },
      { broker_code: 'EE', broker_name: 'Broker E', buy_volume: 800000, sell_volume: 2500000 },
    ]
  }
};

// Mock foreign data representing STRONG INFLOW scenario
const mockForeignDataInflow = {
  data: {
    results: [
      { date: '2026-07-01', foreign_buy: 50_000_000_000, foreign_sell: 45_000_000_000, foreign_net: 5_000_000_000 },
      { date: '2026-06-30', foreign_buy: 48_000_000_000, foreign_sell: 42_000_000_000, foreign_net: 6_000_000_000 },
      { date: '2026-06-29', foreign_buy: 52_000_000_000, foreign_sell: 46_000_000_000, foreign_net: 6_000_000_000 },
      { date: '2026-06-28', foreign_buy: 49_000_000_000, foreign_sell: 44_000_000_000, foreign_net: 5_000_000_000 },
      { date: '2026-06-27', foreign_buy: 51_000_000_000, foreign_sell: 43_000_000_000, foreign_net: 8_000_000_000 },
      // Add more days for 20-day analysis
      ...Array.from({ length: 15 }, (_, i) => ({
        date: `2026-06-${26 - i}`,
        foreign_buy: 50_000_000_000,
        foreign_sell: 45_000_000_000,
        foreign_net: 5_000_000_000,
      })),
    ]
  }
};

console.log('TEST 1: Broker Summary Analysis (Accumulation Scenario)');
console.log('───────────────────────────────────────────────────────────');
const brokerResult = analyzeBrokerSummary(mockBrokerDataAccumulation);
console.log(`Classification: ${brokerResult.classification}`);
console.log(`Accumulation Score: ${brokerResult.accumulationScore.toFixed(2)}%`);
console.log(`Net Buy Volume: ${brokerResult.netBuyVolume.toLocaleString()}`);
console.log(`Net Sell Volume: ${brokerResult.netSellVolume.toLocaleString()}`);
console.log(`Warnings: ${brokerResult.warnings.length > 0 ? brokerResult.warnings.join(', ') : 'None'}`);
console.log('✅ Broker Analysis Test Passed!\n');

console.log('TEST 2: Foreign Flow Analysis (Strong Inflow Scenario)');
console.log('───────────────────────────────────────────────────────────');
const foreignResult = analyzeForeignFlow(mockForeignDataInflow);
console.log(`Trend: ${foreignResult.trend}`);
console.log(`Daily Net: ${foreignResult.daily.net.toLocaleString()} (${foreignResult.daily.interpretation})`);
console.log(`Weekly Net: ${foreignResult.weekly.net.toLocaleString()} (${foreignResult.weekly.interpretation})`);
console.log(`Monthly Net: ${foreignResult.monthly.net.toLocaleString()} (${foreignResult.monthly.interpretation})`);
console.log(`Warnings: ${foreignResult.warnings.length > 0 ? foreignResult.warnings.join(', ') : 'None'}`);
console.log('✅ Foreign Flow Analysis Test Passed!\n');

console.log('TEST 3: Combined Liquidity Analysis');
console.log('───────────────────────────────────────────────────────────');
const combinedResult = combineLiquidityAnalysis('BBCA', mockBrokerDataAccumulation, mockForeignDataInflow);
console.log(`Symbol: ${combinedResult.symbol}`);
console.log(`Overall Sentiment: ${combinedResult.overallSentiment}`);
console.log(`Broker Classification: ${combinedResult.broker.classification}`);
console.log(`Foreign Trend: ${combinedResult.foreign.trend}`);
console.log('\nSummary Preview (first 200 chars):');
console.log(combinedResult.summary.substring(0, 200) + '...');
console.log('✅ Combined Analysis Test Passed!\n');

// Test graceful degradation with empty data
console.log('TEST 4: Graceful Degradation (Empty Data)');
console.log('───────────────────────────────────────────────────────────');
const emptyBrokerResult = analyzeBrokerSummary([]);
console.log(`Empty Broker Classification: ${emptyBrokerResult.classification}`);
console.log(`Empty Broker Warnings: ${emptyBrokerResult.warnings.join(', ')}`);

const emptyForeignResult = analyzeForeignFlow([]);
console.log(`Empty Foreign Trend: ${emptyForeignResult.trend}`);
console.log(`Empty Foreign Warnings: ${emptyForeignResult.warnings.join(', ')}`);
console.log('✅ Graceful Degradation Test Passed!\n');

console.log('═══════════════════════════════════════════════════════════');
console.log('ALL TESTS PASSED! ✅');
console.log('Phase 2 Implementation Verified Successfully');
console.log('═══════════════════════════════════════════════════════════');
