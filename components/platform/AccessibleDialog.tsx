"use client";

import { ReactNode, useEffect, useId, useRef } from "react";

export default function AccessibleDialog({ open, title, description, children, onClose, darkMode, maxWidth = "max-w-lg" }: { open: boolean; title: string; description?: string; children: ReactNode; onClose: () => void; darkMode: boolean; maxWidth?: string }) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !panelRef.current) return;
      const controls = [...panelRef.current.querySelectorAll<HTMLElement>('button,a,input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter((item) => !item.hasAttribute("disabled"));
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    window.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = overflow; window.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [onClose, open]);

  if (!open) return null;
  return <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="presentation"><button type="button" onClick={onClose} className="absolute inset-0" aria-label="Close dialog" /><div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} className={`relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] border p-5 shadow-2xl outline-none sm:rounded-[28px] sm:p-6 ${maxWidth} ${darkMode ? "border-white/10 bg-[#0b0b0b] text-white" : "border-black/10 bg-white text-black"}`}><div className="flex items-start justify-between gap-4"><div><h2 id={titleId} className="text-2xl font-black">{title}</h2>{description ? <p id={descriptionId} className={`mt-2 text-sm leading-6 ${darkMode ? "text-white/55" : "text-black/55"}`}>{description}</p> : null}</div><button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-current/15 text-xl font-black" aria-label="Close">×</button></div><div className="mt-5">{children}</div></div></div>;
}
