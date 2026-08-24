"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type HostState = { host: HTMLElement; slug: string } | null;

export default function LoadLinkDealershipOwnerEdit20260823() {
  const pathname = usePathname();
  const [state, setState] = useState<HostState>(null);

  useEffect(() => {
    const match = pathname.match(/^\/dealership\/([^/]+)$/);
    if (!match) { setState(null); return; }
    const slug = decodeURIComponent(match[1]);
    let alive = true;
    let timer = 0;

    async function mount() {
      const { data: auth } = await supabase.auth.getUser();
      if (!alive || !auth.user) return;
      const result = await supabase.from("dealership_profiles").select("id,owner_user_id,slug").eq("slug", slug).maybeSingle();
      if (!alive || result.error || !result.data || String(result.data.owner_user_id || "") !== auth.user.id) return;

      const tryHost = () => {
        if (!alive) return;
        const hero = document.querySelector<HTMLElement>('html[data-loadlink-route^="dealership/"] main > div > section:first-of-type') || document.querySelector<HTMLElement>("main section");
        if (!hero) { timer = window.setTimeout(tryHost, 250); return; }
        hero.style.position = "relative";
        let host = hero.querySelector<HTMLElement>('[data-loadlink-owner-edit-host="true"]');
        if (!host) { host = document.createElement("div"); host.dataset.loadlinkOwnerEditHost = "true"; hero.appendChild(host); }
        setState({ host, slug });
      };
      tryHost();
    }

    void mount();
    return () => { alive = false; window.clearTimeout(timer); setState((current) => { current?.host.remove(); return null; }); };
  }, [pathname]);

  if (!state) return null;
  return createPortal(
    <Link
      href="/dealer?section=showroom"
      data-loadlink-owner-edit-pencil="true"
      className="absolute bottom-4 right-4 z-30 inline-flex min-h-10 items-center gap-2 rounded-full border border-white/16 bg-black/62 px-3.5 text-[11px] font-black text-white shadow-[0_10px_30px_rgba(0,0,0,.24)] backdrop-blur-xl transition hover:bg-black/78 active:scale-[.98] sm:bottom-5 sm:right-5"
      aria-label="Edit your dealership showroom"
      title="Edit showroom"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 19 1-4 9.8-9.8a2.1 2.1 0 0 1 3 3L9 18l-4 1Z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><path d="m14.5 6.5 3 3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/></svg>
      <span>Edit showroom</span>
    </Link>,
    state.host,
  );
}
