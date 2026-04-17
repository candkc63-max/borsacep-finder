import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const hasBackend = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe = () => {};

    if (!hasBackend) {
      setUser(null);
      setLoading(false);
      return;
    }

    import("@/integrations/supabase/client")
      .then(({ supabase }) => {
        if (!isMounted) return;

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!isMounted) return;
          setUser(session?.user ?? null);
          setLoading(false);
        });

        unsubscribe = () => subscription.unsubscribe();

        return supabase.auth.getSession()
          .then(({ data: { session } }) => {
            if (!isMounted) return;
            setUser(session?.user ?? null);
            setLoading(false);
          });
      })
      .catch(() => {
        if (!isMounted) return;
        setUser(null);
        setLoading(false);
      });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [hasBackend]);

  const signOut = async () => {
    if (!hasBackend) {
      setUser(null);
      return;
    }

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch {
      toast.error("Çıkış yapılamadı. Lütfen tekrar deneyin.");
    }
  };

  return { user, loading, signOut };
}
