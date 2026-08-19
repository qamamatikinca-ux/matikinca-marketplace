"use client";

import { useEffect, useState } from "react";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [allowed, setAllowed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!isSupabaseConfigured) {
        window.location.replace("/");
        return;
      }

      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) {
        window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }

      const role = await supabase.rpc("loadlink_phase2_admin_role");
      if (!active) return;
      const value = String(role.data || "").trim().toLowerCase();
      if (role.error || !value) {
        window.location.replace("/");
        return;
      }

      setAllowed(true);
      setChecked(true);
    })().catch(() => {
      if (active) window.location.replace("/");
    });

    return () => { active = false; };
  }, []);

  if (!checked || !allowed) {
    return <main className="min-h-screen bg-[#f4f2eb] text-black"><LoadLinkLoading /></main>;
  }

  return children;
}
