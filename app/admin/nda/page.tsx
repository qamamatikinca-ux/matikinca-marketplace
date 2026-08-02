"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import LoadLinkLogo from "@/components/LoadLinkLogo";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type CurrentNda = {
  id: string;
  version: string;
  title: string;
  summary: string;
  agreementText: string;
  effectiveAt: string;
  createdAt: string;
};

type DashboardUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  status: "active" | "flagged" | "suspended" | "blocked";
  reason: string | null;
  suspended_until: string | null;
  nda_accepted: boolean;
};

type Acceptance = {
  user_id: string;
  email: string | null;
  accepted_name: string;
  accepted_at: string;
  version: string;
};

type Dashboard = {
  enforcementEnabled: boolean;
  currentNda: CurrentNda | null;
  stats: {
    totalUsers: number;
    acceptedCurrent: number;
    declinedCurrent: number;
    restrictedUsers: number;
  };
  users: DashboardUser[];
  recentAcceptances: Acceptance[];
};

function nextVersion() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  return `${date}.${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
}

export default function NdaControlCentrePage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [version, setVersion] = useState(nextVersion());
  const [title, setTitle] = useState("LoadLink Confidentiality and Restricted-Use Agreement");
  const [summary, setSummary] = useState("");
  const [agreementText, setAgreementText] = useState("");

  const acceptanceRate = useMemo(() => {
    if (!dashboard?.stats.totalUsers) return 0;
    return Math.round((dashboard.stats.acceptedCurrent / dashboard.stats.totalUsers) * 100);
  }, [dashboard]);

  const load = useCallback(async (query = "") => {
    setLoading(true);
    setMessage("");
    try {
      if (!isSupabaseConfigured) throw new Error("Supabase is not connected on this deployment.");
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("Sign in with an authorised LoadLink Control Centre account.");

      const { data, error } = await supabase.rpc("loadlink_admin_nda_dashboard", {
        p_search: query.trim() || null,
      });
      if (error) throw error;
      const result = data as Dashboard;
      setDashboard(result);
      if (result.currentNda) {
        setTitle((current) => current || result.currentNda?.title || "");
        setSummary((current) => current || result.currentNda?.summary || "");
        setAgreementText((current) => current || result.currentNda?.agreementText || "");
      }
    } catch (loadError) {
      setDashboard(null);
      setMessage(loadError instanceof Error ? loadError.message : "The NDA Control Centre could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function publishVersion() {
    if (busy) return;
    if (version.trim().length < 3 || title.trim().length < 8 || summary.trim().length < 20 || agreementText.trim().length < 1000) {
      setMessage("Complete the version, title, summary and full agreement before publishing.");
      return;
    }
    const confirmed = window.confirm("Publish this as the new active agreement? Every non-admin user will be locked out until they accept this version.");
    if (!confirmed) return;

    setBusy(true);
    setMessage("");
    try {
      const { data, error } = await supabase.rpc("loadlink_admin_publish_nda", {
        p_version: version.trim(),
        p_title: title.trim(),
        p_summary: summary.trim(),
        p_agreement_text: agreementText.trim(),
        p_effective_at: new Date().toISOString(),
      });
      if (error) throw error;
      setDashboard(data as Dashboard);
      setShowEditor(false);
      setVersion(nextVersion());
      setMessage("New NDA version published. Users must accept it before access is restored.");
    } catch (publishError) {
      setMessage(publishError instanceof Error ? publishError.message : "The agreement could not be published.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnforcement() {
    if (!dashboard || busy) return;
    const next = !dashboard.enforcementEnabled;
    const confirmed = window.confirm(next
      ? "Enable the NDA gate? Non-admin users will be locked out until they accept the current version."
      : "Temporarily disable the NDA gate? This restores public browsing, while blocked and suspended signed-in accounts remain restricted.");
    if (!confirmed) return;

    setBusy(true);
    setMessage("");
    try {
      const { data, error } = await supabase.rpc("loadlink_admin_set_nda_enforcement", { p_enabled: next });
      if (error) throw error;
      setDashboard(data as Dashboard);
      setMessage(next ? "NDA enforcement enabled." : "NDA enforcement temporarily disabled.");
    } catch (toggleError) {
      setMessage(toggleError instanceof Error ? toggleError.message : "NDA enforcement could not be changed.");
    } finally {
      setBusy(false);
    }
  }

  async function setUserAccess(user: DashboardUser, status: DashboardUser["status"]) {
    if (busy) return;
    let reason: string | null = null;
    let suspendedUntil: string | null = null;

    if (status === "blocked" || status === "suspended") {
      reason = window.prompt(`${status === "blocked" ? "Block" : "Suspend"} ${user.email || user.display_name || "this user"}. Enter the reason:`)?.trim() || "";
      if (reason.length < 4) {
        setMessage("A clear reason is required for a restriction.");
        return;
      }
    }
    if (status === "suspended") {
      const daysText = window.prompt("Number of days to suspend this account", "7") || "7";
      const days = Math.max(1, Math.min(365, Number(daysText) || 7));
      const until = new Date();
      until.setDate(until.getDate() + days);
      suspendedUntil = until.toISOString();
    }
    if (status === "active") {
      reason = window.prompt("Optional note for restoring access", "Access restored by the LoadLink Control Centre")?.trim() || null;
    }

    const confirmed = window.confirm(`Confirm account status: ${status.toUpperCase()}?`);
    if (!confirmed) return;

    setBusy(true);
    setMessage("");
    try {
      const { data, error } = await supabase.rpc("loadlink_admin_set_user_access", {
        p_user_id: user.id,
        p_status: status,
        p_reason: reason,
        p_suspended_until: suspendedUntil,
      });
      if (error) throw error;
      setDashboard(data as Dashboard);
      setMessage(`${user.email || user.display_name || "User"} is now ${status}.`);
    } catch (accessError) {
      setMessage(accessError instanceof Error ? accessError.message : "The account status could not be changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-6 text-white md:px-7">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-5 border-b border-white/10 pb-6">
          <div className="flex items-center gap-5">
            <LoadLinkLogo theme="dark" showGlow={false} className="h-auto max-h-10 w-auto max-w-[190px]" />
            <div className="border-l border-white/15 pl-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f6b800]">Control Centre</p>
              <h1 className="mt-1 text-2xl font-black tracking-[-0.03em]">NDA and access protection</h1>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => void load(search)} disabled={loading || busy} className="h-10 border border-white/20 px-4 text-xs font-black uppercase disabled:opacity-40">Refresh</button>
            <Link href="/admin" className="flex h-10 items-center bg-[#f6b800] px-4 text-xs font-black uppercase text-black">Admin home</Link>
          </div>
        </header>

        {message ? <p role="status" className="mt-5 border border-[#f6b800]/35 bg-[#f6b800]/10 p-4 text-sm font-bold text-[#ffe49a]">{message}</p> : null}

        {loading ? (
          <div className="mt-10 border border-white/10 bg-white/[0.03] p-10 text-center">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-[#f6b800]" />
            <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-white/45">Loading protected records</p>
          </div>
        ) : null}

        {!loading && dashboard ? (
          <>
            <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="Registered users" value={dashboard.stats.totalUsers} />
              <Stat label="Accepted current NDA" value={dashboard.stats.acceptedCurrent} detail={`${acceptanceRate}% acceptance`} />
              <Stat label="Decline records" value={dashboard.stats.declinedCurrent} />
              <Stat label="Blocked or suspended" value={dashboard.stats.restrictedUsers} warning />
            </section>

            <section className="mt-7 border border-white/10 bg-[#0b0b0b]">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 p-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f6b800]">Active agreement</p>
                  <h2 className="mt-2 text-2xl font-black">{dashboard.currentNda?.title || "No active agreement"}</h2>
                  <p className="mt-2 text-sm leading-6 text-white/50">Version {dashboard.currentNda?.version || "—"} · Effective {formatDate(dashboard.currentNda?.effectiveAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void toggleEnforcement()} disabled={busy} className={`h-11 border px-5 text-xs font-black uppercase disabled:opacity-40 ${dashboard.enforcementEnabled ? "border-red-400/40 text-red-200" : "border-emerald-400/40 text-emerald-200"}`}>{dashboard.enforcementEnabled ? "Temporarily disable gate" : "Enable NDA gate"}</button>
                  <button type="button" onClick={() => setShowEditor((value) => !value)} className="h-11 bg-[#f6b800] px-5 text-xs font-black uppercase text-black">{showEditor ? "Close editor" : "Publish new version"}</button>
                </div>
              </div>
              <div className="p-5">
                <p className="text-sm leading-7 text-white/65">{dashboard.currentNda?.summary}</p>
                <p className={`mt-4 inline-flex border px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] ${dashboard.enforcementEnabled ? "border-[#f6b800]/35 bg-[#f6b800]/10 text-[#ffe49a]" : "border-emerald-400/35 bg-emerald-400/10 text-emerald-200"}`}>{dashboard.enforcementEnabled ? "Gate enforced" : "Gate temporarily disabled"}</p>
              </div>
            </section>

            {showEditor ? (
              <section className="mt-7 border border-[#f6b800]/35 bg-[#0b0b0b] p-5 md:p-7">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f6b800]">New legal version</p>
                    <h2 className="mt-2 text-2xl font-black">Require re-acceptance</h2>
                  </div>
                  <p className="max-w-md text-xs leading-6 text-white/45">Publishing immediately replaces the active version. Every non-admin user is denied access until the new version is accepted.</p>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <Field label="Version"><input className={inputClass} value={version} onChange={(event) => setVersion(event.target.value)} /></Field>
                  <Field label="Title"><input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
                </div>
                <Field label="Summary"><textarea className={`${inputClass} mt-2 min-h-24 py-3`} value={summary} onChange={(event) => setSummary(event.target.value)} /></Field>
                <Field label="Full agreement text"><textarea className={`${inputClass} mt-2 min-h-[440px] py-4 font-mono text-xs leading-6`} value={agreementText} onChange={(event) => setAgreementText(event.target.value)} /></Field>
                <button type="button" onClick={() => void publishVersion()} disabled={busy} className="mt-5 h-12 w-full bg-[#f6b800] text-xs font-black uppercase tracking-[0.12em] text-black disabled:opacity-40">{busy ? "Publishing…" : "Publish and require every user to accept"}</button>
              </section>
            ) : null}

            <section className="mt-7 border border-white/10 bg-[#0b0b0b]">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 p-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f6b800]">User enforcement</p>
                  <h2 className="mt-2 text-2xl font-black">Acceptance and account status</h2>
                </div>
                <form onSubmit={(event) => { event.preventDefault(); void load(search); }} className="flex w-full max-w-md gap-2">
                  <input className="h-11 min-w-0 flex-1 border border-white/15 bg-black px-4 text-sm text-white outline-none focus:border-[#f6b800]" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" />
                  <button type="submit" className="h-11 bg-white px-4 text-xs font-black uppercase text-black">Search</button>
                </form>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.14em] text-white/40">
                    <tr><th className="px-5 py-4">User</th><th className="px-5 py-4">NDA</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Actions</th></tr>
                  </thead>
                  <tbody>
                    {dashboard.users.map((user) => (
                      <tr key={user.id} className="border-b border-white/[0.07] align-top">
                        <td className="px-5 py-4"><p className="font-black text-white">{user.display_name || "Unnamed user"}</p><p className="mt-1 text-xs text-white/45">{user.email || "No email"}</p><p className="mt-1 text-[10px] text-white/30">Joined {formatDate(user.created_at)}</p></td>
                        <td className="px-5 py-4"><Badge positive={user.nda_accepted}>{user.nda_accepted ? "Accepted" : "Not accepted"}</Badge></td>
                        <td className="px-5 py-4"><Badge positive={user.status === "active"} danger={user.status === "blocked" || user.status === "suspended"}>{user.status}</Badge>{user.reason ? <p className="mt-2 max-w-xs text-xs leading-5 text-white/45">{user.reason}</p> : null}</td>
                        <td className="px-5 py-4"><div className="flex min-w-[260px] flex-wrap gap-2">
                          {user.status !== "active" ? <Action onClick={() => void setUserAccess(user, "active")}>Restore</Action> : null}
                          {user.status !== "suspended" ? <Action onClick={() => void setUserAccess(user, "suspended")}>Suspend</Action> : null}
                          {user.status !== "blocked" ? <Action danger onClick={() => void setUserAccess(user, "blocked")}>Block</Action> : null}
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {dashboard.users.length === 0 ? <p className="p-7 text-center text-sm text-white/45">No users match this search.</p> : null}
            </section>

            <section className="mt-7 border border-white/10 bg-[#0b0b0b]">
              <div className="border-b border-white/10 p-5"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f6b800]">Audit evidence</p><h2 className="mt-2 text-2xl font-black">Recent NDA acceptances</h2></div>
              <div className="grid gap-px bg-white/10 md:grid-cols-2">
                {dashboard.recentAcceptances.map((item) => (
                  <article key={`${item.user_id}-${item.accepted_at}`} className="bg-[#0b0b0b] p-5"><p className="font-black">{item.accepted_name}</p><p className="mt-1 text-xs text-white/45">{item.email || "No email"}</p><p className="mt-3 text-[10px] font-black uppercase tracking-[0.12em] text-[#f6b800]">Version {item.version} · {formatDateTime(item.accepted_at)}</p></article>
                ))}
              </div>
              {dashboard.recentAcceptances.length === 0 ? <p className="p-7 text-center text-sm text-white/45">No acceptance records for the current installation yet.</p> : null}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

const inputClass = "mt-2 w-full border border-white/15 bg-black px-4 text-sm font-semibold text-white outline-none focus:border-[#f6b800] h-12";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="mt-4 block text-xs font-black uppercase tracking-[0.12em] text-white/60">{label}{children}</label>;
}

function Stat({ label, value, detail, warning = false }: { label: string; value: number; detail?: string; warning?: boolean }) {
  return <article className={`border p-5 ${warning ? "border-red-400/30 bg-red-400/[0.07]" : "border-white/10 bg-white/[0.03]"}`}><p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/45">{label}</p><p className={`mt-3 text-4xl font-black ${warning ? "text-red-300" : "text-white"}`}>{value}</p>{detail ? <p className="mt-2 text-xs font-bold text-[#f6b800]">{detail}</p> : null}</article>;
}

function Badge({ children, positive = false, danger = false }: { children: React.ReactNode; positive?: boolean; danger?: boolean }) {
  const style = danger ? "border-red-400/35 bg-red-400/10 text-red-200" : positive ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-200" : "border-[#f6b800]/35 bg-[#f6b800]/10 text-[#ffe49a]";
  return <span className={`inline-flex border px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] ${style}`}>{children}</span>;
}

function Action({ children, onClick, danger = false }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return <button type="button" onClick={onClick} className={`h-9 border px-3 text-[10px] font-black uppercase ${danger ? "border-red-400/45 text-red-200" : "border-white/20 text-white"}`}>{children}</button>;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-ZA");
}
