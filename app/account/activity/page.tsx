"use client";

import { useEffect, useMemo, useState } from "react";
import AuthStatusButton from "@/components/AuthStatusButton";
import HomeLogoLink from "@/components/HomeLogoLink";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import SiteMenu from "@/components/SiteMenu";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type DeviceRow = { id: string; device_id: string; label: string; browser: string | null; platform: string | null; first_seen: string; last_seen: string };
type ActivityRow = { id: string; activity_type: string; entity_type: string; entity_id: string | null; metadata: Record<string, unknown> | null; created_at: string };
type BillingRow = { id: string; item_type: string; item_code: string | null; amount_cents: number; currency: string; status: string; reference: string | null; created_at: string };

const DEVICE_KEY = "loadlink-device-id-v1";

function currentDeviceId() {
  try { return window.localStorage.getItem(DEVICE_KEY) || ""; } catch { return ""; }
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function money(cents: number, currency = "ZAR") {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency }).format((Number(cents) || 0) / 100);
}

export default function AccountActivityPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [events, setEvents] = useState<ActivityRow[]>([]);
  const [billing, setBilling] = useState<BillingRow[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [signingOutOthers, setSigningOutOthers] = useState(false);
  const [notice, setNotice] = useState("");

  const page = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const card = darkMode ? "border-white/10 bg-[#0d0d0d]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/52" : "text-black/52";

  async function load() {
    setLoading(true);
    setError("");
    try {
      if (!isSupabaseConfigured) throw new Error("LoadLink account services are not connected on this deployment.");
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user || user.is_anonymous) { window.location.href = `/login?next=${encodeURIComponent("/account/activity")}`; return; }
      setDeviceId(currentDeviceId());

      const [deviceResult, eventResult, billingResult] = await Promise.all([
        supabase.from("loadlink_account_devices").select("id,device_id,label,browser,platform,first_seen,last_seen").eq("user_id", user.id).order("last_seen", { ascending: false }).limit(20),
        supabase.from("user_activity_events").select("id,activity_type,entity_type,entity_id,metadata,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("billing_history").select("id,item_type,item_code,amount_cents,currency,status,reference,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
      ]);

      if (!deviceResult.error) setDevices((deviceResult.data || []) as DeviceRow[]);
      if (!eventResult.error) setEvents((eventResult.data || []) as ActivityRow[]);
      if (!billingResult.error) setBilling((billingResult.data || []) as BillingRow[]);
      if (deviceResult.error && /does not exist|schema cache/i.test(deviceResult.error.message)) setError("Run the latest LoadLink activity SQL once to enable device history.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Account activity could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const loginEvents = useMemo(() => events.filter((event) => event.activity_type === "login"), [events]);
  const otherEvents = useMemo(() => events.filter((event) => event.activity_type !== "login").slice(0, 12), [events]);

  function handleSignOutOtherDevices(): void { void signOutOtherDevices(); }

  async function signOutOtherDevices() {
    if (signingOutOthers) return;
    setSigningOutOthers(true);
    setNotice("");
    try {
      const result = await supabase.auth.signOut({ scope: "others" });
      if (result.error) throw result.error;
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) await supabase.from("loadlink_account_devices").delete().eq("user_id", userData.user.id).neq("device_id", deviceId || "__current__");
      setDevices((current) => current.filter((device) => device.device_id === deviceId));
      setNotice("Other LoadLink sessions were signed out.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Other sessions could not be signed out.");
    } finally {
      setSigningOutOthers(false);
    }
  }

  return (
    <main className={`min-h-screen ${page}`}>
      <header className={`sticky top-0 z-40 border-b ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}>
        <div className="grid h-20 grid-cols-[92px_1fr_52px] items-center px-4 md:px-7">
          <div className="flex items-center gap-2"><SiteMenu darkMode={darkMode} /><AuthStatusButton darkMode={darkMode} /></div>
          <HomeLogoLink theme={darkMode ? "dark" : "light"} />
          <LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme} className="ml-auto" />
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-20 pt-7 md:px-7 md:pt-11">
        <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#b88900]">Account security</p><h1 className="mt-2 text-4xl font-black tracking-[-.055em] md:text-6xl">Activity & access</h1><p className={`mt-3 max-w-2xl text-sm font-semibold leading-6 md:text-base ${muted}`}>A clear record of account access, recent devices and LoadLink payments. Private to your signed-in account.</p></div>

        {error ? <div className="mt-5 rounded-2xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-500">{error}</div> : null}
        {notice ? <div className="mt-5 rounded-2xl border border-[#f6b800]/30 bg-[#f6b800]/10 px-4 py-3 text-xs font-bold text-[#b88900]">{notice}</div> : null}

        <div className="mt-7 grid gap-4 md:grid-cols-[1.05fr_.95fr]">
          <section className={`overflow-hidden rounded-[28px] border ${card}`}>
            <div className={`flex items-start justify-between gap-4 border-b p-5 ${darkMode ? "border-white/10" : "border-black/10"}`}><div><p className="text-[10px] font-black uppercase tracking-[.13em] text-[#b88900]">Devices</p><h2 className="mt-1 text-2xl font-black tracking-[-.035em]">Recent signed-in devices</h2><p className={`mt-1 text-xs font-semibold leading-5 ${muted}`}>Devices that recently accessed this LoadLink account.</p></div><button type="button" onClick={handleSignOutOtherDevices} disabled={signingOutOthers || loading} className={`min-h-10 shrink-0 rounded-xl border px-3 text-[10px] font-black ${darkMode ? "border-white/12" : "border-black/10"}`}>{signingOutOthers ? "Signing out…" : "Sign out others"}</button></div>
            {loading ? <LoadingRows darkMode={darkMode} /> : devices.length ? <div className="divide-y divide-current/10">{devices.map((device) => { const current = device.device_id === deviceId; return <div key={device.id} className="flex items-center gap-4 p-4 md:p-5"><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${current ? "bg-[#f6b800] text-black" : "bg-black text-[#f6b800]"}`}><DeviceIcon /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-black">{device.label || "LoadLink device"}</p>{current ? <span className="rounded-full bg-emerald-500/12 px-2 py-1 text-[8px] font-black uppercase text-emerald-500">This device</span> : null}</div><p className={`mt-1 text-[10px] font-semibold ${muted}`}>Last seen {dateTime(device.last_seen)}</p></div></div>; })}</div> : <Empty copy="No device history yet. This screen will populate as you use LoadLink." muted={muted} />}
          </section>

          <section className={`overflow-hidden rounded-[28px] border ${card}`}>
            <div className={`border-b p-5 ${darkMode ? "border-white/10" : "border-black/10"}`}><p className="text-[10px] font-black uppercase tracking-[.13em] text-[#b88900]">Login history</p><h2 className="mt-1 text-2xl font-black tracking-[-.035em]">Recent access</h2></div>
            {loading ? <LoadingRows darkMode={darkMode} /> : loginEvents.length ? <div className="divide-y divide-current/10">{loginEvents.slice(0, 10).map((event) => <div key={event.id} className="flex items-center gap-3 p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black text-[#f6b800]"><LoginIcon /></span><div className="min-w-0"><p className="truncate text-xs font-black">{String(event.metadata?.label || "LoadLink sign-in")}</p><p className={`mt-1 text-[10px] font-semibold ${muted}`}>{dateTime(event.created_at)}</p></div></div>)}</div> : <Empty copy="No recent login records yet." muted={muted} />}
          </section>
        </div>

        <section className={`mt-4 overflow-hidden rounded-[28px] border ${card}`}>
          <div className={`border-b p-5 ${darkMode ? "border-white/10" : "border-black/10"}`}><p className="text-[10px] font-black uppercase tracking-[.13em] text-[#b88900]">Payments</p><h2 className="mt-1 text-2xl font-black tracking-[-.035em]">Billing activity</h2><p className={`mt-1 text-xs font-semibold ${muted}`}>Package and listing-payment records associated with your account.</p></div>
          {loading ? <LoadingRows darkMode={darkMode} /> : billing.length ? <div className="divide-y divide-current/10">{billing.map((row) => <div key={row.id} className="grid gap-2 p-4 md:grid-cols-[1fr_auto_auto] md:items-center md:p-5"><div><p className="text-sm font-black capitalize">{row.item_type.replaceAll("_", " ")}{row.item_code ? ` · ${row.item_code}` : ""}</p><p className={`mt-1 text-[10px] font-semibold ${muted}`}>{row.reference || "No reference"} · {dateTime(row.created_at)}</p></div><strong className="text-sm">{money(row.amount_cents, row.currency || "ZAR")}</strong><span className={`w-fit rounded-full px-2.5 py-1 text-[8px] font-black uppercase ${row.status === "paid" ? "bg-emerald-500/12 text-emerald-500" : row.status === "failed" ? "bg-red-500/12 text-red-500" : "bg-[#f6b800]/15 text-[#b88900]"}`}>{row.status}</span></div>)}</div> : <Empty copy="No billing activity yet." muted={muted} />}
        </section>

        {otherEvents.length ? <section className={`mt-4 overflow-hidden rounded-[28px] border ${card}`}><div className={`border-b p-5 ${darkMode ? "border-white/10" : "border-black/10"}`}><p className="text-[10px] font-black uppercase tracking-[.13em] text-[#b88900]">Account trail</p><h2 className="mt-1 text-2xl font-black tracking-[-.035em]">Other recent activity</h2></div><div className="grid gap-2 p-4 sm:grid-cols-2 md:p-5">{otherEvents.map((event) => <div key={event.id} className={`rounded-2xl border p-4 ${darkMode ? "border-white/8 bg-white/[.025]" : "border-black/8 bg-[#faf9f5]"}`}><p className="text-xs font-black capitalize">{event.activity_type.replaceAll("_", " ")}</p><p className={`mt-1 text-[10px] font-semibold ${muted}`}>{dateTime(event.created_at)}</p></div>)}</div></section> : null}
      </section>
    </main>
  );
}

function Empty({ copy, muted }: { copy: string; muted: string }) { return <p className={`p-6 text-sm font-semibold leading-6 ${muted}`}>{copy}</p>; }
function LoadingRows({ darkMode }: { darkMode: boolean }) { return <div className="grid gap-2 p-4">{[0,1,2].map((item) => <div key={item} className={`h-16 animate-pulse rounded-2xl ${darkMode ? "bg-white/[.05]" : "bg-black/[.05]"}`} />)}</div>; }
function DeviceIcon() { return <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none"><rect x="6" y="2.5" width="12" height="19" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>; }
function LoginIcon() { return <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M10 5H5v14h5M14 8l4 4-4 4m4-4H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
