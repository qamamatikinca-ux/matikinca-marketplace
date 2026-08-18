"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import LogisticsMessageTools from "@/components/LogisticsMessageTools";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

const MENU_WIDTH = 224;

export default function ChatComposerActions() {
  const pathname = usePathname();
  const { darkMode } = useLoadLinkTheme();
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ left: 12, bottom: 72 });
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (pathname !== "/messages") {
      setMount(null);
      setOpen(false);
      setToolsOpen(false);
      return;
    }

    let observer: MutationObserver | null = null;
    let composer: HTMLFormElement | null = null;
    let previousPosition = "";
    let previousZIndex = "";
    let previousIsolation = "";

    const locateComposer = () => {
      const row = document.querySelector<HTMLElement>(
        "form.loadlink-chat-composer div.mx-auto.flex.w-full.max-w-3xl.items-end.gap-2",
      );
      const nextComposer = row?.closest<HTMLFormElement>("form.loadlink-chat-composer") || null;
      setMount((current) => (current === row ? current : row));

      if (nextComposer && nextComposer !== composer) {
        if (composer) {
          composer.style.position = previousPosition;
          composer.style.zIndex = previousZIndex;
          composer.style.isolation = previousIsolation;
        }
        composer = nextComposer;
        previousPosition = composer.style.position;
        previousZIndex = composer.style.zIndex;
        previousIsolation = composer.style.isolation;
        composer.style.position = "relative";
        composer.style.zIndex = "500";
        composer.style.isolation = "isolate";
      }
    };

    locateComposer();
    observer = new MutationObserver(locateComposer);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer?.disconnect();
      if (composer) {
        composer.style.position = previousPosition;
        composer.style.zIndex = previousZIndex;
        composer.style.isolation = previousIsolation;
      }
    };
  }, [pathname]);

  const syncMenuPosition = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - MENU_WIDTH - 12));
    const bottom = Math.max(12, window.innerHeight - rect.top + 8);
    setMenuPosition({ left, bottom });
  }, []);

  useEffect(() => {
    if (!open) return;
    syncMenuPosition();
    const update = () => syncMenuPosition();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, syncMenuPosition]);

  if (pathname !== "/messages" || !mount) return null;

  function attachMedia() {
    const input = document.querySelector<HTMLInputElement>(
      "form.loadlink-chat-composer input[type='file']",
    );
    setOpen(false);
    input?.click();
  }

  function insertIntoComposer(message: string) {
    const textarea = document.querySelector<HTMLTextAreaElement>("form.loadlink-chat-composer textarea");
    if (textarea) {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
      descriptor?.set?.call(textarea, message);
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.dispatchEvent(new Event("change", { bubbles: true }));
      textarea.focus();
      return;
    }

    const editable = document.querySelector<HTMLElement>("form.loadlink-chat-composer [contenteditable='true']");
    if (editable) {
      editable.textContent = message;
      editable.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: message }));
      editable.focus();
    }
  }

  function openTools() {
    setOpen(false);
    setToolsOpen(true);
  }

  const threadId = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("conversation") || "active-loadlink-chat"
    : "active-loadlink-chat";

  const menu = open && typeof document !== "undefined"
    ? createPortal(
        <>
          <button
            type="button"
            aria-label="Close chat actions"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[2147483000] cursor-default bg-transparent"
          />
          <div
            className="fixed z-[2147483001] w-56 overflow-hidden rounded-[18px] border border-black/10 bg-white p-1.5 text-black shadow-[0_24px_70px_rgba(0,0,0,.34)] dark:border-white/15 dark:bg-[#111] dark:text-white"
            style={{ left: menuPosition.left, bottom: menuPosition.bottom }}
          >
            <button
              type="button"
              onClick={attachMedia}
              className="flex w-full items-center gap-3 rounded-[13px] px-3 py-3 text-left text-sm font-black hover:bg-black/[.04] active:bg-black/[.07] dark:hover:bg-white/[.06] dark:active:bg-white/[.09]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f6b800] text-black" aria-hidden="true"><AttachmentIcon /></span>
              <span><span className="block">Attach media</span><span className="mt-0.5 block text-[10px] font-semibold text-black/45 dark:text-white/45">Photo, document or file</span></span>
            </button>
            <button
              type="button"
              onClick={openTools}
              className="flex w-full items-center gap-3 rounded-[13px] px-3 py-3 text-left text-sm font-black hover:bg-black/[.04] active:bg-black/[.07] dark:hover:bg-white/[.06] dark:active:bg-white/[.09]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-[#f6b800] dark:bg-[#f6b800] dark:text-black" aria-hidden="true"><TruckToolsIcon /></span>
              <span><span className="block">Logistics tools</span><span className="mt-0.5 block text-[10px] font-semibold text-black/45 dark:text-white/45">Use tools inside this chat</span></span>
            </button>
          </div>
        </>,
        document.body,
      )
    : null;

  return createPortal(
    <>
      <div className="relative z-[520] shrink-0 self-end">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => {
            setOpen((value) => {
              const next = !value;
              if (next) requestAnimationFrame(syncMenuPosition);
              return next;
            });
          }}
          aria-label={open ? "Close chat actions" : "Open chat actions"}
          aria-expanded={open}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-[#f3f0e8] text-[25px] font-medium leading-none text-black shadow-sm transition active:scale-95"
        >
          <span className={`transition-transform duration-150 ${open ? "rotate-45" : ""}`} aria-hidden="true">+</span>
        </button>
      </div>
      {menu}
      <LogisticsMessageTools
        threadId={threadId}
        listingTitle="this LoadLink conversation"
        role="buyer"
        darkMode={darkMode}
        trigger="hidden"
        forceOpen={toolsOpen}
        onClose={() => setToolsOpen(false)}
        onInsert={insertIntoComposer}
      />
    </>,
    mount,
  );
}

function AttachmentIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8.5 12.5 14.8 6.2a3 3 0 0 1 4.2 4.2l-8.1 8.1a5 5 0 0 1-7.1-7.1l8.4-8.4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TruckToolsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 7h11v9H3V7Zm11 3h3.4L21 13.6V16h-7v-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="7" cy="17.5" r="1.7" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.5" cy="17.5" r="1.7" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
