"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import LoadLinkIcon from "@/components/LoadLinkIcon";

type CalendarTarget = {
  input: HTMLInputElement;
  label: string;
  min: string;
  max: string;
};

const phonePattern = /\b(phone|cellphone|cell phone|mobile|whatsapp|telephone|contact number|contact no)\b/i;
const integerPattern = /\b(year|years|experience|quantity|qty|fleet size|number of|units?|axles?|seats?|drivers?|vehicles?)\b/i;
const decimalPattern = /\b(rate|budget|price|amount|cost|deposit|fee|mileage|kilomet|\bkm\b|weight|tonnage|payload|capacity|salary|finance|trade.?in|hours?|distance)\b/i;
const codePattern = /\b(otp|one.?time|pin|verification code|security code)\b/i;

function inputContext(input: HTMLInputElement) {
  const label = input.closest("label")?.textContent || "";
  return [input.name, input.id, input.placeholder, input.getAttribute("aria-label"), label]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ");
}

function enhanceInput(input: HTMLInputElement) {
  if (input.disabled) return;
  const context = inputContext(input);
  const type = input.type.toLowerCase();

  if (type === "tel" || phonePattern.test(context)) {
    input.inputMode = "tel";
    if (!input.autocomplete) input.autocomplete = "tel";
    return;
  }
  if (codePattern.test(context)) {
    input.inputMode = "numeric";
    return;
  }
  if (type === "number") {
    const step = input.getAttribute("step") || "";
    input.inputMode = step && step !== "1" ? "decimal" : "numeric";
    return;
  }
  if (integerPattern.test(context)) {
    input.inputMode = "numeric";
    return;
  }
  if (decimalPattern.test(context)) input.inputMode = "decimal";
}

function prepareDateInput(input: HTMLInputElement) {
  if (input.type !== "date" || input.dataset.loadlinkFutureDate !== "true") return false;
  input.readOnly = true;
  input.dataset.loadlinkCalendarReady = "true";
  input.setAttribute("aria-haspopup", "dialog");
  input.setAttribute(
    "aria-label",
    input.getAttribute("aria-label") || input.closest("label")?.textContent?.trim() || "Choose date",
  );
  return true;
}

function isoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIso(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
  return Number.isFinite(date.getTime()) ? date : null;
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0, 0);
}

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (setter) setter.call(input, value);
  else input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

export default function LoadLinkInteractionSystem() {
  const pathname = usePathname();
  const [calendar, setCalendar] = useState<CalendarTarget | null>(null);
  const [selected, setSelected] = useState("");
  const [shownMonth, setShownMonth] = useState(() => monthStart(new Date()));
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const syncTheme = () => {
      setDarkMode(
        document.documentElement.dataset.loadlinkTheme === "dark" ||
          document.documentElement.classList.contains("dark"),
      );
    };
    syncTheme();
    const themeObserver = new MutationObserver(syncTheme);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-loadlink-theme"],
    });
    return () => themeObserver.disconnect();
  }, []);

  useEffect(() => {
    setCalendar(null);

    const enhanceCurrentInputs = () => {
      document.querySelectorAll<HTMLInputElement>("input").forEach((input) => {
        enhanceInput(input);
        prepareDateInput(input);
      });
    };

    const frame = window.requestAnimationFrame(enhanceCurrentInputs);
    const delayed = window.setTimeout(enhanceCurrentInputs, 250);

    const openCalendar = (input: HTMLInputElement) => {
      const current = parseIso(input.value) || parseIso(input.min) || new Date();
      setSelected(input.value || isoDate(current));
      setShownMonth(monthStart(current));
      setCalendar({
        input,
        label:
          input.closest("label")?.querySelector("span")?.textContent?.trim() ||
          input.getAttribute("aria-label") ||
          "Choose date",
        min: input.min || "",
        max: input.max || "",
      });
    };

    const onPointerDown = (event: PointerEvent) => {
      const element = event.target instanceof Element ? event.target : null;
      const input = element?.closest("input");
      if (!(input instanceof HTMLInputElement)) return;
      enhanceInput(input);
      if (!prepareDateInput(input)) return;
      event.preventDefault();
      input.blur();
      openCalendar(input);
    };

    const onFocusIn = (event: FocusEvent) => {
      if (!(event.target instanceof HTMLInputElement)) return;
      enhanceInput(event.target);
      prepareDateInput(event.target);
    };

    const onDateClick = (event: MouseEvent) => {
      const element = event.target instanceof Element ? event.target : null;
      const input = element?.closest('input[type="date"][data-loadlink-future-date="true"]');
      if (!(input instanceof HTMLInputElement)) return;
      event.preventDefault();
      input.blur();
      openCalendar(input);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCalendar(null);
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("click", onDateClick, true);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(delayed);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("click", onDateClick, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [pathname]);

  useEffect(() => {
    if (!calendar) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [calendar]);

  const days = useMemo(() => {
    const year = shownMonth.getFullYear();
    const month = shownMonth.getMonth();
    const first = new Date(year, month, 1, 12);
    const mondayOffset = (first.getDay() + 6) % 7;
    const count = new Date(year, month + 1, 0, 12).getDate();
    return Array.from({ length: mondayOffset + count }, (_, index) => {
      if (index < mondayOffset) return null;
      return new Date(year, month, index - mondayOffset + 1, 12);
    });
  }, [shownMonth]);

  const minDate = calendar?.min ? parseIso(calendar.min) : null;
  const maxDate = calendar?.max ? parseIso(calendar.max) : null;
  const todayIso = isoDate(new Date());
  const title = /contract/i.test(calendar?.label || "") ? "When does it start?" : "When is it needed?";

  function choose(date: Date) {
    const value = isoDate(date);
    if (minDate && date < minDate) return;
    if (maxDate && date > maxDate) return;
    setSelected(value);
  }

  function commitDate() {
    if (!calendar || !selected) return;
    setNativeInputValue(calendar.input, selected);
    setCalendar(null);
  }

  return (
    <>
      <style jsx global>{`
        .loadlink-messages button[aria-label="Open message actions"],
        .loadlink-messages button[aria-label="Close message tools"],
        .loadlink-message-tools-trigger {
          width: auto !important;
          min-width: 72px !important;
          padding: 0 11px !important;
          gap: 6px !important;
          font-size: 0 !important;
          border-radius: 15px !important;
          -webkit-tap-highlight-color: transparent;
        }
        .loadlink-messages button[aria-label="Open message actions"]::before,
        .loadlink-messages button[aria-label="Close message tools"]::before,
        .loadlink-message-tools-trigger::before {
          content: "";
          display: block;
          width: 18px;
          height: 18px;
          flex: 0 0 18px;
          background: currentColor;
          -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 7h9M17 7h3M4 12h3M11 12h9M4 17h7M15 17h5'/%3E%3Ccircle cx='15' cy='7' r='2'/%3E%3Ccircle cx='9' cy='12' r='2'/%3E%3Ccircle cx='13' cy='17' r='2'/%3E%3C/svg%3E") center / contain no-repeat;
          mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 7h9M17 7h3M4 12h3M11 12h9M4 17h7M15 17h5'/%3E%3Ccircle cx='15' cy='7' r='2'/%3E%3Ccircle cx='9' cy='12' r='2'/%3E%3Ccircle cx='13' cy='17' r='2'/%3E%3C/svg%3E") center / contain no-repeat;
        }
        .loadlink-messages button[aria-label="Open message actions"]::after,
        .loadlink-messages button[aria-label="Close message tools"]::after,
        .loadlink-message-tools-trigger::after {
          content: "Tools";
          display: block;
          font-size: 10px;
          line-height: 1;
          font-weight: 800;
          letter-spacing: .01em;
        }
        .loadlink-messages button[aria-label="Open message actions"][aria-expanded="true"]::after,
        .loadlink-message-tools-trigger[aria-expanded="true"]::after {
          content: "Close";
        }
        .loadlink-messages button[aria-label="Open message actions"][aria-expanded="true"]::before,
        .loadlink-message-tools-trigger[aria-expanded="true"]::before {
          -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.9' stroke-linecap='round'%3E%3Cpath d='m6 6 12 12M18 6 6 18'/%3E%3C/svg%3E") center / contain no-repeat;
          mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.9' stroke-linecap='round'%3E%3Cpath d='m6 6 12 12M18 6 6 18'/%3E%3C/svg%3E") center / contain no-repeat;
        }
        input[data-loadlink-calendar-ready="true"] {
          cursor: pointer;
        }
      `}</style>

      {calendar ? (
        <div
          data-loadlink-calendar-sheet="true"
          className="fixed inset-0 z-[2147483590] flex items-end justify-center bg-black/30 p-0 backdrop-blur-[12px] sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="loadlink-calendar-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCalendar(null);
          }}
        >
          <section
            className={`w-full max-w-[520px] overflow-hidden rounded-t-[34px] border shadow-[0_30px_100px_rgba(0,0,0,.30)] backdrop-blur-2xl backdrop-saturate-150 sm:rounded-[34px] ${
              darkMode
                ? "border-white/15 bg-black/[.72] text-white"
                : "border-white/75 bg-white/[.80] text-black"
            }`}
          >
            <div className={`border-b px-5 pb-4 pt-5 ${darkMode ? "border-white/10" : "border-black/8"}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-[.13em] ${darkMode ? "text-[#f6b800]" : "text-[#a97900]"}`}>
                    {calendar.label}
                  </p>
                  <h2 id="loadlink-calendar-title" className="mt-1 text-[28px] font-black tracking-[-.045em]">
                    {title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setCalendar(null)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                    darkMode ? "border-white/15 bg-white/[.05]" : "border-black/10 bg-white/45"
                  }`}
                  aria-label="Close calendar"
                >
                  <LoadLinkIcon name="close" size={17} />
                </button>
              </div>
              <div className={`mt-4 inline-flex rounded-full border p-1 ${darkMode ? "border-white/12 bg-white/[.04]" : "border-black/8 bg-black/[.025]"}`}>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    choose(now);
                    setShownMonth(monthStart(now));
                  }}
                  className="rounded-full bg-[#f6b800] px-4 py-2 text-[11px] font-black text-black"
                >
                  Today
                </button>
                <span className={`px-4 py-2 text-[11px] font-bold ${darkMode ? "text-white/60" : "text-black/55"}`}>
                  {selected
                    ? new Date(`${selected}T12:00:00`).toLocaleDateString("en-ZA", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "Choose a date"}
                </span>
              </div>
            </div>

            <div className="px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setShownMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1, 12))}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border ${darkMode ? "border-white/12 bg-white/[.04]" : "border-black/8 bg-white/35"}`}
                  aria-label="Previous month"
                >
                  <LoadLinkIcon name="chevronLeft" size={18} />
                </button>
                <strong className="text-base font-black">
                  {shownMonth.toLocaleDateString("en-ZA", { month: "long", year: "numeric" })}
                </strong>
                <button
                  type="button"
                  onClick={() => setShownMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1, 12))}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border ${darkMode ? "border-white/12 bg-white/[.04]" : "border-black/8 bg-white/35"}`}
                  aria-label="Next month"
                >
                  <LoadLinkIcon name="chevronRight" size={18} />
                </button>
              </div>

              <div className={`mt-4 grid grid-cols-7 text-center text-[10px] font-black ${darkMode ? "text-white/40" : "text-black/40"}`}>
                {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
                  <span key={`${day}-${index}`} className="py-2">{day}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                {days.map((date, index) => {
                  if (!date) return <span key={`blank-${index}`} className="aspect-square" />;
                  const value = isoDate(date);
                  const disabled = Boolean((minDate && date < minDate) || (maxDate && date > maxDate));
                  const active = value === selected;
                  const today = value === todayIso;
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={disabled}
                      onClick={() => choose(date)}
                      className={`mx-auto flex aspect-square w-[42px] max-w-full items-center justify-center rounded-full text-sm font-black active:scale-95 disabled:opacity-20 ${
                        active
                          ? "bg-[#f6b800] text-black shadow-[0_8px_24px_rgba(246,184,0,.20)]"
                          : today
                            ? darkMode
                              ? "border border-white/25 bg-white/[.04]"
                              : "border border-black/15 bg-white/25"
                            : ""
                      }`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={`flex items-center justify-between gap-3 border-t px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 ${darkMode ? "border-white/10" : "border-black/8"}`}>
              <button
                type="button"
                onClick={() => setCalendar(null)}
                className={`h-12 rounded-[16px] border px-5 text-sm font-black ${darkMode ? "border-white/14 bg-white/[.04]" : "border-black/10 bg-white/30"}`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selected}
                onClick={commitDate}
                className="h-12 flex-1 rounded-[16px] bg-[#f6b800] px-5 text-sm font-black text-black disabled:opacity-40"
              >
                Choose date
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
