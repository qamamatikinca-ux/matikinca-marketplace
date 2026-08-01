"use client";

export default function LoadLinkThemeToggle({
  darkMode,
  onToggle,
  className = "",
}: {
  darkMode: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      title={darkMode ? "Light mode" : "Dark mode"}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#f6b800]/55 bg-black text-[#f6b800] shadow-[0_8px_20px_rgba(0,0,0,.14)] transition active:scale-[0.96] ${className}`}
    >
      {darkMode ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20.2 15.1A8 8 0 0 1 8.9 3.8 8.2 8.2 0 1 0 20.2 15Z" fill="currentColor" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
