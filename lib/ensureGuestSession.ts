import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

export async function ensureGuestSession(): Promise<User> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not connected to this deployment.");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user) return session.user;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    throw new Error(
      error?.message ||
        "Guest messaging is not enabled yet. Enable Anonymous Sign-Ins in Supabase Authentication settings."
    );
  }

  return data.user;
}
