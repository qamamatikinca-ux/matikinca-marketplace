"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import AuthStatusButton from "@/components/AuthStatusButton";
import HomeLogoLink from "@/components/HomeLogoLink";
import SiteMenu from "@/components/SiteMenu";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import SouthAfricaLocationInput from "@/components/SouthAfricaLocationInput";
import { clearActiveAccountState, syncAccountState } from "@/lib/accountState";
import { isAuthenticatedUser, loginHref } from "@/lib/auth";
import { refreshLoadLinkAccount } from "@/lib/loadLinkAccountStore";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { SOUTH_AFRICAN_PROVINCES } from "@/lib/southAfricaLocations";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type PreferenceKey = "email_notifications" | "chat_notifications" | "listing_notifications" | "marketing_notifications";
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
  full_name: "", phone: "", whatsapp_number: "", company_name: "", job_title: "", city: "", province: "", bio: "", avatar_url: "",
  email_notifications: true, chat_notifications: true, listing_notifications: true, marketing_notifications: false,
  verification_status: "not_started", subscription_plan: "standard",
};

const PROFILE_FIELDS: (keyof ProfileForm)[] = ["full_name", "phone", "whatsapp_number", "company_name", "job_title", "city", "province", "bio"];
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function AccountSettingsPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [savedForm, setSavedForm] = useState<ProfileForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [preferenceSaving, setPreferenceSaving] = useState<PreferenceKey | null>(null);
  const [hasDriverProfile, setHasDriverProfile] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { void load(); }, []);

  const dirty = useMemo(() => PROFILE_FIELDS.some((key) => form[key] !== savedForm[key]), [form, savedForm]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function load() {
    if (!isSupabaseConfigured) { setMessage("Profile settings are temporarily unavailable. Please try again later."); setLoading(false); return; }
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!isAuthenticatedUser(currentUser)) { window.location.href = loginHref("/account/settings"); return; }
    setUser(currentUser);
    const columns = "full_name,phone,whatsapp_number,company_name,job_title,city,province,bio,avatar_url,email_notifications,chat_notifications,listing_notifications,marketing_notifications,verification_status,subscription_plan";
    const [{ data, error }, { data: driverProfile }] = await Promise.all([
      supabase.from("profiles").select(columns).eq("id", currentUser.id).maybeSingle(),
      supabase.from("driver_profiles").select("id").eq("user_id", currentUser.id).maybeSingle(),
    ]);
    setHasDriverProfile(Boolean(driverProfile?.id));
    if (error && !isMissingSchemaError(error.message)) setMessage(friendlyError(error));
    const metadata = currentUser.user_metadata || {};
    const next: ProfileForm = {
      ...EMPTY,
      full_name: String(data?.full_name || metadata.full_name || metadata.name || ""),
      phone: String(data?.phone || ""), whatsapp_number: String(data?.whatsapp_number || ""), company_name: String(data?.company_name || ""), job_title: String(data?.job_title || ""),
      city: String(data?.city || ""), province: String(data?.province || ""), bio: String(data?.bio || ""), avatar_url: String(data?.avatar_url || metadata.avatar_url || metadata.picture || ""),
      email_notifications: data?.email_notifications ?? true, chat_notifications: data?.chat_notifications ?? true, listing_notifications: data?.listing_notifications ?? true, marketing_notifications: data?.marketing_notifications ?? false,
      verification_status: String(data?.verification_status || "not_started"), subscription_plan: String(data?.subscription_plan || "standard"),
    };
    setForm(next); setSavedForm(next); setLoading(false);
  }

  function field<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) { setForm((current) => ({ ...current, [key]: value })); }

  function rpcPayload(source: ProfileForm, userId: string) {
    return {
      id: userId, full_name: source.full_name.trim(), phone: source.phone.trim(), whatsapp_number: source.whatsapp_number.trim(), company_name: source.company_name.trim(), job_title: source.job_title.trim(),
      city: source.city.trim(), province: source.province, bio: source.bio.trim(), avatar_url: source.avatar_url,
      email_notifications: source.email_notifications, chat_notifications: source.chat_notifications, listing_notifications: source.listing_notifications, marketing_notifications: source.marketing_notifications,
      updated_at: new Date().toISOString(),
    };
  }

  async function savePreference(key: PreferenceKey, value: boolean) {
    if (!user || preferenceSaving) return;
    const previous = form[key];
    const nextSaved = { ...savedForm, [key]: value };
    setForm((current) => ({ ...current, [key]: value }));
    setPreferenceSaving(key); setMessage("");
    try {
      const { error } = await supabase.rpc("loadlink_update_my_profile", { p_payload: rpcPayload(nextSaved, user.id) });
      if (error) throw error;
      setSavedForm(nextSaved);
      setMessage("Preference saved.");
    } catch (error) {
      setForm((current) => ({ ...current, [key]: previous }));
      setMessage(friendlyError(error, "The preference could not be saved."));
    } finally { setPreferenceSaving(null); }
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!user || saving) return;
    const phone = normaliseSouthAfricanPhone(form.phone);
    const whatsapp = form.whatsapp_number.trim() ? normaliseSouthAfricanPhone(form.whatsapp_number) : "";
    if (form.phone.trim() && !phone) { setMessage("Enter a valid South African cellphone number, such as 0821234567 or +27821234567."); return; }
    if (form.whatsapp_number.trim() && !whatsapp) { setMessage("Enter a valid South African WhatsApp number."); return; }
    if (form.city.trim() && !form.province.trim()) { setMessage("Select the province for your city or town."); return; }

    setSaving(true); setMessage("");
    const clean = { ...form, phone, whatsapp_number: whatsapp };
    try {
      const payload = rpcPayload(clean, user.id);
      const { error } = await supabase.rpc("loadlink_update_my_profile", { p_payload: payload });
      if (error) throw error;
      await supabase.auth.updateUser({ data: { full_name: payload.full_name, avatar_url: payload.avatar_url } });
      setForm(clean); setSavedForm(clean);
      await Promise.allSettled([syncAccountState(), refreshLoadLinkAccount()]);
      window.dispatchEvent(new Event("loadlink-profile-updated"));
      setMessage("Your profile settings have been saved.");
    } catch (error) { setMessage(friendlyError(error, "Profile settings could not be saved.")); }
    finally { setSaving(false); }
  }

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    if (!ACCEPTED_IMAGE_TYPES.has(file.type) || file.size > 5 * 1024 * 1024) { setMessage("Choose a JPEG, PNG or WebP image smaller than 5 MB."); return; }
    setUploading(true); setMessage("");
    try {
      const processed = await resizeAvatar(file);
      const path = `${user.id}/avatar-${Date.now()}.webp`;
      const { error } = await supabase.storage.from("profile-media").upload(path, processed, { upsert: false, contentType: "image/webp" });
      if (error) throw error;
      const { data } = supabase.storage.from("profile-media").getPublicUrl(path);
      const next = { ...savedForm, avatar_url: data.publicUrl };
      const { error: profileError } = await supabase.rpc("loadlink_update_my_profile", { p_payload: rpcPayload(next, user.id) });
      if (profileError) throw profileError;
      await supabase.auth.updateUser({ data: { avatar_url: data.publicUrl } });
      const oldPath = profileMediaPath(savedForm.avatar_url);
      if (oldPath && oldPath !== path) await supabase.storage.from("profile-media").remove([oldPath]).catch(() => undefined);
      setForm((current) => ({ ...current, avatar_url: data.publicUrl }));
      setSavedForm(next);
      await refreshLoadLinkAccount();
      window.dispatchEvent(new Event("loadlink-profile-updated"));
      setMessage("Profile picture updated.");
    } catch (error) { setMessage(friendlyError(error, "Profile picture could not be uploaded.")); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function updatePassword() {
    if (password.length < 8) { setMessage("Your new password must contain at least 8 characters."); return; }
    if (password !== confirmPassword) { setMessage("The two passwords do not match."); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) { setMessage(friendlyError(error, "The password could not be updated.")); return; }
    setPassword(""); setConfirmPassword(""); setMessage("Password updated successfully.");
  }

  async function signOut() { await supabase.auth.signOut(); clearActiveAccountState(); window.location.href = "/"; }

  function requestDeletion() {
    if (!user) return;
    const confirmed = window.confirm("Request account deletion? LoadLink support will confirm the request before any account or listing is removed.");
    if (!confirmed) return;
    const subject = encodeURIComponent("LoadLink account deletion request");
    const body = encodeURIComponent(`Please review my LoadLink account deletion request.\n\nAccount email: ${user.email || "Not available"}\nUser ID: ${user.id}\n\nI understand that LoadLink must confirm how my listings and conversations will be handled before deletion.`);
    window.location.href = `mailto:loadlinksouthafrica@gmail.com?subject=${subject}&body=${body}`;
  }

  const initials = useMemo(() => form.full_name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "LL", [form.full_name]);
  const completion = useMemo(() => {
    const fields = [form.full_name, form.city, form.province, form.phone, form.job_title, form.bio, form.avatar_url];
    const complete = fields.filter((value) => String(value || "").trim()).length;
    return Math.round((complete / fields.length) * 100);
  }, [form]);
  const googleOnly = Boolean(user?.identities?.some((identity) => identity.provider === "google")) && !user?.identities?.some((identity) => identity.provider === "email");
  const page = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const surface = darkMode ? "rounded-[24px] border-white/10 bg-[#0b0b0b]" : "rounded-[24px] border-black/10 bg-white";
  const input = `mt-2 h-12 w-full rounded-xl border px-4 text-sm font-semibold outline-none transition focus:border-[#f6b800] ${darkMode ? "border-white/15 bg-black text-white" : "border-black/15 bg-[#fffdf8] text-black"}`;
  const textarea = `${input} min-h-28 py-3`;
  const muted = darkMode ? "text-white/55" : "text-black/55";

  if (loading) return <main className={`flex min-h-screen items-center justify-center text-sm font-black uppercase tracking-[.18em] text-[#f6b800] ${darkMode ? "bg-black" : "bg-[#f4efe3]"}`}>Loading profile settings…</main>;

  return (
    <main className={`min-h-screen ${page}`}>
      <header className={`sticky top-0 z-50 border-b ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}><div className="grid h-20 grid-cols-[92px_1fr_52px] items-center px-4"><div className="flex items-center gap-2"><SiteMenu darkMode={darkMode} /><AuthStatusButton darkMode={darkMode} /></div><HomeLogoLink theme={darkMode ? "dark" : "light"} /><LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme} className="ml-auto" /></div></header>

      <section className="mx-auto max-w-6xl px-5 py-9 md:px-8 md:py-12">
        <h1 className="mt-2 text-4xl font-black tracking-[-.05em] md:text-6xl">Profile settings</h1>
        <p className={`mt-3 max-w-2xl text-sm leading-6 ${muted}`}>Manage the details people see, your contact preferences, account security and the features linked to your profile.</p>
        {dirty ? <p className="mt-4 text-sm font-black text-[#b88900]">You have unsaved profile changes.</p> : null}
        {message ? <div role="status" className="mt-6 rounded-xl border border-[#f6b800]/45 bg-[#f6b800]/10 p-4 text-sm font-bold">{message}</div> : null}

        <div className="mt-7 grid gap-5 lg:grid-cols-[280px_1fr]">
          <aside className={`h-fit border p-5 shadow-[0_14px_40px_rgba(0,0,0,.06)] ${surface}`}>
            <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-[#f6b800] bg-black text-2xl font-black text-[#f6b800]">{form.avatar_url ? <img src={form.avatar_url} alt="Profile" className="h-full w-full object-cover" /> : initials}</div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadAvatar(event)} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="mt-5 h-11 w-full rounded-xl bg-[#f6b800] px-4 text-xs font-black uppercase tracking-wide text-black disabled:opacity-50">{uploading ? "Uploading…" : "Change profile picture"}</button>
            <div className={`mt-5 rounded-xl border p-4 ${darkMode ? "border-white/10 bg-white/[.025]" : "border-black/10 bg-black/[.02]"}`}><p className="text-[10px] font-black uppercase tracking-[.12em] opacity-55">Profile complete</p><p className="mt-1 text-2xl font-black">{completion}%</p>{completion < 100 ? <p className={`mt-2 text-xs leading-5 ${muted}`}>Add your location, contact details, role, summary and photo to complete your account.</p> : null}</div>
            <div className={`mt-5 border-t pt-5 ${darkMode ? "border-white/10" : "border-black/10"}`}><Info label="Email" value={user?.email || "Not available"} /><Info label="Verification" value={form.verification_status.replaceAll("_", " ")} /><Info label="Package" value={form.subscription_plan} /></div>
            <div className="mt-5 grid gap-2"><Link href="/verify" className="flex h-11 items-center justify-center rounded-xl border border-[#f6b800] px-3 text-center text-xs font-black uppercase text-[#b88900]">Verification centre</Link><Link href="/account/packages" className="flex h-11 items-center justify-center rounded-xl border border-current/15 px-3 text-center text-xs font-black uppercase">Package settings</Link>{hasDriverProfile ? <Link href="/driver-profile" className="flex h-11 items-center justify-center rounded-xl border border-current/15 px-3 text-center text-xs font-black uppercase">Driver profile</Link> : null}</div>
          </aside>

          <div className="grid gap-5">
            <form onSubmit={saveProfile} className={`border p-5 shadow-[0_14px_40px_rgba(0,0,0,.05)] md:p-7 ${surface}`}>
              <h2 className="text-2xl font-black">Professional information</h2><p className={`mt-2 text-sm ${muted}`}>These details help other users know who they are dealing with.</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="Full name"><input required value={form.full_name} onChange={(event) => field("full_name", event.target.value)} className={input} /></Field>
                <Field label="Job title or role"><input value={form.job_title} onChange={(event) => field("job_title", event.target.value)} placeholder="Owner, driver, fleet manager" className={input} /></Field>
                <Field label="Company name"><input value={form.company_name} onChange={(event) => field("company_name", event.target.value)} className={input} /></Field>
                <Field label="City or town"><SouthAfricaLocationInput value={form.city} onChange={(value, selected) => { field("city", value); if (selected?.province) field("province", selected.province); }} darkMode={darkMode} allowAllSouthAfrica={false} className={input} /></Field>
                <Field label="Province"><select value={form.province} onChange={(event) => field("province", event.target.value)} className={input}><option value="">Select province</option>{SOUTH_AFRICAN_PROVINCES.map((province) => <option key={province}>{province}</option>)}</select></Field>
                <Field label="Cellphone number"><input value={form.phone} onChange={(event) => field("phone", event.target.value)} inputMode="tel" placeholder="0821234567" className={input} /></Field>
                <Field label="WhatsApp number"><input value={form.whatsapp_number} onChange={(event) => field("whatsapp_number", event.target.value)} inputMode="tel" placeholder="0821234567" className={input} /></Field>
                <div className="md:col-span-2"><Field label="Professional summary"><textarea value={form.bio} onChange={(event) => field("bio", event.target.value)} maxLength={500} className={textarea} /></Field></div>
              </div>
              <h3 className="mt-8 text-lg font-black">Notification preferences</h3><div className="mt-4 grid gap-3 sm:grid-cols-2"><Toggle label="Email account updates" checked={form.email_notifications} busy={preferenceSaving === "email_notifications"} onChange={(value) => void savePreference("email_notifications", value)} darkMode={darkMode} /><Toggle label="New chat messages" checked={form.chat_notifications} busy={preferenceSaving === "chat_notifications"} onChange={(value) => void savePreference("chat_notifications", value)} darkMode={darkMode} /><Toggle label="Listing and review updates" checked={form.listing_notifications} busy={preferenceSaving === "listing_notifications"} onChange={(value) => void savePreference("listing_notifications", value)} darkMode={darkMode} /><Toggle label="LoadLink product news" checked={form.marketing_notifications} busy={preferenceSaving === "marketing_notifications"} onChange={(value) => void savePreference("marketing_notifications", value)} darkMode={darkMode} /></div>
              <button type="submit" disabled={saving || !dirty} className="mt-6 h-12 rounded-xl bg-[#f6b800] px-6 text-xs font-black uppercase tracking-[.12em] text-black disabled:opacity-50">{saving ? "Saving…" : dirty ? "Save profile settings" : "Profile saved"}</button>
            </form>

            <section className={`border p-5 shadow-[0_14px_40px_rgba(0,0,0,.05)] md:p-7 ${surface}`}><h2 className="text-2xl font-black">Security</h2><p className={`mt-2 text-sm ${muted}`}>{googleOnly ? "Set a LoadLink password while keeping Google sign-in connected." : "Change your LoadLink password. Connected sign-in methods remain available."}</p><div className="mt-5 grid gap-4 md:grid-cols-2"><Field label={googleOnly ? "Set a LoadLink password" : "New password"}><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" className={input} /></Field><Field label="Confirm new password"><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" className={input} /></Field></div><button type="button" onClick={() => void updatePassword()} disabled={saving || !password} className="mt-5 h-11 rounded-xl border border-[#f6b800] px-5 text-xs font-black uppercase text-[#b88900] disabled:opacity-40">{googleOnly ? "Set password" : "Update password"}</button></section>

            <section className={`border border-red-500/35 p-5 shadow-[0_14px_40px_rgba(0,0,0,.05)] md:p-7 ${surface}`}><h2 className="text-2xl font-black">Account access</h2><p className={`mt-2 text-sm ${muted}`}>Signing out keeps your account data safe. Account deletion requires confirmation so listings and conversations are not removed accidentally.</p><div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={() => void signOut()} className="h-11 rounded-xl border border-red-500 px-5 text-xs font-black uppercase text-red-500">Sign out of LoadLink</button><button type="button" onClick={requestDeletion} className="h-11 rounded-xl border border-current/20 px-5 text-xs font-black uppercase">Request account deletion</button></div></section>
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block text-xs font-black uppercase tracking-[.11em]">{label}{children}</label>; }
function Toggle({ label, checked, busy, onChange, darkMode }: { label: string; checked: boolean; busy?: boolean; onChange: (value: boolean) => void; darkMode: boolean }) { return <div className={`flex min-h-14 items-center justify-between gap-4 rounded-xl border px-4 ${darkMode ? "border-white/10 bg-white/[.02]" : "border-black/10 bg-black/[.015]"}`}><span className="text-sm font-bold normal-case tracking-normal">{label}</span><button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} disabled={busy} className={`relative h-7 w-12 shrink-0 rounded-full border transition disabled:opacity-55 ${checked ? "border-[#f6b800] bg-[#f6b800]" : darkMode ? "border-white/20 bg-white/10" : "border-black/20 bg-black/10"}`}><span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} /></button></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="mb-4 last:mb-0"><p className="text-[10px] font-black uppercase tracking-[.12em] opacity-50">{label}</p><p className="mt-1 break-words text-sm font-bold capitalize">{value}</p></div>; }

function isMissingSchemaError(message: string) { return /column|schema cache|does not exist|relation/i.test(message); }
function friendlyError(error: unknown, fallback = "That change could not be completed. Please try again or contact LoadLink support.") {
  const text = error instanceof Error ? error.message : typeof error === "object" && error && "message" in error ? String((error as { message?: unknown }).message || "") : "";
  if (!text || isMissingSchemaError(text) || /row-level|bucket|permission|policy/i.test(text)) return fallback;
  return text;
}
function normaliseSouthAfricanPhone(value: string) {
  const clean = value.trim().replace(/[\s()-]/g, "");
  if (!clean) return "";
  if (/^0\d{9}$/.test(clean)) return `+27${clean.slice(1)}`;
  if (/^\+27\d{9}$/.test(clean)) return clean;
  if (/^27\d{9}$/.test(clean)) return `+${clean}`;
  return "";
}
function profileMediaPath(url: string) {
  const marker = "/storage/v1/object/public/profile-media/";
  const index = url.indexOf(marker);
  return index >= 0 ? decodeURIComponent(url.slice(index + marker.length).split("?")[0]) : "";
}
function resizeAvatar(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      const size = Math.min(image.naturalWidth, image.naturalHeight);
      if (!size) { reject(new Error("The image could not be read.")); return; }
      const canvas = document.createElement("canvas"); canvas.width = 720; canvas.height = 720;
      const context = canvas.getContext("2d");
      if (!context) { reject(new Error("The image could not be processed.")); return; }
      const sx = Math.max(0, (image.naturalWidth - size) / 2); const sy = Math.max(0, (image.naturalHeight - size) / 2);
      context.drawImage(image, sx, sy, size, size, 0, 0, 720, 720);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("The image could not be processed.")), "image/webp", 0.86);
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Choose a valid JPEG, PNG or WebP image.")); };
    image.src = url;
  });
}
