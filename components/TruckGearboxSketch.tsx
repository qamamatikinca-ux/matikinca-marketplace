export default function TruckGearboxSketch({ darkMode }: { darkMode: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-[24px] border p-5 ${darkMode ? "border-white/10 bg-white/[.025]" : "border-black/10 bg-white"}`}>
      <div className="grid gap-5 sm:grid-cols-[1fr_220px] sm:items-center">
        <div>
          <h2 className="text-xl font-black tracking-[-.025em]">Your LoadLink settings</h2>
          <p className={`mt-2 max-w-md text-sm font-semibold leading-6 ${darkMode ? "text-white/50" : "text-black/50"}`}>
            Profile, notifications and security in one place. Changes save to your signed-in account.
          </p>
        </div>
        <svg className={`mx-auto h-auto w-full max-w-[220px] ${darkMode ? "text-white/55" : "text-black/55"}`} viewBox="0 0 260 135" fill="none" aria-hidden="true">
          <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M31 67h47l12-20h69l15 20h41v28H31V67Z" />
            <path d="M50 67V49h25l15 18M167 67l-12-20h-23" />
            <circle cx="67" cy="98" r="13" /><circle cx="183" cy="98" r="13" />
            <circle cx="67" cy="98" r="4" /><circle cx="183" cy="98" r="4" />
            <path d="M105 58h39v36h-39z" />
            <circle cx="124.5" cy="76" r="12" />
            <path d="M124.5 60v8m0 16v8m-16-16h8m16 0h8m-27-11 6 6m11 11 6 6m0-23-6 6m-11 11-6 6" />
            <path d="M126 50V28h17M143 28l13 13M126 37h-15l-11-12M100 25H87" />
            <path d="M102 112h67" strokeDasharray="7 7" />
          </g>
          <path d="M211 28c12 5 18 12 20 23M218 21c17 7 27 17 30 32" stroke="#f6b800" strokeWidth="2.4" strokeLinecap="round" opacity=".8"/>
        </svg>
      </div>
    </div>
  );
}
