import { normaliseMarketplaceStatus, STATUS_LABELS } from "@/lib/marketplace/status";

const styles = {
  draft: "border-white/20 bg-white/5 text-current",
  submitted: "border-sky-500/40 bg-sky-500/10 text-sky-600",
  under_review: "border-amber-500/40 bg-amber-500/10 text-amber-700",
  approved: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
  active: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
  reserved: "border-violet-500/40 bg-violet-500/10 text-violet-700",
  sold: "border-slate-500/40 bg-slate-500/10 text-slate-600",
  rejected: "border-red-500/40 bg-red-500/10 text-red-700",
  suspended: "border-red-500/40 bg-red-500/10 text-red-700",
  expired: "border-slate-500/40 bg-slate-500/10 text-slate-600",
  archived: "border-slate-500/40 bg-slate-500/10 text-slate-600",
};

export default function StatusBadge({ status, label }: { status: unknown; label?: string }) {
  const value = normaliseMarketplaceStatus(status);
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[.1em] ${styles[value]}`}>{label || STATUS_LABELS[value]}</span>;
}
