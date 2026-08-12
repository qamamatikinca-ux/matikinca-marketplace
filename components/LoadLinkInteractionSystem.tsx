"use client";

import { useEffect, useMemo, useState } from "react";
import LoadLinkIcon from "@/components/LoadLinkIcon";

type DateTarget = {
  input: HTMLInputElement;
  label: string;
  min: string;
  max: string;
};

type ChoiceTarget = {
  select: HTMLSelectElement;
  label: string;
  value: string;
  options: Array<{ value: string; label: string; disabled: boolean }>;
};

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

function inputLabel(element: HTMLElement, fallback: string) {
  return (
    element.getAttribute("aria-label") ||
    element.closest("label")?.querySelector("span")?.textContent?.trim() ||
    element.closest("label")?.textContent?.trim() ||
    fallback
  );
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (setter) setter.call(input, value);
  else input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function setSelectValue(select: HTMLSelectElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
  if (setter) setter.call(select, value);
  else select.value = value;
  select.dispatchEvent(new Event("input", { bubbles: true }));
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function prepareDateControl(input: HTMLInputElement) {
  if (input.dataset.loadlinkNativeUi === "true") return false;
  if (input.type !== "date" && input.dataset.loadlinkFutureDate !== "true" && input.dataset.loadlinkCustomDate !== "true") return false;
  input.readOnly = true;
  input.inputMode = "none";
  input.setAttribute("aria-haspopup", "dialog");
  input.setAttribute("autocomplete", "off");
  input.dataset.loadlinkCustomDate = "true";
  return true;
}

export default function LoadLinkInteractionSystem() {
  const [darkMode, setDarkMode] = useState(false);
  const [dateTarget, setDateTarget] = useState<DateTarget | null>(null);
  const [choiceTarget, setChoiceTarget] = useState<ChoiceTarget | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [shownMonth, setShownMonth] = useState(() => monthStart(new Date()));

  useEffect(() => {
    const syncTheme = () => {
      setDarkMode(
        document.documentElement.dataset.loadlinkTheme === "dark" ||
          document.documentElement.classList.contains("dark"),
      );
    };
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-loadlink-theme"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const prepareVisibleDateControls = () => {
      document
        .querySelectorAll<HTMLInputElement>('input[type="date"],input[data-loadlink-future-date="true"],input[data-loadlink-custom-date="true"]')
        .forEach(prepareDateControl);

      // The job location remains a normal text field; do not invoke a browser datalist sheet.
      document
        .querySelectorAll<HTMLInputElement>('input[list="loadlink-job-cities"]')
        .forEach((input) => input.removeAttribute("list"));
    };

    prepareVisibleDateControls();
    const delayed = window.setTimeout(prepareVisibleDateControls, 300);

    const openDate = (input: HTMLInputElement) => {
      if (!prepareDateControl(input)) return;
      const current = parseIso(input.value) || parseIso(input.min) || new Date();
      setSelectedDate(input.value || isoDate(current));
      setShownMonth(monthStart(current));
      setChoiceTarget(null);
      setDateTarget({
        input,
        label: inputLabel(input, "Choose date"),
        min: input.min || "",
        max: input.max || "",
      });
    };

    const openChoice = (select: HTMLSelectElement) => {
      if (select.disabled || select.dataset.loadlinkNativeUi === "true") return;
      setDateTarget(null);
      setChoiceTarget({
        select,
        label: inputLabel(select, "Choose an option"),
        value: select.value,
        options: Array.from(select.options).map((option) => ({
          value: option.value,
          label: option.textContent || option.value,
          disabled: option.disabled,
        })),
      });
    };

    const intercept = (event: Event) => {
      const element = event.target instanceof Element ? event.target : null;
      if (!element) return;

      const select = element.closest("select");
      if (select instanceof HTMLSelectElement && select.dataset.loadlinkNativeUi !== "true") {
        event.preventDefault();
        select.blur();
        openChoice(select);
        return;
      }

      const input = element.closest('input[type="date"],input[data-loadlink-future-date="true"],input[data-loadlink-custom-date="true"]');
      if (input instanceof HTMLInputElement && input.dataset.loadlinkNativeUi !== "true") {
        event.preventDefault();
        input.blur();
        openDate(input);
      }
    };

    const focusIn = (event: FocusEvent) => {
      const input = event.target instanceof HTMLInputElement ? event.target : null;
      if (!input) return;

      // Numeric keyboards are based only on the actual field type or explicit inputMode.
      // No text/label guessing: a field containing words such as "vehicle" or "unit" stays text.
      if (input.type === "tel") input.inputMode = "tel";
      if (input.type === "number" && !input.inputMode) {
        const step = input.step || "";
        input.inputMode = step && step !== "1" ? "decimal" : "numeric";
      }
      if (prepareDateControl(input)) input.blur();
    };

    const keyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDateTarget(null);
        setChoiceTarget(null);
        return;
      }
      if (event.key !== "Enter" && event.key !== " ") return;
      const active = document.activeElement;
      if (active instanceof HTMLSelectElement && active.dataset.loadlinkNativeUi !== "true") {
        event.preventDefault();
        openChoice(active);
      } else if (active instanceof HTMLInputElement && prepareDateControl(active)) {
        event.preventDefault();
        openDate(active);
      }
    };

    document.addEventListener("pointerdown", intercept, true);
    document.addEventListener("click", intercept, true);
    document.addEventListener("focusin", focusIn, true);
    document.addEventListener("keydown", keyDown);

    return () => {
      window.clearTimeout(delayed);
      document.removeEventListener("pointerdown", intercept, true);
      document.removeEventListener("click", intercept, true);
      document.removeEventListener("focusin", focusIn, true);
      document.removeEventListener("keydown", keyDown);
    };
  }, []);

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

  const minDate = dateTarget?.min ? parseIso(dateTarget.min) : null;
  const maxDate = dateTarget?.max ? parseIso(dateTarget.max) : null;

  function commitDate() {
    if (!dateTarget || !selectedDate) return;
    setInputValue(dateTarget.input, selectedDate);
    setDateTarget(null);
  }

  function chooseOption(value: string) {
    if (!choiceTarget) return;
    setSelectValue(choiceTarget.select, value);
    setChoiceTarget(null);
  }

  return (
    <>
      {choiceTarget ? (
        <div
          data-loadlink-choice-sheet="true"
          className="fixed inset-0 z-[2147483580] flex items-end justify-center bg-black/28 p-0 backdrop-blur-[12px] sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={choiceTarget.label}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setChoiceTarget(null);
          }}
        >
          <section className={`w-full max-w-[460px] overflow-hidden rounded-t-[28px] border p-4 sm:rounded-[28px] ${darkMode ? "text-white" : "text-black"}`}>
            <div className="flex items-center justify-between gap-4 px-1 pb-3">
              <div>
                <p className={`text-[10px] font-black uppercase tracking-[.08em] ${darkMode ? "text-[#f6b800]" : "text-[#8f6900]"}`}>LoadLink</p>
                <h2 className="mt-1 text-xl font-black">{choiceTarget.label}</h2>
              </div>
              <button type="button" onClick={() => setChoiceTarget(null)} className="flex h-10 w-10 items-center justify-center rounded-full border border-current/15" aria-label="Close options">
                <LoadLinkIcon name="close" size={16} />
              </button>
            </div>
            <div className="max-h-[58svh] overflow-y-auto py-1">
              {choiceTarget.options.map((option) => {
                const selected = option.value === choiceTarget.value;
                return (
                  <button
                    key={`${option.value}-${option.label}`}
                    type="button"
                    disabled={option.disabled}
                    onClick={() => chooseOption(option.value)}
                    className={`mb-2 flex min-h-12 w-full items-center justify-between gap-3 rounded-[15px] border px-4 text-left text-sm font-bold disabled:opacity-35 ${
                      selected
                        ? "border-[#f6b800] bg-[#f6b800] text-black"
                        : darkMode
                          ? "border-white/12 bg-white/[.04]"
                          : "border-black/10 bg-white/[.30]"
                    }`}
                  >
                    <span>{option.label}</span>
                    {selected ? <LoadLinkIcon name="check" size={17} strokeWidth={2.2} /> : null}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}

      {dateTarget ? (
        <div
          data-loadlink-calendar-sheet="true"
          className="fixed inset-0 z-[2147483590] flex items-end justify-center bg-black/28 p-0 backdrop-blur-[12px] sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="loadlink-calendar-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDateTarget(null);
          }}
        >
          <section className={`w-full max-w-[520px] overflow-hidden rounded-t-[30px] border p-5 sm:rounded-[30px] ${darkMode ? "text-white" : "text-black"}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={`text-[10px] font-black uppercase tracking-[.08em] ${darkMode ? "text-[#f6b800]" : "text-[#8f6900]"}`}>{dateTarget.label}</p>
                <h2 id="loadlink-calendar-title" className="mt-1 text-[26px] font-black tracking-[-.035em]">Choose a date</h2>
              </div>
              <button type="button" onClick={() => setDateTarget(null)} className="flex h-10 w-10 items-center justify-center rounded-full border border-current/15" aria-label="Close calendar">
                <LoadLinkIcon name="close" size={16} />
              </button>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <button type="button" onClick={() => setShownMonth((current) => monthStart(new Date(current.getFullYear(), current.getMonth() - 1, 1)))} className="flex h-10 w-10 items-center justify-center rounded-full border border-current/15" aria-label="Previous month">
                <LoadLinkIcon name="chevronLeft" size={17} />
              </button>
              <strong className="text-sm font-black">
                {shownMonth.toLocaleDateString("en-ZA", { month: "long", year: "numeric" })}
              </strong>
              <button type="button" onClick={() => setShownMonth((current) => monthStart(new Date(current.getFullYear(), current.getMonth() + 1, 1)))} className="flex h-10 w-10 items-center justify-center rounded-full border border-current/15" aria-label="Next month">
                <LoadLinkIcon name="chevronRight" size={17} />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-7 gap-1 text-center text-[9px] font-black uppercase opacity-45">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day}>{day}</span>)}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1">
              {days.map((date, index) => {
                if (!date) return <span key={`blank-${index}`} className="aspect-square" />;
                const value = isoDate(date);
                const disabled = Boolean((minDate && date < minDate) || (maxDate && date > maxDate));
                const selected = value === selectedDate;
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={disabled}
                    onClick={() => setSelectedDate(value)}
                    className={`aspect-square rounded-[13px] text-xs font-black disabled:opacity-20 ${selected ? "bg-[#f6b800] text-black" : darkMode ? "bg-white/[.035]" : "bg-white/[.28]"}`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => { const now = new Date(); const value = isoDate(now); if ((!minDate || now >= minDate) && (!maxDate || now <= maxDate)) { setSelectedDate(value); setShownMonth(monthStart(now)); } }} className="h-11 rounded-[15px] border border-current/15 px-4 text-xs font-black">Today</button>
              <button type="button" onClick={commitDate} disabled={!selectedDate} className="h-11 flex-1 rounded-[15px] bg-[#f6b800] px-4 text-xs font-black text-black disabled:opacity-40">Choose date</button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
