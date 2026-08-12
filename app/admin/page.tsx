"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import { isAuthenticatedUser } from "@/lib/auth";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type TeamMember = {
  user_id: string;
  email: string;
  display_name: string;
  role: string;
  department: string | null;
  employee_code: string | null;
  job_title: string | null;
  avatar_path: string | null;
  work_status: string;
  employment_status: string;
  last_seen_at: string | null;
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  department: string | null;
  priority: string;
  status: string;
  assigned_to: string | null;
  assigned_name: string;
  assigned_avatar: string | null;
  due_at: string | null;
  started_at: string | null;
  updated_at: string;
};

type HomeFeed = {
  team: TeamMember[];
  tasks: Task[];
  metrics: {
    active_staff: number;
    open_tasks: number;
    urgent_tasks: number;
    marketing_tasks: number;
  };
};

const EMPTY: HomeFeed = {
  team: [],
  tasks: [],
  metrics: { active_staff: 0, open_tasks: 0, urgent_tasks: 0, marketing_tasks: 0 },
};

export default function AdminPage() {
  const router = useRouter();
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [feed, setFeed] = useState<HomeFeed>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (!isSupabaseConfigured) throw new Error("Control Centre connection is unavailable.");
      const { data: { user } } = await supabase.auth.getUser();
      if (!isAuthenticatedUser(user)) {
        router.replace("/login?next=/admin");
        return;
      }
      const access = await supabase.rpc("is_loadlink_admin");
      if (access.error || access.data !== true) {
        router.replace("/");
        return;
      }
      const result = await supabase.rpc("loadlink_control_centre_home");
      if (result.error) throw result.error;
      setFeed((result.data || EMPTY) as unknown as HomeFeed);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Control Centre could not load.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  const marketingLead = useMemo(
    () => feed.team.find((member) => member.job_title?.toLowerCase() === "head of marketing"),
    [feed.team],
  );
  const marketingTask = useMemo(
    () => feed.tasks.find((task) => task.assigned_to === marketingLead?.user_id && task.department?.toLowerCase() === "marketing"),
    [feed.tasks, marketingLead],
  );

  if (loading) return <main className="min-h-screen bg-black text-white"><LoadLinkLoading /></main>;

  const page = darkMode ? "bg-[#050505] text-white" : "bg-[#f3efe5] text-black";
  const glass = darkMode
    ? "border-white/12 bg-white/[.065] shadow-[0_24px_70px_rgba(0,0,0,.36)]"
    : "border-white/70 bg-white/[.52] shadow-[0_24px_70px_rgba(74,58,19,.10)]";
  const muted = darkMode ? "text-white/55" : "text-black/55";

  return (
    <main className={`min-h-screen overflow-x-hidden ${page}`}>
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div className={`absolute -left-24 top-10 h-80 w-80 rounded-full blur-[110px] ${darkMode ? "bg-[#f6b800]/10" : "bg-[#f6b800]/16"}`} />
        <div className={`absolute right-[-8rem] top-[22rem] h-96 w-96 rounded-full blur-[130px] ${darkMode ? "bg-white/[.035]" : "bg-white/70"}`} />
      </div>

      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <section className="relative mx-auto max-w-7xl px-4 py-7 sm:px-5 md:px-8 md:py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className={`text-xs font-bold ${muted}`}>LoadLink Control Centre</p>
            <h1 className="mt-1 text-3xl font-black tracking-[-.045em] md:text-5xl">Work centre</h1>
            <p className={`mt-2 max-w-2xl text-sm font-semibold leading-6 ${muted}`}>People, priority work and operational queues in one place.</p>
          </div>
          <button type="button" onClick={() => void load()} className={`h-10 rounded-xl border px-4 text-xs font-black backdrop-blur-xl ${glass}`}>Refresh</button>
        </div>

        {error ? <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-500">{error}</div> : null}

        <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Active team" value={feed.metrics.active_staff} glass={glass} muted={muted} />
          <Metric label="Open work" value={feed.metrics.open_tasks} glass={glass} muted={muted} />
          <Metric label="Urgent" value={feed.metrics.urgent_tasks} glass={glass} muted={muted} accent />
          <Metric label="Marketing" value={feed.metrics.marketing_tasks} glass={glass} muted={muted} />
        </div>

        {marketingLead ? (
          <section className={`mt-5 overflow-hidden rounded-[26px] border backdrop-blur-2xl ${glass}`}>
            <div className="grid md:grid-cols-[230px_1fr]">
              <div className="relative min-h-[290px] overflow-hidden bg-black md:min-h-[340px]">
                {marketingLead.avatar_path ? <img src={marketingLead.avatar_path} alt={`${marketingLead.display_name}, ${marketingLead.job_title || "LoadLink team"}`} className="absolute inset-0 h-full w-full object-cover object-top" /> : null}
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/85 to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 text-white">
                  <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#f6b800]" /><span className="text-[10px] font-black uppercase tracking-[.12em]">{statusLabel(marketingLead.work_status)}</span></div>
                </div>
              </div>

              <div className="p-5 md:p-7 lg:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className={`text-xs font-bold ${muted}`}>Marketing leadership</p>
                    <h2 className="mt-1 text-3xl font-black tracking-[-.04em]">{marketingLead.display_name}</h2>
                    <p className="mt-1 text-sm font-bold">{marketingLead.job_title}</p>
                    <p className={`mt-1 text-xs font-semibold ${muted}`}>{marketingLead.employee_code || "LoadLink team"} · {marketingLead.department}</p>
                  </div>
                  {marketingTask?.due_at ? <div className="rounded-2xl border border-[#f6b800]/35 bg-[#f6b800]/10 px-4 py-3"><p className="text-[10px] font-black uppercase tracking-[.1em]">Owner submission</p><p className="mt-1 text-sm font-black">{formatDate(marketingTask.due_at)}</p></div> : null}
                </div>

                {marketingTask ? (
                  <div className={`mt-6 rounded-2xl border p-5 backdrop-blur-xl ${darkMode ? "border-white/10 bg-black/25" : "border-white/75 bg-white/35"}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#f6b800] px-2.5 py-1 text-[9px] font-black uppercase text-black">Current priority</span>
                      <span className={`text-[10px] font-bold uppercase tracking-[.08em] ${muted}`}>{marketingTask.priority}</span>
                    </div>
                    <h3 className="mt-3 text-xl font-black">{marketingTask.title}</h3>
                    <p className={`mt-3 text-sm font-semibold leading-6 ${muted}`}>{marketingTask.description}</p>
                    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <MiniStat value="180" label="Dealer prospects" darkMode={darkMode} />
                      <MiniStat value="20" label="Per province" darkMode={darkMode} />
                      <MiniStat value="10" label="Drivers" darkMode={darkMode} />
                      <MiniStat value="Free trial" label="Dealer offer" darkMode={darkMode} />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
          <div className={`rounded-[24px] border p-5 backdrop-blur-2xl md:p-6 ${glass}`}>
            <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black">Team</h2><p className={`mt-1 text-xs font-semibold ${muted}`}>Active Control Centre staff</p></div><span className={`text-xs font-bold ${muted}`}>{feed.team.length} people</span></div>
            <div className="mt-4 grid gap-2">
              {feed.team.map((member) => (
                <div key={member.user_id} className={`flex items-center gap-3 rounded-2xl border p-3 ${darkMode ? "border-white/8 bg-black/20" : "border-white/70 bg-white/30"}`}>
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-[#f6b800]/55 bg-black">{member.avatar_path ? <img src={member.avatar_path} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-xs font-black text-[#f6b800]">{initials(member.display_name)}</span>}</div>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{member.display_name}</p><p className={`truncate text-xs font-semibold ${muted}`}>{member.job_title || roleLabel(member.role)}{member.department ? ` · ${member.department}` : ""}</p></div>
                  <span className={`h-2.5 w-2.5 rounded-full ${member.work_status === "focus" ? "bg-[#f6b800]" : member.work_status === "offline" ? "bg-current opacity-20" : "bg-emerald-500"}`} />
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-[24px] border p-5 backdrop-blur-2xl md:p-6 ${glass}`}>
            <h2 className="text-xl font-black">Control Centre</h2>
            <p className={`mt-1 text-xs font-semibold ${muted}`}>Operational workspaces</p>
            <div className="mt-4 grid gap-2">
              <WorkspaceLink href="/admin/verifications" title="Verification requests" subtitle="Identity and company reviews" darkMode={darkMode} />
              <WorkspaceLink href="/admin/dealerships" title="Dealership approvals" subtitle="Dealer applications and documents" darkMode={darkMode} />
              <WorkspaceLink href="/admin/package-requests" title="Package requests" subtitle="Tailored pricing and approvals" darkMode={darkMode} />
              <WorkspaceLink href="/admin/customer-experience" title="Customer experience" subtitle="Posting feedback and follow-up" darkMode={darkMode} />
              <WorkspaceLink href="/" title="Public LoadLink" subtitle="Open marketplace" darkMode={darkMode} />
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value, glass, muted, accent = false }: { label: string; value: number; glass: string; muted: string; accent?: boolean }) {
  return <div className={`rounded-[22px] border p-4 backdrop-blur-2xl ${glass}`}><p className={`text-[10px] font-bold uppercase tracking-[.08em] ${muted}`}>{label}</p><p className={`mt-2 text-3xl font-black ${accent ? "text-[#f6b800]" : ""}`}>{value}</p></div>;
}
function MiniStat({ value, label, darkMode }: { value: string; label: string; darkMode: boolean }) { return <div className={`rounded-xl border p-3 ${darkMode ? "border-white/8 bg-white/[.035]" : "border-black/5 bg-white/35"}`}><p className="text-sm font-black">{value}</p><p className={`mt-1 text-[9px] font-bold ${darkMode ? "text-white/45" : "text-black/45"}`}>{label}</p></div>; }
function WorkspaceLink({ href, title, subtitle, darkMode }: { href: string; title: string; subtitle: string; darkMode: boolean }) { return <Link href={href} className={`flex items-center justify-between gap-3 rounded-2xl border p-4 transition hover:border-[#f6b800]/60 ${darkMode ? "border-white/8 bg-black/20" : "border-white/70 bg-white/30"}`}><span><strong className="block text-sm font-black">{title}</strong><span className={`mt-1 block text-xs font-semibold ${darkMode ? "text-white/45" : "text-black/45"}`}>{subtitle}</span></span><span aria-hidden="true" className="text-lg opacity-45">›</span></Link>; }
function initials(value: string) { return value.split(/\s+/).slice(0,2).map((part) => part[0] || "").join("").toUpperCase(); }
function statusLabel(value: string) { if (value === "focus") return "Focused"; if (value === "busy") return "Busy"; if (value === "away") return "Away"; if (value === "offline") return "Offline"; return "Available"; }
function roleLabel(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "14 Aug 2026" : date.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }); }
