export default function TruckGearboxSketch({ darkMode }: { darkMode: boolean }) {
  return (
    <div className={`relative mx-auto w-full max-w-[620px] overflow-hidden rounded-[28px] border ${darkMode ? "border-white/10 bg-[#080808]" : "border-black/10 bg-[#f8f5ed]"}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(246,184,0,.12),transparent_52%)]" />
      <img
        src="/loadlink-settings-roadside-repair.webp"
        alt=""
        aria-hidden="true"
        width={1100}
        height={733}
        decoding="async"
        fetchPriority="high"
        className="relative z-10 block h-auto w-full object-contain"
      />
    </div>
  );
}
