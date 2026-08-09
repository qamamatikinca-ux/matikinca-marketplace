export default function TruckGearboxSketch({ darkMode }: { darkMode: boolean }) {
  return (
    <div className={`mx-auto w-full max-w-[330px] rounded-[26px] border px-5 py-6 ${darkMode ? "border-white/10 bg-[#090909] text-white/72" : "border-black/10 bg-white text-black/70"}`}>
      <svg viewBox="0 0 360 230" className="h-auto w-full" fill="none" aria-hidden="true">
        {/* transmission / gearbox housing */}
        <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M40 120 62 95h49l19-16h88l20 16h48l24 25-14 60H54l-14-60Z" />
          <path d="M82 95V72h34l22 23M226 95l20-23h33v25" opacity=".62" />
          <path d="M80 180h200" opacity=".35" />
          <circle cx="92" cy="180" r="11" /><circle cx="271" cy="180" r="11" />
          <circle cx="92" cy="180" r="3" /><circle cx="271" cy="180" r="3" />
          <rect x="132" y="101" width="96" height="67" rx="16" />
        </g>

        {/* unmistakable truck gear lever + H pattern */}
        <g stroke="#f6b800" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M180 104V52" />
          <circle cx="180" cy="39" r="13" />
          <path d="M149 122h62M149 145h62M180 122v23" />
        </g>
        <g fill="#f6b800" fontFamily="Arial, Helvetica, sans-serif" fontSize="12" fontWeight="800" textAnchor="middle">
          <text x="146" y="118">1</text><text x="214" y="118">2</text>
          <text x="146" y="160">3</text><text x="214" y="160">4</text>
          <text x="180" y="160">5</text><text x="234" y="160">R</text>
        </g>
        <text x="180" y="211" fill="currentColor" opacity=".45" fontFamily="Arial, Helvetica, sans-serif" fontSize="12" fontWeight="800" textAnchor="middle" letterSpacing="1.5">TRUCK GEARBOX</text>
      </svg>
    </div>
  );
}
