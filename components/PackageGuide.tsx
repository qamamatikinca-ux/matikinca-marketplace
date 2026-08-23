"use client";

export type PackageRecommendation = "manual" | "pro" | "dealer";

const options: Array<{ plan: PackageRecommendation; title: string; detail: string }> = [
  { plan: "manual", title: "I list occasionally", detail: "Pay R15 for one 10-day Manual listing credit." },
  { plan: "pro", title: "I advertise regularly", detail: "For owners and operators who need ongoing listings, analytics and messaging." },
  { plan: "dealer", title: "I run a dealership", detail: "Showroom, stock, leads, team tools and dealership management." },
];

export default function PackageGuide({ darkMode = false, onComplete }: { darkMode?: boolean; onComplete: (plan: PackageRecommendation) => void }) {
  const muted = darkMode ? "text-white/52" : "text-black/52";
  const surface = darkMode ? "border-white/10 bg-white/[.035]" : "border-black/10 bg-white/72";

  return (
    <section className={`rounded-[22px] border p-4 backdrop-blur-xl sm:p-5 ${surface}`} data-loadlink-package-questions="major-20260823">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-black tracking-[-.03em]">Which sounds like you?</h2>
          <p className={`mt-1 text-[11px] font-semibold ${muted}`}>One choice. LoadLink will show the most relevant plan.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-3">
        {options.map((option) => (
          <button key={option.plan} type="button" onClick={() => onComplete(option.plan)} className="min-h-[84px] rounded-[17px] border border-current/10 px-4 py-3.5 text-left transition hover:border-[#f6b800]/60 active:scale-[.99]">
            <span className="block text-[13px] font-black">{option.title}</span>
            <span className={`mt-1 block text-[10px] font-semibold leading-4 ${muted}`}>{option.detail}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
