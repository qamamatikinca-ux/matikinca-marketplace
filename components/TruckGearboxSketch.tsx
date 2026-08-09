export default function TruckGearboxSketch({ darkMode }: { darkMode: boolean }) {
  const ink = darkMode ? "#f4f4f4" : "#171717";
  const soft = darkMode ? "#8a8a8a" : "#8f8b82";
  const panel = darkMode ? "#080808" : "#f8f5ed";

  return (
    <div className={`relative mx-auto w-full max-w-[620px] overflow-hidden rounded-[28px] border ${darkMode ? "border-white/10 bg-[#080808]" : "border-black/10 bg-[#f8f5ed]"}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,rgba(246,184,0,.13),transparent_54%)]" />
      <svg viewBox="0 0 760 470" role="img" aria-label="Animated LoadLink roadside truck gearbox service sketch" className="relative z-10 block h-auto w-full">
        <rect width="760" height="470" rx="28" fill={panel} />

        <g fill="none" stroke={soft} strokeWidth="2" strokeLinecap="round" opacity=".42">
          <path d="M60 118h74M87 103c12-16 29-16 41 0M566 104h92M595 90c15-17 33-16 45 0" />
          <path d="M42 338h678M74 360h612" strokeDasharray="12 12" />
          <path d="M619 158v121M655 178v101M688 197v82" />
          <path d="M609 279h93M626 248h54M631 226h45" />
        </g>

        <g fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M168 169h224l75 72v86H145v-91l23-67Z" />
          <path d="M187 183h137l52 50H170Z" />
          <path d="M151 327h382" />
          <path d="M465 245h111v82H465" />
          <circle cx="214" cy="331" r="39" />
          <circle cx="408" cy="331" r="39" />
          <circle cx="506" cy="331" r="31" />
          <circle cx="568" cy="331" r="31" />
          <path d="M191 331h46M385 331h46M486 331h40M548 331h40" />
          <path d="M145 278h76M145 296h61" />
          <path d="M392 203v-51l50-42 76 83-51 48" />
          <path d="M434 118l-16 73 67 37" />
        </g>

        <g fill="none" stroke="#f6b800" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M184 167h147M161 344h451" strokeDasharray="18 14" opacity=".86" />
          <path d="M390 205l36-30" />
          <circle cx="347" cy="318" r="31" />
          <circle cx="347" cy="318" r="12" />
          <path d="M347 278v16M347 342v16M307 318h16M371 318h16M319 290l11 11M364 335l11 11M375 290l-11 11M330 335l-11 11" />
          <animateTransform attributeName="transform" type="rotate" from="0 347 318" to="360 347 318" dur="3.2s" repeatCount="indefinite" />
        </g>

        <g fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="331" cy="237" r="17" />
          <path d="M315 253l-26 48 36 18 27-51 34 24" />
          <path d="M289 301l-21 42M325 319l-10 36" />
          <path d="M382 288l24-19" />
          <path d="M404 268l30-10" />
        </g>
        <g fill="none" stroke="#f6b800" strokeWidth="5" strokeLinecap="round">
          <path d="M383 289l23-20">
            <animate attributeName="d" values="M383 289l23-20;M381 286l25-17;M383 289l23-20" dur="1.15s" repeatCount="indefinite" />
          </path>
          <path d="M313 260l34 16" opacity=".8" />
        </g>

        <g transform="translate(68 281)" fill="none" stroke={ink} strokeWidth="4" strokeLinejoin="round">
          <rect x="0" y="0" width="76" height="61" rx="5" />
          <path d="M12 15h52M12 29h52M12 43h52" />
          <circle cx="14" cy="66" r="5" /><circle cx="62" cy="66" r="5" />
          <path d="M23-18h31v18" />
        </g>
        <path d="M103 254h35" stroke="#f6b800" strokeWidth="5" strokeLinecap="round" />

        <g transform="translate(606 289)" fill="none" stroke={ink} strokeWidth="4" strokeLinejoin="round">
          <rect x="0" y="0" width="74" height="47" rx="6" />
          <path d="M13 0l11-13h28L63 0M18 21h38" />
        </g>
        <rect x="635" y="307" width="14" height="8" rx="2" fill="#f6b800" />

        <g fill="none" stroke="#f6b800" strokeWidth="4" strokeLinecap="round" opacity=".86">
          <path d="M525 119c16-17 33-17 49 0">
            <animate attributeName="opacity" values=".25;1;.25" dur="1.7s" repeatCount="indefinite" />
          </path>
          <path d="M532 133c11-11 23-11 34 0">
            <animate attributeName="opacity" values="1;.25;1" dur="1.7s" repeatCount="indefinite" />
          </path>
        </g>

        <g fill="none" stroke={soft} strokeWidth="3" strokeLinecap="round" opacity=".56">
          <path d="M95 383h95M219 383h83M438 383h121M589 383h77" />
          <path d="M118 400h58M196 400h103M464 400h77M564 400h78" />
        </g>
      </svg>
    </div>
  );
}
