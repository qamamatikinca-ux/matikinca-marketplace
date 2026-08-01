"use client";

import BusinessPlans from "@/components/BusinessPlans";
import ProfessionalFooter from "@/components/platform/ProfessionalFooter";
import ProfessionalHeader from "@/components/platform/ProfessionalHeader";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

export default function PackagesPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  return (
    <main className={darkMode ? "min-h-screen bg-black text-white" : "min-h-screen bg-[#f4efe3] text-black"}>
      <ProfessionalHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
      <BusinessPlans darkMode={darkMode} />
      <section className={`px-5 pb-16 md:px-12 ${darkMode ? "bg-black" : "bg-[#f4efe3]"}`}>
        <div className={`mx-auto max-w-6xl rounded-[28px] border p-6 md:p-8 ${darkMode ? "border-white/10 bg-[#0d0d0d]" : "border-black/10 bg-white"}`}>
          <p className="text-xs font-black uppercase tracking-[.2em] text-[#b88900]">Clear package rules</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">Logistics work posts remain free.</h2>
          <p className={`mt-3 max-w-3xl text-sm leading-7 ${darkMode ? "text-white/55" : "text-black/55"}`}>Free posting is for companies offering work to truck owners and mobile-unit owners. Vehicle sales are not free: manual vehicle listings cost R15 per vehicle per day. Pro and dealership limits are enforced by the server, not only by the page.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Rule title="Standard" body="5 vehicle photos, 50 messages per day and no private analytics." />
            <Rule title="Pro" body="15 photos, analytics and expanded marketplace tools." />
            <Rule title="Dealership" body="15 photos, stock management, lead handling and business reporting." />
          </div>
        </div>
      </section>
      <ProfessionalFooter darkMode={darkMode} />
    </main>
  );
}

function Rule({ title, body }: { title: string; body: string }) {
  return <article className="rounded-2xl border border-current/10 p-4"><h3 className="font-black">{title}</h3><p className="mt-2 text-sm leading-6 opacity-60">{body}</p></article>;
}
