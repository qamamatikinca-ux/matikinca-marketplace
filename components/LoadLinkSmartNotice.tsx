"use client";

import type { ReactNode } from "react";

export default function LoadLinkSmartNotice({ title, detail, action, tone = "neutral", onDismiss }: { title: string; detail?: string; action?: ReactNode; tone?: "neutral" | "warning" | "success"; onDismiss?: () => void }) {
  return <div role="status" className="flex items-start gap-3 rounded-[16px] border border-current/10 bg-current/[.025] p-3.5">
    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${tone === "success" ? "bg-emerald-500" : tone === "warning" ? "bg-[#f6b800]" : "bg-current opacity-30"}`} />
    <div className="min-w-0 flex-1"><div className="text-[11px] font-black">{title}</div>{detail ? <div className="mt-1 text-[9px] font-semibold leading-4 opacity-48">{detail}</div> : null}{action ? <div className="mt-2">{action}</div> : null}</div>
    {onDismiss ? <button type="button" onClick={onDismiss} className="shrink-0 text-[10px] font-black opacity-35" aria-label="Dismiss">×</button> : null}
  </div>;
}
