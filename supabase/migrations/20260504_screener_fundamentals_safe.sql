-- ============================================================
-- BIST Screener — GÜVENLİ versiyon (hatalara dayanıklı)
-- Bu SQL'i Supabase Dashboard SQL Editor'a yapıştır → Run
-- ============================================================

-- 1) Fundamentals tablosu
CREATE TABLE IF NOT EXISTS public.fundamentals (
  ticker TEXT PRIMARY KEY,
  company_name TEXT,
  sector TEXT,
  market_cap NUMERIC,
  pe_ratio NUMERIC,
  pb_ratio NUMERIC,
  ev_ebitda NUMERIC,
  ps_ratio NUMERIC,
  peg_ratio NUMERIC,
  roe NUMERIC,
  roa NUMERIC,
  net_margin NUMERIC,
  gross_margin NUMERIC,
  operating_margin NUMERIC,
  revenue_growth NUMERIC,
  earnings_growth NUMERIC,
  ebitda_growth NUMERIC,
  debt_equity NUMERIC,
  current_ratio NUMERIC,
  quick_ratio NUMERIC,
  net_debt_ebitda NUMERIC,
  dividend_yield NUMERIC,
  payout_ratio NUMERIC,
  dividend_growth_5y NUMERIC,
  current_price NUMERIC,
  price_change_1y NUMERIC,
  price_52w_high NUMERIC,
  price_52w_low NUMERIC,
  data_source TEXT DEFAULT 'yahoo',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Indeksler (varsa atlar)
CREATE INDEX IF NOT EXISTS idx_fundamentals_sector ON public.fundamentals(sector);
CREATE INDEX IF NOT EXISTS idx_fundamentals_market_cap ON public.fundamentals(market_cap);

-- 3) Preset tablosu
CREATE TABLE IF NOT EXISTS public.screener_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_presets_user ON public.screener_presets(user_id);

-- 4) RLS
ALTER TABLE public.fundamentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screener_presets ENABLE ROW LEVEL SECURITY;

-- 5) Policy'ler (varsa önce drop et) — ayrı ayrı blok
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'fundamentals'
      AND policyname = 'fundamentals_public_read'
  ) THEN
    DROP POLICY fundamentals_public_read ON public.fundamentals;
  END IF;
END $$;

CREATE POLICY fundamentals_public_read
  ON public.fundamentals FOR SELECT
  USING (TRUE);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'screener_presets'
      AND policyname = 'presets_owner_all'
  ) THEN
    DROP POLICY presets_owner_all ON public.screener_presets;
  END IF;
END $$;

CREATE POLICY presets_owner_all
  ON public.screener_presets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'screener_presets'
      AND policyname = 'presets_public_read'
  ) THEN
    DROP POLICY presets_public_read ON public.screener_presets;
  END IF;
END $$;

CREATE POLICY presets_public_read
  ON public.screener_presets FOR SELECT
  USING (is_public = TRUE);

-- ============================================================
-- BAŞARI! İki tablo + RLS hazır.
-- ============================================================
