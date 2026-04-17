import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { hasBackend, supabase } from "@/lib/backend";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe = () => {};

    if (!hasBackend) {
      setUser(null);
      setLoading(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    unsubscribe = () => subscription.unsubscribe();

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!isMounted) return;
        setUser(session?.user ?? null);
        setLoading(false);
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
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch {
      toast.error("Çıkış yapılamadı. Lütfen tekrar deneyin.");
    }
  };

  return { user, loading, signOut };
}
