"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import SouthAfricaLocationInput from "@/components/SouthAfricaLocationInput";
import { isAuthenticatedUser, safeNextPath } from "@/lib/auth";
import { refreshLoadLinkAccount } from "@/lib/loadLinkAccountStore";
import { syncAccountState } from "@/lib/accountState";
import { SOUTH_AFRICAN_PROVINCES } from "@/lib/southAfricaLocations";
import { supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type Draft = {
  full_name: string;
  phone: string;
  company_name: string;
  job_title: string;
  city: string;
  province: string;
};

type ProfileOnboardingRow = {
  full_name: string | null;
  phone: string | null;
  company_name: string | null;
  job_title: string | null;
  city: string | null;
  province: string | null;
  onboarding_complete: boolean | null;
};

const EMPTY: Draft = { full_name: "", phone: "", company_name: "", job_title: "", city: "", province: "" };

function draftKey(userId: string) { return `loadlink-profile-onboarding-v1:${userId}`; }

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (/^0[6-8][0-9]{8}$/.test(digits)) return `+27${digits.slice(1)}`;
  if (/^27[6-8][0-9]{8}$/.test(digits)) return `+${digits}`;
  return "";
}

function onboardingMessage(error: unknown) {
  const raw = error && typeof error === "object" && "message" in error ? String((error as { message?: unknown }).message || "") : String(error || "");
  if (/PHONE_ALREADY_IN_USE/i.test(raw)) return "This phone number is already in use on another LoadLink account.";
  if (/PROFILE_ONBOARDING_INCOMPLETE/i.test(raw)) return raw.split("PROFILE_ONBOARDING_INCOMPLETE:")[1]?.trim() || "Complete the required profile information.";
  if (/loadlink_complete_my_profile|schema cache|does not exist/i.test(raw)) return "Profile setup is being activated. Refresh in a moment and continue from your saved draft.";
  return "LoadLink could not save your profile yet. Your answers are still saved on this device.";
}

export default function CompleteProfilePage() {
  const router = useRouter();
  const { darkMode } = useLoadLinkTheme();
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [form, setForm] = useState<Draft>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [next, setNext] = useState("/");

  useEffect(() => {
    let active = true;
    async function load() {
      const resolvedNext = safeNextPath(new URLSearchParams(window.location.search).get("next"), "/");
      setNext(resolvedNext);
      const { data: userData } = await supabase.auth.getUser();
      if (!active) return;
      if (!isAuthenticatedUser(userData.user)) { router.replace(`/login?next=${encodeURIComponent("/complete-profile")}`); return; }
      const id = userData.user.id;
      setUserId(id);
      setEmail(userData.user.email || "");

      let local: Partial<Draft> = {};
      try { local = JSON.parse(window.localStorage.getItem(draftKey(id)) || "{}"); } catch { local = {}; }

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name,phone,company_name,job_title,city,province,onboarding_complete")
        .eq("id", id)
        .maybeSingle();

      if (!active) return;
      const profile = data as ProfileOnboardingRow | null;
      if (!error && profile?.onboarding_complete === true) { router.replace(resolvedNext); return; }
      const database: Partial<ProfileOnboardingRow> = !error && profile ? profile : {};
      setForm({
        full_name: String(local.full_name || database.full_name || userData.user.user_metadata?.full_name || userData.user.user_metadata?.name || ""),
        phone: String(local.phone || database.phone || ""),
        company_name: String(local.company_name || database.company_name || ""),
        job_title: String(local.job_title || database.job_title || ""),
        city: String(local.city || database.city || ""),
        province: String(local.province || database.province || ""),
      });
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    if (!userId || loading) return;
    window.localStorage.setItem(draftKey(userId), JSON.stringify(form));
  }, [form, loading, userId]);

  async function finish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId || saving) return;
    setMessage("");
    const phone = normalizePhone(form.phone);
    if (form.full_name.trim().length < 2) { setMessage("Enter your full name."); return; }
    if (!phone) { setMessage("Enter a valid South African cellphone number, such as 0821234567."); return; }
    if (form.city.trim().length < 2) { setMessage("Choose your city or town."); return; }
    if (!form.province.trim()) { setMessage("Choose your province."); return; }

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc("loadlink_complete_my_profile", {
        p_payload: { ...form, full_name: form.full_name.trim(), phone, city: form.city.trim(), province: form.province.trim() },
      });
      if (error) throw error;
      if (!data || data.ok !== true) throw new Error("PROFILE_ONBOARDING_INCOMPLETE");
      await supabase.auth.updateUser({ data: { full_name: form.full_name.trim(), name: form.full_name.trim() } });
      window.localStorage.removeItem(draftKey(userId));
      await Promise.allSettled([syncAccountState(), refreshLoadLinkAccount()]);
      window.dispatchEvent(new Event("loadlink-profile-updated"));
      router.replace(next);
    } catch (error) {
      setMessage(onboardingMessage(error));
    } finally { setSaving(false); }
  }

  const input = `h-13 w-full rounded-2xl border px-4 text-[15px] font-semibold outline-none transition focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-white/[.045] text-white placeholder:text-white/28" : "border-black/12 bg-[#fffdf8] text-black placeholder:text-black/30"}`;

  return (
    <AuthShell title="Finish your LoadLink profile" description="Your email is verified. Add the contact details LoadLink needs before you start posting and messaging.">
      {loading ? (
        <div className="py-10 text-center"><div className="mx-auto h-11 w-11 animate-spin rounded-full border-2 border-current/10 border-t-[#f6b800]" /><p className="mt-4 text-sm font-semibold opacity-50">Restoring your profile setup…</p></div>
      ) : (
        <form onSubmit={finish} className="grid gap-4">
          <div className={`rounded-2xl border px-4 py-3 ${darkMode ? "border-white/10 bg-white/[.03]" : "border-black/10 bg-black/[.02]"}`}><p className="text-[10px] font-bold uppercase tracking-[.1em] opacity-45">Verified email</p><p className="mt-1 text-sm font-black">{email}</p></div>
          <label className="grid gap-2"><span className="text-sm font-bold">Full name</span><input className={input} value={form.full_name} onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} autoComplete="name" maxLength={140} required /></label>
          <label className="grid gap-2"><span className="text-sm font-bold">Cellphone number</span><input className={input} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} inputMode="tel" autoComplete="tel" placeholder="0821234567" maxLength={24} required /></label>
          <label className="grid gap-2"><span className="text-sm font-bold">City or town</span><SouthAfricaLocationInput value={form.city} onChange={(value, selected) => setForm((current) => ({ ...current, city: value, province: selected?.province || current.province }))} darkMode={darkMode} allowAllSouthAfrica={false} ariaLabel="Your city or town" className={input} /></label>
          <label className="grid gap-2"><span className="text-sm font-bold">Province</span><select className={input} value={form.province} onChange={(event) => setForm((current) => ({ ...current, province: event.target.value }))} required><option value="">Select province</option>{SOUTH_AFRICAN_PROVINCES.map((province) => <option key={province} value={province}>{province}</option>)}</select></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2"><span className="text-sm font-bold">Company <span className="font-semibold opacity-45">optional</span></span><input className={input} value={form.company_name} onChange={(event) => setForm((current) => ({ ...current, company_name: event.target.value }))} maxLength={160} /></label>
            <label className="grid gap-2"><span className="text-sm font-bold">Role <span className="font-semibold opacity-45">optional</span></span><input className={input} value={form.job_title} onChange={(event) => setForm((current) => ({ ...current, job_title: event.target.value }))} placeholder="Owner, driver, fleet manager" maxLength={120} /></label>
          </div>
          <p className={`text-[11px] font-semibold leading-5 ${darkMode ? "text-white/42" : "text-black/42"}`}>Your progress is saved on this device while you finish. If the browser closes, come back after signing in and continue where you stopped.</p>
          <button type="submit" disabled={saving} className="h-13 rounded-2xl bg-[#f6b800] px-5 text-sm font-black text-black disabled:opacity-45">{saving ? "Saving profile…" : "Finish profile"}</button>
        </form>
      )}
      {message ? <p role="alert" className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${darkMode ? "border-white/10 bg-white/[.03] text-white/70" : "border-black/10 bg-black/[.02] text-black/70"}`}>{message}</p> : null}
    </AuthShell>
  );
}
