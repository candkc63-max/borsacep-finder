-- =============================================================================
-- BIST Temel Analiz Screener tabloları
-- Çalıştırma: Supabase Dashboard → SQL Editor → bunu yapıştır → Run
-- =============================================================================

-- 1) Fundamentals tablosu (BIST hisselerinin temel verileri)
CREATE TABLE IF NOT EXISTS public.fundamentals (
  ticker TEXT PRIMARY KEY,
  company_name TEXT,
  sector TEXT,
  market_cap NUMERIC,

  -- Değerleme
  pe_ratio NUMERIC,
  pb_ratio NUMERIC,
  ev_ebitda NUMERIC,
  ps_ratio NUMERIC,
  peg_ratio NUMERIC,

  -- Karlılık (yüzde)
  roe NUMERIC,
  roa NUMERIC,
  net_margin NUMERIC,
  gross_margin NUMERIC,
  operating_margin NUMERIC,

  -- Büyüme (yıllık %)
  revenue_growth NUMERIC,
  earnings_growth NUMERIC,
  ebitda_growth NUMERIC,

  -- Bilanço sağlığı
  debt_equity NUMERIC,
  current_ratio NUMERIC,
  quick_ratio NUMERIC,
  net_debt_ebitda NUMERIC,

  -- Temettü
  dividend_yield NUMERIC,
  payout_ratio NUMERIC,
  dividend_growth_5y NUMERIC,

  -- Fiyat
  current_price NUMERIC,
  price_change_1y NUMERIC,
  price_52w_high NUMERIC,
  price_52w_low NUMERIC,

  -- Meta
  data_source TEXT DEFAULT 'yahoo',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fundamentals_sector ON public.fundamentals(sector);
CREATE INDEX IF NOT EXISTS idx_fundamentals_market_cap ON public.fundamentals(market_cap);
CREATE INDEX IF NOT EXISTS idx_fundamentals_updated ON public.fundamentals(updated_at);

-- 2) Kullanıcı preset'leri (kayıtlı filtreler)
CREATE TABLE IF NOT EXISTS public.screener_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_presets_user ON public.screener_presets(user_id);

-- 3) Row Level Security
ALTER TABLE public.fundamentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screener_presets ENABLE ROW LEVEL SECURITY;

-- Fundamentals: herkes okuyabilir (auth gerekmez — public veri)
DROP POLICY IF EXISTS "Public read fundamentals" ON public.fundamentals;
CREATE POLICY "Public read fundamentals"
  ON public.fundamentals FOR SELECT
  USING (TRUE);

-- Fundamentals: sadece service_role yazabilir (edge function ile)
-- (RLS bypass service_role için zaten otomatik)

-- Presets: kullanıcı sadece kendi preset'lerini görür ve yönetir
DROP POLICY IF EXISTS "Users own presets" ON public.screener_presets;
CREATE POLICY "Users own presets"
  ON public.screener_presets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Public preset'ler herkes okuyabilir
DROP POLICY IF EXISTS "Public read public presets" ON public.screener_presets;
CREATE POLICY "Public read public presets"
  ON public.screener_presets FOR SELECT
  USING (is_public = TRUE);

-- =============================================================================
-- BAŞARI! Sıradaki adım: Edge function deploy edilecek (ben yapacağım).
-- =============================================================================
