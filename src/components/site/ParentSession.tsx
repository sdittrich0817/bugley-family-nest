import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isActiveParent } from "@/lib/parent-auth";

const ParentContext = createContext<{ user: User | null; loading: boolean; signOut: () => Promise<void> }>({ user: null, loading: true, signOut: async () => {} });
export const useParentSession = () => useContext(ParentContext);
export function ParentSessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(() => {
    let mounted = true;
    let generation = 0;
    async function refresh() {
      const current = ++generation;
      const { data } = await supabase.auth.getUser();
      if (mounted && current === generation) { setUser(isActiveParent(data.user) ? data.user : null); setLoading(false); }
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      if (event === "SIGNED_OUT") { ++generation; setUser(null); setLoading(false); }
      else { void refresh(); void queryClient.invalidateQueries(); }
      void router.invalidate();
    });
    void refresh();
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [router, queryClient]);
  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    await router.navigate({ to: "/login", replace: true });
  }
  return <ParentContext.Provider value={{ user, loading, signOut }}>{children}</ParentContext.Provider>;
}