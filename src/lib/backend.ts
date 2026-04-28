import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Fallback boş bırakıldı; build edilen kodda VITE_SUPABASE_URL/KEY env değişkenleri kullanılır.
// (Önceki Lovable backend fallback'leri kaldırıldı.)
const FALLBACK_BACKEND_URL = "";
const FALLBACK_BACKEND_KEY = "";

const backendUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_BACKEND_URL;
const backendKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_BACKEND_KEY;

export const hasBackend = Boolean(backendUrl && backendKey);

export const supabase = createClient<Database>(backendUrl, backendKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});