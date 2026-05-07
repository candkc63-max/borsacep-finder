import { useEffect, useState } from "react";
import { hasBackend, supabase } from "@/lib/backend";
import { useAuth } from "@/hooks/useAuth";

/**
 * profiles.subscription_tier — 'pro' ise Pro özellikleri açılır.
 * Migration uygulanmamışsa veya satır yoksa free kabul edilir.
 */
export function useSubscriptionTier() {
  const { user, loading: authLoading } = useAuth();
  const [isPro, setIsPro] = useState(false);
  const [tierLoading, setTierLoading] = useState(true);

  useEffect(() => {
    if (!hasBackend) {
      setIsPro(false);
      setTierLoading(false);
      return;
    }

    if (authLoading) {
      return;
    }

    if (!user) {
      setIsPro(false);
      setTierLoading(false);
      return;
    }

    let cancelled = false;
    setTierLoading(true);

    supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setIsPro(false);
        } else {
          setIsPro(data.subscription_tier === "pro");
        }
        setTierLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const loading = !hasBackend ? false : authLoading || tierLoading;

  return { isPro, loading };
}
