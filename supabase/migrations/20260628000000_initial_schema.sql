-- ====================================================================
-- IHSG Bot - Initial Database Schema
-- Migration: 20260628000000_initial_schema
-- Description: Create portfolio, watchlist, and alerts tables with RLS
-- ====================================================================

-- ────────────────────────────────────────────────────────────────────
-- Table: portfolio
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE portfolio (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  chat_id       TEXT NOT NULL,
  symbol        TEXT NOT NULL,
  average_price NUMERIC NOT NULL,
  total_lot     INTEGER NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────
-- Table: watchlist
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE watchlist (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  chat_id    TEXT NOT NULL,
  symbol     TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────
-- Table: alerts
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE alerts (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  chat_id      TEXT NOT NULL,
  symbol       TEXT NOT NULL,
  target_price NUMERIC NOT NULL,
  condition    TEXT NOT NULL CHECK (condition IN ('ABOVE', 'BELOW')),
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────
-- Indexes for Performance Optimization
-- ────────────────────────────────────────────────────────────────────
CREATE INDEX idx_portfolio_chat_id ON portfolio(chat_id);
CREATE INDEX idx_portfolio_chat_id_symbol ON portfolio(chat_id, symbol);

CREATE INDEX idx_watchlist_chat_id ON watchlist(chat_id);
CREATE INDEX idx_watchlist_chat_id_symbol ON watchlist(chat_id, symbol);

CREATE INDEX idx_alerts_chat_id ON alerts(chat_id);
CREATE INDEX idx_alerts_chat_id_symbol ON alerts(chat_id, symbol);

-- ────────────────────────────────────────────────────────────────────
-- Row Level Security (RLS)
-- Note: Service role key bypasses RLS automatically
-- ────────────────────────────────────────────────────────────────────
ALTER TABLE portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
