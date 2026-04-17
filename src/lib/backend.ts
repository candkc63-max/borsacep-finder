import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const FALLBACK_BACKEND_URL = "https://nrhqatrytewfikqtpvjs.supabase.co";
const FALLBACK_BACKEND_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yaHFhdHJ5dGV3ZmlrcXRwdmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMjQ4MTMsImV4cCI6MjA5MTYwMDgxM30.XLs6qa66Dqx82AdlN3Gjpk7WBxotqbwBFHuwL2BcUMk";

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