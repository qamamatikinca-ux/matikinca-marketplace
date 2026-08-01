"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import AuthStatusButton from "@/components/AuthStatusButton";
import HomeLogoLink from "@/components/HomeLogoLink";
import SiteMenu from "@/components/SiteMenu";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import { clearActiveAccountState, syncAccountState } from "@/lib/accountState";
import { isAuthenticatedUser, loginHref } from "@/lib/auth";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type ProfileForm = {
  full_name: string;
  phone: string;
  whatsapp_number: string;
  company_name: string;
  job_title: string;
  city: string;
  province: string;
  bio: string;
  avatar_url: string;
  email_notifications: boolean;
  chat_notifications: boolean;
  listing_notifications: boolean;
  marketing_notifications: boolean;
  verification_status: string;
  subscription_plan: string;
};

const EMPTY: ProfileForm = {
  full_name: "",
  phone: "",
  whatsapp_number: "",
  company_name: "",
  job_title: "",
  city: "",
  province: "",
  bio: "",
  avatar_url: "",
  email_notifications: true,
  chat_notifications: true,
  listing_notifications: true,
  marketing_notifications: false,
  verification_status: "not_started",
  subscription_plan: "standard",
};

const PROVINCES = ["Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape"];

export default function AccountSettingsPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    if (!isSupabaseConfigured) {
      setMessage("Supabase is not connected on this deployment.");
      setLoading(false);
      return;
    }
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!isAuthenticatedUser(currentUser)) {
      window.location.href = loginHref("/account/settings");
      return;
    }
    setUser(currentUser);
    const { data, error } = await supabase.from("profiles").select("*").eq("id", currentUser.id).maybeSingle();
    if (error && !/column|schema cache|does not exist/i.test(error.message)) setMessage(error.message);
    const metadata = currentUser.user_metadata || {};
    setForm({
      ...EMPTY,
      full_name: String(data?.full_name || metadata.full_name || metadata.name || ""),
      phone: String(data?.phone || ""),
      whatsapp_number: String(data?.whatsapp_number || ""),
      company_name: String(data?.company_name || ""),
      job_title: String(data?.job_title || ""),
      city: String(data?.city || ""),
      province: String(data?.province || ""),
      bio: String(data?.bio || ""),
      avatar_url: String(data?.avatar_url || metadata.avatar_url || metadata.picture || ""),
      email_notifications: data?.email_notifications ?? true,
      chat_notifications: data?.chat_notifications ?? true,
      listing_notifications: data?.listing_notifications ?? true,
      marketing_notifications: data?.marketing_notifications ?? false,
      verification_status: String(data?.verification_status || "not_started"),
      subscription_plan: String(data?.subscription_plan || "standard"),
    });
    setLoading(false);
  }

  function field<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!user || saving) return;
    setSaving(true);
    setMessage("");
    try {
      const payload = {
        id: user.id,
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        whatsapp_number: form.whatsapp_number.trim(),
        company_name: form.company_name.trim(),
        job_title: form.job_title.trim(),
        city: form.city.trim(),
        province: form.province,
        bio: form.bio.trim(),
        avatar_url: form.avatar_url,
        email_notifications: form.email_notifications,
        chat_notifications: form.chat_notifications,
        listing_notifications: form.listing_notifications,
        marketing_notifications: form.marketing_notifications,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.rpc("loadlink_update_my_profile", { p_payload: payload });
      if (error) throw error;
      await supabase.auth.updateUser({ data: { full_name: payload.full_name, avatar_url: payload.avatar_url } });
      await syncAccountState().catch(() => undefined);
      setMessage("Your profile settings have been saved.");
    } catch (error) {
      const text = error instanceof Error ? error.message : "Profile settings could not be saved.";
      setMessage(/column|schema cache/i.test(text) ? "Run LOADLINK-PHASE-2-FINAL.sql in Supabase, then save again." : text);
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setMessage("Choose a JPG, PNG or WebP image smaller than 5 MB.");
      return;
    }
    setUploading(true);
    setMessage("");
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${extension}`;
      const { error } = await supabase.storage.from("profile-media").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("profile-media").getPublicUrl(path);
      field("avatar_url", data.publicUrl);
      const { error: profileError } = await supabase.rpc("loadlink_update_my_profile", {
        p_payload: { ...form, avatar_url: data.publicUrl },
      });
      if (profileError) throw profileError;
      await supabase.auth.updateUser({ data: { avatar_url: data.publicUrl } });
      setMessage("Profile picture updated.");
    } catch (error) {
      const text = error instanceof Error ? error.message : "Profile picture could not be uploaded.";
      setMessage(/bucket|not found|row-level/i.test(text) ? "Run LOADLINK-PHASE-2-FINAL.sql in Supabase before uploading a profile picture." : text);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function updatePassword() {
    if (password.length < 8) {
      setMessage("Your new password must contain at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("The two passwords do not match.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setPassword("");
    setConfirmPassword("");
    setMessage("Password updated successfully.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    clearActiveAccountState();
    window.location.href = "/";
  }


  const initials = useMemo(() => form.full_name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "LL", [form.full_name]);
  const page = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const surface = darkMode ? "rounded-[24px] border-white/10 bg-[#0b0b0b]" : "rounded-[24px] border-black/10 bg-white";
  const input = `mt-2 h-12 w-full rounded-xl border px-4 text-sm font-semibold outline-none transition focus:border-[#f6b800] ${darkMode ? "border-white/15 bg-black text-white" : "border-black/15 bg-[#fffdf8] text-black"}`;
  const textarea = `${input} min-h-28 py-3`;
  const muted = darkMode ? "text-white/55" : "text-black/55";

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-black text-sm font-black uppercase tracking-[.18em] text-[#f6b800]">Loading profile settings…</main>;

  return (
    <main className={`min-h-screen ${page}`}>
      <header className={`sticky top-0 z-50 border-b ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}>
        <div className="grid h-20 grid-cols-[92px_1fr_52px] items-center px-4">
          <div className="flex items-center gap-2"><SiteMenu darkMode={darkMode} /><AuthStatusButton darkMode={darkMode} /></div>
          <HomeLogoLink theme={darkMode ? "dark" : "light"} />
          <LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme} className="ml-auto" />
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-9 md:px-8 md:py-12">
        <h1 className="mt-2 text-4xl font-black tracking-[-.05em] md:text-6xl">Profile settings</h1>
        <p className={`mt-3 max-w-2xl text-sm leading-6 ${muted}`}>Manage the details people see, your contact preferences, account security and the features linked to your profile.</p>

        {message ? <div role="status" className="mt-6 rounded-xl border border-[#f6b800]/45 bg-[#f6b800]/10 p-4 text-sm font-bold">{message}</div> : null}

        <div className="mt-7 grid gap-5 lg:grid-cols-[280px_1fr]">
          <aside className={`h-fit border p-5 shadow-[0_14px_40px_rgba(0,0,0,.06)] ${surface}`}>
            <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-[#f6b800] bg-black text-2xl font-black text-[#f6b800]">
              {form.avatar_url ? <img src={form.avatar_url} alt="Profile" className="h-full w-full object-cover" /> : initials}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadAvatar(event)} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="mt-5 h-11 w-full rounded-xl bg-[#f6b800] px-4 text-xs font-black uppercase tracking-wide text-black disabled:opacity-50">{uploading ? "Uploading…" : "Change profile picture"}</button>
            <div className={`mt-5 border-t pt-5 ${darkMode ? "border-white/10" : "border-black/10"}`}>
              <Info label="Email" value={user?.email || "Not available"} />
              <Info label="Verification" value={form.verification_status.replaceAll("_", " ")} />
              <Info label="Package" value={form.subscription_plan} />
            </div>
            <div className="mt-5 grid gap-2">
              <Link href="/verify" className="flex h-11 items-center justify-center rounded-xl border border-[#f6b800] px-3 text-center text-xs font-black uppercase text-[#b88900]">Verification centre</Link>
              <Link href="/account/packages" className="flex h-11 items-center justify-center rounded-xl border border-current/15 px-3 text-center text-xs font-black uppercase">Package settings</Link>
              <Link href="/driver-profile" className="flex h-11 items-center justify-center rounded-xl border border-current/15 px-3 text-center text-xs font-black uppercase">Driver profile</Link>
            </div>
          </aside>

          <div className="grid gap-5">
            <form onSubmit={saveProfile} className={`border p-5 shadow-[0_14px_40px_rgba(0,0,0,.05)] md:p-7 ${surface}`}>
              <h2 className="text-2xl font-black">Professional information</h2>
              <p className={`mt-2 text-sm ${muted}`}>These details help other users know who they are dealing with.</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="Full name"><input required value={form.full_name} onChange={(event) => field("full_name", event.target.value)} className={input} /></Field>
                <Field label="Job title or role"><input value={form.job_title} onChange={(event) => field("job_title", event.target.value)} placeholder="Owner, driver, fleet manager" className={input} /></Field>
                <Field label="Company name"><input value={form.company_name} onChange={(event) => field("company_name", event.target.value)} className={input} /></Field>
                <Field label="City"><input value={form.city} onChange={(event) => field("city", event.target.value)} className={input} /></Field>
                <Field label="Province"><select value={form.province} onChange={(event) => field("province", event.target.value)} className={input}><option value="">Select province</option>{PROVINCES.map((province) => <option key={province}>{province}</option>)}</select></Field>
                <Field label="Cellphone number"><input value={form.phone} onChange={(event) => field("phone", event.target.value)} inputMode="tel" className={input} /></Field>
                <Field label="WhatsApp number"><input value={form.whatsapp_number} onChange={(event) => field("whatsapp_number", event.target.value)} inputMode="tel" className={input} /></Field>
                <div className="md:col-span-2"><Field label="Professional summary"><textarea value={form.bio} onChange={(event) => field("bio", event.target.value)} maxLength={500} className={textarea} /></Field></div>
              </div>

              <h3 className="mt-8 text-lg font-black">Notification preferences</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Toggle label="Email account updates" checked={form.email_notifications} onChange={(value) => field("email_notifications", value)} darkMode={darkMode} />
                <Toggle label="New chat messages" checked={form.chat_notifications} onChange={(value) => field("chat_notifications", value)} darkMode={darkMode} />
                <Toggle label="Listing and review updates" checked={form.listing_notifications} onChange={(value) => field("listing_notifications", value)} darkMode={darkMode} />
                <Toggle label="LoadLink product news" checked={form.marketing_notifications} onChange={(value) => field("marketing_notifications", value)} darkMode={darkMode} />
              </div>
              <button type="submit" disabled={saving} className="mt-6 h-12 rounded-xl bg-[#f6b800] px-6 text-xs font-black uppercase tracking-[.12em] text-black disabled:opacity-50">{saving ? "Saving…" : "Save profile settings"}</button>
            </form>

            <section className={`border p-5 shadow-[0_14px_40px_rgba(0,0,0,.05)] md:p-7 ${surface}`}>
              <h2 className="text-2xl font-black">Security</h2>
              <p className={`mt-2 text-sm ${muted}`}>Use at least eight characters for a new password. Google sign-in remains connected.</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="New password"><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" className={input} /></Field>
                <Field label="Confirm new password"><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" className={input} /></Field>
              </div>
              <button type="button" onClick={() => void updatePassword()} disabled={saving || !password} className="mt-5 h-11 rounded-xl border border-[#f6b800] px-5 text-xs font-black uppercase text-[#b88900] disabled:opacity-40">Update password</button>
            </section>

            <section className={`border border-red-500/35 p-5 shadow-[0_14px_40px_rgba(0,0,0,.05)] md:p-7 ${surface}`}>
              <h2 className="text-2xl font-black">Account access</h2>
              <p className={`mt-2 text-sm ${muted}`}>Signing out removes this device session but keeps your listings, conversations and account data safe.</p>
              <button type="button" onClick={() => void signOut()} className="mt-5 h-11 rounded-xl border border-red-500 px-5 text-xs font-black uppercase text-red-500">Sign out of LoadLink</button>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-xs font-black uppercase tracking-[.11em]">{label}{children}</label>;
}

function Toggle({ label, checked, onChange, darkMode }: { label: string; checked: boolean; onChange: (value: boolean) => void; darkMode: boolean }) {
  return (
    <div className={`flex min-h-14 items-center justify-between gap-4 rounded-xl border px-4 ${darkMode ? "border-white/10 bg-white/[.02]" : "border-black/10 bg-black/[.015]"}`}>
      <span className="text-sm font-bold normal-case tracking-normal">{label}</span>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative h-7 w-12 shrink-0 rounded-full border transition ${checked ? "border-[#f6b800] bg-[#f6b800]" : darkMode ? "border-white/20 bg-white/10" : "border-black/20 bg-black/10"}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="mb-4 last:mb-0"><p className="text-[10px] font-black uppercase tracking-[.12em] opacity-50">{label}</p><p className="mt-1 break-words text-sm font-bold capitalize">{value}</p></div>;
}
