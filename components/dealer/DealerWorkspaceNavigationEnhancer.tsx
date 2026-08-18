"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

const DAILY_LABELS: Record<string,string> = { Overview: "Home", Inventory: "Stock", Leads: "Leads", Messages: "Inbox" };
const BUSINESS_TOOLS = ["Reviews","Showroom","Analytics","Customers","Marketing","Team","Verification","Billing","Activity","Dealer settings","Support"];

export default function DealerWorkspaceNavigationEnhancer() {
  const pathname = usePathname();
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (pathname !== "/dealer") { setMount(null); return; }
    let nav: HTMLElement | null = null;
    let holder: HTMLDivElement | null = null;
    let observer: MutationObserver | null = null;

    const apply = () => {
      const next = document.querySelector<HTMLElement>('main[data-loadlink-dealer-control-centre] aside nav');
      if (!next) return;
      nav = next;
      const buttons = Array.from(next.children).filter((node): node is HTMLButtonElement => node instanceof HTMLButtonElement);
      buttons.forEach((button, index) => {
        const text = button.textContent?.trim() || "";
        if (index < 4) {
          button.style.display = "";
          const friendly = DAILY_LABELS[text];
          if (friendly && !button.dataset.loadlinkFriendlyDealerLabel) {
            const textNode = Array.from(button.childNodes).find((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
            if (textNode) textNode.textContent = friendly;
            button.dataset.loadlinkFriendlyDealerLabel = "true";
          }
        } else {
          button.style.display = "none";
        }
      });
      if (!holder || !holder.isConnected) {
        holder = document.createElement("div");
        holder.dataset.loadlinkDealerBusinessTools = "true";
        next.appendChild(holder);
        setMount(holder);
      }
    };

    apply();
    observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer?.disconnect();
      if (nav) Array.from(nav.children).forEach((node) => { if (node instanceof HTMLButtonElement) node.style.display = ""; });
      holder?.remove();
      setMount(null);
    };
  }, [pathname]);

  function openExisting(label: string) {
    const nav = document.querySelector<HTMLElement>('main[data-loadlink-dealer-control-centre] aside nav');
    const button = Array.from(nav?.querySelectorAll<HTMLButtonElement>("button") || []).find((item) => (item.textContent || "").trim() === label);
    button?.click();
    setOpen(false);
  }

  if (!mount) return null;
  return createPortal(
    <div className="mt-2 border-t border-current/10 pt-2">
      <button type="button" onClick={()=>setOpen(v=>!v)} className="flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-left text-[12px] font-black opacity-65 transition hover:bg-current/[.04] hover:opacity-100" aria-expanded={open}>
        <span>Business tools</span><span className="text-base opacity-45">{open?"−":"+"}</span>
      </button>
      {open ? <div className="mt-1 grid gap-1 rounded-xl border border-current/10 p-1.5">{BUSINESS_TOOLS.map((label)=><button key={label} type="button" onClick={()=>openExisting(label)} className="min-h-9 rounded-lg px-2.5 text-left text-[10px] font-bold opacity-65 hover:bg-current/[.05] hover:opacity-100">{label}</button>)}</div> : null}
      <p className="px-3 pb-1 pt-2 text-[9px] font-semibold opacity-35">Daily work stays above. Advanced dealership controls stay here.</p>
    </div>,
    mount,
  );
}
