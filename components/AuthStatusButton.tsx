"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { isAuthenticatedUser, loginHref } from "@/lib/auth";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import LoadLinkGearIcon from "@/components/LoadLinkGearIcon";

export default function AuthStatusButton({
  darkMode,
  className = "",
}: {
  darkMode: boolean;
  className?: string;
}) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const base = `relative flex h-10 w-10 items-center justify-center rounded-full border transition active:scale-[0.97] ${className}`;

  if (loading) {
    return (
      <span
        aria-label="Checking sign-in status"
        className={`${base} ${darkMode ? "border-white/15 bg-white/5" : "border-black/10 bg-white"}`}
      >
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-45" />
      </span>
    );
  }

  if (isAuthenticatedUser(user)) {
    const email = user.email || "your Google account";
    return (
      <Link
        href="/account/settings"
        aria-label={`Signed in as ${email}. Open profile settings`}
        title={`Signed in as ${email}. Open profile settings`}
        className={`${base} border-[#f6b800]/55 bg-black text-[#f6b800] shadow-[0_8px_20px_rgba(0,0,0,.14)]`}
      >
        <LoadLinkGearIcon />
      </Link>
    );
  }

  return (
    <Link
      href={loginHref(pathname || "/")}
      aria-label="Log in or sign up"
      title="Log in / Sign up"
      className={`${base} ${
        darkMode
          ? "border-yellow-400/60 bg-yellow-400 text-black shadow-[0_0_14px_rgba(246,184,0,0.2)]"
          : "border-black/10 bg-white text-black shadow-[0_8px_18px_rgba(0,0,0,0.08)]"
      }`}
    >
      <img src="/images/auth-icon.png" alt="" className="h-6 w-6 object-contain" />
    </Link>
  );
}
