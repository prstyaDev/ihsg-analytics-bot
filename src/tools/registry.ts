import axios from 'axios';
import { tool } from 'ai';
import { z } from 'zod';
import NodeCache from 'node-cache';
import { env } from '../config/env';
import { 
  checkWatchlistExists, 
  addToWatchlist, 
  getWatchlist, 
  removeFromWatchlist,
  checkPortfolioExists,
  addToPortfolio,
  updatePortfolio,
  getPortfolio,
  removeFromPortfolio
} from '../db';

const api = axios.create({
  baseURL: 'https://api.goapi.io',
  headers: {
    'X-API-KEY': env.GOAPI_KEY,
    'Accept': 'application/json'
  },
  timeout: 120000
});

const cache = new NodeCache({ stdTTL: 60, checkperiod: 30 });

function getDateRange(daysBack: number) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - daysBack);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { dateFrom: fmt(from), dateTo: fmt(to) };
}

// ────────────────────────────────────────────────────────────────────────────────
// 1. GET STOCK PRICE
// ────────────────────────────────────────────────────────────────────────────────
export const getPrice = tool({
  description:
    'Mendapatkan harga saham terkini berdasarkan kode emiten 4 huruf di BEI (Bursa Efek Indonesia). ' +
    'Gunakan tool ini ketika pengguna menanyakan harga, pergerakan, atau data real-time suatu saham. ' +
    'Contoh kode emiten: BBCA, BBRI, TLKM, ASII.',
  inputSchema: z.object({
    symbol: z
      .string()
      .describe('Kode emiten saham 4 huruf di BEI, contoh: BBCA, BBRI, TLKM')
  }),
  execute: async ({ symbol }) => {
    try {
      const sym = symbol.toUpperCase();
      const cacheKey = `prices_${sym}`;
      const cached = cache.get<string>(cacheKey);
      if (cached) {
        console.log(`[Cache HIT] ${cacheKey}`);
        return cached;
      }
      console.log(`[Cache MISS] Fetching new data for: ${cacheKey}`);
      const { data } = await api.get('/stock/idx/prices', {
        params: { symbols: sym }
      });
      console.log('[GoAPI get_stock_price]:', JSON.stringify(data, null, 2));
      const result = data?.data?.results?.[0] || data?.data || data;
      const closePrice = result?.close ?? result?.price ?? 'Tidak diketahui';
      const high = result?.high ?? '-';
      const low = result?.low ?? '-';
      const open = result?.open ?? '-';
      const volume = result?.volume ?? '-';
      const change = result?.change ?? '-';
      const changePct = result?.change_pct ?? '-';
      const output = `[SYSTEM DATA] Emiten: ${sym}, Harga Terakhir: ${closePrice}, Open: ${open}, High: ${high}, Low: ${low}, Volume: ${volume}, Perubahan: ${change} (${changePct}%). Tolong berikan analisa teknikal singkat berdasarkan angka-angka ini.`;
      cache.set(cacheKey, output);
      return output;
    } catch (err: any) {
      console.error('[get_stock_price Error]:', err?.response?.status, err?.response?.data || err?.message);
      return '[SYSTEM ERROR] Data emiten gagal ditarik dari bursa';
    }
  }
});

// ────────────────────────────────────────────────────────────────────────────────
// 2. GET MARKET SUMMARY
// ────────────────────────────────────────────────────────────────────────────────
export const getMarketSummary = tool({
  description:
    'Mendapatkan ringkasan pasar saham IHSG dan daftar saham yang sedang trending hari ini. ' +
    'Gunakan tool ini ketika pengguna bertanya tentang kondisi pasar secara umum, ' +
    'misalnya: "bagaimana IHSG hari ini?", "pasar lagi naik atau turun?", "saham apa yang lagi trending?".',
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const cacheKey = 'market_summary';
      const cached = cache.get<string>(cacheKey);
      if (cached) {
        console.log(`[Cache HIT] ${cacheKey}`);
        return cached;
      }
      console.log(`[Cache MISS] Fetching new data for: ${cacheKey}`);
      const { data } = await api.get('/stock/idx/trending');
      console.log('[GoAPI get_market_summary]:', JSON.stringify(data, null, 2));
      const output = `[SYSTEM DATA - MARKET SUMMARY]\n${JSON.stringify(data, null, 2)}\nBerikan ringkasan kondisi pasar berdasarkan data di atas.`;
      cache.set(cacheKey, output);
      return output;
    } catch (err: any) {
      console.error('[get_market_summary Error]:', err?.response?.status, err?.response?.data || err?.message);
      return '[SYSTEM ERROR] Gagal mengambil data ringkasan pasar IHSG';
    }
  }
});

// ────────────────────────────────────────────────────────────────────────────────
// 3. GET TOP MOVERS
// ────────────────────────────────────────────────────────────────────────────────
export const getTopMovers = tool({
  description:
    'Mendapatkan daftar saham Top Gainer (naik tertinggi) dan Top Loser (turun terdalam) hari ini di bursa IDX. ' +
    'Gunakan tool ini ketika pengguna bertanya tentang saham yang naik/turun paling banyak, ' +
    'misalnya: "saham apa yang naik paling tinggi?", "top gainer hari ini?", "saham apa yang anjlok?", "top loser?".',
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const cacheKey = 'top_movers';
      const cached = cache.get<string>(cacheKey);
      if (cached) {
        console.log(`[Cache HIT] ${cacheKey}`);
        return cached;
      }
      console.log(`[Cache MISS] Fetching new data for: ${cacheKey}`);
      console.log(`[GoAPI get_top_movers] Memulai fetch data gainers...`);
      const gainers = await api.get('/stock/idx/top_gainer');
      console.log(`[GoAPI get_top_movers] Berhasil fetch gainers.`);
      
      console.log(`[GoAPI get_top_movers] Memulai fetch data losers...`);
      const losers = await api.get('/stock/idx/top_loser');
      console.log(`[GoAPI get_top_movers] Berhasil fetch losers.`);

      // Optimasi: Ambil hanya 10 data teratas agar payload tidak membebani LLM (timeout prevention)
      const extractData = (res: any) => {
        const raw = res?.data?.data?.results || res?.data?.data || res?.data || [];
        return Array.isArray(raw) ? raw.slice(0, 10) : raw;
      };
      
      const limitedGainers = extractData(gainers);
      const limitedLosers = extractData(losers);

      console.log('[GoAPI get_top_movers] Limited Gainers:', JSON.stringify(limitedGainers, null, 2));
      console.log('[GoAPI get_top_movers] Limited Losers:', JSON.stringify(limitedLosers, null, 2));

      const output =
        `[SYSTEM DATA - TOP MOVERS]\n` +
        `🟢 TOP GAINERS (Top 10):\n${JSON.stringify(limitedGainers, null, 2)}\n\n` +
        `🔴 TOP LOSERS (Top 10):\n${JSON.stringify(limitedLosers, null, 2)}\n\n` +
        `Berikan ringkasan saham-saham yang mengalami pergerakan signifikan hari ini.`;
      cache.set(cacheKey, output);
      return output;
    } catch (err: any) {
      console.error('[get_top_movers Error]:', err?.response?.status, err?.response?.data || err?.message);
      return '[SYSTEM ERROR] Gagal mengambil data top gainers/losers';
    }
  }
});

// ────────────────────────────────────────────────────────────────────────────────
// 4. COMPARE EMITEN
// ────────────────────────────────────────────────────────────────────────────────
export const compareEmiten = tool({
  description:
    'Membandingkan dua saham berdasarkan harga, volume, dan metrik dasar lainnya secara berdampingan. ' +
    'Gunakan tool ini ketika pengguna ingin membandingkan dua emiten secara langsung. ' +
    'Contoh pertanyaan: "bandingkan BBCA vs BBRI", "mending TLKM atau ISAT?", "compare ASII dan UNTR".',
  inputSchema: z.object({
    symbol1: z
      .string()
      .describe('Kode emiten saham pertama (4 huruf), contoh: BBCA'),
    symbol2: z
      .string()
      .describe('Kode emiten saham kedua (4 huruf) untuk dibandingkan, contoh: BBRI')
  }),
  execute: async ({ symbol1, symbol2 }) => {
    try {
      const s1 = symbol1.toUpperCase();
      const s2 = symbol2.toUpperCase();
      const sorted = [s1, s2].sort();
      const cacheKey = `compare_${sorted[0]}_${sorted[1]}`;
      const cached = cache.get<string>(cacheKey);
      if (cached) {
        console.log(`[Cache HIT] ${cacheKey}`);
        return cached;
      }
      console.log(`[Cache MISS] Fetching new data for: ${cacheKey}`);
      const { data } = await api.get('/stock/idx/prices', {
        params: { symbols: `${s1},${s2}` }
      });
      console.log('[GoAPI compare_emiten]:', JSON.stringify(data, null, 2));
      const output =
        `[SYSTEM DATA - PERBANDINGAN EMITEN] ${s1} vs ${s2}\n` +
        `${JSON.stringify(data, null, 2)}\n` +
        `Berikan analisis perbandingan kedua emiten berdasarkan data di atas. Mana yang lebih menarik untuk investor?`;
      cache.set(cacheKey, output);
      return output;
    } catch (err: any) {
      console.error('[compare_emiten Error]:', err?.response?.status, err?.response?.data || err?.message);
      return `[SYSTEM ERROR] Gagal membandingkan ${symbol1.toUpperCase()} dan ${symbol2.toUpperCase()}`;
    }
  }
});

// ────────────────────────────────────────────────────────────────────────────────
// 5. GET HISTORICAL DATA
// ────────────────────────────────────────────────────────────────────────────────
export const getHistoricalData = tool({
  description:
    'Mendapatkan data historis harga saham 30 hari terakhir untuk analisis tren dan teknikal. ' +
    'Gunakan tool ini ketika pengguna bertanya tentang tren harga, pergerakan historis, ' +
    'analisa teknikal, atau data candlestick suatu saham. ' +
    'Contoh: "tren BBCA sebulan terakhir?", "historis harga TLKM", "pergerakan BBRI 30 hari?".',
  inputSchema: z.object({
    symbol: z
      .string()
      .describe('Kode emiten saham 4 huruf di BEI untuk diambil data historisnya, contoh: BBCA')
  }),
  execute: async ({ symbol }) => {
    try {
      const sym = symbol.toUpperCase();
      const { dateFrom, dateTo } = getDateRange(30);
      const cacheKey = `historical_${sym}_${dateFrom}_${dateTo}`;
      const cached = cache.get<string>(cacheKey);
      if (cached) {
        console.log(`[Cache HIT] ${cacheKey}`);
        return cached;
      }
      console.log(`[Cache MISS] Fetching new data for: ${cacheKey}`);
      const { data } = await api.get(`/stock/idx/${sym}/historical`, {
        params: { from: dateFrom, to: dateTo }
      });
      console.log(`[GoAPI get_historical_data] ${sym} (${dateFrom} → ${dateTo}):`, JSON.stringify(data, null, 2));
      const output =
        `[SYSTEM DATA - HISTORICAL] Emiten: ${sym} | Periode: ${dateFrom} s/d ${dateTo}\n` +
        `${JSON.stringify(data, null, 2)}\n` +
        `Berikan analisis tren dan teknikal berdasarkan data historis di atas.`;
      cache.set(cacheKey, output);
      return output;
    } catch (err: any) {
      console.error('[get_historical_data Error]:', err?.response?.status, err?.response?.data || err?.message);
      return `[SYSTEM ERROR] Gagal mengambil data historis untuk ${symbol.toUpperCase()}`;
    }
  }
});

// ────────────────────────────────────────────────────────────────────────────────
// 6. GET FUNDAMENTALS
// ────────────────────────────────────────────────────────────────────────────────
export const getFundamentals = tool({
  description:
    'Mendapatkan profil dan rasio keuangan fundamental suatu saham, meliputi PER, PBV, ROE, EPS, ' +
    'serta informasi perusahaan. Gunakan tool ini ketika pengguna bertanya tentang valuasi, ' +
    'fundamental, profil perusahaan, atau apakah suatu saham murah/mahal. ' +
    'Contoh: "PER BBCA berapa?", "fundamental TLKM gimana?", "profil BBRI", "ASII kemahalan gak?".',
  inputSchema: z.object({
    symbol: z
      .string()
      .describe('Kode emiten saham 4 huruf di BEI untuk dicek profil dan rasio fundamentalnya, contoh: BBCA')
  }),
  execute: async ({ symbol }) => {
    try {
      const sym = symbol.toUpperCase();
      const cacheKey = `fundamentals_${sym}`;
      const cached = cache.get<string>(cacheKey);
      if (cached) {
        console.log(`[Cache HIT] ${cacheKey}`);
        return cached;
      }
      console.log(`[Cache MISS] Fetching new data for: ${cacheKey}`);
      const { data } = await api.get(`/stock/idx/${sym}/profile`);
      console.log(`[GoAPI get_fundamentals] ${sym}:`, JSON.stringify(data, null, 2));
      const output =
        `[SYSTEM DATA - FUNDAMENTAL] Emiten: ${sym}\n` +
        `${JSON.stringify(data, null, 2)}\n` +
        `Berikan analisis fundamental berdasarkan data di atas. Apakah valuasi saham ini wajar, murah, atau kemahalan?`;
      cache.set(cacheKey, output);
      return output;
    } catch (err: any) {
      console.error('[get_fundamentals Error]:', err?.response?.status, err?.response?.data || err?.message);
      return `[SYSTEM ERROR] Gagal mengambil data fundamental untuk ${symbol.toUpperCase()}`;
    }
  }
});

// ────────────────────────────────────────────────────────────────────────────────
// 7. GET BROKER SUMMARY (Bandarmologi)
// ────────────────────────────────────────────────────────────────────────────────
export const getBrokerSummary = tool({
  description:
    'Mendapatkan ringkasan aktivitas broker (bandarmologi) untuk suatu saham. ' +
    'Menampilkan data net buy/sell dari broker lokal dan asing. ' +
    'Gunakan tool ini ketika pengguna bertanya tentang bandar, broker, akumulasi, distribusi, ' +
    'asing masuk/keluar, atau aktivitas institusional pada suatu saham. ' +
    'Contoh: "broker summary BBCA", "bandar BBRI lagi ngapain?", "asing masuk di saham apa?", ' +
    '"bandarmologi TLKM tanggal 2026-04-01".',
  inputSchema: z.object({
    symbol: z
      .string()
      .describe('Kode emiten saham 4 huruf di BEI untuk dicek aktivitas broker-nya, contoh: BBCA'),
    date: z
      .string()
      .optional()
      .describe('Tanggal data broker dalam format YYYY-MM-DD. Opsional, default hari ini. Contoh: 2026-04-07'),
    investor: z
      .enum(['LOCAL', 'FOREIGN', 'ALL'])
      .optional()
      .describe('Filter jenis investor: LOCAL (domestik), FOREIGN (asing), atau ALL (semua). Opsional, default ALL')
  }),
  execute: async ({ symbol, date, investor }) => {
    try {
      const sym = symbol.toUpperCase();
      const queryDate = date || new Date().toISOString().split('T')[0];
      const queryInvestor = investor || 'ALL';
      const cacheKey = `broker_${sym}_${queryDate}_${queryInvestor}`;
      const cached = cache.get<string>(cacheKey);
      if (cached) {
        console.log(`[Cache HIT] ${cacheKey}`);
        return cached;
      }
      console.log(`[Cache MISS] Fetching new data for: ${cacheKey}`);
      const { data } = await api.get(`/stock/idx/${sym}/broker_summary`, {
        params: { date: queryDate, investor: queryInvestor }
      });
      console.log(`[GoAPI get_broker_summary] ${sym} (${queryDate}, ${queryInvestor}):`, JSON.stringify(data, null, 2));
      const output =
        `[SYSTEM DATA - BROKER SUMMARY] Emiten: ${sym} | Tanggal: ${queryDate} | Investor: ${queryInvestor}\n` +
        `${JSON.stringify(data, null, 2)}\n` +
        `Berikan analisis bandarmologi berdasarkan data broker di atas. Apakah ada indikasi akumulasi atau distribusi?`;
      cache.set(cacheKey, output);
      return output;
    } catch (err: any) {
      console.error('[get_broker_summary Error]:', err?.response?.status, err?.response?.data || err?.message);
      return `[SYSTEM ERROR] Gagal mengambil data broker summary untuk ${symbol.toUpperCase()}`;
    }
  }
});

// ────────────────────────────────────────────────────────────────────────────────
// 8. REQUEST CHART
// ────────────────────────────────────────────────────────────────────────────────
export const requestChart = tool({
  description:
    'Tool khusus untuk meminta sistem membuatkan grafik (chart) pergerakan harga saham sekian waktu terakhir. ' +
    'Gunakan tool ini JIKA DAN HANYA JIKA pengguna secara spesifik meminta gambar, grafik, chart, atau visualisasi. ' +
    'Contoh: "tampilkan chart BBCA", "minta grafik TLKM", "tolong gambarkan grafik BBRI".',
  inputSchema: z.object({
    symbol: z
      .string()
      .describe('Kode emiten saham 4 huruf di BEI, contoh: BBCA')
  }),
  execute: async ({ symbol }) => {
    // Tool ini hanya akan mengembalikan command khusus untuk di-intercept oleh Telegram Bot.
    return `[INSTRUCTION: GENERATE_CHART_FOR_SYMBOL: ${symbol.toUpperCase()}]`;
  }
});

// ────────────────────────────────────────────────────────────────────────────────
// WATCHLIST TOOLS — Factory function (chatId di-inject otomatis, bukan dari AI)
// ────────────────────────────────────────────────────────────────────────────────
export function createWatchlistTools(chatId: string) {
  const chatIdStr = String(chatId);

  const addToWatchlistTool = tool({
    description:
      'Menambahkan saham ke daftar watchlist pengguna. ' +
      'Gunakan tool ini ketika pengguna ingin memantau atau mengikuti suatu saham. ' +
      'Contoh: "watchlist BBCA", "pantau TLKM", "tambah BBRI ke watchlist saya".',
    inputSchema: z.object({
      symbol: z
        .string()
        .describe('Kode emiten saham 4 huruf di BEI, contoh: BBCA')
    }),
    execute: async ({ symbol }) => {
      try {
        const sym = symbol.toUpperCase();

        const { data: existing } = await checkWatchlistExists(chatIdStr, sym);

        if (existing) {
          return `[SYSTEM] Saham ${sym} sudah ada di watchlist Anda.`;
        }

        const { error } = await addToWatchlist(chatIdStr, sym);
        
        if (error) {
          console.error('[add_to_watchlist Error]:', error.message);
          return `[SYSTEM ERROR] Gagal menambahkan saham ke watchlist.`;
        }

        console.log(`[Watchlist] Added ${sym} for chat ${chatId}`);
        return `[SYSTEM] Saham ${sym} berhasil ditambahkan ke watchlist Anda.`;
      } catch (err: any) {
        console.error('[add_to_watchlist Error]:', err?.message);
        return `[SYSTEM ERROR] Gagal menambahkan saham ke watchlist.`;
      }
    }
  });

  const getWatchlistTool = tool({
    description:
      'Menampilkan daftar saham yang ada di watchlist pengguna. ' +
      'Gunakan tool ini ketika pengguna ingin melihat saham yang sedang dipantau. ' +
      'Contoh: "lihat watchlist saya", "watchlist apa saja?", "daftar pantauan saya".',
    inputSchema: z.object({}),
    execute: async () => {
      try {
        const { data: rows, error } = await getWatchlist(chatIdStr);

        if (error) {
          console.error('[get_watchlist Error]:', error.message);
          return '[SYSTEM ERROR] Gagal mengambil data watchlist.';
        }

        if (!rows || rows.length === 0) {
          return '[SYSTEM] Watchlist Anda masih kosong.';
        }

        const symbols = rows.map((r: any) => r.symbol).join(', ');
        console.log(`[Watchlist] Fetched ${rows.length} items for chat ${chatId}`);
        return `[SYSTEM DATA - WATCHLIST] Daftar saham di watchlist Anda (${rows.length} saham): ${symbols}. Sampaikan daftar ini ke pengguna dengan format yang rapi.`;
      } catch (err: any) {
        console.error('[get_watchlist Error]:', err?.message);
        return '[SYSTEM ERROR] Gagal mengambil data watchlist.';
      }
    }
  });

  const removeFromWatchlistTool = tool({
    description:
      'Menghapus saham dari daftar watchlist pengguna. ' +
      'Gunakan tool ini ketika pengguna ingin berhenti memantau suatu saham. ' +
      'Contoh: "hapus BBCA dari watchlist", "remove TLKM", "jangan pantau BBRI lagi".',
    inputSchema: z.object({
      symbol: z
        .string()
        .describe('Kode emiten saham 4 huruf di BEI yang ingin dihapus, contoh: BBCA')
    }),
    execute: async ({ symbol }) => {
      try {
        const sym = symbol.toUpperCase();

        const { data, error } = await removeFromWatchlist(chatIdStr, sym);

        if (error) {
          console.error('[remove_from_watchlist Error]:', error.message);
          return `[SYSTEM ERROR] Gagal menghapus saham dari watchlist.`;
        }

        if (data && data.length > 0) {
          console.log(`[Watchlist] Removed ${sym} for chat ${chatId}`);
          return `[SYSTEM] Saham ${sym} berhasil dihapus dari watchlist Anda.`;
        } else {
          return `[SYSTEM] Saham ${sym} tidak ditemukan di watchlist Anda.`;
        }
      } catch (err: any) {
        console.error('[remove_from_watchlist Error]:', err?.message);
        return `[SYSTEM ERROR] Gagal menghapus saham dari watchlist.`;
      }
    }
  });

  return {
    add_to_watchlist: addToWatchlistTool,
    get_watchlist: getWatchlistTool,
    remove_from_watchlist: removeFromWatchlistTool
  };
}

// ────────────────────────────────────────────────────────────────────────────────
// ALERT TOOLS — Factory function (chatId di-inject otomatis, bukan dari AI)
// ────────────────────────────────────────────────────────────────────────────────
export function createAlertTools(chatId: string) {
  const chatIdStr = String(chatId);

  const createAlertTool = tool({
    description:
      'Membuat alert (pemberitahuan) harga saham yang akan mengirim notifikasi otomatis ke pengguna ' +
      'ketika harga mencapai target tertentu. ' +
      'Gunakan tool ini ketika pengguna ingin diberi tahu jika harga saham naik di atas atau turun di bawah nilai tertentu. ' +
      'Contoh: "alert BBCA di atas 10000", "beri tahu saya jika BBRI turun di bawah 5000", "set alert TLKM above 3500".',
    inputSchema: z.object({
      symbol: z
        .string()
        .describe('Kode emiten saham 4 huruf di BEI, contoh: BBCA'),
      targetPrice: z
        .number()
        .positive()
        .describe('Harga target untuk alert dalam Rupiah, contoh: 10000'),
      condition: z
        .enum(['ABOVE', 'BELOW'])
        .describe('Kondisi alert: ABOVE (di atas) atau BELOW (di bawah) harga target')
    }),
    execute: async ({ symbol, targetPrice, condition }) => {
      try {
        const sym = symbol.toUpperCase();
        const { createAlert } = await import('../db');

        const { data, error } = await createAlert(chatIdStr, sym, targetPrice, condition);

        if (error) {
          console.error('[create_alert Error]:', error.message);
          return '[SYSTEM ERROR] Gagal membuat alert. Silakan coba lagi.';
        }

        const conditionText = condition === 'ABOVE' ? 'di atas' : 'di bawah';
        console.log(`[Alert] Created: ${sym} ${condition} ${targetPrice} for chat ${chatId}`);
        
        return (
          `[SYSTEM] ✅ Alert berhasil dibuat!\n` +
          `📊 Saham: ${sym}\n` +
          `🎯 Kondisi: ${conditionText} Rp ${targetPrice.toLocaleString('id-ID')}\n` +
          `🔔 Anda akan menerima notifikasi otomatis ketika kondisi terpenuhi selama jam trading (Senin-Jumat 09:00-16:00 WIB).`
        );
      } catch (err: any) {
        console.error('[create_alert Error]:', err?.message);
        return '[SYSTEM ERROR] Gagal membuat alert. Silakan coba lagi.';
      }
    }
  });

  const viewAlertsTool = tool({
    description:
      'Menampilkan daftar alert harga saham yang aktif milik pengguna. ' +
      'Gunakan tool ini ketika pengguna ingin melihat alert apa saja yang sudah dibuat. ' +
      'Contoh: "lihat alert saya", "tampilkan semua alert", "daftar alert aktif", "alert apa saja yang sudah saya set?".',
    inputSchema: z.object({}),
    execute: async () => {
      try {
        const { getAlertsByUser } = await import('../db');
        const { data: alerts, error } = await getAlertsByUser(chatIdStr);

        if (error) {
          console.error('[view_alerts Error]:', error.message);
          return '[SYSTEM ERROR] Gagal mengambil data alert.';
        }

        if (!alerts || alerts.length === 0) {
          return '[SYSTEM] Anda belum memiliki alert aktif. Buat alert dengan perintah seperti: "alert BBCA di atas 10000".';
        }

        console.log(`[Alert] Fetched ${alerts.length} active alert(s) for chat ${chatId}`);

        let message = `[SYSTEM DATA - ALERTS] Daftar alert aktif Anda (${alerts.length} alert):\n\n`;
        
        alerts.forEach((alert, index) => {
          const conditionText = alert.condition === 'ABOVE' ? 'di atas' : 'di bawah';
          message += `${index + 1}. ${alert.symbol} ${conditionText} Rp ${alert.target_price.toLocaleString('id-ID')}\n`;
        });

        message += '\nSampaikan daftar alert ini ke pengguna dengan format yang rapi dan informatif.';
        
        return message;
      } catch (err: any) {
        console.error('[view_alerts Error]:', err?.message);
        return '[SYSTEM ERROR] Gagal mengambil data alert.';
      }
    }
  });

  const deleteAlertTool = tool({
    description:
      'Menghapus semua alert untuk suatu saham tertentu dari daftar alert pengguna. ' +
      'Gunakan tool ini ketika pengguna ingin membatalkan atau menghapus alert yang sudah dibuat. ' +
      'Contoh: "hapus alert BBCA", "delete alert BBRI", "batalkan alert TLKM", "remove alert ASII".',
    inputSchema: z.object({
      symbol: z
        .string()
        .describe('Kode emiten saham 4 huruf di BEI yang alert-nya ingin dihapus, contoh: BBCA')
    }),
    execute: async ({ symbol }) => {
      try {
        const sym = symbol.toUpperCase();
        const { deleteAlert } = await import('../db');

        const { data, error } = await deleteAlert(chatIdStr, sym);

        if (error) {
          console.error('[delete_alert Error]:', error.message);
          return '[SYSTEM ERROR] Gagal menghapus alert.';
        }

        if (data && data.length > 0) {
          console.log(`[Alert] Deleted ${data.length} alert(s) for ${sym} (chat ${chatId})`);
          return `[SYSTEM] ✅ Berhasil menghapus ${data.length} alert untuk saham ${sym}.`;
        } else {
          return `[SYSTEM] ⚠️  Tidak ditemukan alert aktif untuk saham ${sym}.`;
        }
      } catch (err: any) {
        console.error('[delete_alert Error]:', err?.message);
        return '[SYSTEM ERROR] Gagal menghapus alert.';
      }
    }
  });

  return {
    create_alert: createAlertTool,
    view_alerts: viewAlertsTool,
    delete_alert: deleteAlertTool
  };
}

// ────────────────────────────────────────────────────────────────────────────────
// PORTFOLIO TOOLS — Factory function (chatId di-inject otomatis, bukan dari AI)
// ────────────────────────────────────────────────────────────────────────────────
export function createPortfolioTools(chatId: string) {
  const chatIdStr = String(chatId);

  const addToPortfolioTool = tool({
    description:
      'Menambahkan saham ke portfolio investasi pengguna dengan harga rata-rata dan jumlah lot. ' +
      'Jika saham sudah ada, sistem akan menghitung ulang harga rata-rata tertimbang secara otomatis. ' +
      'Gunakan tool ini ketika pengguna ingin mencatat pembelian saham atau menambah posisi. ' +
      'Contoh: "saya beli BBCA di harga 10000 sebanyak 5 lot", "tambah BBRI ke portfolio harga 4500 lot 10", "catat pembelian TLKM 3000 20 lot".',
    inputSchema: z.object({
      symbol: z
        .string()
        .describe('Kode emiten saham 4 huruf di BEI, contoh: BBCA'),
      averagePrice: z
        .number()
        .positive()
        .describe('Harga rata-rata pembelian per saham dalam Rupiah'),
      totalLot: z
        .number()
        .positive()
        .int()
        .describe('Jumlah lot yang dibeli (1 lot = 100 saham)')
    }),
    execute: async ({ symbol, averagePrice, totalLot }) => {
      try {
        const sym = symbol.toUpperCase().trim();

        // Validate input
        if (averagePrice <= 0) {
          return '[SYSTEM ERROR] Harga rata-rata harus lebih besar dari 0.';
        }
        if (totalLot < 1) {
          return '[SYSTEM ERROR] Jumlah lot minimal adalah 1.';
        }

        // Symbol validation via GoAPI
        console.log(`[Portfolio] Validating symbol ${sym} via GoAPI...`);
        try {
          const { data } = await api.get('/stock/idx/prices', {
            params: { symbols: sym }
          });
          const result = data?.data?.results?.[0] || data?.data || data;
          const price = result?.close ?? result?.price ?? null;

          if (price === null || price === undefined) {
            console.warn(`[Portfolio] Symbol ${sym} not found in GoAPI`);
            return `[SYSTEM ERROR] Simbol ${sym} tidak ditemukan di database GoAPI. Pastikan kode saham sudah benar.`;
          }
          console.log(`[Portfolio] Symbol ${sym} validated successfully (current price: ${price})`);
        } catch (validationErr: any) {
          console.error('[Portfolio] GoAPI validation error:', validationErr?.message);
          return `[SYSTEM ERROR] Simbol ${sym} tidak ditemukan di database GoAPI. Pastikan kode saham sudah benar.`;
        }

        // Check if portfolio entry exists
        const { data: existing, error: checkError } = await checkPortfolioExists(chatIdStr, sym);

        if (checkError) {
          console.error('[Portfolio] checkPortfolioExists error:', checkError.message);
          return '[SYSTEM ERROR] Gagal memeriksa portfolio. Silakan coba lagi.';
        }

        if (existing) {
          // Update existing holding with weighted average
          const oldAvgPrice = Number(existing.average_price);
          const oldLot = Number(existing.total_lot);

          // Calculate weighted average
          const newAvgPrice = ((oldAvgPrice * oldLot) + (averagePrice * totalLot)) / (oldLot + totalLot);
          const newTotalLot = oldLot + totalLot;

          // Round to 2 decimals for display but keep precision in DB
          const roundedAvgPrice = Math.round(newAvgPrice * 100) / 100;

          const { error: updateError } = await updatePortfolio(chatIdStr, sym, roundedAvgPrice, newTotalLot);

          if (updateError) {
            console.error('[Portfolio] updatePortfolio error:', updateError.message);
            return '[SYSTEM ERROR] Gagal memperbarui portfolio.';
          }

          console.log(`[Portfolio] Updated ${sym} for chat ${chatId}: ${oldAvgPrice} → ${roundedAvgPrice}, ${oldLot} → ${newTotalLot} lots`);
          
          return (
            `[SYSTEM] ✅ Portfolio berhasil diperbarui!\n` +
            `📊 Saham: ${sym}\n` +
            `💰 Harga Rata-rata: Rp ${oldAvgPrice.toLocaleString('id-ID')} → Rp ${roundedAvgPrice.toLocaleString('id-ID')}\n` +
            `📦 Total Lot: ${oldLot} → ${newTotalLot} lot (${newTotalLot * 100} saham)`
          );
        } else {
          // Add new holding
          const { error: addError } = await addToPortfolio(chatIdStr, sym, averagePrice, totalLot);

          if (addError) {
            console.error('[Portfolio] addToPortfolio error:', addError.message);
            return '[SYSTEM ERROR] Gagal menambahkan saham ke portfolio.';
          }

          console.log(`[Portfolio] Added ${sym} for chat ${chatId}: ${averagePrice} x ${totalLot} lots`);

          return (
            `[SYSTEM] ✅ Saham berhasil ditambahkan ke portfolio!\n` +
            `📊 Saham: ${sym}\n` +
            `💰 Harga Rata-rata: Rp ${averagePrice.toLocaleString('id-ID')}\n` +
            `📦 Total Lot: ${totalLot} lot (${totalLot * 100} saham)`
          );
        }
      } catch (err: any) {
        console.error('[Portfolio] add_to_portfolio error:', err?.message);
        return '[SYSTEM ERROR] Gagal menambahkan saham ke portfolio.';
      }
    }
  });

  const getPortfolioTool = tool({
    description:
      'Menampilkan daftar lengkap portfolio investasi pengguna dengan perhitungan profit/loss real-time. ' +
      'Menampilkan harga rata-rata pembelian, harga pasar terkini, nilai pasar, modal, floating P/L, dan persentase keuntungan/kerugian. ' +
      'Gunakan tool ini ketika pengguna ingin melihat portfolio atau performa investasi mereka. ' +
      'Contoh: "tampilkan portfolio saya", "lihat portfolio", "cek untung rugi saham saya", "portfolio performance".',
    inputSchema: z.object({}),
    execute: async () => {
      try {
        const { data: holdings, error } = await getPortfolio(chatIdStr);

        if (error) {
          console.error('[Portfolio] getPortfolio error:', error.message);
          return '[SYSTEM ERROR] Gagal mengambil data portfolio.';
        }

        if (!holdings || holdings.length === 0) {
          return '[SYSTEM] Portfolio Anda masih kosong. Tambahkan saham dengan perintah seperti: "beli BBCA harga 10000 lot 5".';
        }

        console.log(`[Portfolio] Fetched ${holdings.length} holding(s) for chat ${chatId}`);

        // Extract all symbols for batch price fetch
        const symbols = holdings.map(h => h.symbol.toUpperCase());
        const symbolsParam = symbols.join(',');

        // Batch fetch current prices from GoAPI
        const priceMap = new Map<string, number>();
        
        try {
          console.log(`[Portfolio] Fetching prices for: ${symbolsParam}`);
          const { data } = await api.get('/stock/idx/prices', {
            params: { symbols: symbolsParam }
          });

          const results = data?.data?.results || [];
          
          if (Array.isArray(results)) {
            results.forEach((result: any) => {
              const sym = result?.symbol?.toUpperCase();
              const price = result?.close ?? result?.price ?? null;
              if (sym && price !== null && price !== undefined) {
                priceMap.set(sym, Number(price));
              }
            });
          }
          
          console.log(`[Portfolio] Retrieved prices for ${priceMap.size} symbol(s)`);
        } catch (priceErr: any) {
          console.error('[Portfolio] Error fetching prices:', priceErr?.message);
          // Continue with empty price map - graceful degradation
        }

        // Build portfolio display
        let output = `[SYSTEM DATA - PORTFOLIO] Portfolio Investasi Anda (${holdings.length} saham):\n\n`;

        holdings.forEach((holding) => {
          const sym = holding.symbol.toUpperCase();
          const avgPrice = Number(holding.average_price);
          const totalLot = Number(holding.total_lot);
          const lotValue = 100; // shares per lot

          const currentPrice = priceMap.get(sym);

          output += `📈 ${sym}\n`;
          output += `• Harga Rata-rata: Rp ${avgPrice.toLocaleString('id-ID')}\n`;
          output += `• Total Lot: ${totalLot} lot (${totalLot * lotValue} saham)\n`;

          if (currentPrice === null || currentPrice === undefined) {
            output += `• Harga Sekarang: Data tidak tersedia\n`;
            output += `• Nilai Pasar: Data tidak tersedia\n`;
            output += `• Modal: Rp ${(avgPrice * totalLot * lotValue).toLocaleString('id-ID')}\n`;
            output += `• Floating P/L: Data tidak tersedia\n`;
            output += `• Gain/Loss: Data tidak tersedia\n\n`;
          } else {
            const marketValue = currentPrice * totalLot * lotValue;
            const costBasis = avgPrice * totalLot * lotValue;
            const floatingPL = marketValue - costBasis;
            const gainLossPercent = (floatingPL / costBasis) * 100;

            output += `• Harga Sekarang: Rp ${currentPrice.toLocaleString('id-ID')}\n`;
            output += `• Nilai Pasar: Rp ${marketValue.toLocaleString('id-ID')}\n`;
            output += `• Modal: Rp ${costBasis.toLocaleString('id-ID')}\n`;
            output += `• Floating P/L: Rp ${floatingPL.toLocaleString('id-ID')}\n`;
            output += `• Gain/Loss: ${gainLossPercent.toFixed(2)}%\n\n`;
          }
        });

        output += 'Berikan analisis performa portfolio berdasarkan data di atas.';

        return output;
      } catch (err: any) {
        console.error('[Portfolio] get_portfolio error:', err?.message);
        return '[SYSTEM ERROR] Gagal mengambil data portfolio.';
      }
    }
  });

  const removeFromPortfolioTool = tool({
    description:
      'Menghapus saham dari portfolio investasi pengguna. ' +
      'Gunakan tool ini ketika pengguna ingin mengeluarkan saham dari daftar portfolio (misalnya setelah dijual). ' +
      'Contoh: "hapus BBCA dari portfolio", "remove TLKM dari portfolio saya", "keluarkan BBRI".',
    inputSchema: z.object({
      symbol: z
        .string()
        .describe('Kode emiten saham 4 huruf yang ingin dihapus, contoh: BBCA')
    }),
    execute: async ({ symbol }) => {
      try {
        const sym = symbol.toUpperCase().trim();

        const { data, error } = await removeFromPortfolio(chatIdStr, sym);

        if (error) {
          console.error('[Portfolio] removeFromPortfolio error:', error.message);
          return '[SYSTEM ERROR] Gagal menghapus saham dari portfolio.';
        }

        if (data && data.length > 0) {
          console.log(`[Portfolio] Removed ${sym} for chat ${chatId}`);
          return `[SYSTEM] ✅ Saham ${sym} berhasil dihapus dari portfolio Anda.`;
        } else {
          return `[SYSTEM] ⚠️  Saham ${sym} tidak ditemukan di portfolio Anda.`;
        }
      } catch (err: any) {
        console.error('[Portfolio] remove_from_portfolio error:', err?.message);
        return '[SYSTEM ERROR] Gagal menghapus saham dari portfolio.';
      }
    }
  });

  return {
    add_to_portfolio: addToPortfolioTool,
    get_portfolio: getPortfolioTool,
    remove_from_portfolio: removeFromPortfolioTool
  };
}

// ────────────────────────────────────────────────────────────────────────────────
// TOOLS REGISTRY
// ────────────────────────────────────────────────────────────────────────────────
const baseTools = {
  get_stock_price: getPrice,
  get_market_summary: getMarketSummary,
  get_top_movers: getTopMovers,
  compare_emiten: compareEmiten,
  get_historical_data: getHistoricalData,
  get_fundamentals: getFundamentals,
  get_broker_summary: getBrokerSummary,
  request_chart: requestChart
};

export function createAllTools(chatId: string) {
  return {
    ...baseTools,
    ...createWatchlistTools(chatId),
    ...createAlertTools(chatId),
    ...createPortfolioTools(chatId)
  };
}

// Export base tools untuk backward-compat jika diperlukan
export const tools = baseTools;