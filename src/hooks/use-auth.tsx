import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/sports";

interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  displayName: string | null;
  loading: boolean;
  isAdmin: boolean;
  canRecord: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

async function loadRole(userId: string): Promise<AppRole | null> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role);
  if (roles.includes("admin")) return "admin";
  if (roles.includes("recorder")) return "recorder";
  if (roles.includes("viewer")) return "viewer";
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    let active = true;

    const apply = async (s: Session | null) => {
      setSession(s);
      if (s?.user) {
        const r = await loadRole(s.user.id);
        if (active) setRole(r);
      } else {
        setRole(null);
      }
      if (active) setLoading(false);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "TOKEN_REFRESHED") {
        setSession(s);
        return;
      }
      // Defer role lookup so it doesn't run inside the auth callback.
      setTimeout(() => apply(s), 0);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        router.invalidate();
      }
    });

    supabase.auth.getSession().then(({ data }) => apply(data.session));

    // Role changes made by an admin show up without signing out.
    const channel = supabase
      .channel(`roles-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, async () => {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user && active) setRole(await loadRole(data.session.user.id));
      })
      .subscribe();

    return () => {
      active = false;
      sub.subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    queryClient.removeQueries({ queryKey: ["admin"] });
  };

  const user = session?.user ?? null;
  const meta = user?.user_metadata as { display_name?: string; full_name?: string } | undefined;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        displayName: meta?.display_name ?? meta?.full_name ?? user?.email?.split("@")[0] ?? null,
        loading,
        isAdmin: role === "admin",
        canRecord: role === "admin" || role === "recorder",
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
