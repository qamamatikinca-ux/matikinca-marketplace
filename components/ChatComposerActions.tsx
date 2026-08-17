"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";

export default function ChatComposerActions() {
  const pathname = usePathname();
  const router = useRouter();
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (pathname !== "/messages") {
      setMount(null);
      setOpen(false);
      return;
    }

    let observer: MutationObserver | null = null;
    const locateComposer = () => {
      const row = document.querySelector<HTMLElement>(
        "form.loadlink-chat-composer div.mx-auto.flex.w-full.max-w-3xl.items-end.gap-2",
      );
      setMount((current) => (current === row ? current : row));
    };

    locateComposer();
    observer = new MutationObserver(locateComposer);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer?.disconnect();
  }, [pathname]);

  if (pathname !== "/messages" || !mount) return null;

  function attachMedia() {
    const input = document.querySelector<HTMLInputElement>(
      "form.loadlink-chat-composer input[type='file']",
    );
    setOpen(false);
    input?.click();
  }

  function openTools() {
    setOpen(false);
    router.push("/tools");
  }

  return createPortal(
    <div className="relative shrink-0 self-end">
      {open ? (
        <div className="absolute bottom-[52px] left-0 z-[120] w-56 overflow-hidden rounded-[18px] border border-black/10 bg-white/95 p-1.5 text-black shadow-[0_20px_55px_rgba(0,0,0,.24)] backdrop-blur-2xl">
          <button
            type="button"
            onClick={attachMedia}
            className="flex w-full items-center gap-3 rounded-[13px] px-3 py-3 text-left text-sm font-black hover:bg-black/[.04] active:bg-black/[.07]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f6b800] text-black" aria-hidden="true">▧</span>
            <span><span className="block">Attach media</span><span className="mt-0.5 block text-[10px] font-semibold text-black/45">Photo, document or file</span></span>
          </button>
          <button
            type="button"
            onClick={openTools}
            className="flex w-full items-center gap-3 rounded-[13px] px-3 py-3 text-left text-sm font-black hover:bg-black/[.04] active:bg-black/[.07]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-[#f6b800]" aria-hidden="true">↗</span>
            <span><span className="block">Logistics tools</span><span className="mt-0.5 block text-[10px] font-semibold text-black/45">Open LoadLink tools</span></span>
          </button>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close chat actions" : "Open chat actions"}
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-[#f3f0e8] text-[25px] font-medium leading-none text-black shadow-sm transition active:scale-95"
      >
        <span className={`transition-transform duration-150 ${open ? "rotate-45" : ""}`} aria-hidden="true">+</span>
      </button>
    </div>,
    mount,
  );
}
