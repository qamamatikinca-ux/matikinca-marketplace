"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { isAuthenticatedUser, loginHref } from "@/lib/auth";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

export default function MyPostsLauncher() {
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (pathname !== "/jobs" || loading) return null;

  const signedIn = isAuthenticatedUser(user);
  return (
    <Link
      href={signedIn ? "/my-posts" : loginHref("/my-posts")}
      aria-label={signedIn ? "Open my posts" : "Sign in to open my posts"}
      className="fixed bottom-[9.75rem] right-5 z-[69] flex min-h-12 items-center gap-2 rounded-full border border-[#f6b800] bg-black px-4 text-xs font-black uppercase tracking-[0.1em] text-[#f6b800] shadow-2xl transition active:scale-95"
    >
      <PostsIcon />
      <span>My posts</span>
    </Link>
  );
}

function PostsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 4h10a2 2 0 0 1 2 2v14H5V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" />
      <path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
