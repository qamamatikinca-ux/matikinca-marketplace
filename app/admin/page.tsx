"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import { supabase } from "@/lib/supabaseClient";

type Tool = {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  roles: string[];
};

const tools: Tool[] = [
  { href: "/admin/listings", eyebrow: "Marketplace", title: "Listing moderation", description: "Approve or reject jobs, contracts and vehicle listings with the user-facing reason kept in sync.", roles: ["owner","admin","operations","moderator"] },
  { href: "/admin/reports", eyebrow: "Safety", title: "Marketplace reports", description: "Investigate member reports, open the affected listing and record a protected resolution.", roles: ["owner","admin","operations","moderator","support"] },
  { href: "/admin/drivers", eyebrow: "Drivers", title: "Driver reviews", description: "Review driver profiles and private documents before approved drivers become public.", roles: ["owner","admin","operations","moderator","verification"] },
  { href: "/admin/verifications", eyebrow: "Trust", title: "Identity verification", description: "Review identity, selfie and company-document submissions through the protected verification queue.", roles: ["owner","admin","operations","moderator","verification"] },
  { href: "/admin/dealerships", eyebrow: "Dealers", title: "Dealership approvals", description: "Review dealership verification, requested changes and business-document status.", roles: ["owner","admin","operations","moderator","verification"] },
  { href: "/admin/package-requests", eyebrow: "Plans", title: "Package approvals", description: "Review LoadLink plan and tailored package requests before payment can begin.", roles: ["owner","admin","operations","finance"] },
  { href: "/admin/support-tickets", eyebrow: "Support", title: "Support queue", description: "Review Talk to support handovers, open the affected page and send a traceable outcome back to the user.", roles: ["owner","admin","operations","support"] },
  { href: "/admin/support-feedback", eyebrow: "Experience", title: "Customer experience", description: "Review posting feedback and customer follow-up signals through the Support and Operations workspace.", roles: ["owner","admin","operations","support"] },
];

export default function AdminPage() {
  const [role, setRole] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.rpc("loadlink_phase2_admin_role").then(({ data }) => {
      if (!active) return;
      setRole(String(data || "").toLowerCase());
      setReady(true);
    }).catch(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  const visibleTools = useMemo(() => tools.filter((tool) => tool.roles.includes(role)), [role]);

  if (!ready) return <main className="min-h-screen bg-[#f4f2eb] text-black"><LoadLinkLoading /></main>;

  return (
    <main className="min-h-screen bg-[#f4f2eb] px-4 py-8 text-black sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="border-b border-black/10 pb-7">
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9a7000]">LoadLink operations</p>
          <h1 className="mt-2 text-5xl font-black tracking-[-.055em]">Control Centre</h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-black/55">Protected marketplace operations. Your workspace only shows the controls assigned to your active staff role.</p>
          <span className="mt-4 inline-flex rounded-full border border-black/10 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[.12em] text-black/50">{role || "staff"}</span>
        </header>

        <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleTools.map((tool) => <Link key={tool.href} href={tool.href} className="group rounded-[24px] border border-black/10 bg-white p-6 shadow-[0_16px_45px_rgba(0,0,0,.035)] transition hover:-translate-y-0.5 hover:border-[#f6b800]"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9a7000]">{tool.eyebrow}</p><h2 className="mt-3 text-2xl font-black tracking-[-.035em]">{tool.title}</h2><p className="mt-2 text-sm font-semibold leading-6 text-black/50">{tool.description}</p><span className="mt-5 inline-flex text-xs font-black underline decoration-[#f6b800] decoration-2 underline-offset-4">Open</span></Link>)}
          <Link href="/" className="rounded-[24px] border border-black bg-black p-6 text-white transition hover:border-[#f6b800]"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#f6b800]">Marketplace</p><h2 className="mt-3 text-2xl font-black tracking-[-.035em]">Return to LoadLink</h2><p className="mt-2 text-sm font-semibold leading-6 text-white/50">Leave protected operations and open the public marketplace.</p></Link>
        </section>
      </div>
    </main>
  );
}