import { Router, Request, Response } from 'express';
import { streamText, stepCountIs } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { createAllTools } from '../tools/registry';

export const chatRouter = Router();

// ────────────────────────────────────────────────────────────────────────────────
// JWT MIDDLEWARE
// ────────────────────────────────────────────────────────────────────────────────
interface JWTPayload {
  userId: string;
  chatId: string;
}

const verifyJWT = (req: Request, res: Response, next: any) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7); // Remove "Bearer "
  
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
    (req as any).user = decoded;
    next();
  } catch (error) {
    console.error('[JWT Error]:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// AI MODELS SETUP
// ────────────────────────────────────────────────────────────────────────────────
const aggregator = createOpenAI({
  baseURL: env.AGGREGATOR_BASE_URL,
  apiKey: env.AGGREGATOR_API_KEY,
});

const gemini = google('gemini-2.0-flash-lite');

// ────────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT
// ────────────────────────────────────────────────────────────────────────────────
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
13. Untuk web client, TIDAK ADA fitur watchlist, alert, atau portfolio - tools tersebut hanya untuk Telegram bot.
14. Jika pengguna bertanya tentang analisis teknikal, RSI, MACD, Moving Average, overbought/oversold, momentum, atau indikator teknikal suatu saham, gunakan get_technical_indicators.
15. PENTING - Smart Auto-trigger: Ketika pengguna meminta analisis mendalam/lengkap/komprehensif suatu saham, OTOMATIS sertakan get_stock_price, get_fundamentals, get_technical_indicators, DAN get_market_liquidity_flow untuk memberikan gambaran investasi yang komprehensif.`;
};

// ────────────────────────────────────────────────────────────────────────────────
// POST /api/chat — STREAMING ENDPOINT
// ────────────────────────────────────────────────────────────────────────────────
chatRouter.post('/chat', verifyJWT, async (req: Request, res: Response) => {
  try {
    const { message, messages = [] } = req.body;
    const user = (req as any).user as JWTPayload;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required and must be a string' });
    }

    console.log(`[API /chat] User: ${user.userId}, ChatId: ${user.chatId}, Message: ${message}`);

    // Build conversation history for context
    const conversationMessages = [
      ...messages.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })),
      { role: 'user' as const, content: message },
    ];

    // Create tools registry (web client doesn't need chatId for watchlist/alerts)
    const allTools = createAllTools('web-client');

    // Set response headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let usedFallback = false;

    try {
      // Try primary AI provider (Aggregator)
      const result = await streamText({
        model: aggregator.chat(env.AGGREGATOR_MODEL),
        system: getSystemPrompt(),
        messages: conversationMessages,
        tools: allTools,
        stopWhen: stepCountIs(3),
        maxRetries: 0,
      });

      // Stream response to client
      for await (const chunk of result.textStream) {
        res.write(`data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();

    } catch (primaryError: any) {
      console.error('[Aggregator Stream Error]:', primaryError?.message);
      console.log('[System] Switching to Gemini fallback...');
      
      usedFallback = true;

      try {
        // Fallback to Google Gemini
        const fallbackResult = await streamText({
          model: gemini,
          system: getSystemPrompt(),
          messages: conversationMessages,
          tools: allTools,
          stopWhen: stepCountIs(3),
          maxRetries: 0,
        });

        // Stream fallback response
        for await (const chunk of fallbackResult.textStream) {
          res.write(`data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`);
        }

        res.write(`data: ${JSON.stringify({ type: 'done', fallback: true })}\n\n`);
        res.end();

        console.log('[System] Gemini fallback succeeded');

      } catch (fallbackError: any) {
        console.error('[Gemini Fallback Error]:', fallbackError?.message);
        
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          content: '⚠️ Layanan AI sedang mengalami gangguan. Silakan coba lagi dalam beberapa saat.' 
        })}\n\n`);
        res.end();
      }
    }

  } catch (error: any) {
    console.error('[API Error]:', error);
    
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: 'Internal server error', 
        message: error.message 
      });
    }
  }
});

// ────────────────────────────────────────────────────────────────────────────────
// GET /api/health — HEALTH CHECK
// ────────────────────────────────────────────────────────────────────────────────
chatRouter.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'IHSG Analytics Bot API',
  });
});

export default chatRouter;
