export default function TruckGearboxSketch({ darkMode }: { darkMode: boolean }) {
  return (
    <div className={`relative mx-auto w-full max-w-[620px] overflow-hidden rounded-[26px] border ${darkMode ? "border-white/10 bg-[#080808]" : "border-black/10 bg-[#f8f5ed]"}`}>
      <div className="pointer-events-none absolute inset-0 animate-[loadlinkGlow_3.2s_ease-in-out_infinite] bg-[radial-gradient(circle_at_50%_48%,rgba(246,184,0,.10),transparent_55%)]" />
      <img
        src="/loadlink-settings-roadside-repair.webp"
        alt=""
        aria-hidden="true"
        width={1100}
        height={733}
        decoding="async"
        className="loadlink-settings-sketch relative z-10 block h-auto w-full object-contain"
      />
      <style jsx>{`
        @keyframes loadlinkSketchFloat {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -3px, 0); }
        }
        @keyframes loadlinkGlow {
          0%, 100% { opacity: .7; }
          50% { opacity: 1; }
        }
        .loadlink-settings-sketch {
          animation: loadlinkSketchFloat 3.2s ease-in-out infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .loadlink-settings-sketch { animation: none; }
        }
      `}</style>
    </div>
  );
}
