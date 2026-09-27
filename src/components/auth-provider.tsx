"use client";

import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import type { Couple, Profile } from "@/lib/types";

type Snapshot = {
  session: Session | null;
  profile: Profile | null;
  couple: Couple | null;
  partner: Profile | null;
};

type AuthState = Snapshot & {
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const EMPTY: Snapshot = { session: null, profile: null, couple: null, partner: null };
const PROFILE_COLUMNS = "id, display_name, avatar_url, couple_id";
const PENDING_INVITE_KEY = "pendingInviteToken";

const AuthContext = createContext<AuthState | null>(null);

export function getPendingInvite(): string | null {
  try {
    return localStorage.getItem(PENDING_INVITE_KEY);
  } catch {
    return null;
  }
}

export function setPendingInvite(token: string | null) {
  try {
    if (token) localStorage.setItem(PENDING_INVITE_KEY, token);
    else localStorage.removeItem(PENDING_INVITE_KEY);
  } catch {}
}

export function afterAuthPath(): string {
  const token = getPendingInvite();
  return token ? `/convite/?token=${encodeURIComponent(token)}` : "/inicio/";
}

async function loadSnapshot(session: Session | null): Promise<Snapshot> {
  if (!session) return EMPTY;
  const db = supabase();
  const { data: profile } = await db
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", session.user.id)
    .single();
  if (!profile?.couple_id) return { session, profile, couple: null, partner: null };

  const [{ data: couple }, { data: partner }] = await Promise.all([
    db.from("couples").select("id, together_since, created_by").eq("id", profile.couple_id).single(),
    db
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("couple_id", profile.couple_id)
      .neq("id", session.user.id)
      .maybeSingle(),
  ]);
  return { session, profile, couple, partner };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY);

  useEffect(() => {
    const db = supabase();
    let active = true;

    const apply = async (session: Session | null) => {
      const next = await loadSnapshot(session);
      if (!active) return;
      setSnapshot(next);
      setLoading(false);
    };

    db.auth.getSession().then(({ data }) => apply(data.session));

    const { data: sub } = db.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      if (event === "TOKEN_REFRESHED") {
        setSnapshot((s) => ({ ...s, session }));
        return;
      }
      // Deferred: awaiting Supabase calls inside this callback can deadlock the auth lock.
      setTimeout(() => void apply(session), 0);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await supabase().auth.getSession();
    setSnapshot(await loadSnapshot(data.session));
  }, []);

  const signOut = useCallback(async () => {
    await supabase().auth.signOut();
    setSnapshot(EMPTY);
  }, []);

  const value = useMemo(
    () => ({ ...snapshot, loading, refresh, signOut }),
    [snapshot, loading, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

// Only for pages under the hub layout, which renders children once a couple exists.
export function useCouple() {
  const auth = useAuth();
  if (!auth.session || !auth.profile || !auth.couple) {
    throw new Error("useCouple used outside a ready hub");
  }
  return {
    ...auth,
    session: auth.session,
    profile: auth.profile,
    couple: auth.couple,
    userId: auth.session.user.id,
  };
}
