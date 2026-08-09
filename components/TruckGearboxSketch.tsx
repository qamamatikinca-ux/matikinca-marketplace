export default function TruckGearboxSketch({ darkMode }: { darkMode: boolean }) {
  const stroke = darkMode ? "currentColor" : "currentColor";
  return (
    <div className={`relative mx-auto w-full max-w-[320px] overflow-hidden rounded-[28px] border p-6 ${darkMode ? "border-white/10 bg-[#0b0b0b] text-white/70" : "border-black/10 bg-white text-black/65"}`}>
      <svg viewBox="0 0 320 220" className="mx-auto h-auto w-full" fill="none" aria-hidden="true">
        <g stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M65 151h57l14-22h70l18 22h31" />
          <path d="M84 151v-18h35l17 18" />
          <path d="M183 129h35" />
          <circle cx="100" cy="167" r="16" />
          <circle cx="213" cy="167" r="16" />
          <circle cx="100" cy="167" r="5" />
          <circle cx="213" cy="167" r="5" />
          <path d="M130 103h62" />
          <path d="M161 103V44" />
          <circle cx="161" cy="34" r="11" />
          <path d="M128 59h66" />
          <path d="M128 59v52M194 59v52" />
          <path d="M128 111h66" />
          <path d="M128 59l16 16M194 59l-16 16M128 111l16-16M194 111l-16-16" opacity=".55" />
        </g>
        <g stroke="#f6b800" strokeWidth="3" strokeLinecap="round">
          <path d="M235 62c12 7 19 15 22 28" opacity=".9" />
          <path d="M245 51c16 9 26 22 31 40" opacity=".7" />
          <path d="M151 34h20" />
          <path d="M161 24v20" />
        </g>
      </svg>
    </div>
  );
}
