import { generateText, stepCountIs } from 'ai';
import { google } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { env } from '../config/env';
import { createAllTools } from '../tools/registry';

const aggregator = createOpenAI({
  baseURL: env.AGGREGATOR_BASE_URL,
  apiKey: env.AGGREGATOR_API_KEY,
});

const gemini = google('gemini-2.0-flash-lite');

// ────────────────────────────────────────────────────────────────────────────────
// SESSION MEMORY — Per chat_id, max 20 pesan terakhir, TTL 1 jam
// ────────────────────────────────────────────────────────────────────────────────
const MAX_HISTORY = 20;
const SESSION_TTL = 60 * 60 * 1000; // 1 jam dalam ms

type Role = 'user' | 'assistant';
interface ChatMessage {
  role: Role;
  content: string;
}

interface Session {
  messages: ChatMessage[];
  lastActive: number;
}

const sessions = new Map<string, Session>();

function getSession(chatId: string): ChatMessage[] {
  const session = sessions.get(chatId);
  if (!session) return [];
  // Expired check
  if (Date.now() - session.lastActive > SESSION_TTL) {
    sessions.delete(chatId);
    console.log(`[Session] Expired & cleared: ${chatId}`);
    return [];
  }
  return session.messages;
}

function pushMessage(chatId: string, role: 'user' | 'assistant', content: string) {
  let session = sessions.get(chatId);
  if (!session) {
    session = { messages: [], lastActive: Date.now() };
    sessions.set(chatId, session);
  }
  session.messages.push({ role, content });
  // Trim: simpan hanya MAX_HISTORY pesan terakhir
  if (session.messages.length > MAX_HISTORY) {
    session.messages = session.messages.slice(-MAX_HISTORY);
  }
  session.lastActive = Date.now();
}

// Bersihkan session expired setiap 10 menit
setInterval(() => {
  const now = Date.now();
  for (const [chatId, session] of sessions) {
    if (now - session.lastActive > SESSION_TTL) {
      sessions.delete(chatId);
      console.log(`[Session Cleanup] Removed: ${chatId}`);
    }
  }
}, 10 * 60 * 1000);

const getSystemPrompt = () => {
  const current_date = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'full', timeStyle: 'long' });
  return `Kamu adalah Hermes, AI Stock Agent aktif. Hari ini adalah ${current_date}. Kamu memiliki akses ke data pasar modal melalui GoAPI, jadi jangan pernah katakan datamu terbatas hingga 2023. Gunakan data terbaru dari tool yang tersedia.

TOOLS YANG TERSEDIA:
1. get_stock_price — Cek harga saham terkini (parameter: symbol)
2. get_market_summary — Saham trending & ringkasan pasar IHSG hari ini (tanpa parameter)
3. get_top_movers — Daftar Top Gainer & Top Loser hari ini (tanpa parameter)
4. compare_emiten — Bandingkan dua saham side-by-side (parameter: symbol1, symbol2)
5. get_historical_data — Data historis harga 30 hari terakhir untuk analisis tren (parameter: symbol)
6. get_fundamentals — Profil perusahaan & rasio keuangan PER, PBV, ROE, EPS (parameter: symbol)
7. get_broker_summary — Analisis bandarmologi: aktivitas broker lokal/asing (parameter: symbol, date?, investor?)
8. request_chart — Menghasilkan visualisasi grafik tren harga saham dalam bentuk gambar (parameter: symbol)
9. get_technical_indicators — Analisis teknikal lengkap: RSI, MACD, Moving Average, Support/Resistance untuk trend analysis (parameter: symbol)
10. get_market_liquidity_flow — Analisis liquidity flow lengkap: bandarmologi (broker summary) + foreign flow untuk tracking smart money dan institutional trading patterns (parameter: symbol)
11. add_to_watchlist — Tambahkan saham ke watchlist pengguna (parameter: symbol saja)
12. get_watchlist — Lihat daftar saham di watchlist pengguna (tanpa parameter)
13. remove_from_watchlist — Hapus saham dari watchlist pengguna (parameter: symbol saja)
14. create_alert — Buat alert harga otomatis untuk notifikasi. Mendukung 3 tipe:
    - Alert harga tetap: "alert BBCA di atas 10000"
    - Alert persentase: "alert BBRI naik 5%" atau "alert ASII turun 3%"
    - Trailing stop: "alert TLKM turun 3% dari harga tertinggi hari ini"
    (parameter: symbol, targetPrice?, condition?, percentage?, isTrailingStop?)
15. view_alerts — Lihat semua alert aktif pengguna dengan status detail (tanpa parameter)
16. delete_alert — Hapus alert untuk saham tertentu (parameter: symbol)
17. add_to_portfolio — Tambahkan saham ke portfolio investasi dengan harga rata-rata dan jumlah lot (parameter: symbol, averagePrice, totalLot). Sistem otomatis menghitung harga rata-rata tertimbang jika saham sudah ada.
18. get_portfolio — Tampilkan daftar portfolio lengkap dengan perhitungan profit/loss real-time, nilai pasar, modal, dan persentase keuntungan/kerugian (tanpa parameter)
19. remove_from_portfolio — Hapus saham dari portfolio investasi (parameter: symbol saja)

ATURAN:
1. Pilih tool yang paling relevan berdasarkan pertanyaan pengguna. Boleh memanggil lebih dari satu tool jika diperlukan.
2. SETELAH menerima data dari tool, ANDA WAJIB menuliskan rangkuman dan analisis dalam bahasa Indonesia yang natural dan informatif.
3. DILARANG KERAS merespons dengan teks kosong.
4. Jika pengguna hanya menyapa, balas dengan ramah tanpa memanggil tool.
5. Jika pengguna bertanya tentang kondisi pasar umum atau trending, gunakan get_market_summary.
6. Jika pengguna bertanya saham naik/turun terbanyak, gunakan get_top_movers.
7. Jika pengguna minta perbandingan dua saham, gunakan compare_emiten.
8. Jika pengguna minta data historis mentah atau tren harga, gunakan get_historical_data.
9. Jika pengguna bertanya tentang valuasi/fundamental/profil perusahaan, gunakan get_fundamentals.
10. Jika pengguna bertanya tentang bandar, broker, asing masuk/keluar, akumulasi/distribusi, gunakan get_broker_summary.
11. Jika pengguna bertanya tentang "bandarmologi", "foreign flow", "liquidity flow", "bandar akumulasi", "smart money", "institutional flow", atau aktivitas institusional, gunakan get_market_liquidity_flow.
12. Jika pengguna MEMINTA GAMBAR, CHART, GRAFIK, atau VISUALISASI dari sebuah pergerakan saham, gunakan request_chart.
13. Jika pengguna ingin menambah, melihat, atau menghapus saham dari watchlist, gunakan tool watchlist yang sesuai. TIDAK perlu mengisi chatId, sistem akan menanganinya otomatis.
14. Jika pengguna ingin membuat alert:
    - Alert harga tetap: gunakan targetPrice dan condition
    - Alert persentase ("+5%", "-3%", "naik 5%", "turun 3%"): gunakan percentage dan condition (ABOVE untuk naik, BELOW untuk turun)
    - Trailing stop ("turun X% dari harga tertinggi hari ini", "trailing stop X%", "stop loss dinamis"): gunakan percentage dan isTrailingStop=true
    Alert akan mengirim notifikasi otomatis selama jam trading (Senin-Jumat 09:00-16:00 WIB).
    
    Contoh perintah alert:
    - "alert BBCA di atas 10000" → targetPrice=10000, condition=ABOVE
    - "beri tahu kalau BBRI naik 5%" → percentage=5, condition=ABOVE
    - "alert ASII turun 3%" → percentage=3, condition=BELOW
    - "set trailing stop TLKM 3%" → percentage=3, isTrailingStop=true
    - "alert BBNI turun 5% dari harga tertinggi hari ini" → percentage=5, isTrailingStop=true
    
    Ketika pengguna menyebut "harga tertinggi hari ini", "high hari ini", "trailing stop", atau "stop loss dinamis", gunakan isTrailingStop=true.
15. Jika pengguna ingin melihat daftar alert yang sudah dibuat, gunakan view_alerts. Tool ini akan menampilkan status detail untuk setiap alert termasuk jarak ke trigger dan kondisi terkini.
16. Jika pengguna ingin menghapus atau membatalkan alert, gunakan delete_alert.
17. Jika pengguna ingin mencatat pembelian saham atau menambah portfolio ("beli saham BBRI harga 4200 lot 10", "tambah ASII ke portfolio 5000 5 lot"), gunakan add_to_portfolio. TIDAK perlu mengisi chatId, sistem menanganinya otomatis.
18. Jika pengguna ingin melihat portfolio investasi mereka ("tampilkan portfolio saya", "lihat portfolio", "cek untung rugi"), gunakan get_portfolio.
19. Jika pengguna ingin menghapus saham dari portfolio ("hapus BBCA dari portfolio", "remove TLKM"), gunakan remove_from_portfolio.
20. Jika pengguna bertanya tentang analisis teknikal, RSI, MACD, Moving Average, overbought/oversold, momentum, atau indikator teknikal suatu saham, gunakan get_technical_indicators. Contoh: "RSI BBCA berapa?", "MACD TLKM gimana?", "analisa teknikal BBRI", "saham ASII lagi overbought?"
21. PENTING - Smart Auto-trigger: Ketika pengguna meminta analisis mendalam/lengkap/komprehensif suatu saham (contoh: "analisa BBCA", "cek TLKM secara detail", "gimana kondisi BBRI sekarang?"), OTOMATIS sertakan get_stock_price, get_fundamentals, get_technical_indicators, DAN get_market_liquidity_flow untuk memberikan gambaran investasi yang komprehensif dari segi harga, fundamental, teknikal, DAN institutional flow. Jangan hanya pakai satu atau dua tool saja - ini adalah analisis ULTIMATE.
22. Kamu memiliki memori percakapan. Gunakan konteks percakapan sebelumnya untuk menjawab pertanyaan follow-up.`;
};

export const processQuery = async (input: string, chatId: string) => {
  try {
    // Tambahkan pesan user ke history
    pushMessage(chatId, 'user', input);

    // Ambil seluruh history untuk dikirim ke LLM
    const history = getSession(chatId);
    console.log(`[Session] chatId=${chatId}, messages=${history.length}`);

    // Buat tools per-request dengan chatId ter-inject untuk watchlist
    const allTools = createAllTools(chatId);

  let finalReply = '';
  let chartInstruction = '';
  let toolData = '';

  try {
    const result = await generateText({
      model: aggregator.chat(env.AGGREGATOR_MODEL),
      system: getSystemPrompt(),
      messages: history,
      tools: allTools,
      stopWhen: stepCountIs(3),
      maxRetries: 0,
    });

    finalReply = result.text || '';
    
    for (const step of result.steps) {
      if (step.toolResults && step.toolResults.length > 0) {
        for (const tr of step.toolResults) {
          const outputStr = typeof tr.output === 'string' ? tr.output : JSON.stringify(tr.output);
          if (outputStr.includes('GENERATE_CHART_FOR_SYMBOL')) {
             chartInstruction = outputStr;
          } else {
             toolData = outputStr;
          }
        }
      }
    }

    if (!finalReply.trim() && toolData) {
      const summary = await generateText({
        model: aggregator.chat(env.AGGREGATOR_MODEL),
        system: getSystemPrompt(),
        prompt: `${toolData}\n\nBerdasarkan data di atas, berikan analisis teknikal singkat dalam bahasa Indonesia untuk pengguna.`,
        maxRetries: 0,
      });
      finalReply = summary.text;
    }
  } catch (error: any) {
    const errStr = JSON.stringify(error?.data || error?.cause || error?.message || '');
    console.error('[Aggregator Error]:', error?.message);
    
    console.log('[System] Menggunakan Fallback Google Gemini...');
    
    try {
      const fallbackResult = await generateText({
        model: gemini,
        system: getSystemPrompt(),
        messages: history,
        tools: allTools,
        stopWhen: stepCountIs(3),
        maxRetries: 0,
      });

      finalReply = fallbackResult.text || '';

      for (const step of fallbackResult.steps) {
        if (step.toolResults && step.toolResults.length > 0) {
          for (const tr of step.toolResults) {
            const outputStr = typeof tr.output === 'string' ? tr.output : JSON.stringify(tr.output);
            if (outputStr.includes('GENERATE_CHART_FOR_SYMBOL')) {
               chartInstruction = outputStr;
            } else {
               toolData = outputStr;
            }
          }
        }
      }

      if (!finalReply.trim() && toolData) {
        const fallbackSummary = await generateText({
          model: gemini,
          system: getSystemPrompt(),
          prompt: `${toolData}\n\nBerdasarkan data di atas, berikan analisis teknikal singkat secara detail dalam bahasa Indonesia untuk pengguna.`,
          maxRetries: 0,
        });
        finalReply = fallbackSummary.text;
      }

      console.log('[System] Fallback berhasil menggunakan Gemini');
    } catch (geminiErr: any) {
      console.error('[Gemini Fallback Error]:', geminiErr?.message);
      return `⚠️ API Aggregator mencapai limit, dan Google Gemini sebagai fallback juga mengalami error. Silakan coba lagi nanti.`;
    }
  }

  // 4. Injeksi instruksi chart ke reply agar Telegram bot mendeteksinya
  if (chartInstruction && !finalReply.includes('GENERATE_CHART_FOR_SYMBOL')) {
    finalReply += `\n\n${chartInstruction}`;
  }

  // 5. Simpan ke history (tanpa instruksi raw)
  if (finalReply.trim()) {
    const cleanReply = finalReply.replace(/\[INSTRUCTION:.*?\]/g, '').trim();
    if (cleanReply) pushMessage(chatId, 'assistant', cleanReply);
    return finalReply;
  }

  return finalReply;
  } catch (err: any) {
    console.error('[System Error]:', err?.message);
    throw err;
  }
};