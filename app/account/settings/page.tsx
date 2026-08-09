"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import HomeLogoLink from "@/components/HomeLogoLink";
import SiteMenu from "@/components/SiteMenu";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import TruckGearboxSketch from "@/components/TruckGearboxSketch";
import MfaSecurityCard from "@/components/MfaSecurityCard";
import PasswordStrengthMeter from "@/components/PasswordStrengthMeter";
import SouthAfricaLocationInput from "@/components/SouthAfricaLocationInput";
import { clearActiveAccountState, syncAccountState } from "@/lib/accountState";
import { isAuthenticatedUser, loginHref } from "@/lib/auth";
import { refreshLoadLinkAccount } from "@/lib/loadLinkAccountStore";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { SOUTH_AFRICAN_PROVINCES } from "@/lib/southAfricaLocations";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import { profileRowToMessagePrivacy, writeMessagePrivacy } from "@/lib/messagePrivacy";
import { enableLoadLinkPush, getLoadLinkPushState, type PushState } from "@/lib/pushNotifications";

type PreferenceKey =
  | "email_notifications"
  | "chat_notifications"
  | "listing_notifications"
  | "marketing_notifications"
  | "message_activity_visible"
  | "message_typing_indicators"
  | "message_requests_enabled"
  | "message_notification_previews";
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
  message_activity_visible: boolean;
  message_typing_indicators: boolean;
  message_requests_enabled: boolean;
  message_notification_previews: boolean;
  verification_status: string;
  subscription_plan: string;
};

const EMPTY: ProfileForm = {
  full_name: "", phone: "", whatsapp_number: "", company_name: "", job_title: "", city: "", province: "", bio: "", avatar_url: "",
  email_notifications: true, chat_notifications: true, listing_notifications: true, marketing_notifications: false,
  message_activity_visible: true, message_typing_indicators: true, message_requests_enabled: true, message_notification_previews: false,
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
  const [settingsView, setSettingsView] = useState<"profile" | "messages" | "security">("profile");
  const [pushState, setPushState] = useState<PushState>("disabled");
  const [pushBusy, setPushBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const syncHash = () => { if (window.location.hash === "#message-privacy") setSettingsView("messages"); };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    void load();
    getLoadLinkPushState().then(setPushState).catch(() => undefined);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

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
    const columns = "*";
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
      message_activity_visible: data?.message_activity_visible ?? true,
      message_typing_indicators: data?.message_typing_indicators ?? true,
      message_requests_enabled: data?.message_requests_enabled ?? true,
      message_notification_previews: data?.message_notification_previews ?? false,
      verification_status: String(data?.verification_status || "not_started"), subscription_plan: String(data?.subscription_plan || "standard"),
    };
    setForm(next); setSavedForm(next);
    writeMessagePrivacy(profileRowToMessagePrivacy(next as unknown as Record<string, unknown>));
    setLoading(false);
  }

  function field<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) { setForm((current) => ({ ...current, [key]: value })); }

  function rpcPayload(source: ProfileForm, userId: string) {
    return {
      id: userId, full_name: source.full_name.trim(), phone: source.phone.trim(), whatsapp_number: source.whatsapp_number.trim(), company_name: source.company_name.trim(), job_title: source.job_title.trim(),
      city: source.city.trim(), province: source.province, bio: source.bio.trim(), avatar_url: source.avatar_url,
      email_notifications: source.email_notifications, chat_notifications: source.chat_notifications, listing_notifications: source.listing_notifications, marketing_notifications: source.marketing_notifications,
      message_activity_visible: source.message_activity_visible,
      message_typing_indicators: source.message_typing_indicators,
      message_requests_enabled: source.message_requests_enabled,
      message_notification_previews: source.message_notification_previews,
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
      if (key.startsWith("message_")) {
        writeMessagePrivacy({
          activityVisible: nextSaved.message_activity_visible,
          typingIndicators: nextSaved.message_typing_indicators,
          allowNewRequests: nextSaved.message_requests_enabled,
          notificationPreviews: nextSaved.message_notification_previews,
        });
      }
      setMessage("Preference saved.");
    } catch (error) {
      setForm((current) => ({ ...current, [key]: previous }));
      setMessage(friendlyError(error, "The preference could not be saved."));
    } finally { setPreferenceSaving(null); }
  }

  async function enablePush() {
    if (pushBusy || pushState === "enabled") return;
    setPushBusy(true); setMessage("");
    try {
      const next = await enableLoadLinkPush();
      setPushState(next);
      if (next === "enabled") setMessage("Push notifications are enabled on this device.");
      else if (next === "blocked") setMessage("Push notifications are blocked in this browser's notification settings.");
      else if (next === "unconfigured") setMessage("Push notifications need the VAPID keys from PUSH-NOTIFICATIONS-SETUP.txt before they can be enabled.");
      else if (next === "unsupported") setMessage("This browser does not support web push notifications.");
    } catch (error) {
      setMessage(friendlyError(error, "Push notifications could not be enabled."));
    } finally { setPushBusy(false); }
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
    if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) { setMessage("Use at least 12 characters with upper/lowercase, a number and a symbol."); return; }
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

  if (loading) {
    return (
      <main className={`min-h-screen ${page}`}>
        <header className={`sticky top-0 z-50 border-b ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}>
          <div className="relative mx-auto flex h-[76px] max-w-6xl items-center px-4 sm:px-5">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 sm:left-5"><SiteMenu darkMode={darkMode} /></div>
            <HomeLogoLink theme="auto" showGlow={false} className="pointer-events-auto absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center" logoClassName="w-[132px] sm:w-[148px]" />
            <LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme} className="absolute right-4 top-1/2 -translate-y-1/2 sm:right-5" />
          </div>
        </header>
        <section className="relative mx-auto flex min-h-[calc(100vh-76px)] max-w-5xl items-center justify-center overflow-hidden px-4 py-8 sm:px-5 md:py-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(246,184,0,.12),transparent_46%)]" />
          <div className={`relative w-full max-w-2xl rounded-[30px] border p-4 text-center shadow-2xl sm:p-6 ${darkMode ? "border-white/10 bg-white/[.035]" : "border-black/10 bg-white"}`}>
            <TruckGearboxSketch darkMode={darkMode} />
            <h1 className="mt-5 text-2xl font-black tracking-[-.035em] sm:text-3xl">Preparing your settings</h1>
            <p className={`mx-auto mt-2 max-w-md text-sm font-semibold leading-6 ${muted}`}>Loading your profile, messages and security preferences.</p>
            <div className="mt-5 flex justify-center gap-2" aria-label="Loading settings">
              {[0, 1, 2].map((item) => <span key={item} className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#f6b800]" style={{ animationDelay: `${item * 120}ms` }} />)}
            </div>
          </div>
        </section>
      </main>
    );
  }

  const tabClass = (view: "profile" | "messages" | "security") => `min-w-0 flex-1 rounded-xl px-3 py-3 text-xs font-semibold transition ${settingsView === view ? "bg-[#f6b800] text-black shadow-sm" : (darkMode ? "text-white/55 hover:bg-white/[.05]" : "text-black/55 hover:bg-black/[.04]")}`;

  return (
    <main className={`min-h-screen ${page}`}>
      <header className={`sticky top-0 z-50 border-b ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}>
        <div className="relative mx-auto flex h-[76px] max-w-6xl items-center px-4 sm:px-5">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 sm:left-5"><SiteMenu darkMode={darkMode} /></div>
          <HomeLogoLink theme="auto" showGlow={false} className="pointer-events-auto absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center" logoClassName="w-[132px] sm:w-[148px]" />
          <LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme} className="absolute right-4 top-1/2 -translate-y-1/2 sm:right-5" />
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-7 sm:px-5 md:px-8 md:py-10">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-black tracking-[-.035em] md:text-4xl">Settings</h1>
          <p className={`mt-1.5 text-sm font-semibold leading-6 ${muted}`}>Profile, messages and security.</p>
        </div>


        <div className={`mt-5 flex max-w-xl gap-1 rounded-2xl border p-1.5 ${darkMode ? "border-white/10 bg-white/[.025]" : "border-black/10 bg-white"}`}>
          <button type="button" onClick={() => setSettingsView("profile")} className={tabClass("profile")}>Profile</button>
          <button type="button" onClick={() => setSettingsView("messages")} className={tabClass("messages")}>Messages</button>
          <button type="button" onClick={() => setSettingsView("security")} className={tabClass("security")}>Security</button>
        </div>

        {dirty && settingsView === "profile" ? <p className={`mt-4 text-sm font-medium ${muted}`}>You have unsaved profile changes.</p> : null}
        {message ? <div role="status" className={`mt-5 max-w-3xl rounded-xl border p-3 text-sm font-medium ${darkMode ? "border-white/10 bg-white/[.035]" : "border-black/10 bg-white"}`}>{message}</div> : null}

        {settingsView === "profile" ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-[250px_1fr]">
            <aside className={`h-fit border p-5 ${surface}`}>
              <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-current/15 bg-black text-xl font-bold text-white">{form.avatar_url ? <img src={form.avatar_url} alt="Profile" className="h-full w-full object-cover" /> : initials}</div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadAvatar(event)} className="hidden" />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="mt-4 h-10 w-full rounded-xl bg-black px-4 text-xs font-black text-white disabled:opacity-50">{uploading ? "Uploading…" : "Change photo"}</button>
              <div className={`mt-4 rounded-xl border p-3 ${darkMode ? "border-white/10 bg-white/[.025]" : "border-black/10 bg-black/[.02]"}`}><p className="text-[10px] font-semibold uppercase tracking-[.1em] opacity-50">Profile complete</p><p className="mt-1 text-xl font-bold">{completion}%</p></div>
              <div className={`mt-4 border-t pt-4 ${darkMode ? "border-white/10" : "border-black/10"}`}><Info label="Email" value={user?.email || "Not available"} /><Info label="Verification" value={form.verification_status.replaceAll("_", " ")} /><Info label="Package" value={form.subscription_plan} /></div>
              <div className="mt-4 grid gap-2"><Link href="/verify" className={`flex h-10 items-center justify-center rounded-xl border px-3 text-center text-xs font-black ${darkMode ? "border-white/12" : "border-black/10"}`}>Verification</Link><Link href="/account/packages" className={`flex h-10 items-center justify-center rounded-xl border px-3 text-center text-xs font-black ${darkMode ? "border-white/12" : "border-black/10"}`}>Package</Link>{hasDriverProfile ? <Link href="/driver-profile" className={`flex h-10 items-center justify-center rounded-xl border px-3 text-center text-xs font-black ${darkMode ? "border-white/12" : "border-black/10"}`}>Driver profile</Link> : null}</div>
            </aside>

            <form onSubmit={saveProfile} className={`border p-5 md:p-7 ${surface}`}>
              <h2 className="text-xl font-bold">Professional information</h2>
              <p className={`mt-2 text-sm ${muted}`}>Details other LoadLink users need when dealing with you.</p>
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
              <h3 className="mt-7 text-base font-bold">Notifications</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2"><Toggle label="Email account updates" checked={form.email_notifications} busy={preferenceSaving === "email_notifications"} onChange={(value) => void savePreference("email_notifications", value)} darkMode={darkMode} /><Toggle label="New chat messages" checked={form.chat_notifications} busy={preferenceSaving === "chat_notifications"} onChange={(value) => void savePreference("chat_notifications", value)} darkMode={darkMode} /><Toggle label="Listing and review updates" checked={form.listing_notifications} busy={preferenceSaving === "listing_notifications"} onChange={(value) => void savePreference("listing_notifications", value)} darkMode={darkMode} /><Toggle label="Product news" checked={form.marketing_notifications} busy={preferenceSaving === "marketing_notifications"} onChange={(value) => void savePreference("marketing_notifications", value)} darkMode={darkMode} /></div>
              <button type="submit" disabled={saving || !dirty} className="mt-6 h-11 rounded-xl bg-[#f6b800] px-5 text-xs font-semibold text-black disabled:opacity-40">{saving ? "Saving…" : dirty ? "Save changes" : "Saved"}</button>
            </form>
          </div>
        ) : null}

        {settingsView === "messages" ? (
          <section id="message-privacy" className={`mt-6 max-w-3xl scroll-mt-24 border p-5 md:p-7 ${surface}`}>
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Messages</h2><p className={`mt-2 text-sm leading-6 ${muted}`}>Choose what people can see and how new conversations reach you.</p></div><Link href="/messages" className="flex h-10 items-center justify-center rounded-xl bg-[#f6b800] px-4 text-xs font-semibold text-black">Open messages</Link></div>
            <div className="mt-5 grid gap-2">
              <Toggle label="Share activity status" description="Show when you are active in Messages and your recent activity time." checked={form.message_activity_visible} busy={preferenceSaving === "message_activity_visible"} onChange={(value) => void savePreference("message_activity_visible", value)} darkMode={darkMode} />
              <Toggle label="Share typing indicators" description="Let the other person see when you are typing." checked={form.message_typing_indicators} busy={preferenceSaving === "message_typing_indicators"} onChange={(value) => void savePreference("message_typing_indicators", value)} darkMode={darkMode} />
              <Toggle label="Allow potential deals" description="Let new people contact you about your listings. New enquiries appear in Potential Deals before you accept them." checked={form.message_requests_enabled} busy={preferenceSaving === "message_requests_enabled"} onChange={(value) => void savePreference("message_requests_enabled", value)} darkMode={darkMode} />
              <Toggle label="Show notification previews" description="Show sender and message text in supported notifications." checked={form.message_notification_previews} busy={preferenceSaving === "message_notification_previews"} onChange={(value) => void savePreference("message_notification_previews", value)} darkMode={darkMode} />
            </div>
            <div className={`mt-3 flex items-center justify-between gap-4 rounded-xl border px-4 py-3 ${darkMode ? "border-white/10 bg-white/[.02]" : "border-black/10 bg-black/[.015]"}`}>
              <span className="min-w-0"><strong className="block text-sm font-bold">Push notifications</strong><span className={`mt-1 block text-xs font-semibold ${muted}`}>{pushState === "enabled" ? "Enabled on this device." : pushState === "blocked" ? "Blocked in browser settings." : pushState === "unconfigured" ? "Server setup required once." : pushState === "unsupported" ? "Not supported by this browser." : "Receive new messages when LoadLink is closed."}</span></span>
              <button type="button" onClick={() => void enablePush()} disabled={pushBusy || pushState === "enabled" || pushState === "unsupported"} className={`h-9 shrink-0 rounded-xl px-3 text-[10px] font-semibold ${pushState === "enabled" ? (darkMode ? "bg-white/10 text-white/55" : "bg-black/5 text-black/55") : "bg-[#f6b800] text-black"} disabled:opacity-60`}>{pushBusy ? "Enabling…" : pushState === "enabled" ? "Enabled" : "Enable"}</button>
            </div>
          </section>
        ) : null}

        {settingsView === "security" ? (
          <div className="mt-6 grid max-w-3xl gap-4">
            <section className={`border p-5 md:p-7 ${surface}`}><h2 className="text-xl font-bold">Password</h2><p className={`mt-2 text-sm ${muted}`}>{googleOnly ? "Set a LoadLink password while keeping Google sign-in connected." : "Change your password without disconnecting other sign-in methods."}</p><div className="mt-5 grid gap-4 md:grid-cols-2"><Field label={googleOnly ? "Set a password" : "New password"}><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" className={input} /></Field><Field label="Confirm password"><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" className={input} /></Field></div>{password ? <div className="mt-4"><PasswordStrengthMeter password={password} darkMode={darkMode} /></div> : null}<button type="button" onClick={() => void updatePassword()} disabled={saving || !password} className="mt-5 h-11 rounded-xl bg-[#f6b800] px-5 text-xs font-semibold text-black disabled:opacity-40">{googleOnly ? "Set password" : "Update password"}</button></section>
            <MfaSecurityCard darkMode={darkMode} />
            <section className={`border p-5 md:p-7 ${surface}`}><h2 className="text-xl font-bold">Account access</h2><p className={`mt-2 text-sm ${muted}`}>Sign out or request account deletion.</p><div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={() => void signOut()} className="h-11 rounded-xl border border-red-500 px-5 text-xs font-semibold text-red-500">Sign out</button><button type="button" onClick={requestDeletion} className="h-11 rounded-xl border border-current/20 px-5 text-xs font-semibold">Request deletion</button></div></section>
          </div>
        ) : null}
      </section>
    </main>
  );

}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block text-xs font-semibold uppercase tracking-[.09em]">{label}{children}</label>; }
function Toggle({ label, description, checked, busy, onChange, darkMode }: { label: string; description?: string; checked: boolean; busy?: boolean; onChange: (value: boolean) => void; darkMode: boolean }) { return <div className={`flex min-h-14 items-center justify-between gap-4 rounded-xl border px-4 py-3 ${darkMode ? "border-white/10 bg-white/[.02]" : "border-black/10 bg-black/[.015]"}`}><span className="min-w-0"><strong className="block text-sm font-semibold normal-case tracking-normal">{label}</strong>{description ? <span className={`mt-1 block text-xs font-semibold leading-5 ${darkMode ? "text-white/45" : "text-black/45"}`}>{description}</span> : null}</span><button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} disabled={busy} className={`relative h-7 w-12 shrink-0 rounded-full border transition disabled:opacity-55 ${checked ? "border-[#f6b800] bg-[#f6b800]" : darkMode ? "border-white/20 bg-white/10" : "border-black/20 bg-black/10"}`}><span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} /></button></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="mb-4 last:mb-0"><p className="text-[10px] font-semibold uppercase tracking-[.1em] opacity-50">{label}</p><p className="mt-1 break-words text-sm font-semibold capitalize">{value}</p></div>; }

function isMissingSchemaError(message: string) { return /column|schema cache|does not exist|relation/i.test(message); }
function friendlyError(error: unknown, fallback = "That change could not be completed. Please try again or contact LoadLink support.") {
  const text = error instanceof Error ? error.message : typeof error === "object" && error && "message" in error ? String((error as { message?: unknown }).message || "") : "";
  if (/PHONE_ALREADY_IN_USE/i.test(text)) return "This phone number is already in use on another LoadLink account.";
  if (/INVALID_SOUTH_AFRICAN_PHONE/i.test(text)) return "Enter a valid South African cellphone number.";
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
