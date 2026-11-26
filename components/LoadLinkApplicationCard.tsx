"use client";

import type { LoadLinkApplication } from "@/lib/loadlinkApplication";

type ApplicationCardData = Pick<LoadLinkApplication,
  "kind" | "listing_title" | "city" | "advertised_rate" | "vehicle" |
  "applicant_name" | "company" | "email" | "phone" | "area" | "offer" | "note" | "details">;

export default function LoadLinkApplicationCard({
  application, preview = false,
}: { application: ApplicationCardData; preview?: boolean }) {
  const kind = application.kind === "contract" ? "Contract" : "Job";
  const lines: Array<[string,string | undefined]> = [
    ["Applicant", application.applicant_name],
    ["Company", application.company],
    ["Contact", [application.email, application.phone].filter(Boolean).join(" · ")],
    ["Operating area", application.area],
    ["Vehicle", application.vehicle],
    ["Location", application.city],
    ["Advertised rate", application.advertised_rate],
    ["Proposed rate", application.offer],
  ];
  return (
    <article data-loadlink-application-card="true"
      aria-label={kind + " application preview"}
      className="w-full min-w-0 max-w-[420px] overflow-hidden rounded-lg border border-black/15 bg-white text-[#171717]">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 px-3 py-2.5">
        <strong className="text-xs font-black italic tracking-[-.02em]">LOADLINK</strong>
        <span className="text-[10px] font-semibold text-black/55">{preview ? "Ready to send" : "Application sent"}</span>
      </header>
      <div className="min-w-0 space-y-3 px-3 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-black/50">{kind} application</p>
          <h3 className="mt-1 break-words text-sm font-bold leading-5">{application.listing_title || kind + " opportunity"}</h3>
        </div>
        <dl className="grid min-w-0 gap-2 border-t border-black/10 pt-2.5">
          {lines.filter(([,value]) => Boolean(value?.trim())).map(([label,value]) => (
            <div className="grid min-w-0 grid-cols-[90px_minmax(0,1fr)] gap-2 text-[11px] leading-5" key={label}>
              <dt className="text-black/55">{label}</dt>
              <dd className="min-w-0 break-words font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        {application.note ? <div className="border-t border-black/10 pt-2.5">
          <p className="text-[10px] font-semibold text-black/55">Application note</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5">{application.note}</p>
        </div> : null}
        {application.details ? (
          <details className="border-t border-black/10 pt-2.5">
            <summary className="cursor-pointer py-1 text-xs font-semibold underline decoration-[#f6b800] underline-offset-4">
              View full application
            </summary>
            <p className="mt-2 max-h-52 overflow-y-auto whitespace-pre-wrap break-words text-[11px] leading-5 text-black/75">
              {application.details}
            </p>
          </details>
        ) : null}
      </div>
    </article>
  );
}
