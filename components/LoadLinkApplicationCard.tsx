"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { LoadLinkApplication } from "@/lib/loadlinkApplication";

type ApplicationCardData = Pick<LoadLinkApplication,
  "kind" | "listing_title" | "city" | "advertised_rate" | "vehicle" |
  "applicant_name" | "company" | "email" | "phone" | "area" | "offer" | "note" | "details">;

/** Compact chat receipt; the full branded LoadLink document opens on demand. */
export default function LoadLinkApplicationCard({
  application, preview = false,
}: { application: ApplicationCardData; preview?: boolean }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const kind = application.kind === "contract" ? "Contract" : "Job";
  const fields: Array<[string, string | undefined]> = [
    ["Applicant", application.applicant_name],
    ["Company", application.company],
    ["Contact", [application.email, application.phone].filter(Boolean).join(" · ")],
    ["Operating area", application.area],
    ["Vehicle", application.vehicle],
    ["Location", application.city],
    ["Advertised rate", application.advertised_rate],
    ["Proposed rate", application.offer],
  ];
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  return (
    <>
      <article data-loadlink-application-card="true"
        aria-label={kind + " application preview"}
        className="w-full min-w-0 max-w-[340px] overflow-hidden rounded-lg border border-black/15 bg-white text-[#171717]">
        <header className="flex items-center justify-between gap-3 border-b border-black/10 px-3 py-2.5">
          <img src="/images/loadlink-logo-light.png" alt="LoadLink" width="100" height="28"
            className="h-7 w-[100px] shrink-0 object-contain" />
          <span className="text-[10px] font-medium text-black/60">{preview ? "Not sent" : "Application sent"}</span>
        </header>
        <div className="px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[.06em] text-black/55">
            {kind} application
          </p>
          <h3 className="mt-1 line-clamp-2 break-words text-[13px] font-semibold leading-5">
            {application.listing_title || kind + " opportunity"}
          </h3>
          <p className="mt-1.5 truncate text-xs text-black/65">
            From {application.applicant_name || "LoadLink applicant"}
          </p>
          <button type="button" onClick={() => setOpen(true)}
            className="mt-3 flex min-h-10 w-full items-center justify-between rounded-md border border-black/15 bg-[#fafafa] px-3 text-xs font-semibold text-[#171717] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c39200]">
            <span>View application</span><span aria-hidden="true">›</span>
          </button>
        </div>
      </article>
      {mounted && open ? createPortal(
        <div data-loadlink-application-viewer="true" role="presentation"
          onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}
          className="fixed inset-0 z-[2147483400] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-5">
          <section role="dialog" aria-modal="true" aria-label={"LoadLink " + kind + " application"}
            className="flex max-h-[94dvh] min-h-0 w-full max-w-[650px] flex-col overflow-hidden rounded-t-xl bg-[#f7f8fa] text-[#171717] shadow-xl sm:max-h-[90dvh] sm:rounded-xl">
            <div className="flex min-h-14 shrink-0 items-center justify-between border-b border-black/10 bg-white px-4">
              <h2 className="text-sm font-semibold">{kind} application</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close application"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-black/10 bg-white text-lg text-black">×</button>
            </div>
            <div className="min-h-0 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6 sm:py-6">
              <article data-loadlink-application-paper="true" className="mx-auto min-w-0 max-w-[560px] border border-black/10 bg-white p-5 text-[#171717] sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/15 pb-4">
                  <img src="/images/loadlink-logo-light.png" alt="LoadLink" width="148" height="44" className="h-auto w-[148px] object-contain" />
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-black/55">
                    {kind} application
                  </p>
                </div>
                <h3 className="mt-5 break-words text-lg font-bold leading-7">
                  {application.listing_title || kind + " opportunity"}
                </h3>
                <p className="mt-1 text-xs text-black/60">{preview ? "Preview — not sent" : "Submitted through LoadLink"}</p>
                <dl className="mt-5 grid min-w-0 gap-0 sm:grid-cols-2 sm:gap-x-5">
                  {fields.filter(([, value]) => Boolean(value?.trim())).map(([label, value]) => (
                    <div key={label} className="min-w-0 border-t border-black/10 py-3">
                      <dt className="text-[10px] font-semibold uppercase tracking-[.04em] text-black/55">{label}</dt>
                      <dd className="mt-1 break-words text-sm font-medium leading-5">{value}</dd>
                    </div>
                  ))}
                </dl>
                {application.note ? <div className="mt-3 border-t border-black/10 pt-3">
                  <h4 className="text-xs font-semibold">Applicant's note</h4>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{application.note}</p>
                </div> : null}
                {application.details ? <div className="mt-4 border-t border-black/10 pt-4">
                  <h4 className="text-xs font-semibold">Full application</h4>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{application.details}</p>
                </div> : null}
                <footer className="mt-6 border-t border-black/10 pt-3 text-[10px] leading-5 text-black/55">
                  LoadLink · Application details supplied by the applicant; not independently verified.
                </footer>
              </article>
            </div>
          </section>
        </div>, document.body) : null}
    </>
  );
}
