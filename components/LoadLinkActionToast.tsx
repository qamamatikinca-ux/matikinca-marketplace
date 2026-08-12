"use client";

import type { ReactNode } from "react";
import LoadLinkIcon from "@/components/LoadLinkIcon";

export type LoadLinkToastTone = "progress" | "success" | "error" | "info";

export default function LoadLinkActionToast({
  open,
  tone = "info",
  title,
  message,
  progress,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  onClose,
  icon,
}: {
  open: boolean;
  tone?: LoadLinkToastTone;
  title: string;
  message?: string;
  progress?: number;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  onClose?: () => void;
  icon?: ReactNode;
}) {
  if (!open) return null;
  const accent = tone === "success" ? "#79d66c" : tone === "error" ? "#ff7a84" : "#f6b800";
  const safeProgress = typeof progress === "number" ? Math.min(100, Math.max(0, progress)) : null;

  return (
    <section
      role="status"
      aria-live="polite"
      className="fixed left-3 right-3 top-[max(12px,env(safe-area-inset-top))] z-[2147483490] mx-auto w-auto max-w-md overflow-hidden rounded-[25px] border border-white/15 bg-[linear-gradient(145deg,rgba(26,26,26,.72),rgba(7,7,7,.57))] text-white shadow-[0_24px_78px_rgba(0,0,0,.40)] backdrop-blur-3xl backdrop-saturate-150"
      style={{ boxShadow: `0 24px 78px rgba(0,0,0,.40), 0 0 34px ${accent}14` }}
      data-loadlink-action-toast={tone}
    >
      <div className="flex items-start gap-3 p-4">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-black/20" style={{ borderColor: `${accent}66`, color: accent }}>
          {icon || <ToneIcon tone={tone} />}
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className="text-sm font-black tracking-[-.015em] text-white">{title}</h2>
          {message ? <p className="mt-1 text-[11px] font-semibold leading-5 text-white/76">{message}</p> : null}
          {safeProgress !== null ? (
            <div className="mt-3 flex items-center gap-3">
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${safeProgress}%`, backgroundColor: accent }} />
              </div>
              <strong className="text-[10px]" style={{ color: accent }}>{Math.round(safeProgress)}%</strong>
            </div>
          ) : null}
          {primaryLabel || secondaryLabel ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {secondaryLabel ? <button type="button" onClick={onSecondary} className="h-9 rounded-xl border border-white/15 bg-white/[.035] px-3 text-[10px] font-black text-white/78">{secondaryLabel}</button> : null}
              {primaryLabel ? <button type="button" onClick={onPrimary} className="h-9 rounded-xl border px-3 text-[10px] font-black" style={{ borderColor: accent, color: tone === "success" || tone === "progress" ? "#050505" : accent, backgroundColor: tone === "success" || tone === "progress" ? accent : "transparent" }}>{primaryLabel}</button> : null}
            </div>
          ) : null}
        </div>
        {onClose ? (
          <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[.035] text-white/65" aria-label="Dismiss">
            <LoadLinkIcon name="close" size={15} />
          </button>
        ) : null}
      </div>
    </section>
  );
}

function ToneIcon({ tone }: { tone: LoadLinkToastTone }) {
  if (tone === "success") return <LoadLinkIcon name="check" size={20} strokeWidth={2.2} />;
  if (tone === "error") return <LoadLinkIcon name="close" size={20} strokeWidth={2.2} />;
  if (tone === "progress") return <LoadLinkIcon name="send" size={20} />;
  return <LoadLinkIcon name="message" size={20} />;
}
