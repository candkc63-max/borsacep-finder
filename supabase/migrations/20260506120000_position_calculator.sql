-- Pro üyelik alanı (varsayılan: free)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free';

COMMENT ON COLUMN public.profiles.subscription_tier IS 'free | pro — Pro araç kayıtları için';

-- Pozisyon hesaplayıcı kayıtları (Pro)
CREATE TABLE IF NOT EXISTS public.position_calculator_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_size NUMERIC NOT NULL,
  risk_pct NUMERIC NOT NULL,
  entry NUMERIC NOT NULL,
  stop NUMERIC NOT NULL,
  target NUMERIC NOT NULL,
  symbol TEXT,
  results JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS position_calculator_saves_user_created_idx
  ON public.position_calculator_saves (user_id, created_at DESC);

ALTER TABLE public.position_calculator_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "position_calc_insert_own"
  ON public.position_calculator_saves FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "position_calc_select_own"
  ON public.position_calculator_saves FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
