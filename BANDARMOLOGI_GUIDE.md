# 📊 Panduan Bandarmologi & Foreign Flow Analysis

> **Phase 2 Feature**: Institutional Trading Pattern Detection & Foreign Capital Tracking

Panduan lengkap untuk memahami dan menggunakan fitur analisis bandarmologi dan foreign flow di IHSG Analytics Bot.

---

## 📑 Daftar Isi

1. [Pengenalan](#pengenalan)
2. [Cara Menggunakan](#cara-menggunakan)
3. [Sistem Klasifikasi](#sistem-klasifikasi)
4. [Interpretasi Hasil](#interpretasi-hasil)
5. [Contoh Penggunaan](#contoh-penggunaan)
6. [Technical Reference](#technical-reference)
7. [FAQ & Troubleshooting](#faq--troubleshooting)

---

## 🎯 Pengenalan

### Apa itu Bandarmologi?

**Bandarmologi** adalah analisis aktivitas broker sekuritas untuk mendeteksi pola akumulasi atau distribusi saham oleh institusi besar.

**Mengapa Penting:**
- 🎯 Smart Money Tracking - Institusi biasanya memiliki informasi lebih mendalam
- 📈 Early Signal Detection - Pola akumulasi sering terjadi sebelum kenaikan harga
- ⚠️ Risk Management - Pola distribusi sebagai warning signal

### Apa itu Foreign Flow?

**Foreign Flow** adalah tracking aliran modal asing masuk atau keluar dari suatu saham dalam 3 timeframe:
- **1-Day**: Snapshot harian
- **5-Day**: Tren mingguan  
- **20-Day**: Tren bulanan

**Mengapa Penting:**
- 💪 Capital Strength - Investor asing biasanya modal besar
- ✅ Trend Confirmation - Foreign inflow konsisten = bullish signal kuat
- 🌡️ Sentiment Gauge - Foreign outflow = warning signal

---

## 🚀 Cara Menggunakan

### Query Eksplisit

```
✅ "bandarmologi BBCA"
✅ "foreign flow TLKM"
✅ "asing masuk BBRI?"
✅ "bandar akumulasi ASII?"
✅ "liquidity flow UNTR"
```

### Smart Auto-Trigger

Analisis lengkap otomatis menggabungkan price + fundamentals + technical + liquidity flow:

```
✅ "analisa lengkap BBCA"
✅ "cek TLKM secara detail"
✅ "gimana kondisi BBRI sekarang?"
```

---

## 📊 Sistem Klasifikasi

### Klasifikasi Broker

| Classification | Score | Interpretasi |
|----------------|-------|-------------|
| **BIG ACCUMULATION** | ≥ 55% | Top 3 broker pembeli dominan - bandar sedang mengumpulkan |
| **NEUTRAL** | 45-54% | Volume seimbang - pasar wait-and-see |
| **BIG DISTRIBUTION** | ≤ 45% | Top 3 broker penjual dominan - bandar sedang melepas |

**Formula:**
```
Accumulation Score = (Top 3 Buy Volume / Total Top Volume) × 100%
```

### Klasifikasi Foreign Flow

| Trend | Kondisi | Interpretasi |
|-------|---------|-------------|
| **STRONG INFLOW** | All timeframes INFLOW + Monthly > 20B | Asing akumulasi konsisten - sangat bullish |
| **MODERATE INFLOW** | Weekly/Monthly INFLOW | Asing mulai masuk - positif |
| **NEUTRAL** | Mixed signals | Asing wait-and-see |
| **MODERATE OUTFLOW** | Weekly/Monthly OUTFLOW | Asing mulai keluar - warning |
| **STRONG OUTFLOW** | All timeframes OUTFLOW + Monthly < -20B | Asing distribusi konsisten - bearish |

---

## 🔍 Interpretasi Hasil

### Overall Sentiment

| Sentiment | Score | Investment Action |
|-----------|-------|-------------------|
| **VERY BULLISH** | +3 to +4 | ✅ Strong BUY signal |
| **BULLISH** | +1 to +2 | ✅ Accumulate on dips |
| **NEUTRAL** | 0 | ⚪ Wait & see |
| **BEARISH** | -1 to -2 | ⚠️ Caution - avoid averaging |
| **VERY BEARISH** | -3 to -4 | 🚨 Strong SELL signal |

**Scoring System:**
```
Base = 0
BIG ACCUMULATION: +2
BIG DISTRIBUTION: -2
STRONG INFLOW: +2
MODERATE INFLOW: +1
MODERATE OUTFLOW: -1
STRONG OUTFLOW: -2
```

---

## 💡 Contoh Penggunaan

### Contoh 1: VERY BULLISH Scenario

**Input:** `bandarmologi BBCA`

**Output:**
```
📊 ANALISIS LIQUIDITY FLOW - BBCA
SENTIMEN INSTITUSIONAL: VERY_BULLISH

🏦 BANDARMOLOGI
🟢 AKUMULASI KUAT terdeteksi!
Top 3 broker pembeli dominasi 73.2% dari total volume.

Top Buyers:
1. AA - Volume Buy: 5,000,000 lot
2. BB - Volume Buy: 4,500,000 lot
3. CC - Volume Buy: 4,000,000 lot

🌍 FOREIGN FLOW
🟢 FOREIGN BUYING SANGAT KUAT!
• Harian: Rp 5,000,000,000 (Net Buy)
• Mingguan: Rp 30,000,000,000 (Net Buy)
• Bulanan: Rp 150,000,000,000 (Net Buy)

💡 KESIMPULAN
✅ Sinyal SANGAT BULLISH! Institusi besar sedang akumulasi agresif.
```

### Contoh 2: Smart Auto-Trigger

**Input:** `analisa lengkap ASII`

**Output:** Bot otomatis menggabungkan 4 analisis:
1. ✅ Price & Movement
2. ✅ Fundamentals (PER, PBV, ROE)
3. ✅ Technical Indicators (RSI, MACD, MA)
4. ✅ Liquidity Flow (NEW!)

---

## 🔧 Technical Reference

### API Integration

| Data Source | Endpoint | Cache |
|-------------|----------|-------|
| Broker Summary | `/stock/idx/{symbol}/broker_summary` | 10 min |
| Foreign Flow | `/stock/idx/{symbol}/foreign` | 10 min |

### Performance

- ⚡ **Parallel Fetching**: Broker + Foreign data fetched simultaneously
- 🚀 **Cache Hit Rate**: ~80% with 10-minute TTL
- 🛡️ **Graceful Degradation**: Analysis continues even if one endpoint fails

### Logging

Monitor via console:
```
[Bandar Engine] Starting broker summary analysis...
[Bandar Engine] Classification: BIG_ACCUMULATION
[Bandar Tool] Cache MISS: liquidity_BBCA_2026-07-01
[Bandar Tool] Analysis complete: Sentiment=VERY_BULLISH
```

---

## ❓ FAQ & Troubleshooting

### Q: Apakah data real-time?

**A:** Data adalah end-of-day (EOD) yang di-update setiap hari setelah market close. Cache 10 menit memastikan freshness untuk analisis intraday.

### Q: Kenapa muncul warning "Volume trading rendah"?

**A:** Total volume < 1 juta lot bisa kurang reliable. Tunggu volume meningkat atau cross-check dengan analisis lain.

### Q: Akumulasi bandar = pasti naik?

**A:** **TIDAK SELALU!** Selalu combine dengan:
- ✅ Fundamental Analysis
- ✅ Technical Analysis
- ✅ Market Sentiment
- ✅ Risk Management (stop loss)

### Q: Error "Gagal mengambil data liquidity flow"?

**Troubleshooting:**
1. Pastikan kode saham benar (4 huruf, terdaftar di BEI)
2. Tunggu beberapa menit jika rate limit
3. Check koneksi internet
4. Test dengan saham populer (BBCA, TLKM)

### Q: Kapan waktu terbaik cek bandarmologi?

**A:** 
- 🕐 **After market close (16:00)** - Data paling fresh
- 🌅 **Pagi (08:00-09:00)** - Planning sebelum trading
- 📅 **Weekend** - Review trend 5-day dan 20-day

---

## 🎓 Tips & Best Practices

### ✅ DO's

1. Combine dengan analisis lain (fundamental + technical)
2. Check multiple stocks untuk compare
3. Monitor consistency di 20-day trend
4. Use for entry confirmation
5. Selalu set stop loss

### ❌ DON'Ts

1. Jangan FOMO masuk saat sudah naik banyak
2. Jangan ignore fundamentals
3. Jangan overtrade (cache 10 menit cukup)
4. Jangan average down saat BIG DISTRIBUTION
5. Jangan gunakan sebagai satu-satunya indikator

---

## 📞 Support

- **GitHub**: [Issues](https://github.com/prstyaDev/ishg-bot/issues)
- **Telegram**: [@prstyaDev](https://t.me/prstyaDev)

---

## 📄 Changelog

### Phase 2 (July 2026)
- ✅ Broker classification: ACCUMULATION/DISTRIBUTION/NEUTRAL
- ✅ Foreign flow tracking: 1d/5d/20d timeframes
- ✅ Overall sentiment: VERY_BULLISH to VERY_BEARISH
- ✅ Smart auto-trigger for comprehensive analysis
- ✅ 10-minute caching for rate optimization

---

**Selamat menggunakan fitur Bandarmologi & Foreign Flow!** 🚀📈

*"Follow the smart money, but always DYOR (Do Your Own Research)"*
