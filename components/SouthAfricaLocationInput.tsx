"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  formatSouthAfricanLocation,
  resolveSouthAfricanLocation,
  searchSouthAfricanLocations,
  type SouthAfricanLocation,
} from "@/lib/southAfricaLocations";

type Props = {
  value: string;
  onChange: (value: string, selected?: SouthAfricanLocation | null) => void;
  darkMode?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  allowAllSouthAfrica?: boolean;
  ariaLabel?: string;
};

export default function SouthAfricaLocationInput({
  value,
  onChange,
  darkMode = false,
  placeholder = "Search city, town or province",
  className = "",
  id,
  name,
  required,
  disabled,
  allowAllSouthAfrica = true,
  ariaLabel,
}: Props) {
  const generatedId = useId();
  const inputId = id || `loadlink-location-${generatedId.replace(/:/g, "")}`;
  const listId = `${inputId}-listbox`;
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const suggestions = useMemo(() => {
    const rows = searchSouthAfricanLocations(value, 14);
    return allowAllSouthAfrica ? rows : rows.filter((row) => row.kind !== "country");
  }, [allowAllSouthAfrica, value]);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  function choose(location: SouthAfricanLocation) {
    const next = location.kind === "country" ? "All South Africa" : location.name;
    onChange(next, location);
    setOpen(false);
    setActiveIndex(-1);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        id={inputId}
        name={name}
        value={value}
        required={required}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && activeIndex >= 0 ? `${inputId}-option-${activeIndex}` : undefined}
        placeholder={placeholder}
        className={className}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onChange(event.target.value, resolveSouthAfricanLocation(event.target.value));
          setOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((current) => Math.min(current + 1, suggestions.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((current) => Math.max(current - 1, 0));
          } else if (event.key === "Enter" && open && activeIndex >= 0 && suggestions[activeIndex]) {
            event.preventDefault();
            choose(suggestions[activeIndex]);
          } else if (event.key === "Escape") {
            setOpen(false);
            setActiveIndex(-1);
          }
        }}
      />

      {open && !disabled ? (
        <div
          id={listId}
          role="listbox"
          className={`absolute left-0 right-0 top-[calc(100%+8px)] z-[120] max-h-72 overflow-y-auto rounded-2xl border p-2 shadow-2xl ${
            darkMode ? "border-white/15 bg-[#0b0b0b] text-white" : "border-black/10 bg-white text-black"
          }`}
        >
          {suggestions.length ? suggestions.map((location, index) => (
            <button
              id={`${inputId}-option-${index}`}
              key={`${location.kind}-${location.name}-${location.province}`}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(location)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${
                index === activeIndex
                  ? "bg-[#f6b800] text-black"
                  : darkMode
                    ? "hover:bg-white/10"
                    : "hover:bg-black/[.05]"
              }`}
            >
              <span>{formatSouthAfricanLocation(location)}</span>
              {location.kind === "place" ? <span className="shrink-0 text-[10px] font-black uppercase opacity-50">Town or city</span> : null}
            </button>
          )) : (
            <p className="px-3 py-4 text-sm font-semibold opacity-60">No matching South African place was found. You can still type the location manually.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
