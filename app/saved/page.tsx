"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import EmptyState from "@/components/platform/EmptyState";
import ProfessionalFooter from "@/components/platform/ProfessionalFooter";
import ProfessionalHeader from "@/components/platform/ProfessionalHeader";
import { authenticatedFetch } from "@/lib/client/authenticatedFetch";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type SavedItem = {
  id: string;
  title: string;
  href: string;
  category?: string;
  type?: string;
  image?: string;
  meta?: string;
  entity_type?: string;
  entity_id?: string;
};

function readLocalItems() {
  try {
    const data = JSON.parse(localStorage.getItem("loadlink-liked-listings") || "[]");
    return Array.isArray(data) ? (data as SavedItem[]) : [];
  } catch {
    return [];
  }
}

export default function SavedPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    const local = readLocalItems();
    setItems(local);
    void authenticatedFetch("/api/saved-items")
      .then(async (response) => {
        if (response.status === 401) return null;
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Saved items could not be synchronized.");
        return payload;
      })
      .then((payload) => {
        if (!active || !payload) return;
        const remote = Array.isArray(payload.items) ? payload.items : [];
        const merged = [...remote, ...local.filter((localItem) => !remote.some((remoteItem: SavedItem) => remoteItem.id === localItem.id))];
        setItems(merged);
        localStorage.setItem("loadlink-liked-listings", JSON.stringify(merged));
      })
      .catch((error) => { if (active) setNotice(error instanceof Error ? error.message : "Saved items could not be synchronized."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function remove(item: SavedItem) {
    const next = items.filter((entry) => !(entry.id === item.id && (entry.entity_type || entry.type) === (item.entity_type || item.type)));
    setItems(next);
    localStorage.setItem("loadlink-liked-listings", JSON.stringify(next));
    window.dispatchEvent(new Event("loadlink-liked-listings-updated"));
    const entityType = item.entity_type || (item.category || item.type || "vehicle").toLowerCase();
    const entityId = item.entity_id || item.id;
    try {
      const response = await authenticatedFetch(`/api/saved-items?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`, { method: "DELETE" });
      if (response.status !== 401 && !response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Saved item could not be removed from your account.");
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Removed on this device, but account synchronization could not be confirmed.");
    }
  }

  const pageClass = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  return (
    <main className={`min-h-screen ${pageClass}`}>
      <ProfessionalHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
      <section className="px-5 py-12 md:px-12">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-black uppercase tracking-[.2em] text-[#b88900]">Account</p>
          <h1 className="mt-3 text-4xl font-black md:text-6xl">Saved on LoadLink</h1>
          <p className={`mt-3 max-w-2xl text-sm leading-7 ${darkMode ? "text-white/55" : "text-black/55"}`}>Signed-in saves follow your account across devices. Offline saves remain available on this device and synchronize after sign-in.</p>
          {notice ? <p role="alert" className="mt-5 rounded-xl border border-[#f6b800]/40 bg-[#f6b800]/10 p-4 text-sm font-bold">{notice}</p> : null}
          {loading && !items.length ? <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className={`h-72 animate-pulse rounded-[22px] ${darkMode ? "bg-white/5" : "bg-black/5"}`} />)}</div> : null}
          {items.length ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((item) => (
                <article key={`${item.entity_type || item.type || item.category || "saved"}-${item.id}`} className={`overflow-hidden rounded-[22px] border ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>
                  <Link href={item.href || "/"} className="block">
                    <div className="aspect-[4/3] bg-black/10">{item.image ? <img src={item.image} alt={item.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center font-black text-[#b88900]">LOADLINK</div>}</div>
                    <div className="p-4">
                      <p className="text-[10px] font-black uppercase text-[#b88900]">{item.category || item.type || item.entity_type || "Saved"}</p>
                      <h2 className="mt-2 text-lg font-black">{item.title}</h2>
                      <p className={`mt-2 text-xs ${darkMode ? "text-white/45" : "text-black/45"}`}>{item.meta || "Open saved item"}</p>
                    </div>
                  </Link>
                  <button type="button" onClick={() => void remove(item)} className="w-full border-t border-current/10 px-4 py-3 text-xs font-black uppercase">Remove</button>
                </article>
              ))}
            </div>
          ) : !loading ? <div className="mt-8"><EmptyState title="Nothing saved yet" body="Save vehicles, work opportunities, dealerships or driver profiles and they will appear here." actionLabel="Browse vehicles" actionHref="/vehicles" darkMode={darkMode} /></div> : null}
        </div>
      </section>
      <ProfessionalFooter darkMode={darkMode} />
    </main>
  );
}
