"use client";

import { useEffect, useRef, useState } from "react";
import LoadLinkIcon from "@/components/LoadLinkIcon";

type ToastKind = "progress" | "success" | "error" | "info";
type ToastDetail = {
  id?: string;
  kind?: ToastKind;
  title: string;
  message?: string;
  progress?: number;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
};

type ToastItem = Required<Pick<ToastDetail, "id" | "kind" | "title">> & Omit<ToastDetail, "id" | "kind" | "title">;

declare global {
  interface WindowEventMap {
    "loadlink:toast": CustomEvent<ToastDetail>;
  }
}

export function showLoadLinkToast(detail: ToastDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("loadlink:toast", { detail }));
}

export default function LoadLinkToastCenter() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, number>());

  useEffect(() => {
    const onToast = (event: CustomEvent<ToastDetail>) => {
      const incoming = event.detail || ({} as ToastDetail);
      if (!incoming.title) return;
      const id = incoming.id || `loadlink-toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const next: ToastItem = {
        id,
        kind: incoming.kind || "info",
        title: incoming.title,
        message: incoming.message,
        progress: incoming.progress,
        actionLabel: incoming.actionLabel,
        onAction: incoming.onAction,
        duration: incoming.duration,
      };

      setItems((current) => {
        const without = current.filter((item) => item.id !== id);
        return [...without, next].slice(-3);
      });

      const previous = timers.current.get(id);
      if (previous) window.clearTimeout(previous);
      if (next.kind !== "progress") {
        const timer = window.setTimeout(() => {
          setItems((current) => current.filter((item) => item.id !== id));
          timers.current.delete(id);
        }, Math.max(1800, next.duration || 5200));
        timers.current.set(id, timer);
      }
    };

    window.addEventListener("loadlink:toast", onToast as EventListener);
    return () => {
      window.removeEventListener("loadlink:toast", onToast as EventListener);
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current.clear();
    };
  }, []);

  function dismiss(id: string) {
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
    setItems((current) => current.filter((item) => item.id !== id));
  }

  if (!items.length) return null;

  return (
    <div
      data-loadlink-toast-center="true"
      className="pointer-events-none fixed inset-x-0 top-[max(14px,env(safe-area-inset-top))] z-[2147483500] flex flex-col items-center gap-2 px-3 sm:items-end sm:px-5"
      aria-live="polite"
      aria-atomic="false"
    >
      {items.map((item) => {
        const status = item.kind === "success" ? "text-emerald-300" : item.kind === "error" ? "text-red-300" : "text-[#f6b800]";
        const iconName = item.kind === "success" ? "check" : item.kind === "error" ? "close" : item.kind === "progress" ? "send" : "message";
        const progress = typeof item.progress === "number" ? Math.max(0, Math.min(100, item.progress)) : null;
        return (
          <section
            key={item.id}
            className="pointer-events-auto w-full max-w-[430px] overflow-hidden rounded-[25px] border border-white/15 bg-[linear-gradient(145deg,rgba(26,26,26,.73),rgba(7,7,7,.58))] text-white shadow-[0_24px_75px_rgba(0,0,0,.38)] backdrop-blur-3xl backdrop-saturate-150"
          >
            <div className="flex items-start gap-3 p-4">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-current/25 bg-current/[.06] ${status}`}>
                <LoadLinkIcon name={iconName} size={19} strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm font-black tracking-[-.01em] text-white">{item.title}</p>
                {item.message ? <p className="mt-1 text-xs font-semibold leading-5 text-white/76">{item.message}</p> : null}
                {progress !== null ? (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/15">
                      <div className="h-full rounded-full bg-[#f6b800] transition-[width] duration-300" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="w-9 text-right text-[10px] font-black text-white/72">{Math.round(progress)}%</span>
                  </div>
                ) : null}
                {item.actionLabel && item.onAction ? (
                  <button
                    type="button"
                    onClick={() => { item.onAction?.(); dismiss(item.id); }}
                    className="mt-3 h-9 rounded-xl border border-[#f6b800]/45 bg-[#f6b800]/[.09] px-3 text-[10px] font-black text-[#f6b800]"
                  >
                    {item.actionLabel}
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[.04] text-white/65"
                aria-label="Dismiss notification"
              >
                <LoadLinkIcon name="close" size={15} />
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
