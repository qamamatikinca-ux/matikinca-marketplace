"use client";

import type { ReactNode } from "react";

export function Surface({ darkMode, children, className = "" }: { darkMode: boolean; children: ReactNode; className?: string }) {
  return <section className={`rounded-[16px] border shadow-[0_12px_34px_rgba(0,0,0,.045)] backdrop-blur-xl ${darkMode ? "border-white/[.085] bg-white/[.035] text-white shadow-black/20" : "border-black/[.075] bg-white/72 text-black"} ${className}`}>{children}</section>;
}

export function SectionHeading({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return <div className="flex items-start justify-between gap-4"><div className="min-w-0"><h2 className="text-[17px] font-black tracking-[-.025em] sm:text-[18px]">{title}</h2>{detail ? <p className="mt-1 max-w-2xl text-[13px] leading-5 opacity-50">{detail}</p> : null}</div>{action}</div>;
}

export function PrimaryButton({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`min-h-11 rounded-[10px] border border-[#f6b800] bg-[#f6b800] px-4 text-[13px] font-black text-black transition duration-150 hover:brightness-[.98] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45 ${className}`}>{children}</button>;
}

export function SecondaryButton({ darkMode, children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { darkMode: boolean }) {
  return <button {...props} className={`min-h-11 rounded-[10px] border px-4 text-[13px] font-black shadow-none transition duration-150 active:translate-y-px disabled:opacity-45 ${darkMode ? "border-white/12 bg-white/[.025] text-white hover:bg-white/[.055]" : "border-black/[.09] bg-white/62 text-black hover:bg-black/[.025]"} ${className}`}>{children}</button>;
}

export function Input({ darkMode, className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement> & { darkMode: boolean }) {
  return <input {...props} className={`h-11 w-full rounded-[10px] border px-3.5 text-sm font-semibold outline-none transition duration-150 focus:border-[#f6b800]/70 focus:ring-2 focus:ring-[#f6b800]/12 ${darkMode ? "border-white/[.09] bg-white/[.035] text-white placeholder:text-white/28" : "border-black/[.08] bg-white/64 text-black placeholder:text-black/30"} ${className}`} />;
}

export function Textarea({ darkMode, className = "", ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { darkMode: boolean }) {
  return <textarea {...props} className={`min-h-28 w-full rounded-[10px] border px-3.5 py-3 text-sm font-semibold outline-none transition duration-150 focus:border-[#f6b800]/70 focus:ring-2 focus:ring-[#f6b800]/12 ${darkMode ? "border-white/[.09] bg-white/[.035] text-white placeholder:text-white/28" : "border-black/[.08] bg-white/64 text-black placeholder:text-black/30"} ${className}`} />;
}

export function Select({ darkMode, className = "", ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { darkMode: boolean }) {
  return <select {...props} className={`h-11 w-full rounded-[10px] border px-3 text-sm font-bold outline-none transition duration-150 focus:border-[#f6b800]/70 focus:ring-2 focus:ring-[#f6b800]/12 ${darkMode ? "border-white/[.09] bg-[#111] text-white" : "border-black/[.08] bg-white/64 text-black"} ${className}`} />;
}

export function Metric({ label, value, detail, attention = false, darkMode }: { label: string; value: string | number; detail?: string; attention?: boolean; darkMode: boolean }) {
  return <div className={`min-h-[96px] rounded-[14px] border px-4 py-4 ${darkMode ? "border-white/[.07] bg-white/[.025]" : "border-black/[.06] bg-white/56"}`}><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-black uppercase tracking-[.1em] opacity-38">{label}</span>{attention ? <span className="h-1.5 w-1.5 rounded-full bg-[#f6b800]" /> : null}</div><div className="mt-2 text-[25px] font-black tracking-[-.045em]">{value}</div>{detail ? <div className="mt-1 text-xs opacity-45">{detail}</div> : null}</div>;
}

export function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <div className="px-5 py-11 text-center"><h3 className="text-[15px] font-black tracking-[-.01em]">{title}</h3><p className="mx-auto mt-2 max-w-md text-[13px] leading-5 opacity-48">{detail}</p>{action ? <div className="mt-4 flex justify-center">{action}</div> : null}</div>;
}

export function StatusDot({ tone = "neutral" }: { tone?: "good" | "warn" | "bad" | "neutral" }) {
  const cls = tone === "good" ? "bg-emerald-500" : tone === "warn" ? "bg-[#f6b800]" : tone === "bad" ? "bg-red-500" : "bg-current opacity-25";
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />;
}

export function Modal({ open, onClose, children, darkMode, title }: { open: boolean; onClose: () => void; children: ReactNode; darkMode: boolean; title: string }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-0 backdrop-blur-[3px] sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><div className={`max-h-[92vh] w-full overflow-y-auto rounded-t-[18px] border p-5 shadow-[0_24px_70px_rgba(0,0,0,.28)] backdrop-blur-2xl sm:max-w-2xl sm:rounded-[16px] ${darkMode ? "border-white/[.09] bg-[#0c0c0c]/94 text-white" : "border-black/[.08] bg-white/94 text-black"}`}><div className="mb-5 flex items-center justify-between gap-4"><h2 className="text-lg font-black tracking-[-.02em]">{title}</h2><button type="button" onClick={onClose} className="h-10 w-10 rounded-[10px] border border-current/10 text-lg font-black transition hover:bg-current/[.05]">×</button></div>{children}</div></div>;
}
